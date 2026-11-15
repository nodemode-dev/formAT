import html
import threading

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from app.core import config

router = APIRouter(prefix="/api", tags=["system"])
PAGE = "<!doctype html><meta charset=utf-8><title>FormAT</title><body style=\"font:15px system-ui;background:#141414;color:#eee;display:grid;place-content:center;height:90vh;text-align:center\"><p>{}</p>"


@router.get("/health")
def health() -> dict:
    return {"ok": True, "name": config.APP_NAME, "version": config.VERSION}


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
