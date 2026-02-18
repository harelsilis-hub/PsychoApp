"""PlacementSession model definition."""
from typing import TYPE_CHECKING
from datetime import datetime
from sqlalchemy import Integer, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.user import User


class PlacementSession(Base):
    """
    PlacementSession model for the "Sorting Hat" adaptive placement test.
    Uses binary search algorithm to determine user's vocabulary level.

    Attributes:
        id: Primary key.
        user_id: Foreign key to User.
        current_min: Current minimum difficulty range (default 1).
        current_max: Current maximum difficulty range (default 100).
        question_count: Number of questions asked so far (default 0).
        is_active: Whether the placement test is still ongoing.
        final_level: The determined difficulty level when test completes.
        created_at: Timestamp when session was created.
        updated_at: Timestamp when session was last updated.
        user: Relationship to User (Many-to-One).
    """

    __tablename__ = "placement_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    current_min: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    current_max: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    question_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    final_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="placement_sessions")

    def __repr__(self) -> str:
        return (
            f"<PlacementSession(id={self.id}, user_id={self.user_id}, "
            f"range=[{self.current_min}, {self.current_max}], "
            f"questions={self.question_count}, active={self.is_active})>"
        )
