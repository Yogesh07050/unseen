import { api } from '../ai/api';
import { getCachedVerse, putCachedVerse } from '../data/repos';
import type { Passage, VerifiedVerse } from '../types';
import { verify } from './verify';

async function fetchVerse(bibleId: number, usfm: string): Promise<{ reference: string; content: string }> {
  const key = `${bibleId}:${usfm}`;
  const cached = await getCachedVerse(key);
  if (cached) return { reference: cached.reference, content: cached.content };
  const v = await api.verse(bibleId, usfm);
  if (bibleId === 3034) await putCachedVerse(key, v.reference, v.content);
  return { reference: v.reference, content: v.content };
}

function joinReference(refs: string[]): string {
  if (refs.length === 1) return refs[0];
  // same-chapter range -> "Ephesians 4:26-27"
  const first = refs[0];
  const last = refs[refs.length - 1];
  const fm = first.match(/^(.*?)(\d+):(\d+)$/);
  const lm = last.match(/^(.*?)(\d+):(\d+)$/);
  if (fm && lm && fm[1] === lm[1] && fm[2] === lm[2]) return `${fm[1]}${fm[2]}:${fm[3]}-${lm[3]}`;
  return `${first}–${last}`;
}

export async function getPassage(bibleId: number, usfm: string[]): Promise<Passage> {
  const parts = await Promise.all(usfm.map((u) => fetchVerse(bibleId, u)));
  const text = parts.map((p) => p.content.trim()).join(' ');
  const reference = joinReference(parts.map((p) => p.reference));
  return { bibleId, usfm, reference, text, copyright: 'Berean Standard Bible (public domain)' };
}

// Fetch and verify a passage. Returns null only if the text cannot be verified.
export async function getVerified(bibleId: number, usfm: string[]): Promise<VerifiedVerse | null> {
  const p = await getPassage(bibleId, usfm);
  const apiTexts = p.text.split(' '); // not used; verify compares against per-verse texts
  // Re-fetch per-verse texts for the byte-for-byte check.
  const perVerse = await Promise.all(usfm.map((u) => fetchVerse(bibleId, u).then((v) => v.content)));
  void apiTexts;
  return verify(p, perVerse);
}
