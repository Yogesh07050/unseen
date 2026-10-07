import type { SafetyFlag } from '../types';

// Representative patterns (§6.2). The ministry lead / a clinician review the full list before launch.
const SAFETY_LEXICON: Record<Exclude<SafetyFlag, 'none'>, RegExp[]> = {
  self_harm: [
    /\b(kill|hurt|harm|cut)\s+myself\b/, /\bsuicid\w*/, /\bend (it all|my life)\b/,
    /\btake my (own )?life\b/, /\b(want|wish) to (die|be dead)\b/,
    /\bdo not want to (live|be alive|wake up)\b/, /\bbetter off (dead|without me)\b/,
  ],
  harm_to_others: [
    /\b(kill|stab|shoot|strangle)\s+(him|her|them|my \w+|someone)\b/,
    /\b(hurt|hit|beat)\s+(my )?(kid|kids|child|son|daughter|wife|husband|baby)\b/,
  ],
  abuse: [
    /\b(he|she|they|my \w+)\s+(hits|beats|chokes|rapes|abuses)\s+me\b/,
    /\b(was|am|being|got)\s+(abused|assaulted|raped|molested)\b/, /\bafraid to go home\b/,
  ],
  medical: [/\boverdos\w*/, /\btook too many (pills|tablets)\b/, /\bcannot breathe\b/, /\bchest pain\b/, /\bseizure\b/],
  eating_disorder: [/\bpurg(e|ing)\b/, /\bmake myself (throw up|vomit|sick)\b/, /\bstarv(e|ing) myself\b/],
  psychosis_signs: [/\bvoices? (are )?(telling|commanding|ordering) me\b/, /\bhearing voices\b/],
};

const ORDER: Exclude<SafetyFlag, 'none'>[] = [
  'self_harm', 'harm_to_others', 'abuse', 'medical', 'eating_disorder', 'psychosis_signs',
];

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'").replace(/[“”]/g, '"')
    .replace(/\bdon't\b/g, 'do not').replace(/\bcan't\b/g, 'cannot')
    .replace(/\bi'm\b/g, 'i am').replace(/\bwanna\b/g, 'want to')
    .replace(/\bwon't\b/g, 'will not').replace(/\s+/g, ' ')
    .trim();
}

export function screen(text: string): { flag: SafetyFlag; match?: string } {
  const t = normalise(text);
  for (const flag of ORDER) {
    for (const re of SAFETY_LEXICON[flag]) {
      const m = t.match(re);
      if (m) return { flag, match: m[0] };
    }
  }
  return { flag: 'none' };
}
