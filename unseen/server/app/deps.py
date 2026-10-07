"""Install id, body-size and rate-limit dependencies (section 12)."""
from __future__ import annotations

import time

from fastapi import Header, HTTPException, Request


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
