"""Poll model definition."""
from datetime import datetime
from sqlalchemy import Boolean, DateTime, String, Integer, ForeignKey, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

class Poll(Base):
    """
    Model representing a global poll for users.
    """
    __tablename__ = "polls"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    question: Mapped[str] = mapped_column(String(500), nullable=False)
    options: Mapped[list] = mapped_column(JSON, nullable=False) # List of option strings
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_test: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    votes: Mapped[list["PollVote"]] = relationship(
        "PollVote",
        back_populates="poll",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Poll(id={self.id}, question='{self.question}')>"


class PollVote(Base):
    """
    Model representing a user's vote in a poll.
    """
    __tablename__ = "poll_votes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    poll_id: Mapped[int] = mapped_column(Integer, ForeignKey("polls.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    option_index: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    poll: Mapped["Poll"] = relationship("Poll", back_populates="votes")
    
    def __repr__(self) -> str:
        return f"<PollVote(poll_id={self.poll_id}, user_id={self.user_id}, option_index={self.option_index})>"
