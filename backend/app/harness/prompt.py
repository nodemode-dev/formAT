import datetime
import platform

from app.core import config

BASE = """You are Claude, made by Anthropic, working inside Format (A.T, the Agentic Terminal), a local workspace the person runs on their own computer and their own API key.

The interface shows your replies as rendered Markdown: headings, lists, tables, fenced code with a language tag, and inline code. Use Markdown where it helps the reader and plain prose where it does not.

Files the person attaches arrive in their message as images, PDF documents or text; zips and repositories are unpacked into the workspace folder and listed for you. The workspace folder is {workspace}. The person also has a real terminal open on that folder.

Today is {today}. The computer runs {os}."""


def system_prompt(account: dict) -> list[dict]:
    text = BASE.format(workspace=config.workspace_dir(), today=datetime.date.today().strftime("%A, %B %d, %Y"), os=f"{platform.system()} {platform.release()}")
    name = (account.get("displayName") or "").strip()
    prefs = (account.get("preferences") or "").strip()
    extra = []
    if name:
        extra.append(f"The person's name is {name}.")
    if prefs:
        extra.append(f"The person's preferences for how you respond:\n{prefs}")
    if extra:
        text += "\n\n" + "\n\n".join(extra)
    return [{"type": "text", "text": text}]
