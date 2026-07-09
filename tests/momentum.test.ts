import { describe, expect, it } from 'vitest';
import {
  START_MOMENTUM,
  completionPct,
  currentMomentum,
  nextMomentum,
  rollForward,
} from '../src/lib/momentum';
import type { Snapshot } from '../src/lib/types';

const logs = (entries: Record<string, number>) => new Map(Object.entries(entries));

describe('completionPct', () => {
  it('maps 0..3 logs to 0..100', () => {
    expect(completionPct(0)).toBe(0);
    expect(completionPct(1)).toBeCloseTo(33.3333, 3);
    expect(completionPct(2)).toBeCloseTo(66.6667, 3);
    expect(completionPct(3)).toBe(100);
  });

  it('caps above 3 logs at 100', () => {
    expect(completionPct(5)).toBe(100);
  });
});

describe('nextMomentum', () => {
  it('applies the EWMA', () => {
    expect(nextMomentum(50, 100)).toBe(54); // 0.92*50 + 0.08*100
    expect(nextMomentum(50, 0)).toBe(46);
    expect(nextMomentum(100, 100)).toBe(100); // fixed point
    expect(nextMomentum(0, 0)).toBe(0); // floor, never negative
  });
});

describe('rollForward', () => {
  it('returns nothing when the account was created today', () => {
    expect(rollForward(null, '2026-07-08', logs({}), '2026-07-08')).toEqual([]);
  });

  it('returns nothing when snapshots are already current', () => {
    const last: Snapshot = { date: '2026-07-07', momentum: 54, completionPct: 100 };
    expect(rollForward(last, '2026-07-01', logs({}), '2026-07-08')).toEqual([]);
  });

  it('seeds a new account at 50 and snapshots the first day', () => {
    const out = rollForward(null, '2026-07-07', logs({ '2026-07-07': 3 }), '2026-07-08');
    expect(out).toEqual([{ date: '2026-07-07', momentum: 54, completionPct: 100 }]);
  });

  it('backfills a gap of empty days with gentle decay', () => {
    const last: Snapshot = { date: '2026-07-01', momentum: 50, completionPct: 0 };
    const out = rollForward(last, '2026-06-01', logs({}), '2026-07-05');
    expect(out.map((s) => s.date)).toEqual(['2026-07-02', '2026-07-03', '2026-07-04']);
    expect(out.map((s) => s.momentum)).toEqual([46, 42.32, 38.9344]);
    expect(out.every((s) => s.completionPct === 0)).toBe(true);
  });

  it('mixes logged and empty days deterministically', () => {
    const last: Snapshot = { date: '2026-07-01', momentum: 60, completionPct: 100 };
    const out = rollForward(
      last,
      '2026-06-01',
      logs({ '2026-07-02': 2, '2026-07-04': 3 }),
      '2026-07-05',
    );
    // day 2: 0.92*60 + 0.08*66.6667 = 60.5333
    // day 3: 0.92*60.5333 + 0 = 55.6906  (rounded from stored 60.5333)
    // day 4: 0.92*55.6906 + 8 = 59.2354
    expect(out[0].momentum).toBeCloseTo(60.5333, 3);
    expect(out[1].momentum).toBeCloseTo(55.6906, 3);
    expect(out[2].momentum).toBeCloseTo(59.2354, 3);
  });

  it('converges toward 100 under sustained perfect days, never exceeding it', () => {
    const counts: Record<string, number> = {};
    let d = '2026-01-01';
    for (let i = 0; i < 120; i++) {
      counts[d] = 3;
      d = addDaysLocal(d, 1);
    }
    const out = rollForward(null, '2026-01-01', logs(counts), '2026-05-01');
    const final = out[out.length - 1].momentum;
    expect(final).toBeGreaterThan(99);
    expect(final).toBeLessThanOrEqual(100);
    // strictly monotonic rise from 50
    for (let i = 1; i < out.length; i++) {
      expect(out[i].momentum).toBeGreaterThanOrEqual(out[i - 1].momentum);
    }
  });

  it('never goes below 0 no matter how long the gap', () => {
    const out = rollForward(null, '2025-01-01', logs({}), '2026-07-08');
    const final = out[out.length - 1].momentum;
    expect(final).toBeGreaterThanOrEqual(0);
    expect(final).toBeLessThan(1); // decayed to ~0, recoverable, never negative
  });

  it('is deterministic: recomputing from scratch matches incremental snapshots', () => {
    const counts = logs({ '2026-07-01': 1, '2026-07-02': 3, '2026-07-04': 2 });
    const full = rollForward(null, '2026-07-01', counts, '2026-07-06');
    const partial = rollForward(null, '2026-07-01', counts, '2026-07-03');
    const resumed = rollForward(partial[partial.length - 1], '2026-07-01', counts, '2026-07-06');
    expect([...partial, ...resumed]).toEqual(full);
  });
});

describe('currentMomentum', () => {
  it('shows 50 for a brand-new account and the snapshot value otherwise', () => {
    expect(currentMomentum(null)).toBe(START_MOMENTUM);
    expect(currentMomentum({ date: '2026-07-07', momentum: 61.2, completionPct: 100 })).toBe(61.2);
  });
});

// tiny local copy to build long ranges without importing app code paths under test
function addDaysLocal(ymd: string, n: number): string {
  const [y, m, dd] = ymd.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, dd) + n * 86_400_000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(
    t.getUTCDate(),
  ).padStart(2, '0')}`;
}
