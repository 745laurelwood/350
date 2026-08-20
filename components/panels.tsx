import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage, GameState, Suit } from '../types';
import {
  SUIT_SYMBOLS,
  CHAT_MAX_LEN,
  Z_HUD, Z_ACTION_BAR,
} from '../constants';
import { MAX_BID, MIN_BID, BID_STEP } from '../rules';
import { partnersRevealed, teamCardPoints } from '../utils/gameLogic';

/** HUD panel: bid/trump, plus live team scores once partners are revealed. */
export function HUD({
  state, isMultiplayer, roomId,
}: {
  state: GameState; isMultiplayer: boolean; roomId: string;
}) {
  const [copied, setCopied] = useState(false);
  const copyRoom = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }).catch(() => {});
  };

  const bidder = state.bidWinner >= 0 ? state.players[state.bidWinner] : null;
  const showTrump = !!state.trumpSuit && state.gamePhase !== 'BIDDING' && state.gamePhase !== 'CHOOSING_TRUMP';
  const teamsVisible = partnersRevealed(state);
  const teamPts = teamsVisible ? teamCardPoints(state) : null;

  return (
    <div className="glass-panel px-3 py-2 sm:px-4 sm:py-3 rounded-2xl isolate" style={{ zIndex: Z_HUD }}>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-stretch gap-0.5 rounded-full pill-chip p-0.5 sm:p-1">
          {teamPts && (
            <>
              <div className="flex flex-col items-center justify-center px-2.5 py-0.5 sm:px-5 sm:py-1 rounded-full">
                <span className="text-[9px] uppercase tracking-[0.16em]" style={{ color: 'var(--accent)' }}>Bidder</span>
                <span className="font-display text-sm sm:text-base leading-none tabular-nums" style={{ color: 'var(--accent)' }}>
                  {teamPts.bidder}
                </span>
              </div>
              <div className="w-px my-1" style={{ background: 'var(--line)' }} />
              <div className="flex flex-col items-center justify-center px-2.5 py-0.5 sm:px-5 sm:py-1 rounded-full">
                <span className="text-[9px] uppercase tracking-[0.16em]" style={{ color: 'var(--red)' }}>Opp</span>
                <span className="font-display text-sm sm:text-base leading-none tabular-nums" style={{ color: 'var(--red)' }}>
                  {teamPts.opposition}
                </span>
              </div>
              <div className="w-px my-1" style={{ background: 'var(--line)' }} />
            </>
          )}
          <div className="flex flex-col items-center justify-center px-2.5 py-0.5 sm:px-5 sm:py-1 rounded-full">
            <span className="text-[9px] uppercase tracking-[0.16em]" style={{ color: 'var(--dim)' }}>Bid</span>
            <span
              className="font-display text-sm sm:text-base leading-none tabular-nums"
              style={{ color: bidder ? 'var(--gold)' : 'var(--dim)' }}
            >
              {bidder ? state.bidValue : '-'}
            </span>
          </div>
          {showTrump && state.trumpSuit && (
            <>
              <div className="w-px my-1" style={{ background: 'var(--line)' }} />
              <div className="flex flex-col items-center justify-center px-2.5 py-0.5 sm:px-5 sm:py-1 rounded-full">
                <span className="text-[9px] uppercase tracking-[0.16em]" style={{ color: 'var(--dim)' }}>Trump</span>
                <span
                  className="font-display text-base sm:text-lg leading-none"
                  style={{
                    color: state.trumpSuit === Suit.Hearts || state.trumpSuit === Suit.Diamonds
                      ? '#ff7c85' : 'var(--fg)',
                  }}
                >
                  {SUIT_SYMBOLS[state.trumpSuit]}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {(bidder || (isMultiplayer && roomId)) && (
        <div className="mt-2 flex flex-col gap-y-1 text-[14px]" style={{ color: 'var(--dim)' }}>
          {bidder && (
            <div>
              <span className="text-[color:var(--fg)]">{bidder.name}</span>
              <span> bid </span>
              <span style={{ color: 'var(--gold)' }}>{state.bidValue}</span>
            </div>
          )}
          {isMultiplayer && roomId && (
            <div className="flex items-center gap-x-3">
              <button
                onClick={copyRoom}
                title="Click to copy"
                className="ml-auto font-mono hover:text-[color:var(--accent)] transition-colors"
              >
                {copied ? 'Copied!' : roomId}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Persistent badge showing the trump suit + called partner cards. */
export function TrumpBadge({ suit, partnerCardLabels }: { suit: Suit; partnerCardLabels?: string[] }) {
  const isRed = suit === Suit.Hearts || suit === Suit.Diamonds;
  return (
    <div
      className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 px-3 py-1.5 rounded-xl flex flex-col items-start gap-0.5 pointer-events-none"
      style={{
        background: 'var(--felt)',
        border: '1px solid var(--felt-rim)',
        color: 'var(--fg)',
        fontWeight: 600,
        fontSize: '0.9rem',
        boxShadow: '0 3px 10px rgba(0,0,0,0.35)',
      }}
    >
      <div className="flex items-center gap-2">
        <span>Trump</span>
        <span style={{ fontSize: '1.3em', lineHeight: 1, color: isRed ? '#ff7c85' : 'var(--fg)' }}>
          {SUIT_SYMBOLS[suit]}
        </span>
      </div>
      {partnerCardLabels && partnerCardLabels.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gold)' }}>
          <span style={{ color: 'var(--dim)', fontWeight: 500 }}>Called:</span>
          {partnerCardLabels.map((lbl, i) => (
            <span key={i}>{lbl}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Bidding controls: scrollable bid chips + gavel + X. */
export function BiddingControls({
  minBidAmount, onBid, onPass, disabled,
}: {
  minBidAmount: number;
  onBid: (amount: number) => void;
  onPass: () => void;
  disabled?: boolean;
}) {
  const [amount, setAmount] = useState<number | null>(null);

  const range = React.useMemo(() => {
    const arr: number[] = [];
    // Round minBidAmount up to nearest BID_STEP-aligned value >= MIN_BID.
    const start = Math.max(MIN_BID, Math.ceil(minBidAmount / BID_STEP) * BID_STEP);
    for (let i = start; i <= MAX_BID; i += BID_STEP) arr.push(i);
    return arr;
  }, [minBidAmount]);

  React.useEffect(() => {
    setAmount(prev => (prev != null && prev >= minBidAmount && prev <= MAX_BID ? prev : null));
  }, [minBidAmount]);

  React.useEffect(() => {
    if (disabled) setAmount(null);
  }, [disabled]);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const atStart = el.scrollLeft <= 0 && e.deltaY < 0;
      const atEnd = el.scrollLeft >= max && e.deltaY > 0;
      if (atStart || atEnd) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const canBid = !disabled && amount != null && amount >= minBidAmount && amount <= MAX_BID;

  return (
    <div
      className="w-full flex items-stretch justify-center gap-2"
      style={{ zIndex: Z_ACTION_BAR, height: 52 }}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          width: '11.5rem',
          background: 'rgba(0,0,0,0.22)',
          border: '1px solid rgba(111,176,255,0.45)',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.22)',
        }}
      >
        <div
          ref={scrollerRef}
          className="h-full overflow-x-auto no-scrollbar"
          style={{
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-x',
            maskImage:
              'linear-gradient(90deg, transparent 0, #000 14px, #000 calc(100% - 14px), transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(90deg, transparent 0, #000 14px, #000 calc(100% - 14px), transparent 100%)',
          }}
        >
          <div className="flex h-full items-center gap-1.5 px-2">
            {range.map(n => {
              const selected = n === amount;
              return (
                <button
                  key={n}
                  onClick={() => setAmount(n)}
                  disabled={disabled}
                  className="font-display tabular-nums transition-all active:scale-95 flex-shrink-0 flex items-center justify-center"
                  style={{
                    width: 50,
                    height: 36,
                    borderRadius: 10,
                    fontSize: selected ? '1.1rem' : '0.9rem',
                    fontWeight: 500,
                    background: selected ? 'var(--accent)' : 'transparent',
                    color: selected ? '#06121f' : 'var(--fg-soft)',
                    border: selected ? '1px solid var(--accent)' : '1px solid transparent',
                    boxShadow: selected ? '0 2px 8px rgba(111,176,255,0.35)' : 'none',
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <button
        onClick={() => { if (amount != null) onBid(amount); }}
        disabled={!canBid}
        title={amount != null ? `Bid ${amount}` : 'Select a number to bid'}
        aria-label={amount != null ? `Bid ${amount}` : 'Bid'}
        className={`rounded-2xl flex items-center justify-center transition-all active:scale-[0.96] ${
          canBid ? 'hover:brightness-110' : 'cursor-not-allowed opacity-50'
        }`}
        style={{
          width: 52,
          height: 52,
          background: 'rgba(111,176,255,0.15)',
          color: 'var(--accent)',
          border: '1px solid rgba(111,176,255,0.45)',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8" />
          <path d="m16 16 6-6" />
          <path d="m8 8 6-6" />
          <path d="m9 7 8 8" />
          <path d="m21 11-8-8" />
        </svg>
      </button>

      <button
        onClick={onPass}
        disabled={disabled}
        title="Pass"
        aria-label="Pass"
        className={`rounded-2xl flex items-center justify-center transition-all active:scale-[0.96] ${
          disabled ? 'cursor-not-allowed opacity-50' : 'hover:brightness-110'
        }`}
        style={{
          width: 52,
          height: 52,
          background: 'rgba(232,146,154,0.15)',
          color: 'var(--red)',
          border: '1px solid rgba(232,146,154,0.45)',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
