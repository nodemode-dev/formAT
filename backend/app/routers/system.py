import html
import threading

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse

from app.core import config, window_key

router = APIRouter(prefix="/api", tags=["system"])
PAGE = "<!doctype html><meta charset=utf-8><title>FormAT</title><body style=\"font:15px system-ui;background:#141414;color:#eee;display:grid;place-content:center;height:90vh;text-align:center\"><p>{}</p>"


@router.get("/health")
def health() -> dict:
    return {"ok": True, "name": config.APP_NAME, "version": config.VERSION}


@router.post("/window/key")
def claim_window_key(request: Request) -> dict:
    if window_key.stdout_mode() or window_key.paired(request.scope):
        raise HTTPException(404, "Not Found")
    key = window_key.claim()
    if key is None:
        raise HTTPException(409, "Another window already holds this engine's window key; use that window, or restart FormAT")
    return {"key": key}


@router.post("/window/ticket")
def window_ticket(request: Request) -> dict:
    if not window_key.is_window(request.scope):
        raise HTTPException(403, window_key.REFUSED)
    return {"ticket": window_key.ticket()}


@router.get("/connectors/oauth/callback", response_class=HTMLResponse)
def oauth_callback(state: str = "", code: str = "", error: str = "", error_description: str = "") -> HTMLResponse:
    from app.engine import connectors, oauth
    if error or not code:
        return HTMLResponse(PAGE.format(html.escape(f"Sign-in did not finish: {error_description or error or 'no code came back'}. Go back to FormAT and try again.")), status_code=400)
    try:
        cid = oauth.finish(state, code)
    except oauth.OAuthError as exc:
        return HTMLResponse(PAGE.format(html.escape(f"Sign-in did not finish: {exc}.")), status_code=400)
    connectors.MANAGER.drop(cid)
    threading.Thread(target=connectors.connect, args=(cid,), name="oauth-connect", daemon=True).start()
    return HTMLResponse(PAGE.format("Signed in. You can close this tab and go back to FormAT."))
