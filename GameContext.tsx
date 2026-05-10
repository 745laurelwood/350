import React, { createContext, useContext } from 'react';
import { GameState, Suit, Card } from './types';
import { Action } from './gameReducer';
import { Slot } from './utils/positions';

export interface PositionedPlayer {
  playerIndex: number;
  slot: Slot;
}

export interface GameContextValue {
  // Core state
  state: GameState;
  dispatch: React.Dispatch<Action>;
  handleDispatch: (action: Action) => void;

  // Identity
  myIndex: number;
  isHost: boolean;
  isMultiplayer: boolean;
  isSpectator: boolean;
  peerId: string;
  joinId: string;
  isDisconnected: boolean;

  // UI selection
  showMyCaptures: boolean;
  setShowMyCaptures: React.Dispatch<React.SetStateAction<boolean>>;
  mobileLogOpen: boolean;
  setMobileLogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  mobileChatOpen: boolean;
  setMobileChatOpen: React.Dispatch<React.SetStateAction<boolean>>;
  chatUnread: number;
  markChatRead: () => void;
  sendChat: (text: string) => void;

  // Animation state
  visualThrow: { cardId: string; playerIndex: number } | null;
  mobileOpponentSource: { cardId: string; playerIndex: number } | null;
  sweepingToPlayer: number | null;

  // Actions
  legalCardIds: Set<string>;
  executePlayCard: (cardId: string) => void;
  executeBid: (amount: number) => void;
  executePass: () => void;
  executeChooseTrump: (suit: Suit) => void;
  executeCallPartners: (cards: Card[]) => void;

  // Bidding helpers
  canBid: boolean;
  minBidAmount: number;

  // Trump helpers
  canChooseTrump: boolean;

  // Partner calling
  canCallPartners: boolean;
  partnersRequired: number;
  /** Universe of cards eligible to be called (everything outside bidder's hand). */
  callableCards: Card[];

  // Positional layout
  myPosition: Slot;
  positions: PositionedPlayer[];          // every player + their slot
  topPlayers: number[];                   // ordered left → right
  leftPlayer: number;                     // -1 if not assigned
  rightPlayer: number;                    // -1 if not assigned

  // Refs
  logEndRef: React.RefObject<HTMLDivElement | null>;

  // Pause state
  isPaused: boolean;
  offlinePlayers: { name: string }[];
}

const GameContext = createContext<GameContextValue | null>(null);

export const GameProvider: React.FC<{ value: GameContextValue; children: React.ReactNode }> = ({ value, children }) => (
  <GameContext.Provider value={value}>{children}</GameContext.Provider>
);

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside a GameProvider');
  return ctx;
}
