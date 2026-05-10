import React, { useState, useEffect, useReducer, useRef } from 'react';
import { flushSync } from 'react-dom';
import mqtt from 'mqtt';
import { Card, ChatMessage, GameState, Player, Spectator, Suit } from './types';
import { sounds } from './utils/sound';
import { flipTransition } from './utils/flip';
import { loadSession, saveSession, clearSession, SavedSession } from './utils/session';
import {
  AI_BID_DELAY_MS, AI_TRUMP_DELAY_MS, AI_PARTNER_DELAY_MS, AI_PLAY_DELAY_MS, TRICK_REVEAL_DELAY_MS,
  EMPTY_SLOT_NAME, CHAT_MAX_LEN,
} from './constants';
import {
  PlayerCount, MIN_BID, MAX_BID, BID_STEP,
  numTricks, partnerCardsForBid,
  getTrickStrength, getPointsForCard,
} from './rules';
import { Action, INITIAL_STATE, makeEmptyPlayer, gameReducer } from './gameReducer';
import { GameProvider, GameContextValue, PositionedPlayer } from './GameContext';
import { MobileView } from './views/MobileView';
import { DesktopView } from './views/DesktopView';
import { Lobby } from './views/Lobby';
import { getPlayableCards, getTrickWinner } from './utils/gameLogic';
import { slotFor, slotOrder, Slot } from './utils/positions';

