import { db } from './db';

let cached: CryptoKey | null = null;
// Single-flight: concurrent first callers (boot fires several at once) must all
// share ONE key generation. Without this, each caller that saw an empty `keys`
// table would generate and store its own key — last write wins, and every row
// sealed under a losing key becomes permanently undecryptable (OperationError).
let inflight: Promise<CryptoKey> | null = null;

export async function getKey(): Promise<CryptoKey> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const row = await db.table('keys').get('vault');
      if (row?.key) {
        cached = row.key as CryptoKey;
        return cached;
      }
      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      await db.table('keys').put({ id: 'vault', key });
      cached = key;
      return key;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export interface Sealed { id: string; ts: number; v: 1; iv: Uint8Array; ct: ArrayBuffer }

export async function seal(id: string, ts: number, obj: unknown): Promise<Sealed> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    data as BufferSource,
  );
  return { id, ts, v: 1, iv, ct };
}

export async function open<T>(s: Sealed): Promise<T> {
  const key = await getKey();
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: s.iv as BufferSource }, key, s.ct);
  return JSON.parse(new TextDecoder().decode(pt)) as T;
}

/** Like `open`, but returns null instead of throwing when a row cannot be
 *  decrypted (wrong/lost key, corrupt ciphertext). Callers decide what to do. */
export async function openSafe<T>(s: Sealed): Promise<T | null> {
  try { return await open<T>(s); } catch { return null; }
}

export function resetKeyCache() { cached = null; inflight = null; }
