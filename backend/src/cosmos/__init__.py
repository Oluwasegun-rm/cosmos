"""Application factory for Cosmos."""

from flask import Flask
from flask_cors import CORS
from flask_login import LoginManager

from .auth import User
from .config import Config
from .db import init_app as init_db_app
from .routes import register_routes


def create_app(test_config: dict | None = None) -> Flask:
    """Create and configure the Flask application."""
    app = Flask(__name__)
    app.config.from_object(Config)
    if test_config:
        app.config.update(test_config)

    CORS(app, supports_credentials=True)

    # Initialize Flask-Login
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = None
    login_manager.user_loader(lambda user_id: User(user_id))

    # Initialize database state before routes start handling requests.
    init_db_app(app)
    register_routes(app)

    return app
