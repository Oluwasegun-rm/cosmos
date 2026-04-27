"""HTTP routes for Cosmos."""

from flask import Flask, jsonify, request
from flask_login import current_user, login_user, logout_user

from .analysis import AnalysisError, AnalysisNotConfiguredError, analyze_entry
from .auth import User, authenticate_user, create_user, get_user, get_user_by_email
from .journal import (
    create_entry,
    delete_entry,
    get_entry,
    get_latest_insights,
    list_entries,
    save_insights,
    update_entry,
)


def register_routes(app: Flask) -> None:
    """Attach application routes."""

    @app.get("/")
    def home():
        """Simple health route for local verification."""
        return jsonify(
            {
                "project": app.config["APP_NAME"],
                "status": "ok",
                "message": "Cosmos scaffold is running.",
            }
        )

    @app.get("/health")
    def health():
        """Basic health check route."""
        return jsonify({"status": "healthy"})

    @app.get("/api/entries")
    def api_list_entries():
        """List saved journal entries, optionally filtered by category."""
        category = request.args.get("category")
        return jsonify({"entries": list_entries(category)})

    @app.post("/api/entries")
    def api_create_entry():
        """Create a journal entry."""
        payload = _get_json_payload()
        content = str(payload.get("content", ""))
        title = str(payload.get("title", ""))
        category = str(payload.get("category", "journal"))

        entry = create_entry(title=title, content=content, category=category)
        return jsonify({"entry": entry}), 201

    @app.get("/api/entries/<int:entry_id>")
    def api_get_entry(entry_id: int):
        """Fetch one journal entry."""
        entry = get_entry(entry_id)
        if entry is None:
            return jsonify({"error": "entry not found"}), 404

        return jsonify({"entry": entry})

    @app.patch("/api/entries/<int:entry_id>")
    def api_update_entry(entry_id: int):
        """Update a journal entry."""
        payload = _get_json_payload()
        if "title" not in payload and "content" not in payload and "category" not in payload:
            return jsonify({"error": "title, content, or category is required"}), 400

        title = None
        if "title" in payload:
            title = str(payload.get("title", ""))

        content = None
        if "content" in payload:
            content = str(payload.get("content", ""))

        category = None
        if "category" in payload:
            category = str(payload.get("category", ""))

        entry = update_entry(entry_id, title=title, content=content, category=category)
        if entry is None:
            return jsonify({"error": "entry not found"}), 404

        return jsonify({"entry": entry})

    @app.delete("/api/entries/<int:entry_id>")
    def api_delete_entry(entry_id: int):
        """Delete a journal entry."""
        deleted = delete_entry(entry_id)
        if not deleted:
            return jsonify({"error": "entry not found"}), 404
        return jsonify({"deleted": True, "id": entry_id})

    @app.get("/api/entries/<int:entry_id>/insights")
    def api_get_entry_insights(entry_id: int):
        """Return the latest saved AI insights for one entry."""
        entry = get_entry(entry_id)
        if entry is None:
            return jsonify({"error": "entry not found"}), 404

        insights = get_latest_insights(entry_id)
        if insights is None:
            return jsonify(
                {"entry_id": entry_id, "status": "not_analyzed", "insights": None}
            )

        return jsonify(
            {"entry_id": entry_id, "status": "available", "insights": insights}
        )

    @app.post("/api/entries/<int:entry_id>/insights")
    def api_generate_entry_insights(entry_id: int):
        """Generate and persist AI insights for one entry."""
        entry = get_entry(entry_id)
        if entry is None:
            return jsonify({"error": "entry not found"}), 404

        try:
            insights, raw_response = analyze_entry(
                content=entry["content"],
                model_name=app.config["MODEL_NAME"],
                api_key=app.config["OPENAI_API_KEY"],
            )
        except AnalysisNotConfiguredError as exc:
            return (
                jsonify(
                    {
                        "entry_id": entry_id,
                        "status": "not_configured",
                        "message": str(exc),
                    }
                ),
                503,
            )
        except AnalysisError as exc:
            return (
                jsonify(
                    {
                        "entry_id": entry_id,
                        "status": "analysis_failed",
                        "message": str(exc),
                    }
                ),
                502,
            )

        saved = save_insights(
            entry_id,
            model_name=app.config["MODEL_NAME"],
            insights=insights,
            raw_response=raw_response,
        )
        return jsonify(
            {"entry_id": entry_id, "status": "available", "insights": saved}
        ), 201

    @app.post("/api/auth/signup")
    def api_signup():
        """Create a new user account."""
        payload = _get_json_payload()
        email = payload.get("email", "").strip().lower()
        password = payload.get("password", "")
        display_name = payload.get("display_name", "").strip()

        if not email or not password or not display_name:
            return jsonify({"error": "email, password, and display_name are required"}), 400

        if len(password) < 6:
            return jsonify({"error": "password must be at least 6 characters"}), 400

        if get_user_by_email(email) is not None:
            return jsonify({"error": "email already registered"}), 409

        try:
            user = create_user(email, password, display_name)
            del user["password_hash"]
            return jsonify({"user": user}), 201
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500

    @app.post("/api/auth/login")
    def api_login():
        """Authenticate and log in a user."""
        payload = _get_json_payload()
        email = payload.get("email", "").strip().lower()
        password = payload.get("password", "")

        if not email or not password:
            return jsonify({"error": "email and password are required"}), 400

        user = authenticate_user(email, password)
        if user is None:
            return jsonify({"error": "invalid email or password"}), 401

        login_user(User(user["id"]))
        del user["password_hash"]
        return jsonify({"user": user})

    @app.post("/api/auth/logout")
    def api_logout():
        """Log out the current user."""
        logout_user()
        return jsonify({"success": True})

    @app.get("/api/auth/me")
    def api_current_user():
        """Get the currently logged in user."""
        if not current_user.is_authenticated:
            return jsonify({"user": None})

        user = get_user(current_user.id)
        if user is None:
            return jsonify({"user": None})

        del user["password_hash"]
        return jsonify({"user": user})


def _get_json_payload() -> dict:
    """Return the request JSON body or an empty object."""
    return request.get_json(silent=True) or {}
