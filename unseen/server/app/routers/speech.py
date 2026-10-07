from fastapi import APIRouter, Depends, HTTPException, Request, Response, UploadFile

from ..config import settings
from ..deps import body_limit, rate_limit
from ..schemas import SpeechOutIn
from ..services import openai_stt, openai_tts

router = APIRouter()


@router.post("/transcribe", dependencies=[Depends(rate_limit("transcribe", 60, 3600))])
async def transcribe(request: Request, file: UploadFile) -> dict:
    audio = await file.read()
    if not audio:
        raise HTTPException(400, detail={"code": "bad_request", "message": "Empty audio"})
    if len(audio) > settings.max_audio_size_mb * 1024 * 1024:
        raise HTTPException(400, detail={"code": "bad_request", "message": "Audio too large"})
    text = await openai_stt.transcribe(
        request.app.state.http, audio, file.filename or "audio.webm", file.content_type or "audio/webm",
    )
    return {"text": text}


@router.post("/speak", dependencies=[Depends(body_limit(8192)), Depends(rate_limit("speak", 120, 3600))])
async def speak(body: SpeechOutIn, request: Request) -> Response:
    audio = await openai_tts.speak(request.app.state.http, body.text)
    return Response(content=audio, media_type="audio/mpeg", headers={"Cache-Control": "no-store"})
