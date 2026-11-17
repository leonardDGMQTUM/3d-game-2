@echo off
rem Windows: sets everything up on first run, then starts Jarvis.
cd /d "%~dp0"
if not exist .venv (
  echo First run: installing Jarvis ^(takes a minute^)...
  py -3 -m venv .venv || python -m venv .venv
  .venv\Scripts\python -m pip install --upgrade pip -q
  .venv\Scripts\pip install -r requirements.txt
)
if not exist config.json copy config.example.json config.json >nul
.venv\Scripts\python jarvis.py %*
