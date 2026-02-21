"""
API endpoints for word associations (memory aids).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db.session import get_db
from app.models.user import User
from app.models.word import Word
from app.models.association import Association
from app.auth.dependencies import get_current_user


router = APIRouter()


class AssociationUpdate(BaseModel):
    """Schema for updating user association."""
    user_association: str
    user_id: int = 1


class SentenceUpdate(BaseModel):
    """Schema for setting the example sentence of a word."""
    sentence: str


class AssociationResponse(BaseModel):
    """Schema for association response."""
    word_id: int
    english: str
    hebrew: str
    ai_association: str | None
    user_association: str | None


class CommunityAssociationItem(BaseModel):
    """Schema for a single community association."""
    id: int
    text: str
    likes: int
    user_label: str


def generate_ai_association(english: str, hebrew: str) -> str:
    """
    Generate an example sentence for the given word.
    Placeholder implementation - can be enhanced with actual AI later.
    """
    word_lower = english.lower()

    templates = [
        f"The professor said, '{english}, these findings point to a clear conclusion.'",
        f"She wrote in her essay: 'The two ideas are {english} connected.'",
        f"'This is, {english}, one of the most important concepts,' he explained.",
        f"Good academic writers know exactly when to use '{english}' in a sentence.",
        f"The student asked: 'Can I use \"{english}\" to begin this paragraph?'",
        f"In the article, the author used '{english}' to introduce a key comparison.",
        f"'The results are {english} significant,' the scientist concluded.",
        f"She connected her argument by writing '{english}' between the two ideas.",
        f"The teacher highlighted '{english}' as an essential word for clear writing.",
        f"He ended his speech by saying: '{english}, the evidence is undeniable.'",
    ]

    template_index = sum(ord(c) for c in word_lower) % len(templates)
    return templates[template_index]


@router.get("/{word_id}/community", response_model=list[CommunityAssociationItem])
async def get_community_associations(
    word_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> list[CommunityAssociationItem]:
    """
    Get all community associations for a word, sorted by likes.
    """
    stmt = (
        select(Association)
        .where(Association.word_id == word_id)
        .order_by(Association.likes.desc())
    )
    result = await db.execute(stmt)
    associations = result.scalars().all()

    return [
        CommunityAssociationItem(
            id=a.id,
            text=a.text,
            likes=a.likes,
            user_label=f"User #{a.user_id}",
        )
        for a in associations
    ]


@router.post("/{word_id}/like/{association_id}")
async def like_association(
    word_id: int,
    association_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Increment likes on a community association."""
    stmt = select(Association).where(
        Association.id == association_id,
        Association.word_id == word_id
    )
    result = await db.execute(stmt)
    assoc = result.scalar_one_or_none()

    if not assoc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Association not found")

    assoc.likes += 1
    await db.commit()
    return {"id": assoc.id, "likes": assoc.likes}


@router.put("/{word_id}/sentence")
async def save_example_sentence(
    word_id: int,
    data: SentenceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Save or update the example sentence for a word."""
    stmt = select(Word).where(Word.id == word_id)
    result = await db.execute(stmt)
    word = result.scalar_one_or_none()

    if not word:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Word {word_id} not found")

    word.ai_association = data.sentence.strip()
    await db.commit()
    return {"word_id": word_id, "sentence": word.ai_association}


@router.get("/{word_id}", response_model=AssociationResponse)
async def get_word_associations(
    word_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> AssociationResponse:
    """
    Get associations for a specific word.
    Generates AI association if not already present.
    """
    stmt = select(Word).where(Word.id == word_id)
    result = await db.execute(stmt)
    word = result.scalar_one_or_none()

    if not word:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Word with id {word_id} not found"
        )

    if not word.ai_association:
        word.ai_association = generate_ai_association(word.english, word.hebrew)
        await db.commit()
        await db.refresh(word)

    return AssociationResponse(
        word_id=word.id,
        english=word.english,
        hebrew=word.hebrew,
        ai_association=word.ai_association,
        user_association=word.user_association
    )


@router.post("/{word_id}", response_model=AssociationResponse)
async def save_user_association(
    word_id: int,
    association_data: AssociationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> AssociationResponse:
    """
    Save or update user's custom association for a word.
    Also saves to the community Association table.
    """
    stmt = select(Word).where(Word.id == word_id)
    result = await db.execute(stmt)
    word = result.scalar_one_or_none()

    if not word:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Word with id {word_id} not found"
        )

    text = association_data.user_association.strip() if association_data.user_association else None

    # Update the word-level field
    word.user_association = text

    # Generate AI association if not present
    if not word.ai_association:
        word.ai_association = generate_ai_association(word.english, word.hebrew)

    # Always insert a new community association so all submissions are visible
    if text:
        db.add(Association(
            word_id=word_id,
            user_id=current_user.id,
            text=text,
            likes=0,
        ))

    await db.commit()
    await db.refresh(word)

    return AssociationResponse(
        word_id=word.id,
        english=word.english,
        hebrew=word.hebrew,
        ai_association=word.ai_association,
        user_association=word.user_association
    )
