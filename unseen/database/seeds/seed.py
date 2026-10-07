#!/usr/bin/env python
"""Repeatable development seed for UNSEEN's PostgreSQL database.

    cd unseen && server/.venv/bin/python database/seeds/seed.py

What it loads
  • Reference data (upserted, never duplicated): the Berean Standard Bible version
    row, every Scripture *reference* the Truth Index uses (parsed from the
    product's own USFM ids — NO verse text, which is fetched live from YouVersion),
    the Truth Index entries, their truth/support verses and the per-struggle
    defaults. Source of truth: server/app/content/truth_index.json — nothing is
    invented here.
  • A realistic, SYNTHETIC development dataset (replaced on every run; real
    devices are never touched): anonymous installs flagged `synthetic`,
    content-free prayer links and eight weeks of AI-call metadata
    clustered the way real usage looks (Sunday-evening anger after family
    conflict, late-Friday escapism, mid-week fear). No people, no names, no user
    text — the schema has no columns for any of that.

Deterministic: the same rows are generated every run (seeded RNG), timestamps are
relative to "now" so the data always looks recent.
"""
from __future__ import annotations

import asyncio
import json
import random
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import asyncpg

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from _env import SERVER_DIR, add_server_to_path, database_url, masked  # noqa: E402

add_server_to_path()
from app.services.usfm import parse  # noqa: E402

TRUTH_INDEX = SERVER_DIR / "app" / "content" / "truth_index.json"
BIBLE_ID = 3034

# Ways of escape per entry (action ids, best first) — mirrors app/src/content/truthIndex.ts.
ESCAPES: dict[str, list[str]] = {
    "anger-1": ["gentle_reply", "wait_10", "ask_allies_pray"],
    "anger-2": ["wait_10", "gentle_reply", "walk_10"],
    "fear-1": ["breath_prayer", "text_ally", "walk_10"],
    "fear-2": ["text_ally", "breath_prayer", "worship_song"],
    "sexual-1": ["leave_room", "phone_away", "call_sponsor"],
    "sexual-2": ["call_sponsor", "leave_room", "ask_allies_pray"],
    "escapism-1": ["set_stop", "phone_away", "walk_10"],
    "shame-1": ["rise_again", "tell_ally", "confession_guide"],
    "shame-2": ["confession_guide", "tell_ally", "worship_song"],
    "envy-1": ["three_gifts", "walk_10", "worship_song"],
    "compulsion-1": ["call_sponsor", "text_ally", "leave_room"],
    "deceit-1": ["true_sentence", "pause_before_reply", "ask_allies_pray"],
    "pride-1": ["ask_help", "text_ally", "breath_prayer"],
}

GLOO = "gloo-anthropic-claude-haiku-4.5"
FALLBACK = "fallback-classifier"
rng = random.Random(20261007)  # deterministic dataset


def now() -> datetime:
    return datetime.now(timezone.utc)


# ───────────────────────────── reference data ────────────────────────────────

async def seed_reference(c: asyncpg.Connection) -> dict[str, int]:
    data = json.loads(TRUTH_INDEX.read_text(encoding="utf-8"))
    assert data["bibleId"] == BIBLE_ID

    await c.execute(
        """INSERT INTO bible_versions (id, abbreviation, title, language, copyright)
           VALUES ($1, 'BSB', 'Berean Standard Bible', 'eng',
                   'The Holy Bible, Berean Standard Bible, BSB is produced in cooperation with Bible Hub, Discovery Bible, OpenBible.com, and the Berean Bible Translation Committee. Public domain.')
           ON CONFLICT (id) DO UPDATE SET updated_at = now()""", BIBLE_ID)

    usfms: set[str] = set()
    for e in data["entries"]:
        usfms.update(e["truth"]); usfms.update(e["support"])
    for refs in data["defaults"].values():
        usfms.update(refs)

    ref_ids: dict[str, int] = {}
    for u in sorted(usfms):
        p = parse(u)  # raises on anything that is not a real USFM verse id
        ref_ids[u] = await c.fetchval(
            """INSERT INTO scripture_references (bible_version_id, usfm, book, chapter, verse, reference)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (bible_version_id, usfm) DO UPDATE SET reference = EXCLUDED.reference
               RETURNING id""", BIBLE_ID, u, p.book, p.chapter, p.verse, p.reference)

    for e in data["entries"]:
        await c.execute(
            """INSERT INTO truth_entries (id, struggle, lie, escapes)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (id) DO UPDATE SET struggle = EXCLUDED.struggle, lie = EXCLUDED.lie,
                                              escapes = EXCLUDED.escapes, updated_at = now()""",
            e["id"], e["struggle"], e["lie"], ESCAPES.get(e["id"], []))
        await c.execute("DELETE FROM truth_entry_verses WHERE entry_id = $1", e["id"])
        for role in ("truth", "support"):
            for pos, u in enumerate(e[role]):
                await c.execute(
                    "INSERT INTO truth_entry_verses (entry_id, reference_id, role, position) VALUES ($1, $2, $3, $4)",
                    e["id"], ref_ids[u], role, pos)

    await c.execute("DELETE FROM struggle_defaults")
    for struggle, refs in data["defaults"].items():
        for pos, u in enumerate(refs):
            await c.execute(
                "INSERT INTO struggle_defaults (struggle, position, reference_id) VALUES ($1, $2, $3)",
                struggle, pos, ref_ids[u])
    return ref_ids


