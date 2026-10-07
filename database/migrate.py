#!/usr/bin/env python
"""Idempotent plain-SQL migration runner.

    server/.venv/bin/python database/migrate.py [--status]

Applies every ``database/migrations/NNNN_*.sql`` file not yet recorded in
``schema_migrations``, in filename order, each inside its own transaction. A
sha256 of each applied file is stored so an edited, already-applied migration
is reported instead of silently ignored (write a new numbered file instead).
"""
from __future__ import annotations

import asyncio
import hashlib
import sys
import time
from pathlib import Path

import asyncpg

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _env import DATABASE_DIR, database_url, masked  # noqa: E402

MIGRATIONS = DATABASE_DIR / "migrations"

BOOTSTRAP = """
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     text         PRIMARY KEY,
    checksum    text         NOT NULL,
    applied_at  timestamptz  NOT NULL DEFAULT now(),
    duration_ms integer      NOT NULL
);
"""


def _files() -> list[Path]:
    return sorted(p for p in MIGRATIONS.glob("[0-9][0-9][0-9][0-9]_*.sql") if p.is_file())


async def main(argv: list[str]) -> int:
    url = database_url()
    conn = await asyncpg.connect(url)
    try:
        await conn.execute(BOOTSTRAP)
        applied = {r["version"]: r["checksum"] for r in await conn.fetch(
            "SELECT version, checksum FROM schema_migrations ORDER BY version")}
        pending: list[Path] = []
        for path in _files():
            version = path.stem
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            if version in applied:
                state = "applied" if applied[version] == digest else "applied (FILE CHANGED since)"
                print(f"  {version:<28} {state}")
                continue
            pending.append(path)
            print(f"  {version:<28} pending")
        if "--status" in argv:
            return 0
        for path in pending:
            version = path.stem
            sql = path.read_text(encoding="utf-8")
            t0 = time.perf_counter()
            async with conn.transaction():
                await conn.execute(sql)
                await conn.execute(
                    "INSERT INTO schema_migrations (version, checksum, duration_ms) VALUES ($1, $2, $3)",
                    version, hashlib.sha256(path.read_bytes()).hexdigest(),
                    int((time.perf_counter() - t0) * 1000))
            print(f"  applied {version} in {int((time.perf_counter() - t0) * 1000)} ms")
        if not pending:
            print("  nothing to do")
        return 0
    finally:
        await conn.close()


if __name__ == "__main__":
    print(f"migrate: {masked(database_url())}")
    raise SystemExit(asyncio.run(main(sys.argv[1:])))
