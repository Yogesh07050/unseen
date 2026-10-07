"""The Truth Index as structured data: curated lie → Scripture *references*.

Verse TEXT is deliberately not served here; the client fetches it from the
authoritative source via GET /api/verse/{bibleId}/{usfm} and byte-verifies it.
Backed by PostgreSQL (truth_entries / truth_entry_verses / struggle_defaults /
scripture_references); falls back to the bundled JSON without a database.
"""
from fastapi import APIRouter, Depends, Request, Response

from ..config import settings
from ..deps import rate_limit
from ..services import db

router = APIRouter()


@router.get("/truth-index", dependencies=[Depends(rate_limit("truth_index", 120, 3600))])
async def truth_index(request: Request, response: Response, bibleId: int | None = None) -> dict:
    data = await db.truth_index(request.app.state.db, bibleId or settings.default_bible_id)
    response.headers["Cache-Control"] = "public, max-age=3600"
    return data
