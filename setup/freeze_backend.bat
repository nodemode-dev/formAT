@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0.."
set "ROOT=%cd%"
if not exist backend\venv\Scripts\activate.bat ( echo [format] engine venv missing, run .\format.bat install & exit /b 1 )
call backend\venv\Scripts\activate.bat
python -c "import PyInstaller" >nul 2>nul || ( echo [format] PyInstaller missing, run .\format.bat install-desktop & exit /b 1 )
if defined FORMAT_TARGET ( set "TRIPLE=%FORMAT_TARGET%" ) else ( for /f "tokens=2" %%t in ('rustc -vV ^| findstr /b "host:"') do set "TRIPLE=%%t" )
if not defined TRIPLE ( echo [format] rustc not found, install Rust or set FORMAT_TARGET & exit /b 1 )
if not exist frontend\dist\index.html call setup\build_frontend.bat
set "OPTIONAL="
python -c "import playwright" >nul 2>nul && set "OPTIONAL=!OPTIONAL! --collect-all playwright"
if "%LGPL_FFMPEG_PREFIX%"=="" set "LGPL_FFMPEG_PREFIX=%ROOT%\backend\.lgpl-ffmpeg"
set "PATH=%LGPL_FFMPEG_PREFIX%\bin;%PATH%"
python -c "import faster_whisper" >nul 2>nul && ( python "%ROOT%\setup\check_lgpl_av.py" "%LGPL_FFMPEG_PREFIX%" || ( echo [format] voice needs PyAV built against an LGPL FFmpeg, run setup\build_lgpl_av.bat & exit /b 1 ) )
python -c "import faster_whisper" >nul 2>nul && set "OPTIONAL=!OPTIONAL! --collect-all faster_whisper --collect-all ctranslate2 --collect-all onnxruntime --collect-all tokenizers"
python -c "import winpty" >nul 2>nul && set "OPTIONAL=!OPTIONAL! --collect-all winpty"
cd backend
if exist build\pyinstaller rmdir /s /q build\pyinstaller
if exist dist-engine rmdir /s /q dist-engine
python -m PyInstaller --noconfirm --clean --onefile --name format-engine --distpath dist-engine --workpath build\pyinstaller --specpath build\pyinstaller --paths "%ROOT%\backend" --add-data "%ROOT%\frontend\dist;frontend_dist" --add-data "%ROOT%\backend\app\demos;app\demos" --collect-submodules app --collect-submodules uvicorn --collect-submodules websockets --collect-submodules anthropic --collect-submodules mcp.server --collect-submodules mcp.client --collect-submodules mcp.shared --hidden-import mcp.types --exclude-module mcp.cli --collect-data certifi --collect-data docx --collect-data pptx --collect-submodules reportlab --collect-submodules openpyxl --hidden-import segno --hidden-import multipart --hidden-import python_multipart !OPTIONAL! --exclude-module tkinter "%ROOT%\backend\format_engine.py" || exit /b 1
set "FORMAT_DATA_DIR=%TEMP%\format-selfcheck"
dist-engine\format-engine.exe --selfcheck || ( echo [format] the frozen engine failed its selfcheck; nothing was copied to src-tauri\binaries & exit /b 1 )
if not exist "%ROOT%\src-tauri\binaries" mkdir "%ROOT%\src-tauri\binaries"
copy /y dist-engine\format-engine.exe "%ROOT%\src-tauri\binaries\format-engine-%TRIPLE%.exe" >nul || exit /b 1
echo [format] sidecar ready: src-tauri\binaries\format-engine-%TRIPLE%.exe
