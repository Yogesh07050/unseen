"""PostgreSQL access (asyncpg).

Optional by design: when DATABASE_URL is unset (or Postgres is unreachable at
start-up) the pool is None and every caller falls back to the pre-existing
behaviour — Redis/MemoryKV for prayer links, the bundled JSON for the Truth
Index, the phone-only store for user data — so the keyless, offline build still
runs. Scripture TEXT is never stored (references only). Since 2026-10-08 the
app's own records (battles, stones, allies, Armory, Watch, profile) are kept
per anonymous install so they survive a reinstall — see
database/migrations/0002_user_data.sql. Raw transcripts never leave the phone.
"""
from __future__ import annotations

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import asyncpg

log = logging.getLogger("unseen")

Pool = asyncpg.Pool


async def connect(database_url: str | None) -> Pool | None:
    if not database_url:
        return None
    try:
        pool = await asyncpg.create_pool(database_url, min_size=1, max_size=8, command_timeout=10)
        async with pool.acquire() as c:
            await c.fetchval("SELECT 1")
        log.info("postgres connected")
        return pool
    except Exception as exc:  # noqa: BLE001 — degrade, never crash the API
        log.warning("postgres unavailable (%s: %s); running without it", type(exc).__name__, exc)
        return None


async def ping(pool: Pool | None) -> bool:
    if pool is None:
        return False
    try:
        async with pool.acquire() as c:
            return await c.fetchval("SELECT 1") == 1
    except Exception:  # noqa: BLE001
        return False


def fire(coro) -> None:
    """Run a write in the background; log (never raise) on failure so a database
    hiccup can never turn into a failed API response."""
    async def _run():
        try:
            await coro
        except Exception as exc:  # noqa: BLE001
            log.warning("postgres write failed: %s: %s", type(exc).__name__, exc)
    asyncio.create_task(_run())


def as_uuid(value: str | None) -> uuid.UUID | None:
    try:
        return uuid.UUID(value) if value else None
    except (ValueError, AttributeError, TypeError):
        return None  # e.g. the eval harness sends non-UUID install ids; those are simply not tracked


_PLATFORMS = {"web", "android", "ios"}

_UPSERT_INSTALL = """
INSERT INTO installs (install_id, client_version, platform, request_count)
VALUES ($1, $2, $3, 1)
ON CONFLICT (install_id) DO UPDATE SET
    last_seen      = now(),
    client_version = COALESCE(EXCLUDED.client_version, installs.client_version),
    platform       = CASE WHEN EXCLUDED.platform <> 'unknown' THEN EXCLUDED.platform ELSE installs.platform END,
    request_count  = installs.request_count + 1
"""


async def upsert_install(pool: Pool, install_id: str | None, client_version: str | None, platform: str | None) -> None:
    iid = as_uuid(install_id)
    if iid is None:
        return
    plat = platform if platform in _PLATFORMS else "unknown"
    async with pool.acquire() as c:
        await c.execute(_UPSERT_INSTALL, iid, client_version, plat)


async def _ensure_install(c: asyncpg.Connection, iid: uuid.UUID | None) -> None:
    """Guarantee the FK target exists before writing a child row (the request
    middleware upserts installs concurrently, so we cannot rely on ordering)."""
    if iid is not None:
        await c.execute("INSERT INTO installs (install_id) VALUES ($1) ON CONFLICT (install_id) DO NOTHING", iid)


# ───────────────────────────── Prayer links (content-free) ───────────────────

async def create_prayer(pool: Pool, token: str, install_id: str | None, expires_at_ms: int) -> None:
    iid = as_uuid(install_id)
    async with pool.acquire() as c, c.transaction():
        await _ensure_install(c, iid)
        await c.execute(
            "INSERT INTO prayer_requests (token, install_id, expires_at) VALUES ($1, $2, to_timestamp($3 / 1000.0))",
            token, iid, expires_at_ms,
        )


_PRAYER_ROW = "acks, (extract(epoch FROM expires_at) * 1000)::bigint AS expires_at_ms"


async def get_prayer(pool: Pool, token: str) -> dict[str, int] | None:
    async with pool.acquire() as c:
        row = await c.fetchrow(
            f"SELECT {_PRAYER_ROW} FROM prayer_requests WHERE token = $1 AND expires_at > now()", token)
    return dict(row) if row else None


