"""
Seed script for Israeli Psychometric Entrance Test vocabulary.
SOURCE: database_english.json (project root) — no words generated manually.

Unit assignment:
- 10 units → each word is assigned its source unit number (1-10)
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

    for unit_idx, unit_name in enumerate(units):
        unit_number = unit_idx + 1  # 1-based

        entries = data[unit_name]
        for english, hebrew in entries.items():
            words.append({
                "english": english,
                "hebrew": hebrew,
                "unit": unit_number,
            })

    return words


async def seed_words(session: AsyncSession, words: list[dict]):
    """Wipe Words table and insert all words from JSON."""
    print("\n" + "=" * 60)
    print("  PSYCHOMETRIC VOCABULARY SEEDER — database_english.json")
    print("=" * 60)

    # Step 1: Wipe
    print(f"\n[1/4] Wiping Words table...")
    await session.execute(delete(Word))
    await session.commit()
    print("      Done — table is empty.")

    # Step 2: Insert
    print(f"\n[2/4] Inserting {len(words)} words from JSON...")
    for w in words:
        session.add(Word(
            english=w["english"],
            hebrew=w["hebrew"],
            unit=w["unit"],
        ))
    await session.commit()
    print("      Insert committed.")

    # Step 3: Verify count
    print(f"\n[3/4] Verifying count...")
    result = await session.execute(select(func.count()).select_from(Word))
    total = result.scalar_one()
    print(f"      Total words in DB: {total}")

    # Step 4: Cross-check
    print(f"\n[4/4] Cross-check against JSON...")
    expected = len(words)
    if total == expected:
        print(f"      PASS — DB count ({total}) matches JSON ({expected})")
    else:
        print(f"      FAIL — DB count ({total}) != JSON ({expected})")

    print("\n" + "=" * 60)
    print(f"  TOTAL WORDS IN DATABASE: {total}")
    print("=" * 60 + "\n")


async def main():
    print(f"Reading from: {JSON_PATH}")
    words = load_words_from_json()
    print(f"Loaded {len(words)} words from JSON.")

    # Drop and recreate all tables (full schema reset)
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
