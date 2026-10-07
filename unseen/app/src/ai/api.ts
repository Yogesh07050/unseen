// Typed client for the API proxy (§12). Every call carries X-Install-Id.
// Same-origin by default; the native Android shell sets VITE_API_BASE (see ./base).
import { Capacitor } from '@capacitor/core';
import type { ContextType, Discernment, Front, Struggle, Trigger } from '../types';
import { apiUrl } from './base';

const INSTALL_KEY = 'unseen-install-id';
// 'android' | 'ios' | 'web' — lets the server's anonymous install registry tell
// the native app from the PWA. Carries no identity.
const PLATFORM = Capacitor.getPlatform();

export function installId(): string {
  let id = localStorage.getItem(INSTALL_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(INSTALL_KEY, id);
  }
  return id;
}

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Install-Id': installId(),
    'X-Client-Version': '1.0.0',
    'X-Client-Platform': PLATFORM,
  };
}

async function req<T>(path: string, init?: RequestInit, timeoutMs = 10000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(apiUrl(`/api${path}`), { ...init, headers: headers(), signal: ctrl.signal });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body?.error?.code ?? 'error', body?.error?.message ?? res.statusText);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export interface DiscernResponse {
  discernment: Discernment;
  meta: { model: string; latencyMs: number; promptVersion: string };
}

export interface VerseResponse { id: string; reference: string; content: string; bibleId: number }
export interface BibleResponse {
  id: number; abbreviation: string; title: string; localizedTitle?: string | null;
  copyright?: string | null; promotionalContent?: string | null; publisherUrl?: string | null;
  languageTag?: string; deepLink?: string | null; books?: string[];
}
// `live` is true when the list came from YouVersion; false = keyless/offline fallback (BSB only).
export interface BibleListResponse { bibles: BibleResponse[]; live: boolean }
export interface Candidate { id: string; reference: string; text: string }
// Candidate ids are '+'-joined USFM ranges: 'EPH.4.26+EPH.4.27'.
export interface TruthRequest {
  struggle: Struggle; lie: string; candidateIds: string[]; truthQueries: string[]; stirredBy?: string[]; bibleId: number;
}
export interface TruthResponse { primary: string; backup: string; backups: string[]; why: string; pool: string[] }
export interface SyncRow { id: string; updatedAt?: number; deleted?: boolean; [k: string]: unknown }
export interface SyncPullResponse {
  now: number; available: boolean; profile: (Record<string, unknown> & { updatedAt?: number }) | null;
  battles: SyncRow[]; stones: SyncRow[]; allies: SyncRow[]; armory: SyncRow[]; watch: SyncRow[];
}
export interface SyncPushBody {
  profile?: Record<string, unknown> | null;
  upserts: Record<string, unknown[]>;
  deletes: { collection: string; id: string }[];
}
export interface SyncAck { ok: boolean; now: number; available: boolean }
export interface ComposeResponse { reflection: string; escapes: string[]; gentleReply?: string | null }

export const api = {
  discern: (text: string, tradition?: string, locale = 'en-US') =>
    req<DiscernResponse>('/discern', { method: 'POST', body: JSON.stringify({ text, tradition, locale }) }, 13000),

  truth: (body: TruthRequest) =>
    req<TruthResponse>('/truth', { method: 'POST', body: JSON.stringify(body) }, 14000),

  compose: (body: {
    struggle: Struggle; lie: string; verse: { reference: string; text: string };
    actions: { id: string; label: string }[]; needsGentleReply: boolean; context?: string; tradition?: string;
  }) => req<ComposeResponse>('/compose', { method: 'POST', body: JSON.stringify(body) }, 13000),

  async transcribe(blob: Blob, ext?: string): Promise<{ text: string }> {
    const form = new FormData();
    const e = ext ?? (blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm');
    form.append('file', blob, `cry.${e}`);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    try {
      const res = await fetch(apiUrl('/api/transcribe'), {
        method: 'POST',
        headers: { 'X-Install-Id': installId(), 'X-Client-Version': '1.0.0', 'X-Client-Platform': PLATFORM },
        body: form, signal: ctrl.signal,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(res.status, body?.error?.code ?? 'error', body?.error?.message ?? res.statusText);
      }
      return (await res.json()) as { text: string };
    } finally { clearTimeout(timer); }
  },

  async speak(text: string): Promise<Blob> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 35000);
    try {
      const res = await fetch(apiUrl('/api/speak'), {
        method: 'POST', headers: headers(), body: JSON.stringify({ text }), signal: ctrl.signal,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(res.status, body?.error?.code ?? 'error', body?.error?.message ?? res.statusText);
      }
      return await res.blob();
    } finally { clearTimeout(timer); }
  },

  insight: (candidates: { rule: string; numbers: Record<string, number>; labels: Record<string, string> }[]) =>
    req<{ sentences: string[] }>('/insight', { method: 'POST', body: JSON.stringify({ candidates }) }, 9000),

  verse: (bibleId: number, usfm: string) =>
    req<VerseResponse>(`/verse/${bibleId}/${usfm}`, { method: 'GET' }, 3000),

  bible: (bibleId: number) => req<BibleResponse>(`/bible/${bibleId}`, { method: 'GET' }, 4000),

  bibles: () => req<BibleListResponse>('/bibles', { method: 'GET' }, 6000),

  verseSearch: (q: string, bibleId: number) =>
    req<{ references: string[] }>(`/verse-search?q=${encodeURIComponent(q)}&bibleId=${bibleId}`, { method: 'GET' }, 3000),

  votd: (day: number) => req<{ day: number; passageId: string }>(`/votd?day=${day}`, { method: 'GET' }, 4000),

  // Per-install data sync (data/sync.ts). Keyed by X-Install-Id; no account.
  syncPull: (since: number) => req<SyncPullResponse>(`/me?since=${Math.max(0, Math.floor(since))}`, { method: 'GET' }, 20000),
  syncPush: (body: SyncPushBody) => req<SyncAck>('/me', { method: 'POST', body: JSON.stringify(body) }, 20000),
  syncWipe: () => req<SyncAck>('/me', { method: 'DELETE' }, 10000),

  pray: () => req<{ token: string; url: string; expiresAt: number }>('/pray', { method: 'POST' }, 5000),
  prayStatus: (token: string) => req<{ acks: number; expiresAt: number }>(`/pray/${token}`, { method: 'GET' }, 5000),
};

export type { ContextType, Front, Trigger };
