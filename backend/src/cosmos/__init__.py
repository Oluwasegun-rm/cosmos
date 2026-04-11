"""Application factory for Cosmos."""

from flask import Flask

from .config import Config
from .db import init_app as init_db_app
from .routes import register_routes


def create_app(test_config: dict | None = None) -> Flask:
    """Create and configure the Flask application."""
    app = Flask(__name__)
    app.config.from_object(Config)
    if test_config:
        app.config.update(test_config)

    # Initialize database state before routes start handling requests.
    init_db_app(app)
    register_routes(app)

    return app
