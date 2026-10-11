from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse

from app.engine import uploads, voice

router = APIRouter(prefix="/api", tags=["files"])
MAX_UPLOAD = 512 * 1024 * 1024


@router.post("/uploads")
async def upload(file: UploadFile = File(...)) -> JSONResponse:
    data = await file.read()
    if len(data) > MAX_UPLOAD:
        return JSONResponse({"ok": False, "error": "File is larger than 512 MB"}, status_code=413)
    meta = uploads.save(file.filename or "file", data, file.content_type)
    return JSONResponse({"ok": True, "file": uploads.public(meta)})


@router.get("/voice")
def voice_status() -> dict:
    return {"engines": voice.engines()}


@router.post("/voice/transcribe")
async def transcribe(audio: UploadFile = File(...), language: str | None = Form(default=None)) -> JSONResponse:
    data = await audio.read()
    try:
        result = voice.transcribe(data, audio.filename or "speech.webm", audio.content_type or "audio/webm", language)
    except voice.VoiceError as exc:
        return JSONResponse({"ok": False, "error": str(exc)}, status_code=503)
    return JSONResponse({"ok": True, **result})
