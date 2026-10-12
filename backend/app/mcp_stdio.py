import json
import os
import sys

import anyio
import httpx

from app import mcp_server

BASE = os.environ.get("FORMAT_ENGINE_URL", f"http://127.0.0.1:{os.environ.get('FORMAT_PORT', '8490')}")
_catalogue: list[dict] | None = None


class EngineError(Exception):
    pass


async def _request(method: str, path: str, body: dict | None = None, client: str = "") -> dict:
    headers = {"content-type": "application/json", "x-format-agent": client or "an outside agent"}
    try:
        async with httpx.AsyncClient(timeout=600) as http:
            r = await http.request(method, BASE + path, content=json.dumps(body) if body is not None else None, headers=headers)
    except httpx.HTTPError as exc:
        raise EngineError(f"Format's engine is not answering at {BASE} ({type(exc).__name__}); start Format with ./format, then try again.") from None
    try:
        return r.json()
    except ValueError:
        raise EngineError(f"Format's engine answered {r.status_code} without JSON") from None


async def call(cid: str, params: dict, client: str):
    out = await _request("POST", f"/api/commands/{cid}", params or {}, client)
    if not out.get("ok"):
        raise EngineError(out.get("error") or f"{cid} failed")
    return out.get("result")


async def catalogue() -> list[dict]:
    global _catalogue
    if _catalogue is None:
        _catalogue = (await _request("GET", "/api/commands"))["commands"]
    return _catalogue


async def main() -> None:
    from mcp.server.stdio import stdio_server
    server = mcp_server.build(call, catalogue)
    async with stdio_server() as (read, write):
        await server.run(read, write, server.create_initialization_options())


if __name__ == "__main__":
    try:
        anyio.run(main)
    except KeyboardInterrupt:
        sys.exit(0)
