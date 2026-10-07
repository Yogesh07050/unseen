"""The four AI endpoints. Each call is recorded in PostgreSQL (ai_interactions)
as METADATA ONLY — model, latency, prompt version, struggle/safety labels and the
chosen verse ids. Never the user's words, the lie, the reflection or any text.
Logging is fire-and-forget: a database problem can never fail a response."""
from fastapi import APIRouter, Depends, Header, Request

from ..deps import body_limit, rate_limit
from ..schemas import (
    ComposeIn, ComposeOut, DiscernIn, DiscernOut, InsightIn, InsightOut, TruthIn, TruthOut,
)
from ..services import db, prompts

router = APIRouter()


def _log(request: Request, install_id: str | None, endpoint: str, trace: dict, **fields) -> None:
    pool = request.app.state.db
    if pool is None or not trace:
        return
    db.fire(db.log_ai_interaction(
        pool, install_id=install_id, endpoint=endpoint,
        model=trace.get("model", "unknown"), prompt_version=trace.get("promptVersion", "unknown"),
        latency_ms=trace.get("latencyMs", 0), **fields,
    ))


@router.post("/discern", response_model=DiscernOut,
             dependencies=[Depends(body_limit(8192)), Depends(rate_limit("discern", 60, 3600))])
async def discern(body: DiscernIn, request: Request, x_install_id: str | None = Header(default=None)) -> DiscernOut:
    out = await prompts.run_discern(request.app.state.http, body)
    d, m = out.discernment, out.meta
    _log(request, x_install_id, "discern", {"model": m.model, "promptVersion": m.promptVersion, "latencyMs": m.latencyMs},
         struggle=d.struggle, safety_flag=d.safety_flag, confidence=d.confidence, intensity=d.intensity)
    return out


@router.post("/truth", response_model=TruthOut,
             dependencies=[Depends(body_limit(8192)), Depends(rate_limit("truth", 60, 3600))])
async def truth(body: TruthIn, request: Request, x_install_id: str | None = Header(default=None)) -> TruthOut:
    trace: dict = {}
    out = await prompts.run_truth(request.app.state.http, body, trace)
    _log(request, x_install_id, "truth", trace, struggle=body.struggle, verse_usfms=[out.primary, *out.backups])
    return out


@router.post("/compose", response_model=ComposeOut,
             dependencies=[Depends(body_limit(8192)), Depends(rate_limit("compose", 60, 3600))])
async def compose(body: ComposeIn, request: Request, x_install_id: str | None = Header(default=None)) -> ComposeOut:
    trace: dict = {}
    out = await prompts.run_compose(request.app.state.http, body, trace)
    _log(request, x_install_id, "compose", trace, struggle=body.struggle)
    return out


@router.post("/insight", response_model=InsightOut,
             dependencies=[Depends(body_limit(8192)), Depends(rate_limit("insight", 10, 86400))])
async def insight(body: InsightIn, request: Request, x_install_id: str | None = Header(default=None)) -> InsightOut:
    trace: dict = {}
    out = await prompts.run_insight(request.app.state.http, body, trace)
    _log(request, x_install_id, "insight", trace)
    return out
