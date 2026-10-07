"""YouVersion Platform client with a bundled public-domain BSB fallback (section 12).

With ``YVP_APP_KEY`` set, every word of Scripture comes from the YouVersion
Platform (https://api.youversion.com/v1): the Bibles this app key is licensed
for, each version's copyright attribution, passage text and verse search.
Without a key only the bundled public-domain Berean Standard Bible (id 3034)
is served, so the keyless demo still runs.

Licensing rule (YouVersion terms): Bible text is always shown with its
version's copyright attribution, and text from one version is never served
under another version's id. The bundled BSB text is therefore a fallback for
the BSB only; any other version that cannot be fetched is reported as an
error so the phone can fall back to the BSB *and label it as the BSB*.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import httpx
from fastapi import HTTPException

from ..config import settings
from .kv import KV
from .usfm import BOOK_NAMES

_BASE = "https://api.youversion.com/v1"
_CONTENT = Path(__file__).resolve().parent.parent / "content"
_TIMEOUT = 3.0
# The licensed-Bible list and version metadata change rarely; cache them in the
# shared KV so the two uvicorn workers do not each re-ask YouVersion.
_CATALOG_TTL = 6 * 3600
_CATALOG_KEY = "yv:bibles:en"

BSB_ID = 3034
# Verse text and search results are cached in the shared KV: a battle asks for
# the same curated verses again and again, and the Platform rate-limits bursts.
_VERSE_TTL = 24 * 3600
_SEARCH_TTL = 24 * 3600
_kv: KV | None = None


def use_kv(kv: KV | None) -> None:
    """Called once at start-up with app.state.kv."""
    global _kv
    _kv = kv
# Served when YouVersion is unreachable or no app key is configured.
BSB: dict = {
    "id": BSB_ID,
    "abbreviation": "BSB",
    "title": "Berean Standard Bible",
    "localizedTitle": "Berean Standard Bible",
    "copyright": "The Holy Bible, Berean Standard Bible, BSB is in the public domain.",
    "promotionalContent": "Public Domain",
    "publisherUrl": None,
    "languageTag": "en",
    "deepLink": f"https://www.bible.com/versions/{BSB_ID}",
    "books": list(BOOK_NAMES),
}

# Display order for the version picker: the public-domain default first, then
# the versions people ask for by name, then everything else alphabetically.
_PREFERRED = [BSB_ID, 111, 113, 2692, 100, 1588, 110, 206, 12]


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


def _headers() -> dict[str, str]:
    return {"x-yvp-app-key": settings.yvp_app_key or "", "accept": "application/json"}


def _normalize(j: dict) -> dict:
    """Map a YouVersion ``BibleVersion`` object to the API's camelCase shape."""
    bible_id = int(j["id"])
    return {
        "id": bible_id,
        "abbreviation": j.get("abbreviation") or j.get("localized_abbreviation") or str(bible_id),
        "title": j.get("title") or j.get("localized_title") or f"Bible {bible_id}",
        "localizedTitle": j.get("localized_title") or j.get("title"),
        "copyright": (j.get("copyright") or "").strip() or None,
        "promotionalContent": (j.get("promotional_content") or "").strip() or None,
        "publisherUrl": j.get("publisher_url") or None,
        "languageTag": j.get("language_tag") or "en",
        "deepLink": j.get("youversion_deep_link") or f"https://www.bible.com/versions/{bible_id}",
        "books": list(j.get("books") or []),
    }


def _rank(b: dict) -> tuple[int, str]:
    try:
        return (_PREFERRED.index(b["id"]), "")
    except ValueError:
        return (len(_PREFERRED), (b.get("title") or "").lower())


async def list_bibles(http: httpx.AsyncClient, kv: KV) -> dict:
    """The English Bibles this app key is licensed for, or just the bundled BSB.

    ``live`` tells the phone whether the list came from YouVersion (so other
    versions are real choices) or is the keyless/offline fallback.
    """
    if not settings.youversion_enabled:
        return {"bibles": [BSB], "live": False}
    cached = await kv.get_json(_CATALOG_KEY)
    if cached:
        return cached
    try:
        r = await http.get(f"{_BASE}/bibles", params=[("language_ranges[]", "en")],
                           headers=_headers(), timeout=_TIMEOUT)
        r.raise_for_status()
        items = [_normalize(b) for b in r.json().get("data", [])]
    except (httpx.HTTPError, ValueError, KeyError):
        return {"bibles": [BSB], "live": False}  # a failure is not cached
    if not any(b["id"] == BSB_ID for b in items):
        items.append(BSB)
    items.sort(key=_rank)
    out = {"bibles": items, "live": True}
    await kv.set_json(_CATALOG_KEY, out, ttl=_CATALOG_TTL)
    return out


async def get_bible(http: httpx.AsyncClient, kv: KV, bible_id: int) -> dict:
    """One version's metadata, including the copyright notice shown with its text."""
    if not settings.youversion_enabled:
        if bible_id == BSB_ID:
            return BSB
        raise HTTPException(404, detail={"code": "version_unavailable",
                                         "message": "This Bible version needs a YouVersion app key"})
    key = f"yv:bible:{bible_id}"
    cached = await kv.get_json(key)
    if cached:
        return cached
    try:
        r = await http.get(f"{_BASE}/bibles/{bible_id}", headers=_headers(), timeout=_TIMEOUT)
        if r.status_code == 404:
            raise HTTPException(404, detail={"code": "not_found", "message": "Unknown Bible version"})
        r.raise_for_status()
        info = _normalize(r.json())
    except (httpx.HTTPError, ValueError, KeyError):
        if bible_id == BSB_ID:
            return BSB
        raise HTTPException(502, detail={"code": "upstream_error", "message": "YouVersion is unavailable"})
    await kv.set_json(key, info, ttl=_CATALOG_TTL)
    return info


