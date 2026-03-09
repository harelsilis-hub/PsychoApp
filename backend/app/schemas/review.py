"""Review session Pydantic schemas for API validation."""
from datetime import datetime
from pydantic import BaseModel, Field


class ReviewSessionWord(BaseModel):
    """Word with progress data for review session."""

    word_id: int = Field(..., description="Word's unique identifier")
    english: str = Field(..., description="English word")
    hebrew: str = Field(..., description="Hebrew translation")
    unit: int = Field(..., description="Unit number (1-10)")
    is_new: bool = Field(..., description="True if never reviewed before")
    last_reviewed: datetime | None = Field(None, description="Last review timestamp")
    global_difficulty_level: int | None = Field(
        None,
        description="Crowd-sourced difficulty level (1=easiest, 20=hardest)",
    )


class ReviewSessionResponse(BaseModel):
    """Response for review session endpoint."""

    words: list[ReviewSessionWord] = Field(..., description="List of words for review")
    total_count: int = Field(..., description="Total words in session")
    due_count: int = Field(..., description="Number of overdue words")
    new_count: int = Field(..., description="Number of new learning words")
    message: str = Field(..., description="Session description message")


class ReviewSubmitResponse(BaseModel):
    """Response after submitting review."""

    success: bool = Field(..., description="Whether submission was successful")
    word_id: int = Field(..., description="Word ID that was reviewed")
    quality: int = Field(..., description="Quality rating submitted (0-5)")
    next_review: datetime = Field(..., description="Next review scheduled date")
    interval_days: int = Field(..., description="Interval until next review in days")
    status: str = Field(..., description="Current word status (Learning/Review/Mastered)")
    message: str = Field(..., description="Feedback message for user")
    daily_words_reviewed: int = 0
    current_streak: int = 0
    daily_goal: int = 15
    goal_reached: bool = False
    # Gamification fields
    xp_earned: int = 0
    new_xp: int = 0
    level_up: bool = False
    new_level_title: str | None = None
    new_badges: list[str] = []


class AcquisitionSubmitRequest(BaseModel):
    """Request body for Phase 1 unit-quiz submission."""

    word_id: int = Field(..., description="Word ID being answered")
    quality: int = Field(..., ge=0, le=5, description="Answer quality 0-5 (≥3 = correct)")


class AcquisitionSubmitResponse(BaseModel):
    """Response after submitting a Phase 1 unit-quiz answer."""

    success: bool
    word_id: int
    quality: int
    graduated: bool = Field(..., description="True if the word moved to Phase 2")
    learning_state: str = Field(..., description="'learning' or 'graduated'")
    next_review: datetime | None = Field(None, description="Set when graduated, else None")
    message: str
    xp_earned: int = 0
    new_xp: int = 0
    level_up: bool = False
    new_level_title: str | None = None
    new_badges: list[str] = []


class ReviewStatsResponse(BaseModel):
    """Review statistics for dashboard."""

    due_count: int = Field(..., description="Number of words due for review now")
    new_count: int = Field(..., description="Number of new learning words")
    total_reviews_today: int = Field(..., description="Number of reviews completed today")
    next_review_time: datetime | None = Field(None, description="Next scheduled review time")
