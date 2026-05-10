import { Card, Suit, TrickPlay } from '../types';
import { getTrickStrength, getPointsForCard } from '../rules';

/** Cards a player may legally play given the current trick state. */
export const getPlayableCards = (
  hand: Card[],
  ledSuit: Suit | null,
): Card[] => {
  if (!ledSuit) return [...hand];
  const sameSuit = hand.filter(c => c.suit === ledSuit);
  if (sameSuit.length > 0) return sameSuit;
  return [...hand];
};

export const canFollowSuit = (hand: Card[], suit: Suit): boolean =>
  hand.some(c => c.suit === suit);

/** Determines the winner of a completed trick.
 *  - Highest trump wins if any trumps were played.
 *  - Otherwise, highest card of the led suit wins. */
export const getTrickWinner = (
  plays: TrickPlay[],
  ledSuit: Suit,
  trumpSuit: Suit | null,
): TrickPlay => {
  if (trumpSuit && plays.some(p => p.card.suit === trumpSuit)) {
    const trumps = plays.filter(p => p.card.suit === trumpSuit);
    return trumps.reduce((best, p) =>
      getTrickStrength(p.card.rank) > getTrickStrength(best.card.rank) ? p : best,
    );
  }
  const sameSuit = plays.filter(p => p.card.suit === ledSuit);
  if (sameSuit.length === 0) {
    return plays.reduce((best, p) =>
      getTrickStrength(p.card.rank) > getTrickStrength(best.card.rank) ? p : best,
    );
  }
  return sameSuit.reduce((best, p) =>
    getTrickStrength(p.card.rank) > getTrickStrength(best.card.rank) ? p : best,
  );
};

export const cardPoints = (cards: Card[]): number =>
  cards.reduce((s, c) => s + getPointsForCard(c), 0);
