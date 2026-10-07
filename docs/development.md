# Development guide

Commands run from the repository root unless noted. The server reads `.env`
at the repository root (copy `.env.example`; keep real keys out of the
example).

## Contents

- [Run it](#run-it)
- [Runs with no API keys](#runs-with-no-api-keys)
- [Live keys](#live-keys)
- [Voice input uses OpenAI Whisper](#voice-input-uses-openai-whisper)
- [Discernment and verse choice are model-driven](#discernment-and-verse-choice-are-model-driven)
- [Accounts and your data](#accounts-and-your-data)
- [Bible versions (YouVersion Platform)](#bible-versions-youversion-platform)
- [Trying the demo](#trying-the-demo)
- [Troubleshooting](#troubleshooting)

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
npm run dev     # open http://localhost:5173  (add `-- --port 5174` if 5173 is taken)
```

### Option B — one container (serves app + API)

```bash
cp .env.example .env     # optionally add GLOO_* / YVP_APP_KEY / OPENAI_API_KEY
docker compose up --build
# open http://localhost:8000
```

`docker compose` starts Redis and PostgreSQL alongside the API; the `migrate`
one-shot service applies `database/migrations/*.sql` before the app starts.

### Option C — build once, serve from FastAPI

```bash
cd app && npm install && npm run build
cd ../server && . .venv/bin/activate
STATIC_DIR=../app/dist uvicorn app.main:app --port 8000
# open http://localhost:8000
```

With `STATIC_DIR` unset the server serves `server/static/`, a prebuilt snapshot
of the PWA kept in the repository so `uvicorn` alone shows the app. Rebuild and
copy `app/dist` over it (or point `STATIC_DIR` at `app/dist`) after changing the
web code.

### The database

PostgreSQL is optional. Without `DATABASE_URL` everything stays on the phone,
prayer links live in Redis/memory and the Truth Index is served from the
bundled JSON. With it, accounts, synced records, prayer links and AI-call
metadata are durable. Create → migrate → seed → run is documented in
[`database/README.md`](../database/README.md); in short:

```bash
server/.venv/bin/python database/migrate.py          # --status to inspect
server/.venv/bin/python database/seeds/seed.py       # reference data + synthetic dev rows
```

## Runs with no API keys

Scripture integrity and safety are designed to work offline, so the **entire
demo runs without any credentials**:

- No **Gloo** key → the server uses a deterministic, on-device-equivalent
  discernment/compose fallback (the same keyword classifier the phone uses when
  offline).
- No **YouVersion** key → the server serves the bundled public-domain **Berean
  Standard Bible** text and offers no other version. Displayed verses are still
  verified against the API response, so the `VerifiedVerse` guarantee holds.
- No **OpenAI** key → `/api/health` reports voice as off and the app falls back
  to typing, saying why.

Add real keys in `.env` to switch to the live partner APIs. Nothing else
changes. A circuit breaker makes a failing Gloo upstream **fail fast** to the
deterministic path instead of costing users seconds (`/api/health` reports it
as `glooCircuit`).

## Live keys

Copy `.env.example` to a gitignored `.env` (the server reads `.env`, not the
example). With a `YVP_APP_KEY`, verses are fetched live from YouVersion; with
`GLOO_*`, discernment/compose use Gloo; with `OPENAI_API_KEY`, voice capture and
read-aloud work. Keep real keys out of `.env.example`.

## Voice input uses OpenAI Whisper

Voice capture (Cry out, and reading the verse in battle) records audio with the
microphone and transcribes it server-side via **OpenAI Whisper**
(`POST /api/transcribe`, fixed to the `whisper-1` model). The app does not use
browser speech-recognition APIs or speech-recognition extensions. When no
microphone/permission is available, it falls back to typing. Set
`OPENAI_API_KEY` to enable transcription.

Read-aloud controls use the server's OpenAI text-to-speech endpoint
(`POST /api/speak`); Whisper is the only speech-to-text engine. Audio playback
uses the browser's standard audio player, not browser speech synthesis.

The Cry Out screen shows a **voice-status indicator** (a coloured dot + reason):
green "Voice ready" / "Listening", amber "Allow the microphone…" / "Hearing you…"
/ "Didn't catch that", grey "Microphone blocked / Voice service off / not
supported — using typing", red "Voice didn't work". It probes capability,
microphone permission, and server readiness (`/api/health` → `openai`) up front,
so the fallback to typing always shows *why*, and the orb reacts to your voice
(the audio context is resumed so the level meter is live).

## Discernment and verse choice are model-driven

With Gloo credentials, every battle runs through the model (`discernMode:
'gloo'`, the default): the discernment prompt (`server/app/services/prompts.py`,
`discern@2`) reads the person's words and reports the struggle, **the lie in
their own words**, what stirred it, triggers, context, front, intensity,
confidence and two or three topical search phrases. The server then builds a
candidate pool for `POST /api/truth` — the curated Truth Index verses for that
struggle plus **YouVersion verse-search hits** for the lie and the search
phrases — fetches each candidate's text in the chosen version and asks the model
to pick a primary verse and up to three ordered backups, which the phone
byte-verifies before showing. "Still fighting" steps through the backups.

Offline, or with "On this phone only" chosen in Settings, an on-device read
runs instead: it still derives the lie from the person's own clause, the
triggers and context from the words present, and picks the closest curated
verse; the card says so and asks for a correction.

## Accounts and your data

The app opens on a sign-in page (username + password, no e-mail). Accounts live
in the `users` table (`database/migrations/0003_users.sql`): usernames are
3–32 lower-case characters, passwords are at least 8 and stored only as
scrypt hashes with a per-user salt (`server/app/services/auth.py`). Signing in
checks the table once: the password is verified in constant time (a dummy hash
is checked when the username does not exist, so timing reveals nothing), eight
failed attempts lock the username for fifteen minutes, and a successful
sign-in issues a 30-day bearer token whose SHA-256 is kept in `sessions`.
The session carries the person until "Sign out" in Settings (which revokes it
and clears the phone) or expiry; a 401 from the server sends the app back to
sign-in. Registration is self-serve from the same page.

Data is owned by the account. The phone keeps an AES-GCM sealed copy of
everything and pushes each write through an outbox to `POST /api/me`; on boot
and when the connection returns it pulls changes with `GET /api/me?since=`.
Signing in on an install links it to the account and claims the anonymous
history that phone recorded before, so battles, stones, allies, Armory and
Watch windows follow the login to any phone. Spoken transcripts never leave the
phone. "Delete everything" wipes the account's server copy first
(`DELETE /api/me`). See [`database/README.md`](../database/README.md).

To give an account a lived-in history (Stones, Schemes, Watch, Armory, Allies),
creating the user if needed (password from `SEED_USER_PASSWORD` in `.env`):

```bash
server/.venv/bin/python database/seeds/seed_user.py --username yogesh --name Yogesh
```

## Bible versions (YouVersion Platform)

With a `YVP_APP_KEY`, `GET /api/bibles` lists the English Bibles the key is
licensed for (`GET /v1/bibles?language_ranges[]=en` upstream, cached 6 h).
The onboarding "Bible version" step and Settings → "Bible version" let the
user pick one; the choice is `settings.bibleId` on the phone. Every verse is
then fetched live (`/api/verse/{bibleId}/{usfm}`) and displayed with the
reference, the version's title and the copyright notice YouVersion supplies
for it (`/api/bible/{bibleId}`), as the licence requires. If a chosen version
cannot serve a verse (upstream down, verse not in that version's canon) the
public-domain BSB stands in **and is labelled as the BSB** — text from one
version is never shown under another's name. Licensed text is cached on the
phone for a week; the BSB for good, so battles work offline.

## Trying the demo

1. Sign in (or register), then finish the short onboarding (18+, name,
   tradition, Bible).
2. On Home, tap **or tap to type**, enter:
   *"My brother just humiliated me in the family chat and I want to fire back
   something cruel."*
3. Confirm the discernment — the model names the struggle and the lie in your
   own words (Anger · "He deserves to hear it.") — read/tap the verse the model
   chose from the Truth Index and YouVersion search, strike each phrase, watch
   the climax at the cross, pick a way of escape, and lay a stone.
4. **Safe Harbor edge case:** type *"I don't want to be alive anymore"* — it
   opens Safe Harbor with **no network call and no battle imagery**.
5. **Patterns:** give the install an eight-week history from the server
   (`server/.venv/bin/python database/seeds/seed_user.py --all-recent --name Yogesh`,
   then reopen the app), and open **Schemes** (Sunday "6 to 9" is darkest;
   the Friday "Just five more minutes." lie is a stronghold), **Stones**,
   **Armory**, **Allies** and **Watch** (a Sunday-evening window; calendar
   export names no struggle).

## Troubleshooting

- **Moved the repository?** Recreate the server venv
  (`python3 -m venv --clear .venv && pip install -r requirements.txt`) — venv
  entry scripts hard-code their original path. Until then
  `.venv/bin/python -m uvicorn app.main:app …` still works.
- **Phone cannot reach the API?** Start it with `--host 0.0.0.0`, keep port 8000
  open on the firewall, and build the native bundle with `VITE_API_BASE`
  pointing at this machine's LAN address (see [android.md](android.md)).
- **Gloo answers come from the fallback?** `GET /api/health` shows `gloo`
  (credentials present) and `glooCircuit` (breaker state); the `model` column in
  `ai_interactions` records `fallback-classifier` when the model was skipped.
- **YouVersion returns 429?** Bursts are rate-limited upstream; verse texts and
  searches are cached in Redis for a day and the BSB stands in. Avoid hammering
  the Platform from loops.
