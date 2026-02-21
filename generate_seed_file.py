"""
Generate seed file with authentic psychometric vocabulary.
Distributes words across 20 levels (difficulty_rank 1-100).
"""
import sys
import random

# Fix Windows encoding
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

# Read clean words
words = []
with open('psychometric_words_clean.txt', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line:
            parts = line.split('\t')
            if len(parts) == 2:
                words.append({
                    'english': parts[0],
                    'hebrew': parts[1]
                })

print(f"Loaded {len(words)} words")

# Select words for database
# Let's use 300 words distributed evenly across 20 levels (15 words per level)
WORDS_PER_LEVEL = 15
TOTAL_WORDS = 300

# Shuffle and select
random.shuffle(words)
selected_words = words[:TOTAL_WORDS]

# Sort alphabetically for consistent ordering
selected_words.sort(key=lambda w: w['english'].lower())

# Assign difficulty ranks (1-100) evenly
words_with_ranks = []
for i, word in enumerate(selected_words):
    # Distribute across 1-100 range
    rank = int((i / TOTAL_WORDS) * 100) + 1
    rank = min(rank, 100)  # Cap at 100
    words_with_ranks.append({
        **word,
        'rank': rank
    })

# Generate Python seed file
output = '''"""
Seed script for Israeli Psychometric Entrance Test vocabulary.
Populates database with 300 authentic psychometric words.
Difficulty mapping: 1-20 levels with difficulty_rank 1-100 (Level = ceil(difficulty_rank / 5)).
"""
import asyncio
import sys
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import engine, AsyncSessionLocal, Base
from app.models.word import Word


# 300 authentic Israeli Psychometric Test words
# Distributed across 20 levels using difficulty_rank 1-100
# Level = ceil(difficulty_rank / 5) → Level 1: ranks 1-5, Level 2: ranks 6-10, ..., Level 20: ranks 96-100
PSYCHOMETRIC_WORDS = [
'''

# Add words in groups of 6 per line for readability
for i, word in enumerate(words_with_ranks):
    eng = word['english']
    heb = word['hebrew']
    rank = word['rank']
    level = (rank - 1) // 5 + 1

    # Add level comment every 15 words
    if i % 15 == 0:
        output += f'\n    # ===== LEVEL {level} (ranks {((level-1)*5)+1}-{level*5}) =====\n'

    output += f'    {{"english": "{eng}", "hebrew": "{heb}", "difficulty_rank": {rank}}},\n'

output += ''']


async def seed_words(session: AsyncSession):
    """Seed the database with authentic Israeli Psychometric Test vocabulary."""
    print("\\n[SEEDING] Starting Israeli Psychometric vocabulary seeding...")

    # Clear existing words
    print("[INFO] Wiping existing word database...")
    await session.execute(delete(Word))
    await session.commit()
    print("[CLEARED] All existing words deleted.")

    # Insert authentic psychometric words
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
    print(f"[SUCCESS] Added {words_added} authentic psychometric words to database.")

    # Verify seeding
    stmt = select(Word)
    result = await session.execute(stmt)
    total_words = len(result.scalars().all())
    print(f"[VERIFY] Total words in database: {total_words}")

    # Show difficulty distribution by level (1-20)
    print("\\n[DISTRIBUTION] Words by level (1-20):")
    print("  (Level = ceil(difficulty_rank / 5))")
    print()

    for level in range(1, 21):
        min_rank = (level - 1) * 5 + 1
        max_rank = level * 5
        stmt = select(Word).where(
            Word.difficulty_rank >= min_rank,
            Word.difficulty_rank <= max_rank
        )
        result = await session.execute(stmt)
        count = len(result.scalars().all())
        print(f"  Level {level:2d} (ranks {min_rank:2d}-{max_rank:3d}): {count} words")


async def main():
    """Main function to run the seeder."""
    print("=" * 70)
    print("🇮🇱 ISRAELI PSYCHOMETRIC ENTRANCE TEST VOCABULARY SEEDER 🇮🇱")
    print("=" * 70)

    # Create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed the data
    async with AsyncSessionLocal() as session:
        await seed_words(session)

    print("\\n[COMPLETE] Database populated with authentic psychometric vocabulary!")
    print("=" * 70)
    print("\\n✅ Your app is now ready with authentic test preparation words.")
    print("📚 Students can now practice with real psychometric exam vocabulary!")
    print("🎯 System configured for 20-level precision (Level = ceil(difficulty_rank / 5))")


if __name__ == "__main__":
    # Handle Windows encoding for Hebrew text
    if sys.platform == 'win32':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except AttributeError:
            import codecs
            sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

    asyncio.run(main())
'''

# Write seed file
with open('backend/app/seed_psychometric_data.py', 'w', encoding='utf-8') as f:
    f.write(output)

print(f"\n✅ Generated new seed file with {len(words_with_ranks)} authentic psychometric words!")
print(f"📊 Distribution: ~15 words per level across 20 levels")
print(f"📁 File: backend/app/seed_psychometric_data.py")
print("\nNext steps:")
print("1. Review the new seed file")
print("2. Run: cd backend && python -m app.seed_psychometric_data")
print("3. Test the placement test with authentic words!")
