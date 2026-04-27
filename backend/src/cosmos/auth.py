"""User authentication functions."""

from datetime import datetime, timezone
from typing import Any

import bcrypt
from flask_login import UserMixin


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against a bcrypt hash."""
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_user(email: str, password: str, display_name: str) -> dict[str, Any]:
    """Create a new user."""
    from .db import get_db

    db = get_db()
    password_hash = hash_password(password)
    now = datetime.now(timezone.utc).isoformat()

    cursor = db.execute(
        """INSERT INTO users (email, password_hash, display_name, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)""",
        (email, password_hash, display_name, now, now),
    )
    db.commit()

    return get_user(cursor.lastrowid)


def get_user(user_id: int) -> dict[str, Any] | None:
    """Fetch a user by ID."""
    from .db import get_db

    db = get_db()
    row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if row is None:
        return None
    return dict(row)


def get_user_by_email(email: str) -> dict[str, Any] | None:
    """Fetch a user by email."""
    from .db import get_db

    db = get_db()
    row = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if row is None:
        return None
    return dict(row)


def authenticate_user(email: str, password: str) -> dict[str, Any] | None:
    """Authenticate a user by email and password."""
    user = get_user_by_email(email)
    if user is None:
        return None
    if not verify_password(password, user["password_hash"]):
        return None
    return user


class User(UserMixin):
    """Flask-Login user wrapper."""

    def __init__(self, user_id: int):
        self.id = user_id
        self._data = get_user(user_id)

    @property
    def display_name(self) -> str:
        return self._data["display_name"] if self._data else ""

    @property
    def email(self) -> str:
        return self._data["email"] if self._data else ""

    def get_id(self) -> int:
        return self.id