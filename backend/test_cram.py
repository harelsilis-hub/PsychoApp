import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.user_word_progress import UserWordProgress
from app.models.word import Word

async def test():
    async with AsyncSessionLocal() as db:
        stmt = (
            select(UserWordProgress, Word)
            .join(Word, UserWordProgress.word_id == Word.id)
            .where(UserWordProgress.user_id == 1)
            .where(UserWordProgress.learning_state == "graduated")
            .where(Word.language == "en")
            .limit(500)
        )
        result = await db.execute(stmt)
        pairs = list(result.all())
        print(f"Found {len(pairs)} pairs")
        try:
            pairs.sort(key=lambda row: (row[0].srs_data or {}).get("easiness_factor", 2.5))
            print("Sorted successfully")
        except Exception as e:
            print("Error sorting:", type(e), repr(e))

asyncio.run(test())
