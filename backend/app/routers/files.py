import tempfile
import zipfile

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse

from app.engine import store, tools, uploads, voice

router = APIRouter(prefix="/api", tags=["files"])
MAX_UPLOAD = 512 * 1024 * 1024


@router.post("/uploads")
async def upload(file: UploadFile = File(...)) -> JSONResponse:
    data = await file.read()
    if len(data) > MAX_UPLOAD:
        return JSONResponse({"ok": False, "error": "File is larger than 512 MB"}, status_code=413)
    meta = uploads.save(file.filename or "file", data, file.content_type)
    return JSONResponse({"ok": True, "file": uploads.public(meta)})


def _chat_or_404(cid: str) -> None:
    if store.row("SELECT id FROM conversations WHERE id = ?", (cid,)) is None:
        raise HTTPException(404, "No such chat")


@router.get("/chats/{cid}/files/{rel:path}")
def chat_file(cid: str, rel: str, inline: bool = False) -> FileResponse:
    _chat_or_404(cid)
    try:
        path = tools.output_path(cid, rel)
    except tools.ToolError:
        raise HTTPException(403, "Outside the chat's folder") from None
    if not path.is_file():
        raise HTTPException(404, "No such file")
    return FileResponse(path, filename=path.name, content_disposition_type="inline" if inline else "attachment")


@router.get("/chats/{cid}/outputs.zip")
def outputs_zip(cid: str) -> StreamingResponse:
    _chat_or_404(cid)
    buf = tempfile.SpooledTemporaryFile(max_size=32 * 1024 * 1024)
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for o in tools.outputs_of(cid):
            try:
                path = tools.output_path(cid, o["path"])
            except tools.ToolError:
                continue
            if path.is_file():
                zf.write(path, o["path"])
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/zip", headers={"content-disposition": 'attachment; filename="outputs.zip"'})


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
