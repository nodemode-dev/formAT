import asyncio

from app.engine import (agents, cmd_account, cmd_app, cmd_artifact, cmd_chat, cmd_connector, cmd_conversation, cmd_files, cmd_memory, cmd_message, cmd_project, cmd_settings,
                        cmd_skill, cmd_terminal, events, native, schedules, store, terminal)
from app.routers import commands, files, stream, system, terminal_socket

ROUTERS = [system.router, commands.router, stream.router, terminal_socket.router, files.router]
COMMAND_MODULES = (agents, cmd_account, cmd_app, cmd_artifact, cmd_chat, cmd_connector, cmd_conversation, cmd_files, cmd_memory, cmd_message, cmd_project, cmd_settings, cmd_skill,
                   cmd_terminal, native, schedules)


async def startup() -> None:
    loop = asyncio.get_running_loop()
    events.bind(loop)
    terminal.bind(loop)
    store.conn()
    schedules.start()


async def shutdown() -> None:
    schedules.stop()
    terminal.close_all()
