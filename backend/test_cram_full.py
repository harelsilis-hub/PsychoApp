import asyncio
from fastapi import Request
from app.db.session import AsyncSessionLocal
from app.api.v1.review import get_cram_session
from app.models.user import User

async def test():
    async with AsyncSessionLocal() as db:
        user = await db.get(User, 2)
        if not user:
            print("No user 2")
            return
        try:
            resp = await get_cram_session(limit=20, language='en', current_user=user, db=db)
            print("Success:", resp)
        except Exception as e:
            print("Error in API:", repr(e))

asyncio.run(test())
