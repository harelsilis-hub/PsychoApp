"""
Progress service for managing user word progress and triage mode.
"""
from datetime import datetime, date as date_type
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.word import Word
from app.models.user_word_progress import UserWordProgress, WordStatus

UNIT_WORD_TOTALS = {1: 283, 2: 376, 3: 359, 4: 379, 5: 384, 6: 386, 7: 387, 8: 404, 9: 388, 10: 396}


class ProgressService:
    """Service for managing user progress and learning queue."""

    @staticmethod
    async def update_word_status(
        db: AsyncSession,
        user_id: int,
        word_id: int,
        is_known: bool
    ) -> tuple[UserWordProgress, str]:
        """
        Update word status during triage mode.

        Args:
            db: Database session.
            user_id: User ID.
            word_id: Word ID.
            is_known: True if user knows the word (Mastered), False if learning.

        Returns:
            Tuple of (UserWordProgress, status_message).
        """
        # Check if progress record exists
        stmt = select(UserWordProgress).where(
            UserWordProgress.user_id == user_id,
            UserWordProgress.word_id == word_id
        )
        result = await db.execute(stmt)
        progress = result.scalar_one_or_none()

        if progress:
            # Update existing record
            if is_known:
                progress.status = WordStatus.MASTERED
                message = "Word marked as Mastered!"
            else:
                progress.status = WordStatus.LEARNING
                progress.next_review = datetime.utcnow()
                message = "Word added to Learning queue!"
        else:
            # Create new record
            status = WordStatus.MASTERED if is_known else WordStatus.LEARNING
            progress = UserWordProgress(
                user_id=user_id,
                word_id=word_id,
                status=status,
                next_review=datetime.utcnow() if not is_known else None,
                srs_data={
                    "repetition_number": 0,
                    "easiness_factor": 2.5,
                    "interval_days": 0,
                }
            )
            db.add(progress)
            message = f"Word marked as {'Mastered' if is_known else 'Learning'}!"

        await db.commit()
        await db.refresh(progress)

        return progress, message

    @staticmethod
    async def get_user_stats(db: AsyncSession, user_id: int) -> dict:
        """
        Get user statistics for dashboard.

        Args:
            db: Database session.
            user_id: User ID.

        Returns:
            Dictionary with user stats.
        """
        # Get user info
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            return {
                "user_id": user_id,
                "level": 1,
                "xp": 0,
                "words_mastered": 0,
                "words_learning": 0,
                "words_in_review": 0,
                "total_words": 0,
            }

        # Count words by status
        stmt = select(func.count(UserWordProgress.id)).where(
            UserWordProgress.user_id == user_id,
            UserWordProgress.status == WordStatus.MASTERED
        )
        result = await db.execute(stmt)
        words_mastered = result.scalar() or 0

        stmt = select(func.count(UserWordProgress.id)).where(
            UserWordProgress.user_id == user_id,
            UserWordProgress.status == WordStatus.LEARNING
        )
        result = await db.execute(stmt)
        words_learning = result.scalar() or 0

        stmt = select(func.count(UserWordProgress.id)).where(
            UserWordProgress.user_id == user_id,
            UserWordProgress.status == WordStatus.REVIEW
        )
        result = await db.execute(stmt)
        words_in_review = result.scalar() or 0

        # Get total words in database
        stmt = select(func.count(Word.id))
        result = await db.execute(stmt)
        total_words = result.scalar() or 0

        # Midnight reset: clear daily counter if it's a new day
        today = date_type.today()
        if user.last_active_date != today and user.daily_words_reviewed > 0:
            user.daily_words_reviewed = 0
            await db.commit()
            await db.refresh(user)

        # Get review stats
        from app.services.review_service import ReviewService
        review_stats = await ReviewService.get_review_stats(db, user_id)

        return {
            "user_id": user.id,
            "level": user.level,
            "xp": user.xp,
            "words_mastered": words_mastered,
            "words_learning": words_learning,
            "words_in_review": words_in_review,
            "total_words": total_words,
            "due_count": review_stats["due_count"],
            "new_learning_count": review_stats["new_count"],
            "reviews_today": review_stats["total_reviews_today"],
            "current_streak": user.current_streak,
            "daily_words_reviewed": user.daily_words_reviewed,
            "daily_goal": 15,
        }

    @staticmethod
    async def get_unit_stats(db: AsyncSession, user_id: int) -> dict:
        """
        Get per-unit progress counts and overall stats for a user.

        A word is "learned" when its status is REVIEW or MASTERED.

        Returns:
            {
                'units': [{'unit': int, 'learned': int, 'total': int, 'percent': float}],
                'total_learned': int,
                'total_words': int,
                'overall_percent': float,
            }
        """
        # Count learned words (REVIEW or MASTERED) per unit via LEFT OUTER JOIN
        stmt = (
            select(Word.unit, func.count(UserWordProgress.id).label("learned"))
            .select_from(Word)
            .outerjoin(
                UserWordProgress,
                and_(
                    UserWordProgress.word_id == Word.id,
                    UserWordProgress.user_id == user_id,
                    UserWordProgress.status.in_([WordStatus.REVIEW, WordStatus.MASTERED]),
                ),
            )
            .group_by(Word.unit)
            .order_by(Word.unit)
        )
        result = await db.execute(stmt)
        learned_by_unit = {row.unit: row.learned for row in result.all()}

        units = []
        total_learned = 0
        total_words = sum(UNIT_WORD_TOTALS.values())

        for unit_num in range(1, 11):
            learned = learned_by_unit.get(unit_num, 0)
            total = UNIT_WORD_TOTALS[unit_num]
            total_learned += learned
            units.append({
                "unit": unit_num,
                "learned": learned,
                "total": total,
                "percent": round(learned / total * 100, 1) if total > 0 else 0.0,
            })

        return {
            "units": units,
            "total_learned": total_learned,
            "total_words": total_words,
            "overall_percent": round(total_learned / total_words * 100, 1) if total_words > 0 else 0.0,
        }

    @staticmethod
    async def get_next_triage_word(
        db: AsyncSession,
        user_id: int,
        user_level: int
    ) -> tuple[Word | None, int]:
        """
        Get next word for triage mode at user's level.

        Args:
            db: Database session.
            user_id: User ID.
            user_level: User's current level from placement test.

        Returns:
            Tuple of (Word, remaining_count).
        """
        # Get words at user's unit that haven't been triaged
        # Clamp unit to 1-10 range
        unit_number = max(1, min(10, user_level))

        # Get all word IDs that have been triaged by this user
        stmt = select(UserWordProgress.word_id).where(
            UserWordProgress.user_id == user_id
        )
        result = await db.execute(stmt)
        triaged_word_ids = [row[0] for row in result.all()]

        # Get untriaged words at user's unit
        stmt = (
            select(Word)
            .where(Word.unit == unit_number)
        )
        if triaged_word_ids:
            stmt = stmt.where(Word.id.not_in(triaged_word_ids))

        stmt = stmt.order_by(func.random()).limit(1)
        result = await db.execute(stmt)
        word = result.scalar_one_or_none()

        # Count remaining words
        count_stmt = (
            select(func.count(Word.id))
            .where(Word.unit == unit_number)
        )
        if triaged_word_ids:
            count_stmt = count_stmt.where(Word.id.not_in(triaged_word_ids))

        result = await db.execute(count_stmt)
        remaining = result.scalar() or 0

        return word, remaining
