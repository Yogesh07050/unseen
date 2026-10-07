import re

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response

from ..deps import rate_limit
from ..schemas import BibleListOut, BibleOut, VerseOut, VerseSearchOut, VotdOut
from ..services import youversion

router = APIRouter()

_USFM = re.compile(r"^[1-3A-Z]{3}\.\d{1,3}\.\d{1,3}$")


@router.get("/verse/{bible_id}/{usfm}", response_model=VerseOut,
            dependencies=[Depends(rate_limit("verse", 300, 3600))])
async def verse(bible_id: int, usfm: str, request: Request, response: Response) -> VerseOut:
    if not _USFM.match(usfm):
        raise HTTPException(400, detail={"code": "bad_request", "message": "Bad USFM id"})
    v = await youversion.get_verse(request.app.state.http, bible_id, usfm)
    # A verse's text in a given version does not change: let the browser and the
    # service worker keep it for a day (every version, not only the default).
    response.headers["Cache-Control"] = "public, max-age=86400"
    return VerseOut(**v)


@router.get("/bibles", response_model=BibleListOut,
            dependencies=[Depends(rate_limit("bibles", 60, 3600))])
async def bibles(request: Request, response: Response) -> BibleListOut:
    """The Bible versions this deployment may show (licensed through YouVersion)."""
    out = await youversion.list_bibles(request.app.state.http, request.app.state.kv)
    response.headers["Cache-Control"] = "public, max-age=3600"
    return BibleListOut(**out)


@router.get("/bible/{bible_id}", response_model=BibleOut,
            dependencies=[Depends(rate_limit("bible", 300, 3600))])
async def bible(bible_id: int, request: Request, response: Response) -> BibleOut:
    info = await youversion.get_bible(request.app.state.http, request.app.state.kv, bible_id)
    response.headers["Cache-Control"] = "public, max-age=3600"
    return BibleOut(**info)


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
async def votd(request: Request, response: Response, day: int = Query(ge=1, le=366)) -> VotdOut:
    """YouVersion's verse of the day (a passage id such as JAS.5.16 or PHP.4.6-7);
    a fixed rotation when the Platform cannot be reached."""
    out = await youversion.verse_of_the_day(request.app.state.http, request.app.state.kv, day)
    response.headers["Cache-Control"] = "public, max-age=3600"
    return VotdOut(**out)
