import React, { useState } from 'react';
import { GameState } from '../types';
import { SavedSession, clearSession } from '../utils/session';
import { EMPTY_SLOT_NAME } from '../constants';
import { PlayerCount, VALID_PLAYER_COUNTS } from '../rules';
import { Rulebook } from '../components/Rulebook';

interface LobbyProps {
  state: GameState;
  isMultiplayer: boolean;
  isHost: boolean;
  peerId: string;
  myIndex: number;
  playerName: string;
  setPlayerName: (n: string) => void;
  joinId: string;
  setJoinId: (s: string) => void;
  savedSession: SavedSession | null;
  setSavedSession: (s: SavedSession | null) => void;
  joinError: string | null;
  clearJoinError: () => void;
  onCreateRoom: (numPlayers: PlayerCount, resume?: Extract<SavedSession, { role: 'host' }>) => void;
  onJoinRoom: (resume?: Extract<SavedSession, { role: 'client' }>) => void;
  onStartSinglePlayer: (numPlayers: PlayerCount) => void;
  onStartRound: () => void;
  onLeaveRoom: () => void;
  onSetNumPlayers: (numPlayers: PlayerCount) => void;
}

const inputCls = "w-full rounded-xl px-4 py-3 text-center focus:outline-none font-display font-semibold text-lg sm:text-xl transition-all";
const inputStyle: React.CSSProperties = {
  background: 'var(--bg-1)',
  border: '1px solid var(--line)',
  color: 'var(--fg)',
};

