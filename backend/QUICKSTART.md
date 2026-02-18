# Quick Start Guide

## Installation (Choose One)

### Option 1: Automated (Recommended)
```bash
# Windows
install.bat

# Unix/Linux/Mac
./install.sh
```

### Option 2: Manual
```bash
python -m venv venv
venv\Scripts\activate          # Windows
# OR
source venv/bin/activate       # Unix/Mac

pip install --upgrade pip
pip install -r requirements.txt
```

## Testing

```bash
# Make sure you're in the backend directory!
cd backend

# Run database test
python test_db.py
```

Expected output:
```
============================================================
DATABASE SETUP TEST
============================================================
[1/6] Importing database modules...
✅ Database modules imported successfully
...
🎉 ALL TESTS PASSED SUCCESSFULLY!
```

## Running the Application

```bash
# Start the server
uvicorn app.main:app --reload

# Or with custom host/port
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open your browser:
- **API Docs (Swagger):** http://localhost:8000/docs
- **API Docs (ReDoc):** http://localhost:8000/redoc
- **Health Check:** http://localhost:8000/health

## Project Commands Reference

### Virtual Environment
```bash
# Activate
venv\Scripts\activate              # Windows CMD
venv\Scripts\Activate.ps1          # Windows PowerShell
source venv/bin/activate           # Unix/Mac

# Deactivate
deactivate
```

### Development
```bash
# Run tests
python test_db.py

# Start server (with auto-reload)
uvicorn app.main:app --reload

# Start server (production-like)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Database
```bash
# The database (vocabulary.db) is created automatically on first run
# To reset the database, delete it:
rm vocabulary.db        # Unix/Mac
del vocabulary.db       # Windows
```

## Import Pattern (IMPORTANT!)

All imports use `app.*` not `backend.app.*`:

```python
# ✅ CORRECT
from app.db.session import Base, engine
from app.models import User, Word
from app.schemas import UserCreate

# ❌ WRONG
from backend.app.db.session import Base, engine
from backend.app.models import User, Word
```

**Why?** Because we run commands from the `backend/` directory, which is the root of our Python package.

## Common Issues

### "ModuleNotFoundError: No module named 'app'"
**Solution:** Make sure you're in the `backend` directory:
```bash
cd backend
python test_db.py
```

### "ModuleNotFoundError: No module named 'backend'"
**Solution:** You have old imports. See "Import Pattern" above.

### Build errors on Windows
**Solution:** Use pre-built wheels:
```bash
pip install --only-binary :all: -r requirements.txt
```

### Port already in use
**Solution:** Use a different port:
```bash
uvicorn app.main:app --reload --port 8001
```

## File Structure

```
backend/
├── app/
│   ├── db/            # Database engine & session
│   ├── models/        # SQLAlchemy models
│   ├── schemas/       # Pydantic schemas
│   └── main.py        # FastAPI app
├── test_db.py         # Database test script
├── requirements.txt   # Dependencies
├── install.bat        # Windows installer
├── install.sh         # Unix/Mac installer
└── INSTALL.md         # Detailed installation guide
```

## Next Steps

1. ✅ Complete installation
2. ✅ Run `test_db.py` successfully
3. ✅ Start the server
4. ✅ Visit http://localhost:8000/docs
5. 🚀 Start building your API!

### Suggested Implementation Order:
1. **Authentication**: JWT tokens, user registration/login
2. **User endpoints**: CRUD operations for users
3. **Word endpoints**: CRUD operations for vocabulary words
4. **Progress endpoints**: SM-2 algorithm implementation
5. **Association endpoints**: Memory aids system
6. **Testing**: Unit and integration tests
7. **Deployment**: Docker, cloud hosting

## API Endpoints (To Be Implemented)

```
POST   /api/auth/register        # User registration
POST   /api/auth/login           # User login
GET    /api/users/me             # Get current user
GET    /api/words                # List words (with difficulty filter)
GET    /api/words/{id}           # Get single word
POST   /api/progress/review      # Submit review result (SM-2)
GET    /api/progress/due         # Get words due for review
POST   /api/associations         # Create memory aid
GET    /api/associations/{word_id}  # Get associations for word
```

## Resources

- **FastAPI Docs:** https://fastapi.tiangolo.com/
- **SQLAlchemy Docs:** https://docs.sqlalchemy.org/
- **Pydantic Docs:** https://docs.pydantic.dev/
- **SM-2 Algorithm:** https://en.wikipedia.org/wiki/SuperMemo

---

**Ready to code!** 🚀
