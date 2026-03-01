"""
Admin panel endpoints — completely open, no authentication required.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from app.db.session import get_db
from app.models.word import Word
from app.models.user import User
from app.auth.dependencies import get_current_user, require_admin

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


# ── User-facing: flag a word as having a mistake ──────────────────────────────

@router.post("/flag/{word_id}")
async def flag_word(
    word_id: int,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Flag a word as potentially containing a mistake."""
    word = await db.get(Word, word_id)
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    word.is_flagged = True
    await db.commit()
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
