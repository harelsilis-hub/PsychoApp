"""PointEvent model — append-only audit log for XP awards."""
from datetime import datetime
from sqlalchemy import Integer, String, Float, DateTime, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class PointEvent(Base):
    __tablename__ = "point_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    source: Mapped[str] = mapped_column(String(50), nullable=False)
    base_points: Mapped[int] = mapped_column(Integer, nullable=False)
    multiplier: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    final_points: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_point_events_user_created", "user_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<PointEvent(user_id={self.user_id}, source='{self.source}', pts={self.final_points})>"
