@echo off
setlocal
cd /d "%~dp0.."
for %%p in (frontend\dist backend\build backend\dist-engine native\format-render\target) do if exist "%%p" rmdir /s /q "%%p"
for /d /r backend %%d in (__pycache__) do if exist "%%d" rmdir /s /q "%%d"
if /i "%~1"=="--all" for %%p in (frontend\node_modules backend\venv) do if exist "%%p" rmdir /s /q "%%p"
echo [format] clean
