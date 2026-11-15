import asyncio
import hmac
import json
import os
import secrets
import socket
from http.cookies import SimpleCookie
from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import Response

from app.core import config
from app.engine import artifacts, events, store
from app.engine.commands import CommandError, command

LAN_PORT = int(os.environ.get("FORMAT_LAN_PORT") or 8492)
COOKIE = "format_pair"
_server = None
_task = None
_loop: asyncio.AbstractEventLoop | None = None


def bind(loop: asyncio.AbstractEventLoop) -> None:
    global _loop
    _loop = loop


def _secret_path() -> Path:
    return config.data_dir() / "pairing.json"


def _secret(rotate: bool = False) -> str:
    p = _secret_path()
    if not rotate and p.is_file():
        try:
            return json.loads(p.read_text())["secret"]
        except (ValueError, KeyError):
            pass
    s = secrets.token_urlsafe(24)
    p.write_text(json.dumps({"secret": s}))
    try:
        os.chmod(p, 0o600)
    except OSError:
        pass
    return s


def lan_addresses() -> list[str]:
    found: list[str] = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))
        found.append(s.getsockname()[0])
        s.close()
    except OSError:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if ip not in found and not ip.startswith("127."):
                found.append(ip)
    except OSError:
        pass
    return found or ["127.0.0.1"]


def running() -> bool:
    return _server is not None and not getattr(_server, "should_exit", True)


def base_url() -> str:
    return f"http://{lan_addresses()[0]}:{LAN_PORT}" if running() else f"http://127.0.0.1:{config.PORT}"


def _paired(scope: dict, secret: str) -> bool:
    for k, v in scope.get("headers") or []:
        if k == b"cookie":
            c = SimpleCookie()
            try:
                c.load(v.decode("latin-1"))
            except Exception:
                continue
            if COOKIE in c and hmac.compare_digest(c[COOKIE].value, secret):
                return True
    return False


class Gate:
    def __init__(self, api, static):
        self.api = api
        self.static = static

    async def inner(self, scope, receive, send):
        path = scope.get("path") or "/"
        target = self.api if path.startswith(("/api", "/mcp", "/s/")) or self.static is None else self.static
        return await target(dict(scope) | {"format.paired": True}, receive, send)

    async def __call__(self, scope, receive, send):
        if scope["type"] not in ("http", "websocket"):
            return await self.api(scope, receive, send)
        path = scope.get("path") or "/"
        secret = _secret()
        if (path.startswith("/s/") and "/" not in path[3:]) or path in ("/favicon.svg", "/favicon.png"):
            return await self.inner(scope, receive, send)
        if scope["type"] == "http" and path == "/pair":
            q = dict(p.split("=", 1) for p in (scope.get("query_string") or b"").decode().split("&") if "=" in p)
            if hmac.compare_digest(q.get("code", ""), secret):
                await send({"type": "http.response.start", "status": 303, "headers": [
                    (b"location", b"/"), (b"set-cookie", f"{COOKIE}={secret}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000".encode())]})
                await send({"type": "http.response.body", "body": b""})
                return
        if _paired(scope, secret):
            return await self.inner(scope, receive, send)
        if scope["type"] == "websocket":
            await send({"type": "websocket.close", "code": 4401})
            return
        body = b"<!doctype html><meta name=viewport content='width=device-width'><body style='font:16px system-ui;background:#111;color:#eee;padding:24px'><h1>FormAT</h1><p>This device is not paired. On the computer running FormAT, open Settings, Other devices, and scan the code or open its link here.</p>"
        await send({"type": "http.response.start", "status": 401, "headers": [(b"content-type", b"text/html; charset=utf-8")]})
        await send({"type": "http.response.body", "body": body})


def _dist() -> Path:
    return config.frontend_dist()


async def _serve() -> None:
    global _server
    import contextlib

    import uvicorn
    from starlette.staticfiles import StaticFiles

    from app.main import app
    cfg = uvicorn.Config(Gate(app, StaticFiles(directory=str(_dist()), html=True)), host="0.0.0.0", port=LAN_PORT, lifespan="off", log_level="warning")
    _server = uvicorn.Server(cfg)
    _server.capture_signals = contextlib.nullcontext
    await _server.serve()


def _start() -> None:
    global _task
    if running():
        return
    if _loop is None:
        raise CommandError("The engine is still starting; try again", 503)
    if not (_dist() / "index.html").is_file():
        raise CommandError("Build the window first with ./format build, so other devices can load it", 409)
    fut = asyncio.run_coroutine_threadsafe(_launch(), _loop)
    fut.result(10)


async def _launch() -> None:
    global _task
    _task = asyncio.create_task(_serve())
    for _ in range(50):
        if _server is not None and getattr(_server, "started", False):
            return
        if _task.done():
            exc = _task.exception()
            raise CommandError(f"Could not listen on port {LAN_PORT}: {exc}", 500)
        await asyncio.sleep(0.1)