async def get_verse(http: httpx.AsyncClient, bible_id: int, usfm: str) -> dict:
    """Plain text of one verse. Live from YouVersion (cached a day); bundled BSB text only for the BSB."""
    is_default = bible_id == settings.default_bible_id
    cache_key = f"yv:verse:{bible_id}:{usfm}"
    if settings.youversion_enabled and _kv is not None:
        cached = await _kv.get_json(cache_key)
        if cached:
            return cached
    if settings.youversion_enabled:
        try:
            r = await http.get(
                f"{_BASE}/bibles/{bible_id}/passages/{usfm}",
                params={"format": "text"},
                headers=_headers(),
                timeout=_TIMEOUT,
            )
            if r.status_code == 404:
                # The verse is not in this version (e.g. a New Testament-only Bible).
                raise HTTPException(404, detail={"code": "not_found",
                                                 "message": f"{usfm} is not in this Bible version"})
            if r.status_code == 429 and not is_default:
                # Platform rate limit: other versions report it (the phone falls back to
                # the BSB); the BSB itself is served from the bundled text below.
                raise HTTPException(429, detail={"code": "rate_limited",
                                                 "message": "YouVersion rate limit reached"})
            r.raise_for_status()
            j = r.json()
            content = (j.get("content") or "").strip()
            if content:
                out = {"id": usfm, "reference": j.get("reference") or usfm, "content": content,
                       "bibleId": bible_id}
                if _kv is not None:
                    await _kv.set_json(cache_key, out, ttl=_VERSE_TTL)
                return out
        except httpx.TimeoutException:
            if not is_default:
                raise HTTPException(504, detail={"code": "upstream_timeout", "message": "YouVersion timed out"})
        except (httpx.HTTPError, ValueError):
            if not is_default:
                raise HTTPException(502, detail={"code": "upstream_error", "message": "YouVersion is unavailable"})
    if not is_default:
        raise HTTPException(404, detail={"code": "version_unavailable",
                                         "message": "This Bible version needs a YouVersion app key"})
    # Bundled public-domain BSB: the keyless demo path and the safety net when YouVersion is down.
    v = _bundled()["verses"].get(usfm)
    if not v:
        raise HTTPException(404, detail={"code": "not_found", "message": f"Unknown verse {usfm}"})
    return {"id": usfm, "reference": v["reference"], "content": v["content"], "bibleId": bible_id}


async def search_verses(http: httpx.AsyncClient, q: str, bible_id: int) -> list[str]:
    """Topical verse search: references only (cached a day per query and version)."""
    cache_key = f"yv:search:{bible_id}:{q.strip().lower()[:100]}"
    if settings.youversion_enabled and _kv is not None:
        cached = await _kv.get_json(cache_key)
        if cached and isinstance(cached.get("refs"), list):
            return list(cached["refs"])
    if settings.youversion_enabled:
        try:
            r = await http.get(
                f"{_BASE}/search-verses",
                params={"query": q, "bible_id": bible_id, "user_intent": "topical", "page_size": 10},
                headers=_headers(),
                timeout=_TIMEOUT,
            )
            r.raise_for_status()
            j = r.json()
            # Hits are references (USFM ids), never text: {"verses": [{"reference": "EPH.4.26"}, ...]}
            refs = [hit.get("usfm") or hit.get("reference") for hit in j.get("verses", j.get("hits", []))]
            refs = [x for x in refs if x][:10]
            if _kv is not None:
                await _kv.set_json(cache_key, {"refs": refs}, ttl=_SEARCH_TTL)
            return refs
        except (httpx.HTTPError, ValueError):
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


# Fixed rotation used when YouVersion's verse of the day cannot be reached.
_VOTD_POOL = ["PHP.4.6", "ISA.41.10", "ROM.8.1", "PSA.119.11", "1CO.10.13", "MIC.7.8", "PSA.34.18"]


async def verse_of_the_day(http: httpx.AsyncClient, kv: KV, day: int) -> dict:
    """YouVersion's verse of the day for a day of the year (1-366): GET /v1/verse_of_the_days/{day}.
    Cached for a day; the fixed rotation stands in offline."""
    day = max(1, min(366, int(day)))
    key = f"yv:votd:{day}"
    if settings.youversion_enabled:
        cached = await kv.get_json(key)
        if cached:
            return cached
        try:
            r = await http.get(f"{_BASE}/verse_of_the_days/{day}", headers=_headers(), timeout=_TIMEOUT)
            r.raise_for_status()
            j = r.json()
            passage = str(j.get("passage_id") or "").strip()
            if passage:
                out = {"day": day, "passageId": passage, "source": "youversion"}
                await kv.set_json(key, out, ttl=86400)
                return out
        except (httpx.HTTPError, ValueError):
            pass
    return {"day": day, "passageId": _VOTD_POOL[day % len(_VOTD_POOL)], "source": "rotation"}
