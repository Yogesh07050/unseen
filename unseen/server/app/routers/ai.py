from fastapi import APIRouter, Depends, Request

from ..deps import body_limit, rate_limit
from ..schemas import (
    ComposeIn, ComposeOut, DiscernIn, DiscernOut, InsightIn, InsightOut, TruthIn, TruthOut,
)
from ..services import prompts

router = APIRouter()


@router.post("/discern", response_model=DiscernOut,
             dependencies=[Depends(body_limit(8192)), Depends(rate_limit("discern", 60, 3600))])
async def discern(body: DiscernIn, request: Request) -> DiscernOut:
    return await prompts.run_discern(request.app.state.http, body)


@router.post("/truth", response_model=TruthOut,
             dependencies=[Depends(body_limit(8192)), Depends(rate_limit("truth", 60, 3600))])
async def truth(body: TruthIn, request: Request) -> TruthOut:
    return await prompts.run_truth(request.app.state.http, body)


@router.post("/compose", response_model=ComposeOut,
             dependencies=[Depends(body_limit(8192)), Depends(rate_limit("compose", 60, 3600))])
async def compose(body: ComposeIn, request: Request) -> ComposeOut:
    return await prompts.run_compose(request.app.state.http, body)


@router.post("/insight", response_model=InsightOut,
             dependencies=[Depends(body_limit(8192)), Depends(rate_limit("insight", 10, 86400))])
async def insight(body: InsightIn, request: Request) -> InsightOut:
    return await prompts.run_insight(request.app.state.http, body)
