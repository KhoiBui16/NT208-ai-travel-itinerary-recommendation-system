"""User endpoints: profile, update profile, change password.

EP-5: GET  /api/v1/users/profile  — Read current user's profile (auth required)
EP-6: PUT  /api/v1/users/profile  — Update profile fields (partial update)
EP-7: PUT  /api/v1/users/password — Change password (verify current first)

All endpoints require Bearer auth. The user is resolved from the JWT
by get_current_user — the FE never provides a user ID.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.models.user import User
from src.repositories.user_repo import UserRepository
from src.schemas.common import SuccessResponse
from src.schemas.user import ChangePasswordRequest, UpdateProfileRequest, UserResponse
from src.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


def _user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    """DI factory: create UserService with fresh repo instance per request."""
    return UserService(user_repo=UserRepository(db))


@router.get("/profile", response_model=UserResponse)
async def get_profile(user: User = Depends(get_current_user)) -> UserResponse:
    """EP-5: Get the authenticated user's profile.

    Args:
        user: Current user resolved from Bearer token.

    Returns:
        UserResponse with id, email, name, phone, interests, timestamps.

    Raises:
        401 Unauthorized: Missing or invalid Bearer token.
    """
    return UserResponse.model_validate(user)


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    body: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    service: UserService = Depends(_user_service),
) -> UserResponse:
    """EP-6: Partially update the authenticated user's profile.

    Only non-null fields in the request body are updated.
    Sending {"name": null} is a no-op for that field.

    Args:
        body: UpdateProfileRequest with optional name, phone, interests.
        user: Current user from Bearer token.
        service: UserService injected per request.

    Returns:
        UserResponse with updated profile.

    Raises:
        401 Unauthorized: Missing or invalid Bearer token.
    """
    return await service.update_profile(
        user=user,
        name=body.name,
        phone=body.phone,
        interests=body.interests,
    )


@router.put("/password", response_model=SuccessResponse)
async def change_password(
    body: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    service: UserService = Depends(_user_service),
) -> SuccessResponse:
    """EP-7: Change the authenticated user's password.

    Verifies the current password before accepting the new one.

    Args:
        body: ChangePasswordRequest with currentPassword and newPassword.
        user: Current user from Bearer token.
        service: UserService injected per request.

    Returns:
        SuccessResponse confirming the change.

    Raises:
        401 Unauthorized: Current password is incorrect or missing Bearer token.
    """
    await service.change_password(
        user=user,
        current_password=body.current_password,
        new_password=body.new_password,
    )
    return SuccessResponse(message="Password changed successfully")
