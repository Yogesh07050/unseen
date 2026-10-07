import { create } from 'zustand';
import { api } from '../ai/api';
import { screen } from '../engines/safetyGate';
import { redact } from '../engines/redact';
import { classify } from '../engines/fallbackClassifier';
import { getVerified } from '../engines/verses';
import { BSB } from '../engines/bibles';
import { ACTIONS, ACTION_BY_ID } from '../content/actions';
import { DEFAULTS, TRUTH_ENTRIES } from '../content/truthIndex';
import { archetypeFor, ARCHETYPES } from '../content/archetypes';
import { clusters, clusterToStoredShape, kairos, lieTokens, standRate, WEEKDAYS_LONG } from '../analytics';
import {
  allAllies, allBattles, logEvent, saveBattle, saveCluster, saveStone, saveTranscript, saveWatch, clearWatch, getSettings,
} from '../data/repos';
import type {
  ArchetypeId, Battle, Channel, ContextType, Discernment, Front, Outcome, Struggle, Trigger, VerifiedVerse, VerseRef,
} from '../types';

type BattleState =
  | 'idle' | 'listening' | 'gating' | 'discerning' | 'confirming'
  | 'retrieving' | 'fighting' | 'climax' | 'peace' | 'logging';

interface BattleCtx {
  id: string; startedAt: number; channel: Channel;
  transcript: string; redacted: string;
  discernment?: Discernment; archetype?: ArchetypeId;
  model?: string; promptVersion?: string;          // which path read the words
  verse?: VerifiedVerse; backups: VerifiedVerse[]; why?: string;
  phraseIndex: number; strikes: number;
  reflection?: string; escapes: string[]; gentleReply?: string;
  offline: boolean; outcome?: Outcome; prayerToken?: string; allyAcks: number;
  lieClusterId: string;
}

interface BattleStore {
  state: BattleState;
  ctx: BattleCtx | null;
  begin: (channel: Channel) => void;
  setTranscript: (t: string) => void;
  gate: (text: string) => { route: 'harbor' | 'discern'; flag?: string };
  discern: () => Promise<{ route: 'harbor' | 'confirm'; mode?: 'crisis' | 'care'; lowConfidence?: boolean }>;
  applyCorrection: (patch: { struggle?: Struggle; lie?: string }) => void;
  retrieve: () => Promise<boolean>;
  strike: () => { done: boolean };
  useBackup: () => Promise<boolean>;
  finalize: (outcome: Outcome, opts?: { escapeId?: string; note?: string }) => Promise<void>;
  cancel: () => void;
}

function newCtx(channel: Channel): BattleCtx {
  return {
    id: crypto.randomUUID(), startedAt: Date.now(), channel,
    transcript: '', redacted: '', phraseIndex: 0, strikes: 0, backups: [],
    escapes: [], offline: false, allyAcks: 0, lieClusterId: '',
  };
}

// ---- Candidate ids: '+'-joined USFM ranges, e.g. 'EPH.4.26+EPH.4.27' ----
export function joinId(usfm: string[]): string { return usfm.join('+'); }
export function splitId(id: string): string[] { return id.split('+').map((s) => s.trim()).filter(Boolean); }

// The curated Truth Index candidates for a struggle (truth ranges first, then
// support verses, then the defaults) — the server adds YouVersion search hits.
function candidateIdsFor(struggle: Struggle, lie: string): string[] {
  const out: string[] = [];
  const add = (u: string[]) => { const id = joinId(u); if (u.length && !out.includes(id)) out.push(id); };
  const tok = lieTokens(lie);
  const entries = TRUTH_ENTRIES.filter((e) => e.struggle === struggle)
    .sort((a, b) => jaccard(tok, lieTokens(b.lie)) - jaccard(tok, lieTokens(a.lie)));
  for (const e of entries) add(e.truth);
  for (const e of entries) for (const sup of e.support) add([sup]);
  add(DEFAULTS[struggle] ?? DEFAULTS.other);
  if (struggle !== 'other') add(DEFAULTS.other);
  return out.slice(0, 8);
}

