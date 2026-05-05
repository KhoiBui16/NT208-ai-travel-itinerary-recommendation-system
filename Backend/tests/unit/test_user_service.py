"""Unit tests for UserService."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest

from src.auth.models import User
from src.auth.profile_service import UserService
from src.core.exceptions import UnauthorizedException
from src.core.security import hash_password


@pytest.fixture()
def user_repo() -> AsyncMock:
    return AsyncMock()


@pytest.fixture()
def service(user_repo: AsyncMock) -> UserService:
    return UserService(user_repo=user_repo)


def _make_user() -> User:
    return User(
        id=1,
        email="test@example.com",
        hashed_password=hash_password("password123"),
        name="Test User",
        phone="0901234567",
        interests=["food", "nature"],
        is_active=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


async def test_get_profile__returns_user_response(service: UserService) -> None:
    user = _make_user()
    result = await service.get_profile(user)

    assert result.email == "test@example.com"
    assert result.name == "Test User"


async def test_update_profile__name_only__updates_name(
    service: UserService, user_repo: AsyncMock
) -> None:
    user = _make_user()
    user_repo.get_by_id.return_value = user

    def _update(usr: User, **kwargs: object) -> User:
        for k, v in kwargs.items():
            setattr(usr, k, v)
        return usr

    user_repo.update.side_effect = _update

    result = await service.update_profile(user_id=1, name="New Name")

    user_repo.get_by_id.assert_called_once_with(1)
    user_repo.update.assert_called_once()
    assert result.name == "New Name"


async def test_update_profile__none_values__skips_update(
    service: UserService, user_repo: AsyncMock
) -> None:
    user = _make_user()
    user_repo.get_by_id.return_value = user

    await service.update_profile(user_id=1, name=None, phone=None, interests=None)

    user_repo.update.assert_not_called()


async def test_update_profile__user_not_found__raises_unauthorized(
    service: UserService, user_repo: AsyncMock
) -> None:
    user_repo.get_by_id.return_value = None

    with pytest.raises(UnauthorizedException):
        await service.update_profile(user_id=999, name="New Name")


async def test_change_password__correct_current__updates(
    service: UserService, user_repo: AsyncMock
) -> None:
    user = _make_user()
    user_repo.get_by_id.return_value = user
    user_repo.update.return_value = user

    await service.change_password(
        user_id=1, current_password="password123", new_password="newpass456"
    )

    user_repo.get_by_id.assert_called_once_with(1)
    user_repo.update.assert_called_once()


async def test_change_password__wrong_current__raises_unauthorized(
    service: UserService, user_repo: AsyncMock
) -> None:
    user = _make_user()
    user_repo.get_by_id.return_value = user

    with pytest.raises(UnauthorizedException):
        await service.change_password(
            user_id=1, current_password="wrong_current", new_password="newpass456"
        )


async def test_change_password__user_not_found__raises_unauthorized(
    service: UserService, user_repo: AsyncMock
) -> None:
    user_repo.get_by_id.return_value = None

    with pytest.raises(UnauthorizedException):
        await service.change_password(
            user_id=999, current_password="password123", new_password="newpass456"
        )
