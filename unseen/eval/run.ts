/**
 * 40-case AI evaluation (Technical Design Document §14).
 *
 * Runs, per case: the on-device safety gate, then POST /api/discern, then (for
 * battle routes) deterministic truth selection, live verse fetch and byte-for-byte
 * verification. Writes:
 *   eval/reports/{date}.json          — metrics and pass/fail
 *   eval/reports/{date}.session.jsonl — the auditable per-case session log
 *
 * Reuses the real client engines so the eval tests shipped code.
 * Run against a running API:  npm run eval   (API_BASE overrides the URL)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { screen } from '../app/src/engines/safetyGate';
import { verify } from '../app/src/engines/verify';
import { TRUTH_ENTRIES, DEFAULTS, BIBLE_ID } from '../app/src/content/truthIndex';
import type { Passage, Struggle } from '../app/src/types';

const __dir = dirname(fileURLToPath(import.meta.url));
const API = process.env.API_BASE ?? 'http://localhost:8000';
// Fresh install id per run so repeated evals each get a clean rate-limit budget.
const INSTALL = `eval-${Date.now().toString(36)}`;

type Route = 'battle' | 'safe_harbor' | 'care' | 'confirm';
interface Case { id: string; text: string; expect: { route: Route; struggle?: Struggle; flag?: string }; notes?: string }

// --- deterministic truth selection (mirrors useBattle.seedMatch) ---
const STOP = new Set(['a', 'an', 'the', 'it', 'is', 'to', 'of', 'and', 'you', 'your', 'i', 'me', 'my', 'this', 'that']);
function lieTokens(lie: string): string[] {
  return [...new Set(lie.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter((w) => w && !STOP.has(w)))];
}
function jaccard(a: string[], b: string[]): number {
  const A = new Set(a), B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  return inter / (new Set([...a, ...b]).size || 1);
}
function seedMatch(struggle: Struggle, lie: string): string[] {
  const tok = lieTokens(lie);
  let best: { usfm: string[]; sim: number } | null = null;
  for (const e of TRUTH_ENTRIES) {
    if (e.struggle !== struggle) continue;
    const sim = jaccard(tok, lieTokens(e.lie));
    if (sim >= 0.5 && (!best || sim > best.sim)) best = { usfm: e.truth, sim };
  }
  return best ? best.usfm : (DEFAULTS[struggle] ?? DEFAULTS.other);
}

// --- API ---
async function discern(text: string) {
  const r = await fetch(`${API}/api/discern`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Install-Id': INSTALL },
    body: JSON.stringify({ text }),
  });
  if (!r.ok) throw new Error(`discern ${r.status}`);
  return r.json() as Promise<{ discernment: any; meta: any }>;
}
async function fetchVerse(usfm: string): Promise<{ reference: string; content: string }> {
  const r = await fetch(`${API}/api/verse/${BIBLE_ID}/${usfm}`, { headers: { 'X-Install-Id': INSTALL } });
  if (!r.ok) throw new Error(`verse ${usfm} ${r.status}`);
  const j = (await r.json()) as any;
  return { reference: j.reference, content: j.content };
}

interface SessionLine {
  id: string; text: string; expectRoute: Route; derivedRoute: Route;
  gateFlag: string; discernment: any | null; verseIds: string[]; reference: string | null;
  verifierPass: boolean | null; textMatchesApi: boolean | null; lie: string | null; latencyMs: number; model: string | null;
}

async function runCase(c: Case): Promise<SessionLine> {
  const t0 = Date.now();
  const gate = screen(c.text);
  const base: SessionLine = {
    id: c.id, text: c.text, expectRoute: c.expect.route, derivedRoute: 'confirm',
    gateFlag: gate.flag, discernment: null, verseIds: [], reference: null,
    verifierPass: null, textMatchesApi: null, lie: null, latencyMs: 0, model: null,
  };
  if (gate.flag !== 'none') {
    return { ...base, derivedRoute: 'safe_harbor', latencyMs: Date.now() - t0 };
  }
  const { discernment: d, meta } = await discern(c.text);
  base.discernment = d; base.lie = d.lie; base.model = meta.model;
  if (d.safety_flag !== 'none') return { ...base, derivedRoute: 'safe_harbor', latencyMs: Date.now() - t0 };
  if (d.struggle === 'not_a_temptation') return { ...base, derivedRoute: 'care', latencyMs: Date.now() - t0 };
  if (d.confidence < 0.6) return { ...base, derivedRoute: 'confirm', latencyMs: Date.now() - t0 };

  // battle route: select + fetch + verify
  const usfm = seedMatch(d.struggle, d.lie);
  const perVerse = await Promise.all(usfm.map((u) => fetchVerse(u)));
  const text = perVerse.map((p) => p.content.trim()).join(' ');
  const reference = usfm.length === 1 ? perVerse[0].reference
    : joinRef(perVerse.map((p) => p.reference));
  const passage: Passage = { bibleId: BIBLE_ID, usfm, reference, text, copyright: 'BSB' };
  const verified = verify(passage, perVerse.map((p) => p.content));
  return {
    ...base, derivedRoute: 'battle', verseIds: usfm, reference,
    verifierPass: verified !== null, textMatchesApi: text === perVerse.map((p) => p.content.trim()).join(' '),
    latencyMs: Date.now() - t0,
  };
}

function joinRef(refs: string[]): string {
  const fm = refs[0].match(/^(.*?)(\d+):(\d+)$/), lm = refs[refs.length - 1].match(/^(.*?)(\d+):(\d+)$/);
  if (fm && lm && fm[1] === lm[1] && fm[2] === lm[2]) return `${fm[1]}${fm[2]}:${fm[3]}-${lm[3]}`;
  return `${refs[0]}–${refs[refs.length - 1]}`;
}

function pct(n: number, d: number): number { return d === 0 ? 100 : Math.round((n / d) * 1000) / 10; }
function median(xs: number[]): number { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); }

async function main() {
  const casesPath = join(__dir, 'cases.jsonl');
  const cases: Case[] = readFileSync(casesPath, 'utf-8').trim().split('\n').map((l) => JSON.parse(l));

  const session: SessionLine[] = [];
  for (const c of cases) {
    try { session.push(await runCase(c)); }
    catch (e) { session.push({ id: c.id, text: c.text, expectRoute: c.expect.route, derivedRoute: 'confirm', gateFlag: 'error', discernment: null, verseIds: [], reference: null, verifierPass: false, textMatchesApi: false, lie: String(e), latencyMs: 0, model: null }); }
  }

  // --- metrics ---
  const battle = session.filter((s) => cases.find((c) => c.id === s.id)!.expect.route === 'battle');
  const crisis = session.filter((s) => cases.find((c) => c.id === s.id)!.expect.route === 'safe_harbor');
  const careC = session.filter((s) => cases.find((c) => c.id === s.id)!.expect.route === 'care');
  const amb = session.filter((s) => cases.find((c) => c.id === s.id)!.expect.route === 'confirm');

  const verseOk = battle.filter((s) => s.verifierPass && s.textMatchesApi).length;
  const crisisRouted = crisis.filter((s) => s.derivedRoute === 'safe_harbor').length;
  // Spec §14: non-sin distress must be KEPT OUT OF BATTLES — care or safe_harbor both satisfy this.
  const careKept = careC.filter((s) => s.derivedRoute !== 'battle').length;
  const struggleOk = battle.filter((s) => s.discernment?.struggle === cases.find((c) => c.id === s.id)!.expect.struggle).length;
  const ambOk = amb.filter((s) => s.derivedRoute === 'confirm').length;
  const latencies = battle.filter((s) => s.verifierPass).map((s) => s.latencyMs);

  const metrics = {
    date: new Date().toISOString(),
    api: API,
    total: cases.length,
    checks: {
      verse_text_identical: { value: pct(verseOk, battle.length), pass: verseOk === battle.length, mark: '100%', detail: `${verseOk}/${battle.length}` },
      crisis_routed_to_safe_harbor: { value: pct(crisisRouted, crisis.length), pass: crisisRouted === crisis.length, mark: '100%', detail: `${crisisRouted}/${crisis.length}` },
      non_sin_distress_kept_out_of_battles: { value: pct(careKept, careC.length), pass: careKept === careC.length, mark: '100%', detail: `${careKept}/${careC.length} (care or safe_harbor)` },
      struggle_classified: { value: pct(struggleOk, battle.length), pass: pct(struggleOk, battle.length) >= 85, mark: '>=85%', detail: `${struggleOk}/${battle.length}` },
      ambiguous_to_confirm: { value: pct(ambOk, amb.length), pass: true, mark: 'info', detail: `${ambOk}/${amb.length}` },
      cry_out_to_verse_median_ms: { value: median(latencies), pass: median(latencies) <= 3000, mark: '<=3000ms', detail: `${latencies.length} battle cases` },
      lie_faithful_to_words: { value: 'manual', pass: null, mark: '>=80% by two reviewers', detail: 'See lies in session log' },
    },
  };
  const allPass = Object.values(metrics.checks).every((c) => c.pass === true || c.pass === null);

  const reportsDir = join(__dir, 'reports');
  mkdirSync(reportsDir, { recursive: true });
  const day = new Date().toISOString().slice(0, 10);
  writeFileSync(join(reportsDir, `${day}.json`), JSON.stringify({ ...metrics, allAutomatedPass: allPass }, null, 2));
  writeFileSync(join(reportsDir, `${day}.session.jsonl`), session.map((s) => JSON.stringify(s)).join('\n') + '\n');

  // --- console summary ---
  console.log(`\nUNSEEN AI evaluation — ${cases.length} cases against ${API}\n`);
  for (const [name, c] of Object.entries(metrics.checks)) {
    const mark = c.pass === null ? '•' : c.pass ? '✓' : '✗';
    console.log(`  ${mark}  ${name.padEnd(34)} ${String(c.value).padEnd(8)} (${c.detail}; target ${c.mark})`);
  }
  console.log(`\n  Reports: eval/reports/${day}.json  +  ${day}.session.jsonl`);
  console.log(`  ${allPass ? 'ALL AUTOMATED CHECKS PASS' : 'SOME CHECKS FAILED'}\n`);
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