async def ack_prayer(pool: Pool, token: str) -> dict[str, int] | None:
    async with pool.acquire() as c:
        row = await c.fetchrow(
            f"UPDATE prayer_requests SET acks = LEAST(10, acks + 1), updated_at = now() "
            f"WHERE token = $1 AND expires_at > now() RETURNING {_PRAYER_ROW}", token)
    return dict(row) if row else None


async def sweep_expired_prayers(pool: Pool) -> int:
    """DELETE prayer links that expired more than a day ago (they stay a day so a
    late GET still gets a clean 410 rather than a 404). Returns rows removed."""
    async with pool.acquire() as c:
        status = await c.execute("DELETE FROM prayer_requests WHERE expires_at < now() - interval '1 day'")
    return int(status.split()[-1])


# ───────────────────────────── AI call metadata ──────────────────────────────

async def log_ai_interaction(
    pool: Pool, *, install_id: str | None, endpoint: str, model: str, prompt_version: str, latency_ms: int,
    struggle: str | None = None, safety_flag: str | None = None, confidence: float | None = None,
    intensity: int | None = None, verse_usfms: Iterable[str] = (),
) -> None:
    iid = as_uuid(install_id)
    async with pool.acquire() as c, c.transaction():
        await _ensure_install(c, iid)
        await c.execute(
            """INSERT INTO ai_interactions
               (install_id, endpoint, model, prompt_version, latency_ms, struggle, safety_flag, confidence, intensity, verse_usfms)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)""",
            iid, endpoint, model, prompt_version, max(0, int(latency_ms)), struggle, safety_flag,
            float(confidence) if confidence is not None else None,
            int(intensity) if intensity is not None else None, list(verse_usfms),
        )


# ───────────────────────────── Truth Index (references only) ─────────────────

_CONTENT = Path(__file__).resolve().parent.parent / "content" / "truth_index.json"


async def truth_index(pool: Pool | None, bible_id: int) -> dict[str, Any]:
    """The Truth Index as the client expects it, plus structured references.
    Falls back to the bundled JSON when Postgres is absent."""
    if pool is None:
        data = json.loads(_CONTENT.read_text(encoding="utf-8"))
        data.setdefault("references", [])
        data["source"] = "bundled"
        return data
    async with pool.acquire() as c:
        entries = await c.fetch(
            "SELECT id, struggle, lie, escapes FROM truth_entries ORDER BY struggle, id")
        verses = await c.fetch(
            """SELECT tev.entry_id, tev.role, tev.position, sr.usfm
               FROM truth_entry_verses tev JOIN scripture_references sr ON sr.id = tev.reference_id
               WHERE sr.bible_version_id = $1 ORDER BY tev.entry_id, tev.role, tev.position""", bible_id)
        defaults = await c.fetch(
            """SELECT sd.struggle, sd.position, sr.usfm
               FROM struggle_defaults sd JOIN scripture_references sr ON sr.id = sd.reference_id
               WHERE sr.bible_version_id = $1 ORDER BY sd.struggle, sd.position""", bible_id)
        refs = await c.fetch(
            """SELECT usfm, book, chapter, verse, reference FROM scripture_references
               WHERE bible_version_id = $1 ORDER BY book, chapter, verse""", bible_id)
    by_entry: dict[str, dict[str, list[str]]] = {}
    for v in verses:
        by_entry.setdefault(v["entry_id"], {"truth": [], "support": []})[v["role"]].append(v["usfm"])
    out_defaults: dict[str, list[str]] = {}
    for d in defaults:
        out_defaults.setdefault(d["struggle"], []).append(d["usfm"])
    return {
        "version": 1,
        "bibleId": bible_id,
        "source": "postgres",
        "entries": [
            {"id": e["id"], "struggle": e["struggle"], "lie": e["lie"], "escapes": list(e["escapes"]),
             "truth": by_entry.get(e["id"], {}).get("truth", []), "support": by_entry.get(e["id"], {}).get("support", [])}
            for e in entries
        ],
        "defaults": out_defaults,
        "references": [dict(r) | {"bibleId": bible_id} for r in refs],
    }


# ───────────────────────────── Per-install user data (sync) ──────────────────
# Mirrors the phone's sealed store so a reinstall or second device can pull it
# back (database/migrations/0002_user_data.sql). The client object is kept whole
# in `data`; a few fields are lifted into columns for constraints and indexes.

