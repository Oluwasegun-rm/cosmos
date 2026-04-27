# AGENTS.md

## Project purpose

Cosmos is an AI-assisted journaling application scaffold. The long-term goal is to support journal entry capture, storage, reflection, and optional AI-generated insights.

## Current status

This repository now includes:
- A Flask backend with SQLite database
- A React frontend with Material Design 3 styling
- User authentication (signup, login, logout)
- Journal entry CRUD with categories (Journal, Reflections, Universe, Archive)
- Light/dark theme toggle
- AI insights generation (requires OpenAI API key)

## Architecture overview

- `backend/run.py` is the local entry point.
- `backend/src/cosmos/__init__.py` creates the Flask app.
- `backend/src/cosmos/routes.py` contains HTTP routes.
- `backend/src/cosmos/config.py` centralizes environment-based config.
- `backend/src/cosmos/db.py` handles SQLite database operations.
- `backend/src/cosmos/auth.py` handles user authentication.
- `backend/src/cosmos/journal.py` handles journal entry persistence.
- `backend/src/cosmos/analysis.py` handles AI insights.
- `frontend/` contains the React frontend.
- `docs/` stores planning notes and design decisions.
- `scripts/` stores helper shell scripts.

## Database schema

- `entries` table: id, title, content, category, created_at, updated_at
- `users` table: id, email, password_hash, display_name, created_at, updated_at
- `entry_insights` table: AI analysis results linked to entries

## API endpoints

### Auth
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Authenticate user
- `POST /api/auth/logout` - Log out current user
- `GET /api/auth/me` - Get current user

### Entries
- `GET /api/entries` - List entries (optional ?category=filter)
- `POST /api/entries` - Create entry
- `GET /api/entries/<id>` - Get entry
- `PATCH /api/entries/<id>` - Update entry
- `DELETE /api/entries/<id>` - Delete entry

### Insights
- `GET /api/entries/<id>/insights` - Get saved insights
- `POST /api/entries/<id>/insights` - Generate new insights

## Folder responsibilities

- `backend/`: Flask application source code
- `frontend/`: React frontend application
- `docs/`: planning, notes, architecture decisions, feature ideas
- `scripts/`: setup and developer helper scripts

## Coding rules and conventions

- Prefer simple, readable code over clever code.
- Add comments where logic may not be obvious.
- Keep functions small and purposeful.
- Use environment variables for secrets and configuration.
- Do not hardcode credentials or API keys.
- Keep imports organized and file responsibilities clear.
- Update README or docs when structure or setup changes.

## How agents should operate

- Read this file and `README.md` before making changes.
- Make the smallest useful change that moves the project forward.
- Preserve the repo structure unless there is a strong reason to change it.
- When adding features, prefer incremental changes over large rewrites.
- Add or update tests whenever behavior changes.
- Record notable decisions in `docs/` when useful.

## What can be modified

- Application code in `backend/src/`
- Tests in `tests/`
- Setup scripts in `scripts/`
- Documentation in `docs/`, `README.md`, and this file when needed

## What should not be changed without explicit instruction

- Core project identity and purpose
- High-level folder structure without clear justification
- Tooling choices in ways that create unnecessary complexity
- Existing environment variable names unless coordinated across the repo

## Implementation priorities

1. Keep the app runnable locally
2. Add journal entry creation and persistence
3. Add entry listing and detail views or endpoints
4. Add AI insight generation behind a clean interface
5. Improve tests and documentation as features grow

## Assumptions policy

- If requirements are missing, choose the simplest reasonable option.
- Use placeholders instead of inventing complex product behavior.
- If changing architecture significantly, document the reason first in `docs/`.
