"""Content-free prayer links (section 11). No names, numbers or struggle ever stored.

Durable in PostgreSQL when DATABASE_URL is set (acks survive server restarts and
are shared across workers); otherwise the original Redis/MemoryKV record with a
2-hour TTL. Response shapes are identical on both paths.
"""
import secrets
import time

from fastapi import APIRouter, Depends, Header, HTTPException, Request

from ..config import settings
from ..deps import rate_limit
from ..schemas import PrayCreateOut, PrayStatusOut
from ..services import db

router = APIRouter()

TTL = 7200  # 2 hours
MAX_ACKS = 10


def _gone() -> HTTPException:
    return HTTPException(410, detail={"code": "gone", "message": "This prayer request has ended"})


@router.post("/pray", response_model=PrayCreateOut,
             dependencies=[Depends(rate_limit("pray_create", 12, 3600))])
async def create(request: Request, x_install_id: str | None = Header(default=None)) -> PrayCreateOut:
    token = secrets.token_urlsafe(16)
    expires_at = int((time.time() + TTL) * 1000)
    pool = request.app.state.db
    if pool is not None:
        await db.create_prayer(pool, token, x_install_id, expires_at)
        db.fire(db.sweep_expired_prayers(pool))  # housekeeping, off the request path
    else:
        await request.app.state.kv.set_json(f"pray:{token}", {"acks": 0, "expiresAt": expires_at}, TTL)
    return PrayCreateOut(token=token, url=f"{settings.app_base_url}/p/{token}", expiresAt=expires_at)


@router.get("/pray/{token}", response_model=PrayStatusOut,
            dependencies=[Depends(rate_limit("pray_status", 1000, 3600))])
async def status(token: str, request: Request) -> PrayStatusOut:
    pool = request.app.state.db
    if pool is not None:
        rec = await db.get_prayer(pool, token)
        if not rec:
            raise _gone()
        return PrayStatusOut(acks=rec["acks"], expiresAt=rec["expires_at_ms"])
    rec = await request.app.state.kv.get_json(f"pray:{token}")
    if not rec:
        raise _gone()
    return PrayStatusOut(acks=rec["acks"], expiresAt=rec["expiresAt"])


@router.post("/pray/{token}/ack", response_model=PrayStatusOut,
             dependencies=[Depends(rate_limit("pray_ack", 20, 3600, by="ip"))])
async def ack(token: str, request: Request) -> PrayStatusOut:
    pool = request.app.state.db
    if pool is not None:
        rec = await db.ack_prayer(pool, token)
        if not rec:
            raise _gone()
        return PrayStatusOut(acks=rec["acks"], expiresAt=rec["expires_at_ms"])
    rec = await request.app.state.kv.get_json(f"pray:{token}")
    if not rec:
        raise _gone()
    rec["acks"] = min(MAX_ACKS, rec["acks"] + 1)
    ttl = max(1, int((rec["expiresAt"] / 1000) - time.time()))
    await request.app.state.kv.set_json(f"pray:{token}", rec, ttl)
    return PrayStatusOut(acks=rec["acks"], expiresAt=rec["expiresAt"])