USER_COLLECTIONS = ("battles", "stones", "allies", "armory", "watch")
_TABLE = {"battles": "user_battles", "stones": "user_stones", "allies": "user_allies",
          "armory": "user_armory", "watch": "user_watch"}


def _ms_to_ts(ms) -> "datetime | None":
    try:
        return datetime.fromtimestamp(float(ms) / 1000.0, tz=timezone.utc) if ms is not None else None
    except (TypeError, ValueError, OverflowError):
        return None


def _ts_to_ms(ts) -> int | None:
    return int(ts.timestamp() * 1000) if ts is not None else None


def _int(v) -> int | None:
    try:
        return int(v) if v is not None else None
    except (TypeError, ValueError):
        return None


def _str_id(v) -> str:
    s = str(v or "").strip()
    if not s or len(s) > 128:
        raise ValueError("bad id")
    return s


def _columns(collection: str, d: dict) -> tuple[list[str], list]:
    """Lifted columns per collection (name list, value list)."""
    if collection == "battles":
        verse = d.get("verse") or {}
        return (["started_at", "ended_at", "struggle", "outcome", "lie", "context_type", "intensity", "verse_usfms"],
                [_ms_to_ts(d.get("startedAt")) or datetime.now(timezone.utc), _ms_to_ts(d.get("endedAt")),
                 str(d.get("struggle") or "other"), str(d.get("outcome") or "still_fighting"),
                 str(d.get("lie") or "")[:200], d.get("contextType"), _int(d.get("intensity")),
                 [str(u) for u in (verse.get("usfm") or [])]])
    if collection == "stones":
        date_s = str(d.get("date") or "")[:10]
        try:
            date_v = datetime.strptime(date_s, "%Y-%m-%d").date()
        except ValueError:
            date_v = datetime.now(timezone.utc).date()
        return (["battle_id", "kind", "date"], [d.get("battleId"), str(d.get("kind") or "stood"), date_v])
    if collection == "allies":
        return (["name", "consent_at"],
                [str(d.get("name") or "")[:80], _ms_to_ts(d.get("consentAt")) or datetime.now(timezone.utc)])
    if collection == "armory":
        verse = d.get("verse") or {}
        return (["verse_usfms", "sharpness", "next_drill_at"],
                [[str(u) for u in (verse.get("usfm") or [])], max(0, min(5, _int(d.get("sharpness")) or 0)),
                 _ms_to_ts(d.get("nextDrillAt"))])
    if collection == "watch":
        return (["weekday", "start_hour", "end_hour", "level"],
                [_int(d.get("weekday")) or 0, _int(d.get("startHour")) or 0, _int(d.get("endHour")) or 1,
                 str(d.get("level") or "medium")])
    raise ValueError(f"unknown collection {collection}")


async def upsert_user_rows(c: asyncpg.Connection, iid: uuid.UUID, collection: str, rows: Iterable[dict]) -> int:
    """Last-write-wins upsert by the client's updatedAt (ms). Un-deletes a row that is re-saved."""
    table = _TABLE[collection]
    n = 0
    for d in rows:
        if not isinstance(d, dict):
            continue
        try:
            rid = _str_id(d.get("id"))
            cols, vals = _columns(collection, d)
        except ValueError:
            continue
        updated = _ms_to_ts(d.get("updatedAt")) or datetime.now(timezone.utc)
        names = ["install_id", "id", *cols, "data", "updated_at", "deleted_at"]
        params = [iid, rid, *vals, json.dumps(d), updated, None]
        placeholders = ", ".join(f"${i + 1}" for i in range(len(params)))
        sets = ", ".join(f"{col} = EXCLUDED.{col}" for col in [*cols, "data", "updated_at", "deleted_at"])
        await c.execute(
            f"INSERT INTO {table} ({', '.join(names)}) VALUES ({placeholders}) "
            f"ON CONFLICT (install_id, id) DO UPDATE SET {sets} "
            f"WHERE {table}.updated_at <= EXCLUDED.updated_at",
            *params)
        n += 1
    return n


async def delete_user_rows(c: asyncpg.Connection, iid: uuid.UUID, deletes: Iterable[tuple[str, str]]) -> int:
    n = 0
    for collection, rid in deletes:
        table = _TABLE.get(collection)
        if not table:
            continue
        await c.execute(
            f"UPDATE {table} SET deleted_at = now(), updated_at = now() WHERE install_id = $1 AND id = $2",
            iid, str(rid)[:128])
        n += 1
    return n


