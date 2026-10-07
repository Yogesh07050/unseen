"""Gloo AI Studio OAuth2 + guarded Completions V2 client (section 7).

Only used when GLOO_CLIENT_ID/SECRET are set. Otherwise prompts.py uses the
deterministic fallback and this module is never called.
"""
from __future__ import annotations

import base64
import time

import httpx

from ..config import settings

TOKEN_URL = "https://platform.ai.gloo.com/oauth2/token"
COMPLETIONS_URL = "https://platform.ai.gloo.com/ai/v2/guarded/chat/completions"
_token: dict = {}  # {"value": str, "exp": float}


async def gloo_token(http: httpx.AsyncClient) -> str:
    if _token and time.time() < _token["exp"] - 300:
        return _token["value"]
    basic = base64.b64encode(
        f"{settings.gloo_client_id}:{settings.gloo_client_secret}".encode()
    ).decode()
    r = await http.post(
        TOKEN_URL,
        headers={"Authorization": f"Basic {basic}"},
        data={"grant_type": "client_credentials", "scope": "api/access"},
        timeout=5.0,
    )
    r.raise_for_status()
    j = r.json()
    _token.update(value=j["access_token"], exp=time.time() + j.get("expires_in", 3600))
    return _token["value"]


async def complete(http: httpx.AsyncClient, body: dict, timeout: float) -> dict:
    # Direct API key (bearer) path — no OAuth exchange.
    if settings.gloo_api_key:
        r = await http.post(
            COMPLETIONS_URL,
            json=body,
            timeout=timeout,
            headers={"Authorization": f"Bearer {settings.gloo_api_key}", "X-Cache-TTL": "5m"},
        )
        r.raise_for_status()
        return r.json()
    # OAuth2 client-credentials path.
    for attempt in (1, 2):
        token = await gloo_token(http)
        r = await http.post(
            COMPLETIONS_URL,
            json=body,
            timeout=timeout,
            headers={"Authorization": f"Bearer {token}", "X-Cache-TTL": "5m"},
        )
        if r.status_code == 401 and attempt == 1:
            _token.clear()
            continue
        r.raise_for_status()
        return r.json()
    raise RuntimeError("gloo_unauthorized")
