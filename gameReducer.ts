import { Card, ChatMessage, GameState, Player, Spectator, Suit, CompletedTrick } from './types';
import { createDeck, shuffleDeck } from './utils/deck';
import { getTrickWinner, cardPoints } from './utils/gameLogic';
import {
  getRankLabel,
  SUIT_SYMBOLS, MAX_LOG_ENTRIES, CHAT_MAX_HISTORY, EMPTY_SLOT_NAME, pickBotNames,
} from './constants';
import {
  PlayerCount,
  handSizeInitial, handSizeFull, numTricks,
  MIN_BID, MAX_BID,
  partnerCardsForBid,
  SUIT_NAMES,
} from './rules';

export type Action =
  | { type: 'SET_GAME_STATE'; payload: GameState }
  | { type: 'INIT_LOBBY'; payload: { isHost: boolean; roomId?: string; hostName?: string; numPlayers: PlayerCount } }
  | { type: 'SET_NUM_PLAYERS'; payload: { numPlayers: PlayerCount } }
  | { type: 'UPDATE_PLAYERS'; payload: Player[] }
  | { type: 'SET_PLAYER_OFFLINE'; payload: { peerId: string } }
  | { type: 'START_GAME'; payload: { playerName: string; numPlayers: PlayerCount } }
  | { type: 'START_ROUND' }
  | { type: 'PLACE_BID'; payload: { playerIndex: number; amount: number } }
  | { type: 'PASS_BID'; payload: { playerIndex: number } }
  | { type: 'CHOOSE_TRUMP'; payload: { suit: Suit } }
  | { type: 'DEAL_REMAINING' }
  | { type: 'CALL_PARTNERS'; payload: { cardIds: string[] } }
  | { type: 'PLAY_CARD'; payload: { playerIndex: number; cardId: string } }
  | { type: 'COMPLETE_TRICK' }
  | { type: 'END_ROUND' }
  | { type: 'RETURN_TO_LOBBY'; payload: { playerIndex: number } }
  | { type: 'ADD_LOG'; payload: string }
  | { type: 'SEND_CHAT'; payload: ChatMessage }
  | { type: 'ADD_SPECTATOR'; payload: Spectator }
  | { type: 'REMOVE_SPECTATOR'; payload: { peerId: string } };

const DEFAULT_PLAYER_COUNT: PlayerCount = 5;

const buildInitialState = (numPlayers: PlayerCount): GameState => ({
  gamePhase: 'LOBBY',
  numPlayers,
  players: [],
  deck: [],
  currentTurn: 0,
  dealerIndex: numPlayers - 1,

  biddingTurn: 0,
  currentBid: null,
  highBidder: -1,
  passedPlayers: [],
  lastBids: Array(numPlayers).fill(null),

  bidWinner: -1,
  bidValue: 0,
  trumpSuit: null,
  trumpChooser: -1,

  partnerCards: [],
  bidderTeamIndices: [],

  currentTrick: [],
  trickLeader: 0,
  ledSuit: null,
  lastTrickWinner: -1,

  completedTricks: [],

  roundScores: { bidderTeam: 0, opposition: 0 },
  gameLog: [],
  chatLog: [],
  spectators: [],
});

export const INITIAL_STATE: GameState = buildInitialState(DEFAULT_PLAYER_COUNT);

export function makeEmptyPlayer(id: number, name: string, isHuman: boolean, peerId?: string): Player {
  return {
    id,
    name,
    isHuman,
    peerId,
    hand: [],
    capturedCards: [],
    tricksWon: 0,
    isOnline: true,
  };
}

export const isValidGameState = (s: any): s is GameState =>
  !!s && typeof s === 'object' && Array.isArray(s.players) && !!s.gamePhase
  && (s.numPlayers === 5 || s.numPlayers === 6);

const cardStr = (c: Card): string => `${getRankLabel(c.rank)}${SUIT_SYMBOLS[c.suit]}`;

const nextClockwise = (idx: number, n: number): number => (idx + 1) % n;

/** Next active bidder (not yet passed). Returns -1 if only one or zero remain. */
const nextActiveBidder = (state: GameState, fromIdx: number): number => {
  const passed = new Set(state.passedPlayers);
  let i = nextClockwise(fromIdx, state.numPlayers);
  for (let step = 0; step < state.numPlayers; step++) {
    if (!passed.has(i)) return i;
    i = nextClockwise(i, state.numPlayers);
  }
  return -1;
};

const logPush = (log: string[], entry: string): string[] =>
  [...log, entry].slice(-MAX_LOG_ENTRIES);

