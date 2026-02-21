"""
QA Check: Verify word quality and difficulty distribution.
Print 3 random words from Levels 1, 10, and 20.
"""
import asyncio
import sys
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

# Fix Windows encoding
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

# Import from backend
sys.path.insert(0, 'backend')
from app.db.session import AsyncSessionLocal
from app.models.word import Word


async def get_random_word_from_level(db: AsyncSession, level: int):
    """Get a random word from a specific level."""
    # Calculate rank range for this level
    min_rank = (level - 1) * 5 + 1
    max_rank = level * 5

    # Query random word from this level
    stmt = (
        select(Word)
        .where(Word.difficulty_rank >= min_rank)
        .where(Word.difficulty_rank <= max_rank)
        .order_by(func.random())
        .limit(1)
    )

    result = await db.execute(stmt)
    word = result.scalar_one_or_none()

    return word


async def main():
    """Run QA check."""
    print("=" * 70)
    print("🔍 QA CHECK: Word Quality & Difficulty Distribution")
    print("=" * 70)
    print()

    async with AsyncSessionLocal() as db:
        # Get random words from each level
        levels_to_check = [1, 10, 20]

        for level in levels_to_check:
            word = await get_random_word_from_level(db, level)

            if word:
                print(f"[Level {level:2d}] - {word.english:20s} - {word.hebrew}")
            else:
                print(f"[Level {level:2d}] - ❌ NO WORD FOUND")

        print()

        # Get total count per level
        print("=" * 70)
        print("📊 DISTRIBUTION CHECK: Words per level")
        print("=" * 70)
        print()

        for level in [1, 5, 10, 15, 20]:
            min_rank = (level - 1) * 5 + 1
            max_rank = level * 5

            stmt = (
                select(func.count(Word.id))
                .where(Word.difficulty_rank >= min_rank)
                .where(Word.difficulty_rank <= max_rank)
            )

            result = await db.execute(stmt)
            count = result.scalar()

            status = "✅" if count == 20 else "❌"
            print(f"Level {level:2d} (ranks {min_rank:2d}-{max_rank:3d}): {count:2d} words {status}")

        # Total count
        stmt = select(func.count(Word.id))
        result = await db.execute(stmt)
        total = result.scalar()

        print()
        print(f"Total words in database: {total}")

        if total == 400:
            print("✅ PERFECT: 400 words")
        else:
            print(f"❌ ERROR: Expected 400, found {total}")

    print()
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
