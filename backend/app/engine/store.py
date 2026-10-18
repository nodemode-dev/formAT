import sqlite3
import threading
import time
import uuid
from pathlib import Path

from app.core import config

SCHEMA = """
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
  created REAL NOT NULL,
  meta TEXT
);
CREATE INDEX IF NOT EXISTS messages_by_conversation ON messages(conversation_id, created);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'html',
  created REAL NOT NULL,
  updated REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS artifact_versions (
  artifact_id TEXT NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  message_id TEXT,
  content TEXT NOT NULL,
  created REAL NOT NULL,
  PRIMARY KEY (artifact_id, version)
);
CREATE INDEX IF NOT EXISTS artifacts_by_conversation ON artifacts(conversation_id, updated);
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  instructions TEXT NOT NULL DEFAULT '',
  created REAL NOT NULL,
  updated REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS project_files (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  upload_id TEXT NOT NULL,
  added REAL NOT NULL,
  PRIMARY KEY (project_id, upload_id)
);
CREATE INDEX IF NOT EXISTS conversations_by_project ON conversations(project_id, updated);
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
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  cadence TEXT NOT NULL,
  at TEXT NOT NULL DEFAULT '09:00',
  weekday INTEGER NOT NULL DEFAULT 0,
  run_at REAL,
  project_id TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  next_run REAL,
  last_run REAL,
  created REAL NOT NULL,
  updated REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS schedule_runs (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  conversation_id TEXT,
  trigger TEXT NOT NULL,
  started REAL NOT NULL,
  error TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS runs_by_schedule ON schedule_runs(schedule_id, started);
CREATE TABLE IF NOT EXISTS shares (
  token TEXT PRIMARY KEY,
  artifact_id TEXT NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  version INTEGER,
  created REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS shares_by_artifact ON shares(artifact_id);
"""

_lock = threading.RLock()
_conn: sqlite3.Connection | None = None


def path() -> Path:
    return config.data_dir() / "format.db"


def conn() -> sqlite3.Connection:
    global _conn
    with _lock:
        if _conn is None:
            c = sqlite3.connect(path(), check_same_thread=False, isolation_level=None)
            c.row_factory = sqlite3.Row
            c.execute("PRAGMA journal_mode=WAL")
            c.execute("PRAGMA foreign_keys=ON")
            c.executescript(SCHEMA)
            if "meta" not in {r[1] for r in c.execute("PRAGMA table_info(messages)").fetchall()}:
                c.execute("ALTER TABLE messages ADD COLUMN meta TEXT")
            if "leaf_id" not in {r[1] for r in c.execute("PRAGMA table_info(conversations)").fetchall()}:
                c.execute("ALTER TABLE conversations ADD COLUMN leaf_id TEXT")
                for (cid,) in c.execute("SELECT id FROM conversations").fetchall():
                    prev = None
                    for (mid, parent) in c.execute("SELECT id, parent_id FROM messages WHERE conversation_id = ? ORDER BY created", (cid,)).fetchall():
                        if parent is None and prev is not None:
                            c.execute("UPDATE messages SET parent_id = ? WHERE id = ?", (prev, mid))
                        prev = mid
                    c.execute("UPDATE conversations SET leaf_id = ? WHERE id = ?", (prev, cid))
            have = {r[1] for r in c.execute("PRAGMA table_info(connectors)").fetchall()}
            if "tool_perms" not in have:
                c.execute("ALTER TABLE connectors ADD COLUMN tool_perms TEXT NOT NULL DEFAULT '{}'")
            if "headers" not in have:
                c.execute("ALTER TABLE connectors ADD COLUMN headers TEXT NOT NULL DEFAULT '{}'")
            if "auth" not in have:
                c.execute("ALTER TABLE connectors ADD COLUMN auth TEXT NOT NULL DEFAULT 'none'")
                c.execute("ALTER TABLE connectors ADD COLUMN oauth TEXT NOT NULL DEFAULT '{}'")
                c.execute("ALTER TABLE connectors ADD COLUMN transport TEXT NOT NULL DEFAULT 'http'")
            conv_cols = {r[1] for r in c.execute("PRAGMA table_info(conversations)").fetchall()}
            if "allow_all" not in conv_cols:
                c.execute("ALTER TABLE conversations ADD COLUMN allow_all INTEGER NOT NULL DEFAULT 0")
            if "connectors_off" not in conv_cols:
                c.execute("ALTER TABLE conversations ADD COLUMN connectors_off TEXT NOT NULL DEFAULT '[]'")
            c.execute("CREATE INDEX IF NOT EXISTS messages_by_parent ON messages(conversation_id, parent_id)")
            c.execute("INSERT OR IGNORE INTO meta(key, value) VALUES ('schema', '8')")
            c.execute("UPDATE meta SET value = '8' WHERE key = 'schema'")
            _conn = c
        return _conn


def new_id() -> str:
    return uuid.uuid4().hex


def now() -> float:
    return time.time()


def rows(sql: str, args: tuple = ()) -> list[dict]:
    with _lock:
        return [dict(r) for r in conn().execute(sql, args).fetchall()]


def row(sql: str, args: tuple = ()) -> dict | None:
    found = rows(sql, args)
    return found[0] if found else None


def run(sql: str, args: tuple = ()) -> int:
    with _lock:
        return conn().execute(sql, args).rowcount
