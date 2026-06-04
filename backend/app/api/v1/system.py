from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.system_setting import SystemSetting

router = APIRouter()

@router.get("/settings/{key}")
async def get_system_setting(key: str, db: AsyncSession = Depends(get_db)):
    """Get a public system setting by key."""
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
    setting = result.scalar_one_or_none()
    
    if not setting:
        return {"key": key, "value": None}
    
    return {"key": setting.key, "value": setting.value}