const MQTT_BROKER = 'wss://broker.emqx.io:8084/mqtt';
const TOPIC_PREFIX = 'three_fifty_game';

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE);

  // Local UI state
  const [showMyCaptures, setShowMyCaptures] = useState(false);
  const [visualThrow] = useState<{ cardId: string; playerIndex: number } | null>(null);
  const [mobileOpponentSource, setMobileOpponentSource] = useState<{ cardId: string; playerIndex: number } | null>(null);
  const [sweepingToPlayer, setSweepingToPlayer] = useState<number | null>(null);
  const aiThinkingRef = useRef(false);
  const trickCompletingRef = useRef(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Mobile layout
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  const [mobileLogOpen, setMobileLogOpen] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const lastSeenChatLenRef = useRef(0);

  // Networking state
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [peerId, setPeerId] = useState('');
  const [joinId, setJoinId] = useState('');
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('three_fifty_playerName') || '');
  const [myIndex, setMyIndex] = useState(0);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [savedSession, setSavedSession] = useState<SavedSession | null>(() => loadSession());
  const [isSpectator, setIsSpectator] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const mqttClientRef = useRef<mqtt.MqttClient | null>(null);
  const handleDataRef = useRef<(data: any) => void>(() => {});
  const stateRef = useRef(state);
  const peerIdRef = useRef('');
  const isOrchestratingRef = useRef(false);
  const pendingSyncStateRef = useRef<GameState | null>(null);
  const clientRejoinRef = useRef<{ roomId: string; name: string; myPeerId: string } | null>(null);
  const wakeLockRef = useRef<any | null>(null);
  const hostInitializedRef = useRef(false);
  const hostRoomIdRef = useRef<string | null>(null);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { peerIdRef.current = peerId; }, [peerId]);
  useEffect(() => { localStorage.setItem('three_fifty_playerName', playerName); }, [playerName]);

  // ── Screen wake lock ──
  useEffect(() => {
    if (state.gamePhase === 'LOBBY' || state.gamePhase === 'GAME_OVER') return;
    const lock = async () => {
      try {
        if ('wakeLock' in navigator && document.visibilityState === 'visible') {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (e) { /* ignore */ }
    };
    lock();
    const onVis = () => { if (document.visibilityState === 'visible') lock(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [state.gamePhase]);

  // ── Host-side rebroadcast on wake ──
  useEffect(() => {
    if (!isMultiplayer || !isHost) return;
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      const client = mqttClientRef.current;
      const roomId = hostRoomIdRef.current;
      if (!client || !roomId) return;
      try {
        if (!client.connected) { client.reconnect(); return; }
      } catch { /* fall through */ }
      try {
        const snapshot = stateRef.current;
        client.publish(`${TOPIC_PREFIX}_${roomId}`, JSON.stringify({ type: 'SYNC_STATE', payload: snapshot }));
      } catch (e) { console.error('Host wake rebroadcast error:', e); }
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pageshow', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pageshow', onVis);
    };
  }, [isMultiplayer, isHost]);

  useEffect(() => {
    if (!isMultiplayer || isHost) return;
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      const info = clientRejoinRef.current;
      const client = mqttClientRef.current;
      if (!info || !client) return;
      try {
        if (!client.connected) { client.reconnect(); return; }
      } catch { /* fall through */ }
      try {
        const payload = { type: 'PLAYER_JOINED', payload: { name: info.name, peerId: info.myPeerId } };
        client.publish(`${TOPIC_PREFIX}_${info.roomId}`, JSON.stringify(payload));
      } catch (e) { console.error('Client re-associate error:', e); }
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pageshow', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pageshow', onVis);
    };
  }, [isMultiplayer, isHost]);

  useEffect(() => {
    if (!isMultiplayer || !isHost || !state.roomId) return;
    if (state.gamePhase === 'LOBBY') return;
    if (state.gamePhase === 'GAME_OVER') { clearSession(); return; }
    saveSession({ role: 'host', roomId: state.roomId, playerName, state });
  }, [isMultiplayer, isHost, state, playerName]);

  useEffect(() => {
    if (!isMultiplayer || isHost || !state.roomId || !peerId) return;
    if (state.gamePhase === 'LOBBY' || state.gamePhase === 'GAME_OVER') {
      clearSession();
      return;
    }
    const me = state.players.find(p => p.peerId === peerId);
    saveSession({
      role: 'client',
      roomId: state.roomId,
      playerName: me?.name || playerName,
      myPeerId: peerId,
    });
  }, [isMultiplayer, isHost, state.roomId, state.gamePhase, state.players, peerId, playerName]);

  const redactStateForSpectators = (s: GameState): GameState => ({
    ...s,
    players: s.players.map(p => ({ ...p, hand: [] })),
    deck: [],
  });

  // Action types a seated client may dispatch remotely.
  const CLIENT_ALLOWED_ACTIONS = new Set<Action['type']>([
    'PLACE_BID', 'PASS_BID', 'CHOOSE_TRUMP', 'DEAL_REMAINING', 'CALL_PARTNERS', 'PLAY_CARD',
    'SEND_CHAT', 'RETURN_TO_LOBBY',
  ]);

  // ── Broadcast state to clients ──
  useEffect(() => {
    if (!isHost || !isMultiplayer || !mqttClientRef.current || !state.roomId) return;
    const client = mqttClientRef.current;
    try {
      client.publish(`${TOPIC_PREFIX}_${state.roomId}`, JSON.stringify({ type: 'SYNC_STATE', payload: state }));
      client.publish(`${TOPIC_PREFIX}_${state.roomId}_spec`, JSON.stringify({ type: 'SYNC_STATE', payload: redactStateForSpectators(state) }));
    } catch (e) { console.error('Host broadcast error:', e); }
  }, [state, isHost, isMultiplayer]);

  useEffect(() => {
    handleDataRef.current = (data: any) => {
      const s = stateRef.current;
      const room = s.roomId;
      if (!room) return;
      const client = mqttClientRef.current;
      const publishMain = (msg: any) => {
        if (!client) return;
        try { client.publish(`${TOPIC_PREFIX}_${room}`, JSON.stringify(msg)); } catch (e) { console.error('publishMain error:', e); }
      };
      const publishSpec = (msg: any) => {
        if (!client) return;
        try { client.publish(`${TOPIC_PREFIX}_${room}_spec`, JSON.stringify(msg)); } catch (e) { console.error('publishSpec error:', e); }
      };
      const rebroadcast = (players: Player[], spectators: Spectator[]) => {
        const snapshot = { ...s, players, spectators };
        publishMain({ type: 'SYNC_STATE', payload: snapshot });
        publishSpec({ type: 'SYNC_STATE', payload: redactStateForSpectators(snapshot) });
      };

      if (data.type === 'PLAYER_JOINED') {
        const { name, peerId } = data.payload;
        if (!name || !peerId) return;
        const specs = s.spectators ?? [];

        const reconPlayerIdx = s.players.findIndex(p => p.peerId === peerId && p.isHuman);
        if (reconPlayerIdx !== -1) {
          const np = [...s.players];
          np[reconPlayerIdx] = { ...np[reconPlayerIdx], isOnline: true };
          dispatch({ type: 'UPDATE_PLAYERS', payload: np });
          publishMain({ type: 'JOIN_ACCEPTED', peerId, role: 'player', playerIndex: reconPlayerIdx });
          rebroadcast(np, specs);
          return;
        }
        if (specs.some(sp => sp.peerId === peerId)) {
          publishMain({ type: 'JOIN_ACCEPTED', peerId, role: 'spectator' });
          rebroadcast(s.players, specs);
          return;
        }

        const nameTaken =
          s.players.some(p => p.isHuman && p.name === name)
          || specs.some(sp => sp.name === name);
        if (nameTaken) {
          publishMain({ type: 'JOIN_REJECTED', peerId, reason: 'NAME_TAKEN' });
          return;
        }

        if (s.gamePhase === 'LOBBY') {
          const slot = s.players.findIndex((p, i) => i !== 0 && p.name === EMPTY_SLOT_NAME);
          if (slot !== -1) {
            const np = [...s.players];
            np[slot] = { ...np[slot], name, isHuman: true, peerId, isOnline: true };
            dispatch({ type: 'UPDATE_PLAYERS', payload: np });
            publishMain({ type: 'JOIN_ACCEPTED', peerId, role: 'player', playerIndex: slot });
            rebroadcast(np, specs);
            return;
          }
          publishMain({ type: 'JOIN_REJECTED', peerId, reason: 'LOBBY_FULL' });
          return;
        }

        const newSpec: Spectator = { name, peerId };
        const nextSpecs = [...specs, newSpec];
        dispatch({ type: 'ADD_SPECTATOR', payload: newSpec });
        publishMain({ type: 'JOIN_ACCEPTED', peerId, role: 'spectator' });
        rebroadcast(s.players, nextSpecs);
        setTimeout(() => {
          const cur = stateRef.current;
          publishSpec({ type: 'SYNC_STATE', payload: redactStateForSpectators(cur) });
        }, 400);
        return;
      }

      if (data.type === 'CLIENT_ACTION') {
        const { payload: action, originatorPeerId } = data;
        if (!originatorPeerId || !action || typeof action.type !== 'string') return;
        const sender = s.players.find(p => p.peerId === originatorPeerId && p.isHuman);
        if (!sender) return;
        if (!CLIENT_ALLOWED_ACTIONS.has(action.type)) return;
        const declaredIdx = action?.payload?.playerIndex;
        if (typeof declaredIdx === 'number' && declaredIdx !== sender.id) return;
        dispatch(action);
        return;
      }

      if (data.type === 'PLAYER_OFFLINE') {
        const { peerId } = data.payload;
        const specs = s.spectators ?? [];
        if (specs.some(sp => sp.peerId === peerId)) {
          dispatch({ type: 'REMOVE_SPECTATOR', payload: { peerId } });
          rebroadcast(s.players, specs.filter(sp => sp.peerId !== peerId));
          return;
        }
        dispatch({ type: 'SET_PLAYER_OFFLINE', payload: { peerId } });
        return;
      }

      if (data.type === 'PLAYER_LEAVE') {
        const { peerId } = data.payload;
        const specs = s.spectators ?? [];
        if (specs.some(sp => sp.peerId === peerId)) {
          dispatch({ type: 'REMOVE_SPECTATOR', payload: { peerId } });
          rebroadcast(s.players, specs.filter(sp => sp.peerId !== peerId));
          return;
        }
        if (s.gamePhase !== 'LOBBY') return;
        const idx = s.players.findIndex(p => p.peerId === peerId);
        if (idx <= 0) return;
        const np = [...s.players];
        np[idx] = makeEmptyPlayer(idx, EMPTY_SLOT_NAME, false);
        dispatch({ type: 'UPDATE_PLAYERS', payload: np });
        rebroadcast(np, specs);
      }
    };
  }, []);

  const initHostWithRef = (numPlayers: PlayerCount, resume?: Extract<SavedSession, { role: 'host' }>) => {
    setIsMultiplayer(true);
    setIsHost(true);
    setMyIndex(0);
    setIsDisconnected(false);

    const roomId = resume?.roomId ?? Math.random().toString(36).substring(2, 6).toUpperCase();
    setPeerId(roomId);
    if (!resume) clearSession();

    hostInitializedRef.current = false;
    hostRoomIdRef.current = roomId;

    const client = mqtt.connect(MQTT_BROKER);
    mqttClientRef.current = client;

    client.on('connect', () => {
      setIsDisconnected(false);
      client.subscribe([`${TOPIC_PREFIX}_${roomId}`, `${TOPIC_PREFIX}_${roomId}_spec`], (err) => {
        if (err) { console.error('HOST subscribe error:', err); return; }
        if (!hostInitializedRef.current) {
          hostInitializedRef.current = true;
          if (resume) {
            dispatch({ type: 'SET_GAME_STATE', payload: resume.state });
          } else {
            dispatch({
              type: 'INIT_LOBBY',
              payload: { isHost: true, roomId, hostName: playerName || 'You (Host)', numPlayers },
            });
          }
        } else {
          try {
            const snapshot = stateRef.current;
            client.publish(`${TOPIC_PREFIX}_${roomId}`, JSON.stringify({ type: 'SYNC_STATE', payload: snapshot }));
            client.publish(`${TOPIC_PREFIX}_${roomId}_spec`, JSON.stringify({ type: 'SYNC_STATE', payload: redactStateForSpectators(snapshot) }));
          } catch (e) { console.error('HOST rebroadcast error:', e); }
        }
      });
    });

    client.on('message', (topic, message) => {
      try {
        const raw = message.toString();
        const parsed = JSON.parse(raw);
        if (parsed.type === 'SYNC_STATE') return;
        if (parsed.type === 'JOIN_ACCEPTED' || parsed.type === 'JOIN_REJECTED') return;
        if (parsed.type === 'MOVE_ANNOUNCE' && parsed.originatorPeerId === roomId) return;

        if (parsed.type === 'MOVE_ANNOUNCE') {
          const claimedIdx = parsed.payload?.playerIndex;
          const seated = stateRef.current.players[claimedIdx];
          if (!seated || seated.peerId !== parsed.originatorPeerId) return;
          try { mqttClientRef.current?.publish(`${TOPIC_PREFIX}_${roomId}_spec`, raw); } catch (e) { console.error('MOVE_ANNOUNCE spec forward error:', e); }
          executeOrchestratedPlay(parsed.payload);
          return;
        }

        if (
          parsed.type === 'PLAYER_JOINED' ||
          parsed.type === 'CLIENT_ACTION' ||
          parsed.type === 'PLAYER_OFFLINE' ||
          parsed.type === 'PLAYER_LEAVE'
        ) {
          handleDataRef.current(parsed);
        }
      } catch (e) { console.error('Host JSON Parse Error:', e); }
    });

    client.on('close', () => {
      console.warn('HOST: MQTT Connection dropped.');
      setIsDisconnected(true);
    });
  };

  const joinGame = (resume?: Extract<SavedSession, { role: 'client' }>) => {
    const roomId = (resume?.roomId ?? joinId).toUpperCase();
    const name = resume?.playerName ?? playerName;
    if (!roomId) return;
    if (resume && !joinId) setJoinId(roomId);
    setIsMultiplayer(true);
    setIsHost(false);
    setIsDisconnected(false);
    setIsSpectator(false);
    setJoinError(null);

    const myPeerId = resume?.myPeerId ?? Math.random().toString(36).substring(2, 9);
    setPeerId(myPeerId);

    const displayName = name || `Player ${myPeerId.substring(0, 4)}`;
    clientRejoinRef.current = { roomId, name: displayName, myPeerId };

    const client = mqtt.connect(MQTT_BROKER, {
      will: {
        topic: `${TOPIC_PREFIX}_${roomId}`,
        payload: JSON.stringify({ type: 'PLAYER_OFFLINE', payload: { peerId: myPeerId } }),
        qos: 0,
        retain: false,
      },
    });
    mqttClientRef.current = client;

    let confirmedRole: 'player' | 'spectator' | null = null;

    client.on('connect', () => {
      setIsDisconnected(false);
      client.subscribe(`${TOPIC_PREFIX}_${roomId}`, (err) => {
        if (err) { console.error('CLIENT subscribe error:', err); return; }
        const joinPayload = { type: 'PLAYER_JOINED', payload: { name: displayName, peerId: myPeerId } };
        client.publish(`${TOPIC_PREFIX}_${roomId}`, JSON.stringify(joinPayload));
      });
    });

    client.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'JOIN_REJECTED' && data.peerId === myPeerId) {
          const reason = data.reason === 'NAME_TAKEN'
            ? `A player with that name already exists in this room.`
            : data.reason === 'LOBBY_FULL'
              ? `This room is full.`
              : `Unable to join this room.`;
          setJoinError(reason);
          clearSession();
          clientRejoinRef.current = null;
          mqttClientRef.current = null;
          setIsMultiplayer(false);
          setIsHost(false);
          setIsSpectator(false);
          try { client.end(true); } catch {}
          return;
        }

        if (data.type === 'JOIN_ACCEPTED' && data.peerId === myPeerId) {
          confirmedRole = data.role;
          if (data.role === 'spectator') {
            setIsSpectator(true);
            client.unsubscribe(`${TOPIC_PREFIX}_${roomId}`);
            client.subscribe(`${TOPIC_PREFIX}_${roomId}_spec`, (err) => {
              if (err) console.error('CLIENT spec subscribe error:', err);
            });
          } else if (typeof data.playerIndex === 'number') {
            setMyIndex(data.playerIndex);
          }
          return;
        }

        if (!confirmedRole) return;

        if (data.type === 'SYNC_STATE') {
          const newState = data.payload as GameState;
          if (isOrchestratingRef.current) {
            pendingSyncStateRef.current = newState;
            return;
          }
          if (confirmedRole === 'player') {
            const me = newState.players.find(p => p.peerId === myPeerId);
            if (!me) return;
            setMyIndex(me.id);
          }
          dispatch({ type: 'SET_GAME_STATE', payload: newState });
        } else if (data.type === 'MOVE_ANNOUNCE') {
          if (data.originatorPeerId === myPeerId) return;
          const claimedIdx = data.payload?.playerIndex;
          const seated = stateRef.current.players[claimedIdx];
          if (!seated || seated.peerId !== data.originatorPeerId) return;
          executeOrchestratedPlay(data.payload);
        }
      } catch (e) { console.error('Client JSON Parse Error:', e); }
    });

    client.on('close', () => {
      console.warn('CLIENT: MQTT Connection dropped.');
      setIsDisconnected(true);
    });
  };

  // ── Auto-scroll game log ──
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [state.gameLog]);

  // ── Animation constants ──
  const FLIP_FLY_MS = 900;
  const FLIP_SWEEP_MS = 900;

  /**
   * Orchestrates a PLAY_CARD action with FLIP animations.
   */
  const executeOrchestratedPlay = async (payload: { playerIndex: number; cardId: string }) => {
    isOrchestratingRef.current = true;
    const isOpponent = payload.playerIndex !== myIndex;
    if (isOpponent) {
      flushSync(() => setMobileOpponentSource({
        cardId: payload.cardId,
        playerIndex: payload.playerIndex,
      }));
    }
    try {
      sounds.throwCard();
      await flipTransition(() => {
        setMobileOpponentSource(null);
        dispatch({ type: 'PLAY_CARD', payload });
      }, FLIP_FLY_MS);
    } finally {
      isOrchestratingRef.current = false;
      const pending = pendingSyncStateRef.current;
      if (pending) {
        pendingSyncStateRef.current = null;
        const me = pending.players.find(p => p.peerId === peerIdRef.current);
        if (me) setMyIndex(me.id);
        dispatch({ type: 'SET_GAME_STATE', payload: pending });
      }
    }
  };

  const publishMoveAnnounce = (payload: { playerIndex: number; cardId: string }) => {
    const client = mqttClientRef.current;
    if (!client) return;
    const roomId = state.roomId || joinId;
    if (!roomId) return;
    try {
      client.publish(
        `${TOPIC_PREFIX}_${roomId}`,
        JSON.stringify({ type: 'MOVE_ANNOUNCE', payload, originatorPeerId: peerIdRef.current }),
      );
    } catch (e) { console.error('publishMoveAnnounce error:', e); }
  };

  // ── Trick completion ──
  useEffect(() => {
    if (state.gamePhase !== 'PLAYING') return;
    if (state.currentTrick.length !== state.numPlayers) return;
    if (trickCompletingRef.current) return;
    trickCompletingRef.current = true;
    isOrchestratingRef.current = true;
    (async () => {
      await new Promise(r => setTimeout(r, TRICK_REVEAL_DELAY_MS));

      const winnerPlay = state.ledSuit
        ? getTrickWinner(state.currentTrick, state.ledSuit, state.trumpSuit)
        : state.currentTrick[0];
      const winnerIdx = winnerPlay.playerIndex;

      sounds.capture();
      await flipTransition(() => {
        setSweepingToPlayer(winnerIdx);
        dispatch({ type: 'COMPLETE_TRICK' });
      }, FLIP_SWEEP_MS);
      flushSync(() => {
        setSweepingToPlayer(null);
      });

      isOrchestratingRef.current = false;
      const pending = pendingSyncStateRef.current;
      if (pending) {
        pendingSyncStateRef.current = null;
        const me = pending.players.find(p => p.peerId === peerIdRef.current);
        if (me) setMyIndex(me.id);
        dispatch({ type: 'SET_GAME_STATE', payload: pending });
      }

      trickCompletingRef.current = false;

      // After last trick, finalize round — host only.
      const postState = stateRef.current;
      if (
        postState.completedTricks.length >= numTricks(postState.numPlayers) &&
        postState.gamePhase === 'PLAYING' &&
        (!isMultiplayer || isHost)
      ) {
        await new Promise(r => setTimeout(r, 500));
        dispatch({ type: 'END_ROUND' });
      }
    })();
  }, [state.gamePhase, state.currentTrick.length, isHost, isMultiplayer, state.numPlayers]);

  // ── Auto-redeal when all players passed ──
  useEffect(() => {
    if (!isHost && isMultiplayer) return;
    if (state.gamePhase !== 'BIDDING') return;
    if (state.currentBid != null) return;
    if (state.passedPlayers.length !== state.numPlayers) return;
    const t = window.setTimeout(() => {
      dispatch({ type: 'START_ROUND' });
    }, 1500);
    return () => window.clearTimeout(t);
  }, [state.gamePhase, state.passedPlayers.length, state.currentBid, state.numPlayers, isHost, isMultiplayer]);

  // ── AI: bidding ──
  useEffect(() => {
    if (!isHost && isMultiplayer) return;
    if (state.gamePhase !== 'BIDDING') return;
    const bidder = state.players[state.biddingTurn];
    if (!bidder || bidder.isHuman) return;
    if (aiThinkingRef.current) return;
    aiThinkingRef.current = true;
    const turn = state.biddingTurn;
    const curBid = state.currentBid;
    const hand = bidder.hand;
    const timer = setTimeout(() => {
      const decision = aiChooseBid(hand, curBid);
      if (decision === 'PASS') {
        dispatch({ type: 'PASS_BID', payload: { playerIndex: turn } });
      } else {
        sounds.bid();
        dispatch({ type: 'PLACE_BID', payload: { playerIndex: turn, amount: decision } });
      }
      aiThinkingRef.current = false;
    }, AI_BID_DELAY_MS);
    return () => { clearTimeout(timer); aiThinkingRef.current = false; };
  }, [state.gamePhase, state.biddingTurn, state.currentBid, isHost, isMultiplayer]);

  // ── AI: trump selection ──
  useEffect(() => {
    if (!isHost && isMultiplayer) return;
    if (state.gamePhase !== 'CHOOSING_TRUMP') return;
    const chooser = state.players[state.bidWinner];
    if (!chooser || chooser.isHuman) return;
    if (chooser.peerId && !state.trumpSuit) {
      // Wait for human to pick — but this branch runs only for non-humans.
    }
    if (state.trumpSuit) return; // already chose, deal will run below
    if (aiThinkingRef.current) return;
    aiThinkingRef.current = true;
    const hand = chooser.hand;
    const timer = setTimeout(() => {
      const suit = aiChooseTrump(hand);
      dispatch({ type: 'CHOOSE_TRUMP', payload: { suit } });
      setTimeout(() => dispatch({ type: 'DEAL_REMAINING' }), 200);
      aiThinkingRef.current = false;
    }, AI_TRUMP_DELAY_MS);
    return () => { clearTimeout(timer); aiThinkingRef.current = false; };
  }, [state.gamePhase, state.bidWinner, state.trumpSuit, isHost, isMultiplayer]);

  // ── After human picks trump, host auto-deals remaining ──
  useEffect(() => {
    if (!isHost && isMultiplayer) return;
    if (state.gamePhase !== 'CHOOSING_TRUMP') return;
    if (!state.trumpSuit) return;
    const chooser = state.players[state.bidWinner];
    if (!chooser?.isHuman) return; // bot path handles its own deal-remaining
    const t = window.setTimeout(() => dispatch({ type: 'DEAL_REMAINING' }), 250);
    return () => window.clearTimeout(t);
  }, [state.gamePhase, state.trumpSuit, state.bidWinner, isHost, isMultiplayer]);

  // ── AI: calling partners ──
  useEffect(() => {
    if (!isHost && isMultiplayer) return;
    if (state.gamePhase !== 'CALLING_PARTNERS') return;
    const bidder = state.players[state.bidWinner];
    if (!bidder || bidder.isHuman) return;
    if (aiThinkingRef.current) return;
    aiThinkingRef.current = true;
    const timer = setTimeout(() => {
      const cards = aiChooseCallCards(state.players, state.bidWinner, state.bidValue, state.trumpSuit);
      dispatch({ type: 'CALL_PARTNERS', payload: { cardIds: cards.map(c => c.id) } });
      sounds.partners();
      aiThinkingRef.current = false;
    }, AI_PARTNER_DELAY_MS);
    return () => { clearTimeout(timer); aiThinkingRef.current = false; };
  }, [state.gamePhase, state.bidWinner, state.bidValue, isHost, isMultiplayer]);

  // ── AI: playing a card ──
  useEffect(() => {
    if (!isHost && isMultiplayer) return;
    if (state.gamePhase !== 'PLAYING') return;
    if (state.currentTrick.length >= state.numPlayers) return;
    const player = state.players[state.currentTurn];
    if (!player || player.isHuman) return;
    if (aiThinkingRef.current) return;
    if (player.hand.length === 0) return;
    aiThinkingRef.current = true;
    const timer = setTimeout(async () => {
      const ledSuit = state.ledSuit;
      const chosen = aiChooseCard(
        player.hand,
        ledSuit,
        state.trumpSuit,
        state.currentTrick.map(tp => tp.card),
        state.currentTrick,
        state.currentTurn,
        state.bidderTeamIndices,
      );
      if (!chosen) { aiThinkingRef.current = false; return; }

      const payload = { playerIndex: state.currentTurn, cardId: chosen.id };
      if (isMultiplayer) publishMoveAnnounce(payload);
      await executeOrchestratedPlay(payload);
      aiThinkingRef.current = false;
    }, AI_PLAY_DELAY_MS);
    return () => { clearTimeout(timer); aiThinkingRef.current = false; };
  }, [state.gamePhase, state.currentTurn, state.currentTrick.length, state.ledSuit, isHost, isMultiplayer]);

  // ── Dispatch (local or network) ──
  const handleDispatch = (action: Action) => {
    if (isHost) {
      dispatch(action);
      return;
    }
    if (isSpectator) return;
    if (action.type !== 'START_ROUND') {
      dispatch(action);
    }
    if (mqttClientRef.current) {
      mqttClientRef.current.publish(
        `${TOPIC_PREFIX}_${state.roomId || joinId}`,
        JSON.stringify({ type: 'CLIENT_ACTION', payload: action, originatorPeerId: peerIdRef.current }),
      );
    }
  };

  // ── Chat sounds + unread tracking ──
  const prevChatLenRef = useRef<number | null>(null);
  useEffect(() => {
    const len = state.chatLog?.length ?? 0;
    if (prevChatLenRef.current === null) {
      prevChatLenRef.current = len;
      return;
    }
    if (len > prevChatLenRef.current) {
      const latest = state.chatLog[len - 1];
      if (latest && latest.playerIndex !== myIndex) sounds.chat();
    }
    prevChatLenRef.current = len;
  }, [state.chatLog, myIndex]);

  useEffect(() => {
    const len = state.chatLog?.length ?? 0;
    const prev = lastSeenChatLenRef.current;
    if (isMobile && mobileChatOpen) {
      lastSeenChatLenRef.current = len;
      return;
    }
    if (len > prev) {
      setChatUnread(u => u + (len - prev));
    }
    lastSeenChatLenRef.current = len;
  }, [state.chatLog, isMobile, mobileChatOpen]);

  const markChatRead = () => {
    lastSeenChatLenRef.current = state.chatLog?.length ?? 0;
    setChatUnread(0);
  };

  const sendChat = (text: string) => {
    if (!isMultiplayer) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    const sender = state.players[myIndex];
    if (!sender) return;
    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      playerIndex: myIndex,
      name: sender.name,
      text: trimmed.slice(0, CHAT_MAX_LEN),
      ts: Date.now(),
    };
    handleDispatch({ type: 'SEND_CHAT', payload: msg });
  };

  const me = isSpectator ? undefined : state.players[myIndex];

  const isMyTurn = !isSpectator
    && state.currentTurn === myIndex
    && state.gamePhase === 'PLAYING'
    && state.currentTrick.length < state.numPlayers;

  // ── Legal cards for my turn ──
  const legalCardIds = new Set<string>();
  if (isMyTurn && me) {
    const legal = getPlayableCards(me.hand, state.ledSuit);
    for (const c of legal) legalCardIds.add(c.id);
  }

  // ── Bidding helpers ──
  const canBid = !isSpectator && state.gamePhase === 'BIDDING' && state.biddingTurn === myIndex;
  const minBidAmount = state.currentBid == null
    ? MIN_BID
    : Math.min(MAX_BID, state.currentBid + BID_STEP);

  // ── Trump helpers ──
  const canChooseTrump = !isSpectator
    && state.gamePhase === 'CHOOSING_TRUMP'
    && state.bidWinner === myIndex
    && !state.trumpSuit;

  // ── Partner-call helpers ──
  const canCallPartners = !isSpectator
    && state.gamePhase === 'CALLING_PARTNERS'
    && state.bidWinner === myIndex;
  const partnersRequired = state.bidValue > 0 ? partnerCardsForBid(state.bidValue) : 0;
  const callableCards: Card[] = (() => {
    if (!canCallPartners || !me) return [];
    const myHandIds = new Set(me.hand.map(c => c.id));
    // Universe: every card known to be in play this round (across all hands).
    // Spectators/non-bidders never see this list anyway.
    const allCards: Card[] = state.players.flatMap(p => p.hand);
    const seen = new Set<string>();
    const out: Card[] = [];
    for (const c of allCards) {
      if (myHandIds.has(c.id)) continue;
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push(c);
    }
    return out;
  })();

  // ── Human actions ──
  const executePlayCard = (cardId: string) => {
    if (!isMyTurn || !me) return;
    if (!legalCardIds.has(cardId)) return;
    const payload = { playerIndex: myIndex, cardId };
    if (isMultiplayer) publishMoveAnnounce(payload);
    executeOrchestratedPlay(payload);
  };

  const executeBid = (amount: number) => {
    if (!canBid) return;
    if (amount < minBidAmount || amount > MAX_BID) return;
    sounds.bid();
    handleDispatch({ type: 'PLACE_BID', payload: { playerIndex: myIndex, amount } });
  };

  const executePass = () => {
    if (!canBid) return;
    handleDispatch({ type: 'PASS_BID', payload: { playerIndex: myIndex } });
  };

  const executeChooseTrump = (suit: Suit) => {
    if (!canChooseTrump) return;
    handleDispatch({ type: 'CHOOSE_TRUMP', payload: { suit } });
    // The "after human picks trump" effect schedules DEAL_REMAINING.
  };

  const executeCallPartners = (cards: Card[]) => {
    if (!canCallPartners) return;
    if (cards.length !== partnersRequired) return;
    sounds.partners();
    handleDispatch({ type: 'CALL_PARTNERS', payload: { cardIds: cards.map(c => c.id) } });
  };

  // ── Layout positions ──
  const myPosition: Slot = 'bottom';
  const positions: PositionedPlayer[] = state.players.map((_, i) => ({
    playerIndex: i,
    slot: slotFor(i, myIndex, state.numPlayers),
  }));
  const order = slotOrder(state.numPlayers);
  const playerAt = (slot: Slot): number => positions.find(p => p.slot === slot)?.playerIndex ?? -1;
  const topSlots = order.filter(s => s === 'top-left' || s === 'top-center' || s === 'top-right');
  const topPlayers: number[] = topSlots.map(s => playerAt(s)).filter(i => i !== -1);
  const leftPlayer = playerAt('left');
  const rightPlayer = playerAt('right');

  const offlinePlayers = state.players.filter(p => p.isHuman && p.id !== 0 && !p.isOnline);
  const isPaused = (offlinePlayers.length > 0 && state.gamePhase !== 'LOBBY') || isDisconnected;

  const onLeaveRoom = () => {
    const finish = () => { clearSession(); window.location.reload(); };
    if (isMultiplayer && !isHost && mqttClientRef.current && peerId) {
      const room = state.roomId || joinId;
      try {
        mqttClientRef.current.publish(
          `${TOPIC_PREFIX}_${room}`,
          JSON.stringify({ type: 'PLAYER_LEAVE', payload: { peerId } }),
        );
      } catch (e) { console.error('PLAYER_LEAVE publish error:', e); }
      setTimeout(finish, 200);
      return;
    }
    finish();
  };

  if (state.gamePhase === 'LOBBY') {
    return (
      <Lobby
        state={state}
        isMultiplayer={isMultiplayer}
        isHost={isHost}
        peerId={peerId}
        myIndex={myIndex}
        playerName={playerName}
        setPlayerName={setPlayerName}
        joinId={joinId}
        setJoinId={setJoinId}
        savedSession={savedSession}
        setSavedSession={setSavedSession}
        joinError={joinError}
        clearJoinError={() => setJoinError(null)}
        onCreateRoom={initHostWithRef}
        onJoinRoom={joinGame}
        onStartSinglePlayer={(numPlayers) => {
          setIsHost(true);
          setIsMultiplayer(true);
          setMyIndex(0);
          dispatch({ type: 'START_GAME', payload: { playerName: playerName || 'You', numPlayers } });
        }}
        onStartRound={() => dispatch({ type: 'START_ROUND' })}
        onSetNumPlayers={(numPlayers) => dispatch({ type: 'SET_NUM_PLAYERS', payload: { numPlayers } })}
        onLeaveRoom={onLeaveRoom}
      />
    );
  }

  const gameContext: GameContextValue = {
    state, dispatch, handleDispatch,
    myIndex, isHost, isMultiplayer, isSpectator, peerId, joinId, isDisconnected,
    showMyCaptures, setShowMyCaptures,
    mobileLogOpen, setMobileLogOpen,
    mobileChatOpen, setMobileChatOpen,
    chatUnread, markChatRead, sendChat,
    visualThrow, mobileOpponentSource, sweepingToPlayer,
    legalCardIds,
    executePlayCard, executeBid, executePass,
    executeChooseTrump,
    executeCallPartners,
    canBid, minBidAmount,
    canChooseTrump,
    canCallPartners, partnersRequired, callableCards,
    myPosition, positions, topPlayers, leftPlayer, rightPlayer,
    logEndRef,
    isPaused, offlinePlayers,
  };

  return (
    <GameProvider value={gameContext}>
      {isMobile ? <MobileView /> : <DesktopView />}
    </GameProvider>
  );
}

