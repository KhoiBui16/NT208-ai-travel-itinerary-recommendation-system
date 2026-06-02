"""Gemini LLM client helpers for structured generation."""

import asyncio
import json
from time import perf_counter
from typing import Any

from src.agent.config import AgentConfig
from src.core.exceptions import ServiceUnavailableException
from src.core.logger import get_logger

logger = get_logger(__name__)


class LLMGenerationError(RuntimeError):
    """Raised when the LLM provider returns unusable content."""


class GeminiLLM:
    """Small Gemini wrapper used by C.1 generation.

    The wrapper returns raw text only. Domain layers own prompt construction,
    Pydantic parsing, validation, and persistence.
    """

    def __init__(self, config: AgentConfig) -> None:
        self.config = config

    async def generate_text(self, prompt: str) -> str:
        """Call Gemini and return response text."""
        if not self.config.api_key:
            raise ServiceUnavailableException("GEMINI_API_KEY is required for AI generation")

        started_at = perf_counter()

        def _call_gemini() -> str:
            import google.generativeai as genai

            genai.configure(api_key=self.config.api_key)
            model = genai.GenerativeModel(
                self.config.model,
                generation_config={
                    "temperature": self.config.temperature,
                    "response_mime_type": "application/json",
                },
            )
            response = model.generate_content(prompt)
            text = getattr(response, "text", None)
            if not text:
                raise LLMGenerationError("Gemini returned an empty response")
            return str(text)

        try:
            logger.info(
                "gemini_request_started",
                model=self.config.model,
                timeout_seconds=self.config.timeout_seconds,
                prompt_chars=len(prompt),
                prompt_estimated_tokens=max(1, round(len(prompt) / 4)),
            )
            return await asyncio.wait_for(
                asyncio.to_thread(_call_gemini),
                timeout=self.config.timeout_seconds,
            )
        except TimeoutError as exc:
            logger.warning(
                "gemini_request_timeout",
                model=self.config.model,
                timeout_seconds=self.config.timeout_seconds,
                duration_ms=round((perf_counter() - started_at) * 1000),
            )
            raise ServiceUnavailableException(
                (
                    "Dịch vụ AI đang phản hồi quá lâu. "
                    "Vui lòng thử lại sau hoặc tạo chuyến đi ngắn hơn."
                ),
                error_code="AI_PROVIDER_TIMEOUT",
                retryable=True,
            ) from exc
        except ServiceUnavailableException:
            raise
        except Exception as exc:
            logger.warning(
                "gemini_request_failed",
                model=self.config.model,
                error_type=exc.__class__.__name__,
                duration_ms=round((perf_counter() - started_at) * 1000),
            )
            raise LLMGenerationError("Gemini generation failed") from exc


def parse_json_response(raw_text: str) -> dict[str, Any]:
    """Parse a Gemini JSON response, accepting fenced JSON blocks."""
    text = raw_text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        raise LLMGenerationError("Gemini response is not valid JSON") from exc
    if not isinstance(parsed, dict):
        raise LLMGenerationError("Gemini response must be a JSON object")
    return parsed
