# Cosmos Notes

## Initial direction

This project starts as a lightweight AI journaling scaffold.

## Likely next features

- create journal entries
- store entries in SQLite
- add retrieval and listing views or API endpoints
- add AI summary and reflection helpers
- add authentication only if needed later

## Implemented backend slice

- direct SQLite persistence through `sqlite3`
- journal entry API endpoints for list, create, fetch, and update
- OpenAI analysis service boundary targeting the Responses API with `gpt-5.2`
- persisted AI insight records in a separate `entry_insights` table

## Near-term next step

- scaffold the React notes-style dashboard against the current API contract

## Frontend direction

- React dashboard scaffolded with Vite
- three-panel layout: note list, editor, insights
- entry editing uses autosave against the Flask API
- focus mode collapses the left note list

## Agent workflow reminder

When extending the project, prefer small steps and keep documentation current.
