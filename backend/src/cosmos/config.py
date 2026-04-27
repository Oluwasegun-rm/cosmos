"""Configuration for Cosmos."""

import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration loaded from environment variables."""

    APP_NAME = os.getenv("APP_NAME", "Cosmos")
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///cosmos.db")
    MODEL_NAME = os.getenv("MODEL_NAME", "gpt-5.2")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    PERMANENT_SESSION_LIFETIME = 60 * 60 * 24 * 7  # 7 days
