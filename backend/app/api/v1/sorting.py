"""
Sorting Hat API endpoints - Adaptive placement test.

This module provides endpoints for the "Sorting Hat" adaptive vocabulary
placement test using binary search algorithm.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.sorting_hat import SortingHatService
from app.schemas.sorting import (
    PlacementStart,
    PlacementUpdate,
    PlacementResponse,
    PlacementStartResponse,
    PlacementSessionInfo,
)
from app.schemas.word import WordResponse

router = APIRouter()


@router.post("/start", response_model=PlacementStartResponse, status_code=status.HTTP_201_CREATED)
async def start_placement_test(
    placement_data: PlacementStart,
    db: AsyncSession = Depends(get_db),
) -> PlacementStartResponse:
    """
    Start a new placement test session.

    Creates a new placement session and returns the first word to test.
    If an active session already exists, returns that session with its next word.

    Args:
        placement_data: Contains user_id for the placement test.
        db: Database session.

    Returns:
        PlacementStartResponse with session info and first word.

    Raises:
        HTTPException: If word selection fails.
    """
    # Create or get existing session
    session = await SortingHatService.create_session(db, placement_data.user_id)

    # Get the first word
    word = await SortingHatService.get_next_word(db, session)

    if not word:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to find suitable word for placement test. Please ensure words exist in the database.",
        )

    # Convert to response schemas
    session_info = PlacementSessionInfo.model_validate(session)
    word_response = WordResponse.model_validate(word)

    return PlacementStartResponse(
        session=session_info,
        word=word_response,
        message=f"Placement test started. Question {session.question_count + 1} of up to {SortingHatService.MAX_QUESTIONS}.",
    )


@router.post("/answer", response_model=PlacementResponse)
async def submit_placement_answer(
    answer_data: PlacementUpdate,
    user_id: int,
    db: AsyncSession = Depends(get_db),
) -> PlacementResponse:
    """
    Submit an answer to the current placement question.

    Updates the placement session based on the answer and returns either
    the next word or the completion status with final level.

    Args:
        answer_data: Contains is_known boolean for the answer.
        user_id: User ID (should match the active session).
        db: Database session.

    Returns:
        PlacementResponse with updated session, next word (if continuing), or completion status.

    Raises:
        HTTPException: If no active session found or word selection fails.
    """
    # Get active session
    session = await SortingHatService.get_active_session(db, user_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active placement session found. Please start a new placement test.",
        )

    # Submit answer and update session
    updated_session, is_complete = await SortingHatService.submit_answer(
        db, session, answer_data.is_known
    )

    # Prepare response
    session_info = PlacementSessionInfo.model_validate(updated_session)

    if is_complete:
        # Test complete
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

    # Get next word
    next_word = await SortingHatService.get_next_word(db, updated_session)

    if not next_word:
        # No more suitable words, end the test
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

    # Test continues
    word_response = WordResponse.model_validate(next_word)

    # Check if this is a regression question
    is_regression = updated_session.question_count % SortingHatService.REGRESSION_INTERVAL == 0
    regression_hint = " (Regression check)" if is_regression else ""

    return PlacementResponse(
        session=session_info,
        word=word_response,
        is_complete=False,
        message=(
            f"Question {updated_session.question_count + 1} of up to {SortingHatService.MAX_QUESTIONS}"
            f"{regression_hint}. Current range: [{updated_session.current_min}, {updated_session.current_max}]"
        ),
    )


@router.get("/session/{user_id}", response_model=PlacementSessionInfo)
async def get_placement_session(
    user_id: int,
    db: AsyncSession = Depends(get_db),
) -> PlacementSessionInfo:
    """
    Get the active placement session for a user.

    Args:
        user_id: User ID.
        db: Database session.

    Returns:
        PlacementSessionInfo for the active session.

    Raises:
        HTTPException: If no active session found.
    """
    session = await SortingHatService.get_active_session(db, user_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active placement session found for this user.",
        )

    return PlacementSessionInfo.model_validate(session)
