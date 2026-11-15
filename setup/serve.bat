@echo off
setlocal
cd /d "%~dp0.."
if not exist frontend\dist\index.html ( echo [format] error: no frontend build, run .\format.bat build & exit /b 1 )
cd backend
if not exist venv\Scripts\python.exe ( echo [format] engine venv missing, run .\format.bat install & exit /b 1 )
if "%FORMAT_PORT%"=="" set "FORMAT_PORT=8490"
set "FORMAT_SERVE_DIST=1"
venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port %FORMAT_PORT%
