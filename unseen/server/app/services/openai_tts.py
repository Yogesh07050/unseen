"""OpenAI text-to-speech for the verse listen-and-repeat control."""
from __future__ import annotations

import httpx
from fastapi import HTTPException

from ..config import settings

SPEECH_URL = "https://api.openai.com/v1/audio/speech"


async def speak(http: httpx.AsyncClient, text: str) -> bytes:
    if not settings.openai_enabled:
        raise HTTPException(503, detail={"code": "upstream_error", "message": "Speech playback is not configured"})
    try:
        response = await http.post(
            SPEECH_URL,
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            json={
                "model": settings.openai_speech_model,
                "voice": settings.openai_speech_voice,
                "input": text,
                "instructions": "Read clearly and gently at a measured pace, with reverence. Do not add words.",
                "response_format": "mp3",
            },
            timeout=30.0,
        )
        response.raise_for_status()
        return response.content
    except httpx.TimeoutException:
        raise HTTPException(504, detail={"code": "upstream_timeout", "message": "Speech generation timed out"})
    except httpx.HTTPError:
        raise HTTPException(502, detail={"code": "upstream_error", "message": "Speech generation failed"})
