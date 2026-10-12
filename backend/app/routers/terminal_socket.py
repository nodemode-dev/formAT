import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.engine import terminal

router = APIRouter(tags=["terminal"])


@router.websocket("/api/terminal/{sid}")
async def attach(ws: WebSocket, sid: str) -> None:
    await ws.accept()
    try:
        session = terminal.get(sid)
    except KeyError:
        await ws.close(code=4404)
        return
    q: asyncio.Queue = asyncio.Queue()
    session.subscribers.add(q)

    async def outbound() -> None:
        backlog = session.scrollback()
        if backlog:
            await ws.send_text(backlog)
        while True:
            text = await q.get()
            if text is None:
                await ws.send_text(json.dumps({"type": "exit"}))
                continue
            await ws.send_text(text)

    sender = asyncio.create_task(outbound())
    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except ValueError:
                continue
            if msg.get("type") == "input" and session.alive:
                terminal.write(sid, str(msg.get("data", "")))
            elif msg.get("type") == "resize":
                terminal.resize(sid, int(msg.get("cols", 80)), int(msg.get("rows", 24)))
    except WebSocketDisconnect:
        pass
    finally:
        sender.cancel()
        session.subscribers.discard(q)
