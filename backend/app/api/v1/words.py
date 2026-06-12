"""
Words API endpoints.

Currently exposes the admin/utility difficulty recalculation endpoint.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db.session import get_db
from app.models.user import User
from app.models.word import Word
from app.services.difficulty import DifficultyService
from app.auth.dependencies import get_current_user
from app.services.gamification import award_xp, check_and_award_badges, POINTS

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

import random
import json as _json
from sqlalchemy import select, func

class SentenceCompletionQuestion(BaseModel):
    word_id: int
    english: str
    hebrew: str
    sentence: str
    word_form: str   # the exact form of english that appears in the sentence
    options: list[str]  # 4 options using word_form for the correct one

@router.get("/sentence-completion", response_model=list[SentenceCompletionQuestion])
async def get_sentence_completion_questions(
    limit: int = 10,
    language: str = "en",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SentenceCompletionQuestion]:
    """
    Fetch random words that have a sentence generated (ai_association),
    along with 3 random distractor options.
    """
    # 1. Fetch weakest "graduated" words (same as Cram Mode logic)
    from app.models.user_word_progress import UserWordProgress
    
    stmt = (
        select(Word, UserWordProgress)
        .join(UserWordProgress, UserWordProgress.word_id == Word.id)
        .where(UserWordProgress.user_id == current_user.id)
        .where(UserWordProgress.learning_state == "graduated")
        .where(Word.ai_association.isnot(None))
        .where(Word.ai_association.like('%"word_form"%'))
        .where(~Word.english.like('%...%'))
        .where(Word.language == language)
        .limit(500)
    )
    
    result = await db.execute(stmt)
    pairs = result.all()
    
    if not pairs:
        return []
        
    # Sort by easiness_factor ascending — weakest words first
    pairs.sort(key=lambda row: (row[1].srs_data or {}).get("easiness_factor") or 2.5)
    
    # Take a larger pool of weak words (up to 100) so we don't repeat the exact same words every single game
    weak_pool = pairs[:100]
    
    # Extract just the words
    words_pool = [p[0] for p in weak_pool]
    
    # Randomly select 'limit' words from this weak pool
    import random
    if len(words_pool) <= limit:
        words = words_pool
        random.shuffle(words)
    else:
        words = random.sample(words_pool, limit)
    
    if not words:
        return []
    
    # 2. Fetch a pool of distractors from the user's active words
    distractor_stmt = (
        select(Word.english)
        .join(UserWordProgress, UserWordProgress.word_id == Word.id)
        .where(Word.language == language)
        .where(~Word.english.like('%...%'))
        .where(UserWordProgress.user_id == current_user.id)
        .order_by(func.random())
        .limit(limit * 4 + 10)
    )
    
    dist_res = await db.execute(distractor_stmt)
    pool = dist_res.scalars().all()
    
    # Fallback to general random words if the user hasn't learned enough words yet
    if len(pool) < limit * 3 + 10:
        needed = (limit * 3 + 10) - len(pool)
        fallback_stmt = select(Word.english).where(
            Word.language == language,
            ~Word.english.like('%...%'),
            Word.english.notin_(pool) if pool else True
        ).order_by(func.random()).limit(needed)
        fb_res = await db.execute(fallback_stmt)
        pool.extend(fb_res.scalars().all())
    
    questions = []
    for w in words:
        # Parse the JSON envelope: new format is {"sentence": ..., "word_form": ...}
        # Fall back gracefully for old plain-text sentences
        raw = w.ai_association or ""
        try:
            parsed = _json.loads(raw)
            sentence_text = parsed.get("sentence", raw)
            word_form = parsed.get("word_form", w.english)
        except (ValueError, TypeError):
            sentence_text = raw
            word_form = w.english

        # Distractors: use English base forms from the pool (excluding this word)
        safe_pool = [d for d in pool if d.lower() != w.english.lower()]
        if len(safe_pool) < 3:
            distractors = safe_pool
        else:
            distractors = random.sample(safe_pool, 3)

        # The correct option shown in the choices is word_form
        options = distractors + [word_form]
        random.shuffle(options)

        questions.append(SentenceCompletionQuestion(
            word_id=w.id,
            english=w.english,
            hebrew=w.hebrew,
            sentence=sentence_text,
            word_form=word_form,
            options=options
        ))

    return questions

class SentenceCompletionSubmit(BaseModel):
    word_id: int
    is_correct: bool

@router.post("/sentence-completion/submit")
async def submit_sentence_completion(
    data: SentenceCompletionSubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Stateless submit for Sentence Completion game to award XP.
    Does not update SM-2 metrics.
    """
    from datetime import date as _date
    today = _date.today()
    if current_user.last_active_date != today:
        current_user.daily_words_reviewed = 0
    current_user.last_active_date = today

    if data.is_correct:
        xp_source = "sentence_completion_correct"
    else:
        xp_source = "sentence_completion_incorrect"
        
    base_pts = POINTS.get(xp_source, 0)
    
    xp_result = await award_xp(db, current_user, xp_source, base_pts)
    new_badges = await check_and_award_badges(db, current_user)
    
    await db.commit()
    await db.refresh(current_user)
    
    return {
        "success": True,
        "word_id": data.word_id,
        "is_correct": data.is_correct,
        "xp_earned": xp_result["xp_earned"],
        "new_xp": current_user.xp,
        "level_up": xp_result["level_up"],
        "new_level_title": xp_result["new_level_info"]["title"] if xp_result.get("new_level_info") else None,
        "new_badges": new_badges,
    }
