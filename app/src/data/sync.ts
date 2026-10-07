// Sync between the phone's sealed store and the server (/api/me).
//
// The phone stays the fast path: every screen reads IndexedDB. Each local write
// is also queued in an outbox and pushed in batches; on boot and whenever the
// connection returns, changes since the last pull are merged in by last write
// (updatedAt). Identity is the anonymous install id; raw transcripts and the
// content-free event log never leave the phone.
import { db } from './db';
import { openSafe, seal, type Sealed } from './crypto';
import { api, type SyncPushBody, type SyncRow } from '../ai/api';
import { getToken } from './auth';
import type { Settings } from '../types';

export type Collection = 'battles' | 'stones' | 'allies' | 'armory' | 'watch';
export const COLLECTIONS: Collection[] = ['battles', 'stones', 'allies', 'armory', 'watch'];

interface OutboxRow { seq?: number; collection: Collection | 'profile'; op: 'upsert' | 'delete'; id: string; data?: unknown; ts: number }

const SINCE_KEY = 'unseen-sync-since';
const FLUSH_DELAY_MS = 400;
const PUSH_BATCH = 300;

let timer: number | undefined;
let flushing = false;
let listeners: Array<() => void> = [];

export function onSynced(fn: () => void): () => void {
  listeners.push(fn);
  return () => { listeners = listeners.filter((f) => f !== fn); };
}

// Record a local change; it reaches the server on the next flush.
export async function queue(collection: Collection | 'profile', op: 'upsert' | 'delete', id: string, data?: unknown): Promise<void> {
  const row: OutboxRow = { collection, op, id, data, ts: Date.now() };
  try { await db.table('outbox').add(row); } catch { return; }
  scheduleFlush();
}

export function scheduleFlush(delay = FLUSH_DELAY_MS): void {
  if (timer) window.clearTimeout(timer);
  timer = window.setTimeout(() => { void flush(); }, delay);
}

// Push the outbox. Later entries for the same row win; the outbox survives
// failures and is retried on the next flush (boot, 'online', next write).
export async function flush(): Promise<void> {
  if (flushing || !navigator.onLine || !getToken()) return;
  flushing = true;
  try {
    const rows = (await db.table('outbox').orderBy('seq').limit(PUSH_BATCH).toArray()) as OutboxRow[];
    if (!rows.length) return;
    const latest = new Map<string, OutboxRow>();
    for (const r of rows) latest.set(`${r.collection}:${r.id}`, r);
    const body: SyncPushBody = { profile: null, upserts: {}, deletes: [] };
    for (const r of latest.values()) {
      if (r.collection === 'profile') body.profile = (r.data as Record<string, unknown>) ?? null;
      else if (r.op === 'delete') body.deletes.push({ collection: r.collection, id: r.id });
      else (body.upserts[r.collection] ??= []).push(r.data);
    }
    await api.syncPush(body);
    await db.table('outbox').bulkDelete(rows.map((r) => r.seq as number));
    if ((await db.table('outbox').count()) > 0) scheduleFlush(50);
  } catch {
    /* network or server trouble: the outbox is kept and retried later */
  } finally {
    flushing = false;
  }
}

export async function pendingCount(): Promise<number> {
  try { return await db.table('outbox').count(); } catch { return 0; }
}

function tsFor(collection: Collection, row: SyncRow): number {
  switch (collection) {
    case 'battles': return Number(row.startedAt) || Date.now();
    case 'stones': return Date.parse(String(row.date)) || Date.now();
    case 'allies': return Number(row.consentAt) || Date.now();
    case 'armory': return Number(row.nextDrillAt) || Date.now();
    default: return Date.now();
  }
}

export interface PullResult { changed: number; profile: Settings | null; available: boolean }

// Merge server changes since the last pull into the sealed store. Rows with a
// pending local change are left alone (the local change is newer and will push).
export async function pull(): Promise<PullResult> {
  if (!navigator.onLine || !getToken()) return { changed: 0, profile: null, available: false };
  const since = Number(localStorage.getItem(SINCE_KEY) ?? 0) || 0;
  const res = await api.syncPull(since);
  if (!res.available) return { changed: 0, profile: null, available: false };
  const pending = new Set(((await db.table('outbox').toArray()) as OutboxRow[]).map((r) => `${r.collection}:${r.id}`));
  let changed = 0;
  for (const col of COLLECTIONS) {
    const table = db.table(col);
    for (const row of res[col] ?? []) {
      if (!row?.id || pending.has(`${col}:${row.id}`)) continue;
      if (row.deleted) {
        if (await table.get(row.id)) { await table.delete(row.id); changed += 1; }
        continue;
      }
      const existing = (await table.get(row.id)) as Sealed | undefined;
      if (existing) {
        const cur = await openSafe<{ updatedAt?: number }>(existing);
        if (cur?.updatedAt && cur.updatedAt >= (row.updatedAt ?? 0)) continue;
      }
      await table.put(await seal(row.id, tsFor(col, row), row));
      changed += 1;
    }
  }
  const profile = res.profile && !pending.has('profile:me') ? (res.profile as unknown as Settings) : null;
  try { localStorage.setItem(SINCE_KEY, String(res.now)); } catch { /* ignore */ }
  if (changed) listeners.forEach((fn) => fn());
  return { changed, profile, available: true };
}

// "Delete everything": the server copy goes first, then the phone.
export async function wipeRemote(): Promise<void> {
  try { await api.syncWipe(); } catch { /* offline: the phone is wiped regardless */ }
  try { await db.table('outbox').clear(); } catch { /* ignore */ }
  try { localStorage.removeItem(SINCE_KEY); } catch { /* ignore */ }
}

export function resetSyncCursor(): void {
  try { localStorage.removeItem(SINCE_KEY); } catch { /* ignore */ }
}