def stop_server() -> None:
    global _server
    if _server is not None:
        _server.should_exit = True
        _server = None


def _qr(url: str) -> str:
    import segno
    svg = segno.make(url, error="m").svg_inline(scale=5, dark="#f7f7f7", light="#111111", border=2)
    return svg


def status() -> dict:
    on = running()
    urls = [f"http://{ip}:{LAN_PORT}" for ip in lan_addresses()] if on else []
    out = {"on": on, "port": LAN_PORT, "urls": urls, "pairUrl": None, "qr": None}
    if on and urls:
        out["pairUrl"] = f"{urls[0]}/pair?code={_secret()}"
        out["qr"] = _qr(out["pairUrl"])
    return out


@command("devices.status", "Other devices", mutates=False,
         description="Whether Format is reachable from other devices on this network (a phone or another computer), its addresses, and, when on, the pairing link and its QR code as SVG.")
def devices_status() -> dict:
    return status()


@command("devices.start", "Open to other devices",
         description="Starts Format's network listener (port 8492) so a paired phone or computer on the same network can use Format, and shared links can be opened. Only paired devices reach chats; shared artifact links are read-only. Returns the pairing link and QR code.")
def devices_start() -> dict:
    _start()
    out = status()
    events.publish("devices.changed", devices={k: v for k, v in out.items() if k != "qr"})
    return out


@command("devices.stop", "Close to other devices", description="Stops the network listener; paired devices and shared links stop working until it starts again.")
def devices_stop() -> dict:
    stop_server()
    events.publish("devices.changed", devices={"on": False})
    return {"on": False}


@command("devices.forget", "Forget paired devices", description="Changes the pairing code, so every paired device has to pair again.")
def devices_forget() -> dict:
    _secret(rotate=True)
    return status()


router = APIRouter(tags=["share"])


@router.get("/s/{token}")
def shared_page(token: str) -> Response:
    from app.engine import documents
    from app.engine.cmd_settings import current
    from app.routers.files import artifact_csp
    row = store.row("SELECT * FROM shares WHERE token = ?", (token,))
    a = artifacts.get(row["artifact_id"]) if row else None
    v = artifacts.version(row["artifact_id"], row["version"]) if row else None
    if a is None or v is None:
        return Response("<!doctype html><meta name=viewport content='width=device-width'><body style='font:16px system-ui;background:#111;color:#eee;padding:24px'><p>This link is no longer shared.</p>",
                        status_code=410, media_type="text/html; charset=utf-8")
    page = v["content"] if a["kind"] == "html" else documents.standalone_html(a["kind"], v["content"], a["title"])
    return Response(page, media_type="text/html; charset=utf-8", headers={
        "content-security-policy": artifact_csp(bool(current().get("artifactNetwork", False))).replace("frame-ancestors 'self'", "frame-ancestors 'none'"),
        "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "cache-control": "no-store", "x-robots-tag": "noindex"})


def share_url(token: str) -> str:
    return f"{base_url()}/s/{token}"


def shares_of(artifact_id: str) -> list[dict]:
    return [{"token": r["token"], "version": r["version"], "created": r["created"], "url": share_url(r["token"])}
            for r in store.rows("SELECT * FROM shares WHERE artifact_id = ? ORDER BY created", (artifact_id,))]


@command("artifact.share", "Share an artifact",
         {"id": {"type": "string", "required": True, "description": "artifact id"}, "version": {"type": "integer", "description": "pin one version; default follows the latest"}},
         description="Makes a read-only link to an artifact (the latest version, or one pinned version). Anyone who can reach this computer's network listener can open it; start it with devices.start to share beyond this computer. Returns the link.")
def share(id: str, version: int | None = None) -> dict:
    a = artifacts.get(id)
    if a is None:
        raise CommandError(f"No artifact {id}; artifact.list gives the ids", 404)
    existing = store.row("SELECT token FROM shares WHERE artifact_id = ? AND version IS ?", (id, version))
    token = existing["token"] if existing else secrets.token_urlsafe(16)
    if not existing:
        store.run("INSERT INTO shares(token, artifact_id, version, created) VALUES (?, ?, ?, ?)", (token, id, version, store.now()))
    events.publish("artifact.shared", id=id, shares=shares_of(id))
    return {"id": id, "token": token, "url": share_url(token), "lan": running(), "shares": shares_of(id)}


@command("artifact.unshare", "Stop sharing an artifact", {"id": {"type": "string", "required": True}},
         description="Revokes every link to the artifact at once; opening an old link shows that it is no longer shared.")
def unshare(id: str) -> dict:
    n = store.run("DELETE FROM shares WHERE artifact_id = ?", (id,))
    events.publish("artifact.shared", id=id, shares=[])
    return {"id": id, "revoked": n}


@command("artifact.shares", "Links to an artifact", {"id": {"type": "string", "required": True}}, mutates=False,
         description="The artifact's share links, if any.")
def shares(id: str) -> dict:
    return {"id": id, "shares": shares_of(id), "lan": running()}
