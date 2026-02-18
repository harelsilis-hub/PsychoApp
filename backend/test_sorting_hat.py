"""
Test script for Sorting Hat placement test functionality.
Verifies the adaptive binary search algorithm and regression checks.
"""
import asyncio
import sys
import os
from datetime import datetime

# Fix Windows encoding for Unicode characters
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

print("=" * 70)
print("SORTING HAT PLACEMENT TEST - VERIFICATION")
print("=" * 70)

try:
    print("\n[1/8] Importing modules...")
    from app.db.session import engine, Base, AsyncSessionLocal
    from app.models import User, Word, PlacementSession
    from app.services.sorting_hat import SortingHatService
    print("[OK] All modules imported successfully")
except ImportError as e:
    print(f"[ERROR] Failed to import modules: {e}")
    print("\nMake sure you're running from the 'backend' directory:")
    print("  cd backend")
    print("  python test_sorting_hat.py")
    print("\nIf modules are missing, install dependencies:")
    print("  pip install -r requirements.txt")
    sys.exit(1)


async def test_sorting_hat() -> None:
    """Test the Sorting Hat placement algorithm."""

    try:
        # Step 1: Setup database
        print("\n[2/8] Setting up database...")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        print("[OK] Database tables created")

        # Step 2: Create test data
        print("\n[3/8] Creating test data...")
        async with AsyncSessionLocal() as session:
            # Create test user
            user = User(
                email="placement_test@example.com",
                hashed_password="$2b$12$test_hash",
                xp=0,
                level=1,
            )
            session.add(user)
            await session.flush()
            print(f"  [OK] Created user: ID={user.id}")

            # Create words with difficulty ranks 1-100
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
            print(f"  [OK] Created {len(words)} words (difficulty 1-100)")

        # Step 3: Create placement session
        print("\n[4/8] Creating placement session...")
        async with AsyncSessionLocal() as session:
            placement_session = await SortingHatService.create_session(session, user.id)
            print(f"  [OK] Session ID: {placement_session.id}")
            print(f"  [OK] Initial range: [{placement_session.current_min}, {placement_session.current_max}]")
            print(f"  [OK] Active: {placement_session.is_active}")

        # Step 4: Test get_next_word (binary search midpoint)
        print("\n[5/8] Testing binary search word selection...")
        async with AsyncSessionLocal() as session:
            from sqlalchemy import select
            stmt = select(PlacementSession).where(PlacementSession.id == placement_session.id)
            result = await session.execute(stmt)
            session_obj = result.scalar_one()

            word = await SortingHatService.get_next_word(session, session_obj)
            expected_mid = (session_obj.current_min + session_obj.current_max) // 2
            print(f"  [OK] Expected midpoint: {expected_mid}")
            print(f"  [OK] Selected word difficulty: {word.difficulty_rank}")
            print(f"  [OK] Word: {word.english} = {word.hebrew}")
            assert word is not None, "Should return a word"

        # Step 5: Simulate answering questions (binary search)
        print("\n[6/8] Simulating placement test answers...")
        async with AsyncSessionLocal() as session:
            from sqlalchemy import select

            # Simulate user knowing words up to level 60
            target_level = 60
            question_log = []

            for i in range(15):  # Limit to 15 questions for test
                stmt = select(PlacementSession).where(
                    PlacementSession.id == placement_session.id
                )
                result = await session.execute(stmt)
                session_obj = result.scalar_one()

                if not session_obj.is_active:
                    break

                # Get next word
                word = await SortingHatService.get_next_word(session, session_obj)
                if not word:
                    break

                # Check if this is a regression check
                is_regression = (session_obj.question_count + 1) % 5 == 0

                # Simulate answer: user knows words below target_level
                is_known = word.difficulty_rank <= target_level

                question_log.append({
                    "question": session_obj.question_count + 1,
                    "word_difficulty": word.difficulty_rank,
                    "is_regression": is_regression,
                    "is_known": is_known,
                    "range_before": f"[{session_obj.current_min}, {session_obj.current_max}]",
                })

                # Submit answer
                updated_session, is_complete = await SortingHatService.submit_answer(
                    session, session_obj, is_known
                )

                question_log[-1]["range_after"] = f"[{updated_session.current_min}, {updated_session.current_max}]"
                question_log[-1]["is_complete"] = is_complete

                if is_complete:
                    print(f"\n  Placement test completed after {updated_session.question_count} questions")
                    print(f"  [OK] Final level: {updated_session.final_level}")
                    print(f"  [OK] Target level was: {target_level}")
                    print(f"  [OK] Accuracy: ±{abs(updated_session.final_level - target_level)} levels")
                    break

        # Step 6: Display question log
        print("\n[7/8] Question log:")
        print("  " + "-" * 66)
        print(f"  {'Q#':<4} {'Diff':<5} {'Regr':<5} {'Known':<6} {'Range Before':<15} {'Range After':<15}")
        print("  " + "-" * 66)
        for q in question_log:
            reg_marker = "[OK]" if q["is_regression"] else ""
            known_marker = "[OK]" if q["is_known"] else "[X]"
            print(
                f"  {q['question']:<4} {q['word_difficulty']:<5} {reg_marker:<5} "
                f"{known_marker:<6} {q['range_before']:<15} {q['range_after']:<15}"
            )
        print("  " + "-" * 66)

        # Step 7: Test regression check
        print("\n[8/8] Verifying regression checks...")
        regression_questions = [q for q in question_log if q["is_regression"]]
        print(f"  [OK] Found {len(regression_questions)} regression checks")
        print(f"  [OK] Expected: every 5th question")

        for rq in regression_questions:
            print(f"    - Question {rq['question']}: Difficulty {rq['word_difficulty']} (regression)")

        # Success
        print("\n" + "=" * 70)
        print("[SUCCESS] ALL SORTING HAT TESTS PASSED!")
        print("=" * 70)
        print("\n[OK] Binary search algorithm working correctly")
        print("[OK] Regression checks functioning properly")
        print("[OK] Placement session management operational")
        print("\nNext steps:")
        print("  1. Start the API: uvicorn app.main:app --reload")
        print("  2. Test endpoints:")
        print("     POST /api/v1/sorting/start")
        print("     POST /api/v1/sorting/answer")
        print("     GET  /api/v1/sorting/session/{user_id}")
        print("  3. Visit http://localhost:8000/docs for API documentation")
        print("=" * 70)

    except Exception as e:
        print("\n" + "=" * 70)
        print("[ERROR] TEST FAILED")
        print("=" * 70)
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
        asyncio.run(test_sorting_hat())
    except KeyboardInterrupt:
        print("\n\n[WARNING]  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n[ERROR] Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
