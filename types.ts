export enum Suit {
  Spades = 'S',
  Hearts = 'H',
  Clubs = 'C',
  Diamonds = 'D',
}

export interface Card {
  suit: Suit;
  rank: number; // 2..10, 11 (J), 12 (Q), 13 (K), 14 (A). Ace high
  id: string;
}

export interface ChatMessage {
  id: string;
  playerIndex: number;
  name: string;
  text: string;
  ts: number;
}

export interface TrickPlay {
  playerIndex: number;
  card: Card;
}

export interface CompletedTrick {
  leaderIndex: number;
  ledSuit: Suit;
  plays: TrickPlay[];
  winnerIndex: number;
  isLast?: boolean;
}

export interface Player {
  id: number;
  name: string;
  isHuman: boolean;
  isOnline?: boolean;
  peerId?: string;
  hand: Card[];
  capturedCards: Card[];
  tricksWon: number;
}

export interface Spectator {
  name: string;
  peerId: string;
}

export type GamePhase =
  | 'LOBBY'
  | 'BIDDING'
  | 'CHOOSING_TRUMP'
  | 'CALLING_PARTNERS'
  | 'PLAYING'
  | 'GAME_OVER';

export interface GameState {
  gamePhase: GamePhase;
  roomId?: string;
  /** Always 5 or 6. Chosen in lobby. */
  numPlayers: 5 | 6;
  players: Player[];
  deck: Card[];
  currentTurn: number;
  dealerIndex: number;

  // Bidding auction
  biddingTurn: number;
  currentBid: number | null;
  highBidder: number;
  passedPlayers: number[];
  /** Each player's most recent action (null = not yet acted). */
  lastBids: (number | 'pass' | null)[];

  // Contract
  bidWinner: number;
  bidValue: number;
  trumpSuit: Suit | null;
  trumpChooser: number;

  // Partner calling
  /** Cards called by the bidder. Public information. */
  partnerCards: Card[];
  /** Indices of players on the bidder team (bidder + holders of called cards).
   *  Empty until CALL_PARTNERS resolves. Not redacted on the wire: every
   *  client computes this from public partnerCards + their own hand contents
   *  during play would be unreliable, so we keep it canonical here, but the
   *  UI hides the assignment until GAME_OVER. */
  bidderTeamIndices: number[];

  // Current trick
  currentTrick: TrickPlay[];
  trickLeader: number;
  ledSuit: Suit | null;
  lastTrickWinner: number;

  // History
  completedTricks: CompletedTrick[];

  // Round results (latest)
  roundScores: { bidderTeam: number; opposition: number };

  gameLog: string[];
  chatLog: ChatMessage[];
  readyForLobbyIndices?: number[];

  spectators: Spectator[];
}

export type NetworkAction =
  | { type: 'SYNC_STATE'; payload: GameState }
  | { type: 'PLAYER_JOINED'; payload: { name: string; peerId: string } }
  | { type: 'CLIENT_ACTION'; payload: any };
