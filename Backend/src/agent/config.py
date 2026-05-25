"""Agent runtime configuration helpers."""

from dataclasses import dataclass

from src.core.config import AppSettings, get_settings


@dataclass(frozen=True)
class AgentConfig:
    """Resolved AI provider settings used by agent infrastructure."""

    api_key: str
    model: str
    temperature: float
    max_retries: int
    timeout_seconds: int
    min_activities_per_day: int
    max_activities_per_day: int

    @classmethod
    def from_settings(cls, settings: AppSettings | None = None) -> "AgentConfig":
        """Build config from application settings."""
        resolved = settings or get_settings()
        return cls(
            api_key=resolved.gemini_api_key.get_secret_value(),
            model=resolved.agent_model,
            temperature=resolved.agent_temperature,
            max_retries=resolved.agent_max_retries,
            timeout_seconds=resolved.agent_timeout_seconds,
            min_activities_per_day=resolved.agent_min_activities_per_day,
            max_activities_per_day=resolved.agent_max_activities_per_day,
        )
