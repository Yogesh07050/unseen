// Redaction (§6.3). Replaces identifying details; keeps relationship words.
const ALLOW = new Set([
  'God', 'Jesus', 'Christ', 'Lord', 'Holy', 'Spirit', 'Father', 'Bible', 'Scripture', 'I',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
  'Genesis', 'Exodus', 'Psalm', 'Psalms', 'Proverbs', 'Matthew', 'Mark', 'Luke', 'John',
  'Romans', 'Ephesians', 'Philippians', 'James', 'Peter', 'Revelation', 'Corinthians',
]);

const STREET = /\b\d+\s+\w+\s+(St|Street|Ave|Avenue|Rd|Road|Blvd|Ln|Lane|Dr|Drive|Ct|Court)\b/g;

export function redact(text: string, knownNames: string[] = []): { text: string; replaced: number } {
  let replaced = 0;
  const count = (s: string) => { replaced += 1; return s; };
  let out = text;
  out = out.replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, () => count('[email]'));
  out = out.replace(/\bhttps?:\/\/\S+/g, () => count('[link]'));
  out = out.replace(/\+?\d[\d().\-\s]{6,}\d/g, () => count('[phone]'));
  out = out.replace(/@\w+/g, () => count('[handle]'));
  out = out.replace(STREET, () => count('[place]'));
  out = out.replace(/\b\d{4,}\b/g, () => count('[number]'));
  for (const name of knownNames) {
    if (!name) continue;
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    out = out.replace(re, () => count('[name]'));
  }
  // Capitalised words that are not sentence-initial and not allowlisted.
  out = out.replace(/(\S)\s+([A-Z][a-z]+)/g, (_m, before: string, word: string) => {
    if (/[.!?]/.test(before)) return `${before} ${word}`;
    if (ALLOW.has(word)) return `${before} ${word}`;
    replaced += 1;
    return `${before} [name]`;
  });
  return { text: out, replaced };
}
