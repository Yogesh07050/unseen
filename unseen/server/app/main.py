from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse

from .config import settings
from .errors import install_error_handlers
from .middleware import SecurityHeaders, Timing
from .routers import ai, bible, health, pray, speech
from .services import kv


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http = httpx.AsyncClient()
    app.state.kv = await kv.connect(settings.redis_url)
    yield
    await app.state.http.aclose()
    await app.state.kv.close()


app = FastAPI(
    title="UNSEEN API",
    lifespan=lifespan,
    openapi_url="/api/openapi.json",
    docs_url="/api/docs" if settings.env == "development" else None,
    redoc_url=None,
)
app.add_middleware(SecurityHeaders)
app.add_middleware(Timing)
install_error_handlers(app)
for r in (ai.router, bible.router, pray.router, speech.router, health.router):
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
