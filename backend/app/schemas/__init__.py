"""Pydantic schemas package for API validation."""
from app.schemas.user import UserCreate, UserLogin, UserResponse, UserUpdate
from app.schemas.word import WordCreate, WordResponse, WordUpdate
from app.schemas.association import AssociationCreate, AssociationResponse, AssociationUpdate
from app.schemas.progress import (
    ProgressCreate,
    ProgressResponse,
    ProgressUpdate,
    ReviewResult,
    SRSData,
)
from app.schemas.sorting import (
    PlacementStart,
    PlacementUpdate,
    PlacementResponse,
    PlacementStartResponse,
    PlacementSessionInfo,
)

__all__ = [
    # User schemas
    "UserCreate",
    "UserLogin",
    "UserResponse",
    "UserUpdate",
    # Word schemas
    "WordCreate",
    "WordResponse",
    "WordUpdate",
    # Association schemas
    "AssociationCreate",
    "AssociationResponse",
    "AssociationUpdate",
    # Progress schemas
    "ProgressCreate",
    "ProgressResponse",
    "ProgressUpdate",
    "ReviewResult",
    "SRSData",
    # Sorting Hat schemas
    "PlacementStart",
    "PlacementUpdate",
    "PlacementResponse",
    "PlacementStartResponse",
    "PlacementSessionInfo",
]
