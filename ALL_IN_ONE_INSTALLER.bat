:: AI GENERATED BATCH (I was too fucking lazy to continue this for something i just did for fun)
@echo off
setlocal enabledelayedexpansion

:: ================================
:: CONFIG (EDIT THESE)
:: ================================

set PROJECT_PATH=C:\path\to\your\website
set OLLAMA_MODELS_PATH=D:\ollama\models
set MODEL_NAME=phi3:mini
set OLLAMA_INSTALLER=https://ollama.com/download/OllamaSetup.exe
set OLLAMA_EXE=%LOCALAPPDATA%\Programs\Ollama\ollama.exe

:: ================================
:: CREATE MODEL DIR
:: ================================

if not exist "%OLLAMA_MODELS_PATH%" (
    echo Creating models directory...
    mkdir "%OLLAMA_MODELS_PATH%"
)

set OLLAMA_MODELS=%OLLAMA_MODELS_PATH%

:: ================================
:: CHECK / INSTALL OLLAMA
:: ================================

where ollama >nul 2>&1
if %errorlevel% neq 0 (
    echo Ollama not found. Installing...

    set INSTALLER=%TEMP%\ollama_setup.exe

    powershell -Command "Invoke-WebRequest -Uri '%OLLAMA_INSTALLER%' -OutFile '%INSTALLER%'"

    echo Running installer...
    start /wait "" "%INSTALLER%"

    echo Waiting for installation to complete...
    timeout /t 5 >nul
)

:: Re-check
where ollama >nul 2>&1
if %errorlevel% neq 0 (
    echo Ollama installation failed or is not in PATH.
    pause
    exit /b
)

:: ================================
:: ENSURE ONLY ONE SERVER RUNNING
:: ================================

echo Checking for existing Ollama server...

tasklist | findstr /i "ollama.exe" >nul
if %errorlevel% == 0 (
    echo Ollama server already running. Skipping start.
) else (
    echo Starting Ollama server...
    start "Ollama Server" cmd /k ollama serve
    timeout /t 3 >nul
)

:: ================================
:: CHECK / PULL MODEL
:: ================================

echo Checking model: %MODEL_NAME%

ollama list | findstr /i "%MODEL_NAME%" >nul
if %errorlevel% neq 0 (
    echo Model not found. Pulling %MODEL_NAME%...
    ollama pull %MODEL_NAME%
) else (
    echo Model already exists.
)

:: ================================
:: START BACKEND
:: ================================

echo Starting backend at %PROJECT_PATH%
cd /d "%PROJECT_PATH%"

:: ---- Choose ONE ----
:: Node:
:: npm install
:: npm start

:: Python:
:: python app.py

echo Backend launch complete.
pause