from contextlib import asynccontextmanager

import anyio

from app import mcp_server
from app.engine import agents
from app.engine.commands import catalogue, dispatch

_app = None
_server = None


async def _call(cid: str, params: dict, client: str):
    def run():
        agents.require_outside(client, "http", cid, params)
        return dispatch(cid, params)
    return await anyio.to_thread.run_sync(run)


async def _catalogue() -> list[dict]:
    return catalogue()


def app():
    global _app, _server
    if _app is None:
        _server = mcp_server.build(_call, _catalogue)
        _app = _server.streamable_http_app(streamable_http_path="/", host="127.0.0.1")
    return _app


class Endpoint:
    async def __call__(self, scope, receive, send) -> None:
        await app()({**scope, "path": "/", "raw_path": b"/", "root_path": ""}, receive, send)


@asynccontextmanager
async def running():
    app()
    async with _server.session_manager.run():
        yield
