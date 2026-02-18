@echo off
REM Installation script for Windows
echo ============================================================
echo Vocabulary SaaS Backend - Installation Script (Windows)
echo ============================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.10+ from https://www.python.org/
    pause
    exit /b 1
)

echo [1/5] Python found:
python --version
echo.

REM Upgrade pip
echo [2/5] Upgrading pip, setuptools, and wheel...
python -m pip install --upgrade pip setuptools wheel
if errorlevel 1 (
    echo [WARNING] Failed to upgrade pip
)
echo.

REM Create virtual environment
echo [3/5] Creating virtual environment...
if exist venv (
    echo Virtual environment already exists. Skipping...
) else (
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment
        pause
        exit /b 1
    )
    echo Virtual environment created successfully
)
echo.

REM Activate virtual environment
echo [4/5] Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo [ERROR] Failed to activate virtual environment
    pause
    exit /b 1
)
echo.

REM Install requirements
echo [5/5] Installing dependencies...
echo This may take a few minutes...
pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo [WARNING] Some packages failed to install.
    echo Trying with pre-built wheels only...
    pip install --only-binary :all: -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Installation failed. Please check INSTALL.md for manual steps.
        pause
        exit /b 1
    )
)
echo.

echo ============================================================
echo Installation Complete!
echo ============================================================
echo.
echo Next steps:
echo   1. Keep this terminal open (virtual environment is active)
echo   2. Test the database: python test_db.py
echo   3. Run the application: uvicorn app.main:app --reload
echo   4. Visit http://localhost:8000/docs
echo.
echo To activate the virtual environment in the future:
echo   venv\Scripts\activate
echo.
pause
