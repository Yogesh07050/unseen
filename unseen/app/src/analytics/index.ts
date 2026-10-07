import type { Battle, LieCluster, Outcome, Struggle, WatchWindow } from '../types';

const DAY = 86400_000;

// 1-366, in the device's local time.
export function dayOfYear(d = new Date()): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / DAY);
}
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const COLUMNS = ['Morning', 'Afternoon', '6 to 9', '9 to 12', 'After 12'];

// Map a battle to its "night" weekday (after-midnight counts to the previous day).
function night(ts: number): { weekday: number; hour: number } {
  const d = new Date(ts);
  let weekday = d.getDay();
  const hour = d.getHours();
  if (hour < 5) weekday = (weekday + 6) % 7;
  return { weekday, hour };
}

function columnOf(hour: number): number {
  if (hour >= 5 && hour < 12) return 0;
  if (hour >= 12 && hour < 18) return 1;
  if (hour >= 18 && hour < 21) return 2;
  if (hour >= 21 && hour < 24) return 3;
  return 4; // 00:00-04:59
}

// ---- Heat map: 7 rows x 5 columns, last 56 days ----
export function heatMap(battles: Battle[]): { grid: number[][]; counts: number[][] } {
  const cutoff = Date.now() - 56 * DAY;
  const counts = Array.from({ length: 7 }, () => Array(5).fill(0));
  for (const b of battles) {
    if (b.startedAt < cutoff) continue;
    const { weekday, hour } = night(b.startedAt);
    counts[weekday][columnOf(hour)] += 1;
  }
  const max = Math.max(1, ...counts.flat());
  const grid = counts.map((row) => row.map((c) => c / max));
  return { grid, counts };
}

// ---- Lie clusters + strongholds ----
const STOP = new Set(['a', 'an', 'the', 'it', 'is', 'to', 'of', 'and', 'you', 'your', 'i', 'me', 'my', 'this', 'that']);
export function lieTokens(lie: string): string[] {
  return [...new Set(lie.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter((w) => w && !STOP.has(w)))];
}
function jaccard(a: string[], b: string[]): number {
  const A = new Set(a), B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const union = new Set([...a, ...b]).size || 1;
  return inter / union;
}

export interface Stronghold {
  id: string; label: string; struggle: Struggle; count: number;
  status: 'active' | 'stronghold' | 'torn_down'; recentOutcomes: Outcome[];
}

let clusterSource: Battle[] | null = null;
let clusterResult: Stronghold[] = [];
export function clusters(battles: Battle[]): Stronghold[] {
  if (battles === clusterSource) return clusterResult;
  const cutoff = Date.now() - 56 * DAY;
  const map = new Map<string, { struggle: Struggle; tokens: string[]; labels: Record<string, number>; count: number; outcomes: { ts: number; o: Outcome }[]; last: number }>();
  for (const b of [...battles].sort((a, z) => a.startedAt - z.startedAt)) {
    const tok = lieTokens(b.lie);
    let best: string | null = null; let bestSim = 0;
    for (const [id, c] of map) {
      if (c.struggle !== b.struggle) continue;
      const sim = jaccard(tok, c.tokens);
      if (sim >= 0.5 && sim > bestSim) { best = id; bestSim = sim; }
    }
    const id = best ?? `${b.struggle}:${b.lie.toLowerCase()}`;
    const c = map.get(id) ?? { struggle: b.struggle, tokens: tok, labels: {}, count: 0, outcomes: [], last: 0 };
    c.count += 1;
    c.labels[b.lie] = (c.labels[b.lie] ?? 0) + 1;
    c.outcomes.push({ ts: b.startedAt, o: b.outcome });
    c.last = Math.max(c.last, b.startedAt);
    if (!best) c.tokens = tok;
    map.set(id, c);
  }
  const out: Stronghold[] = [];
  for (const [id, c] of map) {
    const recent = c.count >= 1 ? c.outcomes.filter((x) => x.ts >= cutoff).length : 0;
    const label = Object.entries(c.labels).sort((a, z) => z[1] - a[1])[0][0];
    const recentOutcomes = c.outcomes.slice(-10).reverse().map((x) => x.o);
    let status: Stronghold['status'] = 'active';
    const last6 = c.outcomes.slice(-6).map((x) => x.o);
    const tornByStands = last6.length === 6 && last6.every((o) => o === 'stood');
    const tornByTime = recent >= 5 && c.last < cutoff;
    if (recent >= 5) status = 'stronghold';
    if (tornByStands || (status === 'stronghold' && tornByTime)) status = 'torn_down';
    out.push({ id, label, struggle: c.struggle, count: recent, status, recentOutcomes });
  }
  clusterSource = battles;
  clusterResult = out.sort((a, z) => z.count - a.count);
  return clusterResult;
}

// ---- Trigger / context links ----
export interface Link { struggle: Struggle; label: string; lift: number; k: number; n: number }
export function triggerLinks(battles: Battle[]): Link[] {
  const cutoff = Date.now() - 56 * DAY;
  const recent = battles.filter((b) => b.startedAt >= cutoff);
  const total = recent.length || 1;
  const links: Link[] = [];
  const byStruggle = new Map<Struggle, Battle[]>();
  for (const b of recent) byStruggle.set(b.struggle, [...(byStruggle.get(b.struggle) ?? []), b]);
  for (const [struggle, list] of byStruggle) {
    if (list.length < 5) continue;
    const contexts = new Set(recent.map((b) => b.contextType));
    for (const ctx of contexts) {
      const pOverall = recent.filter((b) => b.contextType === ctx).length / total;
      const k = list.filter((b) => b.contextType === ctx).length;
      const pGiven = k / list.length;
      const lift = pOverall ? pGiven / pOverall : 0;
      if (lift >= 1.5 && k >= 3) links.push({ struggle, label: ctx, lift, k, n: list.length });
    }
  }
  return links.sort((a, z) => z.lift - a.lift);
}

