@echo off
setlocal
cd /d "%~dp0"
set "CMD=%~1"
if "%CMD%"=="" set "CMD=boot"
if not "%~1"=="" shift
if /i "%CMD%"=="boot" goto boot
if /i "%CMD%"=="dev" goto boot
if /i "%CMD%"=="install" ( call setup\install_all.bat & goto :eof )
if /i "%CMD%"=="backend" ( call backend\boot_backend.bat & goto :eof )
if /i "%CMD%"=="frontend" ( call frontend\boot_frontend.bat & goto :eof )
if /i "%CMD%"=="cli" goto cli
if /i "%CMD%"=="mcp" goto mcp
if /i "%CMD%"=="native" goto native
if /i "%CMD%"=="agents" goto agents
echo usage: .\format.bat [boot^|install^|backend^|frontend^|cli ^<command^>^|mcp^|native [build^|info^|window]^|agents [sync^|install [--user]]]
echo Always run it as .\format.bat from this folder: plain "format" elsewhere is Windows' disk formatter.
exit /b 2
:boot
start "format engine" cmd /c backend\boot_backend.bat
call frontend\boot_frontend.bat
goto :eof
:cli
set "PY=python"
if exist backend\venv\Scripts\python.exe set "PY=backend\venv\Scripts\python.exe"
"%PY%" setup\cli.py %1 %2 %3 %4 %5 %6 %7 %8 %9
goto :eof
:mcp
if not exist backend\venv\Scripts\python.exe ( echo [format] run .\format.bat install first & exit /b 1 )
cd backend
venv\Scripts\python.exe -m app.mcp_stdio
goto :eof
:agents
if not exist backend\venv\Scripts\python.exe ( echo [format] run .\format.bat install first & exit /b 1 )
backend\venv\Scripts\python.exe setup\agents.py %1 %2
goto :eof
:native
where cargo >nul 2>nul || ( echo [format] the native renderer needs Rust ^(rustup.rs^) & exit /b 1 )
cd native\format-render
set "SUB=%~1"
if "%SUB%"=="" set "SUB=build"
if /i "%SUB%"=="build" ( cargo build --release & goto :eof )
if /i "%SUB%"=="info" ( cargo build --release -q && target\release\format-render.exe info & goto :eof )
if /i "%SUB%"=="window" ( cargo run --release -q --features window --example window & goto :eof )
echo usage: .\format.bat native [build^|info^|window]
exit /b 2
