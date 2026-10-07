import logging
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .config import settings
from .errors import install_error_handlers
from .middleware import SecurityHeaders, Timing
from .routers import ai, bible, health, pray, speech, sync, truth
from .services import db, kv, youversion

log = logging.getLogger("unseen")


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http = httpx.AsyncClient()
    app.state.kv = await kv.connect(settings.redis_url)
    youversion.use_kv(app.state.kv)  # verse text / search caching (rate-limit friendly)
    # PostgreSQL pool (None when DATABASE_URL is unset → every feature falls back).
    app.state.db = await db.connect(settings.database_url)
    if not settings.redis_url and settings.env == "production":
        # The Docker image runs 2 uvicorn workers; an in-memory KV is per-process, so
        # rate limits would double and a prayer link acked on one worker could 410 on
        # the other. docker-compose sets REDIS_URL; a bare `docker run` must too.
        log.warning("REDIS_URL is unset in production: rate limits and prayer tokens are "
                    "per-process and NOT shared across workers. Set REDIS_URL.")
    yield
    await app.state.http.aclose()
    await app.state.kv.close()
    if app.state.db is not None:
        await app.state.db.close()


app = FastAPI(
    title="UNSEEN API",
    lifespan=lifespan,
    openapi_url="/api/openapi.json",
    docs_url="/api/docs" if settings.env == "development" else None,
    redoc_url=None,
)
app.add_middleware(SecurityHeaders)
app.add_middleware(Timing)
# Added last so it is outermost: CORS headers reach every response, errors included.
# Only the native app's origins are allowed; the same-origin PWA is unaffected.
_cors = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
if _cors:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors,
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["Content-Type", "X-Install-Id", "X-Client-Version", "X-Client-Platform"],
        max_age=600,
    )


@app.middleware("http")
async def track_install(request, call_next):
    """Anonymous install registry: upsert installs(install_id) on every /api call
    (last_seen, client version, platform, request_count). Fire-and-forget; the
    install id is a random UUID the phone generated — never a person."""
    response = await call_next(request)
    pool = getattr(request.app.state, "db", None)
    if pool is not None and request.url.path.startswith("/api/"):
        install_id = request.headers.get("x-install-id")
        if install_id:
            db.fire(db.upsert_install(pool, install_id, request.headers.get("x-client-version"),
                                      request.headers.get("x-client-platform", "unknown")))
    return response


install_error_handlers(app)
for r in (ai.router, bible.router, pray.router, speech.router, health.router, truth.router, sync.router):
    app.include_router(r, prefix="/api")

STATIC = Path(settings.static_dir).resolve()


@app.get("/{path:path}", include_in_schema=False)
async def spa(path: str):
    if path.startswith("api/"):
        raise HTTPException(404, detail={"code": "not_found", "message": "Unknown API path"})
    if STATIC.is_dir():
        file = (STATIC / path).resolve()
        if path and file.is_relative_to(STATIC) and file.is_file():
            return FileResponse(file)
        index = STATIC / "index.html"
        if index.is_file():
            return FileResponse(index)
    raise HTTPException(404, detail={"code": "not_found", "message": "Build the PWA into the static dir"})
