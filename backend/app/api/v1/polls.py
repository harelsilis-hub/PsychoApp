from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.db.session import get_db
from app.models.poll import Poll, PollVote
from app.models.user import User
from app.auth.dependencies import get_current_user

router = APIRouter()

class VoteRequest(BaseModel):
    option_index: int

@router.get("/active")
async def get_active_poll(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the currently active poll, if any. Returns null if none active or already voted."""
    result = await db.execute(select(Poll).where(Poll.is_active == True))
    poll = result.scalar_one_or_none()
    
    if not poll:
        return {"poll": None}
        
    # Check if poll is in test mode, only admins can see it
    if poll.is_test and not user.is_admin:
        return {"poll": None}
        
    # Check if user already voted
    vote_result = await db.execute(
        select(PollVote).where(PollVote.poll_id == poll.id, PollVote.user_id == user.id)
    )
    if vote_result.scalar_one_or_none():
        return {"poll": None} # Already voted, don't show it again
        
    return {
        "poll": {
            "id": poll.id,
            "question": poll.question,
            "options": poll.options
        }
    }

@router.post("/{poll_id}/vote")
async def vote_on_poll(
    poll_id: int,
    req: VoteRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submit a vote for a poll."""
    # Verify poll exists and is active
    result = await db.execute(select(Poll).where(Poll.id == poll_id, Poll.is_active == True))
    poll = result.scalar_one_or_none()
    if not poll:
        raise HTTPException(status_code=404, detail="Active poll not found")
        
    # Verify option index is valid
    if req.option_index < 0 or req.option_index >= len(poll.options):
        raise HTTPException(status_code=400, detail="Invalid option index")
        
    # Check if already voted
    vote_result = await db.execute(
        select(PollVote).where(PollVote.poll_id == poll_id, PollVote.user_id == user.id)
    )
    if vote_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User has already voted")
        
    vote = PollVote(poll_id=poll_id, user_id=user.id, option_index=req.option_index)
    db.add(vote)
    await db.commit()
    
    return {"success": True}
