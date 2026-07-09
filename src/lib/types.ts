export interface Profile {
  userId: string;
  timezone: string;
  createdAt: string; // ISO timestamp
}

export interface Bucket {
  id: string;
  userId: string;
  name: string;
  color: string; // OKLCH or hex token value
  weeklyTarget: number;
  sortOrder: number;
  archived: boolean;
}

export type Slot = 1 | 2 | 3;

export interface Log {
  id: string;
  userId: string;
  bucketId: string;
  loggedOn: string; // YYYY-MM-DD in the user's timezone
  slot: Slot;
  createdAt: string; // ISO timestamp
}

export interface Snapshot {
  date: string; // YYYY-MM-DD — the day this snapshot summarizes
  momentum: number; // value entering the *next* day, 0–100
  completionPct: number; // this day's completion, 0–100
}

// ---- Postgres row shapes (snake_case) and mappers ----

export interface ProfileRow {
  user_id: string;
  timezone: string;
  created_at: string;
}

export interface BucketRow {
  id: string;
  user_id: string;
  name: string;
  color: string;
  weekly_target: number;
  sort_order: number;
  archived: boolean;
}

export interface LogRow {
  id: string;
  user_id: string;
  bucket_id: string;
  logged_on: string;
  slot: number;
  created_at: string;
}

export interface SnapshotRow {
  user_id: string;
  date: string;
  momentum: number;
  completion_pct: number;
}

export const fromProfileRow = (r: ProfileRow): Profile => ({
  userId: r.user_id,
  timezone: r.timezone,
  createdAt: r.created_at,
});

export const fromBucketRow = (r: BucketRow): Bucket => ({
  id: r.id,
  userId: r.user_id,
  name: r.name,
  color: r.color,
  weeklyTarget: r.weekly_target,
  sortOrder: r.sort_order,
  archived: r.archived,
});

export const toBucketRow = (b: Bucket): BucketRow => ({
  id: b.id,
  user_id: b.userId,
  name: b.name,
  color: b.color,
  weekly_target: b.weeklyTarget,
  sort_order: b.sortOrder,
  archived: b.archived,
});

export const fromLogRow = (r: LogRow): Log => ({
  id: r.id,
  userId: r.user_id,
  bucketId: r.bucket_id,
  loggedOn: r.logged_on,
  slot: r.slot as Slot,
  createdAt: r.created_at,
});

export const toLogRow = (l: Log): LogRow => ({
  id: l.id,
  user_id: l.userId,
  bucket_id: l.bucketId,
  logged_on: l.loggedOn,
  slot: l.slot,
  created_at: l.createdAt,
});

export const fromSnapshotRow = (r: SnapshotRow): Snapshot => ({
  date: typeof r.date === 'string' ? r.date.slice(0, 10) : r.date,
  momentum: Number(r.momentum),
  completionPct: r.completion_pct,
});
