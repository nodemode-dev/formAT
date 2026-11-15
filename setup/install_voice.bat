@echo off
setlocal
cd /d "%~dp0..\backend"
if not exist venv\Scripts\python.exe ( echo [format] engine venv missing, run .\format.bat install & exit /b 1 )
set "MODEL=%FORMAT_WHISPER_MODEL%"
if "%MODEL%"=="" set "MODEL=large-v3-turbo"
echo [format] installing local speech to text (faster-whisper)
venv\Scripts\python.exe -m pip install -r requirements_voice.txt || exit /b 1
echo [format] downloading the %MODEL% model (about 1.6 GB for large-v3-turbo, once)
venv\Scripts\python.exe -c "import sys; from faster_whisper import WhisperModel; WhisperModel(sys.argv[1], device='cpu', compute_type='int8')" "%MODEL%" || goto nomodel
echo [format] done. Restart the engine; the microphone then transcribes on this computer with %MODEL%
goto :eof
:nomodel
echo [format] the package is installed but %MODEL% could not be downloaded; it is fetched from Hugging Face. Check the network and run this again, or set FORMAT_WHISPER_MODEL to a model folder
exit /b 1
