"""
Migration: add language column to custom_words table.
Existing custom words default to 'en'.
"""
import asyncio
import sys
from sqlalchemy import text

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

sys.path.insert(0, '.')
from app.db.session import engine


async def migrate():
    print("=" * 60)
    print("MIGRATION: Adding language column to custom_words")
    print("=" * 60)

    async with engine.begin() as conn:
        result = await conn.execute(text("PRAGMA table_info(custom_words)"))
        columns = [row[1] for row in result]

        if 'language' in columns:
            print("Column already exists. No migration needed.")
            return

        print("[INFO] Adding language column...")
        await conn.execute(text(
            "ALTER TABLE custom_words ADD COLUMN language VARCHAR(10) NOT NULL DEFAULT 'en'"
        ))
        print("Done. All existing custom words set to language='en'.")


if __name__ == '__main__':
    asyncio.run(migrate())
