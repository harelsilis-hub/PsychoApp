"""
Seed script for psychometric vocabulary words.
Populates the database with 60 words evenly distributed across difficulty levels 1-100.
"""
import asyncio
import sys
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import engine, AsyncSessionLocal, Base
from app.models.word import Word


# 60 psychometric words distributed across 10 difficulty levels (1-10 mapped to 1-100 scale)
# Each level has 6 words
PSYCHOMETRIC_WORDS = [
    # Level 1 (1-10) - Very Basic Words
    {"english": "cat", "hebrew": "חתול", "difficulty_rank": 5},
    {"english": "dog", "hebrew": "כלב", "difficulty_rank": 5},
    {"english": "book", "hebrew": "ספר", "difficulty_rank": 7},
    {"english": "water", "hebrew": "מים", "difficulty_rank": 3},
    {"english": "house", "hebrew": "בית", "difficulty_rank": 4},
    {"english": "food", "hebrew": "אוכל", "difficulty_rank": 6},

    # Level 2 (11-20) - Basic Words
    {"english": "table", "hebrew": "שולחן", "difficulty_rank": 12},
    {"english": "chair", "hebrew": "כיסא", "difficulty_rank": 13},
    {"english": "window", "hebrew": "חלון", "difficulty_rank": 15},
    {"english": "door", "hebrew": "דלת", "difficulty_rank": 14},
    {"english": "friend", "hebrew": "חבר", "difficulty_rank": 16},
    {"english": "family", "hebrew": "משפחה", "difficulty_rank": 18},

    # Level 3 (21-30) - Elementary Words
    {"english": "happy", "hebrew": "שמח", "difficulty_rank": 22},
    {"english": "beautiful", "hebrew": "יפה", "difficulty_rank": 24},
    {"english": "difficult", "hebrew": "קשה", "difficulty_rank": 26},
    {"english": "important", "hebrew": "חשוב", "difficulty_rank": 28},
    {"english": "question", "hebrew": "שאלה", "difficulty_rank": 25},
    {"english": "answer", "hebrew": "תשובה", "difficulty_rank": 27},

    # Level 4 (31-40) - Intermediate Words
    {"english": "knowledge", "hebrew": "ידע", "difficulty_rank": 33},
    {"english": "wisdom", "hebrew": "חוכמה", "difficulty_rank": 35},
    {"english": "strength", "hebrew": "כוח", "difficulty_rank": 37},
    {"english": "courage", "hebrew": "אומץ", "difficulty_rank": 36},
    {"english": "patient", "hebrew": "סבלני", "difficulty_rank": 38},
    {"english": "careful", "hebrew": "זהיר", "difficulty_rank": 34},

    # Level 5 (41-50) - Upper Intermediate
    {"english": "achieve", "hebrew": "להשיג", "difficulty_rank": 43},
    {"english": "develop", "hebrew": "לפתח", "difficulty_rank": 45},
    {"english": "analyze", "hebrew": "לנתח", "difficulty_rank": 47},
    {"english": "comprehend", "hebrew": "להבין", "difficulty_rank": 46},
    {"english": "significant", "hebrew": "משמעותי", "difficulty_rank": 48},
    {"english": "relevant", "hebrew": "רלוונטי", "difficulty_rank": 44},

    # Level 6 (51-60) - Advanced
    {"english": "abate", "hebrew": "לדעוך", "difficulty_rank": 53},
    {"english": "benevolent", "hebrew": "נדיב לב", "difficulty_rank": 55},
    {"english": "candid", "hebrew": "כן", "difficulty_rank": 57},
    {"english": "diligent", "hebrew": "חרוץ", "difficulty_rank": 56},
    {"english": "eloquent", "hebrew": "רהוט", "difficulty_rank": 58},
    {"english": "frugal", "hebrew": "חסכני", "difficulty_rank": 54},

    # Level 7 (61-70) - Sophisticated
    {"english": "gregarious", "hebrew": "חברותי", "difficulty_rank": 63},
    {"english": "hypothesis", "hebrew": "השערה", "difficulty_rank": 65},
    {"english": "impartial", "hebrew": "חסר פניות", "difficulty_rank": 67},
    {"english": "judicious", "hebrew": "שיפוטי", "difficulty_rank": 66},
    {"english": "meticulous", "hebrew": "קפדן", "difficulty_rank": 68},
    {"english": "notorious", "hebrew": "ידוע לשמצה", "difficulty_rank": 64},

    # Level 8 (71-80) - Expert
    {"english": "ostentatious", "hebrew": "ראוותני", "difficulty_rank": 73},
    {"english": "paradigm", "hebrew": "פרדיגמה", "difficulty_rank": 75},
    {"english": "quintessential", "hebrew": "מהותי", "difficulty_rank": 77},
    {"english": "resilient", "hebrew": "עמיד", "difficulty_rank": 76},
    {"english": "sagacious", "hebrew": "נבון", "difficulty_rank": 78},
    {"english": "tenacious", "hebrew": "עיקש", "difficulty_rank": 74},

    # Level 9 (81-90) - Master
    {"english": "ephemeral", "hebrew": "חולף", "difficulty_rank": 83},
    {"english": "ubiquitous", "hebrew": "נמצא בכל מקום", "difficulty_rank": 85},
    {"english": "vicarious", "hebrew": "עקיף", "difficulty_rank": 87},
    {"english": "whimsical", "hebrew": "גחמני", "difficulty_rank": 86},
    {"english": "zealous", "hebrew": "נלהב", "difficulty_rank": 88},
    {"english": "abstruse", "hebrew": "סתום", "difficulty_rank": 84},

    # Level 10 (91-100) - Expert/Academic
    {"english": "inscrutable", "hebrew": "בלתי חדיר", "difficulty_rank": 93},
    {"english": "perspicacious", "hebrew": "חד ראייה", "difficulty_rank": 95},
    {"english": "recondite", "hebrew": "מעמיק", "difficulty_rank": 97},
    {"english": "sagacity", "hebrew": "תבונה", "difficulty_rank": 96},
    {"english": "verisimilitude", "hebrew": "דמיון לאמת", "difficulty_rank": 98},
    {"english": "equivocal", "hebrew": "דו משמעי", "difficulty_rank": 94},
]


