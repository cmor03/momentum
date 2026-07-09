'use client';

import { create } from 'zustand';
import * as idb from '@/lib/db';
import { detectTimezone, todayLocal } from '@/lib/dates';
import { DAILY_CAP, rollForward } from '@/lib/momentum';
import { buildSeed } from '@/lib/seed';
import { lowestFreeSlot } from '@/lib/slots';
import { createClient } from '@/lib/supabase/client';
import type { Bucket, Log, Profile, Snapshot } from '@/lib/types';

/**
 * Every mutation follows the same path: update this store (instant UI) →
 * write IndexedDB → append an outbox op → poke the sync engine.
 */

type Status = 'booting' | 'signedOut' | 'ready';

interface PulledData {
  profile: Profile | null;
  buckets: Bucket[];
  logs: Log[];
  snapshots: Snapshot[];
}

interface AppState {
  status: Status;
  userId: string | null;
  profile: Profile | null;
  buckets: Bucket[];
  logs: Log[];
  snapshots: Snapshot[]; // sorted ascending by date
  today: string;
  justCompletedDay: boolean; // one-shot flag for the 3/3 moment

  boot(): Promise<void>;
  logBucket(bucketId: string): Promise<void>;
  undoLog(logId: string): Promise<void>;
  saveBucket(bucket: Bucket): Promise<void>;
  setTimezone(tz: string): Promise<void>;
  runRollover(): Promise<void>;
  applyPull(data: PulledData): void;
  dropLocalLog(logId: string): void;
  clearCelebration(): void;
  signOut(): Promise<void>;
}

const sortSnapshots = (s: Snapshot[]) => [...s].sort((a, b) => (a.date < b.date ? -1 : 1));

const requestSync = (delayMs?: number) =>
  import('@/lib/sync').then((m) => m.requestSync(delayMs)).catch(() => {});

