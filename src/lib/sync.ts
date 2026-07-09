'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import * as db from './db';
import { addDays } from './dates';
import { createClient } from './supabase/client';
import {
  fromBucketRow,
  fromLogRow,
  fromProfileRow,
  fromSnapshotRow,
  toBucketRow,
  toLogRow,
  type BucketRow,
  type LogRow,
  type ProfileRow,
  type SnapshotRow,
} from './types';

/**
 * Push-then-pull sync. Drains the outbox in order, then replaces local data
 * with the server's view (server wins after our pushes land). A pull never
 * runs while the outbox is non-empty.
 */

const PULL_WINDOW_DAYS = 100; // covers the 90-day stats screen

let supabase: SupabaseClient | null = null;
const client = () => (supabase ??= createClient());

let flushing = false;
let rerun = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced sync poke — call after every local write. */
export function requestSync(delayMs = 2000) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => void syncNow(), delayMs);
}

export async function syncNow(): Promise<void> {
  if (flushing) {
    rerun = true;
    return;
  }
  flushing = true;
  try {
    do {
      rerun = false;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      const {
        data: { session },
      } = await client().auth.getSession();
      if (!session) return;
      const userId = session.user.id;

      const pushed = await drainOutbox(userId);
      if (!pushed) return; // hit an error mid-drain; wait for the next trigger

      if ((await db.outboxCount()) === 0) {
        await pull(userId);
      }
    } while (rerun);
  } finally {
    flushing = false;
  }
}

/** Returns true if the outbox fully drained. */
async function drainOutbox(userId: string): Promise<boolean> {
  const rows = await db.peekOutbox();
  for (const row of rows) {
    try {
      await pushOp(row.op, userId);
      await db.removeOutbox(row.seq);
    } catch (err) {
      if (isSlotCollision(err) && row.op.kind === 'insert_log') {
        // Another device filled this slot while we were offline. Drop the op
        // and the local log; the pull will bring the server's truth in.
        await db.removeOutbox(row.seq);
        await db.deleteLog(row.op.log.id);
        const { useAppStore } = await import('@/store/useAppStore');
        useAppStore.getState().dropLocalLog(row.op.log.id);
        continue;
      }
      return false; // network or other error: stop, keep order, retry later
    }
  }
  return true;
}

function isSlotCollision(err: unknown): boolean {
  return (
    typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505'
  );
}

async function pushOp(op: db.OutboxOp, userId: string): Promise<void> {
  const sb = client();
  switch (op.kind) {
    case 'insert_log': {
      const { error } = await sb
        .from('momentum_logs')
        .upsert(toLogRow({ ...op.log, userId }), { onConflict: 'id' });
      if (error) throw error;
      return;
    }
    case 'delete_log': {
      const { error } = await sb.from('momentum_logs').delete().eq('id', op.logId);
      if (error) throw error;
      return;
    }
    case 'upsert_bucket': {
      const { error } = await sb
        .from('momentum_buckets')
        .upsert(toBucketRow({ ...op.bucket, userId }), { onConflict: 'id' });
      if (error) throw error;
      return;
    }
    case 'upsert_snapshots': {
      const rows: SnapshotRow[] = op.snapshots.map((s) => ({
        user_id: userId,
        date: s.date,
        momentum: s.momentum,
        completion_pct: s.completionPct,
      }));
      const { error } = await sb
        .from('momentum_snapshots')
        .upsert(rows, { onConflict: 'user_id,date' });
      if (error) throw error;
      return;
    }
    case 'update_profile': {
      const { error } = await sb
        .from('momentum_profiles')
        .update(op.patch)
        .eq('user_id', userId);
      if (error) throw error;
      return;
    }
    case 'seed': {
      const profileRow: ProfileRow = {
        user_id: userId,
        timezone: op.profile.timezone,
        created_at: op.profile.createdAt,
      };
      const { error: pErr } = await sb
        .from('momentum_profiles')
        .upsert(profileRow, { onConflict: 'user_id', ignoreDuplicates: true });
      if (pErr) throw pErr;
      const bucketRows = op.buckets.map((b) => toBucketRow({ ...b, userId }));
      const { error: bErr } = await sb
        .from('momentum_buckets')
        .upsert(bucketRows, { onConflict: 'id', ignoreDuplicates: true });
      if (bErr) throw bErr;
      return;
    }
  }
}

async function pull(userId: string): Promise<void> {
  const sb = client();
  const since = addDays(new Date().toISOString().slice(0, 10), -PULL_WINDOW_DAYS);

  const [profileRes, bucketsRes, logsRes, snapshotsRes, latestSnapRes] = await Promise.all([
    sb.from('momentum_profiles').select('*').eq('user_id', userId).maybeSingle(),
    sb.from('momentum_buckets').select('*').eq('user_id', userId),
    sb.from('momentum_logs').select('*').eq('user_id', userId).gte('logged_on', since),
    sb.from('momentum_snapshots').select('*').eq('user_id', userId).gte('date', since),
    // Always include the latest snapshot even if it's outside the window —
    // the rollover walk must resume from it, never restart from the seed.
    sb
      .from('momentum_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1),
  ]);
  if (
    profileRes.error ||
    bucketsRes.error ||
    logsRes.error ||
    snapshotsRes.error ||
    latestSnapRes.error
  ) {
    return;
  }

  // A write may have landed while we were pulling — never clobber it.
  if ((await db.outboxCount()) > 0) return;

  const snapshots = (snapshotsRes.data as SnapshotRow[]).map(fromSnapshotRow);
  const latest = (latestSnapRes.data as SnapshotRow[]).map(fromSnapshotRow)[0];
  if (latest && !snapshots.some((s) => s.date === latest.date)) snapshots.push(latest);

  const data = {
    profile: profileRes.data ? fromProfileRow(profileRes.data as ProfileRow) : null,
    buckets: (bucketsRes.data as BucketRow[]).map(fromBucketRow),
    logs: (logsRes.data as LogRow[]).map(fromLogRow),
    snapshots,
  };
  await db.replaceAll(data);

  const { useAppStore } = await import('@/store/useAppStore');
  useAppStore.getState().applyPull(data);
}
