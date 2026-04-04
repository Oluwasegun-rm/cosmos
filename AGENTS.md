# AGENTS.md

## Project purpose

Cosmos is an AI-assisted journaling application scaffold. The long-term goal is to support journal entry capture, storage, reflection, and optional AI-generated insights.

## Current status

This repository is an initial scaffold only. It contains a minimal Flask application, basic project structure, environment placeholders, a Makefile, and starter tests.

## Architecture overview

- `run.py` is the local entry point.
- `src/cosmos/__init__.py` creates the Flask app.
- `src/cosmos/routes.py` contains HTTP routes.
- `src/cosmos/config.py` centralizes environment-based config.
- `tests/` contains automated tests.
- `docs/` stores planning notes and design decisions.
- `scripts/` stores helper shell scripts.

## Folder responsibilities

- `src/`: application source code only
- `tests/`: automated tests only
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

- Application code in `src/`
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
