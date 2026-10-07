import type { Struggle } from '../types';

export interface TruthEntry {
  id: string; struggle: Struggle; lie: string;
  truth: string[]; support: string[]; escapes: string[];
  reviewedBy: string | null; reviewedAt: string | null;
}

export const BIBLE_ID = 3034;

export const TRUTH_ENTRIES: TruthEntry[] = [
  { id: 'anger-1', struggle: 'anger', lie: 'He deserves it.', truth: ['EPH.4.26', 'EPH.4.27'], support: ['PRO.15.1'], escapes: ['gentle_reply', 'wait_10', 'ask_allies_pray'], reviewedBy: null, reviewedAt: null },
  { id: 'anger-2', struggle: 'anger', lie: 'I have to win this argument.', truth: ['JAS.1.19'], support: ['PRO.15.1'], escapes: ['wait_10', 'gentle_reply', 'walk_10'], reviewedBy: null, reviewedAt: null },
  { id: 'fear-1', struggle: 'fear', lie: "It's all going to fall apart.", truth: ['PHP.4.6', 'PHP.4.7'], support: ['ISA.41.10'], escapes: ['breath_prayer', 'text_ally', 'walk_10'], reviewedBy: null, reviewedAt: null },
  { id: 'fear-2', struggle: 'fear', lie: "You're on your own.", truth: ['ISA.41.10'], support: ['HEB.13.5'], escapes: ['text_ally', 'breath_prayer', 'worship_song'], reviewedBy: null, reviewedAt: null },
  { id: 'sexual-1', struggle: 'sexual', lie: 'No one will know.', truth: ['1CO.10.13'], support: ['GAL.5.16'], escapes: ['leave_room', 'phone_away', 'call_sponsor'], reviewedBy: null, reviewedAt: null },
  { id: 'sexual-2', struggle: 'sexual', lie: "Just this once won't matter.", truth: ['JAS.1.14'], support: ['ROM.6.12'], escapes: ['call_sponsor', 'leave_room', 'ask_allies_pray'], reviewedBy: null, reviewedAt: null },
  { id: 'escapism-1', struggle: 'escapism', lie: 'Just five more minutes.', truth: ['EPH.5.15', 'EPH.5.16'], support: ['PSA.90.12'], escapes: ['set_stop', 'phone_away', 'walk_10'], reviewedBy: null, reviewedAt: null },
  { id: 'shame-1', struggle: 'shame', lie: "You're too far gone.", truth: ['ROM.8.1'], support: ['1JN.1.9'], escapes: ['rise_again', 'tell_ally', 'confession_guide'], reviewedBy: null, reviewedAt: null },
  { id: 'shame-2', struggle: 'shame', lie: 'God is tired of you.', truth: ['LAM.3.22', 'LAM.3.23'], support: ['MIC.7.8'], escapes: ['confession_guide', 'tell_ally', 'worship_song'], reviewedBy: null, reviewedAt: null },
  { id: 'envy-1', struggle: 'envy', lie: 'Their life is better than yours.', truth: ['GAL.6.4'], support: ['PHP.4.11', 'PHP.4.12', 'PHP.4.13'], escapes: ['three_gifts', 'walk_10', 'worship_song'], reviewedBy: null, reviewedAt: null },
  { id: 'compulsion-1', struggle: 'compulsion', lie: 'You need this to cope.', truth: ['GAL.5.1'], support: ['2CO.12.9'], escapes: ['call_sponsor', 'text_ally', 'leave_room'], reviewedBy: null, reviewedAt: null },
  { id: 'deceit-1', struggle: 'deceit', lie: 'A small lie protects everyone.', truth: ['EPH.4.25'], support: ['PRO.12.22'], escapes: ['true_sentence', 'pause_before_reply', 'ask_allies_pray'], reviewedBy: null, reviewedAt: null },
  { id: 'pride-1', struggle: 'pride', lie: "You don't need anyone.", truth: ['JAS.4.6'], support: ['ECC.4.9', 'ECC.4.10'], escapes: ['ask_help', 'text_ally', 'breath_prayer'], reviewedBy: null, reviewedAt: null },
];

export const DEFAULTS: Record<string, string[]> = {
  anger: ['EPH.4.26', 'EPH.4.27'], fear: ['PHP.4.6', 'PHP.4.7'], sexual: ['1CO.10.13'],
  escapism: ['EPH.5.15', 'EPH.5.16'], shame: ['ROM.8.1'], envy: ['GAL.6.4'],
  compulsion: ['GAL.5.1'], deceit: ['EPH.4.25'], pride: ['JAS.4.6'], other: ['1CO.10.13'],
};

export const FIXED = {
  onboarding: ['2KI.6.17'], cryOut: ['ROM.8.26'], peace: ['MAT.4.11'], escapeLine: ['1CO.10.13'],
  allies: ['EXO.17.12'], riseAgain: [['MIC.7.8'], ['1JN.1.9']], ebenezer: ['1SA.7.12'],
  schemes: ['2CO.2.11'], watch: ['LUK.4.13'], armory: ['PSA.119.11'], reel: ['REV.12.11'],
  harbor: ['PSA.34.18'], armor: ['EPH.6.13', 'EPH.6.14', 'EPH.6.15', 'EPH.6.16', 'EPH.6.17', 'EPH.6.18'],
};

// Fixed Scripture fragments shown in UI copy; verified as substrings at start-up (§6.5).
export const FIXED_FRAGMENTS: Record<string, { usfm: string; text: string }> = {
  cryOut: { usfm: 'ROM.8.26', text: 'the Spirit helps us in our weakness' },
  peace: { usfm: 'MAT.4.11', text: 'Then the devil left Him, and angels came and ministered to Him.' },
  escapeLine: { usfm: '1CO.10.13', text: 'He will also provide an escape' },
  shield: { usfm: '1CO.10.13', text: 'And God is faithful; He will not let you be tempted beyond what you can bear.' },
  onboarding: { usfm: '2KI.6.17', text: 'Then Elisha prayed, “O LORD, please open his eyes that he may see.”' },
  ebenezer: { usfm: '1SA.7.12', text: 'Thus far the LORD has helped us.' },
  schemes: { usfm: '2CO.2.11', text: 'For we are not unaware of his schemes.' },
};

export function allFixedUsfm(): string[] {
  const out = new Set<string>();
  Object.values(DEFAULTS).flat().forEach((u) => out.add(u));
  TRUTH_ENTRIES.forEach((e) => [...e.truth, ...e.support].forEach((u) => out.add(u)));
  Object.values(FIXED).flat(2).forEach((u) => out.add(u as string));
  return [...out];
}
