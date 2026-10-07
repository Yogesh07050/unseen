import { create } from 'zustand';
import { api } from '../ai/api';
import { screen } from '../engines/safetyGate';
import { redact } from '../engines/redact';
import { classify } from '../engines/fallbackClassifier';
import { getVerified } from '../engines/verses';
import { ACTIONS, ACTION_BY_ID } from '../content/actions';
import { DEFAULTS, TRUTH_ENTRIES } from '../content/truthIndex';
import { archetypeFor, ARCHETYPES } from '../content/archetypes';
import { clusters, clusterToStoredShape, kairos, lieTokens, WEEKDAYS_LONG } from '../analytics';
import {
  allAllies, allBattles, logEvent, saveBattle, saveCluster, saveStone, saveTranscript, saveWatch, clearWatch, getSettings,
} from '../data/repos';
import type {
  ArchetypeId, Battle, Channel, Discernment, Outcome, Struggle, VerifiedVerse,
} from '../types';

type BattleState =
  | 'idle' | 'listening' | 'gating' | 'discerning' | 'confirming'
  | 'retrieving' | 'fighting' | 'climax' | 'peace' | 'logging';

interface BattleCtx {
  id: string; startedAt: number; channel: Channel;
  transcript: string; redacted: string;
  discernment?: Discernment; archetype?: ArchetypeId;
  verse?: VerifiedVerse; backup?: VerifiedVerse;
  phraseIndex: number; strikes: number;
  reflection?: string; escapes: string[]; gentleReply?: string;
  offline: boolean; outcome?: Outcome; prayerToken?: string; allyAcks: number;
  lieClusterId: string; demo: boolean;
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
    transcript: '', redacted: '', phraseIndex: 0, strikes: 0,
    escapes: [], offline: false, allyAcks: 0, lieClusterId: '', demo: false,
  };
}

function seedMatch(struggle: Struggle, lie: string): string[] {
  const tok = lieTokens(lie);
  let best: { usfm: string[]; sim: number } | null = null;
  for (const e of TRUTH_ENTRIES) {
    if (e.struggle !== struggle) continue;
    const sim = jaccard(tok, lieTokens(e.lie));
    if (sim >= 0.5 && (!best || sim > best.sim)) best = { usfm: e.truth, sim };
  }
  if (best) return best.usfm;
  return DEFAULTS[struggle] ?? DEFAULTS.other;
}
function jaccard(a: string[], b: string[]): number {
  const A = new Set(a), B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const union = new Set([...a, ...b]).size || 1;
  return inter / union;
}

// Non-sin distress markers: grief, depression, illness are never temptations (route to care).
const NON_SIN = ['died', 'passed away', 'grief', 'grieving', 'depress', 'diagnosed', 'cancer', 'terminal', 'miscarriage', 'funeral'];

