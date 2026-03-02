"""
Seed script for Hebrew vocabulary (Psychometric Hebrew section).
SOURCE: database_hebrew.json (project root)

Format:
  { "Unit 1": { "מילה": "הגדרה", ... }, "Unit 2": { ... }, ... }

NOTE: Only replaces language='he' words. English words are untouched.
      Run seed_psychometric_data.py first to ensure the schema exists.
"""
import asyncio
import json
import sys
from pathlib import Path
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import engine, AsyncSessionLocal, Base
from app.models.word import Word

JSON_PATH = Path(__file__).resolve().parent.parent.parent / "database_hebrew.json"


def load_words_from_json() -> list[dict]:
    """Read database_hebrew.json and return list of word dicts with unit."""
    if not JSON_PATH.exists():
        raise FileNotFoundError(f"JSON file not found at: {JSON_PATH}")

    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)

    words = []
    units = sorted(data.keys(), key=lambda u: int(u.split()[-1]))

    for unit_idx, unit_name in enumerate(units):
        unit_number = unit_idx + 1

        entries = data[unit_name]
        for word, definition in entries.items():
            words.append({
                "english": word,        # Hebrew word stored in 'english' field
                "hebrew": definition,   # Hebrew definition stored in 'hebrew' field
                "unit": unit_number,
                "language": "he",
            })

    return words


async def seed_words(session: AsyncSession, words: list[dict]):
    """Replace language='he' words and insert all words from JSON."""
    print("\n" + "=" * 60)
    print("  HEBREW VOCABULARY SEEDER — database_hebrew.json")
    print("=" * 60)

    # Step 1: Wipe only Hebrew words
    print(f"\n[1/4] Wiping language='he' words...")
    await session.execute(delete(Word).where(Word.language == "he"))
    await session.commit()
    print("      Done — Hebrew words removed.")

    # Step 2: Insert
    print(f"\n[2/4] Inserting {len(words)} Hebrew words from JSON...")
    for w in words:
        session.add(Word(
            english=w["english"],
            hebrew=w["hebrew"],
            unit=w["unit"],
            language="he",
        ))
    await session.commit()
    print("      Insert committed.")

    # Step 3: Verify count
    print(f"\n[3/4] Verifying count...")
    result = await session.execute(select(func.count()).select_from(Word).where(Word.language == "he"))
    total = result.scalar_one()
    print(f"      Hebrew words in DB: {total}")

    # Step 4: Cross-check
    print(f"\n[4/4] Cross-check against JSON...")
    expected = len(words)
    if total == expected:
        print(f"      PASS — DB count ({total}) matches JSON ({expected})")
    else:
        print(f"      FAIL — DB count ({total}) != JSON ({expected})")

    print("\n" + "=" * 60)
    print(f"  HEBREW WORDS IN DATABASE: {total}")
    print("=" * 60 + "\n")


async def main():
    print(f"Reading from: {JSON_PATH}")
    words = load_words_from_json()
    print(f"Loaded {len(words)} words from JSON.")

    # Ensure tables exist (do NOT drop — English words must survive)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        await seed_words(session, words)


if __name__ == "__main__":
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except AttributeError:
            import codecs
            sys.stdout = codecs.getwriter("utf-8")(sys.stdout.buffer, "strict")

    asyncio.run(main())
