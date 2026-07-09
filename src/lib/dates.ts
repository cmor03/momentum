/**
 * All calendar math in the app happens on YYYY-MM-DD strings derived from the
 * user's profile timezone. `todayLocal` is the ONLY place "today" is derived;
 * arithmetic never touches device-local time, so DST can't skew a date.
 */

const DAY_MS = 86_400_000;

/** Current calendar date in the given IANA timezone, as YYYY-MM-DD. */
export function todayLocal(timeZone: string, now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD; locked by unit test.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** ymd + n days (n may be negative). Pure UTC arithmetic — DST-proof. */
export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) + n * DAY_MS);
  const mm = String(t.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(t.getUTCDate()).padStart(2, '0');
  return `${t.getUTCFullYear()}-${mm}-${dd}`;
}

/** Whole days from a to b (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / DAY_MS);
}

/** YYYY-MM-DD strings compare correctly as plain strings. */
export function isBefore(a: string, b: string): boolean {
  return a < b;
}

/** The device's IANA timezone, for first-run profile setup. */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
