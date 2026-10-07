# UNSEEN — Armor for the unseen battle

> See the battle. Speak the Word. Walk free.

A voice-first, cinematic Scripture companion for the moment of temptation. You
speak the struggle, the app discerns the lie behind it, and Scripture — fetched
and **verified** from the YouVersion Platform — becomes the sword you speak
aloud while a guardian drives the tempter off-screen. Every battle is logged
**encrypted, on the phone only**, and the patterns forecast your hardest hours.

Built for the Gloo AI Hackathon 2026, Track 2 (Scripture Beyond the App).
This repository implements the hackathon MVP from the Technical Design Document.

## What's here

- **`app/`** — React + TypeScript PWA (Vite). Design system, battle state
  machine, speech capture + phrase matcher, encrypted IndexedDB store, analytics
  and Kairos Watch, and every screen.
- **`server/`** — FastAPI proxy. Holds the API keys, forwards redacted text to
  Gloo and verse requests to YouVersion, rate-limits, and serves the PWA.

### Voice input uses OpenAI Whisper

Voice capture (Cry out, and reading the verse in battle) records audio and
records it with the microphone and transcribes it server-side via **OpenAI
Whisper** (`POST /api/transcribe`, fixed to the `whisper-1` model). The
app does not use browser speech-recognition APIs or speech-recognition
extensions. When no microphone/permission is available, it falls back to
typing. Set `OPENAI_API_KEY` to enable transcription.

Read-aloud controls use the server's OpenAI text-to-speech endpoint; Whisper is
the only speech-to-text engine. Audio playback uses the browser's standard
audio player, not browser speech synthesis.

The Cry Out screen shows a **voice-status indicator** (a coloured dot + reason):
green "Voice ready" / "Listening", amber "Allow the microphone…" / "Hearing you…"
/ "Didn't catch that", grey "Microphone blocked / Voice service off / not
supported — using typing", red "Voice didn't work". It probes capability,
microphone permission, and server readiness (`/api/health` → `openai`) up front,
so the fallback to typing always shows *why*, and the orb reacts to your voice
(the audio context is resumed so the level meter is live).

### Runs with no API keys

Scripture integrity and safety are designed to work offline, so the **entire
demo runs without any credentials**:

- No **Gloo** key → the server uses a deterministic, on-device-equivalent
  discernment/compose fallback (the same keyword classifier the phone uses when
  offline).
- No **YouVersion** key → the server serves the bundled public-domain **Berean
  Standard Bible** text. Displayed verses are still verified against the API
  response, so the `VerifiedVerse` guarantee holds.

Add real keys in `.env` to switch both to the live partner APIs. Nothing else
changes.

## Run it

### Option A — local dev (two processes, hot reload)

```bash
# 1. Server
cd server
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 2. App (new terminal) — Vite proxies /api to :8000
cd app
npm install
npm run dev     # open http://localhost:5173
```

### Option B — one container (serves app + API)

```bash
cp .env.example .env     # optionally add GLOO_* / YVP_APP_KEY
docker compose up --build
# open http://localhost:8000
```

### Option C — build once, serve from FastAPI

```bash
cd app && npm install && npm run build
cd ../server && . .venv/bin/activate
STATIC_DIR=../app/dist uvicorn app.main:app --port 8000
# open http://localhost:8000
```

## Trying the demo

1. Finish the short onboarding (18+, name, tradition, Bible).
2. On Home, tap **or tap to type**, enter:
   *"My brother just humiliated me in the family chat and I want to fire back
   something cruel."*
3. Confirm the discernment (Anger · "He deserves it."), read/tap the verse to
   strike each phrase, watch the climax at the cross, pick a way of escape, and
   lay a stone.
4. **Safe Harbor edge case:** type *"I don't want to be alive anymore"* — it
   opens Safe Harbor with **no network call and no battle imagery**.
5. **Patterns:** Settings → **Demo controls** → *Load 8 weeks of demo data*,
   then open **Schemes** (Sunday "6 to 9" is darkest; "He deserves it." is a
   stronghold) and **Watch** (a Sunday-evening window; calendar export names no
   struggle).

## AI evaluation (Track 2 evidence)

A 40-case hand-built set (`eval/cases.jsonl`: 24 temptations across 8 struggles,
6 crisis, 6 non-sin distress, 4 ambiguous) runs through the **real** safety gate,
`/api/discern`, deterministic truth selection, and live verse verification.

```bash
# with the server running (see above):
npm install          # installs tsx (repo root)
npm run eval         # 40-case eval -> eval/reports/<date>.json + .session.jsonl
npm run check:verses # every Truth Index verse fetches successfully
```

It writes the **auditable session log** (`eval/reports/<date>.session.jsonl`):
per case — input, gate result, full discernment, chosen verse ids, verifier
result, route, latency and model. Current results against the live API:

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

## Live keys

Copy `.env.example` to a gitignored `.env` (the server reads `.env`, not the
example). With a `YVP_APP_KEY`, verses are fetched live from YouVersion; with
`GLOO_*`, discernment/compose use Gloo. Keep real keys out of `.env.example`.

## How it keeps its promises

- **Scripture is the weapon, never generated.** The model only chooses
  *references*; a code-level verifier confirms displayed text is byte-identical
  to the API and the `<Vellum>` component accepts only a `VerifiedVerse`.
- **Private by default.** Battle content is sealed with a non-extractable
  AES-GCM key in IndexedDB. Only redacted text, verse ids and content-free
  prayer tokens ever leave the phone. "Delete everything" clears it all.
- **Safety first.** An on-device crisis gate runs *before* any network call and
  routes to Safe Harbor; non-sin distress goes to care mode, never a battle.
- **Grace over streaks.** No counters reset; a fall becomes a Rise Again stone;
  success is measured by victories won from memory.

## Key files

| Area | Path |
| --- | --- |
| Battle state machine | `app/src/battle/useBattle.ts` |
| Safety gate / redaction | `app/src/engines/safetyGate.ts`, `redact.ts` |
| Verse verifier | `app/src/engines/verify.ts` |
| Phrase splitter / matcher | `app/src/engines/segment.ts`, `matcher.ts` |
| Encrypted store | `app/src/data/crypto.ts`, `db.ts`, `repos.ts` |
| Analytics / Kairos | `app/src/analytics/index.ts`, `ics.ts` |
| AI proxy | `server/app/routers/ai.py`, `services/prompts.py` |
| Whisper STT | `server/app/routers/speech.py`, `services/openai_stt.py`, `app/src/engines/audio.ts` |
| Bible proxy + offline BSB | `server/app/routers/bible.py`, `services/youversion.py` |

See `LICENSE`, `THIRD_PARTY_LICENSES.md` and `ASSETS.md`.
