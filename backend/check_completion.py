import asyncio
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.word import Word
from app.models.user_word_progress import UserWordProgress
from sqlalchemy import select, func
import json
import random

async def test_sentence_completion():
    async with AsyncSessionLocal() as db:
        # Get a real user who has some progress
        result = await db.execute(select(User).limit(1))
        current_user = result.scalar_one_or_none()
        if not current_user:
            print("No users found.")
            return

        language = "en"
        limit = 10

        # Run the target words query
        stmt = (
            select(Word, UserWordProgress)
            .join(UserWordProgress, UserWordProgress.word_id == Word.id)
            .where(UserWordProgress.user_id == current_user.id)
            .where(UserWordProgress.learning_state == "graduated")
            .where(Word.ai_association.isnot(None))
            .where(Word.ai_association.like('%"word_form"%'))
            .where(Word.language == language)
            .limit(500)
        )
        result = await db.execute(stmt)
        pairs = result.all()
        
        pairs.sort(key=lambda row: (row[1].srs_data or {}).get("easiness_factor") or 2.5)
        weak_pool = pairs[:100]
        words_pool = [p[0] for p in weak_pool]
        
        if len(words_pool) <= limit:
            words = list(words_pool)
            random.shuffle(words)
        else:
            words = random.sample(words_pool, limit)
            
        print(f"User {current_user.id} has {len(pairs)} graduated words.")
        print(f"Selected {len(words)} weak words for the quiz.")

        # Run the distractor query
        distractor_stmt = (
            select(Word.english)
            .join(UserWordProgress, UserWordProgress.word_id == Word.id)
            .where(Word.language == language)
            .where(UserWordProgress.user_id == current_user.id)
            .order_by(func.random())
            .limit(limit * 4 + 10)
        )
        dist_res = await db.execute(distractor_stmt)
        pool = dist_res.scalars().all()
        
        print(f"Found {len(pool)} distractors from user's known words.")
        
        if len(pool) < limit * 3 + 10:
            needed = (limit * 3 + 10) - len(pool)
            fallback_stmt = select(Word.english).where(
                Word.language == language,
                Word.english.notin_(pool) if pool else True
            ).order_by(func.random()).limit(needed)
            fb_res = await db.execute(fallback_stmt)
            pool.extend(fb_res.scalars().all())
            print(f"Fell back to general dictionary. Pool is now {len(pool)} words.")

        for i, w in enumerate(words[:3]): # just show first 3 for brevity
            raw = w.ai_association or ""
            parsed = json.loads(raw)
            sentence_text = parsed.get("sentence", raw)
            word_form = parsed.get("word_form", w.english)
            
            safe_pool = [d for d in pool if d.lower() != w.english.lower()]
            if len(safe_pool) < 3:
                distractors = safe_pool
            else:
                distractors = random.sample(safe_pool, 3)
                
            options = distractors + [word_form]
            random.shuffle(options)
            
            print(f"\nQ{i+1}: {sentence_text}")
            print(f"Correct: {word_form}")
            print(f"Options: {options}")

if __name__ == "__main__":
    asyncio.run(test_sentence_completion())
