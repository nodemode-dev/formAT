import asyncio
import ipaddress
import json
import re
import shlex
import threading
from contextlib import AsyncExitStack
from urllib.parse import urlparse

from app.engine import events, store

NAME = re.compile(r"^[a-z0-9][a-z0-9_-]{0,39}$")
MCP_BETA = "mcp-client-2025-11-20"
CALL_TIMEOUT = 120
CONNECT_TIMEOUT = 30
RESULT_CAP = 30_000


class ConnectorError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


PERMS = ("allow", "ask", "block")


def _remote(row: dict) -> bool:
    if row["kind"] == "command":
        return False
    u = urlparse(row["url"])
    host = (u.hostname or "").lower()
    private = host in ("localhost", "") or host.endswith(".local")
    try:
        ip = ipaddress.ip_address(host)
        private = private or ip.is_private or ip.is_loopback or ip.is_link_local
    except ValueError:
        pass
    return u.scheme == "https" and not private


def _perms(row: dict) -> dict:
    saved = dict(json.loads(row.get("tool_perms") or "{}"))
    for t in json.loads(row["disabled_tools"] or "[]"):
        saved.setdefault(t, "block")
    return saved


def default_perm(row: dict) -> str:
    return "allow" if _remote(row) else "ask"


def perm_of(row: dict, tool: str) -> str:
    return _perms(row).get(tool) or default_perm(row)


def route(row: dict) -> str:
    if not _remote(row) or json.loads(row.get("headers") or "{}"):
        return "local"
    names = [t["name"] for t in json.loads(row["tools"] or "[]")]
    return "local" if any(perm_of(row, n) == "ask" for n in names) else "api"


def public(row: dict) -> dict:
    tools = json.loads(row["tools"] or "[]")
    return {"id": row["id"], "name": row["name"], "kind": row["kind"], "url": row["url"], "command": row["command"], "hasToken": bool(row["token"]),
            "headerNames": sorted(json.loads(row.get("headers") or "{}")), "enabled": bool(row["enabled"]), "route": route(row), "status": row["status"], "error": row["error"],
            "defaultPermission": default_perm(row),
            "tools": [{"name": t["name"], "description": t.get("description", ""), "permission": perm_of(row, t["name"]), "enabled": perm_of(row, t["name"]) != "block"} for t in tools],
            "created": row["created"], "updated": row["updated"]}


def _row(cid: str) -> dict:
    r = store.row("SELECT * FROM connectors WHERE id = ? OR name = ?", (cid, cid))
    if r is None:
        raise ConnectorError(f"No connector {cid}; connector.list gives them", 404)
    return r


def list_() -> list[dict]:
    return [public(r) for r in store.rows("SELECT * FROM connectors ORDER BY name")]


def _publish() -> None:
    events.publish("connectors.changed", connectors=list_())


