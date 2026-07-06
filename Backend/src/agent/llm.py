"""Gemini LLM client helpers for structured generation."""

import asyncio
import json
from time import perf_counter
from typing import Any

from google import genai
from google.genai import types
from google.genai.errors import ServerError

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

    async def _generate_with_client(self, prompt: str) -> Any:
        async with genai.Client(api_key=self.config.api_key).aio as client:
            return await client.models.generate_content(
                model=self.config.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=self.config.temperature,
                    response_mime_type="application/json",
                ),
            )

    @staticmethod
    def _extract_response_text(response: Any) -> str:
        text = getattr(response, "text", None)
        if text:
            return str(text)

        for candidate in getattr(response, "candidates", None) or []:
            content = getattr(candidate, "content", None)
            parts = getattr(content, "parts", None) or []
            candidate_text = "".join(
                str(part_text) for part in parts if (part_text := getattr(part, "text", None))
            ).strip()
            if candidate_text:
                return candidate_text

        raise LLMGenerationError("Gemini returned an empty response")

    async def generate_text(self, prompt: str) -> str:
        """Call Gemini and return response text."""
        if not self.config.api_key:
            raise ServiceUnavailableException("GEMINI_API_KEY is required for AI generation")

        started_at = perf_counter()

        try:
            logger.info(
                "gemini_request_started",
                model=self.config.model,
                timeout_seconds=self.config.timeout_seconds,
                prompt_chars=len(prompt),
                prompt_estimated_tokens=max(1, round(len(prompt) / 4)),
            )
            response = await asyncio.wait_for(
                self._generate_with_client(prompt),
                timeout=self.config.timeout_seconds,
            )
            text = self._extract_response_text(response)
            logger.info(
                "gemini_request_completed",
                model=self.config.model,
                duration_ms=round((perf_counter() - started_at) * 1000),
                response_chars=len(text),
                response_estimated_tokens=max(1, round(len(text) / 4)),
            )
            return text
        except TimeoutError as exc:
            logger.warning(
                "gemini_request_timeout",
                model=self.config.model,
                timeout_seconds=self.config.timeout_seconds,
                duration_ms=round((perf_counter() - started_at) * 1000),
            )
            raise ServiceUnavailableException(
                (
                    "Dịch vụ AI đang phản hồi quá lâu nên chưa thể tạo lịch trình. "
                    "Chưa có lịch trình nào được lưu. Vui lòng thử lại sau."
                ),
                error_code="AI_PROVIDER_TIMEOUT",
                retryable=True,
            ) from exc
        except ServiceUnavailableException:
            raise
        except ServerError as exc:
            # Upstream Gemini server error (e.g. HTTP 503 overloaded/unavailable).
            # Distinct from a client-side timeout: the provider responded fast
            # with a server-side failure. Surface a dedicated, retryable code so
            # the frontend can show an accurate "quá tải" message instead of the
            # timeout copy, and so the pipeline does not retry a provider outage.
            logger.warning(
                "gemini_request_overloaded",
                model=self.config.model,
                error_type=exc.__class__.__name__,
                duration_ms=round((perf_counter() - started_at) * 1000),
            )
            raise ServiceUnavailableException(
                "Dịch vụ AI đang tạm thời quá tải. Vui lòng thử lại sau ít phút. "
                "Chưa có lịch trình nào được lưu.",
                error_code="AI_PROVIDER_OVERLOADED",
                retryable=True,
            ) from exc
        except LLMGenerationError:
            # Unusable model OUTPUT (empty response / no extractable candidates
            # raised by _extract_response_text). This is a content/validation
            # failure the pipeline retries and then surfaces as 422 on
            # exhaustion — NOT a provider outage — so re-raise unchanged and do
            # not let the generic clause below turn it into a 503.
            raise
        except Exception as exc:
            logger.warning(
                "gemini_request_failed",
                model=self.config.model,
                error_type=exc.__class__.__name__,
                duration_ms=round((perf_counter() - started_at) * 1000),
            )
            # Any OTHER failure reaching here is a provider/transport/client
            # error (connection reset, auth, unexpected SDK error, ...) — NOT a
            # model-output problem. Surface a retryable 503 so the client treats
            # it as an outage instead of a permanent 422 validation failure.
            raise ServiceUnavailableException(
                "Dịch vụ AI hiện không khả dụng. Vui lòng thử lại sau.",
                error_code="AI_PROVIDER_ERROR",
                retryable=True,
            ) from exc


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
