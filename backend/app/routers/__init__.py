import asyncio

from app.engine import cmd_app, cmd_conversation, cmd_message, cmd_settings, cmd_terminal, events, store, terminal
from app.routers import commands, stream, system, terminal_socket

ROUTERS = [system.router, commands.router, stream.router, terminal_socket.router]
COMMAND_MODULES = (cmd_app, cmd_conversation, cmd_message, cmd_settings, cmd_terminal)


async def startup() -> None:
    loop = asyncio.get_running_loop()
    events.bind(loop)
    terminal.bind(loop)
    store.conn()


async def shutdown() -> None:
    terminal.close_all()
