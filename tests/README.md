# Cosmos

Cosmos is a terminal-friendly, agent-ready starter scaffold for an AI-assisted journaling and reflection app.

This scaffold is set up for ongoing collaboration with coding agents such as Codex and Claude. It is intentionally simple, clear, and easy to extend.

The current implementation is a Flask API with direct SQLite access through `sqlite3` and no ORM layer.

## Purpose

The project provides a clean starting point for building a journaling application that can later support features such as:
- journal entry creation and storage
- AI-generated summaries and insights
- mood or theme analysis
- simple web UI and API endpoints
- local development with SQLite

## Current backend features

- create, list, fetch, and update journal entries
- persist entries and AI insights in SQLite
- generate entry insights through the OpenAI Responses API once `OPENAI_API_KEY` is configured
- keep AI integration behind a small service boundary in `src/cosmos/analysis.py`

## Current frontend features

- React dashboard with a three-panel notes-style layout
- left sidebar for entry navigation and creation
- center editor with autosave and focus mode
- right insights panel for AI analysis status and results
- white-and-blue interface with responsive layout behavior

## Structure

```text
cosmos/
├── AGENTS.md
├── Makefile
├── README.md
├── .env.example
├── .gitignore
├── requirements.txt
├── run.py
├── docs/
├── scripts/
├── src/
│   └── cosmos/
│       ├── __init__.py
│       ├── analysis.py
│       ├── config.py
│       ├── db.py
│       ├── journal.py
│       └── routes.py
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── App.css
│       ├── api.js
│       ├── index.css
│       └── main.jsx
└── tests/
    └── test_app.py
```

## Setup

1. Create and activate a virtual environment.
2. Install dependencies.
3. Copy `.env.example` to `.env` and update values.
4. Run the development server.
5. Run the React frontend.

### Quick start

```bash
python3 -m venv .venv
source .venv/bin/activate
make install
cp .env.example .env
make dev
```

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

### Environment values

```bash
APP_NAME=Cosmos
SECRET_KEY=dev-secret
DATABASE_URL=sqlite:///cosmos.db
MODEL_NAME=gpt-5.2
OPENAI_API_KEY=
```

## Common commands

```bash
make install   # install dependencies
make dev       # run local dev server
make run       # same as dev for now
make test      # run tests
make frontend-install  # install frontend dependencies
make frontend-dev      # run the React dev server
make frontend-build    # build the React app
make lint      # placeholder lint command
make format    # placeholder format command
make clean     # remove cache files
```

## API surface

```text
GET    /health
GET    /api/entries
POST   /api/entries
GET    /api/entries/<id>
PATCH  /api/entries/<id>
GET    /api/entries/<id>/insights
POST   /api/entries/<id>/insights
```

`POST /api/entries/<id>/insights` will return `503 not_configured` until `OPENAI_API_KEY` is set.

The frontend development server proxies `/api` and `/health` to the Flask app at `http://127.0.0.1:5000`.

## Notes for future customization

- Expand the analysis prompts and insight rendering once the frontend is in place.
- Expand tests as features are added.
- Keep the repo structure predictable so agents can work safely in parallel.
