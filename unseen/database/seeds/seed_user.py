#!/usr/bin/env python
"""Fill a real install with a believable eight-week history, so Stones, Schemes,
Watch, Armory and Allies show a lived-in account from the first open.

    cd unseen && server/.venv/bin/python database/seeds/seed_user.py --username yogesh --name Yogesh
    cd unseen && server/.venv/bin/python database/seeds/seed_user.py --all-recent --name Yogesh          # anonymous installs
    cd unseen && server/.venv/bin/python database/seeds/seed_user.py --install <uuid> --name Yogesh --replace

With --username the history belongs to that ACCOUNT (users table, 0003): the
user is created if missing (password from --password or SEED_USER_PASSWORD in
the environment / unseen/.env), the history is written once under the account,
earlier anonymous copies on the targeted installs are removed, and those
installs are linked to the account. Signing in as that user on any phone then
pulls this one history. Without --username the rows stay anonymous, keyed by
install id (--all-recent: every real install seen in the last 30 days;
--install: one). Existing history is kept unless --replace is given (the
profile is always upserted so the name shows).

What it writes (database/migrations/0002_user_data.sql):
  user_profiles   first name, onboarded eight weeks ago, BSB, AI discernment
  user_battles    ~24 battles: Sunday-evening anger after family messages,
                  late-Friday scrolling, mid-week fear before deadlines, and a
                  scattering of shame / envy / pride / compulsion / deceit —
                  varied lie wording so Schemes clusters them, real USFM verses
  user_stones     a stood stone per stood battle, a rose-again stone per fall,
                  three "won from memory" stones this month
  user_allies     three allies who agreed to pray
  user_armory     the verses the person has stood with, with a sharpness level
Watch windows are derived on the phone from the battles (recompute) and pushed
back. Nothing here is Scripture text: references only, fetched live by the app.
Times are generated in this machine's local timezone so the Sunday 8 pm pattern
reads as Sunday 8 pm on the device.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import random
import sys
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import asyncpg

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from _env import SERVER_DIR, UNSEEN_DIR, add_server_to_path, database_url, masked, read_dotenv  # noqa: E402

add_server_to_path()
from app.services import auth as auths  # noqa: E402
from app.services import db as dbs  # noqa: E402
from app.services.usfm import parse  # noqa: E402

BSB = 3034
BSB_TEXT = json.loads((SERVER_DIR / "app" / "content" / "bsb_verses.json").read_text(encoding="utf-8"))["verses"]
LOCAL_TZ = datetime.now().astimezone().tzinfo
INTERVALS = [0, 1, 3, 7, 14, 30]  # Armory drill spacing (days) per sharpness, as in app/src/screens/Armory.tsx
ARCHETYPE = {"anger": "ember", "fear": "whisperer", "sexual": "serpent", "escapism": "fog", "shame": "accuser",
             "envy": "mirror", "compulsion": "chain", "deceit": "mask", "pride": "crown", "other": "shadow"}


def ms(dt: datetime) -> int:
    return int(dt.timestamp() * 1000)


def now() -> datetime:
    return datetime.now(LOCAL_TZ)


def label(usfm: list[str]) -> str:
    first, last = parse(usfm[0]), parse(usfm[-1])
    if len(usfm) == 1:
        return first.reference
    if first.book == last.book and first.chapter == last.chapter:
        return f"{first.reference}-{last.verse}"
    return f"{first.reference}–{last.reference}"


def verse(usfm: list[str]) -> dict:
    return {"bibleId": BSB, "usfm": usfm, "reference": label(usfm)}


def first_words(usfm: list[str]) -> str:
    v = BSB_TEXT.get(usfm[0])
    return " ".join(v["content"].split()[:5]) if v else label(usfm)


class Gen:
    def __init__(self, seed: int):
        self.rng = random.Random(seed)

    def uuid(self) -> str:
        return str(uuid.UUID(int=self.rng.getrandbits(128), version=4))

    def at(self, days_ago: int, hour: int) -> datetime:
        base = now() - timedelta(days=days_ago)
        return base.replace(hour=hour, minute=self.rng.randint(0, 55), second=self.rng.randint(0, 59), microsecond=0)

    def weekday_days_ago(self, js_weekday: int, weeks_ago: int) -> int:
        """Days ago of the given JS weekday (0=Sun..6=Sat) `weeks_ago` weeks back (0 = the most recent one)."""
        today_js = (now().weekday() + 1) % 7
        return (today_js - js_weekday) % 7 + 7 * weeks_ago

    def battle(self, at: datetime, *, struggle: str, lie: str, stirred: list[str], triggers: list[str],
               context: str, front: str, verse_usfm: list[str], backups: list[list[str]], outcome: str,
               escape: str | None, channel: str = "voice", why: str = "") -> dict:
        secs = self.rng.randint(38, 95)
        ended = at + timedelta(seconds=secs)
        return {
            "id": self.uuid(), "startedAt": ms(at), "endedAt": ms(ended), "timeZone": str(LOCAL_TZ),
            "channel": channel, "struggle": struggle, "archetype": ARCHETYPE.get(struggle, "shadow"),
            "lie": lie, "lieClusterId": f"{struggle}:{lie.lower()}", "stirredBy": stirred,
            "triggers": triggers, "contextType": context, "front": front, "intensity": self.rng.randint(5, 9),
            "verse": verse(verse_usfm), "backup": verse(backups[0]) if backups else None,
            "backups": [verse(b) for b in backups], "why": why,
            "strikes": self.rng.randint(3, 6), "outcome": outcome, "escapeTaken": escape,
            "secondsToPeace": secs, "allyAcks": self.rng.choice([0, 0, 1, 1, 2]), "offline": False,
            "promptVersion": "discern@2", "model": "gloo-anthropic-claude-haiku-4.5", "updatedAt": ms(ended),
        }


def history(g: Gen) -> tuple[list[dict], list[dict], list[dict], list[dict]]:
    battles: list[dict] = []

    # Sunday evenings: anger after family messages. Seven of the last eight weeks.
    sunday_lies = ["He deserves it.", "He deserves to hear it.", "He deserves every word of this.",
                   "He deserves it.", "He deserves a taste of it.", "He deserves it.", "He deserves to hear it."]
    sunday_outcomes = ["stood", "stood", "stood", "stood", "stood", "fell", "stood"]  # oldest first
    stirred = [["a cutting text", "being ignored"], ["the family group chat"], ["being talked over"],
               ["an old argument", "tired"], ["a sarcastic reply"], ["being blamed again"], ["a late-night message"]]
    for i, w in enumerate([7, 6, 5, 4, 3, 2, 0]):
        battles.append(g.battle(
            g.at(g.weekday_days_ago(0, w), 20), struggle="anger", lie=sunday_lies[i], stirred=stirred[i],
            triggers=["hurt", "conflict", "tired"], context="family", front="flesh",
            verse_usfm=["EPH.4.26", "EPH.4.27"] if i % 3 else ["ROM.12.19"],
            backups=[["PRO.15.1"], ["JAS.1.19"], ["ROM.12.19"]] if i % 3 else [["EPH.4.26", "EPH.4.27"], ["PRO.15.1"]],
            outcome=sunday_outcomes[i], escape="wait_10" if i % 2 else "gentle_reply",
            why="Answers revenge with God's promise to judge" if i % 3 == 0 else "Names anger without letting it rule"))

    # Friday nights: scrolling instead of sleeping. Five of eight weeks, one fall.
    friday_lies = ["Just five more minutes.", "Five more minutes won't hurt.", "Just one more video.",
                   "Just five more minutes.", "Five more minutes, then I'll sleep."]
    for i, w in enumerate([6, 4, 2, 1, 0]):
        battles.append(g.battle(
            g.at(g.weekday_days_ago(5, w), 22), struggle="escapism", lie=friday_lies[i],
            stirred=[["can't sleep"], ["a long week"], ["bored"], ["avoiding tomorrow"], ["the feed"]][i],
            triggers=["bored", "late_night", "online"], context="online", front="flesh",
            verse_usfm=["EPH.5.15", "EPH.5.16"] if i != 2 else ["PSA.90.12"],
            backups=[["PSA.90.12"], ["COL.3.2"]] if i != 2 else [["EPH.5.15", "EPH.5.16"]],
            outcome="fell" if i == 1 else "stood", escape="phone_away" if i % 2 else "set_stop", channel="text",
            why="Redeems the hours instead of numbing them"))

    # Wednesday late: fear before deadlines. Four battles, all stood.
    wed_lies = ["It's all going to fall apart.", "Everything is going to fall apart.",
                "I'm going to lose this job.", "It's all going to fall apart."]
    for i, w in enumerate([6, 4, 2, 0]):
        battles.append(g.battle(
            g.at(g.weekday_days_ago(3, w), 22), struggle="fear", lie=wed_lies[i],
            stirred=[["a deadline"], ["a message from my manager"], ["a missed target"], ["tomorrow's review"]][i],
            triggers=["stressed", "tired"], context="work", front="world",
            verse_usfm=["PHP.4.6", "PHP.4.7"] if i % 2 == 0 else ["ISA.41.10"],
            backups=[["ISA.41.10"], ["MAT.6.34"]] if i % 2 == 0 else [["PHP.4.6", "PHP.4.7"], ["MAT.6.34"]],
            outcome="stood", escape="breath_prayer", why="Trades anxiety for prayer and promised peace"))

    # Scattered battles across the eight weeks.
    scatter = [
        ("shame", "You're too far gone.", ["after a fall"], ["tired", "alone"], "home_alone", "devil", ["ROM.8.1"], [["1JN.1.9"], ["MIC.7.8"]], "stood", "confession_guide", 23, 23),
        ("shame", "God is tired of you.", ["another relapse"], ["alone", "late_night"], "home_alone", "devil", ["LAM.3.22", "LAM.3.23"], [["ROM.8.1"], ["MIC.7.8"]], "fell", None, 41, 0),
        ("envy", "Their life is better than yours.", ["a holiday post"], ["online"], "social", "world", ["GAL.6.4"], [["PHP.4.11", "PHP.4.12"], ["PSA.73.26"]], "stood", "three_gifts", 12, 19),
        ("envy", "Everyone has it easier than me.", ["a promotion announcement"], ["online", "stressed"], "work", "world", ["GAL.6.4"], [["PHP.4.11", "PHP.4.12"]], "stood", "walk_10", 33, 13),
        ("pride", "You don't need anyone.", ["being offered help"], ["conflict"], "church", "flesh", ["JAS.4.6"], [["ECC.4.9", "ECC.4.10"]], "stood", "ask_help", 18, 17),
        ("compulsion", "You need this to cope.", ["a hard day"], ["stressed"], "home_alone", "flesh", ["GAL.5.1"], [["2CO.12.9"], ["1CO.10.13"]], "stood", "text_ally", 9, 21),
        ("compulsion", "One more won't matter.", ["a long shift"], ["stressed", "tired"], "home_alone", "flesh", ["1CO.10.13"], [["GAL.5.1"]], "fell", None, 27, 22),
        ("deceit", "A small lie protects everyone.", ["a question I didn't want"], ["conflict"], "family", "flesh", ["EPH.4.25"], [["PRO.12.22"]], "stood", "true_sentence", 15, 18),
    ]
    for struggle, lie, stirred, trig, ctx, front, v, bk, outcome, esc, days_ago, hour in scatter:
        battles.append(g.battle(g.at(days_ago, hour), struggle=struggle, lie=lie, stirred=stirred, triggers=trig,
                                context=ctx, front=front, verse_usfm=v, backups=bk, outcome=outcome, escape=esc,
                                channel=g.rng.choice(["voice", "text"]), why="Answers the lie with a promise"))
    battles.sort(key=lambda b: b["startedAt"])

    # Stones: one per stood battle, a rose-again stone per fall, three from memory this month.
    stones: list[dict] = []
    notes = {"anger": "Walked away from the thread before replying.", "fear": "Prayed it through and slept.",
             "escapism": "Phone went to the kitchen.", "compulsion": "Texted Daniel instead."}
    for i, b in enumerate(battles):
        day = datetime.fromtimestamp(b["startedAt"] / 1000, LOCAL_TZ).strftime("%Y-%m-%d")
        if b["outcome"] == "stood":
            stones.append({"id": g.uuid(), "battleId": b["id"], "kind": "stood", "date": day, "verse": b["verse"],
                           "note": notes.get(b["struggle"]) if i % 4 == 0 else None, "updatedAt": b["endedAt"]})
        elif b["outcome"] == "fell":
            stones.append({"id": g.uuid(), "battleId": b["id"], "kind": "rose_again", "date": day,
                           "verse": verse(["MIC.7.8"]), "note": "I fell. I'm getting back up." if i % 2 else None,
                           "updatedAt": b["endedAt"] + 3_600_000})
    month = now().strftime("%Y-%m")
    for d in (1, 3, 6):
        when = now() - timedelta(days=d)
        if when.strftime("%Y-%m") == month:
            stones.append({"id": g.uuid(), "kind": "from_memory", "date": when.strftime("%Y-%m-%d"), "updatedAt": ms(when)})

    # Allies: three people who agreed to pray.
    allies = [
        {"id": g.uuid(), "name": "Daniel", "role": "brother in Christ", "phone": "+1 555 0142",
         "consentAt": ms(now() - timedelta(days=50)), "lastAskedAt": ms(now() - timedelta(days=3, hours=2)),
         "updatedAt": ms(now() - timedelta(days=3, hours=2))},
        {"id": g.uuid(), "name": "Priya", "role": "small group", "consentAt": ms(now() - timedelta(days=44)),
         "lastAskedAt": ms(now() - timedelta(days=16)), "updatedAt": ms(now() - timedelta(days=16))},
        {"id": g.uuid(), "name": "Pastor Sam", "role": "pastor", "phone": "+1 555 0199",
         "consentAt": ms(now() - timedelta(days=30)), "updatedAt": ms(now() - timedelta(days=30))},
    ]

    # Armory: the verses the person has stood with, sharpened by use.
    wins: dict[str, dict] = {}
    for b in battles:
        if b["outcome"] != "stood":
            continue
        key = f"{BSB}:{','.join(b['verse']['usfm'])}"
        wins.setdefault(key, {"verse": b["verse"], "wins": 0})["wins"] += 1
    armory: list[dict] = []
    for key, w in wins.items():
        sharp = min(5, w["wins"])
        armory.append({"id": key, "verse": w["verse"], "firstWords": first_words(w["verse"]["usfm"]),
                       "sharpness": sharp, "nextDrillAt": ms(now() + timedelta(days=INTERVALS[sharp] - g.rng.randint(0, 2))),
                       "wins": w["wins"], "drills": max(0, w["wins"] * 2 - 1), "updatedAt": ms(now() - timedelta(days=1))})
    return battles, stones, allies, armory


def profile(name: str, g: Gen) -> dict:
    onboarded = now() - timedelta(days=57)
    return {
        "id": "me", "firstName": name, "bibleId": BSB, "battleStyle": "cinematic", "reduceMotion": False,
        "sound": False, "retentionDays": 30, "watchAlerts": "in_app", "theme": "system", "discernMode": "gloo",
        "discernChosen": True, "adultConfirmedAt": ms(onboarded), "onboardedAt": ms(onboarded),
        "armorPlanArmed": True, "updatedAt": ms(onboarded),
    }


async def targets(c: asyncpg.Connection, args: argparse.Namespace) -> list[uuid.UUID]:
    if args.install:
        return [uuid.UUID(i) for i in args.install]
    rows = await c.fetch(
        "SELECT install_id FROM installs WHERE NOT synthetic AND last_seen > now() - ($1::int * interval '1 day') "
        "ORDER BY last_seen DESC", args.days)
    return [r["install_id"] for r in rows]


async def seed_account(args: argparse.Namespace) -> int:
    """One history owned by an account; targeted installs are linked to it."""
    username = auths.normalize_username(args.username)
    url = database_url()
    print(f"seed_user: {masked(url)}  account @{username}")
    conn = await asyncpg.connect(url)
    try:
        user = await conn.fetchrow("SELECT id, username FROM users WHERE username = $1", username)
        if user is None:
            password = args.password or os.environ.get("SEED_USER_PASSWORD") or read_dotenv(UNSEEN_DIR / ".env").get("SEED_USER_PASSWORD")
            if not password:
                print("  the account does not exist yet: pass --password or set SEED_USER_PASSWORD")
                return 1
            auths.check_password(password)
            user = await conn.fetchrow(
                "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username",
                username, auths.hash_password(password))
            print(f"  created user @{username}")
        uid = user["id"]
        ids = await targets(conn, args) if (args.install or args.all_recent) else []
        g = Gen(int.from_bytes(username.encode()[:8].ljust(8, b"\0"), "big") % (2**31))
        async with conn.transaction():
            existing = await conn.fetchval(
                "SELECT count(*) FROM user_battles WHERE account_id = $1 AND deleted_at IS NULL", uid)
            for iid in ids:
                await conn.execute("INSERT INTO installs (install_id) VALUES ($1) ON CONFLICT (install_id) DO NOTHING", iid)
                await conn.execute("UPDATE installs SET user_id = $1 WHERE install_id = $2", uid, iid)
                # Earlier anonymous copies on these installs would duplicate the account history.
                for table in ("user_battles", "user_stones", "user_allies", "user_armory", "user_watch", "user_profiles"):
                    await conn.execute(f"DELETE FROM {table} WHERE install_id = $1 AND account_id IS NULL", iid)
            writer = ids[0] if ids else uuid.uuid4()
            await conn.execute("INSERT INTO installs (install_id) VALUES ($1) ON CONFLICT (install_id) DO NOTHING", writer)
            await dbs.upsert_account_profile(conn, uid, writer, profile(args.name, g))
            if existing and not args.replace:
                print(f"  @{username}: profile '{args.name}' upserted; {existing} battles kept (use --replace to reset); "
                      f"linked {len(ids)} install(s)")
                return 0
            for table in ("user_battles", "user_stones", "user_allies", "user_armory", "user_watch"):
                await conn.execute(f"DELETE FROM {table} WHERE account_id = $1", uid)
            battles, stones, allies, armory = history(g)
            n = {"battles": await dbs.upsert_account_rows(conn, uid, writer, "battles", battles),
                 "stones": await dbs.upsert_account_rows(conn, uid, writer, "stones", stones),
                 "allies": await dbs.upsert_account_rows(conn, uid, writer, "allies", allies),
                 "armory": await dbs.upsert_account_rows(conn, uid, writer, "armory", armory)}
            print(f"  @{username}: profile '{args.name}' + " + ", ".join(f"{v} {k}" for k, v in n.items())
                  + f"; linked {len(ids)} install(s)")
        return 0
    finally:
        await conn.close()


async def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--install", action="append", help="install id (uuid); repeatable")
    ap.add_argument("--all-recent", action="store_true", help="every real install seen in the last --days days")
    ap.add_argument("--days", type=int, default=30)
    ap.add_argument("--name", default="Yogesh")
    ap.add_argument("--username", help="own the history by this account (created if missing)")
    ap.add_argument("--password", help="password for a NEW account (else SEED_USER_PASSWORD from env / .env)")
    ap.add_argument("--replace", action="store_true", help="drop the existing history first")
    args = ap.parse_args()
    if args.username:
        return await seed_account(args)
    if not args.install and not args.all_recent:
        ap.error("give --username <name>, --install <uuid> or --all-recent")

    url = database_url()
    print(f"seed_user: {masked(url)}")
    conn = await asyncpg.connect(url)
    try:
        ids = await targets(conn, args)
        if not ids:
            print("  no matching installs (open the app once so the server sees it, or pass --install)")
            return 1
        for iid in ids:
            g = Gen(int(iid.int % (2**31)))
            async with conn.transaction():
                await conn.execute(
                    "INSERT INTO installs (install_id) VALUES ($1) ON CONFLICT (install_id) DO NOTHING", iid)
                existing = await conn.fetchval(
                    "SELECT count(*) FROM user_battles WHERE install_id = $1 AND deleted_at IS NULL", iid)
                prof = profile(args.name, g)
                # Keep a newer on-device profile (e.g. a changed Bible version) from being overwritten:
                # the upsert is last-write-wins and this profile is dated eight weeks back.
                await dbs.upsert_profile(conn, iid, prof)
                if existing and not args.replace:
                    print(f"  {iid}  profile '{args.name}' upserted; {existing} battles kept (use --replace to reset)")
                    continue
                for table in ("user_battles", "user_stones", "user_allies", "user_armory", "user_watch"):
                    await conn.execute(f"DELETE FROM {table} WHERE install_id = $1", iid)
                battles, stones, allies, armory = history(g)
                n = {"battles": await dbs.upsert_user_rows(conn, iid, "battles", battles),
                     "stones": await dbs.upsert_user_rows(conn, iid, "stones", stones),
                     "allies": await dbs.upsert_user_rows(conn, iid, "allies", allies),
                     "armory": await dbs.upsert_user_rows(conn, iid, "armory", armory)}
                print(f"  {iid}  profile '{args.name}' + " + ", ".join(f"{v} {k}" for k, v in n.items()))
        return 0
    finally:
        await conn.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
