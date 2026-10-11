@echo off
setlocal
cd /d "%~dp0"
if not exist venv ( python -m venv venv || exit /b 1 )
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt || exit /b 1
if not exist .env copy .env.example .env >nul
