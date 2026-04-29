"""Unit tests for AuthService."""

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.core.exceptions import ConflictException, UnauthorizedException
from src.core.security import hash_password
from src.models.user import RefreshToken, User
from src.services.auth_service import AuthService


@pytest.fixture()
def user_repo() -> AsyncMock:
    return AsyncMock()


@pytest.fixture()
def token_repo() -> AsyncMock:
    return AsyncMock()


@pytest.fixture()
def service(user_repo: AsyncMock, token_repo: AsyncMock) -> AuthService:
    return AuthService(user_repo=user_repo, token_repo=token_repo)


def _make_user(
    id: int = 1,
    email: str = "test@example.com",
    name: str = "Test User",
    is_active: bool = True,
) -> User:
    user = User(
        id=id,
        email=email,
        hashed_password=hash_password("password123"),
        name=name,
        interests=[],
        is_active=is_active,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    return user


async def test_register__new_email__returns_auth_response(
    service: AuthService, user_repo: AsyncMock, token_repo: AsyncMock
) -> None:
    user_repo.get_by_email.return_value = None
    user_repo.create.return_value = _make_user()
    token_repo.create.return_value = MagicMock()

    result = await service.register("test@example.com", "password123", "Test User")

    assert result.access_token
    assert result.refresh_token
    assert result.user.email == "test@example.com"
    user_repo.create.assert_called_once()


async def test_register__existing_email__raises_conflict(
    service: AuthService, user_repo: AsyncMock
) -> None:
    user_repo.get_by_email.return_value = _make_user()

    with pytest.raises(ConflictException):
        await service.register("test@example.com", "password123", "Test User")


async def test_login__valid_credentials__returns_auth_response(
    service: AuthService, user_repo: AsyncMock, token_repo: AsyncMock
) -> None:
    user_repo.get_by_email.return_value = _make_user()
    token_repo.create.return_value = MagicMock()

    result = await service.login("test@example.com", "password123")

    assert result.access_token
    assert result.refresh_token
    assert result.user.email == "test@example.com"


async def test_login__wrong_password__raises_unauthorized(
    service: AuthService, user_repo: AsyncMock
) -> None:
    user_repo.get_by_email.return_value = _make_user()

    with pytest.raises(UnauthorizedException):
        await service.login("test@example.com", "wrong_password")


async def test_login__nonexistent_email__raises_unauthorized(
    service: AuthService, user_repo: AsyncMock
) -> None:
    user_repo.get_by_email.return_value = None

    with pytest.raises(UnauthorizedException):
        await service.login("nobody@example.com", "password123")


async def test_login__inactive_user__raises_unauthorized(
    service: AuthService, user_repo: AsyncMock
) -> None:
    user_repo.get_by_email.return_value = _make_user(is_active=False)

    with pytest.raises(UnauthorizedException):
        await service.login("test@example.com", "password123")


async def test_refresh__valid_token__returns_new_tokens(
    service: AuthService, user_repo: AsyncMock, token_repo: AsyncMock
) -> None:
    stored_token = RefreshToken(
        id=1, user_id=1, token_hash="hash", expires_at=datetime.now(UTC) + timedelta(days=1)
    )
    token_repo.find_by_hash.return_value = stored_token
    user_repo.get_by_id.return_value = _make_user()
    token_repo.create.return_value = MagicMock()

    result = await service.refresh("some_raw_token")

    assert result.access_token
    token_repo.revoke.assert_called_once_with(stored_token.id)


async def test_refresh__revoked_token__raises_unauthorized(
    service: AuthService, token_repo: AsyncMock
) -> None:
    stored_token = RefreshToken(
        id=1,
        user_id=1,
        token_hash="hash",
        expires_at=datetime.now(UTC) + timedelta(days=1),
        is_revoked=True,
    )
    token_repo.find_by_hash.return_value = stored_token

    with pytest.raises(UnauthorizedException):
        await service.refresh("some_raw_token")


async def test_logout__valid_token__revokes(
    service: AuthService, token_repo: AsyncMock
) -> None:
    stored_token = RefreshToken(
        id=1, user_id=1, token_hash="hash", expires_at=datetime.now(UTC) + timedelta(days=1)
    )
    token_repo.find_by_hash.return_value = stored_token

    await service.logout("some_raw_token")

    token_repo.revoke.assert_called_once_with(stored_token.id)
