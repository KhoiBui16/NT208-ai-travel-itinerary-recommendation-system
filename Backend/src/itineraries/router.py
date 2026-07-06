"""Itinerary + Shared-trip API endpoints.

Router structure:
  - `router`        → /api/v1/itineraries   (authenticated trip operations)
  - `shared_router` → /api/v1/shared        (public read-only via share token)

Endpoint groups:
  1. Main CRUD           (EP 8-12): create, list, get, update, delete trips
  2. AI Generation       (EP 8):    generate itinerary via AI pipeline
  3. Chat Sessions       (C3A-1):    create, list, get chat sessions for companion chat
  4. Rating & Share      (EP 13-15): rate trip, create share link, claim trip
  5. Activity CRUD       (EP 16-18): add, update, delete activities within a day
  6. Accommodation CRUD  (EP 19-20): add, delete accommodations for a trip
  7. Shared Access       (EP 15):    public read-only trip view via shareToken
"""

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import get_current_user, get_current_user_optional
from src.auth.models import User
from src.core.database import get_db
from src.core.dependencies import get_rate_limiter
from src.core.rate_limiter import RateLimiter
from src.core.schema import PaginatedResponse, SuccessResponse
from src.itineraries.companion_service import CompanionService
from src.itineraries.schemas import (
    AccommodationSchema,
    ActivitySchema,
    ApplyPatchRequest,
    ApplyPatchResponse,
    ChatMessageListResponse,
    ChatMessageRequest,
    ChatSessionListResponse,
    ChatSessionResponse,
    ClaimTripRequest,
    CreateTripRequest,
    GenerateItineraryRequest,
    ItineraryResponse,
    SendChatMessageResponse,
    ShareResponse,
    UpdateChatSessionRequest,
    UpdateTripRequest,
)
from src.itineraries.service import ItineraryService

# ---------------------------------------------------------------------------
# Router initialization
# ---------------------------------------------------------------------------

# Primary router — all trip endpoints require authentication unless noted
router = APIRouter(prefix="/itineraries", tags=["Itineraries"])


def get_itinerary_service(session: AsyncSession = Depends(get_db)) -> ItineraryService:
    """Dependency injection factory for ItineraryService.

    Creates a new service instance per request, bound to the current
    database session provided by the `get_db` dependency.
    """
    return ItineraryService(session=session)


def get_companion_service(
    request: Request,
    session: AsyncSession = Depends(get_db),
) -> CompanionService:
    """Dependency factory cho `CompanionService`.

    Test integration có thể override provider bằng cách gán
    `app.state.companion_provider` trước khi gọi API.
    """
    provider = getattr(request.app.state, "companion_provider", None)
    return CompanionService(session=session, provider=provider)


# ===================================================================
# Main CRUD — Trip lifecycle operations
# ===================================================================


