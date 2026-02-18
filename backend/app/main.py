"""
Main FastAPI application entry point.
Initializes the database and sets up routes.
"""
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.session import engine, Base
from app.models import User, Word, Association, UserWordProgress, PlacementSession
from app.api.v1 import sorting_router


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

        # Create all tables
        await conn.run_sync(Base.metadata.create_all)

    print("[OK] Database tables created successfully!")

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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update with specific origins in production
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
    sorting_router,
    prefix="/api/v1/sorting",
    tags=["Sorting Hat - Placement Test"],
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
