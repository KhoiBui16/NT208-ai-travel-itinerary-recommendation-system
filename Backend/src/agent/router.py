"""Agent endpoints — DB-only suggestion (EP-30); companion/analytics in later phases."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import get_current_user
from src.auth.models import User
from src.core.database import get_db
from src.places.schemas import SuggestionResponse
from src.places.suggestion_service import SuggestionService

agent_router = APIRouter(prefix="/agent", tags=["Agent"])


def get_suggestion_service(session: AsyncSession = Depends(get_db)) -> SuggestionService:
    return SuggestionService(session=session)


@agent_router.get("/suggest/{activity_id}", response_model=SuggestionResponse)
async def suggest_alternatives(
    activity_id: int,
    limit: int = Query(default=5, ge=1, le=20),
    user: User = Depends(get_current_user),
    service: SuggestionService = Depends(get_suggestion_service),
) -> SuggestionResponse:
    """EP-30: DB-only alternatives for an activity (trip owner only)."""
    return await service.suggest_alternatives(activity_id, user.id, limit=limit)
