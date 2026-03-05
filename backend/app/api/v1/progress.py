"""
Progress API endpoints - User progress tracking and triage mode.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.models.word import Word
from app.models.user_word_progress import UserWordProgress, WordStatus
from app.services.progress import ProgressService
from app.services.gamification import award_xp, check_and_award_badges, POINTS
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

        # Award XP for triage action
        xp_source = "triage_known" if triage_data.is_known else "triage_unknown"
        xp_result = await award_xp(db, current_user, xp_source, POINTS[xp_source])
        new_badges = await check_and_award_badges(db, current_user)
        await db.commit()

        return TriageResponse(
            success=True,
            status=progress.status.value,
            message=message,
            xp_earned=xp_result["xp_earned"],
            new_xp=xp_result["new_xp"],
            level_up=xp_result["level_up"],
            new_level_title=xp_result["new_level_info"]["title"] if xp_result["level_up"] else None,
            new_badges=new_badges,
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
    language: str = Query(default="en", description="Language filter: 'en' or 'he'"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Get per-unit progress stats and overall learned percentage for dashboard.
    """
    stats = await ProgressService.get_unit_stats(db, current_user.id, language)
    return stats


@router.delete("/unit/{unit_number}/reset")
async def reset_unit_progress(
    unit_number: int,
    language: str = Query(default="en", description="Language filter: 'en' or 'he'"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete all word progress records for a unit, resetting words to New status."""
    if unit_number < 1 or unit_number > 10:
        raise HTTPException(status_code=400, detail="Unit must be 1-10")

    try:
        word_ids_stmt = select(Word.id).where(Word.unit == unit_number).where(Word.language == language)
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


@router.get("/unit/{unit_number}/pending-count")
async def get_unit_pending_count(
    unit_number: int,
    language: str = Query(default="en", description="Language filter: 'en' or 'he'"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Count words with LEARNING status in a unit — i.e. pending review backlog."""
    if unit_number < 1 or unit_number > 10:
        raise HTTPException(status_code=400, detail="Unit must be 1-10")

    stmt = (
        select(func.count(UserWordProgress.id))
        .join(Word, UserWordProgress.word_id == Word.id)
        .where(UserWordProgress.user_id == current_user.id)
        .where(Word.unit == unit_number)
        .where(Word.language == language)
        .where(UserWordProgress.status == WordStatus.LEARNING)
    )
    result = await db.execute(stmt)
    count = result.scalar() or 0
    return {"pending_count": count}


@router.get("/triage/batch", response_model=dict)
async def get_batch_triage_words(
    limit: int = Query(default=50, ge=1, le=100),
    language: str = Query(default="en", description="Language filter: 'en' or 'he'"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get a batch of words for triage mode (one API call covers many swipes)."""
    stats = await ProgressService.get_user_stats(db, current_user.id)
    user_level = stats["level"]

    words, remaining = await ProgressService.get_batch_triage_words(
        db, current_user.id, user_level, limit, language
    )

    if not words:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No more words to triage at your level. Triage complete!"
        )

    return {
        "words": [WordResponse.model_validate(w).model_dump() for w in words],
        "remaining": remaining,
    }


@router.get("/triage/next", response_model=dict)
async def get_next_triage_word(
    language: str = Query(default="en", description="Language filter: 'en' or 'he'"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get next word for triage mode."""
    stats = await ProgressService.get_user_stats(db, current_user.id)
    user_level = stats["level"]

    word, remaining = await ProgressService.get_next_triage_word(
        db, current_user.id, user_level, language
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
