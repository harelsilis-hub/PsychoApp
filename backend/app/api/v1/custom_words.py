"""
Custom Words API — user-owned vocabulary cards with full SM-2 spaced repetition.
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.models.custom_word import CustomWord
from app.models.user_word_progress import WordStatus
from app.services.review_service import ReviewService
from app.auth.dependencies import get_current_user

router = APIRouter()


class CreateCustomWordRequest(BaseModel):
    english_word: str
    hebrew_translation: str
    language: str = "en"


class SubmitCustomReviewRequest(BaseModel):
    word_id: int   # the custom_word.id
    quality: int   # 0–5 SM-2 quality rating


# ── Helpers ────────────────────────────────────────────────────────────────────

def _word_to_dict(w: CustomWord) -> dict:
    return {
        "id": w.id,
        "english_word": w.english_word,
        "hebrew_translation": w.hebrew_translation,
        "language": w.language,
        "status": w.status.value,
        "next_review": w.next_review.isoformat() if w.next_review else None,
        "created_at": w.created_at.isoformat(),
    }


# ── CRUD ───────────────────────────────────────────────────────────────────────

@router.get("")
async def list_custom_words(
    language: str = Query(default="en", description="Language filter: 'en' or 'he'"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """List all custom words for the current user filtered by language."""
    stmt = (
        select(CustomWord)
        .where(CustomWord.user_id == current_user.id)
        .where(CustomWord.language == language)
        .order_by(CustomWord.created_at.desc())
    )
    result = await db.execute(stmt)
    words = result.scalars().all()
    return {"words": [_word_to_dict(w) for w in words], "total": len(words)}


@router.post("")
async def create_custom_word(
    data: CreateCustomWordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Add a new custom word. It starts in LEARNING status, ready for review."""
    english = data.english_word.strip()
    hebrew  = data.hebrew_translation.strip()
    if not english or not hebrew:
        raise HTTPException(status_code=400, detail="Both fields are required")

    word = CustomWord(
        user_id=current_user.id,
        language=data.language,
        english_word=english,
        hebrew_translation=hebrew,
        status=WordStatus.LEARNING,
        srs_data={"repetition_number": 0, "easiness_factor": 2.5, "interval_days": 0},
        created_at=datetime.utcnow(),
    )
    db.add(word)
    await db.commit()
    await db.refresh(word)
    return _word_to_dict(word)


@router.delete("/{word_id}")
async def delete_custom_word(
    word_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete a custom word (user must own it)."""
    stmt = select(CustomWord).where(
        CustomWord.id == word_id,
        CustomWord.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    word = result.scalar_one_or_none()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    await db.delete(word)
    await db.commit()
    return {"success": True}


# ── Stats ──────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats(
    language: str = Query(default="en", description="Language filter: 'en' or 'he'"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Stats for the 'My Words' unit tile on the dashboard."""
    total_stmt = select(func.count(CustomWord.id)).where(
        CustomWord.user_id == current_user.id,
        CustomWord.language == language,
    )
    learned_stmt = select(func.count(CustomWord.id)).where(
        CustomWord.user_id == current_user.id,
        CustomWord.language == language,
        CustomWord.status.in_([WordStatus.REVIEW, WordStatus.MASTERED]),
    )
    total   = (await db.execute(total_stmt)).scalar() or 0
    learned = (await db.execute(learned_stmt)).scalar() or 0
    percent = round((learned / total) * 100) if total > 0 else 0
    return {"total": total, "learned": learned, "percent": percent}


# ── Review session ─────────────────────────────────────────────────────────────

@router.get("/review")
async def get_review_words(
    language: str = Query(default="en", description="Language filter: 'en' or 'he'"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Get custom words that need review:
      - All LEARNING words (not yet graduated)
      - REVIEW words whose next_review is due (past or now)
    """
    stmt = (
        select(CustomWord)
        .where(CustomWord.user_id == current_user.id)
        .where(CustomWord.language == language)
        .where(
            or_(
                CustomWord.status == WordStatus.LEARNING,
                (CustomWord.status == WordStatus.REVIEW)
                & (CustomWord.next_review <= func.now()),
            )
        )
        .order_by(CustomWord.next_review.asc().nullslast())
    )
    result = await db.execute(stmt)
    words = result.scalars().all()

    return {
        "words": [
            {
                "word_id": w.id,
                "english": w.english_word,
                "hebrew": w.hebrew_translation,
                "status": w.status.value,
                "is_new": w.next_review is None,
            }
            for w in words
        ],
        "total": len(words),
    }


@router.get("/quiz")
async def get_quiz_words(
    language: str = Query(default="en", description="Language filter: 'en' or 'he'"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get REVIEW + MASTERED custom words for the quiz (due words first)."""
    stmt = (
        select(CustomWord)
        .where(CustomWord.user_id == current_user.id)
        .where(CustomWord.language == language)
        .where(CustomWord.status.in_([WordStatus.REVIEW, WordStatus.MASTERED]))
        .order_by(CustomWord.next_review.asc().nullsfirst())
    )
    result = await db.execute(stmt)
    words = result.scalars().all()

    return {
        "words": [
            {
                "word_id": w.id,
                "english": w.english_word,
                "hebrew": w.hebrew_translation,
                "status": w.status.value,
                "next_review": w.next_review.isoformat() if w.next_review else None,
            }
            for w in words
        ],
        "total": len(words),
    }


@router.post("/review/submit")
async def submit_review(
    data: SubmitCustomReviewRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Submit a SM-2 review result for a custom word.
    Uses the exact same SM-2 algorithm as regular word reviews.
    """
    if data.quality < 0 or data.quality > 5:
        raise HTTPException(status_code=400, detail="Quality must be 0–5")

    stmt = select(CustomWord).where(
        CustomWord.id == data.word_id,
        CustomWord.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    word = result.scalar_one_or_none()
    if not word:
        raise HTTPException(status_code=404, detail="Custom word not found")

    srs = word.srs_data or {"repetition_number": 0, "easiness_factor": 2.5, "interval_days": 0}
    new_rep, new_ef, new_interval = ReviewService.calculate_sm2(
        data.quality,
        srs.get("repetition_number", 0),
        srs.get("easiness_factor", 2.5),
        srs.get("interval_days", 0),
    )

    word.srs_data    = {"repetition_number": new_rep, "easiness_factor": new_ef, "interval_days": new_interval}
    word.next_review = datetime.utcnow() + timedelta(days=new_interval)

    old_status = word.status
    if word.status == WordStatus.LEARNING and data.quality >= 3 and new_rep > 0:
        word.status = WordStatus.REVIEW
    if new_rep >= 8 and new_interval >= 180:
        word.status = WordStatus.MASTERED

    await db.commit()
    await db.refresh(word)

    return {
        "success":      True,
        "status":       word.status.value,
        "next_review":  word.next_review.isoformat() if word.next_review else None,
        "interval_days": new_interval,
        "graduated":    old_status == WordStatus.LEARNING and word.status == WordStatus.REVIEW,
        # Stubs so ReviewSession/Quiz callers don't crash on missing fields
        "goal_reached": False,
        "xp_earned":    0,
        "level_up":     False,
        "new_level_title": None,
        "new_badges":   [],
    }
