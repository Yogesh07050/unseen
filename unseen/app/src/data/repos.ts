import { db } from './db';
import { open, seal, type Sealed } from './crypto';
import type {
  Ally, ArmoryVerse, Battle, LieCluster, LocalEvent, Settings, Stone, Transcript, WatchWindow,
} from '../types';

async function putSealed(table: string, id: string, ts: number, obj: unknown) {
  await db.table(table).put(await seal(id, ts, obj));
}

async function allSealed<T>(table: string): Promise<T[]> {
  const rows = (await db.table(table).toArray()) as Sealed[];
  return Promise.all(rows.map((r) => open<T>(r)));
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
  retentionDays: 30, lock: 'none', watchAlerts: 'in_app', adultConfirmedAt: 0, onboardedAt: 0,
  discernMode: 'instant',
};

export async function getSettings(): Promise<Settings | null> {
  if (settingsCache !== undefined) return settingsCache;
  const row = (await db.table('settings').get('me')) as Sealed | undefined;
  settingsCache = row ? await open<Settings>(row) : null;
  return settingsCache;
}
export async function saveSettings(s: Settings) {
  await putSealed('settings', 'me', Date.now(), s);
  settingsCache = s;
}

// ---- battles ----
export async function saveBattle(b: Battle) { await putSealed('battles', b.id, b.startedAt, b); battleCache = null; }
export async function allBattles(): Promise<Battle[]> {
  if (battleCache) return battleCache;
  battleCache = (await allSealed<Battle>('battles')).sort((a, b) => b.startedAt - a.startedAt);
  return battleCache;
}

// ---- stones ----
export async function saveStone(s: Stone) { await putSealed('stones', s.id, Date.parse(s.date) || Date.now(), s); stoneCache = null; }
export async function allStones(): Promise<Stone[]> {
  if (stoneCache) return stoneCache;
  stoneCache = (await allSealed<Stone>('stones')).sort((a, b) => (a.date < b.date ? 1 : -1));
  return stoneCache;
}
export async function getStone(id: string): Promise<Stone | null> {
  const row = (await db.table('stones').get(id)) as Sealed | undefined;
  return row ? open<Stone>(row) : null;
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
export async function saveArmory(a: ArmoryVerse) { await putSealed('armory', a.id, a.nextDrillAt, a); }

// ---- watch ----
export async function allWatch(): Promise<WatchWindow[]> { return allSealed<WatchWindow>('watch'); }
export async function saveWatch(w: WatchWindow) { await putSealed('watch', w.id, Date.now(), w); }
export async function clearWatch() { await db.table('watch').clear(); }

// ---- allies ----
export async function allAllies(): Promise<Ally[]> { return allSealed<Ally>('allies'); }
export async function saveAlly(a: Ally) { await putSealed('allies', a.id, a.consentAt, a); }
export async function removeAlly(id: string) { await db.table('allies').delete(id); }

// ---- events (content-free, not sealed) ----
export async function logEvent(e: LocalEvent) { await db.table('events').put(e); }
export async function allEvents(): Promise<LocalEvent[]> { return db.table('events').toArray() as Promise<LocalEvent[]>; }

// ---- public verse cache (not sealed) ----
export async function getCachedVerse(key: string): Promise<{ key: string; reference: string; content: string } | undefined> {
  return db.table('verses').get(key);
}
export async function putCachedVerse(key: string, reference: string, content: string) {
  await db.table('verses').put({ key, reference, content });
}

export async function retentionSweep() {
  const now = Date.now();
  const rows = (await db.table('transcripts').toArray()) as Sealed[];
  await Promise.all(rows.filter((r) => r.ts && r.ts < now).map((r) => db.table('transcripts').delete(r.id)));
}

export async function clearDemo() {
  invalidateCaches();
  for (const table of ['battles', 'stones'] as const) {
    const rows = (await db.table(table).toArray()) as Sealed[];
    for (const r of rows) {
      const obj = await open<{ demo?: boolean }>(r);
      if (obj.demo) await db.table(table).delete(r.id);
    }
  }
  await db.table('lieClusters').clear();
  await clearWatch();
}
