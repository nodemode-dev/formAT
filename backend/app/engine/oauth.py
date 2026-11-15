import base64
import hashlib
import json
import re
import secrets
import threading
import time
from urllib.parse import urlencode, urlparse

import httpx

from app.core import config
from app.engine import store

TIMEOUT = 20
PENDING_TTL = 900
_pending: dict[str, dict] = {}
_lock = threading.Lock()


class OAuthError(Exception):
    pass


def redirect_uri() -> str:
    return f"http://127.0.0.1:{config.PORT}/api/connectors/oauth/callback"


def _origin(url: str) -> str:
    u = urlparse(url)
    return f"{u.scheme}://{u.netloc}"


def _json(http: httpx.Client, url: str) -> dict:
    try:
        r = http.get(url, headers={"Accept": "application/json"})
        return r.json() if r.status_code == 200 else {}
    except (httpx.HTTPError, ValueError):
        return {}


def _resource_meta(url: str, http: httpx.Client) -> dict:
    hint = ""
    try:
        r = http.post(url, json={"jsonrpc": "2.0", "id": 0, "method": "ping"}, headers={"Accept": "application/json, text/event-stream"})
        if r.status_code == 401:
            m = re.search(r'resource_metadata="([^"]+)"', r.headers.get("www-authenticate", ""))
            hint = m.group(1) if m else ""
    except httpx.HTTPError:
        pass
    path = urlparse(url).path.rstrip("/")
    for cand in (hint, f"{_origin(url)}/.well-known/oauth-protected-resource{path}" if path else "", f"{_origin(url)}/.well-known/oauth-protected-resource"):
        found = _json(http, cand) if cand else {}
        if found:
            return found
    return {}


def _server_meta(issuer: str, http: httpx.Client) -> dict:
    origin, path = _origin(issuer), urlparse(issuer).path.rstrip("/")
    for cand in (f"{origin}/.well-known/oauth-authorization-server{path}", f"{origin}/.well-known/openid-configuration{path}", f"{issuer.rstrip('/')}/.well-known/openid-configuration"):
        found = _json(http, cand)
        if found.get("authorization_endpoint") and found.get("token_endpoint"):
            return found
    return {"authorization_endpoint": f"{origin}/authorize", "token_endpoint": f"{origin}/token", "registration_endpoint": f"{origin}/register"}


def _saved(row: dict) -> dict:
    return dict(json.loads(row.get("oauth") or "{}"))


def _save(cid: str, data: dict) -> None:
    store.run("UPDATE connectors SET oauth = ? WHERE id = ?", (json.dumps(data), cid))


def begin(row: dict) -> str:
    saved, back = _saved(row), redirect_uri()
    with httpx.Client(timeout=TIMEOUT) as http:
        prm = _resource_meta(row["url"], http)
        meta = _server_meta((prm.get("authorization_servers") or [_origin(row["url"])])[0], http)
        client_id, secret = saved.get("client_id", ""), saved.get("client_secret", "")
        if saved.get("client") != "own" and (not client_id or saved.get("redirect_uri") != back):
            if not meta.get("registration_endpoint"):
                raise OAuthError("this server does not register clients automatically; remove the connector and add it again with your own OAuth client")
            try:
                r = http.post(meta["registration_endpoint"], json={"client_name": "FormAT", "redirect_uris": [back], "grant_types": ["authorization_code", "refresh_token"],
                                                                   "response_types": ["code"], "token_endpoint_auth_method": "none"})
                info = r.json() if r.status_code in (200, 201) else {}
            except (httpx.HTTPError, ValueError):
                info = {}
            if not info.get("client_id"):
                raise OAuthError("the server did not register FormAT as a client; add the connector again with your own OAuth client")
            client_id, secret = info["client_id"], info.get("client_secret", "")
    if not client_id:
        raise OAuthError("this connector has no OAuth client ID")
    verifier = secrets.token_urlsafe(48)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    state = secrets.token_urlsafe(24)
    resource = prm.get("resource") or row["url"]
    scope = " ".join(prm.get("scopes_supported") or meta.get("scopes_supported") or [])
    _save(row["id"], saved | {"client_id": client_id, "client_secret": secret, "redirect_uri": back, "token_endpoint": meta["token_endpoint"], "resource": resource,
                              "auth_methods": meta.get("token_endpoint_auth_methods_supported") or []})
    with _lock:
        for k in [k for k, v in _pending.items() if time.time() - v["at"] > PENDING_TTL]:
            _pending.pop(k, None)
        _pending[state] = {"cid": row["id"], "verifier": verifier, "at": time.time()}
    query = {"response_type": "code", "client_id": client_id, "redirect_uri": back, "code_challenge": challenge, "code_challenge_method": "S256", "state": state,
             "resource": resource} | ({"scope": scope} if scope else {})
    end = meta["authorization_endpoint"]
    return end + ("&" if "?" in end else "?") + urlencode(query)


