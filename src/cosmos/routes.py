"""HTTP routes for Cosmos."""

from flask import Flask, jsonify, request

from .analysis import AnalysisError, AnalysisNotConfiguredError, analyze_entry
from .journal import (
    create_entry,
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
        """List saved journal entries."""
        return jsonify({"entries": list_entries()})

    @app.post("/api/entries")
    def api_create_entry():
        """Create a journal entry."""
        payload = _get_json_payload()
        content = str(payload.get("content", ""))
        title = str(payload.get("title", ""))

        entry = create_entry(title=title, content=content)
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
        if "title" not in payload and "content" not in payload:
            return jsonify({"error": "title or content is required"}), 400

        title = None
        if "title" in payload:
            title = str(payload.get("title", ""))

        content = None
        if "content" in payload:
            content = str(payload.get("content", ""))

        entry = update_entry(entry_id, title=title, content=content)
        if entry is None:
            return jsonify({"error": "entry not found"}), 404

        return jsonify({"entry": entry})

    @app.get("/api/entries/<int:entry_id>/insights")
    def api_get_entry_insights(entry_id: int):
        """Return the latest saved AI insights for one entry."""
        entry = get_entry(entry_id)
        if entry is None:
            return jsonify({"error": "entry not found"}), 404

        insights = get_latest_insights(entry_id)
        if insights is None:
            return jsonify({"entry_id": entry_id, "status": "not_analyzed", "insights": None})

        return jsonify({"entry_id": entry_id, "status": "available", "insights": insights})

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
        return jsonify({"entry_id": entry_id, "status": "available", "insights": saved}), 201


def _get_json_payload() -> dict:
    """Return the request JSON body or an empty object."""
    return request.get_json(silent=True) or {}
