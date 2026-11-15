from app.engine import demos
from app.engine.commands import CommandError, command


@command("demo.list", "Demos", mutates=False,
         description="The demo chats Format ships with: each one's id, chat title, artifact title, number of output files, and conversationId, which is null when the person deleted that demo. A demo is a recorded chat stored like any other; reading one needs no API key and calls no model.")
def list_() -> dict:
    return {"demos": demos.list_()}


@command("demo.restore", "Restore a demo chat", {"id": {"type": "string", "required": True, "description": "a demo id from demo.list"}},
         description="Returns the conversation of one demo, and puts the demo back first when it was deleted: a new chat with the recorded messages, the artifact page and the output files, made from the data shipped with Format. Calls no model and needs no API key. restored is true when a chat was made, false when the demo was already there, in which case nothing changes.")
def restore(id: str) -> dict:
    try:
        conv, made = demos.restore(id)
    except demos.DemoError as exc:
        raise CommandError(f"demo.restore: {exc}", 404 if id not in demos.ids() else 400) from None
    return conv | {"restored": made}
