"""Per-account data sync: the phone's sealed store, mirrored on the server.

GET  /api/me?since=<ms>  → rows changed after `since` (soft-deletes included) + profile
POST /api/me             → batched upserts / deletes / profile (last-write-wins by updatedAt)
DELETE /api/me           → hard-delete everything the account stored

Every call needs a signed-in session (Authorization: Bearer …, routers/auth.py);
rows are owned by the account, whichever install wrote them. Without a
database the endpoints answer `available: false` and the phone keeps working
from its own store.
"""
import time

from fastapi import APIRouter, Depends, Header, HTTPException, Request

from ..deps import body_limit, current_user, rate_limit
from ..schemas import SyncAck, SyncPullOut, SyncPushIn
from ..services import db

router = APIRouter()


def _now_ms() -> int:
    return int(time.time() * 1000)


@router.get("/me", response_model=SyncPullOut,
            dependencies=[Depends(rate_limit("sync_pull", 600, 3600))])
async def pull(request: Request, since: int = 0, user: dict = Depends(current_user)) -> SyncPullOut:
    pool = request.app.state.db
    if pool is None:
        return SyncPullOut(now=_now_ms(), available=False)
    data = await db.pull_account(pool, user["id"], since)
    return SyncPullOut(available=True, **data)


@router.post("/me", response_model=SyncAck,
             dependencies=[Depends(body_limit(2_000_000)), Depends(rate_limit("sync_push", 1200, 3600))])
async def push(body: SyncPushIn, request: Request, user: dict = Depends(current_user),
               x_install_id: str | None = Header(default=None)) -> SyncAck:
    pool = request.app.state.db
    if pool is None:
        return SyncAck(ok=True, now=_now_ms(), available=False)
    unknown = [c for c in body.upserts if c not in db.USER_COLLECTIONS]
    if unknown:
        raise HTTPException(400, detail={"code": "bad_request", "message": f"Unknown collection {unknown[0]}"})
    counts = await db.push_account(pool, user["id"], x_install_id, body.profile, body.upserts,
                                   [(d.collection, d.id) for d in body.deletes])
    return SyncAck(ok=True, now=_now_ms(), available=True, **counts)


@router.delete("/me", response_model=SyncAck,
               dependencies=[Depends(rate_limit("sync_wipe", 20, 3600))])
async def wipe(request: Request, user: dict = Depends(current_user)) -> SyncAck:
    pool = request.app.state.db
    if pool is None:
        return SyncAck(ok=True, now=_now_ms(), available=False)
    await db.wipe_account(pool, user["id"])
    return SyncAck(ok=True, now=_now_ms(), available=True)
