import { db } from './db';
import { openSafe, seal, type Sealed } from './crypto';
import { queue } from './sync';
import type {
  Ally, ArmoryVerse, Battle, LieCluster, LocalEvent, Settings, Stone, Transcript, WatchWindow,
} from '../types';

// Stamp the write so the phone and the server copy merge by last write.
function stamp<T extends { updatedAt?: number }>(obj: T): T {
  return { ...obj, updatedAt: Date.now() };
}

async function putSealed(table: string, id: string, ts: number, obj: unknown) {
  await db.table(table).put(await seal(id, ts, obj));
}

// Decrypts every row of a table. A row that cannot be opened (sealed under a
// lost key, or corrupt) is skipped AND deleted: the key is non-extractable, so
// such a row is unrecoverable garbage, and one bad row must never take a whole
// screen down with an unhandled rejection.
async function allSealed<T>(table: string): Promise<T[]> {
  const rows = (await db.table(table).toArray()) as Sealed[];
  const opened = await Promise.all(rows.map((r) => openSafe<T>(r)));
  const out: T[] = [];
  const dead: string[] = [];
  opened.forEach((v, i) => { if (v === null) dead.push(rows[i].id); else out.push(v); });
  if (dead.length) {
    console.warn(`[unseen] ${table}: purged ${dead.length} undecryptable row(s)`);
    await Promise.all(dead.map((id) => db.table(table).delete(id)));
  }
  return out;
}

// In-memory caches of decrypted rows so the battle hot path and analytics do not
// repeatedly decrypt. Invalidated whenever the underlying rows change.
let battleCache: Battle[] | null = null;
let stoneCache: Stone[] | null = null;
let settingsCache: Settings | null | undefined;
export function invalidateCaches() { battleCache = null; stoneCache = null; settingsCache = undefined; }

// ---- settings ----
export const DEFAULT_SETTINGS: Settings = {
  id: 'me', bibleId: 3034, battleStyle: 'cinematic', reduceMotion: false, sound: false,
  retentionDays: 30, watchAlerts: 'in_app', adultConfirmedAt: 0, onboardedAt: 0,
  theme: 'system', discernMode: 'gloo',
};

export async function getSettings(): Promise<Settings | null> {
  if (settingsCache !== undefined) return settingsCache;
  const row = (await db.table('settings').get('me')) as Sealed | undefined;
  // Undecryptable settings → treat as a fresh install (re-onboard) rather than crash at boot.
  settingsCache = row ? await openSafe<Settings>(row) : null;
  return settingsCache;
}
export async function saveSettings(s: Settings, opts: { sync?: boolean } = {}) {
  const stamped = stamp(s);
  await putSealed('settings', 'me', Date.now(), stamped);
  settingsCache = stamped;
  if (opts.sync !== false) void queue('profile', 'upsert', 'me', stamped);
}

// ---- battles ----
export async function saveBattle(b: Battle) {
  const row = stamp(b);
  await putSealed('battles', row.id, row.startedAt, row); battleCache = null;
  void queue('battles', 'upsert', row.id, row);
}
export async function allBattles(): Promise<Battle[]> {
  if (battleCache) return battleCache;
  battleCache = (await allSealed<Battle>('battles')).sort((a, b) => b.startedAt - a.startedAt);
  return battleCache;
}

// ---- stones ----
export async function saveStone(s: Stone) {
  const row = stamp(s);
  await putSealed('stones', row.id, Date.parse(row.date) || Date.now(), row); stoneCache = null;
  void queue('stones', 'upsert', row.id, row);
}
export async function allStones(): Promise<Stone[]> {
  if (stoneCache) return stoneCache;
  stoneCache = (await allSealed<Stone>('stones')).sort((a, b) => (a.date < b.date ? 1 : -1));
  return stoneCache;
}
export async function getStone(id: string): Promise<Stone | null> {
  const row = (await db.table('stones').get(id)) as Sealed | undefined;
  return row ? openSafe<Stone>(row) : null;
}

// ---- transcripts ----
export async function saveTranscript(t: Transcript) {
  await db.table('transcripts').put(await seal(t.id, t.expiresAt, t));
}

// ---- lie clusters ----
export async function allClusters(): Promise<LieCluster[]> { return allSealed<LieCluster>('lieClusters'); }
export async function saveCluster(c: LieCluster) { await putSealed('lieClusters', c.id, c.lastSeen, c); }

// ---- armory ----
export async function allArmory(): Promise<ArmoryVerse[]> { return allSealed<ArmoryVerse>('armory'); }
export async function saveArmory(a: ArmoryVerse) {
  const row = stamp(a);
  await putSealed('armory', row.id, row.nextDrillAt, row);
  void queue('armory', 'upsert', row.id, row);
}

// ---- watch ----
export async function allWatch(): Promise<WatchWindow[]> { return allSealed<WatchWindow>('watch'); }
export async function saveWatch(w: WatchWindow) {
  const row = stamp(w);
  await putSealed('watch', row.id, Date.now(), row);
  void queue('watch', 'upsert', row.id, row);
}
export async function clearWatch() {
  const ids = (await db.table('watch').toArray() as Sealed[]).map((r) => r.id);
  await db.table('watch').clear();
  for (const id of ids) void queue('watch', 'delete', id);
}

// ---- allies ----
export async function allAllies(): Promise<Ally[]> { return allSealed<Ally>('allies'); }
export async function saveAlly(a: Ally) {
  const row = stamp(a);
  await putSealed('allies', row.id, row.consentAt, row);
  void queue('allies', 'upsert', row.id, row);
}
export async function removeAlly(id: string) {
  await db.table('allies').delete(id);
  void queue('allies', 'delete', id);
}

// ---- events (content-free, not sealed) ----
export async function logEvent(e: LocalEvent) { await db.table('events').put(e); }
export async function allEvents(): Promise<LocalEvent[]> { return db.table('events').toArray() as Promise<LocalEvent[]>; }

// ---- public verse cache (not sealed) ----
// Keyed `${bibleId}:${usfm}`. `ts` lets licensed (non-BSB) text expire; the
// public-domain BSB is kept for good so the battle works offline.
export async function getCachedVerse(key: string): Promise<{ key: string; reference: string; content: string; ts?: number } | undefined> {
  return db.table('verses').get(key);
}
export async function putCachedVerse(key: string, reference: string, content: string) {
  await db.table('verses').put({ key, reference, content, ts: Date.now() });
}

export async function retentionSweep() {
  const now = Date.now();
  const rows = (await db.table('transcripts').toArray()) as Sealed[];
  await Promise.all(rows.filter((r) => r.ts && r.ts < now).map((r) => db.table('transcripts').delete(r.id)));
}

// One-time clean-up for devices that loaded the old synthetic "demo data": those
// rows were flagged demo:true and are not part of anyone's real history.
export async function purgeLegacyDemoRows(): Promise<number> {
  const FLAG = 'unseen-demo-purged';
  try { if (localStorage.getItem(FLAG)) return 0; } catch { /* ignore */ }
  let removed = 0;
  for (const table of ['battles', 'stones'] as const) {
    const rows = (await db.table(table).toArray()) as Sealed[];
    for (const r of rows) {
      const obj = await openSafe<{ demo?: boolean }>(r);
      if (obj?.demo) { await db.table(table).delete(r.id); removed += 1; }
    }
  }
  if (removed) { invalidateCaches(); await db.table('lieClusters').clear(); await db.table('watch').clear(); }
  try { localStorage.setItem(FLAG, '1'); } catch { /* ignore */ }
  return removed;
}
