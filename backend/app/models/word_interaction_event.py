"""WordInteractionEvent model — append-only log of every user interaction."""
from datetime import datetime
from sqlalchemy import Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class WordInteractionEvent(Base):
    """
    Append-only audit log of every triage swipe and review submission.

    Columns
    -------
    interaction_type : 'triage' | 'review'
    outcome          : 'known' | 'unknown'  (triage)
                       '0'..'5'             (review quality rating)
    created_at       : UTC timestamp, set once on insert, never updated
    """

    __tablename__ = "word_interaction_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    word_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("words.id", ondelete="CASCADE"), nullable=False, index=True
    )
    interaction_type: Mapped[str] = mapped_column(String(10), nullable=False)
    outcome: Mapped[str] = mapped_column(String(10), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    def __repr__(self) -> str:
        return (
            f"<WordInteractionEvent(id={self.id}, user_id={self.user_id}, "
            f"word_id={self.word_id}, type={self.interaction_type!r}, "
            f"outcome={self.outcome!r}, at={self.created_at})>"
        )
