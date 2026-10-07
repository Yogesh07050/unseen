import { api } from '../ai/api';
import { dayOfYear } from '../analytics';
import { getCachedVerse, putCachedVerse } from '../data/repos';
import type { Passage, VerifiedVerse } from '../types';
import { BSB, attribution, bibleInfo, ensureBibleInfo } from './bibles';
import { verify } from './verify';

type Part = { reference: string; content: string };
// Licensed (non-BSB) text is re-fetched after a week; the public-domain BSB is kept for good.
const LICENSED_TTL = 7 * 86400_000;

async function fetchVerse(bibleId: number, usfm: string): Promise<Part> {
  const key = `${bibleId}:${usfm}`;
  const cached = await getCachedVerse(key);
  const fresh = !!cached && (bibleId === BSB || !cached.ts || Date.now() - cached.ts < LICENSED_TTL);
  if (cached && fresh) return { reference: cached.reference, content: cached.content };
  try {
    const v = await api.verse(bibleId, usfm);
    await putCachedVerse(key, v.reference, v.content);
    return { reference: v.reference, content: v.content };
  } catch (e) {
    if (cached) return { reference: cached.reference, content: cached.content }; // stale beats nothing when offline
    throw e;
  }
}

// Every verse of a passage from one version. If the chosen version cannot serve
// it (not licensed here, not in that version's canon, upstream down), the
// public-domain BSB stands in and the passage is labelled as the BSB — one
// version's text is never shown under another version's name.
async function fetchParts(bibleId: number, usfm: string[]): Promise<{ bibleId: number; parts: Part[] }> {
  try {
    return { bibleId, parts: await Promise.all(usfm.map((u) => fetchVerse(bibleId, u))) };
  } catch (e) {
    if (bibleId === BSB) throw e;
    return { bibleId: BSB, parts: await Promise.all(usfm.map((u) => fetchVerse(BSB, u))) };
  }
}

function joinReference(refs: string[]): string {
  if (refs.length === 0) return '';
  if (refs.length === 1) return refs[0];
  // same-chapter range -> "Ephesians 4:26-27"
  const first = refs[0];
  const last = refs[refs.length - 1];
  const fm = first.match(/^(.*?)(\d+):(\d+)$/);
  const lm = last.match(/^(.*?)(\d+):(\d+)$/);
  if (fm && lm && fm[1] === lm[1] && fm[2] === lm[2]) return `${fm[1]}${fm[2]}:${fm[3]}-${lm[3]}`;
  return `${first}–${last}`;
}

async function buildPassage(bibleId: number, usfm: string[], parts: Part[]): Promise<Passage> {
  // Attribution for the version that actually served the text (cached after the first call).
  const info = await ensureBibleInfo(bibleId).catch(() => bibleInfo(bibleId));
  return {
    bibleId, usfm,
    reference: joinReference(parts.map((p) => p.reference)),
    text: parts.map((p) => p.content.trim()).join(' '),
    version: info.abbreviation, versionTitle: info.title, copyright: attribution(info),
  };
}

export async function getPassage(bibleId: number, usfm: string[]): Promise<Passage> {
  const served = await fetchParts(bibleId, usfm);
  return buildPassage(served.bibleId, usfm, served.parts);
}

// Fetch and verify a passage. Returns null only if the text cannot be verified.
export async function getVerified(bibleId: number, usfm: string[]): Promise<VerifiedVerse | null> {
  const served = await fetchParts(bibleId, usfm);
  const p = await buildPassage(served.bibleId, usfm, served.parts);
  // Byte-for-byte check of the displayed text against the per-verse API responses.
  return verify(p, served.parts.map((x) => x.content));
}

// 'PHP.4.6-7' -> ['PHP.4.6', 'PHP.4.7']; 'JHN.3.16' -> ['JHN.3.16']; 'EPH.4.26+EPH.4.27' -> both.
export function expandPassageId(id: string): string[] {
  if (id.includes('+')) return id.split('+').map((s) => s.trim()).filter(Boolean);
  const m = id.match(/^([1-3A-Z]{3})\.(\d{1,3})\.(\d{1,3})(?:-(\d{1,3}))?$/);
  if (!m) return [id];
  const [, book, ch, from, to] = m;
  const a = Number(from), b = to ? Number(to) : a;
  const out: string[] = [];
  for (let v = a; v <= Math.min(b, a + 11); v++) out.push(`${book}.${ch}.${v}`);
  return out;
}

// Verse of the day: YouVersion's when the server can reach it, else the fixed rotation.
export async function verseOfTheDay(bibleId: number): Promise<VerifiedVerse | null> {
  try {
    const r = await api.votd(dayOfYear());
    const v = await getVerified(bibleId, expandPassageId(r.passageId));
    if (v) return v;
  } catch { /* fall through */ }
  const pool = ['PHP.4.6', 'ISA.41.10', 'ROM.8.1', 'PSA.119.11', '1CO.10.13', 'MIC.7.8', 'PSA.34.18'];
  return getVerified(bibleId, [pool[dayOfYear() % pool.length]]);
}
