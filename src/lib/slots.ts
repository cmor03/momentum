import { DAILY_CAP } from './momentum';
import type { Slot } from './types';

/**
 * The daily cap is enforced declaratively: each log occupies a slot 1–3 and
 * the database has UNIQUE (user_id, logged_on, slot). The client always
 * assigns the lowest free slot from its local view of today.
 */
export function lowestFreeSlot(takenSlots: Iterable<number>): Slot | null {
  const taken = new Set(takenSlots);
  for (let s = 1; s <= DAILY_CAP; s++) {
    if (!taken.has(s)) return s as Slot;
  }
  return null;
}