@router.post("/generate", response_model=ItineraryResponse, status_code=201)
async def generate_itinerary(
    body: GenerateItineraryRequest,
    request: Request,
    response: Response,
    user: User | None = Depends(get_current_user_optional),
    service: ItineraryService = Depends(get_itinerary_service),
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
) -> ItineraryResponse:
    """Generate a complete AI-powered itinerary (Phase C.1).

    - Authenticated users: enforces per-user AI rate limit
    - Guest users: enforces per-IP + user-agent rate limit
    - Returns rate limit headers (X-RateLimit-*) on every response
    """
    # Check rate limit and add headers
    if user:
        # Authenticated user — enforce per-user daily AI generation limit
        await rate_limiter.enforce_ai_limit(user.id)
        rate_info = await rate_limiter.get_remaining(user.id)
    else:
        # Guest user — enforce per-IP rate limit using client fingerprint
        await rate_limiter.enforce_ai_guest_limit(
            ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        # Get actual remaining for guest using the same actor key
        guest_actor = rate_limiter.guest_actor(
            ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        rate_info = await rate_limiter.get_remaining_for_actor(guest_actor)

    # Attach rate limit info as response headers for FE consumption
    response.headers["X-RateLimit-Limit"] = str(rate_info.limit)
    response.headers["X-RateLimit-Remaining"] = str(rate_info.remaining)
    response.headers["X-RateLimit-Reset"] = rate_info.reset_at.isoformat()

    return await service.generate(body, user_id=user.id if user else None)


@router.post("", response_model=ItineraryResponse, status_code=201)
async def create_trip(
    request: CreateTripRequest,
    user: User | None = Depends(get_current_user_optional),
    service: ItineraryService = Depends(get_itinerary_service),
) -> ItineraryResponse:
    """Create a new manual trip (empty shell, no AI generation).

    Both authenticated and guest users can create trips. Guest trips
    receive a claim_token in the response for later ownership transfer.
    """
    return await service.create_manual(request, user_id=user.id if user else None)


@router.get("", response_model=PaginatedResponse)
async def list_trips(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> PaginatedResponse:
    """List all trips owned by the authenticated user (paginated).

    Returns lightweight trip summaries without nested days/activities
    to keep the response fast for the TripLibrary and TripHistory pages.
    """
    return await service.list_by_user(user.id, page=page, size=size)


# ===================================================================
# Chat Sessions — Trip-bound companion chat session endpoints
# ===================================================================


@router.get(
    "/chat-sessions/{session_id}",
    response_model=ChatSessionResponse,
)
async def get_chat_session(
    session_id: int,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> ChatSessionResponse:
    """Get a chat session by ID."""
    return await service.get_chat_session(session_id, user.id)


@router.post(
    "/chat-sessions/{session_id}/messages",
    response_model=SendChatMessageResponse,
    status_code=201,
)
async def send_chat_message(
    session_id: int,
    body: ChatMessageRequest,
    response: Response,
    user: User = Depends(get_current_user),
    service: CompanionService = Depends(get_companion_service),
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
) -> SendChatMessageResponse:
    """Gửi một message vào companion chat của session hiện tại."""
    await rate_limiter.enforce_chat_limit(user.id)
    rate_info = await rate_limiter.get_chat_remaining(user.id)
    response.headers["X-RateLimit-Limit"] = str(rate_info.limit)
    response.headers["X-RateLimit-Remaining"] = str(rate_info.remaining)
    response.headers["X-RateLimit-Reset"] = rate_info.reset_at.isoformat()
    return await service.send_message(session_id, user.id, body)


@router.get(
    "/chat-sessions/{session_id}/messages",
    response_model=ChatMessageListResponse,
)
async def list_chat_messages(
    session_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    service: CompanionService = Depends(get_companion_service),
) -> ChatMessageListResponse:
    """Đọc persisted message history của một chat session."""
    return await service.list_messages(session_id, user.id, skip=skip, limit=limit)


@router.post(
    "/{trip_id}/apply-patch",
    response_model=ApplyPatchResponse,
)
async def apply_chat_patch(
    trip_id: int,
    body: ApplyPatchRequest,
    response: Response,
    user: User = Depends(get_current_user),
    service: CompanionService = Depends(get_companion_service),
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
) -> ApplyPatchResponse:
    """Xác nhận hoặc hủy một AI proposal rồi mới persist thay đổi vào itinerary."""
    await rate_limiter.enforce_apply_patch_limit(user.id)
    rate_info = await rate_limiter.get_apply_patch_remaining(user.id)
    response.headers["X-RateLimit-Limit"] = str(rate_info.limit)
    response.headers["X-RateLimit-Remaining"] = str(rate_info.remaining)
    response.headers["X-RateLimit-Reset"] = rate_info.reset_at.isoformat()
    return await service.apply_patch(trip_id, user.id, body)


@router.post(
    "/{trip_id}/chat-sessions",
    response_model=ChatSessionResponse,
    status_code=201,
)
async def create_chat_session(
    trip_id: int,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> ChatSessionResponse:
    """Create a new chat session for a trip."""
    return await service.create_chat_session(trip_id, user.id)


@router.get(
    "/{trip_id}/chat-sessions",
    response_model=ChatSessionListResponse,
)
async def list_chat_sessions(
    trip_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> ChatSessionListResponse:
    """List chat sessions for a trip."""
    return await service.list_chat_sessions(trip_id, user.id, skip=skip, limit=limit)


@router.patch(
    "/chat-sessions/{session_id}",
    response_model=ChatSessionResponse,
)
async def rename_chat_session(
    session_id: int,
    body: UpdateChatSessionRequest,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> ChatSessionResponse:
    """Đổi tên một chat session (C4 history-management UX)."""
    return await service.rename_chat_session(session_id, user.id, body.title)


@router.delete(
    "/chat-sessions/{session_id}",
    status_code=204,
)
async def delete_chat_session(
    session_id: int,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> None:
    """Xoá một chat session và toàn bộ message của nó (cascade)."""
    await service.delete_chat_session(session_id, user.id)


@router.get("/{trip_id}", response_model=ItineraryResponse)
async def get_trip(
    trip_id: int,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> ItineraryResponse:
    """Get full trip details including all nested days, activities, and accommodations.

    Only the trip owner can access this endpoint.
    For public access, use the shared endpoint with a share token.
    """
    return await service.get_by_id(trip_id, user_id=user.id)


@router.put("/{trip_id}", response_model=ItineraryResponse)
async def update_trip(
    trip_id: int,
    request: UpdateTripRequest,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> ItineraryResponse:
    """Auto-save endpoint for trip editing — supports partial nested updates.

    The FE TripWorkspace calls this on every meaningful change. The service
    performs diff/sync logic: creates new items, updates existing ones, and
    deletes items that were removed from the incoming payload.
    """
    return await service.update(trip_id, request, user_id=user.id)


@router.delete("/{trip_id}", status_code=204)
async def delete_trip(
    trip_id: int,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> None:
    """Permanently delete a trip and all nested data (cascade).

    Only the trip owner can delete. Returns 204 No Content on success.
    """
    await service.delete(trip_id, user_id=user.id)


# ===================================================================
# Rating & Share — Social and feedback features
# ===================================================================


@router.put("/{trip_id}/rating")
async def rate_trip(
    trip_id: int,
    rating: int = Query(..., ge=1, le=5),
    feedback: str | None = None,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> SuccessResponse:
    """Rate a trip with 1-5 stars and optional text feedback.

    Uses upsert logic — calling again with same trip_id updates the rating.
    Only the trip owner can rate their own trip.
    """
    await service.rate(trip_id, user_id=user.id, rating=rating, feedback=feedback)
    return SuccessResponse(message="Rating saved")


@router.post("/{trip_id}/share", response_model=ShareResponse)
async def share_trip(
    trip_id: int,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> ShareResponse:
    """Create a public share link for read-only trip access.

    If a share link already exists, returns the existing one (with redacted token).
    Share links are stored as opaque hashed tokens in the database.
    """
    return await service.share(trip_id, user_id=user.id)


@router.post("/{trip_id}/claim")
async def claim_trip(
    trip_id: int,
    request: ClaimTripRequest,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> dict:
    """Claim a guest-created trip after login/registration.

    Validates the one-time claim token and transfers trip ownership
    to the authenticated user. Token is consumed after successful claim.
    """
    return await service.claim(trip_id, user_id=user.id, request=request)


# ===================================================================
# Activity CRUD — Sub-resource operations within a trip day
# ===================================================================


@router.post("/{trip_id}/activities", response_model=ActivitySchema, status_code=201)
async def add_activity(
    trip_id: int,
    day_id: int = Query(..., description="TripDay ID to add activity to"),
    data: ActivitySchema = ...,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> ActivitySchema:
    """Add a new activity to a specific day within the trip.

    The `day_id` query parameter specifies which TripDay receives the activity.
    Validates that the day belongs to the trip and the user owns the trip.
    """
    return await service.add_activity(trip_id, day_id, data, user_id=user.id)


@router.put("/{trip_id}/activities/{activity_id}", response_model=ActivitySchema)
async def update_activity(
    trip_id: int,
    activity_id: int,
    data: ActivitySchema,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> ActivitySchema:
    """Update an existing activity's details (time, name, costs, etc.).

    Only non-null fields from the request body are applied as updates.
    """
    return await service.update_activity(trip_id, activity_id, data, user_id=user.id)


@router.delete("/{trip_id}/activities/{activity_id}", status_code=204)
async def delete_activity(
    trip_id: int,
    activity_id: int,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> None:
    """Remove an activity from the trip. Returns 204 on success."""
    await service.delete_activity(trip_id, activity_id, user_id=user.id)


# ===================================================================
# Accommodation CRUD — Lodging sub-resource operations
# ===================================================================


@router.post("/{trip_id}/accommodations", response_model=AccommodationSchema, status_code=201)
async def add_accommodation(
    trip_id: int,
    data: AccommodationSchema,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> AccommodationSchema:
    """Add a new accommodation record to the trip.

    Accommodations link to specific day IDs via the `dayIds` field.
    """
    return await service.add_accommodation(trip_id, data, user_id=user.id)


@router.delete("/{trip_id}/accommodations/{accommodation_id}", status_code=204)
async def delete_accommodation(
    trip_id: int,
    accommodation_id: int,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> None:
    """Remove an accommodation record from the trip. Returns 204 on success."""
    await service.delete_accommodation(trip_id, accommodation_id, user_id=user.id)


# ===================================================================
# Shared Trip Access — Public read-only endpoint (EP-15)
# ===================================================================

# Separate router with /shared prefix — no authentication required
shared_router = APIRouter(prefix="/shared", tags=["Shared"])


@shared_router.get("/{share_token}", response_model=ItineraryResponse)
async def get_shared_trip(
    share_token: str,
    service: ItineraryService = Depends(get_itinerary_service),
) -> ItineraryResponse:
    """Access a shared trip via its public share token (read-only).

    No authentication required. The share token is hashed and looked up
    in the database. Returns 404 if the link is invalid, revoked, or expired.
    """
    return await service.get_by_share_token(share_token)
