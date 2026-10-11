@echo off
setlocal
cd /d "%~dp0\.."
echo [format] installing the engine
call backend\oc_install.bat || exit /b 1
echo [format] installing the frontend
call frontend\oc_install.bat || exit /b 1
echo [format] done. Boot with .\format.bat
