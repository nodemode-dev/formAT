import json
import os
import subprocess
import sys

from conftest import REPO, tool_catalogue

MANIFEST = REPO / "agents" / "manifest.json"


def test_the_committed_manifest_is_what_agents_sync_would_write(tmp_path):
    done = subprocess.run([sys.executable, str(REPO / "setup" / "agents.py"), "sync", "--check"], cwd=REPO, capture_output=True, text=True,
                          env={**os.environ, "FORMAT_DATA_DIR": str(tmp_path), "PYTHONDONTWRITEBYTECODE": "1"})
    assert done.returncode == 0, done.stdout + done.stderr


def test_the_manifest_lists_the_tools_the_server_lists(app):
    mcp = json.loads(MANIFEST.read_text(encoding="utf-8"))["mcp"]
    assert mcp["tools"] == [t["name"] for t in tool_catalogue()]
    assert set(mcp["read_only"]) <= set(mcp["tools"]) and set(mcp["approval_gated"]) <= set(mcp["tools"])
    assert mcp["transports"] == ["stdio", "http"]
