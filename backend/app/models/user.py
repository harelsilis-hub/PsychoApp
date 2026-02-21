"""User model definition."""
from datetime import date
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.user_word_progress import UserWordProgress
    from app.models.association import Association
    from app.models.placement_session import PlacementSession


class User(Base):
    """
    User model representing a user in the vocabulary learning system.

    Attributes:
        id: Primary key.
        email: Unique user email (indexed for fast lookups).
        hashed_password: Bcrypt hashed password.
        xp: Experience points earned by the user (default 0).
        level: User's current level (default 1).
        progress: Relationship to UserWordProgress (One-to-Many).
        associations: Relationship to Association (One-to-Many).
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    xp: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    level: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    current_streak: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    daily_words_reviewed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_active_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Relationships
    progress: Mapped[List["UserWordProgress"]] = relationship(
        "UserWordProgress",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    associations: Mapped[List["Association"]] = relationship(
        "Association",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    placement_sessions: Mapped[List["PlacementSession"]] = relationship(
        "PlacementSession",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}', level={self.level}, xp={self.xp})>"
