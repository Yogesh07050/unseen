"""OpenAI Whisper speech-to-text (used for voice capture)."""
from __future__ import annotations

import httpx
from fastapi import HTTPException

from ..config import settings

TRANSCRIBE_URL = "https://api.openai.com/v1/audio/transcriptions"
WHISPER_MODEL = "whisper-1"


async def transcribe(http: httpx.AsyncClient, audio: bytes, filename: str, content_type: str) -> str:
    if not settings.openai_enabled:
        raise HTTPException(503, detail={"code": "upstream_error", "message": "Speech-to-text is not configured"})
    files = {"file": (filename or "audio.webm", audio, content_type or "application/octet-stream")}
    data = {"model": WHISPER_MODEL, "response_format": "json", "language": "en"}
    try:
        r = await http.post(
            TRANSCRIBE_URL,
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            files=files,
            data=data,
            timeout=30.0,
        )
    except httpx.TimeoutException:
        raise HTTPException(504, detail={"code": "upstream_timeout", "message": "Transcription timed out"})
    if r.status_code >= 400:
        raise HTTPException(502, detail={"code": "upstream_error", "message": "Transcription failed"})
    return (r.json().get("text") or "").strip()
