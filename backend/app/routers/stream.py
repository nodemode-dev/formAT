import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core import config, window_key
from app.engine import events

router = APIRouter(tags=["events"])


@router.websocket("/api/events")
async def stream(ws: WebSocket, ticket: str = "") -> None:
    if not window_key.paired(ws.scope) and not window_key.spend(ticket):
        await ws.close(code=4403)
        return
    await ws.accept()
    q = events.subscribe()

    async def outbound() -> None:
        await ws.send_text(json.dumps({"seq": 0, "type": "hello", "version": config.VERSION}))
        while True:
            await ws.send_text(await q.get())

    sender = asyncio.create_task(outbound())
    try:
        while True:
            await ws.receive_text()
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        sender.cancel()
        events.unsubscribe(q)
