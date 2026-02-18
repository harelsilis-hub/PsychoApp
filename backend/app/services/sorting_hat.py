"""
Sorting Hat service - Adaptive placement test using binary search algorithm.

This service implements an intelligent placement test that determines a user's
vocabulary level by adaptively selecting words based on their performance.
"""
import random
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.placement_session import PlacementSession
from app.models.word import Word


class SortingHatService:
    """Service for managing adaptive placement tests."""

    REGRESSION_INTERVAL = 5  # Check regression every 5th question
    REGRESSION_PERCENTAGE = 0.20  # 20% lower than current_min
    MIN_RANGE_THRESHOLD = 5  # Stop when range is smaller than this
    MAX_QUESTIONS = 20  # Maximum number of questions

    @staticmethod
    async def get_next_word(
        db: AsyncSession, session: PlacementSession
    ) -> Optional[Word]:
        """
        Get the next word for the placement test using binary search logic.

        Every 5th question performs a regression check (returns a word 20% below current_min).
        Otherwise, returns a word closest to the midpoint of the current range.

        Args:
            db: Database session.
            session: PlacementSession instance.

        Returns:
            Word instance or None if no suitable word found.
        """
        # Check if this is a regression check question (every 5th)
        is_regression = (session.question_count + 1) % SortingHatService.REGRESSION_INTERVAL == 0

        if is_regression and session.current_min > 1:
            # Regression check: Get word 20% below current_min
            regression_tier = max(1, int(session.current_min * (1 - SortingHatService.REGRESSION_PERCENTAGE)))

            # Define regression tier range (±5 from the target)
            tier_min = max(1, regression_tier - 5)
            tier_max = min(regression_tier + 5, session.current_min - 1)

            # Get random word from regression tier
            stmt = (
                select(Word)
                .where(Word.difficulty_rank >= tier_min)
                .where(Word.difficulty_rank <= tier_max)
                .order_by(func.random())
                .limit(1)
            )
            result = await db.execute(stmt)
            word = result.scalar_one_or_none()

            if word:
                return word

        # Normal binary search: Get word closest to midpoint
        mid = (session.current_min + session.current_max) // 2

        # Try to find word at exact midpoint first
        stmt = select(Word).where(Word.difficulty_rank == mid).limit(1)
        result = await db.execute(stmt)
        word = result.scalar_one_or_none()

        if word:
            return word

        # If no word at exact midpoint, find closest word in range
        stmt = (
            select(Word)
            .where(Word.difficulty_rank >= session.current_min)
            .where(Word.difficulty_rank <= session.current_max)
            .order_by(func.abs(Word.difficulty_rank - mid))
            .limit(1)
        )
        result = await db.execute(stmt)
        word = result.scalar_one_or_none()

        return word

    @staticmethod
    async def submit_answer(
        db: AsyncSession, session: PlacementSession, is_known: bool
    ) -> tuple[PlacementSession, bool]:
        """
        Submit an answer and update the placement session using binary search logic.

        Args:
            db: Database session.
            session: PlacementSession instance.
            is_known: True if user knew the word, False otherwise.

        Returns:
            Tuple of (updated_session, is_complete).
            is_complete is True if the placement test should end.
        """
        # Update question count
        session.question_count += 1

        # Update binary search range based on answer
        if is_known:
            # User knows the word, search higher
            session.current_min = (session.current_min + session.current_max) // 2 + 1
        else:
            # User doesn't know the word, search lower
            session.current_max = (session.current_min + session.current_max) // 2

        # Check stop conditions
        range_size = session.current_max - session.current_min
        is_complete = (
            range_size < SortingHatService.MIN_RANGE_THRESHOLD
            or session.question_count >= SortingHatService.MAX_QUESTIONS
        )

        if is_complete:
            # Placement test is complete
            session.is_active = False
            # Final level is the midpoint of the final range
            session.final_level = (session.current_min + session.current_max) // 2

            # Update the user's level in the database
            from app.models.user import User
            stmt = select(User).where(User.id == session.user_id)
            result = await db.execute(stmt)
            user = result.scalar_one_or_none()
            if user:
                user.level = session.final_level

        # Persist changes
        db.add(session)
        await db.commit()
        await db.refresh(session)

        return session, is_complete

    @staticmethod
    async def create_session(db: AsyncSession, user_id: int) -> PlacementSession:
        """
        Create a new placement session for a user.

        Args:
            db: Database session.
            user_id: User ID.

        Returns:
            New PlacementSession instance.
        """
        # Check if user already has an active placement session
        stmt = (
            select(PlacementSession)
            .where(PlacementSession.user_id == user_id)
            .where(PlacementSession.is_active == True)
        )
        result = await db.execute(stmt)
        existing_session = result.scalar_one_or_none()

        if existing_session:
            # Return existing active session
            return existing_session

        # Create new session
        new_session = PlacementSession(
            user_id=user_id,
            current_min=1,
            current_max=100,
            question_count=0,
            is_active=True,
        )
        db.add(new_session)
        await db.commit()
        await db.refresh(new_session)

        return new_session

    @staticmethod
    async def get_active_session(
        db: AsyncSession, user_id: int
    ) -> Optional[PlacementSession]:
        """
        Get the active placement session for a user.

        Args:
            db: Database session.
            user_id: User ID.

        Returns:
            Active PlacementSession or None.
        """
        stmt = (
            select(PlacementSession)
            .where(PlacementSession.user_id == user_id)
            .where(PlacementSession.is_active == True)
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
