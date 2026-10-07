# UNSEEN — PostgreSQL

## What PostgreSQL holds

UNSEEN is **account-less**: identity is the random install UUID the phone
generates. Since 2026-10-08 the database is the durable copy of each install's
own records — what the app shows in Stones, Schemes, Watch, Armory and Allies —
so a reinstall or a second device can pull it back (`GET/POST/DELETE /api/me`,
`database/migrations/0002_user_data.sql`). The phone keeps its AES-GCM sealed
copy as the fast path and pushes every write through an outbox. What a person
actually *said* (the transcript) never leaves the phone; Scripture **text** is
never stored anywhere (references only — the app fetches and byte-verifies it
from YouVersion).

| Table | Purpose |
| --- | --- |
| `user_profiles` | One row per install: first name, tradition, Bible version, onboarding time, and the full Settings object (`data`). |
| `user_battles` | Every battle: when, struggle, outcome, the lie in the person's words, context, intensity, verse references (columns) + the whole Battle object (`data`). |
| `user_stones` | Ebenezer stones (`stood`, `rose_again`, `from_memory`) with date and verse reference. |
| `user_allies` | Up to three allies who agreed to pray (name, optional phone/role, consent time). |
| `user_armory` | Verses the person has stood with: sharpness 0–5, drill schedule, wins. |
| `user_watch` | Kairos Watch windows the phone derived (weekday, hours, level, reason, plan). |

All six carry `updated_at` (last-write-wins across devices) and `deleted_at`
(soft delete, so another device learns of it on its next pull).
`installs.synthetic` marks rows created by `seeds/seed.py`; real devices are
never synthetic and are never deleted by the seed.

The remaining tables are the small set of server-side state that predates this:

| Table | Purpose |
| --- | --- |
| `bible_versions` | The Bible translations the app may reference (seeded: 3034 = Berean Standard Bible, public domain). |
| `scripture_references` | Structured **references only** — `usfm` (`EPH.4.26`), book, chapter, verse, human label. **No verse text**: text is fetched live from YouVersion via `GET /api/verse/{bibleId}/{usfm}` and byte-verified on the phone. |
| `truth_entries` | The curated Truth Index: struggle → editorial lie label → ways of escape (action ids). |
| `truth_entry_verses` | Each entry's `truth` and `support` verses (ordered), FK → `scripture_references`. |
| `struggle_defaults` | Per-struggle fallback verse(s) when no entry matches the lie. |
| `installs` | **Anonymous** install registry: the random UUID the phone generates, first/last seen, client version, platform, request count. Not a user. |
| `prayer_requests` | Content-free prayer links: token, optional install, ack count (0–10), expiry. Replaces the 2-hour Redis record so acks survive restarts. |
| `ai_interactions` | Metadata-only audit of AI calls: endpoint, model (`gloo-…` or `fallback-classifier`), prompt version, latency, struggle/safety labels, confidence, intensity, chosen verse ids. **No text columns.** |
| `schema_migrations` | Applied migration versions + checksums (managed by `migrate.py`). |

Deliberately **absent**: `users`, `sessions`, passwords, e-mail, raw transcripts,
Scripture text. Rate-limit counters stay in **Redis** (cache).

### Relationships

```
bible_versions 1 ─── * scripture_references * ─── * truth_entry_verses * ─── 1 truth_entries
                                   └──────────────── * struggle_defaults
installs 1 ─── * prayer_requests        installs 1 ─── * ai_interactions
```

### Key constraints and indexes (see `migrations/0001_init.sql`)

- `scripture_references`: `UNIQUE (bible_version_id, usfm)`; CHECKs that `usfm`
  matches `^[1-3A-Z]{3}\.\d+\.\d+$` **and equals** `book.chapter.verse`; index on
  `(bible_version_id, book, chapter, verse)`.
- `truth_entry_verses`: PK `(entry_id, role, position)`, `role ∈ {truth, support}`,
  no duplicate reference per entry/role; index on `reference_id`.
- `installs`: `platform ∈ {web, android, ios, unknown}`, `last_seen ≥ first_seen`;
  index on `last_seen`.
- `prayer_requests`: `acks BETWEEN 0 AND 10`, `expires_at > created_at`, token
  format check; indexes on `expires_at` (expiry sweep) and `install_id`.
- `ai_interactions`: endpoint/struggle/safety-flag enums, `confidence ∈ [0,1]`,
  `intensity ∈ [1,10]`, `latency_ms ≥ 0`; indexes on `(install_id, created_at)`,
  `(created_at)`, `(endpoint, created_at)`.
- All timestamps are `timestamptz`; `updated_at` where rows are updated.

## Create → migrate → seed → run

```bash
cd unseen
# 1. A database. Either a local Docker container…
docker run -d --name unseen-postgres -e POSTGRES_USER=unseen -e POSTGRES_PASSWORD=unseen \
  -e POSTGRES_DB=unseen -p 5433:5432 postgres:16
echo 'DATABASE_URL=postgresql://unseen:unseen@localhost:5433/unseen' >> .env
# …or any PostgreSQL 14+ you already have (set DATABASE_URL accordingly).

# 2. Tables, constraints, indexes (idempotent; records versions + checksums)
server/.venv/bin/python database/migrate.py          # add --status to just inspect

# 3. Reference data + synthetic analytics rows (repeatable; never touches real devices)
server/.venv/bin/python database/seeds/seed.py

# 3b. Give a real install an eight-week history (Stones, Schemes, Watch, Armory, Allies).
#     Open the app once so the server has seen the install, then:
server/.venv/bin/python database/seeds/seed_user.py --all-recent --name Yogesh
#     or one device (Settings shows the install id's first 8 characters):
server/.venv/bin/python database/seeds/seed_user.py --install <uuid> --name Yogesh --replace

# 4. Start the API — it connects on boot (GET /api/health → "postgres": true)
cd server && .venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

`docker compose up --build` does all of this: the `migrate` one-shot service runs
the migrations against the `postgres` service before `app` starts.

- `schema/schema.sql` — DDL snapshot of the resulting schema (`pg_dump --schema-only`).
- `migrations/NNNN_*.sql` — append a new numbered file for every schema change;
  never edit an applied one (the runner flags changed checksums).
- `seeds/seed.py` — derives every Scripture reference from
  `server/app/content/truth_index.json`; it cannot introduce an invented verse.

## How the backend uses it (`server/app/services/db.py`)

- An `asyncpg` pool is opened in the FastAPI lifespan (`app.state.db`). If
  `DATABASE_URL` is unset or Postgres is unreachable, the pool is `None` and every
  feature falls back to its previous behaviour — the keyless offline demo still runs.
- `POST /api/pray` → INSERT `prayer_requests` (+ background sweep of rows expired
  >1 day); `GET /api/pray/{token}` → SELECT; `POST /api/pray/{token}/ack` → UPDATE.
- Every `/api/*` request upserts `installs` (middleware, fire-and-forget).
- `POST /api/discern|truth|compose|insight` → INSERT `ai_interactions` (metadata only).
- `GET /api/truth-index` → the Truth Index joined from the four reference tables.
- `GET /api/me?since=` → rows of the six `user_*` tables changed since the phone's
  last pull; `POST /api/me` → batched upserts/deletes from the phone's outbox
  (last-write-wins by `updatedAt`); `DELETE /api/me` → "Delete everything".

## Verify it yourself

```bash
docker exec unseen-postgres psql -U unseen -d unseen -c '\dt'
docker exec unseen-postgres psql -U unseen -d unseen -c \
  "select endpoint, model, struggle, latency_ms, created_at from ai_interactions order by created_at desc limit 5"
```
