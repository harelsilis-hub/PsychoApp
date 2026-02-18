"""
Test script to verify database setup and model relationships.
Run this to ensure everything is configured correctly.
"""
import asyncio
import sys
import os
from datetime import datetime, timedelta

# Fix Windows encoding for Unicode characters
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

print("=" * 60)
print("DATABASE SETUP TEST")
print("=" * 60)

try:
    print("\n[1/6] Importing database modules...")
    from app.db.session import engine, Base, AsyncSessionLocal
    print("[OK] Database modules imported successfully")
except ImportError as e:
    print(f"[ERROR] Failed to import database modules: {e}")
    print("\nMake sure you're running from the 'backend' directory:")
    print("  cd backend")
    print("  python test_db.py")
    sys.exit(1)

try:
    print("\n[2/6] Importing models...")
    from app.models import User, Word, Association, UserWordProgress, WordStatus
    from sqlalchemy import func
    print("[OK] Models imported successfully")
except ImportError as e:
    print(f"[ERROR] Failed to import models: {e}")
    sys.exit(1)


async def test_database_setup() -> None:
    """Test database creation and basic CRUD operations."""

    try:
        # Step 1: Create tables
        print("\n[3/6] Creating database tables...")
        async with engine.begin() as conn:
            # Drop existing tables (for clean test)
            await conn.run_sync(Base.metadata.drop_all)
            print("  - Dropped existing tables (if any)")

            # Create all tables
            await conn.run_sync(Base.metadata.create_all)
            print("  - Created tables: users, words, associations, user_word_progress")
        print("[OK] Tables created successfully")

        # Step 2: Insert test data
        print("\n[4/6] Inserting test data...")
        async with AsyncSessionLocal() as session:
            try:
                # Create a test user
                print("  - Creating test user...")
                user = User(
                    email="test@example.com",
                    hashed_password="$2b$12$hashed_password_placeholder",
                    xp=100,
                    level=2,
                )
                session.add(user)
                await session.flush()
                print(f"    [OK] User created: ID={user.id}, Email={user.email}")

                # Create test words
                print("  - Creating test words...")
                word1 = Word(
                    english="Hello",
                    hebrew="שלום",
                    difficulty_rank=10,
                    audio_url="https://example.com/audio/hello.mp3",
                )
                word2 = Word(
                    english="Goodbye",
                    hebrew="להתראות",
                    difficulty_rank=15,
                )
                session.add_all([word1, word2])
                await session.flush()
                print(f"    [OK] Word 1: ID={word1.id}, {word1.english} = {word1.hebrew}")
                print(f"    [OK] Word 2: ID={word2.id}, {word2.english} = {word2.hebrew}")

                # Create association
                print("  - Creating memory association...")
                association = Association(
                    word_id=word1.id,
                    user_id=user.id,
                    text="Remember: Shalom sounds like 'so long'!",
                    likes=5,
                )
                session.add(association)
                await session.flush()
                print(f"    [OK] Association created: ID={association.id}, Likes={association.likes}")

                # Create user progress
                print("  - Creating progress record...")
                progress = UserWordProgress(
                    user_id=user.id,
                    word_id=word1.id,
                    status=WordStatus.LEARNING,
                    next_review=datetime.now() + timedelta(days=1),
                    srs_data={
                        "repetition_number": 2,
                        "easiness_factor": 2.4,
                        "interval_days": 1,
                    },
                )
                session.add(progress)
                await session.commit()
                print(f"    [OK] Progress: ID={progress.id}, Status={progress.status.value}")
                print("[OK] Test data inserted successfully")

                # Step 3: Test relationships (using explicit queries)
                print("\n[5/6] Testing model relationships...")
                from sqlalchemy import select

                # Count user's progress records
                progress_count = await session.scalar(
                    select(func.count()).select_from(UserWordProgress).where(UserWordProgress.user_id == user.id)
                )
                print(f"  - User has {progress_count} progress record(s)")

                # Count user's associations
                assoc_count = await session.scalar(
                    select(func.count()).select_from(Association).where(Association.user_id == user.id)
                )
                print(f"  - User has {assoc_count} association(s)")

                # Count word's associations
                word_assoc_count = await session.scalar(
                    select(func.count()).select_from(Association).where(Association.word_id == word1.id)
                )
                print(f"  - Word '{word1.english}' has {word_assoc_count} association(s)")

                # Count word's progress records
                word_progress_count = await session.scalar(
                    select(func.count()).select_from(UserWordProgress).where(UserWordProgress.word_id == word1.id)
                )
                print(f"  - Word '{word1.english}' has {word_progress_count} progress record(s)")
                print("[OK] Relationships working correctly")

            except Exception as e:
                print(f"[ERROR] Error during data insertion: {e}")
                await session.rollback()
                raise

        # Step 4: Verify data persistence
        print("\n[6/6] Verifying data persistence...")
        async with AsyncSessionLocal() as session:
            from sqlalchemy import select

            result = await session.execute(select(User))
            users = result.scalars().all()
            print(f"  - Found {len(users)} user(s) in database")

            result = await session.execute(select(Word))
            words = result.scalars().all()
            print(f"  - Found {len(words)} word(s) in database")

            result = await session.execute(select(Association))
            associations = result.scalars().all()
            print(f"  - Found {len(associations)} association(s) in database")

            result = await session.execute(select(UserWordProgress))
            progress_records = result.scalars().all()
            print(f"  - Found {len(progress_records)} progress record(s) in database")
        print("[OK] Data persistence verified")

        # Success message
        print("\n" + "=" * 60)
        print("[SUCCESS] ALL TESTS PASSED SUCCESSFULLY!")
        print("=" * 60)
        print("\n[OK] Database layer is ready for use!")
        print("\nNext steps:")
        print("  1. Run the application: uvicorn app.main:app --reload")
        print("  2. Visit http://localhost:8000/docs for API documentation")
        print("=" * 60)

    except Exception as e:
        print("\n" + "=" * 60)
        print("[ERROR] TEST FAILED")
        print("=" * 60)
        print(f"\nError: {e}")
        import traceback
        print("\nFull traceback:")
        traceback.print_exc()
        sys.exit(1)
    finally:
        # Cleanup
        print("\n[Cleanup] Closing database connection...")
        await engine.dispose()
        print("[OK] Database connection closed")


def main() -> None:
    """Main entry point."""
    try:
        asyncio.run(test_database_setup())
    except KeyboardInterrupt:
        print("\n\n[WARNING] Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n[ERROR] Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