// Offline choice: the curated entry whose lie reads closest, then its support verses.
function seedChoice(struggle: Struggle, lie: string): { primary: string[]; backups: string[][]; why: string } {
  const tok = lieTokens(lie);
  let best: { e: typeof TRUTH_ENTRIES[number]; sim: number } | null = null;
  for (const e of TRUTH_ENTRIES) {
    if (e.struggle !== struggle) continue;
    const sim = jaccard(tok, lieTokens(e.lie));
    if (!best || sim > best.sim) best = { e, sim };
  }
  const primary = best && best.sim >= 0.3 ? best.e.truth : (DEFAULTS[struggle] ?? DEFAULTS.other);
  const backups: string[][] = [];
  for (const e of TRUTH_ENTRIES.filter((x) => x.struggle === struggle)) {
    for (const u of [e.truth, ...e.support.map((s) => [s])]) {
      if (joinId(u) !== joinId(primary) && !backups.some((b) => joinId(b) === joinId(u))) backups.push(u);
    }
  }
  return { primary, backups: backups.slice(0, 3), why: 'From your saved verses for this struggle' };
}

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a), B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const union = new Set([...a, ...b]).size || 1;
  return inter / union;
}

// ---- On-device discernment (offline fallback and 'instant' mode) ----
// Non-sin distress markers: grief, depression, illness are never temptations (route to care).
const NON_SIN = ['died', 'passed away', 'grief', 'grieving', 'depress', 'diagnosed', 'cancer', 'terminal', 'miscarriage', 'funeral'];
const LIE_MARKERS = [
  'deserve', 'no one', 'nobody', "won't matter", 'wont matter', "doesn't matter", 'just once', 'just this', 'one more',
  'five more', 'need this', 'need it', "can't help", 'cant help', 'too far', 'never change', 'might as well',
  "what's the point", 'whats the point', 'everyone else', 'better than', 'always', 'never', 'have to', 'no choice',
  'nothing wrong', 'why not', "they'll never", 'nobody will', 'no one will', 'no point', 'tired of me',
  'not worth', 'too late', "can't change", 'cant change',
];
const TRIGGER_WORDS: Record<Trigger, string[]> = {
  tired: ['tired', 'exhausted', 'no sleep', 'drained', 'worn out'],
  alone: ['alone', 'by myself', 'nobody here', 'no one around', 'lonely'],
  hurt: ['hurt', 'ignored', 'insult', 'mocked', 'humiliat', 'betray', 'left out', 'rejected'],
  bored: ['bored', 'nothing to do', 'killing time'],
  stressed: ['stress', 'deadline', 'pressure', 'overwhelm', 'too much', 'anxious'],
  hungry: ['hungry', "haven't eaten", 'havent eaten', 'skipped lunch'],
  conflict: ['argu', 'fight', 'yell', 'shout', 'fired back', 'text from', 'message from', 'he said', 'she said'],
  online: ['scroll', 'instagram', 'tiktok', 'phone', 'online', 'feed', 'youtube', 'reddit', 'twitter'],
  late_night: ['late', 'midnight', '2am', '3am', "can't sleep", 'cant sleep', 'tonight', 'in bed'],
  other: [],
};
const CONTEXT_WORDS: Record<ContextType, string[]> = {
  family: ['mom', 'mum', 'dad', 'brother', 'sister', 'wife', 'husband', 'kids', 'son', 'daughter', 'family', 'in-law', 'parents'],
  work: ['boss', 'work', 'job', 'office', 'coworker', 'co-worker', 'client', 'manager', 'shift', 'deadline'],
  school: ['school', 'class', 'teacher', 'exam', 'homework', 'campus', 'professor'],
  church: ['church', 'pastor', 'small group', 'worship team', 'bible study'],
  online: ['scroll', 'instagram', 'tiktok', 'online', 'feed', 'youtube', 'reddit', 'twitter', 'group chat'],
  home_alone: ['alone', 'by myself', 'empty house', 'in bed', 'my room'],
  social: ['party', 'friends', 'bar', 'hanging out', 'dinner', 'wedding'],
  other: [],
};
const INTENSIFIERS = ['right now', 'about to', 'already', "can't stop", 'cant stop', 'so bad', 'really', '!!', 'going to'];

function pick<K extends string>(table: Record<K, string[]>, text: string, limit: number): K[] {
  return (Object.keys(table) as K[])
    .map((k) => [table[k].filter((w) => text.includes(w)).length, k] as const)
    .filter(([n]) => n > 0).sort((a, b) => b[0] - a[0]).map(([, k]) => k).slice(0, limit);
}