// ============================================================
// AI heuristics
// ============================================================

function aiChooseBid(
  hand: Card[],
  currentBid: number | null,
): number | 'PASS' {
  // Hand-strength estimate: high-value cards + suit concentration.
  let strength = 0;
  for (const c of hand) {
    strength += getPointsForCard(c);
    if (c.rank === 14) strength += 10; // ace bump
  }
  // Suit concentration bonus: a long suit is worth a lot for trump.
  const counts: Record<string, number> = {};
  for (const c of hand) counts[c.suit] = (counts[c.suit] || 0) + 1;
  const maxCount = Math.max(...Object.values(counts));
  strength += maxCount * 8;

  // Map strength to a bid estimate. Initial-deal hands are small (4-5 cards),
  // so values cluster around 60-150. We extrapolate to a target bid.
  const estimate = Math.min(MAX_BID, Math.max(MIN_BID, MIN_BID + (strength - 60) * 1.5));
  const minToBid = currentBid == null
    ? MIN_BID
    : Math.min(MAX_BID, currentBid + BID_STEP);
  if (minToBid > estimate) return 'PASS';
  // Slight randomness: sometimes settle for the minimum to avoid runaway bids.
  if (Math.random() < 0.35) return minToBid;
  // Otherwise pick a step at or below estimate.
  const target = Math.max(minToBid, Math.floor(estimate / BID_STEP) * BID_STEP);
  return Math.min(MAX_BID, target);
}

