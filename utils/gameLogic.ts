import { Card, GameState, Player, Suit, TrickPlay } from '../types';
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

export const playerCapturedPoints = (player: Player): number =>
  cardPoints(player.capturedCards);

/** True once every called partner card has been played, fully exposing
 *  bidder-team membership to the table. */
export const partnersRevealed = (state: GameState): boolean => {
  if (state.gamePhase !== 'PLAYING' && state.gamePhase !== 'GAME_OVER') return false;
  if (state.partnerCards.length === 0) return false;
  const played = new Set<string>();
  for (const t of state.completedTricks) {
    for (const p of t.plays) played.add(p.card.id);
  }
  for (const p of state.currentTrick) played.add(p.card.id);
  return state.partnerCards.every(c => played.has(c.id));
};

/** Returns 'bidder' | 'opposition' if the team is known to everyone yet,
 *  otherwise null. Useful for team-tinted UI bits. */
export const knownTeamFor = (
  state: GameState,
  playerIndex: number,
): 'bidder' | 'opposition' | null => {
  if (!partnersRevealed(state)) return null;
  return state.bidderTeamIndices.includes(playerIndex) ? 'bidder' : 'opposition';
};

/** Live point totals split by team. Both sides count, but the UI should only
 *  display these aggregates once partners are revealed. */
export const teamCardPoints = (state: GameState): { bidder: number; opposition: number } => {
  const bidderSet = new Set(state.bidderTeamIndices);
  let bidder = 0;
  let opposition = 0;
  for (const p of state.players) {
    const pts = playerCapturedPoints(p);
    if (bidderSet.has(p.id)) bidder += pts;
    else opposition += pts;
  }
  return { bidder, opposition };
};