async def seed_words(session: AsyncSession):
    """Seed the database with psychometric words."""
    print("\n[SEEDING] Starting psychometric word seeding...")

    # Check if words already exist
    stmt = select(Word).limit(1)
    result = await session.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        print("[WARNING] Words already exist in database.")
        print("[INFO] Clearing existing words and re-seeding...")

        # Clear existing words
        await session.execute(delete(Word))
        await session.commit()
        print("[CLEARED] Existing words deleted.")

    # Insert words
    words_added = 0
    for word_data in PSYCHOMETRIC_WORDS:
        word = Word(
            english=word_data["english"],
            hebrew=word_data["hebrew"],
            difficulty_rank=word_data["difficulty_rank"]
        )
        session.add(word)
        words_added += 1

    await session.commit()
    print(f"[SUCCESS] Added {words_added} psychometric words to database.")

    # Verify seeding
    stmt = select(Word)
    result = await session.execute(stmt)
    total_words = len(result.scalars().all())
    print(f"[VERIFY] Total words in database: {total_words}")

    # Show difficulty distribution
    print("\n[DISTRIBUTION] Words by difficulty level:")
    for level in range(1, 11):
        min_rank = (level - 1) * 10 + 1
        max_rank = level * 10
        stmt = select(Word).where(
            Word.difficulty_rank >= min_rank,
            Word.difficulty_rank <= max_rank
        )
        result = await session.execute(stmt)
        count = len(result.scalars().all())
        print(f"  Level {level} ({min_rank}-{max_rank}): {count} words")


async def main():
    """Main function to run the seeder."""
    print("=" * 60)
    print("PSYCHOMETRIC VOCABULARY DATA SEEDER")
    print("=" * 60)

    # Create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed the data
    async with AsyncSessionLocal() as session:
        await seed_words(session)

    print("\n[COMPLETE] Seeding complete!")
    print("=" * 60)


if __name__ == "__main__":
    # Handle Windows encoding
    if sys.platform == 'win32':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except AttributeError:
            import codecs
            sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

    asyncio.run(main())
