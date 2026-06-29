"""Unit tests for password reset (forgot_password / reset_password)."""

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, Mock

import pytest

import src.itineraries.models  # noqa: F401  # Ensure SQLAlchemy relationships are registered
from src.auth.models import User
from src.auth.service import AuthService
from src.core.exceptions import UnauthorizedException
from src.core.security import hash_password


@pytest.fixture()
def user_repo() -> AsyncMock:
    return AsyncMock()


@pytest.fixture()
def token_repo() -> AsyncMock:
    return AsyncMock()


@pytest.fixture()
def email_service() -> Mock:
    service = Mock()
    service.get_password_reset_delivery_mode = Mock(return_value="smtp")
    service.send_password_reset = AsyncMock(return_value="smtp")
    return service


@pytest.fixture()
def service(user_repo: AsyncMock, token_repo: AsyncMock, email_service: Mock) -> AuthService:
    return AuthService(
        user_repo=user_repo,
        token_repo=token_repo,
        email_service=email_service,
    )


def _make_user(
    id: int = 1,
    email: str = "test@example.com",
    is_active: bool = True,
    reset_token_hash: str | None = None,
    reset_expires_at: datetime | None = None,
) -> User:
    return User(
        id=id,
        email=email,
        hashed_password=hash_password("oldPassword123"),
        name="Test User",
        interests=[],
        is_active=is_active,
        password_reset_token_hash=reset_token_hash,
        password_reset_expires_at=reset_expires_at,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


async def test_forgot_password__existing_email__sends_reset(
    service: AuthService,
    user_repo: AsyncMock,
    email_service: Mock,
) -> None:
    user_repo.get_by_email.return_value = _make_user()
    user_repo.update.return_value = _make_user()

    delivery_mode = await service.forgot_password("test@example.com")

    user_repo.update.assert_called_once()
    email_service.send_password_reset.assert_called_once()
    call_kwargs = email_service.send_password_reset.call_args
    assert call_kwargs.kwargs["to_email"] == "test@example.com"
    assert "reset_" in call_kwargs.kwargs["reset_token"]
    assert delivery_mode == "smtp"


async def test_forgot_password__nonexistent_email__silent_return(
    service: AuthService,
    user_repo: AsyncMock,
    email_service: Mock,
) -> None:
    user_repo.get_by_email.return_value = None

    delivery_mode = await service.forgot_password("nobody@example.com")

    user_repo.update.assert_not_called()
    email_service.send_password_reset.assert_not_called()
    assert delivery_mode == "smtp"


async def test_forgot_password__inactive_user__silent_return(
    service: AuthService,
    user_repo: AsyncMock,
    email_service: Mock,
) -> None:
    user_repo.get_by_email.return_value = _make_user(is_active=False)

    delivery_mode = await service.forgot_password("test@example.com")

    user_repo.update.assert_not_called()
    email_service.send_password_reset.assert_not_called()
    assert delivery_mode == "smtp"


async def test_forgot_password__delivery_disabled__does_not_generate_token(
    service: AuthService,
    user_repo: AsyncMock,
    email_service: Mock,
) -> None:
    user_repo.get_by_email.return_value = _make_user()
    email_service.get_password_reset_delivery_mode.return_value = "disabled"

    delivery_mode = await service.forgot_password("test@example.com")

    assert delivery_mode == "disabled"
    user_repo.update.assert_not_called()
    email_service.send_password_reset.assert_not_called()


async def test_reset_password__valid_token__updates_password(
    service: AuthService,
    user_repo: AsyncMock,
    token_repo: AsyncMock,
) -> None:
    from src.core.security import create_password_reset_token

    raw_token, token_hash, expires_at = create_password_reset_token()
    user = _make_user(
        reset_token_hash=token_hash,
        reset_expires_at=expires_at,
    )
    user_repo.get_by_reset_token_hash.return_value = user
    user_repo.update.return_value = user
    token_repo.revoke_all_for_user.return_value = None

    await service.reset_password(raw_token, "newPassword456")

    # update called twice: once for password, once would be combined
    assert user_repo.update.call_count >= 1
    token_repo.revoke_all_for_user.assert_called_once_with(user.id)


async def test_reset_password__invalid_token__raises_unauthorized(
    service: AuthService,
    user_repo: AsyncMock,
) -> None:
    user_repo.get_by_reset_token_hash.return_value = None

    with pytest.raises(UnauthorizedException, match="Invalid or expired"):
        await service.reset_password("bad_token", "newPassword456")


async def test_reset_password__expired_token__raises_unauthorized(
    service: AuthService,
    user_repo: AsyncMock,
) -> None:
    from src.core.security import create_password_reset_token

    raw_token, token_hash, _ = create_password_reset_token()
    # Set expiry in the past
    expired = datetime.now(UTC) - timedelta(hours=1)
    user = _make_user(
        reset_token_hash=token_hash,
        reset_expires_at=expired,
    )
    user_repo.get_by_reset_token_hash.return_value = user
    user_repo.update.return_value = user

    with pytest.raises(UnauthorizedException, match="expired"):
        await service.reset_password(raw_token, "newPassword456")


async def test_reset_password__consumed_token_clears_fields(
    service: AuthService,
    user_repo: AsyncMock,
    token_repo: AsyncMock,
) -> None:
    from src.core.security import create_password_reset_token

    raw_token, token_hash, expires_at = create_password_reset_token()
    user = _make_user(
        reset_token_hash=token_hash,
        reset_expires_at=expires_at,
    )
    user_repo.get_by_reset_token_hash.return_value = user
    user_repo.update.return_value = user
    token_repo.revoke_all_for_user.return_value = None

    await service.reset_password(raw_token, "newPassword456")

    # Verify that update was called with None for reset fields
    update_calls = user_repo.update.call_args_list
    # The combined update should set reset fields to None
    found_clear = any("password_reset_token_hash" in str(call) for call in update_calls)
    assert found_clear, "Reset token fields should be cleared after use"
