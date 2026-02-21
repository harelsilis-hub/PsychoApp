"""UserWordProgress Pydantic schemas for API validation."""
from datetime import datetime
from typing import Dict, Any
from pydantic import BaseModel, Field

from app.models.user_word_progress import WordStatus


class SRSData(BaseModel):
    """Schema for SM-2 algorithm data."""

    repetition_number: int = Field(default=0, ge=0, description="Number of successful reviews")
    easiness_factor: float = Field(default=2.5, ge=1.3, le=2.5, description="E-Factor for SM-2")
    interval_days: int = Field(default=0, ge=0, description="Interval between reviews in days")


class ProgressBase(BaseModel):
    """Base progress schema with common attributes."""

    status: WordStatus = Field(default=WordStatus.NEW, description="Learning status")


class ProgressCreate(ProgressBase):
    """Schema for creating new progress record."""

    word_id: int = Field(..., description="Word ID to track progress for")


class ProgressResponse(ProgressBase):
    """Schema for progress response."""

    id: int = Field(..., description="Progress record's unique identifier")
    user_id: int = Field(..., description="User ID")
    word_id: int = Field(..., description="Word ID")
    next_review: datetime | None = Field(None, description="Next review timestamp")
    srs_data: Dict[str, Any] | None = Field(None, description="SM-2 algorithm data")

    model_config = {"from_attributes": True}


class ProgressUpdate(BaseModel):
    """Schema for updating progress after review."""

    status: WordStatus | None = Field(None, description="Updated status")
    next_review: datetime | None = Field(None, description="Next review timestamp")
    srs_data: SRSData | None = Field(None, description="Updated SM-2 data")


class ReviewResult(BaseModel):
    """Schema for submitting a review result."""

    user_id: int | None = Field(None, description="User ID (ignored — taken from JWT token)")
    word_id: int = Field(..., description="Word ID being reviewed")
    quality: int = Field(..., ge=0, le=5, description="Quality of recall (0-5 for SM-2)")


class TriageUpdate(BaseModel):
    """Schema for triage mode word sorting."""

    user_id: int | None = Field(None, description="User ID (ignored — taken from JWT token)")
    word_id: int = Field(..., description="Word ID")
    is_known: bool = Field(..., description="True if user knows the word (Mastered), False if learning")


class TriageResponse(BaseModel):
    """Schema for triage update response."""

    success: bool = Field(..., description="Whether the update was successful")
    status: str = Field(..., description="New status of the word (Mastered or Learning)")
    message: str = Field(..., description="Status message")


class UserStatsResponse(BaseModel):
    """Schema for user statistics and dashboard data."""

    user_id: int = Field(..., description="User ID")
    level: int = Field(..., description="User's current level from placement test")
    xp: int = Field(..., description="User's experience points")
    words_mastered: int = Field(..., description="Number of mastered words")
    words_learning: int = Field(..., description="Number of words in learning queue")
    words_in_review: int = Field(..., description="Number of words in review status")
    total_words: int = Field(..., description="Total words in database")
    due_count: int = Field(default=0, description="Number of words due for review now")
    new_learning_count: int = Field(default=0, description="Number of new learning words ready to review")
    reviews_today: int = Field(default=0, description="Number of reviews completed today")
    current_streak: int = Field(default=0)
    daily_words_reviewed: int = Field(default=0)
    daily_goal: int = Field(default=15)
