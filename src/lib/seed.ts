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

/**
 * Deterministic per-user bucket id. Two devices (or tabs) seeding
 * concurrently produce byte-identical rows, so the server's primary key
 * dedupes them — a random id here once caused a full duplicate seed set.
 */
async function seedBucketId(userId: string, sortOrder: number): Promise<string> {
  const data = new TextEncoder().encode(`momentum-seed:${userId}:${sortOrder}`);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  hash[6] = (hash[6] & 0x0f) | 0x40; // uuid v4 shape
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = Array.from(hash.slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export async function buildSeed(
  userId: string,
  timezone: string,
): Promise<{ profile: Profile; buckets: Bucket[] }> {
  return {
    profile: { userId, timezone, createdAt: new Date().toISOString() },
    buckets: await Promise.all(
      DEFAULT_BUCKETS.map(async (b) => ({
        ...b,
        id: await seedBucketId(userId, b.sortOrder),
        userId,
        archived: false,
      })),
    ),
  };
}