# ───────────────────────────── synthetic usage data ──────────────────────────

def _uuid() -> uuid.UUID:
    return uuid.UUID(int=rng.getrandbits(128), version=4)


def _at(days_ago: int, hour: int, minute: int | None = None) -> datetime:
    base = now() - timedelta(days=days_ago)
    return base.replace(hour=hour, minute=minute if minute is not None else rng.randint(0, 59),
                        second=rng.randint(0, 59), microsecond=0)


def _weekday_days_ago(weekday: int, weeks_ago: int) -> int:
    """Days ago of the given weekday (0=Mon..6=Sun) `weeks_ago` weeks back."""
    today = now().weekday()
    return (today - weekday) % 7 + 7 * weeks_ago


async def seed_usage(c: asyncpg.Connection, truth: dict[str, dict]) -> dict[str, int]:
    # The synthetic dataset is replaced on every run. Real devices (and everything
    # they stored — profile, battles, stones, allies) are never touched: only rows
    # flagged synthetic go, plus installs back-dated before the product existed
    # (an earlier seed created those without the flag).
    await c.execute(
        "DELETE FROM installs WHERE synthetic OR first_seen < date '2026-10-07'")
    await c.execute(
        "DELETE FROM ai_interactions WHERE install_id IS NULL OR install_id NOT IN (SELECT install_id FROM installs)")
    await c.execute(
        "DELETE FROM prayer_requests WHERE install_id IS NULL OR install_id NOT IN (SELECT install_id FROM installs)")

    installs = [
        # (platform, client_version, first_seen_days_ago, last_seen_days_ago)
        ("android", "1.0.0", 55, 0),
        ("android", "1.0.0", 41, 1),
        ("web",     "1.0.0", 52, 2),
        ("android", "1.0.0", 23, 0),
        ("web",     "1.0.0", 17, 6),
        ("android", "1.0.0", 9,  0),
    ]
    install_ids: list[uuid.UUID] = []
    for platform, version, first, last in installs:
        iid = _uuid()
        install_ids.append(iid)
        await c.execute(
            """INSERT INTO installs (install_id, first_seen, last_seen, client_version, platform, request_count, synthetic)
               VALUES ($1, $2, $3, $4, $5, $6, true)""",
            iid, _at(first, rng.randint(7, 22)), _at(last, rng.randint(7, 23)), version, platform, rng.randint(20, 260))

    # Prayer links: content-free tokens; most have expired, a couple are live.
    prayers = 0
    for i in range(10):
        iid = rng.choice(install_ids)
        if i < 8:
            created = _at(rng.randint(1, 50), rng.randint(19, 23))
            acks = rng.choice([0, 0, 1, 1, 2, 3])
        else:
            created = now() - timedelta(minutes=rng.randint(10, 40))
            acks = 1
        await c.execute(
            """INSERT INTO prayer_requests (token, install_id, acks, created_at, updated_at, expires_at)
               VALUES ($1, $2, $3, $4::timestamptz, $4::timestamptz, $4::timestamptz + interval '2 hours')""",
            _token(), iid, acks, created)
        prayers += 1

    # AI-call metadata: eight weeks shaped like the demo's real patterns.
    rows = 0
    patterns = [
        # (weekday 0=Mon..6=Sun, hour, entry id, weeks present, install index)
        (6, 20, "anger-1",    [0, 1, 2, 3, 5, 7], 0),   # Sunday ~8 pm — "He deserves it."
        (4, 22, "escapism-1", [0, 1, 2, 4, 6],    1),   # Friday ~10 pm — "Just five more minutes."
        (2, 22, "fear-1",     [0, 2, 4, 6],       3),   # Wednesday ~10 pm — "It's all going to fall apart."
    ]
    for weekday, hour, entry_id, weeks, idx in patterns:
        for w in weeks:
            rows += await _battle(c, install_ids[idx], truth[entry_id], _at(_weekday_days_ago(weekday, w), hour))
    scattered = ["shame-1", "envy-1", "pride-1", "compulsion-1", "deceit-1", "sexual-2", "anger-2", "fear-2"]
    for i, entry_id in enumerate(scattered):
        for days_ago in (rng.randint(2, 20), rng.randint(21, 54)):
            rows += await _battle(c, install_ids[(i + 2) % len(install_ids)], truth[entry_id], _at(days_ago, rng.randint(18, 23)))
    # A few weekly Schemes-screen insight calls.
    for w in range(1, 7):
        await c.execute(
            """INSERT INTO ai_interactions (install_id, endpoint, model, prompt_version, latency_ms, created_at)
               VALUES ($1, 'insight', $2, $3, $4, $5)""",
            install_ids[0], GLOO, "insight@1", rng.randint(1800, 3600), _at(_weekday_days_ago(6, w), 21))
        rows += 1
    return {"installs": len(install_ids), "prayer_requests": prayers, "ai_interactions": rows}


