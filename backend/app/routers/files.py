import tempfile
import zipfile

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response, StreamingResponse

from app.engine import artifacts, store, tools, uploads, voice
from app.engine.cmd_settings import current

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


CDN = "https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com"


def artifact_csp(network: bool) -> str:
    net = " https:" if network else ""
    return "; ".join([
        "default-src 'none'",
        f"script-src 'unsafe-inline' {CDN}",
        f"style-src 'unsafe-inline' https://fonts.googleapis.com {CDN}",
        f"font-src data: https://fonts.gstatic.com {CDN}",
        f"img-src data: blob:{net}",
        f"media-src data: blob:{net}",
        f"connect-src {'https:' if network else chr(39) + 'none' + chr(39)}",
        "form-action 'none'",
        "base-uri 'none'",
        "frame-ancestors 'self'",
        "sandbox allow-scripts allow-popups allow-modals allow-downloads",
    ])


@router.get("/artifacts/{aid}/v/{number}")
def artifact_page(aid: str, number: int, download: bool = False) -> Response:
    v = artifacts.version(aid, number)
    a = artifacts.get(aid)
    if v is None or a is None:
        raise HTTPException(404, "No such artifact version")
    headers = {"content-security-policy": artifact_csp(bool(current().get("artifactNetwork", False))),
               "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "cache-control": "no-store"}
    if download:
        safe = "".join(ch if ch.isalnum() or ch in "-_ " else "_" for ch in a["title"]).strip() or "artifact"
        headers["content-disposition"] = f'attachment; filename="{safe}-v{number}.html"'
    return Response(v["content"], media_type="text/html; charset=utf-8", headers=headers)


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
