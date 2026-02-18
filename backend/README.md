# Vocabulary SaaS - Backend

A FastAPI-based backend for a vocabulary learning SaaS application with spaced repetition using the SM-2 algorithm.

## Architecture

### Database Layer
- **ORM**: SQLAlchemy 2.0 (Async)
- **Database**: SQLite with aiosqlite (async driver)
- **Validation**: Pydantic v2

### Models

#### User
- Stores user authentication and gamification data
- Tracks XP and level progression
- One-to-Many relationships with UserWordProgress and Association

#### Word
- Vocabulary word entries (English-Hebrew pairs)
- Difficulty ranking (1-100) for progressive learning
- Optional audio pronunciation URLs

#### Association
- User-generated memory aids/mnemonics
- Supports community engagement via likes
- Many-to-One relationships with User and Word

#### UserWordProgress
- Core model for SM-2 spaced repetition algorithm
- Tracks learning status: New → Learning → Review → Mastered
- Stores SRS data (repetition_number, easiness_factor, interval_days)
- Manages next_review timestamps

#### PlacementSession (NEW!)
- **"Sorting Hat"** adaptive placement test
- Uses binary search algorithm to determine user's vocabulary level
- Regression checks every 5th question (20% below current min)
- Efficiently narrows down ability in ~10-15 questions
- See [SORTING_HAT.md](SORTING_HAT.md) for detailed documentation

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app initialization
│   ├── db/
│   │   ├── __init__.py
│   │   └── session.py          # Database engine & session
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── word.py
│   │   ├── association.py
│   │   └── user_word_progress.py
│   └── schemas/
│       ├── __init__.py
│       ├── user.py
│       ├── word.py
│       ├── association.py
│       └── progress.py
├── requirements.txt
├── .env.example
└── README.md
```

## Setup Instructions

### Quick Install (Recommended)

**Windows:**
```bash
cd backend
install.bat
```

**Unix/Linux/Mac:**
```bash
cd backend
chmod +x install.sh
./install.sh
```

### Manual Installation

See [INSTALL.md](INSTALL.md) for detailed step-by-step instructions, including troubleshooting.

**Quick steps:**

1. **Create and activate virtual environment:**
   ```bash
   cd backend
   python -m venv venv

   # Windows
   venv\Scripts\activate

   # Unix/Mac
   source venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

3. **Test the setup:**
   ```bash
   python test_db.py
   ```

4. **Run the application:**
   ```bash
   uvicorn app.main:app --reload
   ```

The API will be available at `http://localhost:8000`

**Important:** All commands must be run from the `backend` directory!

## API Documentation

Once running, access:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Database

The SQLite database (`vocabulary.db`) will be created automatically on first run in the backend directory.

### Tables Created

1. **users** - User accounts
2. **words** - Vocabulary entries
3. **associations** - Memory aids
4. **user_word_progress** - SRS tracking

## SM-2 Algorithm

The `user_word_progress` table stores data for the SuperMemo-2 spaced repetition algorithm:

- **repetition_number**: Count of successful reviews
- **easiness_factor**: Difficulty multiplier (1.3-2.5)
- **interval_days**: Days until next review

### Status Flow
```
New → Learning → Review → Mastered
```

## Next Steps

1. **Authentication**: Implement JWT-based auth endpoints
2. **CRUD Operations**: Create API routes for each model
3. **SM-2 Logic**: Implement the review algorithm
4. **Testing**: Write unit and integration tests
5. **Alembic**: Set up database migrations

## Type Hints

All code follows strict type hinting conventions using:
- `Mapped[T]` for SQLAlchemy columns
- `TYPE_CHECKING` for circular import prevention
- Pydantic for runtime validation

## Development

### Database Reset

To reset the database, uncomment this line in `main.py` (line 24):
```python
await conn.run_sync(Base.metadata.drop_all)
```

### Adding New Models

1. Create model in `app/models/`
2. Import in `app/models/__init__.py`
3. Import in `app/main.py` (for table creation)
4. Create Pydantic schemas in `app/schemas/`

## License

MIT
