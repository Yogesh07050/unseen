# UNSEEN — Armor for the unseen battle

> See the battle. Speak the Word. Walk free.

UNSEEN is a voice-first, cinematic Scripture companion for the moment of
temptation. You speak the struggle, the app discerns the lie behind it, and
Scripture — fetched and **verified** from the YouVersion Platform — becomes the
sword you speak aloud while a guardian drives the tempter off-screen. Every
battle is sealed on the phone, synced to the person's own account, and the
patterns forecast the hardest hours.

Built for the **Gloo AI Hackathon 2026, Track 2 (Scripture Beyond the App)**.
The product ships as a PWA and as a native Android app around the same code.

## Contents

- [What it does](#what-it-does)
- [How a battle works](#how-a-battle-works)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [API surface](#api-surface)
- [Scripts](#scripts)
- [Evaluation](#evaluation)
- [How it keeps its promises](#how-it-keeps-its-promises)
- [Key files](#key-files)
- [Documentation](#documentation)
- [Licence](#licence)

## What it does

- **Cry out by voice or text.** Audio is transcribed server-side with OpenAI
  Whisper; when no microphone or permission is available the app falls back to
  typing and the voice-status indicator says why.
- **Safety first, before any network call.** An on-device crisis gate routes
  self-harm and abuse language to **Safe Harbor** with no model call and no
  battle imagery. Non-sin distress goes to care mode, never a battle.
- **Model-driven discernment.** Gloo AI Studio (guarded Completions V2) names
  the struggle, the lie *in the person's own words*, what stirred it, triggers,
  context, front and intensity. Without credentials a deterministic classifier
  takes over, so the whole demo runs with no keys.
- **Scripture is the weapon, never generated.** The model only chooses
  *references* from the curated Truth Index plus YouVersion verse search; the
  phone byte-verifies every displayed verse against the API and shows the
  version's copyright notice. The public-domain Berean Standard Bible is
  bundled so battles work offline.
- **A cinematic battle.** Each phrase you speak is a strike; a climax at the
  cross, a way of escape, and an Ebenezer stone to remember it by.
- **Grace over streaks.** No counters reset; a fall becomes a *Rise Again*
  stone; success is measured by victories won from memory.
- **Patterns that forecast.** Schemes (lie clusters and strongholds), Kairos
  Watch (your hardest hours, exportable to a calendar without naming the
  struggle), Armory (verse sharpness and drills), Allies (content-free prayer
  links), Morning Armor and the Reel.
- **Private by architecture.** Battle content is sealed with a non-extractable
  AES-GCM key in IndexedDB. Only redacted text, verse ids and content-free
  prayer tokens ever leave the phone; transcripts never do. Accounts
  (username + password, no e-mail) own the synced copy; *Delete everything*
  wipes the server first.
- **Native Android shell.** Capacitor 6 adds haptics on each strike, the share
  sheet, hardware Back handling, themed splash and status bar, and
  `allowBackup="false"` so the sealed log is never cloud-backed-up.

## How a battle works

1. **Cry out** — record (Whisper) or type the struggle.
2. **Safety gate** — runs on the phone; crisis language opens Safe Harbor
   immediately, with no network call.
3. **Discern** — redacted text goes to `POST /api/discern`; the model (or the
   fallback) returns the struggle, the lie, triggers, context and search
   phrases. The person confirms or corrects it.
4. **Truth** — `POST /api/truth` builds a candidate pool (Truth Index verses for
   the struggle plus YouVersion search hits) and the model picks a primary verse
   and up to three ordered backups. The phone fetches the text and verifies it
   byte-for-byte before anything is shown.
5. **Battle** — speak the verse phrase by phrase; each matched phrase is a
   strike. *Still fighting* steps through the backups.
6. **Peace or Rise** — the climax at the cross, a way of escape, a reflection
   composed by the model, and a stone laid in the person's history.

## Architecture

```
┌──────────────────────────────┐        ┌───────────────────────────────┐
│  Phone                       │        │  FastAPI proxy (server/)       │
│  React + TypeScript PWA      │  /api  │  holds every API key           │
│  (browser, or Capacitor 6    │ ─────▶ │  redacts, rate-limits, caches  │
│   Android shell)             │        │  serves the built PWA at /     │
│                              │        └───────┬────────┬──────┬───────┘
│  safety gate · verifier      │                │        │      │
│  AES-GCM IndexedDB store     │     Gloo AI ◀──┘  YouVersion  OpenAI
│  sync outbox                 │     Studio        Platform    Whisper / TTS
└──────────────────────────────┘
                                        PostgreSQL — accounts, synced records,
                                                     prayer links, AI-call metadata
                                        Redis      — rate limits, verse cache
```

- The phone talks only to the proxy. No partner key is ever in the bundle.
- Gloo, YouVersion, OpenAI, PostgreSQL and Redis are all optional: each one
  missing degrades to a documented fallback and `GET /api/health` reports which
  are live.
- A circuit breaker makes a failing Gloo upstream fail fast to the deterministic
  path instead of costing the person seconds.

## Repository layout

The repository root is the project root the Technical Design Document calls
`unseen/`.

```
gloo-hackathon-UNSEEN/
├── app/                       React + TypeScript PWA (Vite) + Capacitor Android shell
│   ├── src/
│   │   ├── screens/           one file per route (Home, CryOut, Discern, Battle, Peace, Rise, …)
│   │   ├── scene/             the cinematic battle scene
│   │   ├── battle/            battle state machine (useBattle)
│   │   ├── engines/           safety gate, redaction, speech + audio, verse fetch + verify, phrase matcher
│   │   ├── ai/                typed client for the proxy
│   │   ├── data/              encrypted store, repos, auth, sync outbox, export
│   │   ├── analytics/         Schemes clusters, Kairos Watch, calendar export
│   │   ├── content/           Truth Index, ways of escape, archetypes, copy
│   │   ├── components/        Orb, NavBar, StoneTile, charts, UI primitives
│   │   ├── native/            Capacitor hooks (haptics, share, back, splash, status bar)
│   │   ├── styles/            design tokens and global CSS
│   │   └── App.tsx · main.tsx · store.ts · types.ts
│   ├── public/                manifest, service worker, icons, fonts, battle art
│   ├── android/               Gradle project generated by Capacitor 6
│   └── capacitor.config.ts · vite.config.ts · package.json
├── server/                    FastAPI proxy
│   ├── app/
│   │   ├── routers/           /api endpoints: ai, auth, bible, health, pray, speech, sync, truth
│   │   ├── services/          Gloo + circuit breaker, YouVersion, OpenAI STT/TTS, Postgres, Redis, prompts
│   │   ├── content/           bundled BSB verses and the Truth Index (JSON)
│   │   └── main.py · config.py · schemas.py · deps.py · middleware.py · errors.py
│   ├── static/                prebuilt PWA snapshot, served at / when STATIC_DIR is unset
│   └── requirements.txt
├── database/                  PostgreSQL migrations, schema snapshot, seeds (see its README)
├── eval/                      40-case AI evaluation: cases, runner, dated reports
├── scripts/                   check-verses.ts
├── docs/
│   ├── functional-design.md   Functional Design Document (product spec)
│   ├── technical-design.md    Technical Design Document (build spec)
│   ├── development.md         running locally, keys, accounts, Bible versions, demo walkthrough
│   ├── android.md             native Android shell: build, install, Windows setup, wireless debugging
│   ├── evaluation.md          the 40-case AI evaluation and its results
│   └── assets-and-ai-tools.md AI tools and assets disclosure (hackathon rules)
├── svg_images_dataset/        source artwork: pose takes, the chosen finals, props
├── Dockerfile · docker-compose.yml · .dockerignore
├── .env.example               every setting, documented — copy to .env
├── package.json               repo tooling: npm run eval, npm run check:verses
└── README.md · LICENSE · THIRD_PARTY_LICENSES.md
```

## Quick start

Commands run from the repository root. The entire app works **with no API
keys**: discernment uses the deterministic fallback and Scripture comes from
the bundled Berean Standard Bible. Add keys to `.env` to switch to the live
partner APIs.

### Local development (hot reload)

```bash
cp .env.example .env
```

```bash
cd server && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000
```

```bash
cd app && npm install && npm run dev
```

Open http://localhost:5173 (Vite proxies `/api` to port 8000; pass
`-- --port 5174` if 5173 is busy).

### One container (app, API, Redis, PostgreSQL)

```bash
cp .env.example .env && docker compose up --build
```

Open http://localhost:8000. The `migrate` one-shot service applies the
database migrations before the API starts.

### Native Android app

```bash
cd app && VITE_API_BASE=http://<your-lan-ip>:8000 npm run build:native && npm run android:apk
```

Requires JDK 17 and Android SDK platform 34. The full walkthrough, including a
from-nothing Windows setup and wireless debugging, is in
[docs/android.md](docs/android.md).

For the database, seeded accounts, Bible version selection, live keys and the
demo script, see [docs/development.md](docs/development.md).

## Configuration

All settings are read from `.env` at the repository root (copy `.env.example`).
Nothing is required.

| Variable | Purpose | When unset |
| --- | --- | --- |
| `GLOO_API_KEY` or `GLOO_CLIENT_ID` + `GLOO_CLIENT_SECRET` | Gloo AI Studio credentials for discernment, truth selection, composition and insight | deterministic on-device-equivalent fallback |
| `GLOO_MODEL_FAST` | Model id (default `gloo-anthropic-claude-haiku-4.5`) | default |
| `YVP_APP_KEY` | YouVersion Platform key: live verses, verse search, version list | only the bundled public-domain BSB is offered |
| `OPENAI_API_KEY` | Whisper transcription and read-aloud TTS | voice reports "off"; the app falls back to typing |
| `DATABASE_URL` | PostgreSQL DSN: accounts, synced records, prayer links, AI-call metadata | everything stays on the phone |
| `REDIS_URL` | Rate-limit counters and verse cache (required for the 2-worker Docker image) | in-memory store |
| `CORS_ORIGINS` | Origins allowed to call `/api` (the Capacitor WebView origin is listed by default) | default list |
| `STATIC_DIR` | Where the built PWA is served from | `static` (relative to `server/`) |
| `APP_BASE_URL` | Base for public prayer links `/p/<token>` | `http://localhost:8000` |
| `SEED_USER_PASSWORD` | Password the seed uses when it has to create an account | — |
| `VITE_API_BASE` | Build-time: API host for the native shell (same-origin when empty) | same origin |
| `ENV`, `LOG_LEVEL`, `DEFAULT_BIBLE_ID`, `MAX_AUDIO_SIZE_MB` | Server mode, logging, default Bible (3034 = BSB), upload cap | sensible defaults |

## API surface

Every route is under `/api` and served by `server/app/routers/`.
Interactive docs are at `/api/docs` in development.

| Area | Routes | Notes |
| --- | --- | --- |
| AI | `POST /discern`, `POST /truth`, `POST /compose`, `POST /insight` | Redacted text in; struggle, lie, verse references, reflection and weekly insight out. Metadata-only audit rows in PostgreSQL. |
| Truth Index | `GET /truth-index` | The curated struggle → lie → verses index, from PostgreSQL or the bundled JSON. |
| Scripture | `GET /verse/{bibleId}/{usfm}`, `GET /bibles`, `GET /bible/{bibleId}`, `GET /verse-search`, `GET /votd` | YouVersion Platform proxy with caching; BSB fallback that is always labelled as the BSB. |
| Voice | `POST /transcribe`, `POST /speak` | OpenAI Whisper speech-to-text; OpenAI text-to-speech for read-aloud. |
| Prayer links | `POST /pray`, `GET /pray/{token}`, `POST /pray/{token}/ack` | Content-free tokens an ally can acknowledge (0–10 acks, expiring). |
| Accounts | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | scrypt password hashes, 30-day bearer sessions, lockout after repeated failures. |
| Sync | `GET /me?since=`, `POST /me`, `DELETE /me` | Pull changes, push the phone's outbox, delete everything. |
| Health | `GET /health` | Reports Redis, PostgreSQL, Gloo (and its circuit breaker), YouVersion and OpenAI status. |

## Scripts

| Where | Command | Does |
| --- | --- | --- |
| `app` | `npm run dev` | Vite dev server with the `/api` proxy |
| `app` | `npm run build` | Production PWA into `app/dist` |
| `app` | `npm run typecheck` | `tsc --noEmit` |
| `app` | `npm run build:native` | Build and `cap sync android` |
| `app` | `npm run android:assets` | Regenerate launcher icon and splash from `public/icons` |
| `app` | `npm run android:apk` | Debug APK via Gradle |
| `app` | `npm run android:open` | Open the project in Android Studio |
| repo root | `npm run eval` | The 40-case AI evaluation against a running API |
| repo root | `npm run check:verses` | Every Truth Index verse fetches successfully |
| repo root | `python database/migrate.py [--status]` | Apply (or inspect) the SQL migrations |
| repo root | `python database/seeds/seed.py` | Reference data plus a synthetic, content-free dev dataset |
| repo root | `python database/seeds/seed_user.py --username <u> --name <n>` | Give an account an eight-week history |

## Evaluation

A 40-case hand-built set (24 temptations across 8 struggles, 6 crisis, 6
non-sin distress, 4 ambiguous) runs through the real safety gate,
`/api/discern`, truth selection and live verse verification, and writes an
auditable per-case session log.

| Check | Mark | Result |
| --- | --- | --- |
| Displayed verse text identical to the API | 100% | ✓ 24/24 |
| Crisis cases routed to Safe Harbor | 100% | ✓ 6/6 |
| Non-sin distress kept out of battles | 100% | ✓ 6/6 |
| Struggle classified correctly | ≥85% | ✓ 95.8% (23/24, live Gloo) |
| Cry-out to verse, median | ≤3 s | ✓ 2.8 s live Gloo · 73 ms fallback |

Details, the raw reports and how to re-run it: [docs/evaluation.md](docs/evaluation.md).

## How it keeps its promises

- **Scripture is the weapon, never generated.** The model only chooses
  *references*; a code-level verifier confirms displayed text is byte-identical
  to the API and the `<Vellum>` component accepts only a `VerifiedVerse`.
- **Private by default.** Battle content is sealed with a non-extractable
  AES-GCM key in IndexedDB. Only redacted text, verse ids and content-free
  prayer tokens ever leave the phone. *Delete everything* clears it all.
- **Safety first.** An on-device crisis gate runs *before* any network call and
  routes to Safe Harbor; non-sin distress goes to care mode, never a battle.
- **Grace over streaks.** No counters reset; a fall becomes a Rise Again stone;
  success is measured by victories won from memory.

## Key files

| Area | Path |
| --- | --- |
| Battle state machine | `app/src/battle/useBattle.ts` |
| Safety gate / redaction | `app/src/engines/safetyGate.ts`, `app/src/engines/redact.ts` |
| Verse verifier | `app/src/engines/verify.ts` |
| Phrase splitter / matcher | `app/src/engines/segment.ts`, `app/src/engines/matcher.ts` |
| Encrypted store and sync | `app/src/data/crypto.ts`, `app/src/data/db.ts`, `app/src/data/repos.ts`, `app/src/data/sync.ts` |
| Accounts (client) | `app/src/data/auth.ts`, `app/src/screens/Auth.tsx` |
| Analytics / Kairos | `app/src/analytics/index.ts`, `app/src/analytics/ics.ts` |
| Cinematic scene | `app/src/scene/Scene.tsx` |
| Native shell | `app/src/native/index.ts`, `app/capacitor.config.ts` |
| AI proxy and prompts | `server/app/routers/ai.py`, `server/app/services/prompts.py`, `server/app/services/fallback.py` |
| Gloo client + circuit breaker | `server/app/services/gloo.py` |
| Whisper STT / TTS | `server/app/routers/speech.py`, `server/app/services/openai_stt.py`, `server/app/services/openai_tts.py`, `app/src/engines/audio.ts` |
| Bible proxy + offline BSB | `server/app/routers/bible.py`, `server/app/services/youversion.py` |
| Accounts (server) | `server/app/routers/auth.py`, `server/app/services/auth.py` |
| PostgreSQL access | `server/app/services/db.py`, `database/migrations/` |

## Documentation

| Document | What it covers |
| --- | --- |
| [docs/development.md](docs/development.md) | Run options, voice input, keyless mode, accounts and data, Bible versions, live keys, the demo walkthrough, troubleshooting |
| [docs/android.md](docs/android.md) | The Capacitor shell, building and installing the APK, Windows setup, wireless debugging |
| [docs/evaluation.md](docs/evaluation.md) | The AI evaluation set, how to run it, results |
| [docs/functional-design.md](docs/functional-design.md) | Functional Design Document |
| [docs/technical-design.md](docs/technical-design.md) | Technical Design Document the MVP was built from |
| [docs/assets-and-ai-tools.md](docs/assets-and-ai-tools.md) | Every AI tool and asset, with its source |
| [database/README.md](database/README.md) | What PostgreSQL holds, migrations, seeds |
| [svg_images_dataset/README.md](svg_images_dataset/README.md) | Source artwork and how it maps to the app's art |

## Licence

MIT — see [LICENSE](LICENSE). Third-party licences, including the Berean
Standard Bible text and the Alegreya fonts, are listed in
[THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