def add(name: str, url: str = "", command: str = "", token: str = "", env: dict | None = None, headers: dict | None = None) -> dict:
    name = (name or "").strip().lower()
    if not NAME.match(name):
        raise ConnectorError("a connector name is lowercase letters, digits, hyphens and underscores, up to 40")
    if store.row("SELECT id FROM connectors WHERE name = ?", (name,)):
        raise ConnectorError(f"there is already a connector named {name}")
    url, command = (url or "").strip(), (command or "").strip()
    if bool(url) == bool(command):
        raise ConnectorError("give either a URL (a remote MCP server) or a command (a local one)")
    if url and urlparse(url).scheme not in ("http", "https"):
        raise ConnectorError("the URL must start with https:// (or http:// for a server on this computer)")
    if command:
        try:
            shlex.split(command)
        except ValueError as exc:
            raise ConnectorError(f"the command does not parse: {exc}") from None
    if env is not None and (not isinstance(env, dict) or any(not isinstance(k, str) or not isinstance(v, str) for k, v in env.items())):
        raise ConnectorError("env takes names and string values")
    if headers is not None and (not isinstance(headers, dict) or any(not isinstance(k, str) or not re.fullmatch(r"[A-Za-z0-9-]{1,64}", k) or not isinstance(v, str) or "\n" in v for k, v in headers.items())):
        raise ConnectorError("headers take names of letters, digits and hyphens, and one-line string values")
    if headers and command:
        raise ConnectorError("request headers are for a server reached by URL")
    cid, t = store.new_id(), store.now()
    store.run("INSERT INTO connectors(id, name, kind, url, token, command, env, headers, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              (cid, name, "url" if url else "command", url, (token or "").strip(), command, json.dumps(env or {}), json.dumps(headers or {}), t, t))
    _publish()
    return public(_row(cid))


def update(cid: str, enabled: bool | None = None, disabled_tools: list | None = None, token: str | None = None, tool_permissions: dict | None = None) -> dict:
    r = _row(cid)
    if disabled_tools is not None and (not isinstance(disabled_tools, list) or any(not isinstance(x, str) for x in disabled_tools)):
        raise ConnectorError("disabledTools takes a list of tool names")
    if tool_permissions is not None:
        if not isinstance(tool_permissions, dict) or any(not isinstance(k, str) or v not in PERMS for k, v in tool_permissions.items()):
            raise ConnectorError("toolPermissions maps tool names (or * for every tool) to allow, ask or block")
        names = [t["name"] for t in json.loads(r["tools"] or "[]")]
        perms = _perms(r)
        for k, v in tool_permissions.items():
            for n in (names if k == "*" else [k]):
                perms[n] = v
        store.run("UPDATE connectors SET tool_perms = ?, disabled_tools = '[]' WHERE id = ?", (json.dumps(perms, sort_keys=True), r["id"]))
        r = _row(r["id"])
        if disabled_tools is None:
            disabled_tools = []
    store.run("UPDATE connectors SET enabled = ?, disabled_tools = ?, token = ?, updated = ? WHERE id = ?",
              (int(r["enabled"] if enabled is None else bool(enabled)), json.dumps(sorted(set(disabled_tools))) if disabled_tools is not None else r["disabled_tools"],
               r["token"] if token is None else token.strip(), store.now(), r["id"]))
    if enabled is False or token is not None:
        MANAGER.drop(r["id"])
    _publish()
    return public(_row(r["id"]))


def delete(cid: str) -> None:
    r = _row(cid)
    MANAGER.drop(r["id"])
    store.run("DELETE FROM connectors WHERE id = ?", (r["id"],))
    _publish()


def _set_status(cid: str, status: str, error: str = "", tools: list | None = None) -> None:
    if tools is None:
        store.run("UPDATE connectors SET status = ?, error = ?, updated = ? WHERE id = ?", (status, error[:500], store.now(), cid))
    else:
        store.run("UPDATE connectors SET status = ?, error = ?, tools = ?, updated = ? WHERE id = ?", (status, error[:500], json.dumps(tools), store.now(), cid))
    _publish()


def connect(cid: str) -> dict:
    r = _row(cid)
    _set_status(r["id"], "connecting")
    try:
        tools = MANAGER.run(MANAGER.list_tools(r), CONNECT_TIMEOUT)
    except Exception as exc:
        _set_status(r["id"], "error", _describe(exc))
        return public(_row(r["id"]))
    _set_status(r["id"], "connected", "", tools)
    return public(_row(r["id"]))


def _describe(exc: BaseException) -> str:
    inner = getattr(exc, "exceptions", None)
    if inner:
        return _describe(inner[0])
    text = str(exc) or type(exc).__name__
    return f"{type(exc).__name__}: {text}" if type(exc).__name__ not in text else text


def tool_name(conn: str, tool: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9_-]", "_", tool)
    return f"mcp__{conn}__{safe}"[:64]


def active() -> list[dict]:
    return [r for r in store.rows("SELECT * FROM connectors WHERE enabled = 1 ORDER BY name")]


def request_parts() -> tuple[list[dict], list[dict], list[dict]]:
    servers, toolsets, local = [], [], []
    for r in active():
        off = {t["name"] for t in json.loads(r["tools"] or "[]") if perm_of(r, t["name"]) == "block"}
        if route(r) == "api":
            servers.append({"type": "url", "url": r["url"], "name": r["name"]} | ({"authorization_token": r["token"]} if r["token"] else {}))
            toolsets.append({"type": "mcp_toolset", "mcp_server_name": r["name"]} | ({"configs": {t: {"enabled": False} for t in sorted(off)}} if off else {}))
        elif r["status"] == "connected":
            for t in json.loads(r["tools"] or "[]"):
                if t["name"] in off:
                    continue
                local.append({"name": tool_name(r["name"], t["name"]), "description": f"[{r['name']} connector] {t.get('description') or t['name']}"[:1024],
                              "input_schema": t.get("input_schema") or {"type": "object", "properties": {}}})
    return servers, toolsets, local


def resolve_call(name: str) -> tuple[dict, str] | None:
    for r in active():
        if route(r) != "local":
            continue
        for t in json.loads(r["tools"] or "[]"):
            if tool_name(r["name"], t["name"]) == name:
                if perm_of(r, t["name"]) == "block":
                    return None
                return r, t["name"]
    return None


def permission_for(name: str) -> str | None:
    for r in active():
        for t in json.loads(r["tools"] or "[]"):
            if tool_name(r["name"], t["name"]) == name:
                return perm_of(r, t["name"])
    return None


def allow_by_name(name: str) -> bool:
    for r in active():
        for t in json.loads(r["tools"] or "[]"):
            if tool_name(r["name"], t["name"]) == name:
                update(r["id"], tool_permissions={t["name"]: "allow"})
                return True
    return False


def call(name: str, args: dict) -> tuple[str, bool]:
    found = resolve_call(name)
    if found is None:
        return f"The connector tool {name} is not available; it may be turned off or disconnected.", True
    r, tool = found
    try:
        return MANAGER.run(MANAGER.call_tool(r, tool, args), CALL_TIMEOUT)
    except Exception as exc:
        MANAGER.drop(r["id"])
        _set_status(r["id"], "error", _describe(exc))
        return f"The {r['name']} connector failed: {_describe(exc)}", True


class _Manager:
    def __init__(self) -> None:
        self._loop: asyncio.AbstractEventLoop | None = None
        self._lock = threading.Lock()
        self._sessions: dict[str, tuple[object, AsyncExitStack, str]] = {}

    def _ensure_loop(self) -> asyncio.AbstractEventLoop:
        with self._lock:
            if self._loop is None:
                self._loop = asyncio.new_event_loop()
                threading.Thread(target=self._loop.run_forever, name="mcp-connectors", daemon=True).start()
            return self._loop

    def run(self, coro, timeout: float):
        fut = asyncio.run_coroutine_threadsafe(coro, self._ensure_loop())
        try:
            return fut.result(timeout)
        except TimeoutError:
            fut.cancel()
            raise TimeoutError(f"no answer within {int(timeout)} s") from None

    def drop(self, cid: str) -> None:
        entry = self._sessions.pop(cid, None)
        if entry and self._loop:
            asyncio.run_coroutine_threadsafe(self._close(entry[1]), self._loop)

    async def _close(self, stack: AsyncExitStack) -> None:
        try:
            await stack.aclose()
        except BaseException:
            pass

    def _key(self, r: dict) -> str:
        return json.dumps([r["url"], r["command"], r["token"], r["env"], r.get("headers") or "{}"])

    async def _client(self, r: dict):
        from mcp import Client, StdioServerParameters
        known = self._sessions.get(r["id"])
        if known and known[2] == self._key(r):
            return known[0]
        if known:
            self._sessions.pop(r["id"], None)
            await self._close(known[1])
        stack = AsyncExitStack()
        if r["kind"] == "command":
            parts = shlex.split(r["command"])
            target = StdioServerParameters(command=parts[0], args=parts[1:], env=json.loads(r["env"] or "{}") or None)
        elif r["token"] or json.loads(r.get("headers") or "{}"):
            import httpx2
            from mcp.client.streamable_http import streamable_http_client
            sent = dict(json.loads(r.get("headers") or "{}")) | ({"Authorization": f"Bearer {r['token']}"} if r["token"] else {})
            http = await stack.enter_async_context(httpx2.AsyncClient(headers=sent, timeout=CALL_TIMEOUT))
            target = streamable_http_client(r["url"], http_client=http)
        else:
            target = r["url"]
        try:
            client = await stack.enter_async_context(Client(target, read_timeout_seconds=CALL_TIMEOUT))
        except BaseException:
            await self._close(stack)
            raise
        self._sessions[r["id"]] = (client, stack, self._key(r))
        return client

    async def list_tools(self, r: dict) -> list[dict]:
        client = await self._client(r)
        out, cursor = [], None
        while True:
            res = await client.list_tools(cursor=cursor) if cursor else await client.list_tools()
            for t in res.tools:
                out.append({"name": t.name, "description": (t.description or "")[:2000], "input_schema": t.input_schema or {"type": "object", "properties": {}}})
            cursor = getattr(res, "next_cursor", None)
            if not cursor or len(out) > 500:
                return out

    async def call_tool(self, r: dict, tool: str, args: dict) -> tuple[str, bool]:
        client = await self._client(r)
        res = await client.call_tool(tool, args or {})
        parts = []
        for c in res.content or []:
            kind = getattr(c, "type", "")
            if kind == "text":
                parts.append(c.text)
            elif kind == "image":
                parts.append(f"[image, {getattr(c, 'mime_type', 'unknown type')}]")
            else:
                parts.append(f"[{kind} content]")
        if not parts and getattr(res, "structured_content", None) is not None:
            parts.append(json.dumps(res.structured_content)[:RESULT_CAP])
        text = "\n".join(parts) or "(no output)"
        return text[:RESULT_CAP], bool(getattr(res, "is_error", False))


MANAGER = _Manager()
