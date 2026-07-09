import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, isBefore, todayLocal } from '../src/lib/dates';

describe('todayLocal', () => {
  it('emits YYYY-MM-DD in the given timezone', () => {
    const instant = new Date('2026-07-08T12:00:00Z');
    expect(todayLocal('UTC', instant)).toBe('2026-07-08');
  });

  it('crosses the date line correctly', () => {
    const instant = new Date('2026-01-01T02:00:00Z');
    expect(todayLocal('America/New_York', instant)).toBe('2025-12-31');
    expect(todayLocal('Asia/Tokyo', instant)).toBe('2026-01-01');
    expect(todayLocal('Pacific/Kiritimati', instant)).toBe('2026-01-01');
  });

  it('is stable across a DST spring-forward instant', () => {
    // US DST began 2026-03-08 02:00 local.
    const before = new Date('2026-03-08T06:59:00Z'); // 01:59 EST
    const after = new Date('2026-03-08T07:01:00Z'); // 03:01 EDT
    expect(todayLocal('America/New_York', before)).toBe('2026-03-08');
    expect(todayLocal('America/New_York', after)).toBe('2026-03-08');
  });
});

describe('addDays', () => {
  it('adds and subtracts within a month', () => {
    expect(addDays('2026-07-08', 1)).toBe('2026-07-09');
    expect(addDays('2026-07-08', -7)).toBe('2026-07-01');
  });

  it('crosses month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('handles leap years', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('walks straight through DST transitions (pure calendar math)', () => {
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
  });
});

describe('daysBetween / isBefore', () => {
  it('measures signed whole days', () => {
    expect(daysBetween('2026-07-01', '2026-07-08')).toBe(7);
    expect(daysBetween('2026-07-08', '2026-07-01')).toBe(-7);
    expect(daysBetween('2026-07-08', '2026-07-08')).toBe(0);
    expect(daysBetween('2025-12-30', '2026-01-02')).toBe(3);
  });

  it('orders dates as strings', () => {
    expect(isBefore('2026-07-07', '2026-07-08')).toBe(true);
    expect(isBefore('2026-07-08', '2026-07-08')).toBe(false);
    expect(isBefore('2026-07-09', '2026-07-08')).toBe(false);
  });
});
