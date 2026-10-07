import re

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response

from ..config import settings
from ..deps import rate_limit
from ..schemas import BibleOut, VerseOut, VerseSearchOut, VotdOut
from ..services import youversion

router = APIRouter()

_USFM = re.compile(r"^[1-3A-Z]{3}\.\d{1,3}\.\d{1,3}$")


@router.get("/verse/{bible_id}/{usfm}", response_model=VerseOut,
            dependencies=[Depends(rate_limit("verse", 300, 3600))])
async def verse(bible_id: int, usfm: str, request: Request, response: Response) -> VerseOut:
    if not _USFM.match(usfm):
        raise HTTPException(400, detail={"code": "bad_request", "message": "Bad USFM id"})
    v = await youversion.get_verse(request.app.state.http, bible_id, usfm)
    if bible_id == settings.default_bible_id:
        response.headers["Cache-Control"] = "public, max-age=86400"
    return VerseOut(**v)


@router.get("/bible/{bible_id}", response_model=BibleOut,
            dependencies=[Depends(rate_limit("bible", 300, 3600))])
async def bible(bible_id: int, request: Request) -> BibleOut:
    return BibleOut(**await youversion.get_bible(request.app.state.http, bible_id))


@router.get("/verse-search", response_model=VerseSearchOut,
            dependencies=[Depends(rate_limit("search", 300, 3600))])
async def verse_search(request: Request, q: str = Query(min_length=1, max_length=100),
                       bibleId: int = 3034) -> VerseSearchOut:
    if not re.match(r"^[A-Za-z ]+$", q):
        raise HTTPException(400, detail={"code": "bad_request", "message": "Letters and spaces only"})
    refs = await youversion.search_verses(request.app.state.http, q, bibleId)
    return VerseSearchOut(references=refs)


@router.get("/votd", response_model=VotdOut,
            dependencies=[Depends(rate_limit("votd", 300, 3600))])
async def votd(day: int = Query(ge=1, le=366)) -> VotdOut:
    # Offline-friendly: a deterministic rotation over the fixed verse-of-the-day pool.
    pool = ["PHP.4.6", "ISA.41.10", "ROM.8.1", "PSA.119.11", "1CO.10.13", "MIC.7.8", "PSA.34.18"]
    return VotdOut(day=day, passageId=pool[day % len(pool)])
