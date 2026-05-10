import React, { useState, useMemo, useEffect } from 'react';
import { CardComponent } from './CardComponent';
import { BiddingControls } from './panels';
import { useGame } from '../GameContext';
import { Suit, Card } from '../types';
import {
  SUIT_SYMBOLS, SUIT_COLORS,
} from '../constants';
import {
  SUIT_NAMES,
  numTricks,
  compareCardStrength,
} from '../rules';
import { clearSession } from '../utils/session';
import { Slot } from '../utils/positions';

/** Felt centre: bidding / trump / partner-call / current-trick. */
export const FeltContent: React.FC = () => {
  const {
    state, myIndex, isHost, isSpectator, handleDispatch,
    canChooseTrump, executeChooseTrump,
    canCallPartners, partnersRequired, callableCards, executeCallPartners,
    canBid, minBidAmount, executeBid, executePass,
    positions,
  } = useGame();

  // ── GAME OVER ──
  if (state.gamePhase === 'GAME_OVER') {
    const { roundScores, bidValue, bidWinner } = state;
    const bidder = state.players[bidWinner];
    const bidderTeam = new Set(state.bidderTeamIndices);
    const bidderMade = roundScores.bidderTeam >= bidValue;
    const bidderTeamPlayers = state.players.filter(p => bidderTeam.has(p.id));
    const oppositionPlayers = state.players.filter(p => !bidderTeam.has(p.id));

    const readySet = new Set(state.readyForLobbyIndices || []);
    const humanPlayers = state.players.filter(p => p.isHuman);
    const totalHumans = humanPlayers.length;
    const readyHumans = humanPlayers.filter(p => readySet.has(p.id)).length;
    const iAmReady = readySet.has(myIndex);

    return (
      <div className="flex flex-col items-center gap-4 sm:gap-5 px-4 py-6 sm:py-8 max-w-xl w-full">
        <div className="text-center">
          <div className="text-xs sm:text-sm uppercase tracking-[0.2em]" style={{ color: 'var(--dim)' }}>Game Over</div>
          <div className="mt-1 text-lg sm:text-xl font-display" style={{ color: 'var(--fg)' }}>
            {bidder && (
              <>
                <span style={{ color: bidderMade ? 'var(--accent)' : 'var(--red)' }}>
                  {bidderMade ? 'Bidder team wins' : 'Opposition wins'}
                </span>
              </>
            )}
          </div>
          <div className="text-xs sm:text-sm mt-1" style={{ color: 'var(--fg-soft)' }}>
            Target {bidValue} · Bidder team captured {roundScores.bidderTeam}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
          <div
            className="p-3 sm:p-4 rounded-xl"
            style={{
              background: bidderMade ? 'rgba(111,176,255,0.08)' : 'var(--bg-1)',
              border: `1px solid ${bidderMade ? 'rgba(111,176,255,0.35)' : 'var(--line)'}`,
            }}
          >
            <div className="text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--dim)' }}>Bidder Team</div>
            <div className="text-xl sm:text-2xl font-display" style={{ color: 'var(--accent)' }}>
              {roundScores.bidderTeam}
            </div>
            <ul className="mt-2 text-[11px] sm:text-xs space-y-0.5" style={{ color: 'var(--fg-soft)' }}>
              {bidderTeamPlayers.map(p => (
                <li key={p.id}>
                  {p.name}{p.id === bidWinner && <span className="ml-1" style={{ color: 'var(--gold)' }}>★</span>}
                </li>
              ))}
            </ul>
          </div>
          <div
            className="p-3 sm:p-4 rounded-xl"
            style={{
              background: !bidderMade ? 'rgba(232,146,154,0.08)' : 'var(--bg-1)',
              border: `1px solid ${!bidderMade ? 'rgba(232,146,154,0.35)' : 'var(--line)'}`,
            }}
          >
            <div className="text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--dim)' }}>Opposition</div>
            <div className="text-xl sm:text-2xl font-display" style={{ color: 'var(--red)' }}>
              {roundScores.opposition}
            </div>
            <ul className="mt-2 text-[11px] sm:text-xs space-y-0.5" style={{ color: 'var(--fg-soft)' }}>
              {oppositionPlayers.map(p => (<li key={p.id}>{p.name}</li>))}
            </ul>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => {
              if (isHost) clearSession();
              handleDispatch({ type: 'RETURN_TO_LOBBY', payload: { playerIndex: myIndex } });
            }}
            disabled={iAmReady}
            className={`px-6 py-2.5 rounded-xl text-sm sm:text-base font-semibold transition-all ${
              iAmReady
                ? 'text-[color:var(--dimmer)] bg-[color:var(--bg-1)]/50 border border-[color:var(--line-soft)] cursor-not-allowed'
                : 'btn-accent'
            }`}
          >
            {iAmReady ? 'Waiting for others' : 'Return to Lobby'}
          </button>
          {totalHumans > 1 && (
            <p className="text-xs" style={{ color: 'var(--dim)' }}>
              {readyHumans} / {totalHumans} ready
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── BIDDING ──
  if (state.gamePhase === 'BIDDING') {
    const current = state.players[state.biddingTurn];
    return (
      <div className="flex flex-col items-center gap-4 sm:gap-5">
        <div className="text-sm sm:text-base uppercase tracking-[0.2em]" style={{ color: 'var(--dim)' }}>Auction</div>
        <div className="text-xl sm:text-3xl md:text-4xl font-display" style={{ color: 'var(--fg)' }}>
          {state.currentBid == null
            ? 'No bids yet'
            : <>High bid <span style={{ color: 'var(--gold)' }}>{state.currentBid}</span> by {state.players[state.highBidder]?.name}</>
          }
        </div>
        {current && (
          <div className="text-base sm:text-lg md:text-xl animate-pulse" style={{ color: 'var(--fg-soft)' }}>
            {!isSpectator && current.id === myIndex ? 'Your turn to bid' : `${current.name} is bidding...`}
          </div>
        )}
        <div className="mt-2" style={{ width: 'min(92vw, 28rem)' }}>
          <BiddingControls
            minBidAmount={minBidAmount}
            onBid={executeBid}
            onPass={executePass}
            disabled={!canBid}
          />
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-2">
          {state.players.map(p => {
            const passed = state.passedPlayers.includes(p.id);
            const bid = state.lastBids?.[p.id];
            const hasBid = typeof bid === 'number';
            const isHigh = p.id === state.highBidder;
            return (
              <span
                key={p.id}
                className="text-sm sm:text-base px-3 py-1.5 rounded-full"
                style={{
                  background: passed ? 'var(--bg-1)' : 'var(--bg-2)',
                  border: '1px solid var(--line)',
                  color: passed ? 'var(--dim)' : 'var(--fg-soft)',
                  textDecoration: passed ? 'line-through' : 'none',
                }}
              >
                {p.name}
                {hasBid && (
                  <span style={{ color: isHigh ? 'var(--gold)' : 'var(--accent)', marginLeft: 6, fontWeight: isHigh ? 700 : 500 }}>
                    {bid}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  // ── CHOOSING TRUMP ──
  if (state.gamePhase === 'CHOOSING_TRUMP') {
    const chooser = state.players[state.bidWinner];
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="text-xs sm:text-sm uppercase tracking-[0.2em]" style={{ color: 'var(--dim)' }}>Trump Selection</div>
        {canChooseTrump ? (
          <>
            <div className="text-base sm:text-lg font-display" style={{ color: 'var(--fg)' }}>
              Choose the Trump Suit
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {(Object.values(Suit) as Suit[]).map(suit => (
                <button
                  key={suit}
                  onClick={() => executeChooseTrump(suit)}
                  className={`
                    relative w-20 h-24 sm:w-24 sm:h-28 rounded-xl flex flex-col items-center justify-center
                    transition-all hover:-translate-y-1 active:scale-95
                    ${SUIT_COLORS[suit]}
                  `}
                  style={{
                    background: 'linear-gradient(180deg, #faf9f5 0%, #ece8de 100%)',
                    border: '1px solid var(--line)',
                    boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
                  }}
                  title={`Choose ${SUIT_NAMES[suit]}`}
                >
                  <div className="text-5xl sm:text-6xl">{SUIT_SYMBOLS[suit]}</div>
                  <div className="text-[10px] uppercase tracking-[0.14em] mt-1 opacity-70">{SUIT_NAMES[suit]}</div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="text-sm animate-pulse" style={{ color: 'var(--fg-soft)' }}>
            {chooser ? `${chooser.name} is choosing the trump...` : 'Waiting...'}
          </div>
        )}
      </div>
    );
  }

  // ── CALLING PARTNERS ──
  if (state.gamePhase === 'CALLING_PARTNERS') {
    return <CallingPartnersFelt
      canCallPartners={canCallPartners}
      partnersRequired={partnersRequired}
      callableCards={callableCards}
      inHand={state.players[myIndex]?.hand ?? []}
      executeCallPartners={executeCallPartners}
      bidderName={state.players[state.bidWinner]?.name ?? 'Bidder'}
    />;
  }

  // ── PLAYING: arrange trick cards by slot around the centre ──
  const slotFor = (playerIndex: number): Slot => {
    const p = positions.find(p => p.playerIndex === playerIndex);
    return p?.slot ?? 'top-center';
  };

  const positionStyle: Record<Slot, string> = {
    bottom: 'translate-y-14 sm:translate-y-14 md:translate-y-20',
    'top-center': '-translate-y-14 sm:-translate-y-14 md:-translate-y-20',
    'top-left': '-translate-x-12 -translate-y-12 sm:-translate-x-16 sm:-translate-y-12 md:-translate-x-24 md:-translate-y-16',
    'top-right': 'translate-x-12 -translate-y-12 sm:translate-x-16 sm:-translate-y-12 md:translate-x-24 md:-translate-y-16',
    left:   '-translate-x-16 sm:-translate-x-20 md:-translate-x-28',
    right:  'translate-x-16 sm:translate-x-20 md:translate-x-28',
  };

  return (
    <div className="relative w-full min-h-[160px] sm:min-h-[220px] flex items-center justify-center">
      {state.currentTrick.length === 0 && (
        <div className="text-xs sm:text-sm opacity-60 text-center px-4" style={{ color: 'var(--fg-soft)' }}>
          Trick {state.completedTricks.length + 1} of {numTricks(state.numPlayers)}.{' '}
          {state.players[state.currentTurn]
            ? (!isSpectator && state.currentTurn === myIndex ? 'your lead' : `${state.players[state.currentTurn].name} leads`)
            : ''
          }
        </div>
      )}
      {state.currentTrick.map(tp => {
        const slot = slotFor(tp.playerIndex);
        return (
          <div
            key={tp.card.id}
            className={`absolute transition-transform ${positionStyle[slot]}`}
          >
            <CardComponent card={tp.card} faceDown={false} />
          </div>
        );
      })}
    </div>
  );
};

// ============================================================
// Calling-partners panel: picker for the bidder, "waiting" for everyone else.
// ============================================================

const PARTNER_SUIT_ORDER: Suit[] = [Suit.Spades, Suit.Hearts, Suit.Clubs, Suit.Diamonds];

const CallingPartnersFelt: React.FC<{
  canCallPartners: boolean;
  partnersRequired: number;
  callableCards: Card[];
  /** The bidder's own hand. These cards render but are not selectable. */
  inHand: Card[];
  executeCallPartners: (cards: Card[]) => void;
  bidderName: string;
}> = ({ canCallPartners, partnersRequired, callableCards, inHand, executeCallPartners, bidderName }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Reset on phase entry / when call-count changes.
  useEffect(() => { setSelectedIds([]); }, [partnersRequired]);

  // Match the MobileView breakpoint (720px) so the layout follows the
  // active view rather than Tailwind's stock sm breakpoint.
  const isDesktop = useMediaQuery('(min-width: 721px)');

  const inHandIds = useMemo(() => new Set(inHand.map(c => c.id)), [inHand]);

  // Group every card in the deck this round by suit, sorted high → low. Cards
  // the bidder already holds are merged in alongside the callable ones; the
  // selection logic dims and disables them.
  const cardsBySuit = useMemo(() => {
    const groups: Record<Suit, Card[]> = {
      [Suit.Spades]: [],
      [Suit.Hearts]: [],
      [Suit.Clubs]: [],
      [Suit.Diamonds]: [],
    };
    const pushed = new Set<string>();
    for (const c of [...callableCards, ...inHand]) {
      if (pushed.has(c.id)) continue;
      pushed.add(c.id);
      groups[c.suit].push(c);
    }
    for (const s of PARTNER_SUIT_ORDER) {
      groups[s].sort((a, b) => compareCardStrength(b, a));
    }
    return groups;
  }, [callableCards, inHand]);

  if (!canCallPartners) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-6 max-w-md w-full">
        <div className="text-xs sm:text-sm uppercase tracking-[0.2em]" style={{ color: 'var(--dim)' }}>Calling Partners</div>
        <div className="text-sm sm:text-base text-center animate-pulse" style={{ color: 'var(--fg-soft)' }}>
          {bidderName} is choosing {partnersRequired} card{partnersRequired === 1 ? '' : 's'} to call...
        </div>
      </div>
    );
  }

  const toggle = (card: Card) => {
    if (inHandIds.has(card.id)) return;
    setSelectedIds(prev => {
      if (prev.includes(card.id)) return prev.filter(id => id !== card.id);
      if (prev.length >= partnersRequired) return prev;
      return [...prev, card.id];
    });
  };

  const ready = selectedIds.length === partnersRequired;
  const atMax = selectedIds.length >= partnersRequired;

  const confirm = () => {
    if (!ready) return;
    const cards = selectedIds.map(id => callableCards.find(c => c.id === id)!);
    executeCallPartners(cards);
  };

  return (
    <div
      className="flex flex-col items-center gap-1.5 sm:gap-2 px-1 py-1 sm:py-2 w-full max-h-full overflow-y-auto no-scrollbar"
    >
      <div className="text-[10px] sm:text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--dim)' }}>
        Call Your Partners: pick{' '}
        <span className="font-semibold" style={{ color: 'var(--accent)' }}>{partnersRequired}</span>
      </div>

      <div
        className={
          isDesktop
            ? 'grid grid-cols-2 gap-x-4 gap-y-1 items-end justify-items-center'
            : 'flex flex-col gap-0.5 items-center'
        }
      >
        {PARTNER_SUIT_ORDER.map(suit => {
          const cards = cardsBySuit[suit];
          if (cards.length === 0) return null;
          return (
            <div key={suit} className="flex items-end -space-x-7 sm:-space-x-6 justify-center">
              {cards.map(card => {
                const inOwnHand = inHandIds.has(card.id);
                const isSel = selectedIds.includes(card.id);
                const blocked = inOwnHand || (!isSel && atMax);
                return (
                  <CardComponent
                    key={card.id}
                    card={card}
                    small
                    faceDown={false}
                    isSelected={isSel}
                    isPlayable={!blocked}
                    isDimmed={blocked}
                    onClick={blocked ? undefined : () => toggle(card)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      <button
        onClick={confirm}
        disabled={!ready}
        className={`mt-1 px-6 py-2 rounded-xl text-sm sm:text-base font-semibold transition-all ${
          ready ? 'btn-accent' : ''
        }`}
        style={!ready ? {
          background: 'var(--bg-1)', color: 'var(--dimmer)',
          border: '1px solid var(--line-soft)', cursor: 'not-allowed',
        } : undefined}
      >
        Confirm {selectedIds.length}/{partnersRequired}
      </button>
    </div>
  );
};

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(query).matches,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);
  return matches;
}