export const useAppStore = create<AppState>((set, get) => ({
  status: 'booting',
  userId: null,
  profile: null,
  buckets: [],
  logs: [],
  snapshots: [],
  today: '',
  justCompletedDay: false,

  async boot() {
    try {
      await navigator.storage?.persist?.();
    } catch {
      /* best effort */
    }

    const local = await idb.loadAll();
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user.id ?? null;

    if (local.profile) {
      // Returning user: render immediately from local data, sync in background.
      set({
        status: 'ready',
        userId,
        profile: local.profile,
        buckets: local.buckets,
        logs: local.logs,
        snapshots: sortSnapshots(local.snapshots),
        today: todayLocal(local.profile.timezone),
      });
      await get().runRollover();
      if (userId) {
        const { syncNow } = await import('@/lib/sync');
        void syncNow();
      }
      return;
    }

    if (!userId) {
      set({ status: 'signedOut' });
      return;
    }

    // Signed in but nothing local: pull first (existing account, new device)…
    const { syncNow } = await import('@/lib/sync');
    await syncNow();
    const pulled = await idb.loadAll();
    if (pulled.profile) {
      set({
        status: 'ready',
        userId,
        profile: pulled.profile,
        buckets: pulled.buckets,
        logs: pulled.logs,
        snapshots: sortSnapshots(pulled.snapshots),
        today: todayLocal(pulled.profile.timezone),
      });
      await get().runRollover();
      return;
    }

    // …genuinely new account: seed the five defaults locally and push.
    const seed = buildSeed(userId, detectTimezone());
    await idb.putProfile(seed.profile);
    for (const b of seed.buckets) await idb.putBucket(b);
    await idb.enqueue({ kind: 'seed', profile: seed.profile, buckets: seed.buckets });
    set({
      status: 'ready',
      userId,
      profile: seed.profile,
      buckets: seed.buckets,
      logs: [],
      snapshots: [],
      today: todayLocal(seed.profile.timezone),
    });
    void requestSync(0);
  },

  async logBucket(bucketId: string) {
    const { profile, userId, logs, today } = get();
    if (!profile) return;
    const todaysLogs = logs.filter((l) => l.loggedOn === today);
    const slot = lowestFreeSlot(todaysLogs.map((l) => l.slot));
    if (slot === null) return; // day is full — the cap is the feature

    const log: Log = {
      id: crypto.randomUUID(),
      userId: userId ?? profile.userId,
      bucketId,
      loggedOn: today,
      slot,
      createdAt: new Date().toISOString(),
    };
    set({
      logs: [...logs, log],
      justCompletedDay: todaysLogs.length + 1 === DAILY_CAP,
    });
    await idb.putLog(log);
    await idb.enqueue({ kind: 'insert_log', log });
    void requestSync();
  },

  async undoLog(logId: string) {
    const { logs, today } = get();
    const log = logs.find((l) => l.id === logId);
    if (!log || log.loggedOn !== today) return; // undo is same-day only
    set({ logs: logs.filter((l) => l.id !== logId) });
    await idb.deleteLog(logId);
    // If the insert never left the outbox, cancel it and the server never knows.
    const cancelled = await idb.removePendingInsert(logId);
    if (!cancelled) await idb.enqueue({ kind: 'delete_log', logId });
    void requestSync();
  },

  async saveBucket(bucket: Bucket) {
    const { buckets } = get();
    const next = buckets.some((b) => b.id === bucket.id)
      ? buckets.map((b) => (b.id === bucket.id ? bucket : b))
      : [...buckets, bucket];
    set({ buckets: next.sort((a, b) => a.sortOrder - b.sortOrder) });
    await idb.putBucket(bucket);
    await idb.enqueue({ kind: 'upsert_bucket', bucket });
    void requestSync();
  },

  async setTimezone(tz: string) {
    const { profile } = get();
    if (!profile) return;
    const next = { ...profile, timezone: tz };
    set({ profile: next, today: todayLocal(tz) });
    await idb.putProfile(next);
    await idb.enqueue({ kind: 'update_profile', userId: next.userId, patch: { timezone: tz } });
    void requestSync();
    await get().runRollover();
  },

  async runRollover() {
    const { profile, snapshots, logs } = get();
    if (!profile) return;
    const today = todayLocal(profile.timezone);
    const last = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
    const createdOn = todayLocal(profile.timezone, new Date(profile.createdAt));
    const counts = new Map<string, number>();
    for (const l of logs) counts.set(l.loggedOn, (counts.get(l.loggedOn) ?? 0) + 1);

    const fresh = rollForward(last, createdOn, counts, today);
    if (fresh.length > 0) {
      set({ snapshots: sortSnapshots([...snapshots, ...fresh]), today });
      await idb.putSnapshots(fresh);
      await idb.enqueue({
        kind: 'upsert_snapshots',
        userId: profile.userId,
        snapshots: fresh,
      });
      void requestSync();
    } else if (today !== get().today) {
      set({ today });
    }
  },

  applyPull(data: PulledData) {
    const { profile } = get();
    const tz = data.profile?.timezone ?? profile?.timezone ?? 'UTC';
    set({
      profile: data.profile ?? profile,
      buckets: [...data.buckets].sort((a, b) => a.sortOrder - b.sortOrder),
      logs: data.logs,
      snapshots: sortSnapshots(data.snapshots),
      today: todayLocal(tz),
    });
    void get().runRollover();
  },

  dropLocalLog(logId: string) {
    set({ logs: get().logs.filter((l) => l.id !== logId) });
  },

  clearCelebration() {
    if (get().justCompletedDay) set({ justCompletedDay: false });
  },

  async signOut() {
    const { syncNow } = await import('@/lib/sync');
    await syncNow(); // best-effort flush before leaving
    const supabase = createClient();
    await supabase.auth.signOut();
    await idb.clearAll();
    set({
      status: 'signedOut',
      userId: null,
      profile: null,
      buckets: [],
      logs: [],
      snapshots: [],
      today: '',
      justCompletedDay: false,
    });
  },
}));

// ---- Derived selectors ----

export const selectMomentum = (s: AppState): number => {
  const last = s.snapshots.length > 0 ? s.snapshots[s.snapshots.length - 1] : null;
  return last?.momentum ?? 50;
};

export const selectTodayLogs = (s: AppState): Log[] =>
  s.logs.filter((l) => l.loggedOn === s.today);

/** Trailing 7-day fill for a bucket: completions in the last 7 days / target, capped. */
export const selectBucketFill = (s: AppState, bucketId: string): number => {
  const bucket = s.buckets.find((b) => b.id === bucketId);
  if (!bucket || !s.today) return 0;
  const cutoff = shiftYmd(s.today, -6);
  const count = s.logs.filter(
    (l) => l.bucketId === bucketId && l.loggedOn >= cutoff && l.loggedOn <= s.today,
  ).length;
  return Math.min(count / bucket.weeklyTarget, 1);
};

// local, tiny — avoids importing dates.ts into a hot selector path
function shiftYmd(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) + n * 86_400_000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(
    t.getUTCDate(),
  ).padStart(2, '0')}`;
}
