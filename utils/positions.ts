import { PlayerCount } from '../rules';

/** Visual slot for an opponent in the around-the-table layout. */
export type Slot =
  | 'bottom'
  | 'left'
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'right';

/** All clockwise slots starting from `bottom` for the given player count.
 *  - 5 players: bottom, left, top-left, top-right, right (no centre).
 *  - 6 players: bottom, left, top-left, top-center, top-right, right. */
export const slotOrder = (numPlayers: PlayerCount): Slot[] => {
  if (numPlayers === 5) {
    return ['bottom', 'left', 'top-left', 'top-right', 'right'];
  }
  return ['bottom', 'left', 'top-left', 'top-center', 'top-right', 'right'];
};

/** The slot a given player index occupies relative to `myIndex`. */
export const slotFor = (
  playerIndex: number,
  myIndex: number,
  numPlayers: PlayerCount,
): Slot => {
  const offset = (playerIndex - myIndex + numPlayers) % numPlayers;
  return slotOrder(numPlayers)[offset];
};

/** True if the slot is on the top row of the table. */
export const isTopSlot = (slot: Slot): boolean =>
  slot === 'top-left' || slot === 'top-center' || slot === 'top-right';
