import asyncio

from app.engine import (agents, browser, claude_code, cmd_account, cmd_app, cmd_artifact, cmd_chat, cmd_connector, cmd_conversation, cmd_demo, cmd_files, cmd_memory, cmd_message, cmd_project,
                        cmd_settings, cmd_skill, cmd_terminal, demos, devices, documents, events, marketplaces, native, plugins, sandbox, schedules, store, terminal)
from app.routers import commands, files, stream, system, terminal_socket

ROUTERS = [system.router, commands.router, stream.router, terminal_socket.router, files.router, devices.router, browser.router]
COMMAND_MODULES = (agents, browser, claude_code, cmd_account, cmd_app, cmd_artifact, cmd_chat, cmd_connector, cmd_conversation, cmd_demo, cmd_files, cmd_memory, cmd_message, cmd_project, cmd_settings,
                   cmd_skill, cmd_terminal, devices, documents, marketplaces, native, plugins, sandbox, schedules)


async def startup() -> None:
    loop = asyncio.get_running_loop()
    events.bind(loop)
    terminal.bind(loop)
    devices.bind(loop)
    store.conn()
    demos.seed()
    schedules.start()
    marketplaces.start()


async def shutdown() -> None:
    devices.stop_server()
    browser.stop()
    schedules.stop()
    terminal.close_all()
