"""User Pydantic schemas for API validation."""
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """Base user schema with common attributes."""

    email: EmailStr = Field(..., description="User's email address")


class UserCreate(UserBase):
    """Schema for creating a new user."""

    password: str = Field(..., min_length=8, description="User's password (min 8 characters)")
    display_name: Optional[str] = Field(None, max_length=30, description="Display name (up to 30 chars)")


class UserLogin(BaseModel):
    """Schema for user login."""

    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., description="User's password")


class UserResponse(UserBase):
    """Schema for user response."""

    id: int = Field(..., description="User's unique identifier")
    xp: int = Field(default=0, description="User's experience points")
    level: int = Field(default=1, description="User's current level")
    display_name: Optional[str] = Field(None, description="User's display name")

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    """Schema for updating user information."""

    email: EmailStr | None = Field(None, description="New email address")
    password: str | None = Field(None, min_length=8, description="New password")
