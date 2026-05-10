import { Suit } from './types';

// ============================================================
// Card display constants
// ============================================================

export const CARD_RANK_LABELS: Record<number, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  [Suit.Spades]: '♠',
  [Suit.Hearts]: '♥',
  [Suit.Clubs]: '♣',
  [Suit.Diamonds]: '♦',
};

export const SUIT_COLORS: Record<Suit, string> = {
  [Suit.Spades]: 'text-black',
  [Suit.Hearts]: 'text-red-600',
  [Suit.Clubs]: 'text-black',
  [Suit.Diamonds]: 'text-red-600',
};

export const HAND_SUIT_ORDER: Record<Suit, number> = {
  [Suit.Spades]: 0,
  [Suit.Hearts]: 1,
  [Suit.Clubs]: 2,
  [Suit.Diamonds]: 3,
};

export const compareSuitForHand = (a: Suit, b: Suit): number =>
  HAND_SUIT_ORDER[a] - HAND_SUIT_ORDER[b];

export const getRankLabel = (rank: number): string => CARD_RANK_LABELS[rank] ?? '?';

// ============================================================
// AI / bot names
// ============================================================

export const BOT_NAMES = [
  'CardShark', 'VelvetFox', 'MidnightOwl', 'RiverBandit', 'LuckyLoaf',
  'SilverTongue', 'CloverKnight', 'PepperPaws', 'BananaBaron', 'MapleMaverick',
  'GingerGhost', 'TangoTiger', 'WaffleWizard', 'CosmicOtter', 'MochiMonarch',
  'NeonBadger', 'PeachPhantom', 'BiscuitBandit', 'SunnyScholar', 'JollyJester',
];

export function pickBotNames(count: number, exclude: Iterable<string> = []): string[] {
  const taken = new Set<string>(exclude);
  const pool = BOT_NAMES.filter(n => !taken.has(n));
  const picked: string[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

// ============================================================
// UI timing (ms)
// ============================================================

export const AI_BID_DELAY_MS = 1100;
export const AI_TRUMP_DELAY_MS = 1300;
export const AI_PARTNER_DELAY_MS = 1300;
export const AI_PLAY_DELAY_MS = 850;
export const TRICK_REVEAL_DELAY_MS = 1100;

// ============================================================
// UI accent
// ============================================================

export const MAX_LOG_ENTRIES = 60;
export const CHAT_MAX_LEN = 200;
export const CHAT_MAX_HISTORY = 100;
export const PEER_ID_DISPLAY_LENGTH = 6;
export const EMPTY_SLOT_NAME = 'Waiting...';

// ============================================================
// z-index layers
// ============================================================

export const Z_CARD_SELECTED = 20;
export const Z_HUD = 40;
export const Z_ACTION_BAR = 45;
export const Z_TURN_BADGE = 50;
export const Z_OVERLAY = 60;
export const Z_MODAL = 100;