function aiChooseTrump(hand: Card[]): Suit {
  const suitScores: Record<string, number> = {};
  for (const c of hand) {
    suitScores[c.suit] = (suitScores[c.suit] || 0)
      + getPointsForCard(c)
      + getTrickStrength(c.rank);
  }
  let best: Suit = Object.keys(suitScores)[0] as Suit;
  let bestScore = -1;
  for (const [s, v] of Object.entries(suitScores)) {
    if (v > bestScore) { best = s as Suit; bestScore = v; }
  }
  return best;
}

function aiChooseCallCards(
  players: Player[],
  bidderIdx: number,
  bidValue: number,
  trumpSuit: Suit | null,
): Card[] {
  const required = partnerCardsForBid(bidValue);
  const bidder = players[bidderIdx];
  const myHandIds = new Set(bidder.hand.map(c => c.id));
  // Pool of cards outside bidder's hand. Prefer high-point cards
  // — Aces, Kings, especially the 3 of Spades if not held.
  const pool: Card[] = [];
  for (const p of players) {
    if (p.id === bidderIdx) continue;
    for (const c of p.hand) {
      if (!myHandIds.has(c.id)) pool.push(c);
    }
  }
  // Score: card points + small bonus for trump cards (likely strong cards).
  pool.sort((a, b) => {
    const av = getPointsForCard(a) + (trumpSuit && a.suit === trumpSuit ? 5 : 0);
    const bv = getPointsForCard(b) + (trumpSuit && b.suit === trumpSuit ? 5 : 0);
    return bv - av;
  });
  return pool.slice(0, required);
}

