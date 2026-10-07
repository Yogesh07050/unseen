"""Content-free prayer links (section 11). No names, numbers or struggle ever stored."""
import secrets
import time

from fastapi import APIRouter, Depends, HTTPException, Request

from ..config import settings
from ..deps import rate_limit
from ..schemas import PrayCreateOut, PrayStatusOut

router = APIRouter()

TTL = 7200  # 2 hours
MAX_ACKS = 10


@router.post("/pray", response_model=PrayCreateOut,
             dependencies=[Depends(rate_limit("pray_create", 12, 3600))])
async def create(request: Request) -> PrayCreateOut:
    token = secrets.token_urlsafe(16)
    expires_at = int((time.time() + TTL) * 1000)
    await request.app.state.kv.set_json(f"pray:{token}", {"acks": 0, "expiresAt": expires_at}, TTL)
    return PrayCreateOut(token=token, url=f"{settings.app_base_url}/p/{token}", expiresAt=expires_at)


@router.get("/pray/{token}", response_model=PrayStatusOut,
            dependencies=[Depends(rate_limit("pray_status", 1000, 3600))])
async def status(token: str, request: Request) -> PrayStatusOut:
    rec = await request.app.state.kv.get_json(f"pray:{token}")
    if not rec:
        raise HTTPException(410, detail={"code": "gone", "message": "This prayer request has ended"})
    return PrayStatusOut(acks=rec["acks"], expiresAt=rec["expiresAt"])


@router.post("/pray/{token}/ack", response_model=PrayStatusOut,
             dependencies=[Depends(rate_limit("pray_ack", 20, 3600, by="ip"))])
async def ack(token: str, request: Request) -> PrayStatusOut:
    rec = await request.app.state.kv.get_json(f"pray:{token}")
    if not rec:
        raise HTTPException(410, detail={"code": "gone", "message": "This prayer request has ended"})
    rec["acks"] = min(MAX_ACKS, rec["acks"] + 1)
    ttl = max(1, int((rec["expiresAt"] / 1000) - time.time()))
    await request.app.state.kv.set_json(f"pray:{token}", rec, ttl)
    return PrayStatusOut(acks=rec["acks"], expiresAt=rec["expiresAt"])
