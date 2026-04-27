"""Journal entry queries and persistence helpers."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from .db import get_db

PREVIEW_LENGTH = 140


def list_entries(category: str | None = None, tag: str | None = None) -> list[dict]:
    """Return journal entries ordered by recent activity, optionally filtered by category or tag."""
    params: list = []
    where_clauses: list[str] = []
    if category:
        where_clauses.append("category = ?")
        params.append(category)
    if tag:
        # Simple LIKE match against JSON array; adequate for small local DB
        where_clauses.append("tags_json LIKE ?")
        params.append(f'%"{tag}"%')

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
    rows = (
        get_db()
        .execute(
            f"""
            SELECT id, title, content, category, tags_json, created_at, updated_at
            FROM entries
            {where_sql}
            ORDER BY updated_at DESC, id DESC
            """,
                params,
        )
        .fetchall()
    )
    return [_serialize_entry(row, include_content=False) for row in rows]


def create_entry(title: str, content: str, category: str = "journal", tags: list[str] | None = None) -> dict:
    """Create a journal entry and return it."""
    cleaned_content = content.strip()
    cleaned_title = _normalize_title(title, cleaned_content)
    timestamp = _utc_now()
    valid_category = category if category in {"journal", "reflections", "universe", "archive"} else "journal"

    connection = get_db()
    tags_json = json.dumps([t.strip() for t in (tags or []) if t.strip()])
    cursor = connection.execute(
        """
        INSERT INTO entries (title, content, category, tags_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (cleaned_title, cleaned_content, valid_category, tags_json, timestamp, timestamp),
    )
    connection.commit()

    return get_entry(cursor.lastrowid)


def get_entry(entry_id: int) -> dict | None:
    """Return one journal entry or None."""
    row = (
        get_db()
        .execute(
            """
        SELECT id, title, content, category, tags_json, created_at, updated_at
        FROM entries
        WHERE id = ?
        """,
            (entry_id,),
        )
        .fetchone()
    )
    if row is None:
        return None

    return _serialize_entry(row, include_content=True)


def update_entry(
    entry_id: int,
    *,
    title: str | None = None,
    content: str | None = None,
    category: str | None = None,
    tags: list[str] | None = None,
) -> dict | None:
    """Update a journal entry and return the latest version."""
    existing = get_entry(entry_id)
    if existing is None:
        return None

    next_content = existing["content"] if content is None else content.strip()
    next_title = existing["title"]
    if title is not None:
        next_title = _normalize_title(title, next_content)

    if title is None and content is not None and not existing["title"].strip():
        next_title = _normalize_title("", next_content)

    next_category = existing["category"]
    if category is not None:
        next_category = category if category in {"journal", "reflections", "universe", "archive"} else existing["category"]

    next_tags_json = None
    if tags is not None:
        next_tags_json = json.dumps([t.strip() for t in tags if t.strip()])

    connection = get_db()
    if next_tags_json is None:
        connection.execute(
            """
            UPDATE entries
            SET title = ?, content = ?, category = ?, updated_at = ?
            WHERE id = ?
            """,
            (next_title, next_content, next_category, _utc_now(), entry_id),
        )
    else:
        connection.execute(
            """
            UPDATE entries
            SET title = ?, content = ?, category = ?, tags_json = ?, updated_at = ?
            WHERE id = ?
            """,
            (next_title, next_content, next_category, next_tags_json, _utc_now(), entry_id),
        )
    connection.commit()

    return get_entry(entry_id)


def delete_entry(entry_id: int) -> bool:
    """Delete a journal entry and return True if it existed."""
    connection = get_db()
    cursor = connection.execute("DELETE FROM entries WHERE id = ?", (entry_id,))
    connection.commit()
    return cursor.rowcount > 0


def get_latest_insights(entry_id: int) -> dict | None:
    """Return the latest saved AI insights for an entry."""
    row = (
        get_db()
        .execute(
            """
        SELECT
            id,
            entry_id,
            model_name,
            sentiment,
            mood,
            themes_json,
            routines_json,
            activities_json,
            summary,
            confidence,
            created_at
        FROM entry_insights
        WHERE entry_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT 1
        """,
            (entry_id,),
        )
        .fetchone()
    )
    if row is None:
        return None

    return {
        "id": row["id"],
        "entry_id": row["entry_id"],
        "model_name": row["model_name"],
        "sentiment": row["sentiment"],
        "mood": row["mood"],
        "themes": json.loads(row["themes_json"]),
        "routines": json.loads(row["routines_json"]),
        "activities": json.loads(row["activities_json"]),
        "summary": row["summary"],
        "confidence": row["confidence"],
        "created_at": row["created_at"],
    }


def save_insights(
    entry_id: int,
    *,
    model_name: str,
    insights: dict,
    raw_response: dict,
) -> dict:
    """Persist AI insights for an entry and return the saved record."""
    timestamp = _utc_now()
    connection = get_db()
    cursor = connection.execute(
        """
        INSERT INTO entry_insights (
            entry_id,
            model_name,
            sentiment,
            mood,
            themes_json,
            routines_json,
            activities_json,
            summary,
            confidence,
            raw_response_json,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            entry_id,
            model_name,
            insights["sentiment"],
            insights["mood"],
            json.dumps(insights["themes"]),
            json.dumps(insights["routines"]),
            json.dumps(insights["activities"]),
            insights["summary"],
            insights["confidence"],
            json.dumps(raw_response),
            timestamp,
        ),
    )
    connection.commit()

    row = connection.execute(
        """
        SELECT
            id,
            entry_id,
            model_name,
            sentiment,
            mood,
            themes_json,
            routines_json,
            activities_json,
            summary,
            confidence,
            created_at
        FROM entry_insights
        WHERE id = ?
        """,
        (cursor.lastrowid,),
    ).fetchone()

    return {
        "id": row["id"],
        "entry_id": row["entry_id"],
        "model_name": row["model_name"],
        "sentiment": row["sentiment"],
        "mood": row["mood"],
        "themes": json.loads(row["themes_json"]),
        "routines": json.loads(row["routines_json"]),
        "activities": json.loads(row["activities_json"]),
        "summary": row["summary"],
        "confidence": row["confidence"],
        "created_at": row["created_at"],
    }


def _serialize_entry(row, *, include_content: bool) -> dict:
    """Convert a SQLite row into the API shape."""
    entry = {
        "id": row["id"],
        "title": row["title"],
        "category": "journal",
        "preview": _build_preview(row["content"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }
    if len(row) > 3:
        try:
            entry["category"] = row["category"]
        except Exception:
            entry["category"] = "journal"
    if include_content:
        entry["content"] = row["content"]
    # tags if selected column exists
    try:
        if row["tags_json"] is not None:
            entry["tags"] = json.loads(row["tags_json"]) or []
    except Exception:
        pass
    return entry


def _normalize_title(title: str, content: str) -> str:
    """Use the provided title or derive one from the entry text."""
    cleaned_title = title.strip()
    if cleaned_title:
        return cleaned_title

    for line in content.splitlines():
        candidate = line.strip()
        if candidate:
            return candidate[:80]

    return "Untitled Entry"


def _build_preview(content: str) -> str:
    """Create a compact preview for sidebar lists."""
    collapsed = " ".join(content.split())
    return collapsed[:PREVIEW_LENGTH]


def _utc_now() -> str:
    """Return an ISO-8601 UTC timestamp."""
    return datetime.now(timezone.utc).isoformat()
