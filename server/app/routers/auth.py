"""Accounts: register, sign in, sign out, who am I.

POST /api/auth/register  {username, password} → {token, user, expiresAt}
POST /api/auth/login     {username, password} → {token, user, expiresAt, claimed}
POST /api/auth/logout    (Bearer)             → revokes the session
GET  /api/auth/me        (Bearer)             → {id, username}

Sign-in logic: the username is normalised; a lock check runs before any
password work; the password is verified in constant time (a dummy hash when
the user does not exist, so timing cannot reveal accounts); failures are
counted per username and per address; success clears the counters, records
last_login_at, creates a 30-day session, links this install to the account and
claims the anonymous history it recorded before signing in.
"""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request

from ..deps import body_limit, current_user, rate_limit
from ..schemas import AuthOut, CredentialsIn, UserOut
from ..services import auth, db

router = APIRouter()


def _pool(request: Request):
    pool = request.app.state.db
    if pool is None:
        raise HTTPException(503, detail={"code": "no_database", "message": "Accounts need the database (set DATABASE_URL)"})
    return pool


def _ip(request: Request) -> str | None:
    fwd = request.headers.get("x-forwarded-for")
    return (fwd.split(",")[0].strip() if fwd else None) or (request.client.host if request.client else None)


async def _start_session(request: Request, pool, user: dict, install_id: str | None) -> AuthOut:
    token = auth.new_token()
    expires = datetime.now(timezone.utc) + timedelta(days=auth.SESSION_DAYS)
    await db.create_session(pool, user["id"], auth.token_hash(token), install_id, expires)
    claimed = await db.claim_install(pool, user["id"], install_id)
    await db.touch_login(pool, user["id"])
    return AuthOut(token=token, user=UserOut(id=str(user["id"]), username=user["username"]),
                   expiresAt=int(expires.timestamp() * 1000), claimed=claimed)


@router.post("/auth/register", response_model=AuthOut,
             dependencies=[Depends(body_limit(4096)), Depends(rate_limit("auth_register", 10, 3600, by="ip"))])
async def register(body: CredentialsIn, request: Request, x_install_id: str | None = Header(default=None)) -> AuthOut:
    pool = _pool(request)
    username = auth.normalize_username(body.username)
    auth.check_password(body.password)
    user = await db.create_user(pool, username, auth.hash_password(body.password))
    if user is None:
        raise HTTPException(409, detail={"code": "username_taken", "message": "That username is taken."})
    return await _start_session(request, pool, user, x_install_id)


@router.post("/auth/login", response_model=AuthOut,
             dependencies=[Depends(body_limit(4096)), Depends(rate_limit("auth_login", 60, 900, by="ip"))])
async def login(body: CredentialsIn, request: Request, x_install_id: str | None = Header(default=None)) -> AuthOut:
    pool = _pool(request)
    kv = request.app.state.kv
    ip = _ip(request)
    try:
        username = auth.normalize_username(body.username)
    except HTTPException:
        username = (body.username or "").strip().lower()[:64] or "-"
    await auth.check_not_locked(kv, username, ip)
    user = await db.get_user_by_username(pool, username) if auth.USERNAME_RE.match(username) else None
    ok = auth.verify_password(body.password, user["password_hash"] if user else None)
    if not user or not ok:
        await auth.record_failure(kv, username, ip)
        raise HTTPException(401, detail={"code": "bad_credentials", "message": "Wrong username or password."})
    await auth.clear_failures(kv, username, ip)
    return await _start_session(request, pool, user, x_install_id)


@router.post("/auth/logout", dependencies=[Depends(rate_limit("auth_logout", 60, 3600))])
async def logout(request: Request, authorization: str | None = Header(default=None)) -> dict:
    token = auth.bearer(authorization)
    pool = request.app.state.db
    if token and pool is not None:
        await db.revoke_session(pool, auth.token_hash(token))
    return {"ok": True}


@router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(current_user)) -> UserOut:
    return UserOut(id=str(user["id"]), username=user["username"])
