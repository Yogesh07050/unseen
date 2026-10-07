import Dexie from 'dexie';

// One IndexedDB database; personal rows are sealed (§9).
export const db = new Dexie('unseen');
db.version(1).stores({
  battles: 'id, ts',
  stones: 'id, ts',
  transcripts: 'id, expiresAt',
  lieClusters: 'id',
  armory: 'id, nextDrillAt',
  watch: 'id',
  allies: 'id',
  settings: 'id',
  verses: 'key',
  events: 'id, ts, type',
  keys: 'id',
});
// v2: the sync outbox — local writes waiting to reach the server (data/sync.ts).
db.version(2).stores({
  outbox: '++seq, collection',
});

export async function wipeEverything(): Promise<void> {
  await db.delete();
  // Clear service-worker caches named unseen-*
  if ('caches' in window) {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('unseen-')).map((n) => caches.delete(n)));
  }
}

// Everything personal on this device (sealed rows, outbox, key) — keeps the public
// verse cache so Scripture is still there offline. Used at sign-in and sign-out.
export async function clearCachedPersonalData(): Promise<void> {
  const personal = ['battles', 'stones', 'transcripts', 'lieClusters', 'armory', 'watch', 'allies', 'settings', 'events', 'keys', 'outbox'];
  await Promise.all(personal.map((t) => db.table(t).clear().catch(() => undefined)));
}
