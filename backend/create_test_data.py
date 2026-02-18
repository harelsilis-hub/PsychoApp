"""Quick script to create test data for API testing."""
import asyncio
from app.db.session import engine, Base, AsyncSessionLocal
from app.models import User, Word

async def create_test_data():
    """Create test user and words."""
    print("Creating test data...")

    async with AsyncSessionLocal() as session:
        # Create test user
        user = User(
            email="test@example.com",
            hashed_password="$2b$12$test_hash",
            xp=0,
            level=1,
        )
        session.add(user)
        await session.flush()
        print(f"[OK] Created user: ID={user.id}, Email={user.email}")

        # Create 100 words with different difficulties
        words = []
        for rank in range(1, 101):
            word = Word(
                english=f"Word_{rank}",
                hebrew=f"מילה_{rank}",
                difficulty_rank=rank,
            )
            words.append(word)

        session.add_all(words)
        await session.commit()
        print(f"[OK] Created {len(words)} words (difficulty 1-100)")

    print("\n[SUCCESS] Test data ready!")
    print("User ID: 1")
    print("Words: 100 (difficulty 1-100)")

if __name__ == "__main__":
    asyncio.run(create_test_data())
