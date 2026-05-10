import React from 'react';
import { CardComponent } from './CardComponent';
import { useGame } from '../GameContext';
import { compareSuitForHand } from '../constants';
import { compareCardStrength } from '../rules';

/** Modals + transient overlays rendered by both mobile and desktop. */
export const SharedOverlays: React.FC = () => {
  const {
    state, myIndex,
    showMyCaptures, setShowMyCaptures,
    isPaused, isDisconnected, offlinePlayers,
  } = useGame();

  const me = state.players[myIndex];

  return (
    <>
      {showMyCaptures && me && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 1000, background: 'rgba(0,0,0,0.72)' }}
          onClick={() => setShowMyCaptures(false)}
        >
          <div
            className="glass-panel p-5 sm:p-7 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5 pb-4" style={{ borderBottom: '1px solid var(--line)' }}>
              <div>
                <h2 className="text-xl sm:text-2xl font-display" style={{ color: 'var(--accent)' }}>Your Captures</h2>
                <p className="text-xs mt-0.5 uppercase tracking-[0.14em]" style={{ color: 'var(--dim)' }}>
                  {me.tricksWon} {me.tricksWon === 1 ? 'trick' : 'tricks'} · {me.capturedCards.length} cards
                </p>
              </div>
              <button
                onClick={() => setShowMyCaptures(false)}
                className="p-2 rounded-full transition-all"
                style={{ background: 'var(--bg-1)', color: 'var(--fg-soft)', border: '1px solid var(--line)' }}
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto mb-5 pr-2">
              {me.capturedCards.length === 0 ? (
                <p className="text-center py-12" style={{ color: 'var(--dim)' }}>You haven't won any tricks yet.</p>
              ) : (
                <div className="flex flex-wrap gap-3 justify-center items-center">
                  {[...me.capturedCards]
                    .sort((a, b) => a.suit === b.suit ? compareCardStrength(b, a) : compareSuitForHand(a.suit, b.suit))
                    .map((card, i) => (
                      <div key={card.id} className="animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                        <CardComponent card={card} flipId={`mycap-${card.id}`} />
                      </div>
                    ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowMyCaptures(false)}
              className="btn-accent w-full py-3 rounded-xl text-base font-semibold uppercase tracking-wider"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {isPaused && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.82)' }}>
          <div className="glass-panel p-6 sm:p-9 rounded-2xl max-w-md w-full text-center" style={{ border: '1px solid rgba(232,146,154,0.25)' }}>
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-80">
              <svg className="w-full h-full" style={{ color: 'var(--red)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-display mb-3" style={{ color: 'var(--red)' }}>Connection Lost!</h2>
            {isDisconnected ? (
              <p className="text-sm sm:text-base mb-6" style={{ color: 'var(--fg-soft)' }}>
                Connection dropped. Refresh the page and you'll be offered a Resume option to rejoin room <span className="font-mono" style={{ color: 'var(--fg)' }}>{state.roomId}</span>.
              </p>
            ) : (
              <p className="text-sm sm:text-base mb-6" style={{ color: 'var(--fg-soft)' }}>
                Waiting for {offlinePlayers.map(p => p.name).join(', ')} to securely reconnect...
              </p>
            )}
            <div className="flex gap-4 justify-center">
              <div
                className="px-5 py-1.5 rounded-full tracking-[0.14em] text-xs font-semibold"
                style={{ background: 'rgba(232,146,154,0.08)', border: '1px solid rgba(232,146,154,0.3)', color: 'var(--red)' }}
              >
                GAME PAUSED
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
