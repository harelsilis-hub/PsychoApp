# Installation Guide - Windows

## Prerequisites

- Python 3.10+ installed
- pip updated to latest version

## Step-by-Step Installation

### 1. Update pip (Important!)

```bash
python -m pip install --upgrade pip setuptools wheel
```

### 2. Create Virtual Environment

```bash
cd backend
python -m venv venv
```

### 3. Activate Virtual Environment

**Windows Command Prompt:**
```bash
venv\Scripts\activate
```

**Windows PowerShell:**
```powershell
venv\Scripts\Activate.ps1
```

**Git Bash / Unix-like:**
```bash
source venv/bin/activate
```

### 4. Install Dependencies

**Option A: Standard Installation (Recommended)**
```bash
pip install -r requirements.txt
```

**Option B: If you get build errors, use pre-built wheels only:**
```bash
pip install --only-binary :all: -r requirements.txt
```

**Option C: If Option B fails, install core packages first:**
```bash
# Install core packages
pip install fastapi==0.109.0
pip install uvicorn[standard]==0.27.0
pip install sqlalchemy==2.0.25
pip install aiosqlite==0.19.0
pip install pydantic==2.5.3

# Then install the rest
pip install -r requirements.txt
```

### 5. Verify Installation

```bash
python -c "import fastapi, sqlalchemy, pydantic; print('✅ All core packages installed!')"
```

### 6. Test Database Setup

```bash
python test_db.py
```

You should see output like:
```
============================================================
DATABASE SETUP TEST
============================================================

[1/6] Importing database modules...
✅ Database modules imported successfully

[2/6] Importing models...
✅ Models imported successfully
...
🎉 ALL TESTS PASSED SUCCESSFULLY!
```

### 7. Run the Application

```bash
uvicorn app.main:app --reload
```

Visit http://localhost:8000/docs to see the API documentation.

## Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'backend'"

**Solution:** Make sure you're in the `backend` directory:
```bash
cd backend
python test_db.py
```

### Issue: "error: Microsoft Visual C++ 14.0 or greater is required"

**Solution:** Use pre-built wheels:
```bash
pip install --only-binary :all: -r requirements.txt
```

Or install specific packages that are failing:
```bash
pip install --only-binary :all: cryptography bcrypt
```

### Issue: "Failed building wheel for pydantic-core"

**Solution:** This is fixed by using pydantic==2.5.3 which has pre-built wheels. If still failing:
```bash
pip install --upgrade pip
pip install pydantic==2.5.3 --only-binary :all:
```

### Issue: Python path issues

**Solution:** Add the backend directory to PYTHONPATH:

**Windows:**
```bash
set PYTHONPATH=%CD%
python test_db.py
```

**Unix/Mac:**
```bash
export PYTHONPATH=$(pwd)
python test_db.py
```

## Verification Checklist

- [ ] Python 3.10+ installed
- [ ] Virtual environment created and activated
- [ ] All packages installed without errors
- [ ] `test_db.py` runs successfully
- [ ] Application starts with `uvicorn app.main:app --reload`
- [ ] API docs accessible at http://localhost:8000/docs

## Next Steps

After successful installation:

1. **Configure Environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

2. **Explore the API:**
   - Visit http://localhost:8000/docs
   - Try the `/health` endpoint

3. **Start Building:**
   - Add authentication endpoints
   - Implement CRUD operations
   - Build the SM-2 algorithm logic

## Need Help?

If you encounter issues not covered here, please check:
1. Python version: `python --version` (should be 3.10+)
2. Pip version: `pip --version` (should be 23.0+)
3. Virtual environment is activated (prompt should show `(venv)`)
