"""
Sorting Hat API endpoints - Adaptive placement test.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.services.sorting_hat import SortingHatService
from app.schemas.sorting import (
    PlacementStart,
    PlacementUpdate,
    PlacementResponse,
    PlacementStartResponse,
    PlacementSessionInfo,
)
from app.schemas.word import WordResponse
from app.auth.dependencies import get_current_user

router = APIRouter()


@router.post("/start", response_model=PlacementStartResponse, status_code=status.HTTP_201_CREATED)
async def start_placement_test(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PlacementStartResponse:
    """
    Start a new placement test session.
    Creates a new placement session and returns the first word to test.
    """
    session = await SortingHatService.create_session(db, current_user.id)

    word = await SortingHatService.get_next_word(db, session)

    if not word:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to find suitable word for placement test.",
        )

    distractors = await SortingHatService.get_distractors(db, word, count=3)

    session_info = PlacementSessionInfo.model_validate(session)
    word_response = WordResponse.model_validate(word)
    distractor_responses = [WordResponse.model_validate(d) for d in distractors]

    return PlacementStartResponse(
        session=session_info,
        word=word_response,
        distractors=distractor_responses,
        message=f"Placement test started. Question {session.question_count + 1} of up to {SortingHatService.MAX_QUESTIONS}.",
    )


@router.post("/answer", response_model=PlacementResponse)
async def submit_placement_answer(
    answer_data: PlacementUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PlacementResponse:
    """Submit an answer to the current placement question."""
    session = await SortingHatService.get_active_session(db, current_user.id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active placement session found. Please start a new placement test.",
        )

    updated_session, is_complete = await SortingHatService.submit_answer(
        db, session, answer_data.is_known
    )

    session_info = PlacementSessionInfo.model_validate(updated_session)

    if is_complete:
        return PlacementResponse(
            session=session_info,
            word=None,
            is_complete=True,
            message=(
                f"Placement test complete! Your vocabulary level has been determined: "
                f"Level {updated_session.final_level}. "
                f"You answered {updated_session.question_count} questions."
            ),
        )

    next_word = await SortingHatService.get_next_word(db, updated_session)

    if not next_word:
        updated_session.is_active = False
        updated_session.final_level = (updated_session.current_min + updated_session.current_max) // 2
        db.add(updated_session)
        await db.commit()
        await db.refresh(updated_session)

        session_info = PlacementSessionInfo.model_validate(updated_session)

        return PlacementResponse(
            session=session_info,
            word=None,
            is_complete=True,
            message=(
                f"Placement test complete (no more suitable words). "
                f"Your vocabulary level: Level {updated_session.final_level}."
            ),
        )

    distractors = await SortingHatService.get_distractors(db, next_word, count=3)
    word_response = WordResponse.model_validate(next_word)
    distractor_responses = [WordResponse.model_validate(d) for d in distractors]

    is_regression = updated_session.question_count % SortingHatService.REGRESSION_INTERVAL == 0
    regression_hint = " (Regression check)" if is_regression else ""

    return PlacementResponse(
        session=session_info,
        word=word_response,
        distractors=distractor_responses,
        is_complete=False,
        message=(
            f"Question {updated_session.question_count + 1} of up to {SortingHatService.MAX_QUESTIONS}"
            f"{regression_hint}. Current range: [{updated_session.current_min}, {updated_session.current_max}]"
        ),
    )


@router.get("/session", response_model=PlacementSessionInfo)
async def get_placement_session(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PlacementSessionInfo:
    """Get the active placement session for the current user."""
    session = await SortingHatService.get_active_session(db, current_user.id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active placement session found for this user.",
        )

    return PlacementSessionInfo.model_validate(session)
