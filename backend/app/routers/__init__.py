import asyncio

from app.engine import cmd_account, cmd_app, cmd_artifact, cmd_chat, cmd_conversation, cmd_files, cmd_message, cmd_project, cmd_settings, cmd_terminal, events, store, terminal
from app.routers import commands, files, stream, system, terminal_socket

ROUTERS = [system.router, commands.router, stream.router, terminal_socket.router, files.router]
COMMAND_MODULES = (cmd_account, cmd_app, cmd_artifact, cmd_chat, cmd_conversation, cmd_files, cmd_message, cmd_project, cmd_settings, cmd_terminal)


async def startup() -> None:
    loop = asyncio.get_running_loop()
    events.bind(loop)
    terminal.bind(loop)
    store.conn()


async def shutdown() -> None:
    terminal.close_all()
