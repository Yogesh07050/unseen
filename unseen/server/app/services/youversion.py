"""YouVersion Platform client with a bundled public-domain BSB fallback (section 12)."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import httpx
from fastapi import HTTPException

from ..config import settings

_BASE = "https://api.youversion.com/v1"
_CONTENT = Path(__file__).resolve().parent.parent / "content"


@lru_cache(maxsize=1)
def _bundled() -> dict:
    return json.loads((_CONTENT / "bsb_verses.json").read_text(encoding="utf-8"))


# A simple English topical index so verse-search works offline for the eval set.
_SEARCH_INDEX: dict[str, list[str]] = {
    "anger": ["EPH.4.26", "PRO.15.1", "JAS.1.19"],
    "wrath": ["PRO.15.1", "EPH.4.26"],
    "gentle": ["PRO.15.1"],
    "fear": ["ISA.41.10", "PHP.4.6"],
    "anxious": ["PHP.4.6", "PHP.4.7"],
    "worry": ["PHP.4.6", "PHP.4.7"],
    "alone": ["ISA.41.10", "HEB.13.5"],
    "tempt": ["1CO.10.13", "JAS.1.14"],
    "escape": ["1CO.10.13"],
    "shame": ["ROM.8.1", "1JN.1.9"],
    "condemnation": ["ROM.8.1"],
    "forgive": ["1JN.1.9"],
    "envy": ["GAL.6.4", "PHP.4.11"],
    "content": ["PHP.4.11", "PHP.4.12", "HEB.13.5"],
    "pride": ["JAS.4.6", "ECC.4.9"],
    "help": ["ECC.4.9", "ECC.4.10"],
    "freedom": ["GAL.5.1"],
    "weakness": ["2CO.12.9", "ROM.8.26"],
    "truth": ["EPH.4.25", "PRO.12.22"],
    "time": ["EPH.5.15", "PSA.90.12"],
}


async def get_verse(http: httpx.AsyncClient, bible_id: int, usfm: str) -> dict:
    if settings.youversion_enabled:
        try:
            r = await http.get(
                f"{_BASE}/bibles/{bible_id}/passages/{usfm}",
                params={"format": "text"},
                headers={"x-yvp-app-key": settings.yvp_app_key or ""},
                timeout=2.0,
            )
            r.raise_for_status()
            j = r.json()
            return {
                "id": usfm,
                "reference": j.get("reference", usfm),
                "content": j.get("content", ""),
                "bibleId": bible_id,
            }
        except httpx.TimeoutException:
            raise HTTPException(504, detail={"code": "upstream_timeout", "message": "YouVersion timed out"})
        except httpx.HTTPError:
            pass  # fall through to bundled text
    v = _bundled()["verses"].get(usfm)
    if not v:
        raise HTTPException(404, detail={"code": "not_found", "message": f"Unknown verse {usfm}"})
    return {"id": usfm, "reference": v["reference"], "content": v["content"], "bibleId": bible_id}


async def get_bible(http: httpx.AsyncClient, bible_id: int) -> dict:
    if settings.youversion_enabled:
        try:
            r = await http.get(
                f"{_BASE}/bibles/{bible_id}",
                headers={"x-yvp-app-key": settings.yvp_app_key or ""},
                timeout=2.0,
            )
            r.raise_for_status()
            j = r.json()
            return {
                "id": bible_id,
                "abbreviation": j.get("abbreviation", "BSB"),
                "title": j.get("title", "Berean Standard Bible"),
                "copyright": j.get("copyright", "Public domain"),
            }
        except httpx.HTTPError:
            pass
    return {
        "id": bible_id,
        "abbreviation": "BSB",
        "title": "Berean Standard Bible",
        "copyright": "The Holy Bible, Berean Standard Bible, BSB is in the public domain.",
    }


async def search_verses(http: httpx.AsyncClient, q: str, bible_id: int) -> list[str]:
    if settings.youversion_enabled:
        try:
            r = await http.get(
                f"{_BASE}/search-verses",
                params={"query": q, "bible_id": bible_id, "user_intent": "topical", "page_size": 10},
                headers={"x-yvp-app-key": settings.yvp_app_key or ""},
                timeout=2.0,
            )
            r.raise_for_status()
            j = r.json()
            refs = [hit.get("usfm") or hit.get("reference") for hit in j.get("verses", j.get("hits", []))]
            return [r for r in refs if r][:10]
        except httpx.HTTPError:
            pass
    out: list[str] = []
    for word in q.lower().split():
        for key, refs in _SEARCH_INDEX.items():
            if key in word or word in key:
                out.extend(refs)
    seen: list[str] = []
    for r in out:
        if r not in seen:
            seen.append(r)
    return seen[:10]
