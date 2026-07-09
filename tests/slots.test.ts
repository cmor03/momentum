import { describe, expect, it } from 'vitest';
import { lowestFreeSlot } from '../src/lib/slots';

describe('lowestFreeSlot', () => {
  it('assigns 1, 2, 3 in order', () => {
    expect(lowestFreeSlot([])).toBe(1);
    expect(lowestFreeSlot([1])).toBe(2);
    expect(lowestFreeSlot([1, 2])).toBe(3);
  });

  it('returns null when the day is full — the hard cap', () => {
    expect(lowestFreeSlot([1, 2, 3])).toBe(null);
  });

  it('reuses a freed slot after an undo', () => {
    expect(lowestFreeSlot([1, 3])).toBe(2);
    expect(lowestFreeSlot([2, 3])).toBe(1);
  });
});
