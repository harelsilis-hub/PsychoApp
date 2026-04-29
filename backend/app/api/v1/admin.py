"""
Admin panel endpoints — completely open, no authentication required.
"""
from datetime import datetime, timedelta, timezone


from typing import Optional
from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from pydantic import BaseModel

from app.db.session import get_db, DIALECT
from app.models.word import Word
from app.models.user import User
from app.models.user_feedback import UserFeedback
from app.models.word_interaction_event import WordInteractionEvent
from app.models.user_word_progress import UserWordProgress, WordStatus
from app.models.association import Association
from app.models.point_event import PointEvent
from app.models.custom_word import CustomWord
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
    """Return all registered users with online users first."""
    result = await db.execute(select(User).order_by(User.id))
    users = result.scalars().all()
    online_cutoff = datetime.now(timezone.utc) - timedelta(minutes=5)

    def is_online(u: User) -> bool:
        if not u.last_seen:
            return False
        last_seen = u.last_seen if u.last_seen.tzinfo else u.last_seen.replace(tzinfo=timezone.utc)
        return last_seen >= online_cutoff

    # Sort: online users first, then by id
    sorted_users = sorted(users, key=lambda u: (0 if is_online(u) else 1, u.id))

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
                "is_online": is_online(u),
            }
            for u in sorted_users
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

class FlagWordBody(BaseModel):
    reason: Optional[str] = None


