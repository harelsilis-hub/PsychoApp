from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from app.db.session import Base


class UserFeedback(Base):
    __tablename__ = "user_feedback"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_email = Column(String, nullable=True)   # denormalised so it survives user deletion
    category   = Column(String, default="general")  # "bug" | "idea" | "general"
    message    = Column(Text, nullable=False)
    is_read    = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
