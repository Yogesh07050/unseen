from fastapi import APIRouter, Request

from ..config import settings

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
        "gloo": settings.gloo_enabled,
        "youversion": settings.youversion_enabled,
        "openai": settings.openai_enabled,
    }
