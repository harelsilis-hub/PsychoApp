"""UserWordProgress model definition."""
from typing import TYPE_CHECKING, Optional, Dict, Any
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Integer, ForeignKey, DateTime, JSON, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.word import Word


class WordStatus(str, PyEnum):
    """Enum representing the learning status of a word."""

    NEW = "New"
    LEARNING = "Learning"
    REVIEW = "Review"
    MASTERED = "Mastered"


class UserWordProgress(Base):
    """
    UserWordProgress model representing a user's progress on a specific word.
    Core model for implementing the SM-2 spaced repetition algorithm.

    Attributes:
        id: Primary key.
        user_id: Foreign key to User.
        word_id: Foreign key to Word.
        status: Current learning status (New, Learning, Review, Mastered).
        next_review: Timestamp for when the word should be reviewed next.
        srs_data: JSON field storing SM-2 algorithm data:
            - repetition_number: Number of successful reviews
            - easiness_factor: E-Factor (quality of recall, typically 1.3-2.5)
            - interval_days: Current interval between reviews in days
        user: Relationship to User (Many-to-One).
        word: Relationship to Word (Many-to-One).
    """

    __tablename__ = "user_word_progress"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    word_id: Mapped[int] = mapped_column(Integer, ForeignKey("words.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[WordStatus] = mapped_column(
        SQLEnum(WordStatus, values_callable=lambda obj: [e.value for e in obj]),
        default=WordStatus.NEW,
        nullable=False,
    )
    next_review: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    srs_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        default=lambda: {
            "repetition_number": 0,
            "easiness_factor": 2.5,
            "interval_days": 0,
        },
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="progress")
    word: Mapped["Word"] = relationship("Word", back_populates="progress_records")

    def __repr__(self) -> str:
        return (
            f"<UserWordProgress(id={self.id}, user_id={self.user_id}, "
            f"word_id={self.word_id}, status={self.status.value}, "
            f"next_review={self.next_review})>"
        )
