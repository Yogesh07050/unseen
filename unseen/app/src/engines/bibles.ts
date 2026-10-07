// Bible version catalogue (YouVersion Platform): which versions this build may
// show, and the attribution each one must carry whenever its text is displayed.
// This is public data, not personal, so it lives in localStorage rather than the
// sealed store — the picker and the attribution lines work offline and before
// the encryption key is open.
import { useEffect, useState } from 'react';
import { api, type BibleResponse } from '../ai/api';

export const BSB = 3034;

export interface BibleInfo {
  id: number;
  abbreviation: string;
  title: string;
  copyright: string;   // '' until the version's details have been fetched (list calls omit it)
  deepLink: string;
  books: string[];     // USFM book codes the version contains; empty when unknown
  publicDomain: boolean;
  fetchedAt?: number;  // set once the single-version details were fetched
}

export interface BibleCatalog { bibles: BibleInfo[]; live: boolean; fetchedAt: number }

const BSB_INFO: BibleInfo = {
  id: BSB, abbreviation: 'BSB', title: 'Berean Standard Bible', copyright: 'Public Domain',
  deepLink: `https://www.bible.com/versions/${BSB}`, books: [], publicDomain: true,
};
const FALLBACK: BibleCatalog = { bibles: [BSB_INFO], live: false, fetchedAt: 0 };
const CATALOG_KEY = 'unseen-bibles';
const INFO_KEY = 'unseen-bible-info';
const CATALOG_TTL = 6 * 3600_000;
const INFO_TTL = 7 * 86400_000;
// Public-domain versions whose *list* entry carries no notice (the single-version
// call does): ASV 1901, World English Bible, Catholic Public Domain Version.
const PUBLIC_DOMAIN_IDS = new Set([BSB, 12, 206, 42]);

function isPublicDomain(b: BibleResponse): boolean {
  const s = `${b.copyright ?? ''} ${b.promotionalContent ?? ''}`.toLowerCase();
  return PUBLIC_DOMAIN_IDS.has(b.id) || s.includes('public domain');
}

function toInfo(b: BibleResponse, fetchedAt?: number): BibleInfo {
  return {
    id: b.id, abbreviation: b.abbreviation, title: b.title,
    copyright: (b.copyright ?? '').trim(),
    deepLink: b.deepLink ?? `https://www.bible.com/versions/${b.id}`,
    books: b.books ?? [], publicDomain: isPublicDomain(b), fetchedAt,
  };
}

function readJson<T>(key: string): T | null {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : null; } catch { return null; }
}
function writeJson(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage blocked or full: memory copy still works */ }
}

// ---- the licensed list ----
let catalog: BibleCatalog | null = null;
let inflight: Promise<BibleCatalog> | null = null;

export function cachedCatalog(): BibleCatalog {
  if (!catalog) catalog = readJson<BibleCatalog>(CATALOG_KEY) ?? FALLBACK;
  return catalog;
}

export async function loadBibles(force = false): Promise<BibleCatalog> {
  const have = cachedCatalog();
  if (!force && have.fetchedAt && Date.now() - have.fetchedAt < CATALOG_TTL) return have;
  if (!inflight) {
    inflight = api.bibles()
      .then((r) => {
        const next: BibleCatalog = { bibles: r.bibles.map((b) => toInfo(b)), live: r.live, fetchedAt: Date.now() };
        catalog = next;
        writeJson(CATALOG_KEY, next);
        return next;
      })
      .catch(() => have)
      .finally(() => { inflight = null; });
  }
  return inflight;
}

// ---- per-version details (the copyright notice only comes on the single-version call) ----
let infos: Record<number, BibleInfo> | null = null;
function infoMap(): Record<number, BibleInfo> {
  if (!infos) infos = readJson<Record<number, BibleInfo>>(INFO_KEY) ?? {};
  return infos;
}

// Synchronous best effort: fetched details → catalogue entry → BSB → a bare placeholder.
export function bibleInfo(id: number): BibleInfo {
  return infoMap()[id]
    ?? cachedCatalog().bibles.find((b) => b.id === id)
    ?? (id === BSB ? BSB_INFO : {
      id, abbreviation: `#${id}`, title: `Bible ${id}`, copyright: '',
      deepLink: `https://www.bible.com/versions/${id}`, books: [], publicDomain: false,
    });
}

const infoInflight = new Map<number, Promise<BibleInfo>>();
export async function ensureBibleInfo(id: number): Promise<BibleInfo> {
  const known = infoMap()[id];
  if (known?.fetchedAt && Date.now() - known.fetchedAt < INFO_TTL) return known;
  let p = infoInflight.get(id);
  if (!p) {
    p = api.bible(id)
      .then((b) => { const info = toInfo(b, Date.now()); infoMap()[id] = info; writeJson(INFO_KEY, infoMap()); return info; })
      .catch(() => bibleInfo(id))
      .finally(() => { infoInflight.delete(id); });
    infoInflight.set(id, p);
  }
  return p;
}

// The notice shown under any displayed text of this version.
export function attribution(info: BibleInfo): string {
  if (info.copyright) return info.copyright;
  return info.publicDomain ? 'Public domain' : `${info.title} · used under licence via the YouVersion Platform`;
}

export function hasOldTestament(info: BibleInfo): boolean {
  return info.books.length === 0 || info.books.includes('GEN');
}

// ---- hooks ----
export function useBibles(): { catalog: BibleCatalog; loading: boolean } {
  const [state, setState] = useState<BibleCatalog>(cachedCatalog);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let on = true;
    loadBibles().then((c) => { if (on) { setState(c); setLoading(false); } });
    return () => { on = false; };
  }, []);
  return { catalog: state, loading };
}

export function useBibleInfo(id: number): BibleInfo {
  const [info, setInfo] = useState<BibleInfo>(() => bibleInfo(id));
  useEffect(() => {
    let on = true;
    setInfo(bibleInfo(id));
    ensureBibleInfo(id).then((i) => { if (on) setInfo(i); });
    return () => { on = false; };
  }, [id]);
  return info;
}
