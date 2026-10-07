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
- **`app/android/`** — the native **Android app**: a Capacitor 6 shell (standard
  Gradle/Kotlin project) around the same web code. See *Android app* below.

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
  Standard Bible** text and offers no other version. Displayed verses are still
  verified against the API response, so the `VerifiedVerse` guarantee holds.

Add real keys in `.env` to switch both to the live partner APIs. Nothing else
changes. A circuit breaker makes a failing Gloo upstream **fail fast** to the
deterministic path instead of costing users seconds (`/api/health` reports it
as `glooCircuit`). Copy `.env.example` to get started.

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

## Android app (native shell)

The PWA ships as a real Android app through **Capacitor 6** — `app/android/` is
a standard Gradle/Kotlin project. Every screen, engine and animation is the web
code, unchanged; the shell adds what only the platform can do:

- Native haptics on each Scripture strike, the native share sheet (Allies,
  Reel), hardware **Back** (un-hides the privacy screen / goes back / steps out
  from Home — never kills a battle), splash + status bar that follow the theme,
  and online/offline from the OS.
- `allowBackup="false"` — the encrypted log is never cloud-backed-up.

Requirements: **JDK 17** (Capacitor 6 / AGP 8.2.1) and Android SDK platform 34.

```bash
cd app
# 1. Web bundle pointed at your backend. The WebView serves the UI from its own
#    origin, so the API host must be explicit (your LAN IP for a device demo):
VITE_API_BASE=http://192.168.0.123:8000 npm run build:native   # vite build + cap sync
# 2. Launcher icon + splash (generated from public/icons; re-run if they change)
npm run android:assets
# 3. Debug APK
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 ANDROID_HOME=~/Android/Sdk
npm run android:apk        # → android/app/build/outputs/apk/debug/app-debug.apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### Setting up on Windows (from nothing to the phone)

1. **Install the tools** (all free): Git for Windows; Node.js 20 LTS; Python
   3.12 (tick *Add python.exe to PATH*); JDK 17 (Adoptium Temurin, tick *Set
   JAVA_HOME*); Android Studio, then in its SDK Manager add *Android 14 (API
   34)*, *Build-Tools 34* and *Platform-Tools*; PostgreSQL 16 (or Docker
   Desktop and the `docker run … postgres:16` line in `database/README.md`).
2. **Environment variables** (Settings → System → About → Advanced → Environment
   Variables): `ANDROID_HOME = %LOCALAPPDATA%\Android\Sdk`, `JAVA_HOME` to the
   JDK 17 folder, and add `%ANDROID_HOME%\platform-tools` to `Path` so `adb`
   works in any terminal. Open a new PowerShell afterwards.
3. **Get the code and configure it**
   ```powershell
   git clone <this repository> ; cd gloo-hackathon-UNSEEN\unseen
   copy .env.example .env          # then edit .env: DATABASE_URL, YVP_APP_KEY, GLOO_*, OPENAI_API_KEY, SEED_USER_PASSWORD
   ```
4. **Server, database, seed**
   ```powershell
   cd server ; py -3.12 -m venv .venv ; .venv\Scripts\Activate.ps1 ; pip install -r requirements.txt ; cd ..
   python database\migrate.py
   python database\seeds\seed.py
   python database\seeds\seed_user.py --username yogesh --name Yogesh
   cd server ; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000     # leave this running
   ```
   Allow the port through the firewall once (admin PowerShell):
   `netsh advfirewall firewall add rule name="UNSEEN API" dir=in action=allow protocol=TCP localport=8000`
5. **Web app** (second terminal): `cd app ; npm install ; npm run dev -- --port 5174`,
   then open http://localhost:5174 and sign in.
6. **Find this PC's Wi-Fi address**: `ipconfig` → *IPv4 Address* of the Wi-Fi
   adapter (e.g. 192.168.0.123). The phone must be on the same Wi-Fi.
7. **Build the Android app against that address** (PowerShell):
   ```powershell
   cd app
   $env:VITE_API_BASE = "http://192.168.0.123:8000" ; npm run build:native
   cd android ; .\gradlew.bat assembleDebug ; cd ..        # or: npx cap open android → Build → Build APK(s)
   ```
8. **Connect the phone and install** — follow *Connecting a phone over Wi-Fi*
   below (`adb pair`, `adb connect`, `adb devices`), then
   ```powershell
   adb install -r android\app\build\outputs\apk\debug\app-debug.apk
   adb shell am start -n com.unseen.app/.MainActivity
   ```
   On Windows `adb` is the SDK one from step 2, so no full path is needed.

### Connecting a phone over Wi-Fi (wireless debugging)

No cable needed. On the phone: **Settings → Developer options → Wireless
debugging** (turn it on; the phone and this machine must be on the same Wi-Fi).
Use the SDK's own adb by full path — the Debian `/usr/bin/adb` on this machine
is older and cannot discover the phone.

```bash
ADB=~/Android/Sdk/platform-tools/adb
# 1. Pair once. On the phone tap "Pair device with pairing code" and read the
#    IP:PORT and the 6-digit code shown there (the pairing port is NOT the
#    connect port):
$ADB pair 192.168.0.162:37123        # then type the 6-digit code
# 2. Connect. The connect IP:PORT is on the main Wireless debugging screen
#    (the port changes every time wireless debugging is switched on):
$ADB connect 192.168.0.162:41567
# 3. Check it is attached (a wireless device shows as adb-<serial>._adb-tls-connect):
$ADB devices -l
```

After the first pairing, adb usually re-finds the phone by itself (mDNS) the
next time Wireless debugging is on. If `adb devices` stays empty: make sure the
SDK adb owns the server (`cat ~/.android/adb.5037` should print its path), then

```bash
$ADB kill-server && $ADB start-server && $ADB mdns services   # discovery; then `connect` again if needed
```

Keep the phone unlocked with the Wireless debugging screen open while you
install. Then build, install and launch:

```bash
cd app
IP=$(ip route get 1.1.1.1 | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}')   # this machine's LAN IP
VITE_API_BASE=http://$IP:8000 npm run build:native
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 ANDROID_HOME=~/Android/Sdk
npm run android:apk
$ADB install -r android/app/build/outputs/apk/debug/app-debug.apk   # -r keeps the app's data
$ADB shell am start -n com.unseen.app/.MainActivity
$ADB exec-out screencap -p > phone.png                               # a screenshot, to check
$ADB logcat -s chromium Capacitor                                     # WebView console, if something is off
```

The API must be reachable from the phone: start it with `--host 0.0.0.0`
(`cd server && .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000`)
and keep port 8000 open on this machine's firewall. The app then shows the
sign-in page; after signing in it pulls the account's history from the server.

The server must allow the app's origin — `CORS_ORIGINS` already includes
`https://localhost` (the Capacitor WebView origin). For a LAN demo the shell is
configured for plain HTTP (`server.cleartext`, `android.allowMixedContent` in
`capacitor.config.ts`, and `usesCleartextTraffic` in the manifest): **remove all
three for a production build whose API is served over HTTPS.**

Troubleshooting: if you move the repo, recreate the server venv
(`python3 -m venv --clear .venv && pip install -r requirements.txt`) — venv
entry scripts hard-code their original path (or run `python -m uvicorn …`).

## Trying the demo

1. Finish the short onboarding (18+, name, tradition, Bible).
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

### Discernment and verse choice are model-driven

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

### Accounts and your data

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
(`DELETE /api/me`). See `database/README.md`.

To give an account a lived-in history (Stones, Schemes, Watch, Armory, Allies),
creating the user if needed (password from `SEED_USER_PASSWORD` in `.env`):

```bash
cd unseen && server/.venv/bin/python database/seeds/seed_user.py --username yogesh --name Yogesh
```

### Bible versions (YouVersion Platform)

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
| Gloo client + circuit breaker | `server/app/services/gloo.py` |
| Native shell (haptics, share, back, splash) | `app/src/native/index.ts`, `app/capacitor.config.ts` |

See `LICENSE`, `THIRD_PARTY_LICENSES.md` and `ASSETS.md`.
