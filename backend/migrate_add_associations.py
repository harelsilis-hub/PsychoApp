"""
Migration script to add ai_association and user_association columns.
Preserves all existing 400 words.
"""
import asyncio
import sys
from sqlalchemy import text

# Fix Windows encoding
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

sys.path.insert(0, '.')
from app.db.session import engine, AsyncSessionLocal


async def migrate():
    """Add new association columns to words table."""
    print("=" * 70)
    print("🔄 MIGRATION: Adding Memory Aids columns")
    print("=" * 70)
    print()

    async with engine.begin() as conn:
        # Check if columns already exist
        result = await conn.execute(text("PRAGMA table_info(words)"))
        columns = [row[1] for row in result]

        if 'ai_association' in columns and 'user_association' in columns:
            print("✅ Columns already exist. No migration needed.")
            return

        print("[INFO] Adding ai_association column...")
        await conn.execute(text("ALTER TABLE words ADD COLUMN ai_association VARCHAR(1000)"))
        print("✅ Added ai_association")

        print("[INFO] Adding user_association column...")
        await conn.execute(text("ALTER TABLE words ADD COLUMN user_association VARCHAR(1000)"))
        print("✅ Added user_association")

    # Verify word count
    async with AsyncSessionLocal() as session:
        result = await session.execute(text("SELECT COUNT(*) FROM words"))
        count = result.scalar()
        print()
        print(f"[VERIFY] Total words after migration: {count}")

        if count == 400:
            print("✅ PERFECT: All 400 words preserved!")
        else:
            print(f"⚠️  Warning: Expected 400 words, found {count}")

    print()
    print("=" * 70)
    print("✅ MIGRATION COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(migrate())
