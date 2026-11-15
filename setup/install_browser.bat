@echo off
setlocal
cd /d "%~dp0..\backend"
if not exist venv\Scripts\python.exe ( echo [format] engine venv missing, run .\format.bat install & exit /b 1 )
echo [format] installing the built-in browser (Playwright and its Chromium)
venv\Scripts\python.exe -m pip install -r requirements_browser.txt || exit /b 1
venv\Scripts\python.exe -m playwright install chromium || exit /b 1
echo [format] done. Restart the engine; Claude can then use the browser and you can watch it in the Browser pane
