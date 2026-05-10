// rules.ts — Single source of truth for 350 game rules.

import { Card, Suit } from './types';

// ============================================================
// GAME CONFIGURATION
// ============================================================

export type PlayerCount = 5 | 6;
export const VALID_PLAYER_COUNTS: PlayerCount[] = [5, 6];

/** Initial deal size before bidding starts. */
export const handSizeInitial = (n: PlayerCount): number => (n === 5 ? 5 : 4);
/** Final hand size after the remainder of the deck is dealt. */
export const handSizeFull = (n: PlayerCount): number => (n === 5 ? 10 : 8);
/** Number of tricks per round = full hand size. */
export const numTricks = (n: PlayerCount): number => handSizeFull(n);

// ============================================================
// BIDDING
// ============================================================

export const MIN_BID = 220;
export const MAX_BID = 350;
/** UI step for bidding chips. Bids must be a multiple of this. */
export const BID_STEP = 5;

// ============================================================
// CARD POINT VALUES
// ============================================================
// 3 of Spades = 50, A = 25, K = 20, Q = 15, J = 15, all others = 0.
// Total in the deck = 350.

export const ACE_RANK = 14;
export const KING_RANK = 13;
export const QUEEN_RANK = 12;
export const JACK_RANK = 11;

export const SPADE_3_POINTS = 50;
export const ACE_POINTS = 25;
export const KING_POINTS = 20;
export const QUEEN_POINTS = 15;
export const JACK_POINTS = 15;

export const TOTAL_DECK_POINTS = 350;

export const getPointsForCard = (card: Card): number => {
  if (card.suit === Suit.Spades && card.rank === 3) return SPADE_3_POINTS;
  if (card.rank === ACE_RANK) return ACE_POINTS;
  if (card.rank === KING_RANK) return KING_POINTS;
  if (card.rank === QUEEN_RANK) return QUEEN_POINTS;
  if (card.rank === JACK_RANK) return JACK_POINTS;
  return 0;
};

// ============================================================
// TRICK STRENGTH ORDER
// ============================================================
// Within a suit, A is highest. Numeric rank already encodes order.

export const getTrickStrength = (rank: number): number => rank;

export const compareCardStrength = (a: Card, b: Card): number =>
  getTrickStrength(a.rank) - getTrickStrength(b.rank);

// ============================================================
// PARTNER CALLING
// ============================================================

/** Number of cards the bidder must call given the winning bid. */
export const partnerCardsForBid = (bid: number): number => {
  if (bid >= 335) return 3;
  if (bid >= 275) return 2;
  return 1;
};

// ============================================================
// LABELS
// ============================================================

export const SUIT_NAMES: Record<Suit, string> = {
  [Suit.Spades]: 'Spades',
  [Suit.Hearts]: 'Hearts',
  [Suit.Clubs]: 'Clubs',
  [Suit.Diamonds]: 'Diamonds',
};

// ============================================================
// HUMAN-READABLE SUMMARY
// ============================================================

export const RULES_SUMMARY = `
350 is a 5- or 6-player partnership trick-taking card game.

DECK: 5p removes 2H/2D from a standard 52 (50 cards). 6p removes all four 2s (48 cards).

CARD ORDER (high → low): A, K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3, (2).

POINTS: 3 of Spades = 50, A = 25, K = 20, Q = 15, J = 15, others = 0. Total = 350.

DEAL: 5 cards each (5p) or 4 each (6p) before bidding. After bidding/trump, the remaining cards are dealt out. Hand size: 10 (5p) or 8 (6p).

BIDDING: Each player in turn (starting next to the dealer) bids ${MIN_BID}–${MAX_BID} or passes (permanent). Each bid must strictly exceed the previous high. The last remaining bidder wins.

TRUMP: Bid winner picks a trump suit openly.

PARTNERS: Bidder calls cards from outside their hand. 1 card for ${MIN_BID}–270, 2 for 275–330, 3 for 335–${MAX_BID}. Holders of called cards are partners. Teams are kept secret during play and revealed at round end.

PLAY: Bid winner leads. Players must follow suit if possible; otherwise any card may be played. Highest trump wins; otherwise highest card of the led suit. Trick winner leads next.

SCORING: Bidder team must capture ≥ bid in card points to make the bid. If they do, they win the round; otherwise the opposition wins. Each round is a fresh game — no points carry over.
`.trim();
