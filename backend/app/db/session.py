"""
Database session and engine configuration.
Supports both SQLite (local dev) and PostgreSQL (production on Render).
"""
import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

# Read DATABASE_URL from environment.
# Render provides postgres:// — SQLAlchemy 2 needs postgresql+asyncpg://
_raw_url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./vocabulary.db")

if _raw_url.startswith("postgres://"):
    _raw_url = _raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif _raw_url.startswith("postgresql://") and "+asyncpg" not in _raw_url:
    _raw_url = _raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)

DATABASE_URL = _raw_url

# Dialect name ('postgresql' or 'sqlite') — used for dialect-aware migrations in main.py
_is_postgres = DATABASE_URL.startswith("postgresql")

# Engine kwargs differ by dialect
_engine_kwargs: dict = {"echo": False, "future": True}
if _is_postgres:
    _engine_kwargs["pool_pre_ping"] = True  # detect stale connections

engine = create_async_engine(DATABASE_URL, **_engine_kwargs)

# Expose dialect name so main.py can choose the right migration SQL
DIALECT = engine.dialect.name  # 'postgresql' or 'sqlite'

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# Base class for all models
class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


# Dependency for FastAPI
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
