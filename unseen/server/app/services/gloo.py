"""Gloo AI Studio OAuth2 + guarded Completions V2 client (section 7).

Only used when Gloo credentials are set. Otherwise prompts.py uses the
deterministic fallback and this module is never called.

Circuit breaker
---------------
Gloo failing must never cost the user seconds for an answer the deterministic
fallback can give instantly. An auth failure (401/403, or an exhausted token
retry) opens the breaker for a LONG cooldown: bad credentials do not fix
themselves in the middle of a demo. Timeouts, connection errors and 5xx open it
after two consecutive failures for a SHORT cooldown. While open, complete()
raises CircuitOpen immediately and prompts.py falls back in milliseconds. Any
success closes it. State is exposed through breaker_state() for /api/health.
"""
from __future__ import annotations

import base64
import time

import httpx

from ..config import settings

TOKEN_URL = "https://platform.ai.gloo.com/oauth2/token"
COMPLETIONS_URL = "https://platform.ai.gloo.com/ai/v2/guarded/chat/completions"
_token: dict = {}  # {"value": str, "exp": float}

AUTH_COOLDOWN_S = 600.0   # unauthorized: stop trying for 10 minutes
FAIL_COOLDOWN_S = 60.0    # transient upstream failure: back off for a minute
FAIL_THRESHOLD = 2        # consecutive transient failures before opening
_breaker: dict = {"open_until": 0.0, "failures": 0, "reason": ""}


class CircuitOpen(RuntimeError):
    """Raised instead of calling Gloo while the breaker is open."""


def breaker_state() -> dict:
    is_open = time.time() < _breaker["open_until"]
    return {
        "open": is_open,
        "reason": _breaker["reason"] if is_open else "",
        "retryInS": max(0, int(_breaker["open_until"] - time.time())) if is_open else 0,
    }


def _trip(reason: str, cooldown: float) -> None:
    _breaker.update(open_until=time.time() + cooldown, reason=reason, failures=0)


def _record_failure(exc: BaseException) -> None:
    unauthorized = (
        isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code in (401, 403)
    ) or str(exc) == "gloo_unauthorized"
    if unauthorized:
        _trip("unauthorized", AUTH_COOLDOWN_S)
        return
    _breaker["failures"] += 1
    if _breaker["failures"] >= FAIL_THRESHOLD:
        _trip("upstream_failing", FAIL_COOLDOWN_S)


def _record_success() -> None:
    _breaker.update(failures=0, open_until=0.0, reason="")


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


async def _complete(http: httpx.AsyncClient, body: dict, timeout: float) -> dict:
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


async def complete(http: httpx.AsyncClient, body: dict, timeout: float) -> dict:
    """Call Gloo through the circuit breaker. Raises on any failure so the
    caller falls back; never silently returns a bad result."""
    if time.time() < _breaker["open_until"]:
        raise CircuitOpen(f"gloo_circuit_open:{_breaker['reason']}")
    try:
        result = await _complete(http, body, timeout)
    except (httpx.HTTPError, RuntimeError) as exc:
        _record_failure(exc)
        raise
    _record_success()
    return result