export const gameReducer = (state: GameState, action: Action): GameState => {
  switch (action.type) {
    case 'SET_GAME_STATE':
      return isValidGameState(action.payload)
        ? { ...action.payload, chatLog: action.payload.chatLog ?? [] }
        : state;

    case 'INIT_LOBBY': {
      const { isHost, roomId, hostName, numPlayers } = action.payload;
      void isHost;
      const init = buildInitialState(numPlayers);
      return {
        ...init,
        roomId,
        players: Array.from({ length: numPlayers }, (_, i) =>
          makeEmptyPlayer(
            i,
            i === 0 ? (hostName || 'You (Host)') : EMPTY_SLOT_NAME,
            i === 0,
            i === 0 ? roomId : undefined,
          ),
        ),
      };
    }

    case 'SET_NUM_PLAYERS': {
      if (state.gamePhase !== 'LOBBY') return state;
      const { numPlayers } = action.payload;
      if (numPlayers === state.numPlayers) return state;
      // Preserve the host (slot 0) and any seated humans (up to numPlayers - 1).
      // Drop or pad with empty slots as needed.
      const humans = state.players.filter(p => p.isHuman);
      const seated: Player[] = [];
      for (let i = 0; i < numPlayers; i++) {
        const human = humans[i];
        if (human) {
          seated.push({ ...human, id: i });
        } else {
          seated.push(makeEmptyPlayer(i, EMPTY_SLOT_NAME, false));
        }
      }
      return {
        ...buildInitialState(numPlayers),
        roomId: state.roomId,
        players: seated,
        chatLog: state.chatLog,
        spectators: state.spectators,
      };
    }

    case 'START_GAME': {
      const { playerName, numPlayers } = action.payload;
      const botNames = pickBotNames(numPlayers - 1);
      const init = buildInitialState(numPlayers);
      return {
        ...init,
        gamePhase: 'LOBBY',
        players: [
          makeEmptyPlayer(0, playerName, true),
          ...botNames.map((n, i) => makeEmptyPlayer(i + 1, n, false)),
        ],
      };
    }

    case 'UPDATE_PLAYERS':
      return { ...state, players: action.payload };

    case 'SET_PLAYER_OFFLINE': {
      const idx = state.players.findIndex(p => p.peerId === action.payload.peerId);
      if (idx === -1) return state;
      const np = [...state.players];
      np[idx] = { ...np[idx], isOnline: false };
      return { ...state, players: np };
    }

    case 'START_ROUND': {
      const numPlayers = state.numPlayers;
      const deck = shuffleDeck(createDeck(numPlayers));
      // 350 is a one-round game — every START_ROUND comes from LOBBY. The
      // dealer sits at the last seat so slot 0 (the host) bids first.
      const dealerIndex = numPlayers - 1;
      const firstBidder = nextClockwise(dealerIndex, numPlayers);

      // First transition out of LOBBY — fill empty slots with bots, keeping
      // the host at slot 0. Pre-named bots from single-player are reused.
      let seated: Player[];
      if (state.gamePhase === 'LOBBY') {
        const slots: Player[] = [];
        // Reuse pre-named bots from the single-player path before generating
        // any new ones.
        const botPool: { name: string; existing?: Player }[] = state.players
          .filter(p => !p.isHuman && p.name !== EMPTY_SLOT_NAME)
          .map(p => ({ name: p.name, existing: p }));
        // Humans are seated by their lobby slot id when possible; any unseated
        // humans queue up into a remaining list so we never seat the same
        // human twice.
        const seatedHumanIds = new Set<number>();
        const humansById = new Map<number, Player>();
        for (const p of state.players) {
          if (p.isHuman) humansById.set(p.id, p);
        }
        const remainingHumans: Player[] = [];
        for (const p of state.players) {
          if (p.isHuman && p.id >= numPlayers) remainingHumans.push(p);
        }
        for (let i = 0; i < numPlayers; i++) {
          const exact = humansById.get(i);
          if (exact && !seatedHumanIds.has(exact.id)) {
            seatedHumanIds.add(exact.id);
            slots.push({ ...exact, id: i });
            continue;
          }
          // No human at this slot — try the overflow queue first, otherwise a bot.
          const overflowHuman = remainingHumans.shift();
          if (overflowHuman) {
            seatedHumanIds.add(overflowHuman.id);
            slots.push({ ...overflowHuman, id: i });
            continue;
          }
          if (botPool.length > 0) {
            const b = botPool.shift()!;
            const base = b.existing ?? makeEmptyPlayer(i, b.name, false);
            slots.push({ ...base, id: i });
            continue;
          }
          // Last resort: fresh bot.
          slots.push(makeEmptyPlayer(i, pickBotNames(1)[0], false));
        }
        seated = slots;
      } else {
        seated = state.players;
      }

      const initialDealSize = handSizeInitial(numPlayers);
      const players = seated.map(p => {
        const newHand = deck.splice(0, initialDealSize);
        return {
          ...p,
          hand: newHand,
          capturedCards: [],
          tricksWon: 0,
        };
      });

      return {
        ...state,
        gamePhase: 'BIDDING',
        deck,
        players,
        dealerIndex,
        currentTurn: firstBidder,
        biddingTurn: firstBidder,
        currentBid: null,
        highBidder: -1,
        passedPlayers: [],
        lastBids: Array(numPlayers).fill(null),
        bidWinner: -1,
        bidValue: 0,
        trumpSuit: null,
        trumpChooser: -1,
        partnerCards: [],
        bidderTeamIndices: [],
        currentTrick: [],
        trickLeader: 0,
        ledSuit: null,
        lastTrickWinner: -1,
        completedTricks: [],
        roundScores: { bidderTeam: 0, opposition: 0 },
        gameLog: [`${players[firstBidder].name} bids first`],
      };
    }

    case 'PLACE_BID': {
      const { playerIndex, amount } = action.payload;
      if (state.gamePhase !== 'BIDDING') return state;
      if (state.biddingTurn !== playerIndex) return state;
      if (state.passedPlayers.includes(playerIndex)) return state;
      if (amount < MIN_BID || amount > MAX_BID) return state;
      if (state.currentBid != null && amount <= state.currentBid) return state;

      const bidder = state.players[playerIndex];
      const log = logPush(state.gameLog, `${bidder.name} bids ${amount}`);
      const newLastBids = [...state.lastBids];
      newLastBids[playerIndex] = amount;

      const nextState: GameState = {
        ...state,
        currentBid: amount,
        highBidder: playerIndex,
        lastBids: newLastBids,
        gameLog: log,
      };

      // Move to next active bidder. Auction ends when only the high bidder
      // remains (i.e. nextActiveBidder loops around to high bidder or returns
      // -1 when only one player is active).
      const next = nextActiveBidder(nextState, playerIndex);
      const onlyHighBidderActive =
        next === -1 || next === nextState.highBidder;
      if (onlyHighBidderActive) {
        return finalizeAuction(nextState);
      }
      return { ...nextState, biddingTurn: next };
    }

    case 'PASS_BID': {
      const { playerIndex } = action.payload;
      if (state.gamePhase !== 'BIDDING') return state;
      if (state.biddingTurn !== playerIndex) return state;
      if (state.passedPlayers.includes(playerIndex)) return state;
      const passer = state.players[playerIndex];
      const log = logPush(state.gameLog, `${passer.name} passes`);
      const newPassed = [...state.passedPlayers, playerIndex];
      const newLastBids = [...state.lastBids];
      newLastBids[playerIndex] = 'pass';
      const nextState: GameState = {
        ...state,
        passedPlayers: newPassed,
        lastBids: newLastBids,
        gameLog: log,
      };

      // Everyone passed with no bids → all-pass redeal.
      if (nextState.currentBid == null && newPassed.length === nextState.numPlayers) {
        return {
          ...nextState,
          gameLog: logPush(log, 'All players passed — redealing'),
        };
      }

      const next = nextActiveBidder(nextState, playerIndex);
      const onlyOneActive = newPassed.length >= nextState.numPlayers - 1;

      if (onlyOneActive && nextState.highBidder >= 0) {
        return finalizeAuction(nextState);
      }
      if (next === -1) return nextState;
      return { ...nextState, biddingTurn: next };
    }

    case 'CHOOSE_TRUMP': {
      if (state.gamePhase !== 'CHOOSING_TRUMP') return state;
      if (state.bidWinner < 0) return state;
      const chooser = state.players[state.bidWinner];
      const suitName = SUIT_NAMES[action.payload.suit];
      return {
        ...state,
        trumpSuit: action.payload.suit,
        trumpChooser: state.bidWinner,
        gameLog: logPush(state.gameLog, `${chooser.name} chose ${suitName} as trump`),
      };
    }

    case 'DEAL_REMAINING': {
      // Dispatched after CHOOSE_TRUMP. Deals out the rest of the deck and
      // transitions to CALLING_PARTNERS.
      if (state.gamePhase !== 'CHOOSING_TRUMP') return state;
      if (!state.trumpSuit) return state;
      const numPlayers = state.numPlayers;
      const deck = [...state.deck];
      const target = handSizeFull(numPlayers);
      const players = state.players.map(p => {
        const need = target - p.hand.length;
        const extra = deck.splice(0, Math.max(0, need));
        return { ...p, hand: [...p.hand, ...extra] };
      });
      return {
        ...state,
        players,
        deck,
        gamePhase: 'CALLING_PARTNERS',
      };
    }

    case 'CALL_PARTNERS': {
      if (state.gamePhase !== 'CALLING_PARTNERS') return state;
      if (state.bidWinner < 0) return state;
      const required = partnerCardsForBid(state.bidValue);
      const ids = action.payload.cardIds;
      if (ids.length !== required) return state;

      const bidder = state.players[state.bidWinner];
      const bidderHandIds = new Set(bidder.hand.map(c => c.id));
      // Reject any called card that the bidder happens to hold.
      if (ids.some(id => bidderHandIds.has(id))) return state;

      // Resolve each id to a Card object by scanning all hands.
      const allCards: Card[] = state.players.flatMap(p => p.hand);
      const resolved: Card[] = [];
      for (const id of ids) {
        const c = allCards.find(c => c.id === id);
        if (!c) return state;
        if (!resolved.some(r => r.id === c.id)) resolved.push(c);
      }
      if (resolved.length !== required) return state;

      // Identify partners: any non-bidder holding at least one called card.
      const partnerIds = new Set(resolved.map(c => c.id));
      const teamIndices: number[] = [state.bidWinner];
      for (let i = 0; i < state.players.length; i++) {
        if (i === state.bidWinner) continue;
        const p = state.players[i];
        if (p.hand.some(c => partnerIds.has(c.id))) teamIndices.push(i);
      }

      const calledStr = resolved.map(c => cardStr(c)).join(', ');
      let log = logPush(state.gameLog, `${bidder.name} called ${calledStr}`);
      log = logPush(log, `Bidder leads — partners revealed as their cards are played`);

      return {
        ...state,
        partnerCards: resolved,
        bidderTeamIndices: teamIndices,
        gamePhase: 'PLAYING',
        currentTurn: state.bidWinner,
        trickLeader: state.bidWinner,
        ledSuit: null,
        currentTrick: [],
        gameLog: log,
      };
    }

    case 'PLAY_CARD': {
      const { playerIndex, cardId } = action.payload;
      if (state.gamePhase !== 'PLAYING') return state;
      if (state.currentTurn !== playerIndex) return state;
      const player = state.players[playerIndex];
      const card = player.hand.find(c => c.id === cardId);
      if (!card) return state;
      if (state.currentTrick.length >= state.numPlayers) return state;

      // Enforce follow-suit if possible.
      const leadingTrick = state.currentTrick.length === 0;
      if (!leadingTrick && state.ledSuit) {
        const canFollow = player.hand.some(c => c.suit === state.ledSuit);
        if (canFollow && card.suit !== state.ledSuit) return state;
      }

      const newHand = player.hand.filter(c => c.id !== cardId);
      const newPlayers = [...state.players];
      newPlayers[playerIndex] = { ...player, hand: newHand };

      const newTrick = [...state.currentTrick, { playerIndex, card }];
      const newLedSuit = leadingTrick ? card.suit : state.ledSuit!;

      const log = logPush(state.gameLog, `${player.name} played ${cardStr(card)}`);
      const trickComplete = newTrick.length === state.numPlayers;

      return {
        ...state,
        players: newPlayers,
        currentTrick: newTrick,
        ledSuit: newLedSuit,
        trickLeader: leadingTrick ? playerIndex : state.trickLeader,
        currentTurn: trickComplete ? state.currentTurn : nextClockwise(playerIndex, state.numPlayers),
        gameLog: log,
      };
    }

    case 'COMPLETE_TRICK': {
      if (state.gamePhase !== 'PLAYING') return state;
      if (state.currentTrick.length !== state.numPlayers) return state;
      if (!state.ledSuit) return state;
      const winnerPlay = getTrickWinner(
        state.currentTrick,
        state.ledSuit,
        state.trumpSuit,
      );
      const winnerIdx = winnerPlay.playerIndex;
      const winner = state.players[winnerIdx];

      const trickCards = state.currentTrick.map(tp => tp.card);
      const newPlayers = state.players.map((p, idx) =>
        idx === winnerIdx
          ? { ...p, capturedCards: [...p.capturedCards, ...trickCards], tricksWon: p.tricksWon + 1 }
          : p,
      );

      const trickNumber = state.completedTricks.length + 1;
      const isLastTrick = trickNumber === numTricks(state.numPlayers);

      const completed: CompletedTrick = {
        leaderIndex: state.trickLeader,
        ledSuit: state.ledSuit,
        plays: state.currentTrick,
        winnerIndex: winnerIdx,
        isLast: isLastTrick,
      };

      const log = logPush(
        state.gameLog,
        `${winner.name} wins trick ${trickNumber} with ${cardStr(winnerPlay.card)}`,
      );

      return {
        ...state,
        players: newPlayers,
        currentTrick: [],
        ledSuit: null,
        trickLeader: winnerIdx,
        currentTurn: winnerIdx,
        lastTrickWinner: winnerIdx,
        completedTricks: [...state.completedTricks, completed],
        gameLog: log,
      };
    }

    case 'END_ROUND': {
      // 350 is a one-shot game: a single round resolves into GAME_OVER.
      // No game-point accumulation, no carry-over between sessions.
      const bidderTeam = new Set(state.bidderTeamIndices);
      const bidderPts = state.players
        .filter(p => bidderTeam.has(p.id))
        .reduce((sum, p) => sum + cardPoints(p.capturedCards), 0);
      const oppPts = state.players
        .filter(p => !bidderTeam.has(p.id))
        .reduce((sum, p) => sum + cardPoints(p.capturedCards), 0);

      const target = state.bidValue;
      const bidderMade = bidderPts >= target;

      const bidderName = state.players[state.bidWinner]?.name ?? 'Bidder';
      const partnerNames = state.bidderTeamIndices
        .filter(i => i !== state.bidWinner)
        .map(i => state.players[i].name)
        .join(', ') || 'no partners';

      let nextLog = logPush(state.gameLog, 'Game over');
      nextLog = logPush(nextLog, `Bidder team scored ${bidderPts} of ${target}`);
      nextLog = logPush(nextLog, `Opposition scored ${oppPts}`);
      nextLog = logPush(nextLog, `${bidderName} ${bidderMade ? 'made the bid' : 'missed the bid'}`);
      nextLog = logPush(nextLog, `Partners: ${partnerNames}`);

      return {
        ...state,
        gamePhase: 'GAME_OVER',
        roundScores: { bidderTeam: bidderPts, opposition: oppPts },
        gameLog: nextLog,
      };
    }

    case 'RETURN_TO_LOBBY': {
      if (state.gamePhase !== 'GAME_OVER') return state;
      const { playerIndex } = action.payload;
      const ready = new Set(state.readyForLobbyIndices || []);
      ready.add(playerIndex);
      const humans = state.players.filter(p => p.isHuman);
      const allReady = humans.every(p => ready.has(p.id));
      if (!allReady) {
        return { ...state, readyForLobbyIndices: Array.from(ready) };
      }
      // Full reset: lobby phase, blank hands and captures, only the room
      // identity and player names/peerIds carry across.
      return {
        ...buildInitialState(state.numPlayers),
        roomId: state.roomId,
        players: state.players.map(p => ({
          ...p,
          hand: [],
          capturedCards: [],
          tricksWon: 0,
        })),
      };
    }

    case 'ADD_LOG':
      return { ...state, gameLog: logPush(state.gameLog, action.payload) };

    case 'SEND_CHAT':
      return {
        ...state,
        chatLog: [...(state.chatLog ?? []), action.payload].slice(-CHAT_MAX_HISTORY),
      };

    case 'ADD_SPECTATOR': {
      const list = state.spectators ?? [];
      if (list.some(sp => sp.peerId === action.payload.peerId)) return state;
      return { ...state, spectators: [...list, action.payload] };
    }

    case 'REMOVE_SPECTATOR': {
      const list = state.spectators ?? [];
      return { ...state, spectators: list.filter(sp => sp.peerId !== action.payload.peerId) };
    }

    default:
      return state;
  }
};

// ============================================================
// Helpers
// ============================================================

function finalizeAuction(state: GameState): GameState {
  if (state.highBidder < 0 || state.currentBid == null) return state;
  const winner = state.players[state.highBidder];
  return {
    ...state,
    gamePhase: 'CHOOSING_TRUMP',
    bidWinner: state.highBidder,
    bidValue: state.currentBid,
    biddingTurn: state.highBidder,
    currentTurn: state.highBidder,
    gameLog: logPush(
      state.gameLog,
      `${winner.name} won the bid at ${state.currentBid}`,
    ),
  };
}
