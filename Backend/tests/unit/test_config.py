"""Tests for application settings defaults."""

import pytest

from src.core.config import AppSettings, get_settings


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
    assert "Hà Nội" in settings.etl_cities
    assert "Hạ Long" in settings.etl_cities
    assert "Vịnh Hạ Long" not in settings.etl_cities
    assert "Châu Đốc" in settings.etl_cities
    assert settings.etl_max_places_per_city == 75
    assert settings.agent_min_activities_per_day == 5
    assert settings.agent_max_activities_per_day == 5
    assert settings.rate_limit_ai_chat_user == 20

    get_settings.cache_clear()


def test_settings__accepts_goong_map_key_alias(monkeypatch: pytest.MonkeyPatch) -> None:
    """Local setups that name the key GOONG_MAP_KEY should still work."""
    monkeypatch.setenv("GOONG_MAP_KEY", "goong-test")
    monkeypatch.delenv("GOONG_API_KEY", raising=False)

    settings = AppSettings(_env_file=None)

    assert settings.goong_api_key.get_secret_value() == "goong-test"


def test_settings__accepts_ai_activity_pacing_aliases(monkeypatch: pytest.MonkeyPatch) -> None:
    """Activity pacing can be tuned without editing the prompt source."""
    monkeypatch.setenv("AI_MIN_ACTIVITIES_PER_DAY", "2")
    monkeypatch.setenv("AI_MAX_ACTIVITIES_PER_DAY", "4")

    settings = AppSettings(_env_file=None)

    assert settings.agent_min_activities_per_day == 2
    assert settings.agent_max_activities_per_day == 4


def test_settings__accepts_goong_map_api_key_alias(monkeypatch: pytest.MonkeyPatch) -> None:
    """Local setups that name the key GOONG_MAP_API_KEY should still work."""
    monkeypatch.setenv("GOONG_MAP_API_KEY", "goong-test")
    monkeypatch.delenv("GOONG_API_KEY", raising=False)
    monkeypatch.delenv("GOONG_MAP_KEY", raising=False)

    settings = AppSettings(_env_file=None)

    assert settings.goong_api_key.get_secret_value() == "goong-test"


def test_settings__accepts_chat_quota_alias(monkeypatch: pytest.MonkeyPatch) -> None:
    """Chat quota nên cấu hình được bằng env riêng cho phase C3B."""
    monkeypatch.setenv("AI_CHAT_CALLS_PER_DAY", "25")

    settings = AppSettings(_env_file=None)

    assert settings.rate_limit_ai_chat_user == 25
