"""
Migration: fix stray parentheses in word data.

English field: strip trailing ' (' left over from CSV import.
  e.g. 'czar ('  ->  'czar'
       'die (dice) ('  ->  'die (dice)'

Hebrew field: the CSV used ')word(' (reversed) for parentheticals.
  Replace unmatched ')' with '(' and close the bracket at the end.
  e.g. 'צאר )שליט רוסי'  ->  'צאר (שליט רוסי)'

Safe to run multiple times — already-fixed rows are skipped.
Works with both SQLite (local) and PostgreSQL (Render production).
"""
import asyncio
import re
import sys

sys.path.insert(0, ".")

from sqlalchemy import text
from app.db.session import engine


async def fix_english(conn) -> int:
    result = await conn.execute(
        text("SELECT id, english FROM words WHERE english LIKE '%('")
    )
    rows = result.fetchall()

    updates = []
    for id_, english in rows:
        cleaned = re.sub(r"\s*\(\s*$", "", english).rstrip()
        updates.append({"id": id_, "english": cleaned})

    if updates:
        await conn.execute(
            text("UPDATE words SET english = :english WHERE id = :id"),
            updates,
        )
    return len(updates)


async def fix_hebrew(conn) -> int:
    result = await conn.execute(
        text("SELECT id, hebrew FROM words WHERE language = 'en' AND hebrew LIKE '%)%'")
    )
    rows = result.fetchall()

    updates = []
    for id_, hebrew in rows:
        open_count = hebrew.count("(")
        close_count = hebrew.count(")")
        # Only fix rows where ) outnumbers ( (the old reversed-RTL convention)
        if close_count <= open_count:
            continue

        if close_count == 1 and open_count == 0:
            fixed = hebrew.replace(")", "(") + ")"
        elif close_count == 1 and open_count == 1:
            fixed = re.sub(r"\(([^(]+)\(,", r"(\1),", hebrew.replace(")", "(") + ")")
        else:
            continue
        updates.append({"id": id_, "hebrew": fixed})

    if updates:
        await conn.execute(
            text("UPDATE words SET hebrew = :hebrew WHERE id = :id"),
            updates,
        )
    return len(updates)


async def main():
    async with engine.begin() as conn:
        en_fixed = await fix_english(conn)
        print(f"English field: {en_fixed} rows updated")

        he_fixed = await fix_hebrew(conn)
        print(f"Hebrew field:  {he_fixed} rows updated")

        if en_fixed == 0 and he_fixed == 0:
            print("Nothing to do — database already clean.")
        else:
            print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
