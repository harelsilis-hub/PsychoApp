"""Word Pydantic schemas for API validation."""
from pydantic import BaseModel, Field, HttpUrl


class WordBase(BaseModel):
    """Base word schema with common attributes."""

    english: str = Field(..., description="English translation")
    hebrew: str = Field(..., description="Hebrew word")
    unit: int = Field(..., ge=1, le=10, description="Unit number (1-10)")


class WordCreate(WordBase):
    """Schema for creating a new word."""

    audio_url: str | None = Field(None, description="URL to pronunciation audio")


class WordResponse(WordBase):
    """Schema for word response."""

    id: int = Field(..., description="Word's unique identifier")
    audio_url: str | None = Field(None, description="URL to pronunciation audio")
    global_difficulty_level: int | None = Field(
        None,
        ge=1,
        le=20,
        description="Crowd-sourced difficulty level (1=easiest, 20=hardest). Null until first recalculation.",
    )

    model_config = {"from_attributes": True}


class WordUpdate(BaseModel):
    """Schema for updating word information."""

    english: str | None = Field(None, description="English translation")
    hebrew: str | None = Field(None, description="Hebrew word")
    unit: int | None = Field(None, ge=1, le=10, description="Unit number (1-10)")
    audio_url: str | None = Field(None, description="URL to pronunciation audio")
