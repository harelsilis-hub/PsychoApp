"""
Progress API endpoints - User progress tracking and triage mode.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.models.word import Word
from app.models.user_word_progress import UserWordProgress
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


@router.delete("/unit/{unit_number}/reset")
async def reset_unit_progress(
    unit_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete all word progress records for a unit, resetting words to New status."""
    if unit_number < 1 or unit_number > 10:
        raise HTTPException(status_code=400, detail="Unit must be 1-10")

    try:
        word_ids_stmt = select(Word.id).where(Word.unit == unit_number)
        result = await db.execute(word_ids_stmt)
        word_ids = [row[0] for row in result.all()]

        if word_ids:
            await db.execute(
                delete(UserWordProgress).where(
                    UserWordProgress.user_id == current_user.id,
                    UserWordProgress.word_id.in_(word_ids),
                )
            )
            await db.commit()

        return {"success": True, "reset_count": len(word_ids)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset unit: {str(e)}")


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
