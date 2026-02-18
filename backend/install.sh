#!/bin/bash
# Installation script for Unix/Linux/Mac

set -e

echo "============================================================"
echo "Vocabulary SaaS Backend - Installation Script"
echo "============================================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 is not installed"
    echo "Please install Python 3.10+ from https://www.python.org/"
    exit 1
fi

echo "[1/5] Python found:"
python3 --version
echo ""

# Upgrade pip
echo "[2/5] Upgrading pip, setuptools, and wheel..."
python3 -m pip install --upgrade pip setuptools wheel || echo "[WARNING] Failed to upgrade pip"
echo ""

# Create virtual environment
echo "[3/5] Creating virtual environment..."
if [ -d "venv" ]; then
    echo "Virtual environment already exists. Skipping..."
else
    python3 -m venv venv
    echo "Virtual environment created successfully"
fi
echo ""

# Activate virtual environment
echo "[4/5] Activating virtual environment..."
source venv/bin/activate
echo ""

# Install requirements
echo "[5/5] Installing dependencies..."
echo "This may take a few minutes..."
if ! pip install -r requirements.txt; then
    echo ""
    echo "[WARNING] Some packages failed to install."
    echo "Trying with pre-built wheels only..."
    pip install --only-binary :all: -r requirements.txt || {
        echo "[ERROR] Installation failed. Please check INSTALL.md for manual steps."
        exit 1
    }
fi
echo ""

echo "============================================================"
echo "✅ Installation Complete!"
echo "============================================================"
echo ""
echo "Next steps:"
echo "  1. Test the database: python test_db.py"
echo "  2. Run the application: uvicorn app.main:app --reload"
echo "  3. Visit http://localhost:8000/docs"
echo ""
echo "To activate the virtual environment in the future:"
echo "  source venv/bin/activate"
echo ""
