from app.engine import skills
from app.engine.commands import CommandError, command

NAME = {"type": "string", "required": True, "description": "the skill's name"}


def _do(fn, *args):
    try:
        return fn(*args)
    except skills.SkillError as exc:
        raise CommandError(str(exc), exc.status) from None


@command("skill.list", "Skills", mutates=False, description="The skills installed in Format, with their description, whether they are on, and their file count.")
def list_() -> dict:
    return {"skills": skills.list_()}


@command("skill.get", "Open a skill", {"name": NAME}, mutates=False, description="One skill: its SKILL.md and the list of its files.")
def get(name: str) -> dict:
    return _do(skills.get, name)


@command("skill.read", "Read a skill file", {"name": NAME, "path": {"type": "string", "required": True, "description": "a path inside the skill's folder, as skill.get lists it"}}, mutates=False,
         description="One file of an installed skill as text (up to 400 KB; a binary file is named, not shown).")
def read(name: str, path: str) -> dict:
    return _do(skills.read_file, name, path)


@command("skill.add", "Add a skill", {"uploadId": {"type": "string", "required": True, "description": "a .zip of a skill folder, or a SKILL.md, from POST /api/uploads"}},
         description="Installs a skill from an uploaded .zip (its folder with SKILL.md) or SKILL.md file. A skill with the same name is replaced.")
def add(uploadId: str) -> dict:
    return _do(skills.add_upload, uploadId)


@command("skill.create", "Write a skill", {"name": NAME, "description": {"type": "string", "required": True}, "instructions": {"type": "string", "required": True}},
         description="Creates a skill from a name, a description (when Claude should use it) and its instructions, written as its SKILL.md.")
def create(name: str, description: str, instructions: str) -> dict:
    return _do(skills.create, name.strip().lower(), description, instructions)


@command("skill.enable", "Turn a skill on or off", {"name": NAME, "enabled": {"type": "boolean", "required": True}},
         description="A skill that is off is not offered to Claude.")
def enable(name: str, enabled: bool) -> dict:
    return _do(skills.set_enabled, name, bool(enabled))


@command("skill.delete", "Delete a skill", {"name": NAME}, description="Removes a skill's folder. Not undoable.")
def delete(name: str) -> dict:
    _do(skills.delete, name)
    return {"deleted": name}
