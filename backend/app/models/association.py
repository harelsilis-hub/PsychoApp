"""Association model definition."""
from typing import TYPE_CHECKING
from sqlalchemy import String, Integer, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.word import Word


class Association(Base):
    """
    Association model representing user-generated memory aids for words.

    Attributes:
        id: Primary key.
        word_id: Foreign key to Word.
        user_id: Foreign key to User.
        text: The association/memory aid text.
        likes: Number of likes received (default 0).
        word: Relationship to Word (Many-to-One).
        user: Relationship to User (Many-to-One).
    """

    __tablename__ = "associations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    word_id: Mapped[int] = mapped_column(Integer, ForeignKey("words.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    likes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    word: Mapped["Word"] = relationship("Word", back_populates="associations")
    user: Mapped["User"] = relationship("User", back_populates="associations")

    def __repr__(self) -> str:
        return f"<Association(id={self.id}, word_id={self.word_id}, user_id={self.user_id}, likes={self.likes})>"
