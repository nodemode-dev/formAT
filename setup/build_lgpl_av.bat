@echo off
setlocal EnableExtensions
set "HERE=%~dp0"
for %%R in ("%HERE%..") do set "ROOT=%%~fR"
set "PY=%~1"
if "%PY%"=="" set "PY=%ROOT%\backend\venv\Scripts\python.exe"
set "FFMPEG_VERSION=8.0.3"
set "FFMPEG_SHA256=6136812ea6d4e68bdba27e33c2a94382711cdf4f8602ffef056ff792bd6f9818"
set "AV_VERSION=18.1.0"
if "%LGPL_FFMPEG_PREFIX%"=="" set "LGPL_FFMPEG_PREFIX=%ROOT%\backend\.lgpl-ffmpeg"
set "LGPL_FFMPEG_WORK=%ROOT%\backend\build\lgpl-ffmpeg"
if "%MSYS2_ROOT%"=="" set "MSYS2_ROOT=C:\msys64"
set "MSYS_BASH=%MSYS2_ROOT%\usr\bin\bash.exe"
if not exist "%PY%" ( echo [lgpl-av] python not found: %PY% & exit /b 1 )
where cl >nul 2>nul || (
  for /f "usebackq delims=" %%V in (`"%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" -latest -products * -property installationPath`) do call "%%V\VC\Auxiliary\Build\vcvars64.bat" >nul
)
where cl >nul 2>nul || ( echo [lgpl-av] the MSVC compiler was not found; install Visual Studio Build Tools with C++ & exit /b 1 )
if exist "%LGPL_FFMPEG_PREFIX%\include\libavcodec\avcodec.h" goto ffmpeg_ready
if not exist "%MSYS_BASH%" ( echo [lgpl-av] MSYS2 was not found at %MSYS2_ROOT%; install it from https://www.msys2.org or set MSYS2_ROOT & exit /b 1 )
set "LGPL_MSVC_BIN="
for /f "delims=" %%C in ('where cl') do if not defined LGPL_MSVC_BIN set "LGPL_MSVC_BIN=%%~dpC"
if not defined LGPL_MSVC_BIN ( echo [lgpl-av] cl.exe was not found on PATH & exit /b 1 )
if not exist "%LGPL_MSVC_BIN%link.exe" ( echo [lgpl-av] MSVC's link.exe was not found beside cl.exe & exit /b 1 )
set "LGPL_MSVC_BIN=%LGPL_MSVC_BIN:~0,-1%"
if not exist "%LGPL_FFMPEG_WORK%" mkdir "%LGPL_FFMPEG_WORK%" || exit /b 1
set "MSYS2_PATH_TYPE=inherit"
set "CHERE_INVOKING=1"
set "LGPL_MSYS_SCRIPT=%HERE:\=/%build_lgpl_ffmpeg_msys2"
"%MSYS_BASH%" -l "%LGPL_MSYS_SCRIPT%" || ( echo [lgpl-av] the FFmpeg build failed & exit /b 1 )
if not exist "%LGPL_FFMPEG_PREFIX%\include\libavcodec\avcodec.h" ( echo [lgpl-av] the FFmpeg build installed no headers into %LGPL_FFMPEG_PREFIX% & exit /b 1 )
:ffmpeg_ready
findstr /m /c:"libavcodec license: LGPL" "%LGPL_FFMPEG_PREFIX%\bin\avcodec-*.dll" >nul || ( echo [lgpl-av] the FFmpeg in %LGPL_FFMPEG_PREFIX% is not LGPL & exit /b 1 )
set "INCLUDE=%LGPL_FFMPEG_PREFIX%\include;%INCLUDE%"
set "LIB=%LGPL_FFMPEG_PREFIX%\lib;%LGPL_FFMPEG_PREFIX%\bin;%LIB%"
set "PATH=%LGPL_FFMPEG_PREFIX%\bin;%PATH%"
echo [lgpl-av] building PyAV %AV_VERSION% from source against it
"%PY%" -m pip install --no-binary av --no-deps --force-reinstall --no-cache-dir "av==%AV_VERSION%" || exit /b 1
"%PY%" "%HERE%check_lgpl_av.py" "%LGPL_FFMPEG_PREFIX%" || exit /b 1
exit /b 0
