"""Security headers and request timing/logging without bodies (section 13)."""
from __future__ import annotations

import hashlib
import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware

log = logging.getLogger("unseen")

CSP = (
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self'; "
    "worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
)
LONG_LIVED = ("/clips/", "/posters/", "/icons/", "/fonts/", "/art/")


class SecurityHeaders(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        h, path = response.headers, request.url.path
        h["Content-Security-Policy"] = CSP
        h["Permissions-Policy"] = "microphone=(self), camera=(), geolocation=(), payment=()"
        h["Referrer-Policy"] = "no-referrer"
        h["X-Content-Type-Options"] = "nosniff"
        h["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        if path.startswith("/p/"):
            h["X-Robots-Tag"] = "noindex, nofollow"
        if path.startswith("/api/"):
            h.setdefault("Cache-Control", "no-store")
        elif path.startswith("/assets/"):
            h["Cache-Control"] = "public, max-age=31536000, immutable"
        elif not path.startswith(LONG_LIVED):
            h.setdefault("Cache-Control", "no-cache")
        return response


class Timing(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        ms = int((time.perf_counter() - start) * 1000)
        install = request.headers.get("x-install-id", "")
        who = hashlib.sha256(install.encode()).hexdigest()[:12] if install else "-"
        if request.url.path.startswith("/api/"):
            log.info("%s %s %s %dms id=%s", request.method, request.url.path,
                     response.status_code, ms, who)
        return response
