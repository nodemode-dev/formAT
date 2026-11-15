import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core import config
from app.engine import events

router = APIRouter(tags=["events"])


@router.websocket("/api/events")
async def stream(ws: WebSocket) -> None:
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
