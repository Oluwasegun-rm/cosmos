"""SQLite helpers for Cosmos."""

from __future__ import annotations

import sqlite3
from pathlib import Path

from flask import Flask, current_app, g

SCHEMA = """
CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS entry_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL,
    model_name TEXT NOT NULL,
    sentiment TEXT NOT NULL,
    mood TEXT NOT NULL,
    themes_json TEXT NOT NULL,
    routines_json TEXT NOT NULL,
    activities_json TEXT NOT NULL,
    summary TEXT NOT NULL,
    confidence REAL NOT NULL,
    raw_response_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_entries_updated_at ON entries(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_entry_insights_entry_id
    ON entry_insights(entry_id, created_at DESC);
"""


def init_app(app: Flask) -> None:
    """Register database lifecycle hooks and ensure the schema exists."""
    app.teardown_appcontext(close_db)

    with app.app_context():
        init_db()


def get_db() -> sqlite3.Connection:
    """Return the current request's SQLite connection."""
    if "db" not in g:
        database_path = _resolve_database_path(current_app.config["DATABASE_URL"])
        connection = sqlite3.connect(database_path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        g.db = connection

    return g.db


def close_db(_error: BaseException | None = None) -> None:
    """Close the current request's SQLite connection."""
    connection = g.pop("db", None)
    if connection is not None:
        connection.close()


def init_db() -> None:
    """Create database tables if they do not already exist."""
    connection = get_db()
    connection.executescript(SCHEMA)
    connection.commit()


def _resolve_database_path(database_url: str) -> str:
    """Translate the configured SQLite URL into a filesystem path."""
    if database_url in {":memory:", "sqlite:///:memory:"}:
        return ":memory:"

    if database_url.startswith("sqlite:///"):
        raw_path = database_url.removeprefix("sqlite:///")
    elif "://" not in database_url:
        raw_path = database_url
    else:
        raise ValueError(
            "Cosmos currently supports SQLite only. "
            f"Expected a sqlite:/// URL or plain path, received {database_url!r}."
        )

    path = Path(raw_path).expanduser()
    path.parent.mkdir(parents=True, exist_ok=True)
    return str(path)
