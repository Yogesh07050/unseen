"""Shared helpers for the migration runner and the seed.

Reads DATABASE_URL from the environment first, then from the repository-root ``.env`` (the
same file the API reads through pydantic-settings). Kept dependency-free so the
scripts run with the server venv python and nothing else.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

DATABASE_DIR = Path(__file__).resolve().parent
REPO_DIR = DATABASE_DIR.parent
SERVER_DIR = REPO_DIR / "server"


def read_dotenv(path: Path) -> dict[str, str]:
    """Minimal .env parser: KEY=value, KEY = value, quotes stripped, # comments."""
    out: dict[str, str] = {}
    if not path.is_file():
        return out
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip()
        if value[:1] in ("'", '"') and value[-1:] == value[:1]:
            value = value[1:-1]
        else:
            value = value.split(" #", 1)[0].strip()
        out[key.strip()] = value
    return out


def database_url() -> str:
    url = os.environ.get("DATABASE_URL") or read_dotenv(REPO_DIR / ".env").get("DATABASE_URL")
    if not url:
        sys.exit("DATABASE_URL is not set (export it or add it to the repository-root .env)")
    return url


def masked(url: str) -> str:
    """postgresql://user:***@host/db — safe to print."""
    if "@" in url and "://" in url:
        scheme, rest = url.split("://", 1)
        creds, host = rest.rsplit("@", 1)
        if ":" in creds:
            creds = creds.split(":", 1)[0] + ":***"
        return f"{scheme}://{creds}@{host}"
    return url


def add_server_to_path() -> None:
    """Make ``app.services.usfm`` importable from the server package."""
    if str(SERVER_DIR) not in sys.path:
        sys.path.insert(0, str(SERVER_DIR))
