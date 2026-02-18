"""Association Pydantic schemas for API validation."""
from pydantic import BaseModel, Field


class AssociationBase(BaseModel):
    """Base association schema with common attributes."""

    text: str = Field(..., min_length=1, max_length=1000, description="Association/memory aid text")


class AssociationCreate(AssociationBase):
    """Schema for creating a new association."""

    word_id: int = Field(..., description="Word ID this association is for")


class AssociationResponse(AssociationBase):
    """Schema for association response."""

    id: int = Field(..., description="Association's unique identifier")
    word_id: int = Field(..., description="Word ID")
    user_id: int = Field(..., description="User ID who created this")
    likes: int = Field(default=0, description="Number of likes")

    model_config = {"from_attributes": True}


class AssociationUpdate(BaseModel):
    """Schema for updating association."""

    text: str | None = Field(None, min_length=1, max_length=1000, description="Updated text")
