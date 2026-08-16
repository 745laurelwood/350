// Card display, bot names, team colours, chat limits and the z-index scale all
// come from the shared skin. They are re-exported here so the rest of this
// codebase carries on importing them from './constants'.
//
// 350 deals the ace high, as rank 14. The package labels both conventions, so
// getRankLabel needs no special casing here.
export {
  CARD_RANK_LABELS, getRankLabel,
  SUIT_SYMBOLS, SUIT_COLORS,
  HAND_SUIT_ORDER, compareSuitForHand,
  BOT_NAMES, pickBotNames,
  TEAM_BADGE_CLASSES, TEAM_LABELS, TEAM_TEXT_COLORS,
  MAX_LOG_ENTRIES, CHAT_MAX_LEN, CHAT_MAX_HISTORY,
  PEER_ID_DISPLAY_LENGTH, EMPTY_SLOT_NAME,
  Z_CARD_SELECTED, Z_HUD, Z_ACTION_BAR, Z_TURN_BADGE, Z_OVERLAY, Z_MODAL,
} from '@laurelwood/card-class';

// ============================================================
// UI timing (ms)
// ============================================================
// Paces this game's bots. Nothing shared about them: they are tuned against
// 350's turn structure, which seats five or six.

export const AI_BID_DELAY_MS = 1100;
export const AI_TRUMP_DELAY_MS = 1300;
export const AI_PARTNER_DELAY_MS = 1300;
export const AI_PLAY_DELAY_MS = 850;
export const TRICK_REVEAL_DELAY_MS = 1100;

// Scoring and game-rule constants live in rules.ts
