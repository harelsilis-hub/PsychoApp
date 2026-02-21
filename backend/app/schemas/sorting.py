"""Pydantic schemas for Sorting Hat placement test."""
from datetime import datetime
from pydantic import BaseModel, Field

from app.schemas.word import WordResponse


class PlacementStart(BaseModel):
    """Schema for starting a new placement test."""

    user_id: int | None = Field(None, description="User ID (ignored — taken from JWT token)")


class PlacementUpdate(BaseModel):
    """Schema for submitting an answer to a placement question."""

    is_known: bool = Field(..., description="True if user knew the word, False otherwise")


class PlacementSessionInfo(BaseModel):
    """Schema for placement session information."""

    id: int = Field(..., description="Session ID")
    user_id: int = Field(..., description="User ID")
    current_min: int = Field(..., description="Current minimum difficulty")
    current_max: int = Field(..., description="Current maximum difficulty")
    question_count: int = Field(..., description="Number of questions asked")
    is_active: bool = Field(..., description="Whether the test is still active")
    final_level: int | None = Field(None, description="Final determined level (when complete)")
    created_at: datetime = Field(..., description="Session creation time")

    model_config = {"from_attributes": True}


class PlacementResponse(BaseModel):
    """Schema for placement test response (question or completion)."""

    session: PlacementSessionInfo = Field(..., description="Current session information")
    word: WordResponse | None = Field(None, description="Next word to test (None if complete)")
    distractors: list[WordResponse] = Field(default_factory=list, description="Distractor words (wrong answers for multiple choice)")
    is_complete: bool = Field(..., description="Whether the placement test is complete")
    message: str | None = Field(None, description="Completion message or additional info")


class PlacementStartResponse(BaseModel):
    """Schema for starting placement test response."""

    session: PlacementSessionInfo = Field(..., description="Placement session information")
    word: WordResponse = Field(..., description="First word to test")
    distractors: list[WordResponse] = Field(default_factory=list, description="Distractor words (wrong answers for multiple choice)")
    message: str = Field(default="Placement test started", description="Welcome message")
