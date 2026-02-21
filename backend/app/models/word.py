"""Word model definition."""
from typing import List, TYPE_CHECKING, Optional
from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.association import Association
    from app.models.user_word_progress import UserWordProgress


class Word(Base):
    """
    Word model representing a vocabulary word in the system.

    Attributes:
        id: Primary key.
        english: English translation (indexed for searches).
        hebrew: Hebrew word.
        unit: Unit number (1-10, indexed for lookup).
        audio_url: Optional URL to pronunciation audio.
        associations: Relationship to Association (One-to-Many).
        progress_records: Relationship to UserWordProgress (One-to-Many).
    """

    __tablename__ = "words"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    english: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    hebrew: Mapped[str] = mapped_column(String(255), nullable=False)
    unit: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    audio_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    # Memory Aids (Associations)
    ai_association: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    user_association: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)

    # Crowd-sourced difficulty (1 = easiest, 20 = hardest). NULL until first recalculation.
    global_difficulty_level: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Relationships
    associations: Mapped[List["Association"]] = relationship(
        "Association",
        back_populates="word",
        cascade="all, delete-orphan",
    )
    progress_records: Mapped[List["UserWordProgress"]] = relationship(
        "UserWordProgress",
        back_populates="word",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Word(id={self.id}, english='{self.english}', hebrew='{self.hebrew}', unit={self.unit})>"
