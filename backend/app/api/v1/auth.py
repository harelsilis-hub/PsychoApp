"""Authentication endpoints — register, login, and current user."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from passlib.context import CryptContext

from app.db.session import get_db
from app.models.user import User
from app.auth.jwt import create_access_token
from app.auth.dependencies import get_current_user

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str
    is_admin: bool = False


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user account."""
    result = await db.execute(select(User).where(User.email == data.email.strip().lower()))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )
    hashed = pwd_context.hash(data.password.strip())
    user = User(email=data.email.strip().lower(), hashed_password=hashed)
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(user.id, user.email)
    return AuthResponse(access_token=token, user_id=user.id, email=user.email, is_admin=user.is_admin)


@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Log in with email and password."""
    result = await db.execute(select(User).where(User.email == data.email.strip().lower()))
    user = result.scalar_one_or_none()

    if not user or not pwd_context.verify(data.password.strip(), user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    token = create_access_token(user.id, user.email)
    return AuthResponse(access_token=token, user_id=user.id, email=user.email, is_admin=user.is_admin)


@router.get("/me", response_model=AuthResponse)
async def me(current_user: User = Depends(get_current_user)):
    """Return the current authenticated user's fresh data from the DB."""
    return AuthResponse(
        access_token="",
        user_id=current_user.id,
        email=current_user.email,
        is_admin=current_user.is_admin,
    )
