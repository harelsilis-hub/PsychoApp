"""
Main FastAPI application entry point.
Initializes the database and sets up routes.
"""
import os
import json
from dotenv import load_dotenv
load_dotenv()
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.db.session import engine, Base, DIALECT
from app.models import User, Word, Association, UserWordProgress, PlacementSession, UserFeedback, PasswordResetToken, UserBadge, PointEvent, CustomWord, PushSubscription
from app.api.v1 import auth_router, sorting_router, progress_router, review_router, associations_router, words_router, admin_router, leaderboard_router, tts_router, custom_words_router, push_router
from app.api.v1.push import send_streak_reminders


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

        # ── Column migrations (idempotent, dialect-aware) ─────────────────────
        if DIALECT == "postgresql":
            # PostgreSQL: CREATE TABLE already added all columns via create_all.
            # Use IF NOT EXISTS as a safety net, then run data patches.
            migrations = [
                "ALTER TABLE words ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false NOT NULL",
                "ALTER TABLE words ADD COLUMN IF NOT EXISTS flag_reason VARCHAR(500) DEFAULT NULL",
                "ALTER TABLE words ADD COLUMN IF NOT EXISTS global_difficulty_level INTEGER DEFAULT NULL",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false NOT NULL",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_words_reviewed INTEGER DEFAULT 0",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_date DATE DEFAULT NULL",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(30) DEFAULT NULL",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_goal_date DATE DEFAULT NULL",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NULL",
                "ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12) DEFAULT NULL",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_user_id INTEGER DEFAULT NULL",
                # Ensure admin account
                "UPDATE users SET is_admin = true WHERE email = 'harel.silis@gmail.com'",
                # Fix Hebrew words truncated by unescaped gershayim
                "UPDATE words SET hebrew = '\u05d7\u05d5\u05f4\u05dc' WHERE english = 'abroad'  AND hebrew = '\u05d7\u05d5'",
                "UPDATE words SET hebrew = '\u05d7\u05d5\u05f4\u05dc' WHERE english = 'offshore' AND hebrew = '\u05d7\u05d5'",
                # Phase 1/2 learning_state column
                "ALTER TABLE user_word_progress ADD COLUMN IF NOT EXISTS learning_state VARCHAR(20) DEFAULT 'learning' NOT NULL",
                # Only Mastered words (marked 'known' in FilterMode) are pre-graduated.
                # Review words may still be waiting for the acquisition quiz.
                "UPDATE user_word_progress SET learning_state = 'graduated' WHERE status = 'Mastered' AND learning_state = 'learning'",
            ]
            for migration_sql in migrations:
                try:
                    await conn.execute(text(migration_sql))
                except Exception:
                    pass
        else:
            # SQLite: raises OperationalError when column already exists — safe to ignore.
            migrations = [
                "ALTER TABLE words ADD COLUMN is_flagged INTEGER DEFAULT 0 NOT NULL",
                "ALTER TABLE words ADD COLUMN flag_reason VARCHAR(500) DEFAULT NULL",
                "ALTER TABLE words ADD COLUMN global_difficulty_level INTEGER DEFAULT NULL",
                "ALTER TABLE users ADD COLUMN created_at DATETIME NULL",
                "UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL",
                "ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0 NOT NULL",
                "UPDATE users SET is_admin = 1 WHERE email = 'harel.silis@gmail.com'",
                "ALTER TABLE users ADD COLUMN current_streak INTEGER DEFAULT 0",
                "ALTER TABLE users ADD COLUMN daily_words_reviewed INTEGER DEFAULT 0",
                "ALTER TABLE users ADD COLUMN last_active_date DATE DEFAULT NULL",
                "ALTER TABLE users ADD COLUMN display_name VARCHAR(30) DEFAULT NULL",
                "ALTER TABLE users ADD COLUMN last_goal_date DATE DEFAULT NULL",
                "ALTER TABLE users ADD COLUMN last_seen DATETIME DEFAULT NULL",
                "ALTER TABLE users ADD COLUMN referral_code VARCHAR(12) DEFAULT NULL",
                "ALTER TABLE users ADD COLUMN referred_by_user_id INTEGER DEFAULT NULL",
                # Fix Hebrew words truncated by unescaped gershayim (\" in original JSON)
                "UPDATE words SET hebrew = '\u05d7\u05d5\u05f4\u05dc' WHERE english = 'abroad'  AND hebrew = '\u05d7\u05d5'",
                "UPDATE words SET hebrew = '\u05d7\u05d5\u05f4\u05dc' WHERE english = 'offshore' AND hebrew = '\u05d7\u05d5'",
                "UPDATE words SET hebrew = '\u05e2\u05d5\u05d1\u05e8' WHERE english = 'embryo'  AND length(hebrew) <= 2",
                # Phase 1/2 learning_state column
                "ALTER TABLE user_word_progress ADD COLUMN learning_state VARCHAR(20) DEFAULT 'learning' NOT NULL",
                # Only Mastered words (marked 'known' in FilterMode) are pre-graduated.
                # Review words may still be waiting for the acquisition quiz.
                "UPDATE user_word_progress SET learning_state = 'graduated' WHERE status = 'Mastered' AND learning_state = 'learning'",
            ]
            for migration_sql in migrations:
                try:
                    await conn.execute(text(migration_sql))
                except Exception:
                    pass  # column already present

    print("[OK] Database tables ready.")

    # ── Streak reminder scheduler ─────────────────────────────────────────────
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        send_streak_reminders,
        CronTrigger(hour=20, minute=0, timezone="Asia/Jerusalem"),
        id="streak_reminders",
        replace_existing=True,
    )
    scheduler.start()
    print("[OK] Scheduler started — streak reminders at 20:00 Israel time.")

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

    scheduler.shutdown()
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

app.include_router(
    admin_router,
    prefix="/api/v1/admin",
    tags=["Admin Panel"],
)

app.include_router(
    leaderboard_router,
    prefix="/api/v1/leaderboard",
    tags=["Leaderboard"],
)

app.include_router(
    tts_router,
    prefix="/api/v1",
    tags=["Text-to-Speech"],
)

app.include_router(
    custom_words_router,
    prefix="/api/v1/my-words",
    tags=["My Words - Custom Vocabulary"],
)

app.include_router(
    push_router,
    prefix="/api/v1/push",
    tags=["Push Notifications"],
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