async def upsert_profile(c: asyncpg.Connection, iid: uuid.UUID, profile: dict) -> None:
    updated = _ms_to_ts(profile.get("updatedAt")) or datetime.now(timezone.utc)
    await c.execute(
        """INSERT INTO user_profiles (install_id, first_name, tradition, bible_id, onboarded_at, data, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (install_id) DO UPDATE SET
               first_name = EXCLUDED.first_name, tradition = EXCLUDED.tradition, bible_id = EXCLUDED.bible_id,
               onboarded_at = EXCLUDED.onboarded_at, data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
           WHERE user_profiles.updated_at <= EXCLUDED.updated_at""",
        iid, (str(profile.get("firstName"))[:60] if profile.get("firstName") else None),
        profile.get("tradition") if profile.get("tradition") in ("evangelical", "catholic", "mainline") else None,
        _int(profile.get("bibleId")) or 3034, _ms_to_ts(profile.get("onboardedAt")) or None,
        json.dumps(profile), updated)


async def push_user(pool: Pool, install_id: str, profile: dict | None,
                    upserts: dict[str, list[dict]], deletes: list[tuple[str, str]]) -> dict[str, int]:
    iid = as_uuid(install_id)
    if iid is None:
        raise ValueError("install id must be a UUID")
    counts = {"upserts": 0, "deletes": 0, "profile": 0}
    async with pool.acquire() as c, c.transaction():
        await _ensure_install(c, iid)
        if profile:
            await upsert_profile(c, iid, profile)
            counts["profile"] = 1
        for collection, rows in upserts.items():
            if collection in _TABLE:
                counts["upserts"] += await upsert_user_rows(c, iid, collection, rows)
        counts["deletes"] = await delete_user_rows(c, iid, deletes)
    return counts


async def pull_user(pool: Pool, install_id: str, since_ms: int) -> dict[str, Any]:
    """Everything for this install changed after `since_ms` (soft-deleted rows included
    as {id, deleted: true}), plus the profile when it changed."""
    iid = as_uuid(install_id)
    out: dict[str, Any] = {"now": int(datetime.now(timezone.utc).timestamp() * 1000), "profile": None}
    for col in USER_COLLECTIONS:
        out[col] = []
    if iid is None:
        return out
    since = _ms_to_ts(max(0, since_ms)) or datetime.fromtimestamp(0, tz=timezone.utc)
    async with pool.acquire() as c:
        prow = await c.fetchrow(
            "SELECT data, updated_at FROM user_profiles WHERE install_id = $1 AND updated_at > $2", iid, since)
        if prow:
            out["profile"] = json.loads(prow["data"]) | {"updatedAt": _ts_to_ms(prow["updated_at"])}
        for col in USER_COLLECTIONS:
            rows = await c.fetch(
                f"SELECT id, data, updated_at, deleted_at FROM {_TABLE[col]} "
                f"WHERE install_id = $1 AND updated_at > $2 ORDER BY updated_at", iid, since)
            for r in rows:
                if r["deleted_at"] is not None:
                    out[col].append({"id": r["id"], "deleted": True, "updatedAt": _ts_to_ms(r["updated_at"])})
                else:
                    out[col].append(json.loads(r["data"]) | {"id": r["id"], "updatedAt": _ts_to_ms(r["updated_at"])})
    return out


async def wipe_user(pool: Pool, install_id: str) -> None:
    """Hard-delete everything this install stored ("Delete everything" in Settings)."""
    iid = as_uuid(install_id)
    if iid is None:
        return
    async with pool.acquire() as c, c.transaction():
        for table in (*_TABLE.values(), "user_profiles"):
            await c.execute(f"DELETE FROM {table} WHERE install_id = $1", iid)


async def user_counts(pool: Pool, install_id: str) -> dict[str, int]:
    iid = as_uuid(install_id)
    if iid is None:
        return {}
    out: dict[str, int] = {}
    async with pool.acquire() as c:
        for col, table in _TABLE.items():
            out[col] = await c.fetchval(
                f"SELECT count(*) FROM {table} WHERE install_id = $1 AND deleted_at IS NULL", iid)
    return out


# ───────────────────────────── Accounts: users and sessions ──────────────────

async def create_user(pool: Pool, username: str, password_hash: str) -> dict | None:
    """Insert a user; None when the username is taken."""
    async with pool.acquire() as c:
        row = await c.fetchrow(
            """INSERT INTO users (username, password_hash) VALUES ($1, $2)
               ON CONFLICT (username) DO NOTHING RETURNING id, username""", username, password_hash)
    return dict(row) if row else None


