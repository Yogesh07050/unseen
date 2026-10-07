import type { Struggle } from '../types';

export type ActionKind = 'compose' | 'timer' | 'ally' | 'prayer' | 'link' | 'note';

export interface ActionDef {
  id: string; label: string; kind: ActionKind; minutes?: number;
  struggles: (Struggle | '*')[]; note?: string;
}

export const ACTIONS: ActionDef[] = [
  { id: 'gentle_reply', label: 'Draft a gentle reply to {person}', kind: 'compose', struggles: ['anger'], note: 'A gentle answer turns away wrath. Proverbs 15:1' },
  { id: 'wait_10', label: 'Wait ten minutes before replying', kind: 'timer', minutes: 10, struggles: ['anger', 'deceit'] },
  { id: 'ask_allies_pray', label: 'Ask {allies} to pray', kind: 'ally', struggles: ['*'] },
  { id: 'walk_10', label: 'Walk outside for 10 minutes', kind: 'timer', minutes: 10, struggles: ['*'] },
  { id: 'breath_prayer', label: 'Pray one breath prayer, then name three requests', kind: 'prayer', struggles: ['fear', 'pride'] },
  { id: 'text_ally', label: 'Text {ally}', kind: 'ally', struggles: ['fear', 'compulsion', 'pride'] },
  { id: 'worship_song', label: 'Play a worship song', kind: 'link', struggles: ['*'] },
  { id: 'leave_room', label: 'Leave the room', kind: 'timer', minutes: 5, struggles: ['sexual', 'compulsion'] },
  { id: 'phone_away', label: 'Put your phone to charge in another room', kind: 'timer', minutes: 15, struggles: ['sexual', 'escapism'] },
  { id: 'call_sponsor', label: 'Call {sponsor}', kind: 'ally', struggles: ['sexual', 'compulsion'] },
  { id: 'set_stop', label: 'Set a stop and stand up', kind: 'timer', minutes: 1, struggles: ['escapism'] },
  { id: 'rise_again', label: 'Rise again, then tell an ally', kind: 'prayer', struggles: ['shame'] },
  { id: 'tell_ally', label: "Tell {ally} how you're doing", kind: 'ally', struggles: ['shame'] },
  { id: 'confession_guide', label: 'Pray the confession guide', kind: 'prayer', struggles: ['shame'] },
  { id: 'three_gifts', label: 'Name three gifts from today', kind: 'note', struggles: ['envy'] },
  { id: 'true_sentence', label: 'Say the true sentence out loud first', kind: 'note', struggles: ['deceit'] },
  { id: 'pause_before_reply', label: 'Pause before you answer', kind: 'timer', minutes: 2, struggles: ['deceit', 'anger'] },
  { id: 'ask_help', label: 'Ask someone for help today', kind: 'ally', struggles: ['pride'] },
];

export const ACTION_BY_ID = Object.fromEntries(ACTIONS.map((a) => [a.id, a]));