def _token() -> str:
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
    return "".join(rng.choice(alphabet) for _ in range(22))


async def _battle(c: asyncpg.Connection, iid: uuid.UUID, entry: dict, at: datetime) -> int:
    """One realistic battle: a discern call, usually followed by compose (and
    sometimes a truth-selection call) a few seconds later."""
    live = rng.random() < 0.7  # most calls reached Gloo; the rest hit the deterministic fallback
    model, version_suffix = (GLOO, "@1") if live else (FALLBACK, "@fallback")
    latency = rng.randint(2000, 4500) if live else rng.randint(60, 120)
    confidence = round(rng.uniform(0.78, 0.92), 2) if live else 0.62
    n = 0
    await c.execute(
        """INSERT INTO ai_interactions (install_id, endpoint, model, prompt_version, latency_ms,
                                        struggle, safety_flag, confidence, intensity, verse_usfms, created_at)
           VALUES ($1, 'discern', $2, $3, $4, $5, 'none', $6, $7, '{}', $8)""",
        iid, model, "discern" + version_suffix, latency, entry["struggle"], confidence, rng.randint(5, 8), at)
    n += 1
    if rng.random() < 0.85:
        await c.execute(
            """INSERT INTO ai_interactions (install_id, endpoint, model, prompt_version, latency_ms, struggle, verse_usfms, created_at)
               VALUES ($1, 'compose', $2, $3, $4, $5, $6, $7)""",
            iid, model, "compose" + version_suffix, rng.randint(1500, 3800) if live else rng.randint(40, 90),
            entry["struggle"], entry["truth"], at + timedelta(seconds=rng.randint(2, 6)))
        n += 1
    if rng.random() < 0.3:
        await c.execute(
            """INSERT INTO ai_interactions (install_id, endpoint, model, prompt_version, latency_ms, struggle, verse_usfms, created_at)
               VALUES ($1, 'truth', $2, $3, $4, $5, $6, $7)""",
            iid, model, "truth" + version_suffix, rng.randint(900, 2200) if live else rng.randint(30, 70),
            entry["struggle"], entry["truth"][:1] + entry["support"][:1], at + timedelta(seconds=1))
        n += 1
    return n


async def main() -> int:
    url = database_url()
    print(f"seed: {masked(url)}")
    conn = await asyncpg.connect(url)
    try:
        async with conn.transaction():
            ref_ids = await seed_reference(conn)
            data = json.loads(TRUTH_INDEX.read_text(encoding="utf-8"))
            truth = {e["id"]: e for e in data["entries"]}
            counts = await seed_usage(conn, truth)
        counts.update({
            "bible_versions": 1, "scripture_references": len(ref_ids),
            "truth_entries": len(truth),
            "truth_entry_verses": await conn.fetchval("SELECT count(*) FROM truth_entry_verses"),
            "struggle_defaults": await conn.fetchval("SELECT count(*) FROM struggle_defaults"),
        })
        for k, v in counts.items():
            print(f"  {k:<22} {v}")
        return 0
    finally:
        await conn.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
