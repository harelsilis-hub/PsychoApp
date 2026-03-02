"""
Review API endpoints - Spaced repetition review sessions.
"""
from datetime import date as date_type, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.models.word import Word
from app.models.user_word_progress import UserWordProgress, WordStatus
from app.services.review_service import ReviewService
from app.schemas.progress import ReviewResult
from app.schemas.review import (
    ReviewSessionResponse,
    ReviewSessionWord,
    ReviewSubmitResponse,
    ReviewStatsResponse,
)
from app.auth.dependencies import get_current_user

router = APIRouter()


@router.get("/session", response_model=ReviewSessionResponse)
async def get_review_session(
    limit: int = Query(default=20, ge=1, le=100, description="Max words per session"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReviewSessionResponse:
    """
    Get a batch of words for review session.
    Returns words due for review + new learning words up to limit.
    """
    try:
        progress_word_pairs = await ReviewService.get_due_words(db, current_user.id, limit)

        words = []
        due_count = 0
        new_count = 0

        for progress, word in progress_word_pairs:
            is_new = progress.next_review is None
            if is_new:
                new_count += 1
            else:
                due_count += 1

            words.append(
                ReviewSessionWord(
                    word_id=word.id,
                    english=word.english,
                    hebrew=word.hebrew,
                    unit=word.unit,
                    is_new=is_new,
                    last_reviewed=progress.next_review if not is_new else None,
                    global_difficulty_level=word.global_difficulty_level,
                )
            )

        if len(words) == 0:
            message = "No words due for review. Great work staying on top of your learning!"
        elif new_count > 0 and due_count > 0:
            message = f"Session ready: {due_count} due for review, {new_count} new words to learn."
        elif new_count > 0:
            message = f"Session ready: {new_count} new words to learn."
        else:
            message = f"Session ready: {due_count} words due for review."

        return ReviewSessionResponse(
            words=words,
            total_count=len(words),
            due_count=due_count,
            new_count=new_count,
            message=message,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load review session: {str(e)}"
        )


@router.post("/submit", response_model=ReviewSubmitResponse)
async def submit_review_result(
    review_data: ReviewResult,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReviewSubmitResponse:
    """
    Submit a single review result.
    Updates word progress with SM-2 algorithm based on recall quality.
    """
    try:
        if review_data.quality < 0 or review_data.quality > 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quality must be between 0 and 5"
            )

        progress, result_info = await ReviewService.submit_review(
            db,
            current_user.id,
            review_data.word_id,
            review_data.quality
        )

        DAILY_GOAL = 15
        today = date_type.today()
        goal_reached = False

        # Capture before any writes so streak comparison is always correct
        old_active_date = current_user.last_active_date

        # Only count words that graduated LEARNING → REVIEW
        # (marked Don't Know in Filter, then marked Know in Review session)
        if result_info['graduated']:
            if old_active_date != today:
                current_user.daily_words_reviewed = 0
            current_user.daily_words_reviewed += 1
            current_user.last_active_date = today

        # Check if the user just hit the daily goal for the first time today
        if current_user.daily_words_reviewed == DAILY_GOAL:
            goal_reached = True
            yesterday = today - timedelta(days=1)
            if old_active_date == yesterday:
                current_user.current_streak += 1
            else:
                current_user.current_streak = 1

        await db.commit()
        await db.refresh(current_user)

        return ReviewSubmitResponse(
            success=True,
            word_id=review_data.word_id,
            quality=result_info['quality'],
            next_review=result_info['next_review'],
            interval_days=result_info['interval_days'],
            status=result_info['status'],
            message=result_info['message'],
            daily_words_reviewed=current_user.daily_words_reviewed,
            current_streak=current_user.current_streak,
            daily_goal=DAILY_GOAL,
            goal_reached=goal_reached,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit review: {str(e)}"
        )


@router.get("/unit/{unit_number}", response_model=ReviewSessionResponse)
async def get_unit_words(
    unit_number: int,
    limit: int = Query(default=500, ge=1, le=500, description="Max words to return"),
    language: str = Query(default="en", description="Language filter: 'en' or 'he'"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReviewSessionResponse:
    """Get words for a specific unit."""
    if unit_number < 1 or unit_number > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unit number must be between 1 and 10"
        )

    try:
        word_entries = await ReviewService.get_unit_words(db, current_user.id, unit_number, limit, language)

        words = []
        new_count = 0

        for progress, word in word_entries:
            is_new = progress is None or progress.next_review is None
            if is_new:
                new_count += 1

            words.append(
                ReviewSessionWord(
                    word_id=word.id,
                    english=word.english,
                    hebrew=word.hebrew,
                    unit=word.unit,
                    is_new=is_new,
                    last_reviewed=progress.next_review if progress and not is_new else None,
                )
            )

        total_in_unit = len(words)

        return ReviewSessionResponse(
            words=words,
            total_count=len(words),
            due_count=len(words) - new_count,
            new_count=new_count,
            message=f"Unit {unit_number} – {total_in_unit} words available",
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load unit words: {str(e)}"
        )


@router.get("/learning/all")
async def get_all_learning_words(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return all words with LEARNING status across every unit for the current user."""
    try:
        stmt = (
            select(Word, UserWordProgress)
            .join(UserWordProgress, UserWordProgress.word_id == Word.id)
            .where(UserWordProgress.user_id == current_user.id)
            .where(UserWordProgress.status == WordStatus.LEARNING)
            .order_by(Word.unit, Word.id)
        )
        result = await db.execute(stmt)
        rows = result.all()

        words = [
            {
                "word_id": word.id,
                "english": word.english,
                "hebrew": word.hebrew,
                "unit": word.unit,
                "status": progress.status.value,
                "global_difficulty_level": word.global_difficulty_level,
            }
            for word, progress in rows
        ]
        return {"words": words, "total": len(words)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load learning words: {str(e)}")


@router.get("/learned/all")
async def get_all_learned_words(
    language: str = Query(default="en", description="Language filter: 'en' or 'he'"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return all REVIEW words across every unit for the current user.
    Only REVIEW status is included — MASTERED words were either marked directly
    as known in FilterMode (bypassing review) or have been fully mastered and no
    longer need practice. The quiz pool is strictly words that earned REVIEW status
    by going through the review session.
    Ordered so overdue words (next_review in the past) come first.
    """
    try:
        stmt = (
            select(Word, UserWordProgress)
            .join(UserWordProgress, UserWordProgress.word_id == Word.id)
            .where(UserWordProgress.user_id == current_user.id)
            .where(UserWordProgress.status == WordStatus.REVIEW)
            .where(Word.language == language)
            # Due / overdue words come first; far-future words at the end
            .order_by(UserWordProgress.next_review.asc().nullsfirst())
        )
        result = await db.execute(stmt)
        rows = result.all()

        words = [
            {
                "word_id": word.id,
                "english": word.english,
                "hebrew": word.hebrew,
                "unit": word.unit,
                "status": progress.status.value,
                "global_difficulty_level": word.global_difficulty_level,
                "next_review": progress.next_review.isoformat() if progress.next_review else None,
            }
            for word, progress in rows
        ]
        return {"words": words, "total": len(words)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load learned words: {str(e)}")


@router.get("/unit/{unit_number}/filter")
async def get_filter_words(
    unit_number: int,
    limit: int = Query(default=200, ge=1, le=500),
    language: str = Query(default="en", description="Language filter: 'en' or 'he'"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Get words for tinder-style filtering — only completely unseen words.
    Any word the user has already interacted with (known OR unknown) is excluded.
    """
    if unit_number < 1 or unit_number > 10:
        raise HTTPException(status_code=400, detail="Unit must be 1-10")

    try:
        stmt = (
            select(Word)
            .select_from(Word)
            .outerjoin(
                UserWordProgress,
                and_(
                    UserWordProgress.word_id == Word.id,
                    UserWordProgress.user_id == current_user.id,
                ),
            )
            .where(Word.unit == unit_number)
            .where(Word.language == language)
            .where(UserWordProgress.id.is_(None))   # no prior interaction at all
            .order_by(Word.id)
            .limit(limit)
        )
        result = await db.execute(stmt)
        words_rows = result.scalars().all()

        words = [
            {
                "word_id": word.id,
                "english": word.english,
                "hebrew": word.hebrew,
                "unit": word.unit,
                "status": "New",
                "global_difficulty_level": word.global_difficulty_level,
            }
            for word in words_rows
        ]
        return {"words": words, "total": len(words)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load filter words: {str(e)}")


@router.get("/unit/{unit_number}/learned")
async def get_learned_words(
    unit_number: int,
    language: str = Query(default="en", description="Language filter: 'en' or 'he'"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Get REVIEW or MASTERED words in a unit — used as source for quiz questions.
    """
    if unit_number < 1 or unit_number > 10:
        raise HTTPException(status_code=400, detail="Unit must be 1-10")

    try:
        stmt = (
            select(Word)
            .join(UserWordProgress, UserWordProgress.word_id == Word.id)
            .where(Word.unit == unit_number)
            .where(Word.language == language)
            .where(UserWordProgress.user_id == current_user.id)
            .where(UserWordProgress.status.in_([WordStatus.REVIEW, WordStatus.MASTERED]))
            .order_by(Word.id)
        )
        result = await db.execute(stmt)
        words = result.scalars().all()

        return {
            "words": [
                {"word_id": w.id, "english": w.english, "hebrew": w.hebrew, "unit": w.unit,
                 "global_difficulty_level": w.global_difficulty_level}
                for w in words
            ],
            "count": len(words),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load learned words: {str(e)}")


@router.get("/stats", response_model=ReviewStatsResponse)
async def get_review_statistics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReviewStatsResponse:
    """Get review statistics for dashboard display."""
    try:
        stats = await ReviewService.get_review_stats(db, current_user.id)

        return ReviewStatsResponse(
            due_count=stats["due_count"],
            new_count=stats["new_count"],
            total_reviews_today=stats["total_reviews_today"],
            next_review_time=stats["next_review_time"],
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get review stats: {str(e)}"
        )


@router.get("/sample")
async def get_word_sample(
    limit: int = Query(default=40, ge=10, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return a random sample of word pairs for decorative background display."""
    stmt = select(Word.english, Word.hebrew).order_by(func.random()).limit(limit)
    result = await db.execute(stmt)
    rows = result.all()
    return {"words": [{"english": r.english, "hebrew": r.hebrew} for r in rows]}
