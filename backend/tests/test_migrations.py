import json
import os
import sqlite3
import subprocess
import sys

import pytest

from conftest import BACKEND

SCHEMA_1 = """
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  project_id TEXT,
  pinned INTEGER NOT NULL DEFAULT 0,
  model TEXT,
  created REAL NOT NULL,
  updated REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  parent_id TEXT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_by_conversation ON messages(conversation_id, created);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT OR IGNORE INTO meta(key, value) VALUES ('schema', '1');
"""

SCHEMA_7_EXTRA = """
CREATE TABLE IF NOT EXISTS connectors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '',
  token TEXT NOT NULL DEFAULT '',
  command TEXT NOT NULL DEFAULT '',
  env TEXT NOT NULL DEFAULT '{}',
  enabled INTEGER NOT NULL DEFAULT 1,
  disabled_tools TEXT NOT NULL DEFAULT '[]',
  tools TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'new',
  error TEXT NOT NULL DEFAULT '',
  created REAL NOT NULL,
  updated REAL NOT NULL
);
ALTER TABLE messages ADD COLUMN meta TEXT;
ALTER TABLE conversations ADD COLUMN leaf_id TEXT;
UPDATE meta SET value = '7' WHERE key = 'schema';
"""

OPEN = """
import json, sys
from app.engine import store
from app.engine.cmd_message import messages_of
c = store.conn()
tables = sorted(r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type = 'table'"))
cols = {t: sorted(r[1] for r in c.execute(f"PRAGMA table_info({t})")) for t in ("conversations", "messages", "connectors")}
convs = {r["id"]: r["leaf_id"] for r in store.rows("SELECT id, leaf_id FROM conversations")}
paths = {cid: [m["content"][0]["text"] for m in messages_of(cid)] for cid in convs}
connectors = store.rows("SELECT name, tool_perms, headers, auth, transport FROM connectors")
print(json.dumps({"schema": store.row("SELECT value FROM meta WHERE key = 'schema'")["value"], "tables": tables, "cols": cols, "leafs": convs, "paths": paths, "connectors": connectors}))
"""


def _db(tmp_path, sql, rows=()):
    data = tmp_path / "data"
    data.mkdir()
    c = sqlite3.connect(data / "format.db")
    c.executescript(sql)
    for statement, args in rows:
        c.execute(statement, args)
    c.commit()
    c.close()
    return data


def _open(data):
    env = {k: v for k, v in os.environ.items() if not k.startswith("FORMAT_")} | {"FORMAT_DATA_DIR": str(data), "HOME": str(data.parent)}
    proc = subprocess.run([sys.executable, "-c", OPEN], capture_output=True, text=True, timeout=60, env=env, cwd=BACKEND)
    assert proc.returncode == 0, proc.stderr[-3000:]
    return json.loads(proc.stdout.strip().splitlines()[-1])


CURRENT_TABLES = ["artifact_versions", "artifacts", "connectors", "conversations", "messages", "meta", "project_files", "projects", "schedule_runs", "schedules", "shares"]


def _message(mid, cid, text, created, parent=None, with_meta=False):
    cols = "id, conversation_id, parent_id, role, content, created" + (", meta" if with_meta else "")
    marks = "?, ?, ?, ?, ?, ?" + (", ?" if with_meta else "")
    role = "user" if created % 2 else "assistant"
    args = (mid, cid, parent, role, json.dumps([{"type": "text", "text": text}]), created) + (("{}",) if with_meta else ())
    return f"INSERT INTO messages({cols}) VALUES ({marks})", args


@pytest.mark.parametrize("populated", [False, True])
def test_schema_1_opens_as_schema_8(tmp_path, populated):
    rows = []
    if populated:
        rows.append(("INSERT INTO conversations(id, title, created, updated) VALUES (?, ?, ?, ?)", ("c1", "Old chat", 1.0, 4.0)))
        rows += [_message(f"m{i}", "c1", f"line {i}", float(i)) for i in range(1, 5)]
    got = _open(_db(tmp_path, SCHEMA_1, rows))
    assert got["schema"] == "8"
    assert got["tables"] == CURRENT_TABLES
    assert {"meta", "parent_id"} <= set(got["cols"]["messages"])
    assert {"leaf_id", "allow_all", "connectors_off"} <= set(got["cols"]["conversations"])
    assert {"tool_perms", "headers", "auth", "oauth", "transport"} <= set(got["cols"]["connectors"])
    if populated:
        assert got["leafs"] == {"c1": "m4"}
        assert got["paths"] == {"c1": ["line 1", "line 2", "line 3", "line 4"]}
    else:
        assert got["leafs"] == {}


def test_schema_7_with_data_keeps_every_row(tmp_path):
    rows = [("INSERT INTO conversations(id, title, created, updated, leaf_id) VALUES (?, ?, ?, ?, ?)", ("c7", "Branched", 1.0, 3.0, "b2")),
            _message("a1", "c7", "first", 1.0, None, True), _message("a2", "c7", "reply", 2.0, "a1", True),
            ("INSERT INTO messages(id, conversation_id, parent_id, role, content, created, meta) VALUES (?, ?, ?, ?, ?, ?, ?)",
             ("b2", "c7", "a1", "assistant", json.dumps([{"type": "text", "text": "other reply"}]), 3.0, "{}")),
            ("INSERT INTO connectors(id, name, kind, url, created, updated) VALUES (?, ?, ?, ?, ?, ?)", ("k1", "docs", "remote", "https://example.com/mcp", 1.0, 1.0))]
    got = _open(_db(tmp_path, SCHEMA_1 + SCHEMA_7_EXTRA, rows))
    assert got["schema"] == "8"
    assert got["tables"] == CURRENT_TABLES
    assert got["leafs"] == {"c7": "b2"}
    assert got["paths"] == {"c7": ["first", "other reply"]}
    assert got["connectors"] == [{"name": "docs", "tool_perms": "{}", "headers": "{}", "auth": "none", "transport": "http"}]


def test_opening_a_current_database_again_changes_nothing(tmp_path):
    data = _db(tmp_path, SCHEMA_1)
    first = _open(data)
    second = _open(data)
    assert first == second
