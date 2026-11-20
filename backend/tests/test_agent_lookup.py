import hashlib
import importlib
import importlib.util
import json
import re
import shutil
import subprocess
import sys

from conftest import AGENT_CALLS, REPO

LOOKUP = "backend/app/engine/agent_lookup.py"
FOUR = ["claude", "codex", "cursor", "antigravity"]


def _agents():
    spec = importlib.util.spec_from_file_location("checked_agents", REPO / "setup" / "agents.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_the_shared_finder_matches_the_hash_recorded_for_its_version(app):
    module = _agents()
    version = re.search(r'^VERSION = "([^"]+)"$', (REPO / LOOKUP).read_text(encoding="utf-8"), re.M).group(1)
    assert module.LOOKUP_HASHES[version] == hashlib.sha256((REPO / LOOKUP).read_bytes()).hexdigest()
    assert module.lookup_problems() == []


def test_the_check_names_the_shared_finder_edited_in_place_or_missing(app, tmp_path, monkeypatch):
    module = _agents()
    copy = tmp_path / LOOKUP
    copy.parent.mkdir(parents=True)
    shutil.copy(REPO / LOOKUP, copy)
    monkeypatch.setattr(module, "ROOT", tmp_path)
    monkeypatch.setattr(module, "LOOKUP", copy)
    assert module.lookup_problems() == []
    with open(copy, "a", encoding="utf-8") as f:
        f.write("\n")
    version = re.search(r'^VERSION = "([^"]+)"$', (REPO / LOOKUP).read_text(encoding="utf-8"), re.M).group(1)
    assert module.lookup_problems() == [f"{LOOKUP}: does not match the hash recorded for version {version} (the shared finder changes only as a whole new version)"]
    copy.unlink()
    assert module.lookup_problems() == [f"{LOOKUP}: missing (the shared finder for the agent programs)"]


def test_the_shared_finder_imports_nothing_from_the_app():
    imports = set(re.findall(r"^\s*(?:from|import)\s+([\w.]+)", (REPO / LOOKUP).read_text(encoding="utf-8"), re.M))
    assert not [name for name in imports if name.split(".")[0] == "app"]


def test_the_status_reports_the_four_agent_programs_and_starts_only_stand_ins(app):
    if sys.platform == "win32":
        return
    before = len(AGENT_CALLS.read_text(encoding="utf-8").splitlines()) if AGENT_CALLS.exists() else 0
    status = importlib.import_module("app.engine.commands").dispatch("claudecode.status", {})
    programs = status["programs"]
    assert list(programs) == FOUR
    assert [programs[k]["title"] for k in FOUR] == ["Claude Code", "Codex", "Cursor", "Antigravity"]
    for kind, name in zip(FOUR, ("claude", "codex", "cursor-agent", "agy")):
        row = programs[kind]
        assert row["finding"] == "runs" and row["installed"] is True and row["version"] == "0.0.0", row
        assert row["path"].endswith("/bin/" + name) and row["how"] == "path" and row["signedIn"] is None and row["install"]
    assert status["installed"] is True and status["path"] == programs["claude"]["path"] and status["version"] == "0.0.0"
    started = AGENT_CALLS.read_text(encoding="utf-8").splitlines()[before:]
    assert started and set(started) <= {"claude --version", "codex --version", "cursor-agent --version", "agy --version"}


def test_agents_install_for_every_folder_adds_format_to_antigravitys_file_and_keeps_the_rest(tmp_path):
    if sys.platform == "win32":
        return
    module = _agents()
    home = tmp_path / "home"
    cfg = home / ".gemini" / "config" / "mcp_config.json"
    cfg.parent.mkdir(parents=True)
    cfg.write_text(json.dumps({"theme": "dark", "mcpServers": {"other": {"command": "/bin/other", "args": ["x"]}}}), encoding="utf-8")
    launcher = REPO / "format"
    module.install_antigravity(home, launcher)
    data = json.loads(cfg.read_text(encoding="utf-8"))
    assert data["theme"] == "dark" and data["mcpServers"]["other"] == {"command": "/bin/other", "args": ["x"]}
    assert data["mcpServers"]["format"] == {"command": launcher.as_posix(), "args": ["mcp"]}
    written = cfg.read_bytes()
    module.install_antigravity(home, launcher)
    assert cfg.read_bytes() == written and [p.name for p in cfg.parent.iterdir()] == ["mcp_config.json"]
    cfg.write_text(json.dumps({"mcpServers": {"format": {"serverUrl": "https://example.invalid/mcp"}}}), encoding="utf-8")
    module.install_antigravity(home, launcher)
    assert json.loads(cfg.read_text(encoding="utf-8")) == {"mcpServers": {"format": {"serverUrl": "https://example.invalid/mcp"}}}


def test_the_project_file_for_antigravity_names_the_engines_mcp_address():
    data = json.loads((REPO / ".agents" / "mcp_config.json").read_text(encoding="utf-8"))
    assert data == {"mcpServers": {"format": {"serverUrl": "http://127.0.0.1:8490/mcp"}}}
    assert subprocess.run(["git", "check-ignore", "-q", ".agents/mcp_config.json"], cwd=REPO).returncode == 1
