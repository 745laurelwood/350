import React from 'react';
import { MIN_BID, MAX_BID, WINNING_GAME_POINTS } from '../rules';

interface RulebookProps {
  onClose: () => void;
}

export const Rulebook: React.FC<RulebookProps> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 overflow-y-auto"
      style={{ zIndex: 200, background: 'var(--bg)', color: 'var(--fg)' }}
    >
      <div
        className="max-w-3xl mx-auto px-5 sm:px-8 pb-8 sm:pb-12 relative"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 2rem)' }}
      >
        <button
          onClick={onClose}
          aria-label="Close rulebook"
          className="sticky float-right w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-[color:var(--bg-2)]"
          style={{
            background: 'var(--bg-1)',
            border: '1px solid var(--line)',
            color: 'var(--fg-soft)',
            top: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
          }}
          title="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <header className="mb-8 pt-2">
          <h1 className="font-display text-3xl sm:text-4xl mb-1" style={{ color: 'var(--accent)' }}>350 — Rulebook</h1>
          <p className="text-xs sm:text-sm uppercase tracking-[0.2em]" style={{ color: 'var(--dim)' }}>
            A 5/6-player partnership trick-taking card game
          </p>
        </header>

        <section className="mb-8">
          <h2 className="font-display text-xl sm:text-2xl mb-3" style={{ color: 'var(--fg)' }}>Overview</h2>
          <p className="mb-3" style={{ color: 'var(--fg-soft)' }}>
            350 is played by <strong>5 or 6</strong> players. Partnerships are <em>not</em> fixed —
            they are formed each round through "calling" cards. The deck contains <strong>350 total card
            points</strong>, and the bidder's team must capture at least their bid in card points to win the round.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-xl sm:text-2xl mb-3" style={{ color: 'var(--fg)' }}>The Deck</h2>
          <ul className="list-disc list-inside space-y-1" style={{ color: 'var(--fg-soft)' }}>
            <li><strong>5 players:</strong> standard 52-card deck minus the 2 of Hearts and 2 of Diamonds (50 cards).</li>
            <li><strong>6 players:</strong> standard 52-card deck minus all four 2s (48 cards).</li>
          </ul>
          <p className="mt-3" style={{ color: 'var(--fg-soft)' }}>
            Within a suit, card strength ranks <strong>high → low</strong>:
          </p>
          <p className="font-mono text-center py-2 rounded-xl mt-2"
             style={{ color: 'var(--accent)', background: 'var(--bg-1)', border: '1px solid var(--line)' }}>
            A · K · Q · J · 10 · 9 · 8 · 7 · 6 · 5 · 4 · 3 · (2)
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-xl sm:text-2xl mb-3" style={{ color: 'var(--fg)' }}>Card Points</h2>
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--line)', background: 'var(--bg-1)' }}
          >
            <table className="w-full text-sm sm:text-base" style={{ color: 'var(--fg-soft)' }}>
              <thead>
                <tr style={{ background: 'var(--bg-2)', color: 'var(--fg)' }}>
                  <th className="text-left px-4 py-2 font-semibold">Card</th>
                  <th className="text-right px-4 py-2 font-semibold">Points</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderTop: '1px solid var(--line)' }}>
                  <td className="px-4 py-2">3 of Spades (special)</td>
                  <td className="px-4 py-2 text-right font-semibold">50</td>
                </tr>
                <tr style={{ borderTop: '1px solid var(--line)' }}>
                  <td className="px-4 py-2">Ace</td>
                  <td className="px-4 py-2 text-right font-semibold">25</td>
                </tr>
                <tr style={{ borderTop: '1px solid var(--line)' }}>
                  <td className="px-4 py-2">King</td>
                  <td className="px-4 py-2 text-right font-semibold">20</td>
                </tr>
                <tr style={{ borderTop: '1px solid var(--line)' }}>
                  <td className="px-4 py-2">Queen</td>
                  <td className="px-4 py-2 text-right font-semibold">15</td>
                </tr>
                <tr style={{ borderTop: '1px solid var(--line)' }}>
                  <td className="px-4 py-2">Jack</td>
                  <td className="px-4 py-2 text-right font-semibold">15</td>
                </tr>
                <tr style={{ borderTop: '1px solid var(--line)' }}>
                  <td className="px-4 py-2">2–10 (other than 3♠)</td>
                  <td className="px-4 py-2 text-right font-semibold">0</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3" style={{ color: 'var(--fg-soft)' }}>Total per round: <strong>350 points</strong>.</p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-xl sm:text-2xl mb-3" style={{ color: 'var(--fg)' }}>Dealing</h2>
          <ol className="list-decimal list-inside space-y-2" style={{ color: 'var(--fg-soft)' }}>
            <li>The dealer rotates clockwise each round.</li>
            <li>Initial deal: <strong>5</strong> cards each (5 players) or <strong>4</strong> cards each (6 players).</li>
            <li>After bidding and trump selection, the rest of the deck is dealt out so everyone has a full hand.</li>
            <li>Final hand size: <strong>10</strong> cards (5 players) or <strong>8</strong> cards (6 players).</li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-xl sm:text-2xl mb-3" style={{ color: 'var(--fg)' }}>Bidding</h2>
          <p className="mb-3" style={{ color: 'var(--fg-soft)' }}>
            Starting with the player to the dealer's left, each player either passes or makes a bid.
            Legal bids range from <strong>{MIN_BID}</strong> to <strong>{MAX_BID}</strong>. Each new bid must
            strictly exceed the previous high. A pass is permanent — the player takes no further part in the auction.
          </p>
          <p style={{ color: 'var(--fg-soft)' }}>
            The last remaining bidder wins the auction and becomes the round's <strong>bidder</strong>.
            If everyone passes, the hand is redealt by the next dealer.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-xl sm:text-2xl mb-3" style={{ color: 'var(--fg)' }}>Trump &amp; Partners</h2>
          <p className="mb-3" style={{ color: 'var(--fg-soft)' }}>
            The bidder picks a <strong>trump suit</strong> openly. The remaining cards are then dealt out so every
            player holds a full hand. The bidder then <em>calls partners</em> by naming cards from outside their hand:
          </p>
          <ul className="list-disc list-inside space-y-1" style={{ color: 'var(--fg-soft)' }}>
            <li>Bid {MIN_BID}–270: call <strong>1</strong> card.</li>
            <li>Bid 275–330: call <strong>2</strong> cards.</li>
            <li>Bid 335–{MAX_BID}: call <strong>3</strong> cards.</li>
          </ul>
          <p className="mt-3" style={{ color: 'var(--fg-soft)' }}>
            Anyone holding a called card joins the bidder's team for the round. Team identities are kept secret
            during play (often inferred from gameplay) and revealed at round end.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-xl sm:text-2xl mb-3" style={{ color: 'var(--fg)' }}>The Play</h2>
          <p className="mb-3" style={{ color: 'var(--fg-soft)' }}>
            The bidder leads the first trick. Players play one card in turn, clockwise.
            Players <strong>must follow the led suit</strong> if they hold any. Otherwise, they may play any
            card — including a trump.
          </p>
          <p style={{ color: 'var(--fg-soft)' }}>
            The highest trump played wins the trick. If no trumps were played, the highest card of the led suit
            wins. The trick winner leads the next trick.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-xl sm:text-2xl mb-3" style={{ color: 'var(--fg)' }}>Scoring</h2>
          <p style={{ color: 'var(--fg-soft)' }}>
            When all cards are played, each side totals the card points in its captured tricks.
            If the bidder's team total is <strong>at or above</strong> the bid, they make the bid: every player
            on the bidder's team scores <strong>+1 game point</strong>, others score 0. If the bidder's team
            falls short, every opposition player scores <strong>+1 game point</strong>, bidder team scores 0.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="font-display text-xl sm:text-2xl mb-3" style={{ color: 'var(--fg)' }}>Winning the Match</h2>
          <p style={{ color: 'var(--fg-soft)' }}>
            The first player to reach <strong>+{WINNING_GAME_POINTS}</strong> game points wins.
          </p>
        </section>

        <div className="text-center py-4">
          <button
            onClick={onClose}
            className="btn-accent px-6 py-2.5 rounded-xl text-sm sm:text-base font-semibold"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};
