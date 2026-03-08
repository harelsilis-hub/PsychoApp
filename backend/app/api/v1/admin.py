"""
Admin panel endpoints — completely open, no authentication required.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from pydantic import BaseModel

from app.db.session import get_db
from app.models.word import Word
from app.models.user import User
from app.models.user_feedback import UserFeedback
from app.models.word_interaction_event import WordInteractionEvent
from app.models.user_word_progress import UserWordProgress, WordStatus
from app.models.association import Association
from app.models.point_event import PointEvent
from app.services.gamification import get_level_info
from app.auth.dependencies import get_current_user, require_admin
from app.api.v1.push import notify_admins

router = APIRouter()


class WordEditBody(BaseModel):
    english: Optional[str] = None
    hebrew: Optional[str] = None


class WordCreateBody(BaseModel):
    english: str
    hebrew: str
    unit: int


# ── Users list ───────────────────────────────────────────────────────────────

@router.get("/users")
async def get_users(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return all registered users ordered by registration date."""
    result = await db.execute(select(User).order_by(User.id))
    users = result.scalars().all()
    return {
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "current_streak": u.current_streak,
                "daily_words_reviewed": u.daily_words_reviewed,
                "last_active_date": u.last_active_date.isoformat() if u.last_active_date else None,
                "xp": u.xp,
                "level": u.level,
            }
            for u in users
        ],
        "count": len(users),
    }


# ── Delete user ───────────────────────────────────────────────────────────────

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Permanently delete a user and all their data."""
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    await db.commit()
    return {"success": True, "deleted_id": user_id}


# ── User-facing: flag a word as having a mistake ──────────────────────────────

@router.post("/flag/{word_id}")
async def flag_word(
    word_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Flag a word as potentially containing a mistake."""
    word = await db.get(Word, word_id)
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    word.is_flagged = True
    await db.commit()
    username = current_user.display_name or current_user.email
    await notify_admins(db, "דיווח חדש על מילה 🚩", f"User {username} reported: {word.english}.")
    return {"success": True, "word_id": word_id}


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return total word count and number of flagged words."""
    total = await db.scalar(select(func.count()).select_from(Word))
    flagged = await db.scalar(
        select(func.count()).select_from(Word).where(Word.is_flagged == True)  # noqa: E712
    )
    return {"total_words": total or 0, "flagged_count": flagged or 0}


# ── Flagged inbox ─────────────────────────────────────────────────────────────

@router.get("/flagged")
async def get_flagged_words(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return all words currently flagged for review."""
    result = await db.execute(
        select(Word).where(Word.is_flagged == True).order_by(Word.unit, Word.id)  # noqa: E712
    )
    words = result.scalars().all()
    return {
        "words": [
            {"id": w.id, "english": w.english, "hebrew": w.hebrew, "unit": w.unit}
            for w in words
        ],
        "count": len(words),
    }


# ── Dictionary search ─────────────────────────────────────────────────────────

