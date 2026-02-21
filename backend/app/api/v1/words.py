"""
Words API endpoints.

Currently exposes the admin/utility difficulty recalculation endpoint.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db.session import get_db
from app.models.user import User
from app.services.difficulty import DifficultyService
from app.auth.dependencies import get_current_user

router = APIRouter()


class RecalculateResponse(BaseModel):
    """Response returned by the recalculate-difficulty endpoint."""

    total_words: int
    words_updated: int
    words_without_data: int
    level_distribution: dict[int, int]
    message: str


@router.post("/recalculate-difficulty", response_model=RecalculateResponse)
async def recalculate_difficulty(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RecalculateResponse:
    """
    Recalculate the global difficulty level (1–20) for every word.

    **Algorithm**

    For each word, aggregate across ALL users:

        success_rate = (REVIEW + MASTERED records) / (LEARNING + REVIEW + MASTERED records)

    Mapping:
    - 100 % success  →  Level  1  (easiest)
    -   0 % success  →  Level 20  (hardest)
    - Everything else proportionally distributed

    Words that no user has ever reviewed keep `global_difficulty_level = NULL`.

    **Authorization**: any authenticated user may trigger a recalculation.
    In a multi-tenant production deployment you would restrict this to admin accounts.
    """
    result = await DifficultyService.recalculate_all(db)

    pct = (
        round(result["words_updated"] / result["total_words"] * 100, 1)
        if result["total_words"]
        else 0.0
    )
    message = (
        f"Updated {result['words_updated']} / {result['total_words']} words "
        f"({pct}% had crowd-sourced data). "
        f"{result['words_without_data']} words remain unrated (no user data yet)."
    )

    return RecalculateResponse(**result, message=message)
