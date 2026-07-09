import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Bucket, Log, Profile, Snapshot } from './types';

/**
 * IndexedDB is the source of truth the UI renders from. Supabase is a sync
 * target. The outbox holds pending server writes in insertion order.
 */

export type OutboxOp =
  | { kind: 'insert_log'; log: Log }
  | { kind: 'delete_log'; logId: string }
  | { kind: 'upsert_bucket'; bucket: Bucket }
  | { kind: 'upsert_snapshots'; userId: string; snapshots: Snapshot[] }
  | { kind: 'update_profile'; userId: string; patch: { timezone?: string } }
  | { kind: 'seed'; profile: Profile; buckets: Bucket[] };

export interface OutboxRow {
  seq?: number;
  op: OutboxOp;
}

interface MomentumDB extends DBSchema {
  buckets: { key: string; value: Bucket };
  logs: { key: string; value: Log; indexes: { 'by-date': string } };
  snapshots: { key: string; value: Snapshot };
  meta: { key: string; value: unknown };
  outbox: { key: number; value: OutboxRow };
}

let dbPromise: Promise<IDBPDatabase<MomentumDB>> | null = null;

export function getDB() {
  dbPromise ??= openDB<MomentumDB>('momentum', 1, {
    upgrade(db) {
      db.createObjectStore('buckets', { keyPath: 'id' });
      const logs = db.createObjectStore('logs', { keyPath: 'id' });
      logs.createIndex('by-date', 'loggedOn');
      db.createObjectStore('snapshots', { keyPath: 'date' });
      db.createObjectStore('meta');
      db.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true });
    },
  });
  return dbPromise;
}

export async function loadAll() {
  const db = await getDB();
  const [buckets, logs, snapshots, profile, outboxCount] = await Promise.all([
    db.getAll('buckets'),
    db.getAll('logs'),
    db.getAll('snapshots'),
    db.get('meta', 'profile') as Promise<Profile | undefined>,
    db.count('outbox'),
  ]);
  return { buckets, logs, snapshots, profile: profile ?? null, outboxCount };
}

export async function putBucket(bucket: Bucket) {
  const db = await getDB();
  await db.put('buckets', bucket);
}

export async function putLog(log: Log) {
  const db = await getDB();
  await db.put('logs', log);
}

export async function deleteLog(logId: string) {
  const db = await getDB();
  await db.delete('logs', logId);
}

export async function putSnapshots(snapshots: Snapshot[]) {
  const db = await getDB();
  const tx = db.transaction('snapshots', 'readwrite');
  for (const s of snapshots) tx.store.put(s);
  await tx.done;
}

export async function putProfile(profile: Profile) {
  const db = await getDB();
  await db.put('meta', profile, 'profile');
}

export async function enqueue(op: OutboxOp): Promise<void> {
  const db = await getDB();
  await db.add('outbox', { op });
}

export async function peekOutbox(): Promise<Required<OutboxRow>[]> {
  const db = await getDB();
  return (await db.getAll('outbox')) as Required<OutboxRow>[];
}

export async function removeOutbox(seq: number) {
  const db = await getDB();
  await db.delete('outbox', seq);
}

export async function outboxCount(): Promise<number> {
  const db = await getDB();
  return db.count('outbox');
}

/** Remove a pending insert_log op for this id. Returns true if one existed. */
export async function removePendingInsert(logId: string): Promise<boolean> {
  const db = await getDB();
  const rows = (await db.getAll('outbox')) as Required<OutboxRow>[];
  const row = rows.find((r) => r.op.kind === 'insert_log' && r.op.log.id === logId);
  if (!row) return false;
  await db.delete('outbox', row.seq);
  return true;
}

/** Replace local data wholesale after a pull. Never called with a non-empty outbox. */
export async function replaceAll(data: {
  buckets: Bucket[];
  logs: Log[];
  snapshots: Snapshot[];
  profile: Profile | null;
}) {
  const db = await getDB();
  const tx = db.transaction(['buckets', 'logs', 'snapshots', 'meta'], 'readwrite');
  await Promise.all([
    tx.objectStore('buckets').clear(),
    tx.objectStore('logs').clear(),
    tx.objectStore('snapshots').clear(),
  ]);
  for (const b of data.buckets) tx.objectStore('buckets').put(b);
  for (const l of data.logs) tx.objectStore('logs').put(l);
  for (const s of data.snapshots) tx.objectStore('snapshots').put(s);
  if (data.profile) tx.objectStore('meta').put(data.profile, 'profile');
  await tx.done;
}

/** Wipe everything (sign-out of a different account, etc.). */
export async function clearAll() {
  const db = await getDB();
  const tx = db.transaction(['buckets', 'logs', 'snapshots', 'meta', 'outbox'], 'readwrite');
  await Promise.all([
    tx.objectStore('buckets').clear(),
    tx.objectStore('logs').clear(),
    tx.objectStore('snapshots').clear(),
    tx.objectStore('meta').clear(),
    tx.objectStore('outbox').clear(),
  ]);
  await tx.done;
}