export const Lobby: React.FC<LobbyProps> = ({
  state, isMultiplayer, isHost, peerId, myIndex,
  playerName, setPlayerName,
  joinId, setJoinId,
  savedSession, setSavedSession,
  joinError, clearJoinError,
  onCreateRoom, onJoinRoom, onStartSinglePlayer, onStartRound, onLeaveRoom, onSetNumPlayers,
}) => {
  const [showRulebook, setShowRulebook] = useState(false);
  const [chosenCount, setChosenCount] = useState<PlayerCount>(5);
  if (showRulebook) return <Rulebook onClose={() => setShowRulebook(false)} />;

  return (
    <div className="min-h-screen min-h-dvh royal-bg flex items-center justify-center relative overflow-hidden px-4 py-6" style={{ color: 'var(--fg)' }}>
      {!isMultiplayer ? (
        <div className="relative z-10 glass-panel p-6 sm:p-8 rounded-2xl max-w-md w-full text-center">
          <h1 className="text-4xl sm:text-5xl font-display mb-1" style={{ color: 'var(--accent)' }}>350</h1>
          <h2 className="text-xs sm:text-sm mb-7 tracking-[0.22em] uppercase" style={{ color: 'var(--dim)' }}>5/6-Player Trick-Taking</h2>
          {joinError && (
            <div
              className="mb-5 p-3 rounded-xl text-left flex items-start gap-3"
              style={{ background: 'rgba(232,146,154,0.08)', border: '1px solid rgba(232,146,154,0.35)' }}
            >
              <p className="text-sm flex-1" style={{ color: 'var(--red)' }}>{joinError}</p>
              <button
                onClick={clearJoinError}
                className="text-xs px-2 py-0.5 rounded-md transition-all"
                style={{ background: 'rgba(232,146,154,0.12)', color: 'var(--red)', border: '1px solid rgba(232,146,154,0.4)' }}
              >
                Dismiss
              </button>
            </div>
          )}
          {savedSession && (
            <div
              className="mb-5 p-4 rounded-xl text-left"
              style={{ background: 'rgba(111,176,255,0.06)', border: '1px solid var(--accent-soft)' }}
            >
              <p className="text-sm mb-1" style={{ color: 'var(--accent)' }}>Resume your previous session?</p>
              <p className="text-xs mb-3 font-mono" style={{ color: 'var(--fg-soft)' }}>
                {savedSession.role === 'host' ? 'Host' : 'Player'} · Room {savedSession.roomId} · {savedSession.playerName}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (savedSession.role === 'host') onCreateRoom(savedSession.state.numPlayers, savedSession);
                    else onJoinRoom(savedSession);
                    setSavedSession(null);
                  }}
                  className="btn-accent flex-1 py-2 rounded-lg font-semibold text-sm"
                >
                  Resume
                </button>
                <button
                  onClick={() => { clearSession(); setSavedSession(null); }}
                  className="px-4 py-2 rounded-lg text-sm transition-all"
                  style={{ background: 'var(--bg-2)', color: 'var(--fg-soft)', border: '1px solid var(--line)' }}
                >
                  Discard
                </button>
              </div>
            </div>
          )}
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              maxLength={15}
              className={inputCls}
              style={inputStyle}
            />

            <div className="flex items-stretch p-0.5 rounded-full" style={{ background: 'var(--bg-1)', border: '1px solid var(--line)' }}>
              {VALID_PLAYER_COUNTS.map(n => {
                const active = chosenCount === n;
                return (
                  <button
                    key={n}
                    onClick={() => setChosenCount(n)}
                    className="flex-1 py-2 rounded-full text-sm font-semibold tracking-wider transition-all"
                    style={{
                      background: active ? 'var(--accent)' : 'transparent',
                      color: active ? '#06121f' : 'var(--fg-soft)',
                      cursor: active ? 'default' : 'pointer',
                    }}
                  >
                    {n} Players
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => onCreateRoom(chosenCount)}
              className="btn-accent w-full py-3.5 rounded-xl text-base sm:text-lg font-semibold"
            >
              Create Room
            </button>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Room ID"
                value={joinId}
                onChange={e => setJoinId(e.target.value.toUpperCase())}
                className="flex-1 rounded-xl px-4 py-3 text-center focus:outline-none font-semibold transition-all"
                style={inputStyle}
              />
              <button
                onClick={() => onJoinRoom()}
                className="px-5 py-3 rounded-xl text-sm sm:text-base font-semibold transition-all active:scale-95"
                style={{ background: 'var(--bg-1)', color: 'var(--fg)', border: '1px solid var(--accent-soft)' }}
              >
                Join
              </button>
            </div>
            <div className="flex items-center justify-center gap-3 py-2">
              <div className="h-px flex-1" style={{ background: 'var(--line)' }} />
              <span className="uppercase text-[10px] tracking-[0.18em]" style={{ color: 'var(--dim)' }}>Practice</span>
              <div className="h-px flex-1" style={{ background: 'var(--line)' }} />
            </div>
            <button
              onClick={() => onStartSinglePlayer(chosenCount)}
              className="w-full py-3 rounded-xl text-base font-semibold transition-all active:scale-[0.98] hover:brightness-110"
              style={{
                background: 'linear-gradient(180deg, #b8e0b0 0%, #8fc992 100%)',
                color: '#0f2a1a',
                border: '1px solid rgba(127,215,169,0.5)',
                boxShadow: '0 4px 14px rgba(127,215,169,0.25)',
              }}
            >
              Single Player ({chosenCount}p)
            </button>
            <button
              onClick={() => setShowRulebook(true)}
              className="w-full py-3 rounded-xl text-base transition-all active:scale-[0.98]"
              style={{ background: 'var(--bg-1)', color: 'var(--fg-soft)', border: '1px solid var(--line)' }}
            >
              Rulebook
            </button>
          </div>
        </div>
      ) : (
        <div className="relative z-10 glass-panel p-6 sm:p-8 rounded-2xl max-w-xl w-full">
          <h2 className="text-2xl sm:text-3xl font-display text-center mb-5" style={{ color: 'var(--accent)' }}>Lobby</h2>
          {isHost && (
            <div className="mb-5 p-4 rounded-xl text-center" style={{ background: 'var(--bg-1)', border: '1px solid var(--line)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--dim)' }}>Share this Room ID with friends:</p>
              <p
                className="text-xl sm:text-2xl font-mono tracking-widest select-all cursor-pointer hover:brightness-110"
                style={{ color: 'var(--accent)' }}
                onClick={() => navigator.clipboard.writeText(peerId)}
              >
                {peerId}
              </p>
            </div>
          )}
          {isHost && (
            <div className="mb-4 flex items-center justify-center gap-2">
              <span className="text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--dim)' }}>Players</span>
              <div className="flex items-stretch p-0.5 rounded-full" style={{ background: 'var(--bg-1)', border: '1px solid var(--line)' }}>
                {VALID_PLAYER_COUNTS.map(n => {
                  const active = state.numPlayers === n;
                  return (
                    <button
                      key={n}
                      onClick={() => onSetNumPlayers(n)}
                      className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
                      style={{
                        background: active ? 'var(--accent)' : 'transparent',
                        color: active ? '#06121f' : 'var(--fg-soft)',
                        cursor: active ? 'default' : 'pointer',
                      }}
                      disabled={active}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            {state.players.map((p, i) => {
              const isEmpty = p.name === EMPTY_SLOT_NAME;
              const isMe = i === myIndex;
              return (
                <div
                  key={i}
                  className="p-3 rounded-xl flex items-center justify-between gap-2"
                  style={{ background: 'var(--bg-1)', border: '1px solid var(--line)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center font-display text-sm shrink-0"
                      style={{
                        background: isEmpty ? 'var(--bg-2)' : 'var(--accent)',
                        color: isEmpty ? 'var(--dim)' : '#06121f',
                      }}
                    >
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm" style={{ color: isEmpty ? 'var(--dim)' : 'var(--fg)', fontStyle: isEmpty ? 'italic' : 'normal' }}>
                        {p.name}
                        {isMe && !isEmpty && <span className="ml-1 text-[10px]" style={{ color: 'var(--dim)' }}>(you)</span>}
                      </div>
                      {!p.isHuman && !isEmpty && (
                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--accent)' }}>Bot</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {isHost ? (
            <button
              onClick={onStartRound}
              className="w-full py-3.5 rounded-xl text-base sm:text-lg font-semibold btn-accent"
            >
              Start Game
            </button>
          ) : (
            <div className="text-center animate-pulse" style={{ color: 'var(--fg-soft)' }}>Waiting for host to start</div>
          )}
          <button
            onClick={onLeaveRoom}
            className="mt-3 w-full py-2 text-sm transition-colors"
            style={{ color: 'var(--dim)' }}
          >
            Leave
          </button>
        </div>
      )}
    </div>
  );
};
