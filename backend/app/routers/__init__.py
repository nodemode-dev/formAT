import asyncio

from app.engine import cmd_app, cmd_conversation, events, store
from app.routers import commands, stream, system

ROUTERS = [system.router, commands.router, stream.router]
COMMAND_MODULES = (cmd_app, cmd_conversation)


async def startup() -> None:
    events.bind(asyncio.get_running_loop())
    store.conn()


async def shutdown() -> None:
    return None
