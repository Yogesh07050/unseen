"""One error shape through exception handlers (section 12)."""
from __future__ import annotations

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

_CODE_FOR_STATUS = {
    400: "bad_request",
    404: "not_found",
    410: "gone",
    429: "rate_limited",
    502: "upstream_error",
    504: "upstream_timeout",
}


def _payload(code: str, message: str) -> dict:
    return {"error": {"code": code, "message": message}}


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def _http(_: Request, exc: HTTPException):
        detail = exc.detail
        if isinstance(detail, dict) and "code" in detail:
            code, message = detail["code"], detail.get("message", "")
        else:
            code = _CODE_FOR_STATUS.get(exc.status_code, "error")
            message = str(detail)
        return JSONResponse(status_code=exc.status_code, content=_payload(code, message))

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=400,
            content=_payload("bad_request", "Invalid request body"),
        )
