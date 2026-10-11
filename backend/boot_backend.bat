@echo off
setlocal
cd /d "%~dp0"
if not exist venv\Scripts\activate.bat ( echo [format] engine venv missing, run .\format.bat install & exit /b 1 )
call venv\Scripts\activate.bat
if "%FORMAT_PORT%"=="" set "FORMAT_PORT=8490"
uvicorn app.main:app --reload --reload-dir app --host 127.0.0.1 --port %FORMAT_PORT%