async def get_user_by_username(pool: Pool, username: str) -> dict | None:
    async with pool.acquire() as c:
        row = await c.fetchrow("SELECT id, username, password_hash FROM users WHERE username = $1", username)
    return dict(row) if row else None


async def touch_login(pool: Pool, user_id: uuid.UUID) -> None:
    async with pool.acquire() as c:
        await c.execute("UPDATE users SET last_login_at = now(), updated_at = now() WHERE id = $1", user_id)


async def create_session(pool: Pool, user_id: uuid.UUID, token_hash: str, install_id: str | None,
                         expires_at: "datetime") -> None:
    iid = as_uuid(install_id)
    async with pool.acquire() as c, c.transaction():
        await _ensure_install(c, iid)
        await c.execute(
            "INSERT INTO sessions (token_hash, user_id, install_id, expires_at) VALUES ($1, $2, $3, $4)",
            token_hash, user_id, iid, expires_at)
        # Housekeeping: sessions long past expiry are of no use to anyone.
        await c.execute("DELETE FROM sessions WHERE expires_at < now() - interval '30 days'")


async def get_session_user(pool: Pool, token_hash: str) -> dict | None:
    """The user behind a live session (not expired, not revoked); bumps last_seen."""
    async with pool.acquire() as c:
        row = await c.fetchrow(
            """UPDATE sessions s SET last_seen_at = now()
               FROM users u
               WHERE s.token_hash = $1 AND s.user_id = u.id AND s.revoked_at IS NULL AND s.expires_at > now()
               RETURNING u.id, u.username, s.install_id""", token_hash)
    return dict(row) if row else None


async def revoke_session(pool: Pool, token_hash: str) -> None:
    async with pool.acquire() as c:
        await c.execute("UPDATE sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL", token_hash)


async def claim_install(pool: Pool, user_id: uuid.UUID, install_id: str | None) -> dict[str, int]:
    """Signing in on an install: link it to the account and attach the anonymous
    history that install recorded before (rows with account_id NULL). The
    profile is attached only when the account has none yet; otherwise the
    install's anonymous profile is dropped in favour of the account's."""
    iid = as_uuid(install_id)
    counts: dict[str, int] = {}
    if iid is None:
        return counts
    async with pool.acquire() as c, c.transaction():
        await _ensure_install(c, iid)
        await c.execute("UPDATE installs SET user_id = $1 WHERE install_id = $2", user_id, iid)
        for col, table in _TABLE.items():
            status = await c.execute(
                f"""UPDATE {table} t SET account_id = $1
                    WHERE t.install_id = $2 AND t.account_id IS NULL
                      AND NOT EXISTS (SELECT 1 FROM {table} o WHERE o.account_id = $1 AND o.id = t.id)""",
                user_id, iid)
            counts[col] = int(status.split()[-1])
        has_profile = await c.fetchval("SELECT 1 FROM user_profiles WHERE account_id = $1", user_id)
        if has_profile:
            await c.execute("DELETE FROM user_profiles WHERE install_id = $1 AND account_id IS NULL", iid)
            counts["profile"] = 0
        else:
            status = await c.execute(
                "UPDATE user_profiles SET account_id = $1 WHERE install_id = $2 AND account_id IS NULL", user_id, iid)
            counts["profile"] = int(status.split()[-1])
    return counts


# ───────────────────────────── Account-keyed sync ────────────────────────────

async def upsert_account_rows(c: asyncpg.Connection, account_id: uuid.UUID, iid: uuid.UUID, collection: str,
                              rows: Iterable[dict]) -> int:
    """Like upsert_user_rows but owned by the account: the row is matched on
    (account_id, id) whichever install wrote it; install_id records the writer."""
    table = _TABLE[collection]
    n = 0
    for d in rows:
        if not isinstance(d, dict):
            continue
        try:
            rid = _str_id(d.get("id"))
            cols, vals = _columns(collection, d)
        except ValueError:
            continue
        updated = _ms_to_ts(d.get("updatedAt")) or datetime.now(timezone.utc)
        names = ["install_id", "account_id", "id", *cols, "data", "updated_at", "deleted_at"]
        params = [iid, account_id, rid, *vals, json.dumps(d), updated, None]
        placeholders = ", ".join(f"${i + 1}" for i in range(len(params)))
        sets = ", ".join(f"{col} = EXCLUDED.{col}" for col in ["install_id", *cols, "data", "updated_at", "deleted_at"])
        await c.execute(
            f"INSERT INTO {table} ({', '.join(names)}) VALUES ({placeholders}) "
            f"ON CONFLICT (account_id, id) WHERE account_id IS NOT NULL DO UPDATE SET {sets} "
            f"WHERE {table}.updated_at <= EXCLUDED.updated_at",
            *params)
        n += 1
    return n