@router.post("/flag/{word_id}")
async def flag_word(
    word_id: int,
    body: Optional[FlagWordBody] = Body(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Flag a word as potentially containing a mistake."""
    word = await db.get(Word, word_id)
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    reason = (body.reason.strip() if body and body.reason else None)
    word_english = word.english
    await db.execute(
        text("UPDATE words SET is_flagged = true, flag_reason = :reason WHERE id = :word_id"),
        {"reason": reason, "word_id": word_id},
    )
    await db.commit()
    username = current_user.display_name or current_user.email
    reason_part = f"\nסיבה: {reason}" if reason else ""
    await notify_admins(db, "דיווח חדש על מילה 🚩", f"User {username} reported: {word_english}.{reason_part}")
    return {"success": True, "word_id": word_id, "flag_reason": reason}


# ── Online users count ────────────────────────────────────────────────────────

@router.get("/online-count")
async def get_online_count(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return number of users active in the last 5 minutes."""
    cutoff = datetime.utcnow() - timedelta(minutes=5)
    count = await db.scalar(
        select(func.count()).select_from(User).where(User.last_seen >= cutoff)
    )
    return {"online": count or 0}


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
            {"id": w.id, "english": w.english, "hebrew": w.hebrew, "unit": w.unit, "flag_reason": w.flag_reason}
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
    word.flag_reason = None
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
    if body.unit < 1 or body.unit > 11:
        raise HTTPException(status_code=400, detail="Unit must be between 1 and 11")
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


# ── Activity timeline ─────────────────────────────────────────────────────────

@router.get("/activity-timeline")
async def get_activity_timeline(
    mode: str = Query(default="week"),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return active user counts bucketed by hour (24h) or by day (week)."""
    if mode not in ("24h", "week"):
        mode = "week"
    now = datetime.utcnow()
    if mode == "24h":
        since = now - timedelta(hours=24)
        if DIALECT == "postgresql":
            sql = """
                SELECT TO_CHAR(created_at AT TIME ZONE 'Asia/Jerusalem', 'HH24:00') AS bucket,
                       COUNT(DISTINCT user_id) AS active_users
                FROM word_interaction_events
                WHERE created_at >= :since
                GROUP BY DATE_TRUNC('hour', created_at AT TIME ZONE 'Asia/Jerusalem')
                ORDER BY DATE_TRUNC('hour', created_at AT TIME ZONE 'Asia/Jerusalem') ASC
            """
        else:
            # SQLite approximation
            sql = """
                SELECT strftime('%H:00', datetime(created_at, '+3 hours')) AS bucket,
                       COUNT(DISTINCT user_id) AS active_users
                FROM word_interaction_events
                WHERE created_at >= :since
                GROUP BY strftime('%Y-%m-%d %H', datetime(created_at, '+3 hours'))
                ORDER BY strftime('%Y-%m-%d %H', datetime(created_at, '+3 hours')) ASC
            """
        rows = await db.execute(text(sql), {"since": since})
    else:
        since = now - timedelta(days=7)
        if DIALECT == "postgresql":
            sql = """
                SELECT (created_at AT TIME ZONE 'Asia/Jerusalem')::date AS bucket,
                       COUNT(DISTINCT user_id) AS active_users
                FROM word_interaction_events
                WHERE created_at >= :since
                GROUP BY (created_at AT TIME ZONE 'Asia/Jerusalem')::date
                ORDER BY (created_at AT TIME ZONE 'Asia/Jerusalem')::date ASC
            """
        else:
            # SQLite approximation
            sql = """
                SELECT date(created_at, '+3 hours') AS bucket,
                       COUNT(DISTINCT user_id) AS active_users
                FROM word_interaction_events
                WHERE created_at >= :since
                GROUP BY date(created_at, '+3 hours')
                ORDER BY date(created_at, '+3 hours') ASC
            """
        rows = await db.execute(text(sql), {"since": since})
    data = [{"bucket": str(row.bucket), "active_users": row.active_users} for row in rows]
    total_result = await db.execute(
        text("SELECT COUNT(DISTINCT user_id) FROM word_interaction_events WHERE created_at >= :since"),
        {"since": since},
    )
    total_unique = total_result.scalar() or 0
    return {"timeline": data, "mode": mode, "total_unique_users": total_unique}


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


# ── Custom Words Moderation Queue ─────────────────────────────────────────────

@router.get("/custom-words")
async def get_custom_word_queue(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    List all pending custom word submissions.
    Each entry includes an `already_in_db` flag to warn if the English word
    already exists in the main words table (case-insensitive).
    """
    # Fetch pending custom words, newest first
    stmt = (
        select(CustomWord, User.email.label("user_email"))
        .join(User, CustomWord.user_id == User.id)
        .where(CustomWord.admin_status == "pending")
        .order_by(CustomWord.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    rows = result.all()

    # Count total pending
    total_stmt = select(func.count(CustomWord.id)).where(CustomWord.admin_status == "pending")
    total_pending = await db.scalar(total_stmt) or 0

    items = []
    for cw, user_email in rows:
        # Check if the word already exists in the main words table (case-insensitive)
        duplicate_stmt = select(func.count(Word.id)).where(
            func.lower(Word.english) == func.lower(cw.english_word)
        )
        dup_count = await db.scalar(duplicate_stmt) or 0
        items.append({
            "id": cw.id,
            "english": cw.english_word,
            "hebrew": cw.hebrew_translation,
            "language": cw.language,
            "user_email": user_email,
            "created_at": cw.created_at.isoformat(),
            "already_in_db": dup_count > 0,
        })

    return {"words": items, "total_pending": total_pending, "skip": skip, "limit": limit}


@router.post("/custom-words/{word_id}/approve")
async def approve_custom_word(
    word_id: int,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Approve a custom word submission: adds it to the main words table (Unit 11)
    and marks the custom_word row as approved.
    Blocks if the word already exists in the main DB.
    """
    cw = await db.get(CustomWord, word_id)
    if not cw:
        raise HTTPException(status_code=404, detail="Custom word not found")
    if cw.admin_status != "pending":
        raise HTTPException(status_code=400, detail=f"Word already {cw.admin_status}")

    # Guard: check for duplicate in main words table
    dup_count = await db.scalar(
        select(func.count(Word.id)).where(
            func.lower(Word.english) == func.lower(cw.english_word)
        )
    ) or 0
    if dup_count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"'{cw.english_word}' already exists in the main dictionary"
        )

    # Insert into main words table as Unit 11
    new_word = Word(
        english=cw.english_word.strip(),
        hebrew=cw.hebrew_translation.strip(),
        unit=11,
    )
    db.add(new_word)
    cw.admin_status = "approved"
    await db.commit()
    await db.refresh(new_word)

    return {
        "success": True,
        "word_id": new_word.id,
        "english": new_word.english,
        "hebrew": new_word.hebrew,
        "unit": new_word.unit,
    }


@router.post("/custom-words/{word_id}/reject")
async def reject_custom_word(
    word_id: int,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Mark a custom word submission as rejected (will no longer appear in the queue)."""
    cw = await db.get(CustomWord, word_id)
    if not cw:
        raise HTTPException(status_code=404, detail="Custom word not found")
    if cw.admin_status != "pending":
        raise HTTPException(status_code=400, detail=f"Word already {cw.admin_status}")
    cw.admin_status = "rejected"
    await db.commit()
    return {"success": True, "word_id": word_id}
