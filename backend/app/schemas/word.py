"""Word Pydantic schemas for API validation."""
from pydantic import BaseModel, Field, HttpUrl


class WordBase(BaseModel):
    """Base word schema with common attributes."""

    english: str = Field(..., description="English translation")
    hebrew: str = Field(..., description="Hebrew word")
    difficulty_rank: int = Field(..., ge=1, le=100, description="Difficulty ranking (1-100)")


class WordCreate(WordBase):
    """Schema for creating a new word."""

    audio_url: str | None = Field(None, description="URL to pronunciation audio")


class WordResponse(WordBase):
    """Schema for word response."""

    id: int = Field(..., description="Word's unique identifier")
    audio_url: str | None = Field(None, description="URL to pronunciation audio")

    model_config = {"from_attributes": True}


class WordUpdate(BaseModel):
    """Schema for updating word information."""

    english: str | None = Field(None, description="English translation")
    hebrew: str | None = Field(None, description="Hebrew word")
    difficulty_rank: int | None = Field(None, ge=1, le=100, description="Difficulty ranking")
    audio_url: str | None = Field(None, description="URL to pronunciation audio")
