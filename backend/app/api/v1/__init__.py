"""API v1 package."""
from app.api.v1.auth import router as auth_router
from app.api.v1.sorting import router as sorting_router
from app.api.v1.progress import router as progress_router
from app.api.v1.review import router as review_router
from app.api.v1.associations import router as associations_router
from app.api.v1.words import router as words_router
from app.api.v1.admin import router as admin_router
from app.api.v1.leaderboard import router as leaderboard_router
from app.api.v1.tts import router as tts_router

__all__ = [
    "auth_router",
    "sorting_router",
    "progress_router",
    "review_router",
    "associations_router",
    "words_router",
    "admin_router",
    "leaderboard_router",
    "tts_router",
]
