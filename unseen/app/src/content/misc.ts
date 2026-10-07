// Morning Armor steps (§11 appendix D), crisis resources (appendix E), fallback keywords (§6.8).
import type { Struggle } from '../types';

export interface ArmorStep {
  piece: string; usfm: string[]; prompt: string;
  input: 'pick_lie' | 'none' | 'optional_note' | 'approve_plan' | 'choose' | 'speak_verse' | 'pick_ally';
  options?: string[];
}

export const MORNING_ARMOR: ArmorStep[] = [
  { piece: 'Belt of truth', usfm: ['EPH.6.14'], prompt: 'Name the lie you expect today', input: 'pick_lie' },
  { piece: 'Breastplate of righteousness', usfm: ['ROM.8.1'], prompt: 'Receive grace for yesterday; your standing is not earned by performance', input: 'none' },
  { piece: 'Feet ready with the gospel of peace', usfm: ['EPH.6.15'], prompt: 'Choose one step toward peace with someone', input: 'optional_note' },
  { piece: 'Shield of faith', usfm: ['EPH.6.16'], prompt: "Arm tonight's shields", input: 'approve_plan' },
  { piece: 'Helmet of salvation', usfm: ['EPH.6.17'], prompt: 'Say who you are in Christ', input: 'choose', options: ['Forgiven (1 John 1:9)', 'Free (Galatians 5:1)', 'Not condemned (Romans 8:1)'] },
  { piece: 'Sword of the Spirit', usfm: ['EPH.6.17'], prompt: 'Speak today’s verse aloud once', input: 'speak_verse' },
  { piece: 'Prayer in the Spirit', usfm: ['EPH.6.18'], prompt: 'Pray for one ally by name', input: 'pick_ally' },
];

export interface CrisisResource {
  line: { label: string; sub?: string; tel?: string; sms?: string; url?: string };
  emergency: { label: string; tel?: string };
}

export const CRISIS_RESOURCES: Record<string, CrisisResource> = {
  US: { line: { label: 'Call or text 988', sub: 'Suicide and Crisis Lifeline, US', tel: '988', sms: '988' }, emergency: { label: 'In danger now? Call 911', tel: '911' } },
  CA: { line: { label: 'Call or text 988', sub: 'Suicide Crisis Helpline, Canada', tel: '988', sms: '988' }, emergency: { label: 'In danger now? Call 911', tel: '911' } },
  GB: { line: { label: 'Call Samaritans on 116 123', sub: 'Samaritans, UK and Ireland', tel: '116123' }, emergency: { label: 'In danger now? Call 999', tel: '999' } },
  IE: { line: { label: 'Call Samaritans on 116 123', sub: 'Samaritans, UK and Ireland', tel: '116123' }, emergency: { label: 'In danger now? Call 112', tel: '112' } },
  IN: { line: { label: 'Call Tele-MANAS on 14416', sub: 'National mental health helpline, India', tel: '14416' }, emergency: { label: 'In danger now? Call 112', tel: '112' } },
  AU: { line: { label: 'Call Lifeline on 13 11 14', sub: 'Lifeline, Australia', tel: '131114' }, emergency: { label: 'In danger now? Call 000', tel: '000' } },
  default: { line: { label: 'See crisis lines near you', url: 'https://findahelpline.com' }, emergency: { label: 'In danger now? Call your local emergency number' } },
};

export const CLASSIFIER_STEMS: Record<Exclude<Struggle, 'other' | 'not_a_temptation'>, string[]> = {
  anger: ['angry', 'furious', 'rage', 'hate', 'yell', 'revenge', 'cruel', 'insult', 'humiliat', 'fire back', 'mad'],
  fear: ['anxious', 'afraid', 'scared', 'worr', 'panic', 'fall apart', 'nervous', 'lose my job'],
  sexual: ['lust', 'porn', 'sex', 'explicit', 'hook up', 'nudes', "shouldn"],
  escapism: ['scroll', 'binge', 'numb', 'gaming', 'five more minutes', 'wasting', 'keep watching'],
  shame: ['worthless', 'too far gone', 'failure', 'failed', 'ashamed', 'disgusting', 'hopeless', 'tired of me'],
  envy: ['jealous', 'envy', 'better than me', 'unfair', 'compare', 'perfect', 'except me'],
  compulsion: ['gambl', 'bet', 'drink', 'spend', 'shopping', 'vape', 'smoke', 'cope', 'one more'],
  deceit: ['lie to', 'cover up', 'gossip', 'pretend', 'hide it'],
  pride: ['do not need anyone', "don't need anyone", 'show them', 'better than them', 'by myself'],
};
