// Typed client for the same-origin proxy (§12). Every call carries X-Install-Id.
import type { ContextType, Discernment, Front, Struggle, Trigger } from '../types';

const INSTALL_KEY = 'unseen-install-id';

function installId(): string {
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
  };
}

async function req<T>(path: string, init?: RequestInit, timeoutMs = 10000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`/api${path}`, { ...init, headers: headers(), signal: ctrl.signal });
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
export interface BibleResponse { id: number; abbreviation: string; title: string; copyright: string }
export interface Candidate { id: string; reference: string; text: string }
export interface TruthResponse { primary: string; backup: string; why: string }
export interface ComposeResponse { reflection: string; escapes: string[]; gentleReply?: string | null }

export const api = {
  discern: (text: string, tradition?: string, locale = 'en-US') =>
    req<DiscernResponse>('/discern', { method: 'POST', body: JSON.stringify({ text, tradition, locale }) }, 13000),

  truth: (struggle: Struggle, lie: string, candidates: Candidate[]) =>
    req<TruthResponse>('/truth', { method: 'POST', body: JSON.stringify({ struggle, lie, candidates }) }, 11000),

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
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'X-Install-Id': installId(), 'X-Client-Version': '1.0.0' },
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
      const res = await fetch('/api/speak', {
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

  bible: (bibleId: number) => req<BibleResponse>(`/bible/${bibleId}`, { method: 'GET' }, 3000),

  verseSearch: (q: string, bibleId: number) =>
    req<{ references: string[] }>(`/verse-search?q=${encodeURIComponent(q)}&bibleId=${bibleId}`, { method: 'GET' }, 3000),

  pray: () => req<{ token: string; url: string; expiresAt: number }>('/pray', { method: 'POST' }, 5000),
  prayStatus: (token: string) => req<{ acks: number; expiresAt: number }>(`/pray/${token}`, { method: 'GET' }, 5000),
};

export type { ContextType, Front, Trigger };