// The clause of the user's own words that most sounds like the justification.
export function extractLie(text: string, struggle: Struggle): string | null {
  const stems = (TRUTH_ENTRIES.filter((e) => e.struggle === struggle).flatMap((e) => lieTokens(e.lie)));
  const clauses = text.split(/[.!?;,\n]+|\s+(?:but|and so|so|because)\s+/).map((c) => c.trim()).filter((c) => c.split(/\s+/).length >= 2);
  let best: string | null = null; let bestScore = 0;
  for (const clause of clauses) {
    const low = clause.toLowerCase();
    let score = LIE_MARKERS.filter((m) => low.includes(m)).length * 2 + stems.filter((s) => low.includes(s)).length;
    if (/\b(i|me|my|he|she|they|it)\b/.test(low)) score += 1;
    if (score > bestScore) { best = clause; bestScore = score; }
  }
  if (!best || bestScore < 2) return null;
  const words = best.replace(/\s+/g, ' ').replace(/^[\s"'“”]+|[\s"'“”]+$/g, '').split(' ').slice(0, 12);
  while (words.join(' ').length > 58 && words.length > 3) words.pop(); // fit the 60-char lie field on a word boundary
  let lie = words.join(' ').replace(/[\s,;:-]+$/, '');
  lie = lie.charAt(0).toUpperCase() + lie.slice(1);
  if (!/[.!?]$/.test(lie)) lie += '.';
  return lie;
}

export function localDiscern(transcript: string): Discernment {
  const t = transcript.toLowerCase();
  if (NON_SIN.some((w) => t.includes(w))) {
    return { safety_flag: 'none', struggle: 'not_a_temptation', lie: '', stirred_by: [], triggers: pick(TRIGGER_WORDS, t, 2), context_type: 'other', front: 'unclear', intensity: 4, confidence: 0.85, truth_queries: [] };
  }
  const struggle = classify(transcript);
  const entry = TRUTH_ENTRIES.find((e) => e.struggle === struggle);
  const triggers = pick(TRIGGER_WORDS, t, 3);
  const context = pick(CONTEXT_WORDS, t, 1)[0] ?? 'other';
  let front: Front = 'flesh';
  if (['god doesn', 'god is tired', 'worthless', 'too far gone', 'no point', 'hopeless'].some((w) => t.includes(w))) front = 'devil';
  else if (['everyone', 'compare', 'better than', 'they all', 'perfect life'].some((w) => t.includes(w))) front = 'world';
  const lie = extractLie(transcript, struggle) ?? entry?.lie ?? '';
  const intensity = Math.min(10, 5 + Math.min(4, INTENSIFIERS.filter((w) => t.includes(w)).length) + (transcript.includes('!') ? 1 : 0));
  return {
    safety_flag: 'none', struggle, lie, stirred_by: triggers.slice(0, 2).map((x) => x.replace('_', ' ')),
    triggers: triggers.length ? triggers : ['other'], context_type: context, front,
    intensity, confidence: struggle === 'other' ? 0.35 : 0.55,
    truth_queries: [struggle, lie.replace(/[.!?]$/, '').toLowerCase()].filter(Boolean),
  };
}

const LOCAL_MODEL = 'on-device-classifier';

export const useBattle = create<BattleStore>((set, get) => ({
  state: 'idle',
  ctx: null,

  begin(channel) {
    set({ state: 'listening', ctx: newCtx(channel) });
  },

  setTranscript(t) {
    const ctx = get().ctx;
    if (ctx) set({ ctx: { ...ctx, transcript: t } });
  },

  gate(text) {
    const ctx = get().ctx ?? newCtx('text');
    const result = screen(text);
    set({ state: 'gating', ctx: { ...ctx, transcript: text } });
    if (result.flag !== 'none') {
      void logEvent({ id: crypto.randomUUID(), ts: Date.now(), type: 'harbor_shown', meta: { flag: result.flag } });
      set({ state: 'idle' });
      return { route: 'harbor', flag: result.flag };
    }
    return { route: 'discern' };
  },

  async discern() {
    const ctx = get().ctx!;
    const settings = await getSettings();
    const allies = await allAllies();
    const knownNames = [settings?.firstName ?? '', ...allies.map((a) => a.name)].filter(Boolean);
    const { text: redacted } = redact(ctx.transcript, knownNames);
    set({ state: 'discerning', ctx: { ...ctx, redacted } });

    const route = (d: Discernment, offline: boolean, model: string, promptVersion: string) => {
      set({ ctx: { ...get().ctx!, discernment: d, offline, model, promptVersion } });
      if (d.safety_flag !== 'none') {
        void logEvent({ id: crypto.randomUUID(), ts: Date.now(), type: 'harbor_shown', meta: { flag: d.safety_flag } });
        return { route: 'harbor' as const, mode: 'crisis' as const };
      }
      if (d.struggle === 'not_a_temptation') return { route: 'harbor' as const, mode: 'care' as const };
      set({ state: 'confirming' });
      return { route: 'confirm' as const, lowConfidence: d.confidence < 0.6 };
    };

    // The model reads the words (default). 'instant' = the person asked for an
    // on-device read with no network; offline falls back to the same read.
    if (settings?.discernMode === 'instant' || !navigator.onLine) {
      return route(localDiscern(ctx.transcript), !navigator.onLine, LOCAL_MODEL, 'discern@local');
    }
    try {
      const res = await api.discern(redacted, settings?.tradition);
      return route(res.discernment, false, res.meta.model, res.meta.promptVersion);
    } catch {
      return route(localDiscern(ctx.transcript), !navigator.onLine, LOCAL_MODEL, 'discern@local');
    }
  },

  applyCorrection(patch) {
    const ctx = get().ctx!;
    const d = { ...ctx.discernment! };
    if (patch.struggle) d.struggle = patch.struggle;
    if (patch.lie !== undefined) d.lie = patch.lie;
    set({ ctx: { ...ctx, discernment: d } });
  },

  async retrieve() {
    const ctx = get().ctx!;
    const d = ctx.discernment!;
    const settings = await getSettings();
    const bibleId = settings?.bibleId ?? BSB;
    const archetype = archetypeFor(d.struggle);
    set({ state: 'retrieving', ctx: { ...ctx, archetype } });

    // 1. Choose: the model picks from curated + YouVersion-searched candidates
    //    (server builds the pool); offline or 'instant' → the curated entry.
    let choice: { primary: string[]; backups: string[][]; why: string } | null = null;
    if (navigator.onLine && settings?.discernMode !== 'instant') {
      try {
        const r = await api.truth({
          struggle: d.struggle, lie: d.lie, candidateIds: candidateIdsFor(d.struggle, d.lie),
          truthQueries: d.truth_queries.slice(0, 3), stirredBy: d.stirred_by.slice(0, 3), bibleId,
        });
        choice = { primary: splitId(r.primary), backups: (r.backups ?? []).map(splitId).filter((b) => b.length), why: r.why };
      } catch { choice = null; }
    }
    if (!choice) choice = seedChoice(d.struggle, d.lie);

    // 2. Verify every chosen passage byte-for-byte against the Bible API, in parallel.
    const tryVerified = (u: string[]) => getVerified(bibleId, u).catch(() => null);
    const [primary, ...rest] = await Promise.all([tryVerified(choice.primary), ...choice.backups.slice(0, 3).map(tryVerified)]);
    let verse: VerifiedVerse | null = primary;
    const backups: VerifiedVerse[] = rest.filter((v): v is VerifiedVerse => !!v && joinId(v.usfm) !== joinId(choice!.primary));
    if (!verse) verse = backups.shift() ?? await tryVerified(DEFAULTS[d.struggle] ?? DEFAULTS.other);
    if (!verse) { set({ state: 'confirming' }); return false; }
    if (backups.length === 0) {
      // Always keep at least one backup so "Still fighting" has somewhere to go.
      for (const b of seedChoice(d.struggle, d.lie).backups) {
        if (joinId(b) === joinId(verse.usfm)) continue;
        const v = await tryVerified(b); if (v) { backups.push(v); break; }
      }
    }

    // Cluster id for the Discern history panel.
    const existing = clusters(await allBattles());
    const tok = lieTokens(d.lie);
    let clusterId = `${d.struggle}:${d.lie.toLowerCase()}`;
    for (const c of existing) if (c.struggle === d.struggle && jaccard(tok, lieTokens(c.label)) >= 0.5) clusterId = c.id;

    set({ state: 'fighting', ctx: { ...get().ctx!, verse, backups, why: choice.why, phraseIndex: 0, strikes: 0, lieClusterId: clusterId } });

    // Compose in the background (reflection, escapes, gentle reply).
    const entry = TRUTH_ENTRIES.find((e) => e.struggle === d.struggle);
    void (async () => {
      const struggleActions = ACTIONS.filter((a) => a.struggles.includes('*') || a.struggles.includes(d.struggle)).slice(0, 4);
      const needsGentle = struggleActions.some((a) => a.id === 'gentle_reply');
      try {
        const res = await api.compose({
          struggle: d.struggle, lie: d.lie,
          verse: { reference: verse!.reference, text: verse!.text },
          actions: struggleActions.map((a) => ({ id: a.id, label: a.label })),
          needsGentleReply: needsGentle, context: needsGentle ? ctx.redacted : undefined,
          tradition: settings?.tradition,
        });
        const cur = get().ctx;
        if (cur && cur.id === ctx.id) {
          set({ ctx: { ...cur, reflection: res.reflection, escapes: res.escapes.length ? res.escapes : (entry?.escapes ?? []), gentleReply: res.gentleReply ?? undefined } });
        }
      } catch {
        const cur = get().ctx;
        if (cur && cur.id === ctx.id) set({ ctx: { ...cur, escapes: entry?.escapes ?? [] } });
      }
    })();
    return true;
  },

  strike() {
    const ctx = get().ctx!;
    const verse = ctx.verse!;
    const nextIndex = ctx.phraseIndex + 1;
    const done = nextIndex >= verse.phrases.length;
    set({ ctx: { ...ctx, phraseIndex: nextIndex, strikes: ctx.strikes + 1 }, state: done ? 'climax' : 'fighting' });
    return { done };
  },

  async useBackup() {
    const ctx = get().ctx!;
    const [next, ...rest] = ctx.backups;
    if (!next) return false;
    set({ state: 'fighting', ctx: { ...ctx, verse: next, backups: rest, phraseIndex: 0, strikes: 0 } });
    return true;
  },

  async finalize(outcome, opts) {
    const ctx = get().ctx!;
    const d = ctx.discernment!;
    set({ state: 'logging' });
    const endedAt = Date.now();
    const secondsToPeace = Math.round((endedAt - ctx.startedAt) / 1000);
    const ref = (v: VerifiedVerse): VerseRef => ({ bibleId: v.bibleId, usfm: v.usfm, reference: v.reference });
    const battle: Battle = {
      id: ctx.id, startedAt: ctx.startedAt, endedAt, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      channel: ctx.channel, struggle: d.struggle, archetype: ctx.archetype ?? 'shadow',
      lie: d.lie, lieClusterId: ctx.lieClusterId || `${d.struggle}:${d.lie.toLowerCase()}`, stirredBy: d.stirred_by,
      triggers: d.triggers, contextType: d.context_type, front: d.front, intensity: d.intensity,
      verse: ctx.verse ? ref(ctx.verse) : { bibleId: BSB, usfm: [], reference: '' },
      backup: ctx.backups[0] ? ref(ctx.backups[0]) : undefined,
      backups: ctx.backups.map(ref), why: ctx.why,
      strikes: ctx.strikes, outcome, escapeTaken: opts?.escapeId, secondsToPeace,
      allyAcks: ctx.allyAcks, offline: ctx.offline,
      promptVersion: ctx.promptVersion ?? 'discern@2', model: ctx.model,
    };
    await saveBattle(battle);

    // Transcript stored separately under its own retention (phone only).
    const settings = await getSettings();
    const retentionDays = settings?.retentionDays ?? 30;
    if (retentionDays !== null && ctx.transcript) {
      await saveTranscript({ id: ctx.id, text: ctx.transcript, expiresAt: Date.now() + retentionDays * 86400_000 });
    }

    if (outcome === 'stood') {
      await saveStone({ id: crypto.randomUUID(), battleId: ctx.id, kind: 'stood', date: localDate(), verse: battle.verse, note: opts?.note });
    }
    // A fall writes outcome 'fell'; the rose-again stone is laid on the Rise Again screen.

    await recompute();
    set({ state: 'idle', ctx: { ...ctx, outcome } });
  },

  cancel() {
    set({ state: 'idle', ctx: null });
  },
}));

export function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const STRUGGLE_WORD: Record<string, string> = {
  anger: 'anger', fear: 'fear', sexual: 'lust', escapism: 'scrolling', shame: 'shame', envy: 'envy',
  compulsion: 'compulsion', deceit: 'deceit', pride: 'pride', other: 'temptation', not_a_temptation: 'hard',
};
function hourLabel(h: number) { const ap = h >= 12 ? 'pm' : 'am'; const hr = h % 12 === 0 ? 12 : h % 12; return `${hr} ${ap}`; }

// Rebuild the derived records from the battle log: lie clusters (Schemes) and
// Kairos Watch windows with a reason and a plan drawn from the person's own data.
export async function recompute() {
  const battles = await allBattles();
  for (const c of clusters(battles)) await saveCluster(clusterToStoredShape(c));
  await clearWatch();
  const windows = kairos(battles);
  const allies = await allAllies();
  for (const w of windows) {
    const sameDay = battles.filter((b) => {
      const d = new Date(b.startedAt); const hour = d.getHours();
      const weekday = hour < 5 ? (d.getDay() + 6) % 7 : d.getDay();
      return weekday === w.weekday && hour >= w.startHour - 1 && hour < w.endHour + 1;
    });
    const mainStruggle = mode(sameDay.map((b) => b.struggle)) ?? mode(battles.map((b) => b.struggle)) ?? 'other';
    const n = sameDay.filter((b) => b.struggle === mainStruggle).length;
    const when = `${WEEKDAYS_LONG[w.weekday]} ${w.startHour >= 18 || w.startHour < 5 ? 'evenings' : w.startHour < 12 ? 'mornings' : 'afternoons'}`;
    w.reason = n >= 2
      ? `${n} of your ${STRUGGLE_WORD[mainStruggle] ?? mainStruggle} battles came on ${when}.`
      : `${when} have been among your hardest times.`;

    // The verse that has held best for this struggle on this day; else the curated truth.
    const entry = TRUTH_ENTRIES.find((e) => e.struggle === mainStruggle);
    const used = new Map<string, VerseRef>();
    for (const b of sameDay) if (b.verse.usfm.length) used.set(joinId(b.verse.usfm), b.verse);
    let bestRef: VerseRef | undefined; let bestRate = -1;
    for (const v of used.values()) { const r = standRate(battles, v.usfm); if (r.total && r.rate > bestRate) { bestRate = r.rate; bestRef = v; } }
    const verseLabel = bestRef?.reference ?? (entry ? joinId(entry.truth).replace(/\+/g, ' ') : '');
    const escape = entry?.escapes.map((id) => ACTION_BY_ID[id]).find((a) => a && a.kind !== 'compose');
    const ally = allies[0];
    w.plan = [
      { kind: 'verse', label: verseLabel ? `Verse for ${WEEKDAYS_LONG[w.weekday]}: ${verseLabel}` : 'Verse for tonight', payload: bestRef ? { usfm: joinId(bestRef.usfm) } : undefined },
      { kind: 'ally_checkin', label: ally ? `Check in with ${ally.name} before ${hourLabel(w.startHour)}` : 'Add an ally and check in before it starts' },
      { kind: 'physical', label: escape ? escape.label.replace('{ally}', ally?.name ?? 'an ally').replace('{sponsor}', ally?.name ?? 'your sponsor').replace('{allies}', allies.map((a) => a.name).join(' or ') || 'your allies').replace('{person}', 'them') : 'Walk outside for 10 minutes' },
      { kind: 'morning_armor', label: `Put on the armor that ${w.startHour >= 12 ? 'morning' : 'evening before'}` },
    ];
    await saveWatch(w);
  }
}

function mode<T>(arr: T[]): T | undefined {
  const counts = new Map<T, number>();
  let best: T | undefined; let bestN = 0;
  for (const x of arr) { const n = (counts.get(x) ?? 0) + 1; counts.set(x, n); if (n > bestN) { bestN = n; best = x; } }
  return best;
}

export { ARCHETYPES, ACTION_BY_ID };
