# Cosmos

A minimal journaling application. Write, save, and revisit your thoughts with a clean, distraction-free interface.

## Architecture

- **Backend**: Flask API + SQLite (Python)
- **Frontend**: React + Vite
- **Persistence**: SQLite database (`cosmos.db`)
- **No AI features**: Keep it simple and focused

## Quick Start

### 1. Backend

```bash
cd tests
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python run.py
```

Backend runs at `http://127.0.0.1:5000`.

### 2. Frontend

```bash
cd tests/frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` and proxies `/api` requests to the backend.

## Features

- Landing page with "Start Writing" button
- Two-panel layout: sidebar (notes) + editor
- Create, edit, and delete journal entries
- Auto-save as you type
- Timestamps on all entries
- Responsive design

## File Tree

```
tests/
├── run.py                      # Backend entry point
├── requirements.txt
├── Makefile
├── src/cosmos/
│   ├── __init__.py             # Flask app factory
│   ├── config.py               # Environment config
│   ├── db.py                   # SQLite setup
│   ├── journal.py              # Entry CRUD logic
│   ├── routes.py               # API endpoints
│   └── analysis.py             # OpenAI integration (optional)
├── frontend/
│   ├── package.json
│   ├── vite.config.js          # Proxy config to Flask
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx             # Main app component
│       ├── App.css
│       ├── index.css
│       └── api.js              # API client
└── test_app.py                 # Backend tests
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/entries` | List all entries |
| POST | `/api/entries` | Create entry |
| GET | `/api/entries/:id` | Get one entry |
| PATCH | `/api/entries/:id` | Update entry |
| DELETE | `/api/entries/:id` | Delete entry |
| GET | `/health` | Health check |
