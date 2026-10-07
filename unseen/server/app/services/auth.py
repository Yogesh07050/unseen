"""Passwords, session tokens and sign-in throttling (routers/auth.py).

Password hashing: scrypt from the standard library (no extra dependency), a
16-byte random salt per user, parameters recorded in the stored string so they
can be raised later without breaking old hashes:
    scrypt$<log2 N>$<r>$<p>$<salt b64>$<hash b64>
Verification is constant-time (hmac.compare_digest) and runs against a dummy
hash when the username does not exist, so timing does not reveal accounts.

Session tokens are 32 random bytes (URL-safe); only their SHA-256 is stored.

Throttling: failed sign-ins are counted per username and per client IP in the
shared KV; past the limit the account is locked for the window (HTTP 429 with
a plain message) before any password is checked.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import re
import secrets

from fastapi import HTTPException

from .kv import KV

USERNAME_RE = re.compile(r"^[a-z0-9][a-z0-9_.]{2,31}$")
PASSWORD_MIN = 8
PASSWORD_MAX = 128
SESSION_DAYS = 30

_LOG_N, _R, _P = 14, 8, 2          # 16 MiB, ~50 ms on a laptop
_MAXMEM = 64 * 1024 * 1024
_DUMMY = None                       # a real hash, computed once, for constant-time misses

LOCK_WINDOW_S = 15 * 60
LOCK_AFTER_USER = 8                 # failed attempts on one username per window
LOCK_AFTER_IP = 40                  # failed attempts from one address per window


def normalize_username(raw: str) -> str:
    """Lower-case, trimmed. Raises 400 invalid_username when it cannot be a username."""
    u = (raw or "").strip().lower()
    if not USERNAME_RE.match(u):
        raise HTTPException(400, detail={
            "code": "invalid_username",
            "message": "Usernames are 3–32 characters: letters, numbers, dots or underscores, starting with a letter or number."})
    return u


def check_password(password: str) -> None:
    if not isinstance(password, str) or len(password) < PASSWORD_MIN:
        raise HTTPException(400, detail={"code": "weak_password",
                                         "message": f"Use at least {PASSWORD_MIN} characters."})
    if len(password) > PASSWORD_MAX:
        raise HTTPException(400, detail={"code": "weak_password", "message": "That password is too long."})
    if password.strip() != password or password.lower() in {"password", "12345678", "unseenapp"}:
        raise HTTPException(400, detail={"code": "weak_password", "message": "Choose a less common password."})


def _scrypt(password: str, salt: bytes, log_n: int, r: int, p: int) -> bytes:
    return hashlib.scrypt(password.encode("utf-8"), salt=salt, n=1 << log_n, r=r, p=p, maxmem=_MAXMEM, dklen=32)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = _scrypt(password, salt, _LOG_N, _R, _P)
    b64 = lambda b: base64.b64encode(b).decode()  # noqa: E731
    return f"scrypt${_LOG_N}${_R}${_P}${b64(salt)}${b64(digest)}"


def verify_password(password: str, stored: str | None) -> bool:
    """Constant-time check; a missing user is verified against a dummy hash."""
    global _DUMMY
    if stored is None:
        if _DUMMY is None:
            _DUMMY = hash_password(secrets.token_urlsafe(12))
        stored = _DUMMY
        password = password + "\x00"      # guarantee a miss even on an unlikely collision
    try:
        algo, log_n, r, p, salt_b64, hash_b64 = stored.split("$")
        if algo != "scrypt":
            return False
        expected = base64.b64decode(hash_b64)
        actual = _scrypt(password, base64.b64decode(salt_b64), int(log_n), int(r), int(p))
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(expected, actual)


def new_token() -> str:
    return secrets.token_urlsafe(32)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def bearer(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, _, value = authorization.partition(" ")
    value = value.strip()
    return value if scheme.lower() == "bearer" and 20 <= len(value) <= 128 else None


# ───────────────────────────── throttling ────────────────────────────────────
# One JSON counter per username and per address ({"n": failures}) with the
# window as its TTL. Read-modify-write is enough here: a lost update between two
# simultaneous wrong guesses only ever under-counts by one.

def _keys(username: str, ip: str | None) -> tuple[str, str]:
    return f"auth:fail:user:{username}", f"auth:fail:ip:{ip or 'unknown'}"


async def _count(kv: KV, key: str) -> int:
    row = await kv.get_json(key) or {}
    try:
        return int(row.get("n", 0))
    except (TypeError, ValueError):
        return 0


async def check_not_locked(kv: KV, username: str, ip: str | None) -> None:
    """Raise 429 locked when either counter is at its limit. Runs before any password work."""
    user_key, ip_key = _keys(username, ip)
    if await _count(kv, user_key) >= LOCK_AFTER_USER or await _count(kv, ip_key) >= LOCK_AFTER_IP:
        raise HTTPException(429, detail={
            "code": "locked",
            "message": "Too many sign-in attempts. Wait fifteen minutes and try again."})


async def record_failure(kv: KV, username: str, ip: str | None) -> None:
    for key in _keys(username, ip):
        await kv.set_json(key, {"n": await _count(kv, key) + 1}, ttl=LOCK_WINDOW_S)


async def clear_failures(kv: KV, username: str, ip: str | None) -> None:
    for key in _keys(username, ip):
        await kv.set_json(key, {"n": 0}, ttl=1)
