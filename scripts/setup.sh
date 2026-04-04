#!/usr/bin/env bash
set -e

python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt

if [ -d frontend ]; then
  (cd frontend && npm install)
fi

if [ ! -f .env ]; then
  cp .env.example .env
fi

echo "Cosmos setup complete. Activate with: source .venv/bin/activate"
