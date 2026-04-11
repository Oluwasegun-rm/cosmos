"""Local entry point for Cosmos."""

from src.cosmos import create_app

app = create_app()

if __name__ == "__main__":
    # Debug is enabled through Flask environment settings during development.
    app.run(host="127.0.0.1", port=5000)
