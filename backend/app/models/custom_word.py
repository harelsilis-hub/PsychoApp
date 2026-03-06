"""CustomWord model — user-created vocabulary cards with embedded SM-2 tracking."""
from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy import Integer, ForeignKey, String, DateTime, JSON, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.user_word_progress import WordStatus


class CustomWord(Base):
    """
    A vocabulary card created by a user.
    SM-2 state is stored directly on the record (no separate progress table).
    """

    __tablename__ = "custom_words"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    english_word: Mapped[str] = mapped_column(String(255), nullable=False)
    hebrew_translation: Mapped[str] = mapped_column(String(1000), nullable=False)
    status: Mapped[WordStatus] = mapped_column(
        SQLEnum(WordStatus, values_callable=lambda obj: [e.value for e in obj]),
        default=WordStatus.LEARNING,
        nullable=False,
    )
    next_review: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    srs_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        default=lambda: {"repetition_number": 0, "easiness_factor": 2.5, "interval_days": 0},
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<CustomWord(id={self.id}, user_id={self.user_id}, word='{self.english_word}')>"
