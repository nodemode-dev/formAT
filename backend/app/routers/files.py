import tempfile
import zipfile
from pathlib import Path
from urllib.parse import quote

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


@router.get("/uploads/{fid}")
def upload_file(fid: str, download: bool = False) -> FileResponse:
    meta = uploads.get(fid) if fid.isalnum() else None
    path = Path(meta["path"]) if meta else None
    if not path or not path.is_file():
        raise HTTPException(404, "No such upload")
    headers = {"x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "cache-control": "private, max-age=31536000, immutable"}
    if meta["kind"] != "pdf":
        headers["content-security-policy"] = "sandbox; default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'"
    return FileResponse(path, media_type=meta["mime"], filename=meta["name"], content_disposition_type="attachment" if download else "inline", headers=headers)


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
    headers = {"x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "cache-control": "no-cache"}
    if path.suffix.lower() != ".pdf":
        headers["content-security-policy"] = "sandbox; default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'"
    return FileResponse(path, filename=path.name, content_disposition_type="inline" if inline else "attachment", headers=headers)


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
    name = tools.outputs_zip_name(cid)
    plain = "".join(ch for ch in name if ch.isascii() and ch not in '"\\').strip()
    if plain.startswith("- "):
        plain = "outputs.zip"
    return StreamingResponse(buf, media_type="application/zip", headers={"content-disposition": f"attachment; filename=\"{plain}\"; filename*=UTF-8''{quote(name)}"})


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
    if a["kind"] != "html":
        from app.engine import documents
        return Response(documents.standalone_html(a["kind"], v["content"], a["title"]), media_type="text/html; charset=utf-8", headers=headers)
    return Response(v["content"], media_type="text/html; charset=utf-8", headers=headers)


@router.get("/artifacts/{aid}/v/{number}/source")
def artifact_source(aid: str, number: int) -> Response:
    v = artifacts.version(aid, number)
    if v is None:
        raise HTTPException(404, "No such artifact version")
    return Response(v["content"], media_type="text/plain; charset=utf-8", headers={"cache-control": "no-store", "x-content-type-options": "nosniff"})


@router.get("/artifacts/{aid}/v/{number}/export/{fmt}")
def artifact_export(aid: str, number: int, fmt: str) -> Response:
    from app.engine import documents
    from app.engine.commands import CommandError
    v = artifacts.version(aid, number)
    a = artifacts.get(aid)
    if v is None or a is None:
        raise HTTPException(404, "No such artifact version")
    try:
        data = documents.render_export(a["kind"], v["content"], fmt, a["title"])
    except CommandError as exc:
        raise HTTPException(400, str(exc)) from None
    name = documents.filename(a["title"], number, fmt)
    return Response(data, media_type=documents.MIME.get(fmt, "application/octet-stream"),
                    headers={"content-disposition": f'attachment; filename="{name}"', "cache-control": "no-store", "x-content-type-options": "nosniff"})


@router.get("/native/snapshots/{name}")
def native_snapshot(name: str) -> FileResponse:
    from app.engine import native
    path = native.snapshots_dir() / name
    if not native.NAME.match(name) or not path.is_file():
        raise HTTPException(404, "No such snapshot")
    return FileResponse(path, media_type="image/png")


@router.get("/voice")
def voice_status() -> dict:
    return {"engines": voice.engines()}


@router.post("/voice/transcribe")
async def transcribe(audio: UploadFile = File(...), language: str | None = Form(default=None), engine: str | None = Form(default=None)) -> JSONResponse:
    from starlette.concurrency import run_in_threadpool
    data = await audio.read()
    try:
        result = await run_in_threadpool(voice.transcribe, data, audio.filename or "speech.webm", audio.content_type or "audio/webm", language, engine)
    except voice.VoiceError as exc:
        return JSONResponse({"ok": False, "error": str(exc)}, status_code=503)
    return JSONResponse({"ok": True, **result})
