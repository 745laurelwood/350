import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CardComponent } from '../components/CardComponent';
import { LastMoveBanner, TrumpBadge } from '../components/panels';
import { FeltContent } from '../components/FeltContent';
import { SharedOverlays } from '../components/SharedOverlays';
import { useGame } from '../GameContext';
import { compareCardStrength } from '../rules';
import { Card } from '../types';
import { compareSuitForHand, SUIT_SYMBOLS, getRankLabel } from '../constants';

const DRAG_THRESHOLD_PX = 6;

export const MobileView: React.FC = () => {
  const {
    state, myIndex, isSpectator,
    positions,
    setShowMyCaptures,
    mobileLogOpen, setMobileLogOpen,
    mobileOpponentSource, sweepingToPlayer,
    legalCardIds, executePlayCard,
  } = useGame();

  // Pin .m-phone to window.innerHeight (the LAYOUT viewport).
  useEffect(() => {
    const apply = () => {
      const phone = document.querySelector('.m-phone') as HTMLElement | null;
      if (!phone) return;
      const h = window.innerHeight;
      phone.style.height = `${h}px`;
      phone.style.maxHeight = `${h}px`;
    };
    apply();
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);
    return () => {
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
      const phone = document.querySelector('.m-phone') as HTMLElement | null;
      if (phone) {
        phone.style.height = '';
        phone.style.maxHeight = '';
      }
    };
  }, []);

  const partnerCardLabels = state.partnerCards.map(c => `${getRankLabel(c.rank)}${SUIT_SYMBOLS[c.suit]}`);

  const isMyBidTurn = !isSpectator && state.gamePhase === 'BIDDING' && state.biddingTurn === myIndex;
  const isMyPlayTurn = !isSpectator
    && state.gamePhase === 'PLAYING'
    && state.currentTurn === myIndex
    && state.currentTrick.length < state.numPlayers;

  const oppIndices = positions.filter(p => p.slot !== 'bottom').map(p => p.playerIndex);
  const bottomIdx = positions.find(p => p.slot === 'bottom')?.playerIndex ?? -1;
  const me = !isSpectator && bottomIdx !== -1 ? state.players[bottomIdx] : null;
  const bottomPlayerForSpectator = isSpectator && bottomIdx !== -1 ? state.players[bottomIdx] : null;

  const myScore = me?.score ?? 0;
  const leader = [...state.players].sort((a, b) => b.score - a.score)[0];

  const trickCardIds = new Set(state.currentTrick.map(p => p.card.id));

  // ── Drag-to-play state ──
  const feltRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<{
    cardId: string; pointerId: number;
    startX: number; startY: number;
    originLeft: number; originTop: number; originWidth: number; originHeight: number;
  } | null>(null);
  const [dragging, setDragging] = useState<{
    cardId: string;
    startX: number; startY: number;
    dx: number; dy: number;
    originLeft: number; originTop: number; originWidth: number; originHeight: number;
  } | null>(null);

  const onCardPointerDown = (card: Card) => (e: React.PointerEvent) => {
    if (!isMyPlayTurn || !legalCardIds.has(card.id)) return;
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    pendingRef.current = {
      cardId: card.id, pointerId: e.pointerId,
      startX: e.clientX, startY: e.clientY,
      originLeft: rect.left, originTop: rect.top,
      originWidth: rect.width, originHeight: rect.height,
    };
  };

  const onCardPointerMove = (card: Card) => (e: React.PointerEvent) => {
    const p = pendingRef.current;
    if (!p || p.cardId !== card.id) return;
    const dx = e.clientX - p.startX;
    const dy = e.clientY - p.startY;
    const active = dragging && dragging.cardId === card.id;
    if (!active) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      (e.currentTarget as HTMLElement).setPointerCapture(p.pointerId);
      setDragging({
        cardId: p.cardId,
        startX: p.startX, startY: p.startY,
        dx, dy,
        originLeft: p.originLeft, originTop: p.originTop,
        originWidth: p.originWidth, originHeight: p.originHeight,
      });
      return;
    }
    setDragging({ ...dragging!, dx, dy });
  };

  const onCardPointerUp = (card: Card) => (e: React.PointerEvent) => {
    const p = pendingRef.current;
    pendingRef.current = null;
    if (!p || p.cardId !== card.id) return;
    const active = dragging && dragging.cardId === card.id;
    if (!active) return;
    const rect = feltRef.current?.getBoundingClientRect();
    const insideFelt = !!rect
      && e.clientX >= rect.left && e.clientX <= rect.right
      && e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (insideFelt) executePlayCard(card.id);
    setDragging(null);
  };

  const onCardPointerCancel = () => {
    pendingRef.current = null;
    setDragging(null);
  };

  return (
    <>
      <div className="m-phone">
        <header className="m-hud">
          <div className="m-hud-bar">
            <button
              className="m-hud-btn m-home-btn"
              onClick={() => {
                if (confirm('Leave game and return to home?')) window.location.reload();
              }}
              title="Home"
              aria-label="Home"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12l9-9 9 9" />
                <path d="M5 10v10h14V10" />
              </svg>
            </button>
            <div className="m-hs-divider" />
            <div className="m-hs-cell active">
              <span className="label">You</span>
              <span className="v">{myScore}</span>
            </div>
            {leader && leader.id !== myIndex && (
              <>
                <div className="m-hs-divider" />
                <div className="m-hs-cell gold">
                  <span className="label">Lead</span>
                  <span className="v">{leader.score}</span>
                </div>
              </>
            )}
            <div className="m-hs-divider" />
            <div className={`m-hs-cell ${state.bidValue > 0 ? 'gold' : 'dim'}`}>
              <span className="label">Bid</span>
              <span className="v">{state.bidValue > 0 ? state.bidValue : '-'}</span>
            </div>
          </div>
        </header>

        <section className="m-opps">
          {oppIndices.map(i => {
            const opp = state.players[i];
            if (!opp) return <div key={i} />;
            const isBidTurn = state.gamePhase === 'BIDDING' && state.biddingTurn === i;
            const isPlayTurn = state.gamePhase === 'PLAYING'
              && state.currentTurn === i
              && state.currentTrick.length < state.numPlayers;
            const isTurn = isBidTurn || isPlayTurn;
            const sourceGhostCard = mobileOpponentSource && mobileOpponentSource.playerIndex === i
              ? opp.hand.find(c => c.id === mobileOpponentSource.cardId)
              : null;
            const isBidder = state.bidWinner === i && state.gamePhase !== 'BIDDING' && state.gamePhase !== 'CHOOSING_TRUMP';
            const oppSweepCards = sweepingToPlayer === i ? opp.capturedCards.slice(-state.numPlayers) : [];
            return (
              <div key={i} className={`m-opp ${isTurn ? 'turn' : ''} ${isBidder ? 'bidder' : ''}`}>
                {oppSweepCards.length > 0 && (
                  <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                    {oppSweepCards.map((card, idx) => (
                      <div
                        key={card.id}
                        className="absolute"
                        style={{
                          top: -20 + idx * 2,
                          left: -20 + idx * 2,
                          transform: `rotate(${(idx - 1.5) * 4}deg)`,
                        }}
                      >
                        <CardComponent card={card} />
                      </div>
                    ))}
                  </div>
                )}
                {sourceGhostCard && (
                  <div
                    className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0"
                    data-card-id={sourceGhostCard.id}
                  >
                    <CardComponent card={sourceGhostCard} faceDown={false} />
                  </div>
                )}
                <div className="av">{opp.name?.[0]?.toUpperCase() || '?'}</div>
                <div className="name">
                  {opp.name}
                  {isBidder && <span style={{ marginLeft: 4, color: 'var(--gold)', fontSize: 10 }}>★</span>}
                </div>
                <div className="held">
                  {opp.hand.length}c · {opp.tricksWon}t · <span style={{ color: 'var(--gold)' }}>{opp.score}</span>
                </div>
              </div>
            );
          })}
        </section>

        <div className="m-felt-wrap">
          <div className="m-felt" ref={feltRef}>
            {state.gamePhase === 'PLAYING' && state.trumpSuit && (
              <TrumpBadge suit={state.trumpSuit} partnerCardLabels={partnerCardLabels} />
            )}
            <div className="m-felt-grid">
              <FeltContent />
            </div>
          </div>
          {state.gameLog.length > 0 && state.gamePhase === 'PLAYING' && (
            <LastMoveBanner message={state.gameLog[state.gameLog.length - 1]} />
          )}
        </div>

        {bottomPlayerForSpectator && (
          <div className="m-me-chip" style={{ position: 'relative' }}>
            <div className="left">
              <div className="av">
                {bottomPlayerForSpectator.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="who">{bottomPlayerForSpectator.name}</div>
              <span
                style={{
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'rgba(111,176,255,0.10)',
                  color: 'var(--accent)',
                  border: '1px solid var(--accent-soft)',
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                Spectating
              </span>
            </div>
          </div>
        )}
        {me && (
          <div className="m-me-chip" style={{ position: 'relative' }}>
            {sweepingToPlayer === bottomIdx && (() => {
              const cards = me.capturedCards.slice(-state.numPlayers);
              if (cards.length === 0) return null;
              return (
                <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                  {cards.map((card, idx) => (
                    <div
                      key={card.id}
                      className="absolute"
                      style={{
                        top: -20 + idx * 2,
                        left: -20 + idx * 2,
                        transform: `rotate(${(idx - 1.5) * 4}deg)`,
                      }}
                    >
                      <CardComponent card={card} />
                    </div>
                  ))}
                </div>
              );
            })()}
            <div className="left">
              <div className={`av ${state.bidWinner === bottomIdx && state.gamePhase !== 'BIDDING' && state.gamePhase !== 'CHOOSING_TRUMP' ? 'bidder' : ''}`}>
                {me.name?.[0]?.toUpperCase() || 'Y'}
              </div>
              <div className="who">{me.name}</div>
              {(isMyPlayTurn || isMyBidTurn) && (
                <span
                  className="animate-accent-pulse"
                  style={{
                    fontSize: 10,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'var(--accent)',
                    color: '#06121f',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {isMyBidTurn ? 'Your Bid' : 'Drag to play'}
                </span>
              )}
              {me.capturedCards.length > 0 && (
                <button
                  onClick={() => setShowMyCaptures(true)}
                  style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--bg-1)', border: '1px solid var(--line)', color: 'var(--fg-soft)' }}
                >
                  {me.tricksWon} tricks
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button className="log-btn" onClick={() => setMobileLogOpen(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
                Log
              </button>
            </div>
          </div>
        )}

        {isSpectator ? (
          <section className="m-hand-area" aria-label="Spectating">
            <div
              className="m-hand"
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                color: 'var(--accent)',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                fontSize: 12,
                fontWeight: 600,
                opacity: 0.85,
              }}
            >
              Spectating
            </div>
          </section>
        ) : me && (
          <section className="m-hand-area">
            <div className="m-hand no-scrollbar">
              {[...me.hand]
                .filter(c => !trickCardIds.has(c.id))
                .sort((a, b) => a.suit === b.suit ? compareCardStrength(b, a) : compareSuitForHand(a.suit, b.suit))
                .map(card => {
                  const isLegal = legalCardIds.has(card.id);
                  const dimmed = state.gamePhase === 'PLAYING' && isMyPlayTurn && !isLegal;
                  const isDraggable = isMyPlayTurn && isLegal;
                  const isActive = dragging?.cardId === card.id;
                  return (
                    <div
                      key={card.id}
                      onPointerDown={onCardPointerDown(card)}
                      onPointerMove={onCardPointerMove(card)}
                      onPointerUp={onCardPointerUp(card)}
                      onPointerCancel={onCardPointerCancel}
                      style={{
                        position: 'relative',
                        touchAction: isDraggable ? 'none' : 'auto',
                        flex: '0 0 auto',
                        visibility: isActive ? 'hidden' : 'visible',
                      }}
                    >
                      <CardComponent
                        card={card}
                        faceDown={false}
                        isPlayable={isDraggable}
                        isDimmed={dimmed}
                        flipId={isActive ? `hand-placeholder-${card.id}` : undefined}
                      />
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {mobileLogOpen && (
          <>
            <div className="m-sheet-backdrop" onClick={() => setMobileLogOpen(false)} />
            <div className="m-sheet">
              <div className="m-sheet-handle" />
              <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontFamily: 'Fredoka', fontSize: 15, fontWeight: 500, color: 'var(--fg)' }}>
                Game Log
                <button
                  onClick={() => setMobileLogOpen(false)}
                  style={{ fontSize: 12, color: 'var(--dim)', padding: '4px 10px', borderRadius: 999, background: 'var(--bg-2)' }}
                >
                  Close
                </button>
              </h3>
              <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[...state.gameLog].reverse().map((entry, i) => (
                  <div
                    key={i}
                    style={{ padding: '10px 0', borderBottom: '1px solid var(--line-soft)', fontSize: 13, color: 'var(--fg-soft)', lineHeight: 1.4 }}
                  >
                    {entry}
                  </div>
                ))}
                {state.gameLog.length === 0 && (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--dim)', fontSize: 13 }}>No events yet.</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      {dragging && me && (() => {
        const card = me.hand.find(c => c.id === dragging.cardId);
        if (!card) return null;
        return createPortal(
          <div
            className="pointer-events-none"
            style={{
              position: 'fixed',
              left: dragging.originLeft,
              top: dragging.originTop,
              width: dragging.originWidth,
              height: dragging.originHeight,
              transform: `translate(${dragging.dx}px, ${dragging.dy}px)`,
              zIndex: 9999,
            }}
          >
            <CardComponent card={card} faceDown={false} />
          </div>,
          document.body,
        );
      })()}
      <SharedOverlays />
    </>
  );
};
