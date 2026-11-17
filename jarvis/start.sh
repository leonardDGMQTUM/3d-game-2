#!/usr/bin/env bash
# macOS / Linux: sets everything up on first run, then starts Jarvis.
set -e
cd "$(dirname "$0")"
if [ ! -d .venv ]; then
  echo "First run: installing Jarvis (takes a minute)..."
  python3 -m venv .venv
  .venv/bin/pip install --upgrade pip -q
  .venv/bin/pip install -r requirements.txt
fi
[ -f config.json ] || cp config.example.json config.json
exec .venv/bin/python jarvis.py "$@"
