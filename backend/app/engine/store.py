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
            c.execute("INSERT OR IGNORE INTO meta(key, value) VALUES ('schema', '2')")
            c.execute("UPDATE meta SET value = '2' WHERE key = 'schema'")
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