def _token(saved: dict, data: dict) -> dict:
    data, auth = dict(data) | {"client_id": saved["client_id"]}, None
    if saved.get("client_secret"):
        methods = saved.get("auth_methods") or []
        if "client_secret_basic" in methods and "client_secret_post" not in methods:
            auth = (saved["client_id"], saved["client_secret"])
        else:
            data["client_secret"] = saved["client_secret"]
    try:
        with httpx.Client(timeout=TIMEOUT) as http:
            r = http.post(saved["token_endpoint"], data={k: v for k, v in data.items() if v}, auth=auth, headers={"Accept": "application/json"})
        body = r.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise OAuthError(f"the token request failed: {exc}") from None
    if r.status_code != 200 or not body.get("access_token"):
        raise OAuthError(f"the server refused the sign-in: {body.get('error_description') or body.get('error') or f'HTTP {r.status_code}'}")
    return {"access_token": body["access_token"], "refresh_token": body.get("refresh_token") or saved.get("refresh_token", ""),
            "expires_at": time.time() + float(body["expires_in"]) if body.get("expires_in") else 0, "lifetime": float(body.get("expires_in") or 3600), "signed_in": time.time()}


def finish(state: str, code: str) -> str:
    with _lock:
        pending = _pending.pop(state, None)
    if not pending or time.time() - pending["at"] > PENDING_TTL:
        raise OAuthError("this sign-in has expired or was already used; start it again from FormAT")
    row = store.row("SELECT * FROM connectors WHERE id = ?", (pending["cid"],))
    if row is None:
        raise OAuthError("the connector was removed while you signed in")
    saved = _saved(row)
    _save(row["id"], saved | _token(saved, {"grant_type": "authorization_code", "code": code, "redirect_uri": saved["redirect_uri"],
                                             "code_verifier": pending["verifier"], "resource": saved.get("resource", "")}))
    return row["id"]


_refresh_lock = threading.Lock()


def access_token(row: dict) -> str:
    with _refresh_lock:
        current = store.row("SELECT * FROM connectors WHERE id = ?", (row["id"],)) or row
        saved = _saved(current)
        if not saved.get("access_token"):
            return ""
        margin = 60 if saved.get("lifetime", 3600) > 120 else 0
        if saved.get("expires_at") and saved["expires_at"] - margin < time.time():
            try:
                if not saved.get("refresh_token"):
                    raise OAuthError("no refresh token")
                fresh = _token(saved, {"grant_type": "refresh_token", "refresh_token": saved["refresh_token"], "resource": saved.get("resource", "")})
            except OAuthError:
                sign_out(current)
                return ""
            _save(row["id"], saved | fresh)
            return fresh["access_token"]
        return saved["access_token"]


def sign_out(row: dict) -> None:
    current = store.row("SELECT * FROM connectors WHERE id = ?", (row["id"],)) or row
    _save(row["id"], {k: v for k, v in _saved(current).items() if k not in ("access_token", "refresh_token", "expires_at", "lifetime", "signed_in")})
