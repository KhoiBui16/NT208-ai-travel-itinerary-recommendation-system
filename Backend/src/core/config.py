"""Application configuration.

Centralizes all settings by merging multiple sources in priority order:
  1. init args (programmatic override)
  2. environment variables (Docker/CI friendly)
  3. .env file (local development)
  4. config.yaml (non-secret defaults)
  5. field defaults in AppSettings

Usage:
    from src.core.config import get_settings
    settings = get_settings()  # cached singleton via @lru_cache

Security:
  - Secrets (JWT_SECRET_KEY, GEMINI_API_KEY, etc.) must come from env vars or .env,
    never from config.yaml.
  - Production validator blocks insecure defaults (e.g. dev JWT secret).
"""

from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

CONFIG_FILE = Path(__file__).resolve().parents[2] / "config.yaml"
DEV_JWT_SECRET = "local-development-change-me-minimum-32-chars"


def _flatten_config(prefix: str, value: Any, output: dict[str, Any]) -> None:
    """Flatten nested YAML keys into dot-separated field names.

    Example:
        {"cors": {"origins": ["http://localhost"]}}
        → {"cors_origins": ["http://localhost"]}

    Args:
        prefix: Current key path (empty string at root).
        value: The YAML value (dict, list, or scalar).
        output: Accumulator dict for flat key-value pairs.
    """
    if isinstance(value, dict):
        for child_key, child_value in value.items():
            next_prefix = f"{prefix}_{child_key}" if prefix else child_key
            _flatten_config(next_prefix, child_value, output)
        return
    output[prefix] = value


def yaml_config_settings() -> dict[str, Any]:
    """Load config.yaml as a pydantic-settings source.

    Reads the YAML file, flattens nested keys, and maps them
    to the corresponding AppSettings field names.

    Returns:
        Flat dict of setting overrides from config.yaml, or empty dict if file missing.
    """
    if not CONFIG_FILE.exists():
        return {}
    raw = yaml.safe_load(CONFIG_FILE.read_text(encoding="utf-8")) or {}
    flattened: dict[str, Any] = {}
    _flatten_config("", raw, flattened)

    return {
        "app_name": flattened.get("app_name"),
        "app_version": flattened.get("app_version"),
        "environment": flattened.get("app_environment"),
        "debug": flattened.get("app_debug"),
        "cors_origins": flattened.get("cors_origins"),
        "access_token_expire_minutes": flattened.get("auth_access_token_expire_minutes"),
        "refresh_token_expire_days": flattened.get("auth_refresh_token_expire_days"),
        "min_password_length": flattened.get("auth_min_password_length"),
        "agent_model": flattened.get("ai_model"),
        "agent_temperature": flattened.get("ai_temperature"),
        "agent_max_retries": flattened.get("ai_max_retries"),
        "agent_timeout_seconds": flattened.get("ai_timeout_seconds"),
        "rate_limit_ai_free": flattened.get("ai_calls_per_day"),
        "ai_rate_limit_fail_mode": flattened.get("ai_rate_limit_fail_mode"),
        "companion_requires_confirmation": flattened.get("ai_companion_requires_confirmation"),
        "enable_analytics": flattened.get("ai_enable_analytics"),
        "claim_token_expire_hours": flattened.get("security_claim_token_expire_hours"),
        "share_token_expire_days": flattened.get("security_share_token_expire_days"),
        "max_active_trips_per_user": flattened.get("security_max_active_trips_per_user"),
        "destination_cache_ttl_seconds": flattened.get("cache_destination_ttl_seconds"),
        "place_search_cache_ttl_seconds": flattened.get("cache_place_search_ttl_seconds"),
    }


class AppSettings(BaseSettings):
    """All application settings used by the backend.

    Secrets (jwt_secret_key, gemini_api_key, goong_api_key) should be
    set via environment variables or .env file, never in config.yaml.
    """

    # --- Database & Infrastructure ---
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/dulichviet"
    jwt_secret_key: SecretStr = SecretStr(DEV_JWT_SECRET)
    gemini_api_key: SecretStr = SecretStr("")
    goong_api_key: SecretStr = SecretStr("")
    redis_url: str = "redis://localhost:6379/0"
    analytics_database_url: SecretStr = SecretStr("")

    # --- Application ---
    app_name: str = "DuLichViet API"
    app_version: str = "2.0.0"
    environment: str = "development"
    debug: bool = Field(default=False, validation_alias="APP_DEBUG")
    cors_origins: list[str] = ["http://localhost:5173"]

    # --- Auth ---
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    min_password_length: int = 6

    # --- AI Agent ---
    agent_model: str = "gemini-2.5-flash"
    agent_temperature: float = 0.7
    agent_max_retries: int = 2
    agent_timeout_seconds: int = 30
    rate_limit_ai_free: int = 3
    rate_limit_api: int = 100
    ai_rate_limit_fail_mode: str = "closed"
    companion_requires_confirmation: bool = True
    enable_analytics: bool = False

    # --- Security ---
    claim_token_expire_hours: int = 24
    share_token_expire_days: int = 30
    max_active_trips_per_user: int = 5
    destination_cache_ttl_seconds: int = 86400
    place_search_cache_ttl_seconds: int = 3600

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True,
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: Any,
        env_settings: Any,
        dotenv_settings: Any,
        file_secret_settings: Any,
    ) -> tuple[Any, ...]:
        """Set config priority: init > env > .env > config.yaml > defaults."""
        return (
            init_settings,
            env_settings,
            dotenv_settings,
            yaml_config_settings,
            file_secret_settings,
        )

    @field_validator("environment")
    @classmethod
    def normalize_environment(cls, value: str) -> str:
        """Normalize environment names to lowercase."""
        return value.lower().strip()

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug_flag(cls, value: object) -> object:
        """Avoid failing when a host shell has DEBUG=release or similar."""
        if isinstance(value, str) and value.lower().strip() in {"release", "prod", "production"}:
            return False
        return value

    @model_validator(mode="after")
    def validate_production_settings(self) -> "AppSettings":
        """Fail fast for insecure production settings.

        Blocks deployment if JWT_SECRET_KEY is still the dev default
        or if analytics is enabled without a dedicated DB URL.
        """
        if self.environment == "production":
            if self.jwt_secret_key.get_secret_value() == DEV_JWT_SECRET:
                raise ValueError("JWT_SECRET_KEY must be set in production")
            if self.enable_analytics and not self.analytics_database_url.get_secret_value():
                raise ValueError("ANALYTICS_DATABASE_URL is required when analytics is enabled")
        return self


@lru_cache
def get_settings() -> AppSettings:
    """Return a cached settings instance (singleton per process)."""
    return AppSettings()
