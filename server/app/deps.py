"""Install id, body-size and rate-limit dependencies (section 12)."""
from __future__ import annotations

import time

from fastapi import Header, HTTPException, Request

from .services import auth, db


def body_limit(max_bytes: int):
    async def dependency(request: Request):
        cl = request.headers.get("content-length")
        if cl and int(cl) > max_bytes:
            raise HTTPException(400, detail={"code": "bad_request", "message": "Body too large"})
    return dependency


def rate_limit(name: str, limit: int, window_s: int, by: str = "install"):
    async def dependency(request: Request, x_install_id: str | None = Header(default=None)):
        who = x_install_id if by == "install" else (request.client.host if request.client else None)
        if not who:
            raise HTTPException(400, detail={"code": "bad_request", "message": "Missing X-Install-Id"})
        bucket = int(time.time() // window_s)
        n = await request.app.state.kv.incr(f"rl:{name}:{who}:{bucket}", ttl=window_s)
        if n > limit:
            raise HTTPException(429, detail={"code": "rate_limited", "message": "Too many requests"})
    return dependency


async def current_user(request: Request, authorization: str | None = Header(default=None)) -> dict:
    """The signed-in user behind the bearer token, or 401. Needs the database."""
    token = auth.bearer(authorization)
    if not token:
        raise HTTPException(401, detail={"code": "unauthorized", "message": "Sign in to continue"})
    pool = request.app.state.db
    if pool is None:
        raise HTTPException(503, detail={"code": "no_database", "message": "Accounts need the database"})
    user = await db.get_session_user(pool, auth.token_hash(token))
    if not user:
        raise HTTPException(401, detail={"code": "unauthorized", "message": "Your session has ended. Sign in again."})
    request.state.user = user
    return user