export function standRate(battles: Battle[], usfm: string[]): { rate: number; stood: number; total: number } {
  const ref = usfm.join(',');
  const used = battles.filter((b) => b.verse.usfm.join(',') === ref && (b.outcome === 'stood' || b.outcome === 'fell'));
  const stood = used.filter((b) => b.outcome === 'stood').length;
  return { rate: used.length ? stood / used.length : 0, stood, total: used.length };
}

// ---- Kairos Watch forecast ----
const HALF_LIFE = 21;
function K(a: number, b: number): number {
  if (a === b) return 1;
  const diff = Math.abs(a - b);
  if (diff === 1 || diff === 167) return 0.5;
  return 0;
}

export function kairos(battles: Battle[]): WatchWindow[] {
  if (battles.length < 5) return [];
  const now = Date.now();
  const weight: number[] = [];
  const slotBattles: number[] = Array(168).fill(0);
  for (const b of battles) {
    const { weekday, hour } = night(b.startedAt);
    const slot = weekday * 24 + hour;
    const w = Math.pow(2, -((now - b.startedAt) / DAY) / HALF_LIFE);
    weight.push(w);
    slotBattles[slot] += 1;
    void slot;
  }
  const r = Array(168).fill(0);
  const denom = weight.reduce((a, b) => a + b, 0) || 1;
  battles.forEach((b, i) => {
    const { weekday, hour } = night(b.startedAt);
    const si = weekday * 24 + hour;
    for (let s = 0; s < 168; s++) {
      const k = K(si, s);
      if (k) r[s] += weight[i] * k;
    }
  });
  for (let s = 0; s < 168; s++) r[s] /= denom;

  const nonzero = r.filter((x) => x > 0).sort((a, b) => a - b);
  if (nonzero.length === 0) return [];
  const p80 = nonzero[Math.floor(0.8 * (nonzero.length - 1))];
  const marked = r.map((x) => x >= p80 && x > 0);

  // Merge consecutive marked slots into windows.
  const windows: { slots: number[] }[] = [];
  let cur: number[] = [];
  for (let s = 0; s < 168; s++) {
    if (marked[s]) cur.push(s);
    else if (cur.length) { windows.push({ slots: cur }); cur = []; }
  }
  if (cur.length) windows.push({ slots: cur });

  const scored = windows.map((w) => {
    const score = w.slots.reduce((a, s) => a + r[s], 0);
    let battlesIn = 0;
    for (const s of w.slots) battlesIn += slotBattles[s] + (slotBattles[(s + 167) % 168] ?? 0) * 0 + (slotBattles[(s + 1) % 168] ?? 0) * 0;
    // include one hour either side
    const inset = new Set<number>();
    for (const s of w.slots) { inset.add(s); inset.add((s + 167) % 168); inset.add((s + 1) % 168); }
    battlesIn = [...inset].reduce((a, s) => a + slotBattles[s], 0);
    return { ...w, score, battlesIn };
  }).filter((w) => w.battlesIn >= 3);

  scored.sort((a, z) => z.score - a.score);
  const top = scored.slice(0, 3);
  const median = top.length ? top.map((w) => w.score).sort((a, b) => a - b)[Math.floor(top.length / 2)] : 0;

  return top.map((w) => {
    const startSlot = w.slots[0];
    const endSlot = w.slots[w.slots.length - 1];
    const weekday = Math.floor(startSlot / 24);
    const startHour = startSlot % 24;
    const endHour = (endSlot % 24) + 1;
    const level: 'high' | 'medium' = w.score >= 2 * median ? 'high' : 'medium';
    return {
      id: `w-${weekday}-${startHour}`,
      weekday: weekday as WatchWindow['weekday'],
      startHour, endHour, score: w.score, battles: w.battlesIn,
      level, reason: '', plan: [], approved: false, dismissals: 0,
    };
  });
}

// ---- Insight candidates (rules) ----
export interface InsightCandidate { rule: string; numbers: Record<string, number>; labels: Record<string, string> }
export function insightCandidates(battles: Battle[], strongholds: Stronghold[]): { candidates: InsightCandidate[]; templates: string[] } {
  const candidates: InsightCandidate[] = [];
  const templates: string[] = [];
  const { counts } = heatMap(battles);
  const total = battles.length || 1;
  // Hard time
  let bestCell = { k: 0, wd: 0, col: 0 };
  counts.forEach((row, wd) => row.forEach((c, col) => { if (c > bestCell.k) bestCell = { k: c, wd, col }; }));
  if (bestCell.k >= 3 && bestCell.k / total >= 0.2) {
    candidates.push({ rule: 'hard_time', numbers: { k: bestCell.k, n: total }, labels: { weekday: WEEKDAYS_LONG[bestCell.wd], column: COLUMNS[bestCell.col] } });
    templates.push(`${WEEKDAYS_LONG[bestCell.wd]} ${COLUMNS[bestCell.col]} have been your hardest time: ${bestCell.k} of ${total} battles.`);
  }
  return { candidates, templates };
}

export function clusterToStoredShape(s: Stronghold): LieCluster {
  return { id: s.id, label: s.label, struggle: s.struggle, tokens: lieTokens(s.label), count: s.count, lastSeen: Date.now(), recentOutcomes: s.recentOutcomes };
}