function aiChooseCard(
  hand: Card[],
  ledSuit: Suit | null,
  trump: Suit | null,
  trickCards: Card[],
  trickPlays: { playerIndex: number; card: Card }[],
  myIndex: number,
  bidderTeamIndices: number[],
): Card | null {
  if (hand.length === 0) return null;
  const legal = getPlayableCards(hand, ledSuit);
  if (legal.length === 0) return hand[0];

  const teamSet = new Set(bidderTeamIndices);
  const myOnBidderTeam = teamSet.has(myIndex);

  const sloughScore = (c: Card) => getPointsForCard(c) + getTrickStrength(c.rank) * 0.05;

  // Leading
  if (!ledSuit) {
    // Lead a high card of a non-trump suit (or trump if loaded), prefer
    // strong cards to control the trick.
    const sortedByStrength = [...legal].sort((a, b) =>
      getTrickStrength(b.rank) - getTrickStrength(a.rank));
    return sortedByStrength[0];
  }

  // Following: compute current trick winner.
  const trumpsInTrick = trump ? trickCards.filter(c => c.suit === trump) : [];
  const currentBestCard = trumpsInTrick.length > 0
    ? trumpsInTrick.reduce((best, c) =>
        getTrickStrength(c.rank) > getTrickStrength(best.rank) ? c : best)
    : trickCards.filter(c => c.suit === ledSuit)
        .reduce((best, c) =>
          getTrickStrength(c.rank) > getTrickStrength(best.rank) ? c : best, trickCards[0]);

  const leaderPlay = trickPlays[0];
  const currentWinnerIndex = trumpsInTrick.length > 0
    ? trickPlays.filter(tp => tp.card.suit === trump)
        .reduce((best, tp) =>
          getTrickStrength(tp.card.rank) > getTrickStrength(best.card.rank) ? tp : best).playerIndex
    : trickPlays.filter(tp => tp.card.suit === ledSuit)
        .reduce((best, tp) =>
          getTrickStrength(tp.card.rank) > getTrickStrength(best.card.rank) ? tp : best, leaderPlay).playerIndex;
  const winnerOnBidderTeam = teamSet.has(currentWinnerIndex);
  // "Partner winning" only makes sense once we know teams. For non-bidder side
  // before partner cards are revealed, behave conservatively.
  const partnerWinning = (myOnBidderTeam === winnerOnBidderTeam) && currentWinnerIndex !== myIndex;

  const pickSlough = (pool: Card[]): Card => {
    const sorted = [...pool].sort((a, b) => sloughScore(a) - sloughScore(b));
    return partnerWinning ? sorted[sorted.length - 1] : sorted[0];
  };

  const canFollow = hand.some(c => c.suit === ledSuit);
  if (canFollow) {
    const suitCards = legal.filter(c => c.suit === ledSuit);
    const trumpAlreadyOnTrick = !!(trump && trickCards.some(c => c.suit === trump));
    const mustBeatSuit = !trumpAlreadyOnTrick;
    if (mustBeatSuit && !partnerWinning) {
      const winning = suitCards.filter(c =>
        getTrickStrength(c.rank) > getTrickStrength(currentBestCard.rank));
      if (winning.length > 0) {
        winning.sort((a, b) => getTrickStrength(a.rank) - getTrickStrength(b.rank));
        return winning[0];
      }
    }
    return pickSlough(suitCards);
  }

  // Can't follow. Trump if it helps and partner isn't already winning.
  if (trump && !partnerWinning) {
    const trumps = legal.filter(c => c.suit === trump);
    if (trumps.length > 0) {
      const currentBestTrump = trickCards.filter(c => c.suit === trump);
      const minStrength = currentBestTrump.length > 0
        ? Math.max(...currentBestTrump.map(c => getTrickStrength(c.rank)))
        : 0;
      const winningTrumps = trumps.filter(c => getTrickStrength(c.rank) > minStrength);
      if (winningTrumps.length > 0) {
        winningTrumps.sort((a, b) => getTrickStrength(a.rank) - getTrickStrength(b.rank));
        return winningTrumps[0];
      }
    }
  }

  // Slough off-suit. Prefer non-trump cards.
  const nonTrumpLegal = trump ? legal.filter(c => c.suit !== trump) : legal;
  if (nonTrumpLegal.length > 0) return pickSlough(nonTrumpLegal);
  return [...legal].sort((a, b) => sloughScore(a) - sloughScore(b))[0];
}
