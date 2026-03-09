"""
Progress service for managing user word progress and triage mode.
"""
from datetime import date as date_type
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.word import Word
from app.models.user_word_progress import UserWordProgress, WordStatus
from app.models.word_interaction_event import WordInteractionEvent

UNIT_WORD_TOTALS_EN = {1: 283, 2: 376, 3: 359, 4: 379, 5: 384, 6: 386, 7: 387, 8: 404, 9: 388, 10: 396}


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
                progress.learning_state = "graduated"  # skip acquisition quiz
                message = "Word marked as Mastered!"
            else:
                progress.status = WordStatus.LEARNING
                progress.learning_state = "learning"
                progress.next_review = func.now()
                message = "Word added to Learning queue!"
        else:
            # Create new record
            status = WordStatus.MASTERED if is_known else WordStatus.LEARNING
            progress = UserWordProgress(
                user_id=user_id,
                word_id=word_id,
                status=status,
                learning_state="graduated" if is_known else "learning",
                next_review=func.now() if not is_known else None,
                srs_data={
                    "repetition_number": 0,
                    "easiness_factor": 2.5,
                    "interval_days": 0,
                }
            )
            db.add(progress)
            message = f"Word marked as {'Mastered' if is_known else 'Learning'}!"

        # Commit the core progress update first — this MUST succeed
        await db.commit()
        await db.refresh(progress)

        # Log the raw interaction event (best-effort, non-fatal)
        try:
            db.add(WordInteractionEvent(
                user_id=user_id,
                word_id=word_id,
                interaction_type="triage",
                outcome="known" if is_known else "unknown",
            ))
            await db.commit()
        except Exception as exc:
            await db.rollback()
            print(f"[WARN] interaction event not saved: {exc}")

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
    async def get_unit_stats(db: AsyncSession, user_id: int, language: str = "en") -> dict:
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
        # Get all units and their total word counts for this language
        total_stmt = (
            select(Word.unit, func.count(Word.id).label("total"))
            .where(Word.language == language)
            .group_by(Word.unit)
            .order_by(Word.unit)
        )
        total_result = await db.execute(total_stmt)
        totals_by_unit = {row.unit: row.total for row in total_result.all()}

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
            .where(Word.language == language)
            .group_by(Word.unit)
            .order_by(Word.unit)
        )
        result = await db.execute(stmt)
        learned_by_unit = {row.unit: row.learned for row in result.all()}

        all_units = sorted(totals_by_unit.keys())
        units = []
        total_learned = 0
        total_words = sum(totals_by_unit.values())

        for unit_num in all_units:
            learned = learned_by_unit.get(unit_num, 0)
            total = totals_by_unit[unit_num]
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
        user_level: int,
        language: str = "en",
    ) -> tuple[Word | None, int]:
        """
        Get next word for triage mode at user's level.

        Args:
            db: Database session.
            user_id: User ID.
            user_level: User's current level from placement test.
            language: 'en' or 'he'

        Returns:
            Tuple of (Word, remaining_count).
        """
        unit_number = max(1, min(10, user_level))

        stmt = select(UserWordProgress.word_id).where(
            UserWordProgress.user_id == user_id
        )
        result = await db.execute(stmt)
        triaged_word_ids = [row[0] for row in result.all()]

        stmt = (
            select(Word)
            .where(Word.unit == unit_number)
            .where(Word.language == language)
        )
        if triaged_word_ids:
            stmt = stmt.where(Word.id.not_in(triaged_word_ids))

        stmt = stmt.order_by(func.random()).limit(1)
        result = await db.execute(stmt)
        word = result.scalar_one_or_none()

        count_stmt = (
            select(func.count(Word.id))
            .where(Word.unit == unit_number)
            .where(Word.language == language)
        )
        if triaged_word_ids:
            count_stmt = count_stmt.where(Word.id.not_in(triaged_word_ids))

        result = await db.execute(count_stmt)
        remaining = result.scalar() or 0

        return word, remaining

    @staticmethod
    async def get_batch_triage_words(
        db: AsyncSession,
        user_id: int,
        user_level: int,
        count: int = 50,
        language: str = "en",
    ) -> tuple[list[Word], int]:
        """Return up to `count` random untriaged words + total remaining count."""
        unit_number = max(1, min(10, user_level))

        stmt = select(UserWordProgress.word_id).where(UserWordProgress.user_id == user_id)
        result = await db.execute(stmt)
        triaged_word_ids = [row[0] for row in result.all()]

        stmt = select(Word).where(Word.unit == unit_number).where(Word.language == language)
        if triaged_word_ids:
            stmt = stmt.where(Word.id.not_in(triaged_word_ids))
        stmt = stmt.order_by(func.random()).limit(count)
        result = await db.execute(stmt)
        words = list(result.scalars().all())

        count_stmt = select(func.count(Word.id)).where(Word.unit == unit_number).where(Word.language == language)
        if triaged_word_ids:
            count_stmt = count_stmt.where(Word.id.not_in(triaged_word_ids))
        result = await db.execute(count_stmt)
        remaining = result.scalar() or 0

        return words, remaining
