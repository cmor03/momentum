import type { Bucket, Profile } from './types';

/**
 * Bucket colors: OKLCH at L 0.65, C 0.12 — validated with the dataviz palette
 * script against the dark surface (lightness band, chroma floor, CVD
 * separation, contrast). Buckets are always direct-labeled by name.
 */
export const BUCKET_COLORS = [
  'oklch(0.65 0.12 300)', // violet
  'oklch(0.65 0.12 155)', // green
  'oklch(0.65 0.12 230)', // blue
  'oklch(0.65 0.12 90)', // gold
  'oklch(0.65 0.12 350)', // rose
  'oklch(0.65 0.12 195)', // teal
  'oklch(0.65 0.12 55)', // amber
  'oklch(0.65 0.12 265)', // indigo
] as const;

/** The five default buckets. */
export const DEFAULT_BUCKETS: Array<
  Pick<Bucket, 'name' | 'color' | 'weeklyTarget' | 'sortOrder'>
> = [
  { name: 'Learn', color: BUCKET_COLORS[0], weeklyTarget: 5, sortOrder: 0 },
  { name: 'Body', color: BUCKET_COLORS[1], weeklyTarget: 5, sortOrder: 1 },
  { name: 'Mind', color: BUCKET_COLORS[2], weeklyTarget: 4, sortOrder: 2 },
  { name: 'Money', color: BUCKET_COLORS[3], weeklyTarget: 3, sortOrder: 3 },
  { name: 'People', color: BUCKET_COLORS[4], weeklyTarget: 2, sortOrder: 4 },
];

export function buildSeed(userId: string, timezone: string): { profile: Profile; buckets: Bucket[] } {
  return {
    profile: { userId, timezone, createdAt: new Date().toISOString() },
    buckets: DEFAULT_BUCKETS.map((b) => ({
      ...b,
      id: crypto.randomUUID(),
      userId,
      archived: false,
    })),
  };
}
