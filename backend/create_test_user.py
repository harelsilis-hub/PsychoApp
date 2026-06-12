import asyncio
from sqlalchemy import select
from passlib.context import CryptContext
from app.db.session import AsyncSessionLocal
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_or_update_test_user():
    async with AsyncSessionLocal() as db:
        email = "test@test.com"
        password = "password123"
        hashed = pwd_context.hash(password)
        
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if user:
            user.hashed_password = hashed
            user.is_admin = True
            print(f"Updated password for {email} to {password}")
        else:
            user = User(email=email, hashed_password=hashed, display_name="Test User", is_admin=True)
            db.add(user)
            print(f"Created user {email} with password {password}")
            
        await db.commit()

if __name__ == "__main__":
    asyncio.run(create_or_update_test_user())
