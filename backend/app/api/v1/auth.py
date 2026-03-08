"""Authentication endpoints — register, login, and current user."""
import os
import secrets
from datetime import datetime, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from passlib.context import CryptContext
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from app.db.session import get_db
from app.models.user import User
from app.models.password_reset_token import PasswordResetToken
from app.auth.jwt import create_access_token
from app.auth.dependencies import get_current_user
from app.api.v1.push import notify_admins

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class RegisterRequest(BaseModel):
    email: str
    password: str
    display_name: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str
    is_admin: bool = False
    display_name: str | None = None


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
    display_name = data.display_name.strip()[:30] if data.display_name else None
    user = User(email=data.email.strip().lower(), hashed_password=hashed, display_name=display_name)
    db.add(user)
    await db.commit()
    await db.refresh(user)

    username = user.display_name or user.email
    await notify_admins(db, "משתמש חדש נרשם! 🎉", f"User {username} just joined.")
    token = create_access_token(user.id, user.email)
    return AuthResponse(access_token=token, user_id=user.id, email=user.email, is_admin=user.is_admin, display_name=user.display_name)


@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Log in with email and password."""
    result = await db.execute(select(User).where(User.email == data.email.strip().lower()))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="אימייל או סיסמה שגויים.")

    if not user.hashed_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="חשבון זה מחובר עם Google. אנא התחבר עם Google.")

    if not pwd_context.verify(data.password.strip(), user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="אימייל או סיסמה שגויים."
        )

    token = create_access_token(user.id, user.email)
    return AuthResponse(access_token=token, user_id=user.id, email=user.email, is_admin=user.is_admin, display_name=user.display_name)


@router.get("/me", response_model=AuthResponse)
async def me(current_user: User = Depends(get_current_user)):
    """Return the current authenticated user's fresh data from the DB."""
    return AuthResponse(
        access_token="",
        user_id=current_user.id,
        email=current_user.email,
        is_admin=current_user.is_admin,
        display_name=current_user.display_name,
    )


class GoogleAuthRequest(BaseModel):
    credential: str  # Google ID token


@router.post("/google", response_model=AuthResponse)
async def google_auth(data: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    """Sign in or register with a Google ID token."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth is not configured.")
    try:
        idinfo = google_id_token.verify_oauth2_token(
            data.credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Google token.")

    email = idinfo["email"].strip().lower()
    name = idinfo.get("name", "")
    display_name = name[:30] if name else None

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        user = User(email=email, hashed_password="", display_name=display_name)
        db.add(user)
        await db.commit()
        await db.refresh(user)

    token = create_access_token(user.id, user.email)
    return AuthResponse(
        access_token=token,
        user_id=user.id,
        email=user.email,
        is_admin=user.is_admin,
        display_name=user.display_name,
    )


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Send a password reset link to the user's email."""
    result = await db.execute(select(User).where(User.email == data.email.strip().lower()))
    user = result.scalar_one_or_none()

    # Always return 200 — never reveal whether an email exists
    if not user:
        return {"message": "אם הכתובת קיימת במערכת, נשלח אליה קישור לאיפוס סיסמה."}

    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=1)
    reset_token = PasswordResetToken(token=token, user_id=user.id, expires_at=expires_at)
    db.add(reset_token)
    await db.commit()

    frontend_url = os.getenv("FRONTEND_URL", "https://psychoapp-il.vercel.app")
    reset_link = f"{frontend_url}/reset-password?token={token}"
    resend_key = os.getenv("RESEND_API_KEY", "")

    if not resend_key:
        # Env var not configured — log and return success silently
        print(f"[WARN] RESEND_API_KEY not set. Reset link for {user.email}: {reset_link}")
        return {"message": "אם הכתובת קיימת במערכת, נשלח אליה קישור לאיפוס סיסמה."}

    async with httpx.AsyncClient() as client:
        await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {resend_key}"},
            json={
                "from": "Mila <noreply@milawords.site>",
                "to": [user.email],
                "subject": "איפוס סיסמה – Mila",
                "html": f"""
                <div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;">
                  <h2 style="color:#7c3aed;">Mila – איפוס סיסמה</h2>
                  <p>קיבלנו בקשה לאיפוס הסיסמה של החשבון שלך.</p>
                  <p>לחץ על הכפתור הבא לאיפוס הסיסמה. הקישור תקף לשעה אחת.</p>
                  <a href="{reset_link}"
                     style="display:inline-block;margin:16px 0;padding:12px 28px;
                            background:#7c3aed;color:#fff;border-radius:8px;
                            text-decoration:none;font-weight:bold;">
                    איפוס סיסמה
                  </a>
                  <p style="color:#888;font-size:13px;">
                    אם לא ביקשת איפוס סיסמה, פשוט התעלם מהודעה זו.
                  </p>
                </div>
                """,
            },
        )

    return {"message": "אם הכתובת קיימת במערכת, נשלח אליה קישור לאיפוס סיסמה."}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Reset a user's password using a valid token."""
    result = await db.execute(
        select(PasswordResetToken).where(PasswordResetToken.token == data.token)
    )
    reset_token = result.scalar_one_or_none()

    if not reset_token or reset_token.used or reset_token.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="הקישור אינו תקין או שפג תוקפו.")

    if len(data.password.strip()) < 6:
        raise HTTPException(status_code=400, detail="הסיסמה חייבת להכיל לפחות 6 תווים.")

    user = await db.get(User, reset_token.user_id)
    user.hashed_password = pwd_context.hash(data.password.strip())
    reset_token.used = True
    await db.commit()

    return {"message": "הסיסמה אופסה בהצלחה."}
