"""
Progress API endpoints - User progress tracking and triage mode.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.services.progress import ProgressService
from app.schemas.progress import (
    TriageUpdate,
    TriageResponse,
    UserStatsResponse,
)
from app.schemas.word import WordResponse
from app.auth.dependencies import get_current_user

router = APIRouter()


@router.post("/triage", response_model=TriageResponse)
async def triage_word(
    triage_data: TriageUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TriageResponse:
    """
    Update word status during triage mode.
    Marks a word as either "Mastered" (known) or "Learning" (don't know).
    """
    try:
        progress, message = await ProgressService.update_word_status(
            db,
            current_user.id,
            triage_data.word_id,
            triage_data.is_known
        )

        return TriageResponse(
            success=True,
            status=progress.status.value,
            message=message
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update word status: {str(e)}"
        )


@router.get("/stats", response_model=UserStatsResponse)
async def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserStatsResponse:
    """Get user statistics for dashboard."""
    stats = await ProgressService.get_user_stats(db, current_user.id)
    return UserStatsResponse(**stats)


@router.get("/unit-stats")
async def get_unit_progress_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Get per-unit progress stats and overall learned percentage for dashboard.
    """
    stats = await ProgressService.get_unit_stats(db, current_user.id)
    return stats


@router.get("/triage/next", response_model=dict)
async def get_next_triage_word(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get next word for triage mode."""
    stats = await ProgressService.get_user_stats(db, current_user.id)
    user_level = stats["level"]

    word, remaining = await ProgressService.get_next_triage_word(
        db, current_user.id, user_level
    )

    if not word:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No more words to triage at your level. You've completed the triage phase!"
        )

    word_response = WordResponse.model_validate(word)

    return {
        "word": word_response.model_dump(),
        "remaining": remaining,
        "message": f"Word {remaining} remaining at level {user_level}."
    }
