"""
Seed script for Israeli Psychometric Entrance Test vocabulary.
SOURCE: database_english.json (project root) — no words generated manually.

Unit assignment:
- 10 units → each word is assigned its source unit number (1-10)

NOTE: Only replaces language='en' words. Hebrew words are untouched.
      Run seed_hebrew_data.py separately to seed Hebrew words.
"""
import asyncio
import json
import sys
from pathlib import Path
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import engine, AsyncSessionLocal, Base
from app.models.word import Word

# Resolve JSON path relative to this file (PsychoApp/database_english.json)
JSON_PATH = Path(__file__).resolve().parent.parent.parent / "database_english.json"


def load_words_from_json() -> list[dict]:
    """Read database_english.json and return list of word dicts with unit."""
    if not JSON_PATH.exists():
        raise FileNotFoundError(f"JSON file not found at: {JSON_PATH}")

    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)

    words = []
    units = sorted(data.keys(), key=lambda u: int(u.split()[-1]))  # sort Unit 1..10

    for unit_name in units:
        unit_number = int(unit_name.split()[-1])

        entries = data[unit_name]
        for english, hebrew in entries.items():
            words.append({
                "english": english,
                "hebrew": hebrew,
                "unit": unit_number,
                "language": "en",
            })

    return words


async def seed_words(session: AsyncSession, words: list[dict]):
    """Replace language='en' words and insert all words from JSON."""
    print("\n" + "=" * 60)
    print("  PSYCHOMETRIC VOCABULARY SEEDER — database_english.json")
    print("=" * 60)

    # Step 1: Wipe only English words
    print(f"\n[1/4] Wiping language='en' words...")
    await session.execute(delete(Word).where(Word.language == "en"))
    await session.commit()
    print("      Done — English words removed.")

    # Step 2: Insert
    print(f"\n[2/4] Inserting {len(words)} English words from JSON...")
    for w in words:
        session.add(Word(
            english=w["english"],
            hebrew=w["hebrew"],
            unit=w["unit"],
            language="en",
        ))
    await session.commit()
    print("      Insert committed.")

    # Step 3: Verify count
    print(f"\n[3/4] Verifying count...")
    result = await session.execute(select(func.count()).select_from(Word).where(Word.language == "en"))
    total = result.scalar_one()
    print(f"      English words in DB: {total}")

    # Step 4: Cross-check
    print(f"\n[4/4] Cross-check against JSON...")
    expected = len(words)
    if total == expected:
        print(f"      PASS — DB count ({total}) matches JSON ({expected})")
    else:
        print(f"      FAIL — DB count ({total}) != JSON ({expected})")

    print("\n" + "=" * 60)
    print(f"  ENGLISH WORDS IN DATABASE: {total}")
    print("=" * 60 + "\n")


async def main():
    print(f"Reading from: {JSON_PATH}")
    words = load_words_from_json()
    print(f"Loaded {len(words)} words from JSON.")

    # Drop and recreate all tables (full schema reset including new language column)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
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
