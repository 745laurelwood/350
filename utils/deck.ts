import { Card, Suit } from '../types';
import { PlayerCount } from '../rules';

const ALL_RANKS: readonly number[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

/** Build the deck for the given player count.
 *  - 5 players: remove 2H and 2D (50 cards).
 *  - 6 players: remove all four 2s (48 cards). */
export const createDeck = (numPlayers: PlayerCount): Card[] => {
  const deck: Card[] = [];
  const suits = [Suit.Spades, Suit.Hearts, Suit.Clubs, Suit.Diamonds];
  for (const suit of suits) {
    for (const rank of ALL_RANKS) {
      if (rank === 2) {
        if (numPlayers === 6) continue;
        if (numPlayers === 5 && (suit === Suit.Hearts || suit === Suit.Diamonds)) continue;
      }
      deck.push({ suit, rank, id: `${suit}-${rank}` });
    }
  }
  return deck;
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

export { getPointsForCard } from '../rules';
