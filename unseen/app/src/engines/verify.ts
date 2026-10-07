import type { Passage, VerifiedVerse } from '../types';
import { segment } from './segment';

// The verifier is the only producer of VerifiedVerse (§6.5).
export function verify(p: Passage, apiTexts: string[]): VerifiedVerse | null {
  if (apiTexts.length === 0 || apiTexts.some((t) => !t || !t.trim())) return null;
  const joined = apiTexts.map((t) => t.trim()).join(' ');
  if (p.text !== joined) return null;
  const phrases = segment(p.text);
  if (phrases.join(' ').replace(/\s+/g, ' ').trim() !== p.text.replace(/\s+/g, ' ').trim()) return null;
  return { ...p, phrases, __verified: true };
}

const WORD = /[A-Za-z]+/g;

export function checkReflection(reflection: string, verse: VerifiedVerse): boolean {
  if (/["“”]/.test(reflection)) return false;
  const vWords = (verse.text.toLowerCase().match(WORD) ?? []);
  const rWords = (reflection.toLowerCase().match(WORD) ?? []);
  // No run of 6+ consecutive words copied from the verse.
  for (let i = 0; i + 6 <= rWords.length; i++) {
    const run = rWords.slice(i, i + 6).join(' ');
    if (vWords.join(' ').includes(run)) return false;
  }
  return true;
}

// Fixed Scripture fragments must be substrings of the fetched verse (§6.5).
function loose(s: string): string {
  return s.toLowerCase().replace(/[“”"’']/g, '').replace(/[.,;:!?]+$/g, '').replace(/\s+/g, ' ').trim();
}
export function fragmentOk(fragment: string, verseText: string): boolean {
  return loose(verseText).includes(loose(fragment));
}
