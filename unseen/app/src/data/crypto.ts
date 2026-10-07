import { db } from './db';

let cached: CryptoKey | null = null;

export async function getKey(): Promise<CryptoKey> {
  if (cached) return cached;
  const row = await db.table('keys').get('vault');
  if (row?.key) {
    cached = row.key as CryptoKey;
    return cached;
  }
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  await db.table('keys').put({ id: 'vault', key });
  cached = key;
  return key;
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

export function resetKeyCache() { cached = null; }
