"""
Review service for managing SRS review sessions with SM-2 algorithm.
"""
from datetime import datetime, timedelta
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.word import Word
from app.models.user_word_progress import UserWordProgress, WordStatus


class ReviewService:
    """Service for managing spaced repetition review sessions."""

    @staticmethod
    def calculate_sm2(
        quality: int,
        repetition_number: int,
        easiness_factor: float,
        interval_days: int
    ) -> tuple[int, float, int]:
        """
        Calculate next review parameters using SM-2 algorithm.

        SM-2 Algorithm:
        - Quality scale: 0 (complete blackout) to 5 (perfect recall)
        - Quality < 3 = Fail: Reset repetition count, interval = 1 day
        - Quality ≥ 3 = Pass: Increment repetition, calculate new interval

        Args:
            quality: Quality rating 0-5
            repetition_number: Current repetition count
            easiness_factor: Current EF (1.3-2.5)
            interval_days: Current interval in days

        Returns:
            Tuple of (new_repetition_number, new_easiness_factor, new_interval_days)
        """
        # Validate quality
        if quality < 0 or quality > 5:
            raise ValueError("Quality must be between 0 and 5")

        # Calculate new easiness factor
        # Formula: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
        new_ef = easiness_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

        # Bound easiness factor: minimum 1.3
        new_ef = max(1.3, new_ef)

        # Check if review was successful
        if quality < 3:
            # Failed review: reset to start
            new_repetition = 0
            new_interval = 1
        else:
            # Successful review: increment and calculate interval
            new_repetition = repetition_number + 1

            if new_repetition == 1:
                # First review: 1 day
                new_interval = 1
            elif new_repetition == 2:
                # Second review: 6 days
                new_interval = 6
            else:
                # Subsequent reviews: previous interval * EF
                new_interval = round(interval_days * new_ef)

            # Cap maximum interval at 365 days (1 year)
            new_interval = min(new_interval, 365)

        return new_repetition, new_ef, new_interval

    @staticmethod
    async def get_due_words(
        db: AsyncSession,
        user_id: int,
        limit: int = 20
    ) -> list[tuple[UserWordProgress, Word]]:
        """
        Get words due for review, prioritizing overdue words.

        Returns mix of:
        - Words with status=REVIEW and next_review <= now (due for review)
        - Words with status=LEARNING and next_review <= now (failed words)
        - Words with status=LEARNING and next_review IS NULL (new words)

        Args:
            db: Database session
            user_id: User ID
            limit: Max words to return

        Returns:
            List of (UserWordProgress, Word) tuples ordered by priority
        """
        now = datetime.utcnow()

        # Query for due words and new learning words
        stmt = (
            select(UserWordProgress, Word)
            .join(Word, UserWordProgress.word_id == Word.id)
            .where(UserWordProgress.user_id == user_id)
            .where(
                or_(
                    # Due words: REVIEW or LEARNING with next_review in past
                    (UserWordProgress.next_review <= now),
                    # New words: LEARNING with no next_review set
                    (UserWordProgress.status == WordStatus.LEARNING) &
                    (UserWordProgress.next_review.is_(None))
                )
            )
            .order_by(
                # Priority order:
                # 1. Due words (next_review in past) - ordered by how overdue
                UserWordProgress.next_review.asc().nullslast()
            )
            .limit(limit)
        )

        result = await db.execute(stmt)
        return result.all()

    @staticmethod
    async def get_unit_words(
        db: AsyncSession,
        user_id: int,
        unit_number: int,
        limit: int = 50
    ) -> list[tuple]:
        """
        Get words for a specific unit, pairing each with its progress record (or None).

        Args:
            db: Database session
            user_id: User ID
            unit_number: Unit number (1-10)
            limit: Max words to return

        Returns:
            List of (UserWordProgress | None, Word) tuples
        """
        from sqlalchemy import and_

        # Fetch words in the unit with a left outer join on user progress
        # select_from(Word) ensures Word is the driving table so UserWordProgress
        # can be None for words the user has never seen.
        stmt = (
            select(UserWordProgress, Word)
            .select_from(Word)
            .outerjoin(
                UserWordProgress,
                and_(
                    UserWordProgress.word_id == Word.id,
                    UserWordProgress.user_id == user_id,
                )
            )
            .where(Word.unit == unit_number)
            .order_by(Word.id)
            .limit(limit)
        )

        result = await db.execute(stmt)
        return result.all()

    @staticmethod
    async def submit_review(
        db: AsyncSession,
        user_id: int,
        word_id: int,
        quality: int
    ) -> tuple[UserWordProgress, dict]:
        """
        Submit review result and update progress with SM-2 algorithm.

        Args:
            db: Database session
            user_id: User ID
            word_id: Word ID
            quality: Quality rating 0-5

        Returns:
            Tuple of (updated_progress, result_info)
            result_info contains: {
                'next_review': datetime,
                'interval_days': int,
                'status': str,
                'message': str
            }

        Raises:
            ValueError: If progress record not found or quality invalid
        """
        # Fetch progress record
        stmt = select(UserWordProgress).where(
            UserWordProgress.user_id == user_id,
            UserWordProgress.word_id == word_id
        )
        result = await db.execute(stmt)
        progress = result.scalar_one_or_none()

        if not progress:
            # Auto-create progress record for unit-based sessions
            progress = UserWordProgress(
                user_id=user_id,
                word_id=word_id,
                status=WordStatus.LEARNING,
                next_review=None,
                srs_data={
                    "repetition_number": 0,
                    "easiness_factor": 2.5,
                    "interval_days": 0,
                }
            )
            db.add(progress)
            await db.flush()  # assign id without committing

        # Extract current SRS data
        srs_data = progress.srs_data or {
            "repetition_number": 0,
            "easiness_factor": 2.5,
            "interval_days": 0,
        }

        repetition_number = srs_data.get("repetition_number", 0)
        easiness_factor = srs_data.get("easiness_factor", 2.5)
        interval_days = srs_data.get("interval_days", 0)

        # Calculate new SM-2 parameters
        new_repetition, new_ef, new_interval = ReviewService.calculate_sm2(
            quality, repetition_number, easiness_factor, interval_days
        )

        # Update SRS data
        progress.srs_data = {
            "repetition_number": new_repetition,
            "easiness_factor": new_ef,
            "interval_days": new_interval,
        }

        # Calculate next review date
        progress.next_review = datetime.utcnow() + timedelta(days=new_interval)

        # Update status if transitioning from LEARNING to REVIEW
        old_status = progress.status
        if progress.status == WordStatus.LEARNING and quality >= 3 and new_repetition > 0:
            progress.status = WordStatus.REVIEW

        # Check for mastery: 8+ successful reviews with 180+ day interval
        if new_repetition >= 8 and new_interval >= 180:
            progress.status = WordStatus.MASTERED

        # Commit changes
        await db.commit()
        await db.refresh(progress)

        # Prepare result info
        status_change = progress.status != old_status

        if progress.status == WordStatus.MASTERED:
            message = "🎉 Word mastered! You've achieved long-term retention."
        elif status_change and progress.status == WordStatus.REVIEW:
            message = f"✓ Great! This word is now in your review queue. Next review in {new_interval} day(s)."
        elif quality >= 3:
            message = f"✓ Good! Next review in {new_interval} day(s)."
        else:
            message = f"Keep trying! You'll see this word again tomorrow."

        result_info = {
            'next_review': progress.next_review,
            'interval_days': new_interval,
            'status': progress.status.value,
            'message': message,
            'quality': quality,
        }

        return progress, result_info

    @staticmethod
    async def get_review_stats(
        db: AsyncSession,
        user_id: int
    ) -> dict:
        """
        Get review statistics for dashboard.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            {
                'due_count': int,  # Words past next_review
                'new_count': int,  # LEARNING words never reviewed (next_review IS NULL)
                'total_reviews_today': int,  # Future feature
                'next_review_time': datetime | None  # Earliest next review
            }
        """
        now = datetime.utcnow()

        # Count due words (next_review in past)
        due_stmt = select(func.count(UserWordProgress.id)).where(
            UserWordProgress.user_id == user_id,
            UserWordProgress.next_review <= now,
            UserWordProgress.next_review.is_not(None)
        )
        due_result = await db.execute(due_stmt)
        due_count = due_result.scalar() or 0

        # Count new learning words (never reviewed)
        new_stmt = select(func.count(UserWordProgress.id)).where(
            UserWordProgress.user_id == user_id,
            UserWordProgress.status == WordStatus.LEARNING,
            UserWordProgress.next_review.is_(None)
        )
        new_result = await db.execute(new_stmt)
        new_count = new_result.scalar() or 0

        # Get next review time (earliest upcoming review)
        next_stmt = (
            select(func.min(UserWordProgress.next_review))
            .where(
                UserWordProgress.user_id == user_id,
                UserWordProgress.next_review > now
            )
        )
        next_result = await db.execute(next_stmt)
        next_review_time = next_result.scalar()

        return {
            "due_count": due_count,
            "new_count": new_count,
            "total_reviews_today": 0,  # Future: track review history
            "next_review_time": next_review_time,
        }
