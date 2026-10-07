import { archetypeFor } from '../content/archetypes';
import { DEFAULTS, TRUTH_ENTRIES } from '../content/truthIndex';
import { recompute, localDate } from '../battle/useBattle';
import { saveBattle, saveStone } from '../data/repos';
import type { Battle, Outcome, Stone, Struggle, Trigger, VerseRef } from '../types';

const BSB = 3034;
function verseFor(struggle: Struggle): VerseRef {
  const entry = TRUTH_ENTRIES.find((e) => e.struggle === struggle);
  const usfm = entry?.truth ?? DEFAULTS[struggle] ?? DEFAULTS.other;
  const refNames: Record<string, string> = {
    'EPH.4.26': 'Ephesians 4:26-27', 'PHP.4.6': 'Philippians 4:6-7', 'EPH.5.15': 'Ephesians 5:15-16',
    'ROM.8.1': 'Romans 8:1', 'GAL.6.4': 'Galatians 6:4', 'GAL.5.1': 'Galatians 5:1',
    '1CO.10.13': '1 Corinthians 10:13', 'EPH.4.25': 'Ephesians 4:25', 'JAS.4.6': 'James 4:6',
  };
  return { bibleId: BSB, usfm, reference: refNames[usfm[0]] ?? usfm[0] };
}

// day: 0=Sun..6=Sat; returns a Date `weeksAgo` weeks ago on that weekday at the given hour.
function dateFor(weeksAgo: number, weekday: number, hour: number): Date {
  const d = new Date();
  d.setHours(hour, Math.floor(Math.random() * 50), 0, 0);
  const delta = (d.getDay() - weekday + 7) % 7;
  d.setDate(d.getDate() - delta - weeksAgo * 7);
  return d;
}

interface Plan { weekday: number; hour: number; struggle: Struggle; lie: string; triggers: Trigger[]; context: Battle['contextType']; weeks: number[]; outcomes: Outcome[] }

const PLANS: Plan[] = [
  { weekday: 0, hour: 20, struggle: 'anger', lie: 'He deserves it.', triggers: ['hurt', 'conflict', 'tired'], context: 'family', weeks: [0, 1, 2, 3, 5, 7], outcomes: ['stood', 'stood', 'fell', 'stood', 'stood', 'stood'] },
  { weekday: 5, hour: 22, struggle: 'escapism', lie: 'Just five more minutes.', triggers: ['bored', 'late_night'], context: 'online', weeks: [0, 1, 2, 4, 6], outcomes: ['stood', 'fell', 'stood', 'stood', 'stood'] },
  { weekday: 3, hour: 22, struggle: 'fear', lie: "It's all going to fall apart.", triggers: ['stressed', 'tired'], context: 'work', weeks: [0, 2, 4, 6], outcomes: ['stood', 'stood', 'stood', 'stood'] },
];

const SCATTER: { struggle: Struggle; lie: string; context: Battle['contextType']; triggers: Trigger[] }[] = [
  { struggle: 'shame', lie: "You're too far gone.", context: 'home_alone', triggers: ['tired', 'alone'] },
  { struggle: 'envy', lie: 'Their life is better than yours.', context: 'social', triggers: ['online'] },
  { struggle: 'pride', lie: "You don't need anyone.", context: 'other', triggers: ['conflict'] },
  { struggle: 'compulsion', lie: 'You need this to cope.', context: 'other', triggers: ['stressed'] },
];

function mkBattle(d: Date, struggle: Struggle, lie: string, triggers: Trigger[], context: Battle['contextType'], outcome: Outcome): Battle {
  return {
    id: crypto.randomUUID(), startedAt: d.getTime(), endedAt: d.getTime() + 60000,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, channel: 'voice', struggle,
    archetype: archetypeFor(struggle), lie, lieClusterId: `${struggle}:${lie.toLowerCase()}`, stirredBy: [],
    triggers, contextType: context, front: 'flesh', intensity: 6 + Math.floor(Math.random() * 3),
    verse: verseFor(struggle), strikes: 3, outcome, secondsToPeace: 40 + Math.floor(Math.random() * 30),
    allyAcks: 0, offline: false, promptVersion: 'discern@1', demo: true,
  };
}

export async function loadDemoData() {
  const battles: Battle[] = [];
  for (const p of PLANS) {
    p.weeks.forEach((w, i) => {
      battles.push(mkBattle(dateFor(w, p.weekday, p.hour), p.struggle, p.lie, p.triggers, p.context, p.outcomes[i] ?? 'stood'));
    });
  }
  // a handful of scattered battles
  for (let i = 0; i < SCATTER.length; i++) {
    const s = SCATTER[i];
    battles.push(mkBattle(dateFor(i + 1, (i * 2 + 1) % 7, 21), s.struggle, s.lie, s.triggers, s.context, i === 2 ? 'fell' : 'stood'));
    battles.push(mkBattle(dateFor(i + 3, (i * 2 + 2) % 7, 19), s.struggle, s.lie, s.triggers, s.context, 'stood'));
  }

  for (const b of battles) {
    await saveBattle(b);
    const date = localDate(new Date(b.startedAt));
    if (b.outcome === 'stood') await saveStone({ id: crypto.randomUUID(), battleId: b.id, kind: 'stood', date, verse: b.verse, demo: true });
    else if (b.outcome === 'fell') await saveStone({ id: crypto.randomUUID(), battleId: b.id, kind: 'rose_again', date, verse: { bibleId: BSB, usfm: ['MIC.7.8'], reference: 'Micah 7:8' }, demo: true });
  }
  // a few from-memory wins this month
  const fm: Stone[] = [0, 1, 2].map((k) => ({ id: crypto.randomUUID(), kind: 'from_memory', date: localDate(new Date(Date.now() - k * 4 * 86400_000)), demo: true }));
  for (const s of fm) await saveStone(s);

  await recompute();
  return battles.length + fm.length;
}
