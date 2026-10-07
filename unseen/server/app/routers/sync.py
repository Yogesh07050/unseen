"""Per-install data sync: the phone's sealed store, mirrored on the server.

GET  /api/me?since=<ms>  → rows changed after `since` (soft-deletes included) + profile
POST /api/me             → batched upserts / deletes / profile (last-write-wins by updatedAt)
DELETE /api/me           → hard-delete everything this install stored

Identity is the anonymous X-Install-Id the phone generated; there are no
accounts. Without a database the endpoints answer `available: false` and the
phone keeps working from its own store.
"""
from fastapi import APIRouter, Depends, Header, HTTPException, Request

from ..deps import body_limit, rate_limit
from ..schemas import SyncAck, SyncPullOut, SyncPushIn
from ..services import db

router = APIRouter()


def _now_ms() -> int:
    import time
    return int(time.time() * 1000)


@router.get("/me", response_model=SyncPullOut,
            dependencies=[Depends(rate_limit("sync_pull", 600, 3600))])
async def pull(request: Request, since: int = 0, x_install_id: str | None = Header(default=None)) -> SyncPullOut:
    pool = request.app.state.db
    if pool is None or db.as_uuid(x_install_id) is None:
        return SyncPullOut(now=_now_ms(), available=False)
    data = await db.pull_user(pool, x_install_id or "", since)
    return SyncPullOut(available=True, **data)


@router.post("/me", response_model=SyncAck,
             dependencies=[Depends(body_limit(2_000_000)), Depends(rate_limit("sync_push", 1200, 3600))])
async def push(body: SyncPushIn, request: Request, x_install_id: str | None = Header(default=None)) -> SyncAck:
    pool = request.app.state.db
    if pool is None or db.as_uuid(x_install_id) is None:
        return SyncAck(ok=True, now=_now_ms(), available=False)
    unknown = [c for c in body.upserts if c not in db.USER_COLLECTIONS]
    if unknown:
        raise HTTPException(400, detail={"code": "bad_request", "message": f"Unknown collection {unknown[0]}"})
    counts = await db.push_user(pool, x_install_id or "", body.profile, body.upserts,
                                [(d.collection, d.id) for d in body.deletes])
    return SyncAck(ok=True, now=_now_ms(), available=True, **counts)


@router.delete("/me", response_model=SyncAck,
               dependencies=[Depends(rate_limit("sync_wipe", 20, 3600))])
async def wipe(request: Request, x_install_id: str | None = Header(default=None)) -> SyncAck:
    pool = request.app.state.db
    if pool is None or db.as_uuid(x_install_id) is None:
        return SyncAck(ok=True, now=_now_ms(), available=False)
    await db.wipe_user(pool, x_install_id or "")
    return SyncAck(ok=True, now=_now_ms(), available=True)