@router.get("/words/search")
async def search_words(
    q: str = Query(..., min_length=1, description="Search English or Hebrew"),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Search any word by English or Hebrew text (partial match, max 50 results)."""
    pattern = f"%{q}%"
    result = await db.execute(
        select(Word)
        .where(Word.english.ilike(pattern) | Word.hebrew.ilike(pattern))
        .order_by(Word.unit, Word.id)
        .limit(50)
    )
    words = result.scalars().all()
    return {
        "words": [
            {
                "id": w.id,
                "english": w.english,
                "hebrew": w.hebrew,
                "unit": w.unit,
                "is_flagged": w.is_flagged,
            }
            for w in words
        ],
        "count": len(words),
    }


# ── Edit word (auto-unflag on save) ───────────────────────────────────────────

@router.patch("/words/{word_id}")
async def edit_word(
    word_id: int,
    body: WordEditBody,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Update a word's English or Hebrew text and clear its flag."""
    word = await db.get(Word, word_id)
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    if body.english is not None:
        word.english = body.english.strip()
    if body.hebrew is not None:
        word.hebrew = body.hebrew.strip()
    word.is_flagged = False
    await db.commit()
    await db.refresh(word)
    return {"success": True, "id": word.id, "english": word.english, "hebrew": word.hebrew, "unit": word.unit}


# ── Delete word ───────────────────────────────────────────────────────────────

@router.delete("/words/{word_id}")
async def delete_word(
    word_id: int,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Permanently delete a word and all associated progress records."""
    word = await db.get(Word, word_id)
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    await db.delete(word)
    await db.commit()
    return {"success": True, "deleted_id": word_id}


# ── Add new word ──────────────────────────────────────────────────────────────

@router.post("/words")
async def add_word(
    body: WordCreateBody,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Add a brand-new word to the dictionary."""
    if body.unit < 1 or body.unit > 10:
        raise HTTPException(status_code=400, detail="Unit must be between 1 and 10")
    word = Word(english=body.english.strip(), hebrew=body.hebrew.strip(), unit=body.unit)
    db.add(word)
    await db.commit()
    await db.refresh(word)
    return {
        "success": True,
        "id": word.id,
        "english": word.english,
        "hebrew": word.hebrew,
        "unit": word.unit,
    }


# ── Feedback: user submit ─────────────────────────────────────────────────────

class FeedbackBody(BaseModel):
    message: str
    category: str = "general"   # "bug" | "idea" | "general"


@router.post("/feedback")
async def submit_feedback(
    body: FeedbackBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Any authenticated user can submit a feedback note."""
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    fb = UserFeedback(
        user_id=current_user.id,
        user_email=current_user.email,
        category=body.category,
        message=body.message.strip(),
    )
    db.add(fb)
    await db.commit()
    username = current_user.display_name or current_user.email
    await notify_admins(db, "פידבק חדש התקבל 💬", f"User {username} sent new feedback.")
    return {"success": True}


# ── Feedback: admin read ──────────────────────────────────────────────────────

@router.get("/feedback")
async def get_feedback(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return all feedback notes, newest first."""
    result = await db.execute(
        select(UserFeedback).order_by(UserFeedback.created_at.desc())
    )
    items = result.scalars().all()
    return {
        "feedback": [
            {
                "id": f.id,
                "user_email": f.user_email,
                "category": f.category,
                "message": f.message,
                "is_read": f.is_read,
                "created_at": f.created_at.isoformat() if f.created_at else None,
            }
            for f in items
        ],
        "unread_count": sum(1 for f in items if not f.is_read),
    }


@router.patch("/feedback/{feedback_id}/read")
async def mark_feedback_read(
    feedback_id: int,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Mark a feedback note as read."""
    fb = await db.get(UserFeedback, feedback_id)
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")
    fb.is_read = True
    await db.commit()
    return {"success": True}


# ── Retroactive XP recalculation ─────────────────────────────────────────────

@router.post("/recalculate-xp")
async def recalculate_xp(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Replay WordInteractionEvent + UserWordProgress + Association records to seed XP for all users."""
    OUTCOME_POINTS = {
        "known": 30, "unknown": 10,
        "1": 10, "2": 10, "3": 50, "4": 80, "5": 120,
    }

    # Wipe all retroactive events first to allow safe re-runs
    await db.execute(
        text("DELETE FROM point_events WHERE source LIKE 'retroactive_%'")
    )

    users_result = await db.execute(select(User))
    users = users_result.scalars().all()
    updated = 0

    for user in users:
        total_xp = 0

        # 1. WordInteractionEvents
        events_result = await db.execute(
            select(WordInteractionEvent).where(WordInteractionEvent.user_id == user.id)
        )
        events = events_result.scalars().all()
        for ev in events:
            pts = OUTCOME_POINTS.get(str(ev.outcome), 0)
            if pts:
                db.add(PointEvent(
                    user_id=user.id,
                    source=f"retroactive_{ev.interaction_type}_{ev.outcome}",
                    base_points=pts,
                    multiplier=1.0,
                    final_points=pts,
                ))
                total_xp += pts

        # 2. REVIEW status words (graduated from LEARNING)
        review_count = await db.scalar(
            select(func.count(UserWordProgress.id)).where(
                UserWordProgress.user_id == user.id,
                UserWordProgress.status == WordStatus.REVIEW,
            )
        ) or 0
        if review_count:
            db.add(PointEvent(user_id=user.id, source="retroactive_graduation_review",
                              base_points=150, multiplier=1.0, final_points=150 * review_count))
            total_xp += 150 * review_count

        # 3. MASTERED words
        mastered_count = await db.scalar(
            select(func.count(UserWordProgress.id)).where(
                UserWordProgress.user_id == user.id,
                UserWordProgress.status == WordStatus.MASTERED,
            )
        ) or 0
        if mastered_count:
            db.add(PointEvent(user_id=user.id, source="retroactive_graduation_mastered",
                              base_points=300, multiplier=1.0, final_points=300 * mastered_count))
            total_xp += 300 * mastered_count

        # 4. Community associations posted
        assoc_count = await db.scalar(
            select(func.count(Association.id)).where(Association.user_id == user.id)
        ) or 0
        if assoc_count:
            db.add(PointEvent(user_id=user.id, source="retroactive_association_posted",
                              base_points=50, multiplier=1.0, final_points=50 * assoc_count))
            total_xp += 50 * assoc_count

        user.xp = total_xp
        updated += 1

    await db.commit()
    return {"success": True, "users_updated": updated}


# ── ONE-TIME: strip trailing hyphens from english words ───────────────────────

@router.post("/fix-hyphens")
async def fix_hyphens(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """One-time fix: remove trailing hyphens from english field."""
    result = await db.execute(
        text("UPDATE words SET english = TRIM(TRAILING '-' FROM TRIM(english)) WHERE english LIKE '%-'")
    )
    await db.commit()
    return {"success": True, "rows_updated": result.rowcount}
