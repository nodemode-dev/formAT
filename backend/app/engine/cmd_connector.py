from app.engine import connectors
from app.engine.commands import CommandError, command

CID = {"type": "string", "required": True, "description": "the connector's id or name"}


def _do(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except connectors.ConnectorError as exc:
        raise CommandError(str(exc), exc.status) from None


@command("connector.list", "Connectors", mutates=False,
         description="MCP servers added to Format: name, URL or command, route (api: sent to Anthropic's MCP connector; local: run by the engine), status, and their tools with on and off.")
def list_() -> dict:
    return {"connectors": connectors.list_()}


@command("connector.add", "Add a connector",
         {"name": {"type": "string", "required": True, "description": "lowercase, digits, - and _"},
          "url": {"type": "string", "description": "a remote MCP server (Streamable HTTP or SSE)"},
          "command": {"type": "string", "description": "a local MCP server to start, as a command line"},
          "token": {"type": "string", "description": "a bearer token, if the server needs one"},
          "env": {"type": "object", "description": "environment variables for a local server"}},
         description="Adds an MCP server by URL or by command. A public https URL goes to Claude through Anthropic's MCP connector; a URL on this computer or a private network, and every command, is run by the engine, and its tools ask for approval like commands do. Then connector.connect lists its tools.")
def add(name: str, url: str | None = None, command: str | None = None, token: str | None = None, env: dict | None = None) -> dict:
    return _do(connectors.add, name, url or "", command or "", token or "", env)


@command("connector.update", "Change a connector",
         {"id": CID, "enabled": {"type": "boolean"}, "disabledTools": {"type": "array", "items": {"type": "string"}, "description": "tool names Claude may not use"},
          "token": {"type": "string"}},
         description="Turns a connector on or off, sets which of its tools are off, or replaces its token.")
def update(id: str, enabled: bool | None = None, disabledTools: list | None = None, token: str | None = None) -> dict:
    return _do(connectors.update, id, enabled, disabledTools, token)


@command("connector.connect", "Connect or reconnect", {"id": CID},
         description="Connects to the server (starting it, for a command) and lists its tools; run it again to reconnect. Returns the connector with status connected or error.")
def connect(id: str) -> dict:
    return _do(connectors.connect, id)


@command("connector.delete", "Remove a connector", {"id": CID}, description="Removes a connector and closes its connection.")
def delete(id: str) -> dict:
    _do(connectors.delete, id)
    return {"deleted": id}
