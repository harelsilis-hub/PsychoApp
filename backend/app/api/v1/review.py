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
from app.services.gamification import award_xp, check_and_award_badges, POINTS
from app.schemas.progress import ReviewResult
from app.schemas.review import (
    ReviewSessionResponse,
    ReviewSessionWord,
    ReviewSubmitResponse,
    ReviewStatsResponse,
    AcquisitionSubmitRequest,
    AcquisitionSubmitResponse,
)
from app.auth.dependencies import get_current_user

router = APIRouter()


@router.get("/session", response_model=ReviewSessionResponse)
async def get_review_session(
    limit: int = Query(default=20, ge=1, le=100, description="Max words per session"),
    language: str = Query(default="en", description="Language filter: 'en' or 'he'"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReviewSessionResponse:
    """
    Get a batch of words for review session.
    Returns words due for review + new learning words up to limit.
    """
    try:
        progress_word_pairs = await ReviewService.get_due_words(db, current_user.id, limit, language)

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
        yesterday = today - timedelta(days=1)
        goal_reached = False
        is_daily = review_data.is_daily

        # ── Always update last_active_date (any Phase 2 action = activity) ──
        # Also reset daily counter at day boundary so Phase 1 actions that
        # happen earlier in the day don't inflate the Phase 2 counter.
        if current_user.last_active_date != today:
            current_user.daily_words_reviewed = 0
        current_user.last_active_date = today

        # ── Lazy streak reset ──────────────────────────────────────────────
        # Streak requires completing the daily-review goal; if the user
        # skipped yesterday's daily review, reset regardless of Phase 1 work.
        if (
            current_user.current_streak > 0
            and current_user.last_goal_date is not None
            and current_user.last_goal_date < yesterday
        ):
            current_user.current_streak = 0

        # ── Daily goal + streak (Phase 2 daily review correct answers only) ─
        # Phase 1 (acquisition) answers do NOT count toward the streak goal.
        if is_daily and review_data.quality >= 3:
            daily_before = current_user.daily_words_reviewed
            current_user.daily_words_reviewed += 1

            if daily_before < DAILY_GOAL and current_user.daily_words_reviewed >= DAILY_GOAL:
                goal_reached = True
                if current_user.last_goal_date == yesterday:
                    current_user.current_streak += 1
                elif current_user.last_goal_date != today:
                    current_user.current_streak = 1
                # last_goal_date == today → already reached today, streak unchanged
                current_user.last_goal_date = today

        # ── Award XP ─────────────────────────────────────────────────────────
        quality = review_data.quality
        total_xp_earned = 0
        level_up = False
        new_level_info = None

        if is_daily:
            # Phase 2: 3× weighted daily-review points
            xp_source = f"daily_review_q{max(0, min(quality, 5))}"
            base_pts = POINTS.get(xp_source, POINTS["daily_review_q1"])
        else:
            # Legacy review session (ReviewSession / flashcards)
            xp_source = f"review_q{max(1, min(quality, 5))}"
            base_pts = POINTS.get(xp_source, 10)

        xp_result = await award_xp(db, current_user, xp_source, base_pts)
        total_xp_earned += xp_result["xp_earned"]
        if xp_result["level_up"]:
            level_up = True
        new_level_info = xp_result["new_level_info"]

        # Legacy graduation bonus (only fires in old review flow, not Phase 2)
        if result_info.get("graduated") and not is_daily:
            r2 = await award_xp(db, current_user, "graduation_review", POINTS["graduation_review"])
            total_xp_earned += r2["xp_earned"]
            if r2["level_up"]:
                level_up = True
            new_level_info = r2["new_level_info"]

        if result_info.get("status") == "Mastered":
            r3 = await award_xp(db, current_user, "graduation_mastered", POINTS["graduation_mastered"])
            total_xp_earned += r3["xp_earned"]
            if r3["level_up"]:
                level_up = True
            new_level_info = r3["new_level_info"]

        if goal_reached:
            r4 = await award_xp(db, current_user, "daily_goal", POINTS["daily_goal"])
            total_xp_earned += r4["xp_earned"]
            if r4["level_up"]:
                level_up = True
            new_level_info = r4["new_level_info"]

        new_badges = await check_and_award_badges(db, current_user)

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
            xp_earned=total_xp_earned,
            new_xp=current_user.xp,
            level_up=level_up,
            new_level_title=new_level_info["title"] if new_level_info else None,
            new_badges=new_badges,
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
    language: str = Query(default="en", description="Language filter: 'en' or 'he'"),
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
            .where(Word.language == language)
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


@router.get("/unit/{unit_number}/acquisition")
async def get_acquisition_words(
    unit_number: int,
    language: str = Query(default="en", description="Language filter: 'en' or 'he'"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Phase 1 – Unit Acquisition Quiz.
    Returns words in the unit that are still in learning_state='learning'.
    Only words the user has previously categorised as 'don't know' in FilterMode
    will appear here; fully-unseen words are handled by FilterMode first.
    """
    if unit_number < 1 or unit_number > 10:
        raise HTTPException(status_code=400, detail="Unit must be 1-10")

    try:
        pairs = await ReviewService.get_acquisition_words(db, current_user.id, unit_number, language)

        words = [
            {
                "word_id": word.id,
                "english": word.english,
                "hebrew": word.hebrew,
                "unit": word.unit,
                "learning_state": progress.learning_state,
                "global_difficulty_level": word.global_difficulty_level,
            }
            for progress, word in pairs
        ]
        return {"words": words, "total": len(words)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load acquisition words: {str(e)}")


@router.post("/acquisition/submit", response_model=AcquisitionSubmitResponse)
async def submit_acquisition_result(
    data: AcquisitionSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AcquisitionSubmitResponse:
    """
    Phase 1 – Unit Acquisition Quiz submit.

    quality >= 3 (correct): graduates the word into Phase 2 SM-2 queue with
      next_review = tomorrow, repetition=1, ease_factor=2.5.
    quality < 3 (incorrect): word stays in 'learning' and reappears next session.
    """
    try:
        progress, graduated = await ReviewService.graduate_word(
            db, current_user.id, data.word_id, data.quality
        )

        # ── Always update last_active_date (Phase 1 counts as activity) ──────
        from datetime import date as _date
        today = _date.today()
        if current_user.last_active_date != today:
            current_user.daily_words_reviewed = 0  # reset at day boundary
        current_user.last_active_date = today
        # NOTE: daily_words_reviewed and streak are NOT updated here.
        # Phase 1 work does not count toward the streak goal — only
        # Phase 2 Daily Review correct answers build the streak.

        xp_earned = 0
        level_up = False
        new_level_info = None

        if graduated:
            # Phase 1 graduation XP — intentionally lower than Phase 2 per-answer XP
            xp_result = await award_xp(db, current_user, "acquisition_correct", POINTS["acquisition_correct"])
            xp_earned = xp_result["xp_earned"]
            level_up = xp_result["level_up"]
            new_level_info = xp_result["new_level_info"]

        new_badges = await check_and_award_badges(db, current_user)
        await db.commit()
        await db.refresh(current_user)

        if graduated:
            message = "Word graduated! It will appear in tomorrow's daily review."
        else:
            message = "Keep trying! You'll see this word again."

        return AcquisitionSubmitResponse(
            success=True,
            word_id=data.word_id,
            quality=data.quality,
            graduated=graduated,
            learning_state=progress.learning_state,
            next_review=progress.next_review,
            message=message,
            xp_earned=xp_earned,
            new_xp=current_user.xp,
            level_up=level_up,
            new_level_title=new_level_info["title"] if new_level_info else None,
            new_badges=new_badges,
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit acquisition result: {str(e)}")


@router.get("/daily", response_model=ReviewSessionResponse)
async def get_daily_review_session(
    limit: int = Query(default=20, ge=1, le=500, description="Max words per session"),
    language: str = Query(default="en", description="Language filter: 'en' or 'he'"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReviewSessionResponse:
    """
    Phase 2 – Global Daily Review (SM-2).
    Returns graduated words whose next_review date is today or past due.
    Not filtered by unit. Submit answers to POST /review/submit as usual.
    """
    try:
        pairs = await ReviewService.get_daily_review_words(db, current_user.id, limit, language)

        words = [
            ReviewSessionWord(
                word_id=word.id,
                english=word.english,
                hebrew=word.hebrew,
                unit=word.unit,
                is_new=False,
                last_reviewed=progress.next_review,
                global_difficulty_level=word.global_difficulty_level,
            )
            for progress, word in pairs
        ]

        if not words:
            message = "No words due for review today. Check back tomorrow!"
        else:
            message = f"Daily review ready: {len(words)} word(s) due."

        return ReviewSessionResponse(
            words=words,
            total_count=len(words),
            due_count=len(words),
            new_count=0,
            message=message,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load daily review: {str(e)}")


@router.get("/daily/count")
async def get_daily_review_count(
    language: str = Query(default="en", description="Language filter: 'en' or 'he'"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Fast count of graduated words due for daily review. Used by Dashboard banner."""
    count = await db.scalar(
        select(func.count(UserWordProgress.id))
        .join(Word, UserWordProgress.word_id == Word.id)
        .where(UserWordProgress.user_id == current_user.id)
        .where(Word.language == language)
        .where(UserWordProgress.learning_state == "graduated")
        .where(UserWordProgress.next_review <= func.now())
    )
    return {"count": count or 0}


@router.get("/cram", response_model=ReviewSessionResponse)
async def get_cram_session(
    limit: int = Query(default=20, ge=1, le=50),
    language: str = Query(default="en", description="Language filter: 'en' or 'he'"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReviewSessionResponse:
    """
    Cram Mode – stateless extra practice.
    Returns up to `limit` graduated words ordered by lowest ease_factor (weakest first).
    SM-2 state is never modified by this endpoint or its submit partner.
    """
    try:
        stmt = (
            select(UserWordProgress, Word)
            .join(Word, UserWordProgress.word_id == Word.id)
            .where(UserWordProgress.user_id == current_user.id)
            .where(UserWordProgress.learning_state == "graduated")
            .where(Word.language == language)
            .limit(500)
        )
        result = await db.execute(stmt)
        pairs = result.all()

        # Sort by easiness_factor ascending — weakest words first
        pairs.sort(key=lambda row: (row[0].srs_data or {}).get("easiness_factor", 2.5))
        pairs = pairs[:limit]

        words = [
            ReviewSessionWord(
                word_id=word.id,
                english=word.english,
                hebrew=word.hebrew,
                unit=word.unit,
                is_new=False,
                last_reviewed=progress.next_review,
                global_difficulty_level=word.global_difficulty_level,
            )
            for progress, word in pairs
        ]

        return ReviewSessionResponse(
            words=words,
            total_count=len(words),
            due_count=len(words),
            new_count=0,
            message=f"Cram session ready: {len(words)} weakest words.",
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load cram session: {str(e)}")


@router.post("/cram/submit")
async def submit_cram_result(
    data: AcquisitionSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Cram Mode – stateless submit.
    Awards XP and updates last_active_date.
    DOES NOT modify next_review_date, interval, repetitions, or ease_factor.
    """
    try:
        progress = await db.scalar(
            select(UserWordProgress)
            .where(UserWordProgress.user_id == current_user.id)
            .where(UserWordProgress.word_id == data.word_id)
        )
        if not progress:
            raise HTTPException(status_code=404, detail="Word progress not found")

        from datetime import date as _date
        today = _date.today()
        if current_user.last_active_date != today:
            current_user.daily_words_reviewed = 0
        current_user.last_active_date = today

        xp_source = f"cram_q{max(0, min(data.quality, 5))}"
        base_pts = POINTS.get(xp_source, POINTS["cram_q3"])

        xp_result = await award_xp(db, current_user, xp_source, base_pts)
        new_badges = await check_and_award_badges(db, current_user)

        await db.commit()
        await db.refresh(current_user)

        return {
            "success": True,
            "word_id": data.word_id,
            "quality": data.quality,
            "xp_earned": xp_result["xp_earned"],
            "new_xp": current_user.xp,
            "level_up": xp_result["level_up"],
            "new_level_title": xp_result["new_level_info"]["title"] if xp_result.get("new_level_info") else None,
            "new_badges": new_badges,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit cram result: {str(e)}")


@router.get("/sample")
async def get_word_sample(
    limit: int = Query(default=40, ge=10, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return a random sample of word pairs for decorative background display."""
    import random as _random
    # Use random offset instead of ORDER BY random() — avoids full-table sort
    total = await db.scalar(select(func.count()).select_from(Word)) or 1
    offset = _random.randint(0, max(0, total - limit))
    stmt = select(Word.english, Word.hebrew).offset(offset).limit(limit)
    result = await db.execute(stmt)
    rows = result.all()
    return {"words": [{"english": r.english, "hebrew": r.hebrew} for r in rows]}
