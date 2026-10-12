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
            c.execute("CREATE INDEX IF NOT EXISTS messages_by_parent ON messages(conversation_id, parent_id)")
            c.execute("INSERT OR IGNORE INTO meta(key, value) VALUES ('schema', '5')")
            c.execute("UPDATE meta SET value = '5' WHERE key = 'schema'")
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
