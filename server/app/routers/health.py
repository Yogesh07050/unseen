from fastapi import APIRouter, Request

from ..config import settings
from ..services import db, gloo

router = APIRouter()


@router.get("/health")
async def health(request: Request) -> dict:
    redis_ok = True
    try:
        await request.app.state.kv.incr("rl:health:probe", ttl=5)
    except Exception:  # noqa: BLE001
        redis_ok = False
    return {
        "ok": True,
        "redis": redis_ok,
        "postgres": await db.ping(request.app.state.db),
        "gloo": settings.gloo_enabled,
        # Circuit-breaker state: when open, AI calls skip Gloo and answer from
        # the deterministic fallback instantly (see services/gloo.py).
        "glooCircuit": gloo.breaker_state(),
        "youversion": settings.youversion_enabled,
        "defaultBibleId": settings.default_bible_id,
        "openai": settings.openai_enabled,
    }
