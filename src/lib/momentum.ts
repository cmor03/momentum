import { addDays, isBefore } from './dates';
import type { Snapshot } from './types';

/**
 * The momentum engine. An exponentially weighted moving average over daily
 * completion — it can dip, but it can never break, reset, or go negative.
 *
 *   momentum_tomorrow = 0.92 * momentum_today + 0.08 * completion_pct
 *
 * A snapshot for date D stores the completion of day D and the momentum value
 * entering day D+1. The number displayed all day today is the momentum from
 * yesterday's snapshot (or START_MOMENTUM for a brand-new account).
 */

export const START_MOMENTUM = 50;
export const RETAIN = 0.92;
export const GAIN = 0.08;
export const DAILY_CAP = 3;

const round4 = (n: number) => Math.round(n * 10_000) / 10_000;

/** Daily completion percent: logs/3, capped at 100. */
export function completionPct(logCount: number): number {
  return round4(Math.min(logCount / DAILY_CAP, 1) * 100);
}

/** One EWMA step. */
export function nextMomentum(prev: number, completion: number): number {
  return round4(RETAIN * prev + GAIN * completion);
}

/**
 * Compute every snapshot from the day after the last stored snapshot through
 * yesterday. Days with no logs naturally yield 0-completion snapshots, so
 * gaps backfill for free. Returns [] when everything is already up to date.
 *
 * All date strings are YYYY-MM-DD in the user's timezone.
 */
export function rollForward(
  lastSnapshot: Snapshot | null,
  accountCreatedOn: string,
  logCountByDate: ReadonlyMap<string, number>,
  today: string,
): Snapshot[] {
  let cursor = lastSnapshot ? addDays(lastSnapshot.date, 1) : accountCreatedOn;
  let momentum = lastSnapshot?.momentum ?? START_MOMENTUM;

  const out: Snapshot[] = [];
  while (isBefore(cursor, today)) {
    const completion = completionPct(logCountByDate.get(cursor) ?? 0);
    momentum = nextMomentum(momentum, completion);
    out.push({ date: cursor, momentum, completionPct: completion });
    cursor = addDays(cursor, 1);
  }
  return out;
}

/** The momentum value to display today, given the latest snapshot. */
export function currentMomentum(lastSnapshot: Snapshot | null): number {
  return lastSnapshot?.momentum ?? START_MOMENTUM;
}