async def upsert_account_profile(c: asyncpg.Connection, account_id: uuid.UUID, iid: uuid.UUID, profile: dict) -> None:
    updated = _ms_to_ts(profile.get("updatedAt")) or datetime.now(timezone.utc)
    await c.execute(
        """INSERT INTO user_profiles (install_id, account_id, first_name, tradition, bible_id, onboarded_at, data, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (account_id) WHERE account_id IS NOT NULL DO UPDATE SET
               install_id = EXCLUDED.install_id, first_name = EXCLUDED.first_name, tradition = EXCLUDED.tradition,
               bible_id = EXCLUDED.bible_id, onboarded_at = EXCLUDED.onboarded_at, data = EXCLUDED.data,
               updated_at = EXCLUDED.updated_at
           WHERE user_profiles.updated_at <= EXCLUDED.updated_at""",
        iid, account_id, (str(profile.get("firstName"))[:60] if profile.get("firstName") else None),
        profile.get("tradition") if profile.get("tradition") in ("evangelical", "catholic", "mainline") else None,
        _int(profile.get("bibleId")) or 3034, _ms_to_ts(profile.get("onboardedAt")) or None,
        json.dumps(profile), updated)


async def push_account(pool: Pool, account_id: uuid.UUID, install_id: str | None, profile: dict | None,
                       upserts: dict[str, list[dict]], deletes: list[tuple[str, str]]) -> dict[str, int]:
    iid = as_uuid(install_id) or uuid.uuid4()
    counts = {"upserts": 0, "deletes": 0, "profile": 0}
    async with pool.acquire() as c, c.transaction():
        await _ensure_install(c, iid)
        if profile:
            await upsert_account_profile(c, account_id, iid, profile)
            counts["profile"] = 1
        for collection, rows in upserts.items():
            if collection in _TABLE:
                counts["upserts"] += await upsert_account_rows(c, account_id, iid, collection, rows)
        for collection, rid in deletes:
            table = _TABLE.get(collection)
            if table:
                await c.execute(
                    f"UPDATE {table} SET deleted_at = now(), updated_at = now() WHERE account_id = $1 AND id = $2",
                    account_id, str(rid)[:128])
                counts["deletes"] += 1
    return counts


async def pull_account(pool: Pool, account_id: uuid.UUID, since_ms: int) -> dict[str, Any]:
    out: dict[str, Any] = {"now": int(datetime.now(timezone.utc).timestamp() * 1000), "profile": None}
    for col in USER_COLLECTIONS:
        out[col] = []
    since = _ms_to_ts(max(0, since_ms)) or datetime.fromtimestamp(0, tz=timezone.utc)
    async with pool.acquire() as c:
        prow = await c.fetchrow(
            "SELECT data, updated_at FROM user_profiles WHERE account_id = $1 AND updated_at > $2", account_id, since)
        if prow:
            out["profile"] = json.loads(prow["data"]) | {"updatedAt": _ts_to_ms(prow["updated_at"])}
        for col in USER_COLLECTIONS:
            rows = await c.fetch(
                f"SELECT id, data, updated_at, deleted_at FROM {_TABLE[col]} "
                f"WHERE account_id = $1 AND updated_at > $2 ORDER BY updated_at", account_id, since)
            for r in rows:
                if r["deleted_at"] is not None:
                    out[col].append({"id": r["id"], "deleted": True, "updatedAt": _ts_to_ms(r["updated_at"])})
                else:
                    out[col].append(json.loads(r["data"]) | {"id": r["id"], "updatedAt": _ts_to_ms(r["updated_at"])})
    return out


async def wipe_account(pool: Pool, account_id: uuid.UUID) -> None:
    async with pool.acquire() as c, c.transaction():
        for table in (*_TABLE.values(), "user_profiles"):
            await c.execute(f"DELETE FROM {table} WHERE account_id = $1", account_id)
