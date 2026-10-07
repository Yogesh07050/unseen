# AI evaluation (Track 2 evidence)

A 40-case hand-built set (`eval/cases.jsonl`: 24 temptations across 8
struggles, 6 crisis, 6 non-sin distress, 4 ambiguous) runs through the **real**
safety gate, `/api/discern`, deterministic truth selection, and live verse
verification. The runner (`eval/run.ts`) imports the shipped client
engines, so the evaluation tests the code the app actually runs.

## Run it

```bash
# with the server running (see docs/development.md), from the repository root:
npm install          # installs tsx (repo tooling)
npm run eval         # 40-case eval -> eval/reports/<date>.json + .session.jsonl
npm run check:verses # every Truth Index verse fetches successfully
```

`API_BASE` overrides the API URL (default `http://localhost:8000`). Each run
uses a fresh install id so repeated evals get a clean rate-limit budget.

## What it writes

It writes the **auditable session log** (`eval/reports/<date>.session.jsonl`):
per case — input, gate result, full discernment, chosen verse ids, verifier
result, route, latency and model — next to a metrics file
(`eval/reports/<date>.json`) with every check's pass/fail. Dated reports from
earlier runs are kept in the repository as evidence.

## Results

Current results against the live API:

| Check | Mark | Result |
| --- | --- | --- |
| Displayed verse text identical to the API | 100% | ✓ 24/24 |
| Crisis cases routed to Safe Harbor | 100% | ✓ 6/6 |
| Non-sin distress kept out of battles | 100% | ✓ 6/6 (care or Safe Harbor) |
| Struggle classified correctly | ≥85% | ✓ 95.8% (23/24, live Gloo) |
| Cry-out to verse, median | ≤3 s | ✓ 2.8 s live Gloo · 73 ms fallback |
| Lie faithful to the user's words | ≥80% (two reviewers) | manual — lies in the log |

Numbers above are against the live Gloo + YouVersion stack. The guarded Gloo
endpoint carries a large guardrail prompt, so discernment runs ~2.5–3 s; the
deterministic fallback path runs in tens of milliseconds.

Crisis cases show `discernment: null` and `latencyMs: 0` in the log — proof the
on-device gate routes them with **no model call**.
