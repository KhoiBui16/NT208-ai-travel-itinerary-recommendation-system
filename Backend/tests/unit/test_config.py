"""Tests for application settings defaults."""

import pytest

from src.core.config import get_settings


def test_get_settings__default_config__loads_foundation_values(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Settings should load foundation defaults and config.yaml values."""
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15")
    monkeypatch.setenv("APP_DEBUG", "false")
    monkeypatch.delenv("DEBUG", raising=False)
    get_settings.cache_clear()

    settings = get_settings()

    assert settings.app_name == "DuLichViet API"
    assert settings.access_token_expire_minutes == 15
    assert settings.companion_requires_confirmation is True

    get_settings.cache_clear()