// On-device discernment for instant mode and the offline fallback (§6.8).
function localDiscern(transcript: string): Discernment {
  const t = transcript.toLowerCase();
  if (NON_SIN.some((w) => t.includes(w))) {
    return { safety_flag: 'none', struggle: 'not_a_temptation', lie: '', stirred_by: [], triggers: ['hurt'], context_type: 'home_alone', front: 'unclear', intensity: 5, confidence: 0.85, truth_queries: [] };
  }
  const struggle = classify(transcript);
  const entry = TRUTH_ENTRIES.find((e) => e.struggle === struggle);
  return {
    safety_flag: 'none', struggle, lie: entry?.lie ?? '', stirred_by: [],
    triggers: ['late_night'], context_type: 'home_alone', front: 'flesh',
    intensity: 6, confidence: struggle === 'other' ? 0.4 : 0.62, truth_queries: [],
  };
}

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

    const route = (d: Discernment, offline: boolean) => {
      set({ ctx: { ...get().ctx!, discernment: d, offline } });
      if (d.safety_flag !== 'none') {
        void logEvent({ id: crypto.randomUUID(), ts: Date.now(), type: 'harbor_shown', meta: { flag: d.safety_flag } });
        return { route: 'harbor' as const, mode: 'crisis' as const };
      }
      if (d.struggle === 'not_a_temptation') return { route: 'harbor' as const, mode: 'care' as const };
      set({ state: 'confirming' });
      return { route: 'confirm' as const, lowConfidence: d.confidence < 0.6 };
    };

    // Instant mode: on-device read, no network (<0.5s). The on-device safety gate
    // has already run; localDiscern also routes non-sin distress to care.
    if ((settings?.discernMode ?? 'instant') === 'instant') {
      return route(localDiscern(ctx.transcript), false);
    }

    try {
      const res = await api.discern(redacted, settings?.tradition);
      return route(res.discernment, false);
    } catch {
      return route(localDiscern(ctx.transcript), !navigator.onLine);
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
    const bibleId = settings?.bibleId ?? 3034;
    const archetype = archetypeFor(d.struggle);
    set({ state: 'retrieving', ctx: { ...ctx, archetype } });

    const primaryUsfm = seedMatch(d.struggle, d.lie);
    const defaultUsfm = DEFAULTS[d.struggle] ?? DEFAULTS.other;
    let verse: VerifiedVerse | null = null;
    try { verse = await getVerified(bibleId, primaryUsfm); } catch { verse = null; }
    if (!verse) { try { verse = await getVerified(bibleId, defaultUsfm); } catch { verse = null; } }
    if (!verse) { set({ state: 'confirming' }); return false; }

    let backup: VerifiedVerse | null = null;
    const entry = TRUTH_ENTRIES.find((e) => e.struggle === d.struggle);
    const backupUsfm = entry?.support?.[0] ? [entry.support[0]] : defaultUsfm;
    try { backup = await getVerified(bibleId, backupUsfm); } catch { backup = null; }

    // Cluster id for the Discern history panel.
    const existing = clusters(await allBattles());
    const tok = lieTokens(d.lie);
    let clusterId = `${d.struggle}:${d.lie.toLowerCase()}`;
    for (const c of existing) if (c.struggle === d.struggle && jaccard(tok, lieTokens(c.label)) >= 0.5) clusterId = c.id;

    set({ state: 'fighting', ctx: { ...get().ctx!, verse, backup: backup ?? undefined, phraseIndex: 0, strikes: 0, lieClusterId: clusterId } });

    // Compose in the background (reflection, escapes, gentle reply).
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
    if (!ctx.backup) return false;
    set({ state: 'fighting', ctx: { ...ctx, verse: ctx.backup, backup: undefined, phraseIndex: 0, strikes: 0 } });
    return true;
  },

  async finalize(outcome, opts) {
    const ctx = get().ctx!;
    const d = ctx.discernment!;
    set({ state: 'logging' });
    const endedAt = Date.now();
    const secondsToPeace = Math.round((endedAt - ctx.startedAt) / 1000);
    const battle: Battle = {
      id: ctx.id, startedAt: ctx.startedAt, endedAt, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      channel: ctx.channel, struggle: d.struggle, archetype: ctx.archetype ?? 'shadow',
      lie: d.lie, lieClusterId: ctx.lieClusterId || `${d.struggle}:${d.lie.toLowerCase()}`, stirredBy: d.stirred_by,
      triggers: d.triggers, contextType: d.context_type, front: d.front, intensity: d.intensity,
      verse: ctx.verse ? { bibleId: ctx.verse.bibleId, usfm: ctx.verse.usfm, reference: ctx.verse.reference } : { bibleId: 3034, usfm: [], reference: '' },
      backup: ctx.backup ? { bibleId: ctx.backup.bibleId, usfm: ctx.backup.usfm, reference: ctx.backup.reference } : undefined,
      strikes: ctx.strikes, outcome, escapeTaken: opts?.escapeId, secondsToPeace,
      allyAcks: ctx.allyAcks, offline: ctx.offline, promptVersion: 'discern@1',
    };
    await saveBattle(battle);

    // Transcript stored separately under its own retention.
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

export async function recompute() {
  const battles = await allBattles();
  const real = battles;
  // Rebuild lie clusters.
  for (const c of clusters(real)) await saveCluster(clusterToStoredShape(c));
  // Rebuild watch windows with reasons + a default plan.
  await clearWatch();
  const windows = kairos(real);
  const settings = await getSettings();
  for (const w of windows) {
    const sameDay = real.filter((b) => new Date(b.startedAt).getDay() === w.weekday);
    const mainStruggle = mode(sameDay.map((b) => b.struggle));
    const reason = `${WEEKDAYS_LONG[w.weekday]} ${w.startHour >= 18 ? 'evenings' : 'hours'} have been among your hardest.`;
    w.reason = reason;
    w.plan = [
      { kind: 'verse', label: 'Verse for tonight' },
      { kind: 'ally_checkin', label: 'Ally check-in, sent by you' },
      { kind: 'physical', label: 'Phone charges in the kitchen after 10' },
    ];
    void mainStruggle; void settings;
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
