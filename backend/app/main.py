"""
Main FastAPI application entry point.
Initializes the database and sets up routes.
"""
import os
import json
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.db.session import engine, Base
from app.models import User, Word, Association, UserWordProgress, PlacementSession
from app.api.v1 import auth_router, sorting_router, progress_router, review_router, associations_router, words_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Lifespan context manager for FastAPI application.
    Creates database tables on startup.

    Args:
        app: FastAPI application instance.

    Yields:
        None
    """
    # Create tables on startup
    async with engine.begin() as conn:
        # Drop all tables (useful during development)
        # await conn.run_sync(Base.metadata.drop_all)

        # Create all tables (no-op for tables that already exist)
        await conn.run_sync(Base.metadata.create_all)

        # ── Column migrations (idempotent ALTER TABLE for existing DBs) ───────
        # SQLite raises OperationalError when a column already exists — safe to ignore.
        migrations = [
            "ALTER TABLE words ADD COLUMN global_difficulty_level INTEGER DEFAULT NULL",
            "ALTER TABLE users ADD COLUMN current_streak INTEGER DEFAULT 1",
            "UPDATE users SET current_streak = 1 WHERE current_streak = 0",
            "ALTER TABLE users ADD COLUMN daily_words_reviewed INTEGER DEFAULT 0",
            "ALTER TABLE users ADD COLUMN last_active_date DATE DEFAULT NULL",
        ]
        for migration_sql in migrations:
            try:
                await conn.execute(text(migration_sql))
            except Exception:
                pass  # column already present

    print("[OK] Database tables ready.")

    # ── Auto-seed words if the table is empty ─────────────────────────────────
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT COUNT(*) FROM words"))
        word_count = result.scalar()

    if word_count == 0:
        json_path = Path(__file__).resolve().parent.parent.parent / "database_english.json"
        if json_path.exists():
            print("[SEED] Words table is empty — seeding from database_english.json …")
            with open(json_path, encoding="utf-8") as f:
                data = json.load(f)

            rows = []
            units = sorted(data.keys(), key=lambda u: int(u.split()[-1]))
            for unit_idx, unit_name in enumerate(units):
                unit_number = unit_idx + 1
                for english, hebrew in data[unit_name].items():
                    rows.append({"english": english, "hebrew": hebrew, "unit": unit_number})

            async with engine.begin() as conn:
                await conn.execute(
                    text("INSERT INTO words (english, hebrew, unit) VALUES (:english, :hebrew, :unit)"),
                    rows,
                )
            print(f"[SEED] Inserted {len(rows)} words. Done.")
        else:
            print(f"[WARN] database_english.json not found at {json_path} — words table remains empty.")
    else:
        print(f"[OK] Words table has {word_count} words.")

    yield

    # Cleanup on shutdown
    await engine.dispose()
    print("[OK] Database connection closed.")


# Initialize FastAPI app with lifespan
app = FastAPI(
    title="Vocabulary SaaS API",
    description="API for vocabulary learning with spaced repetition (SM-2 algorithm)",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware configuration
# Set ALLOWED_ORIGINS env var in production, e.g. "https://your-app.vercel.app"
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> dict[str, str]:
    """
    Root endpoint - health check.

    Returns:
        dict: Welcome message.
    """
    return {
        "message": "Welcome to Vocabulary SaaS API",
        "status": "active",
        "version": "1.0.0",
    }


@app.get("/health")
async def health_check() -> dict[str, str]:
    """
    Health check endpoint.

    Returns:
        dict: Health status.
    """
    return {"status": "healthy"}


# API Routers
app.include_router(
    auth_router,
    prefix="/api/v1/auth",
    tags=["Authentication"],
)

app.include_router(
    sorting_router,
    prefix="/api/v1/sorting",
    tags=["Sorting Hat - Placement Test"],
)

app.include_router(
    progress_router,
    prefix="/api/v1/progress",
    tags=["Progress & Triage Mode"],
)

app.include_router(
    review_router,
    prefix="/api/v1/review",
    tags=["Review & Learning"],
)

app.include_router(
    associations_router,
    prefix="/api/v1/associations",
    tags=["Memory Aids - Associations"],
)

app.include_router(
    words_router,
    prefix="/api/v1/words",
    tags=["Words - Admin & Utilities"],
)

# TODO: Add additional route modules here
# from app.api.v1 import users, words, associations, progress
# app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
# app.include_router(words.router, prefix="/api/v1/words", tags=["words"])
# app.include_router(associations.router, prefix="/api/v1/associations", tags=["associations"])
# app.include_router(progress.router, prefix="/api/v1/progress", tags=["progress"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
