@echo off
setlocal
cd /d "%~dp0.."
set "FAIL=0"
echo [format] doctor - windows
set "NODEV="
for /f "delims=" %%v in ('node -v 2^>nul') do set "NODEV=%%v"
node -e "const [m,n]=process.versions.node.split('.').map(Number);process.exit((m===20&&n>=19)||(m===22&&n>=12)||m>=23?0:1)" >nul 2>nul && ( call :ok "node %NODEV%" ) || ( call :bad "node" "Node 20.19+ or 22.12+ is required" )
where npm >nul 2>nul && ( call :ok "npm" ) || ( call :bad "npm" "install npm" )
set "PYV="
for /f "tokens=2" %%v in ('python -V 2^>^&1') do set "PYV=%%v"
python -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 12) else 1)" >nul 2>nul && ( call :ok "python %PYV%" ) || ( call :bad "python" "Python 3.12+ is required" )
if exist backend\venv\Scripts\python.exe ( call :ok "engine venv" ) else ( call :warn "engine venv" "run .\format.bat install" )
if exist frontend\node_modules\ ( call :ok "frontend node_modules" ) else ( call :warn "frontend deps" "run .\format.bat install" )
findstr /r /b /c:"ANTHROPIC_API_KEY=." backend\.env >nul 2>nul && ( call :ok "Anthropic API key in backend\.env" ) || ( call :warn "Anthropic API key" "copy backend\.env.example to backend\.env and set ANTHROPIC_API_KEY (chat needs it from v0.3.0)" )
where git >nul 2>nul && ( call :ok "git" ) || ( call :warn "git" "repositories cannot be cloned without git" )
where ffmpeg >nul 2>nul && ( call :ok "ffmpeg for video and audio" ) || ( call :warn "ffmpeg" "video frames and audio need ffmpeg on the PATH" )
set "RUSTV="
for /f "tokens=2" %%v in ('rustc --version 2^>nul') do set "RUSTV=%%v"
where cargo >nul 2>nul && ( call :ok "rust %RUSTV% for the native crate" ) || ( call :warn "rust" "the native crate needs https://rustup.rs" )
set "EPORT=%FORMAT_PORT%"
if "%EPORT%"=="" set "EPORT=8490"
call :port 5490
call :port %EPORT%
if "%FAIL%"=="0" ( echo [format] ready ) else ( echo [format] fix the FAIL lines above )
exit /b %FAIL%

:ok
echo   ok     %~1
exit /b 0

:bad
echo   FAIL   %~1 - %~2
set "FAIL=1"
exit /b 0

:warn
echo   warn   %~1 - %~2
exit /b 0

:port
powershell -NoProfile -Command "$c = New-Object Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1', %~1); exit 0 } catch { exit 1 }" >nul 2>nul
if errorlevel 1 ( call :ok "port %~1 free" ) else ( call :warn "port %~1" "already in use" )
exit /b 0
