"""Unit tests for Gemini LLM helpers."""

import asyncio
from types import SimpleNamespace

import pytest

from src.agent.config import AgentConfig
from src.agent.llm import GeminiLLM, LLMGenerationError, parse_json_response
from src.core.exceptions import ServiceUnavailableException


def _make_config(timeout_seconds: int = 1) -> AgentConfig:
    return AgentConfig(
        api_key="test-key",
        model="gemini-2.5-flash",
        temperature=0.2,
        max_retries=1,
        timeout_seconds=timeout_seconds,
        min_activities_per_day=5,
        max_activities_per_day=5,
    )


def test_parse_json_response__plain_object() -> None:
    assert parse_json_response('{"tripName":"Test"}') == {"tripName": "Test"}


def test_parse_json_response__fenced_json() -> None:
    assert parse_json_response('```json\n{"tripName":"Test"}\n```') == {"tripName": "Test"}


def test_parse_json_response__invalid_json_raises() -> None:
    with pytest.raises(LLMGenerationError):
        parse_json_response("not-json")


@pytest.mark.asyncio
async def test_generate_text__success_uses_response_text(monkeypatch: pytest.MonkeyPatch) -> None:
    llm = GeminiLLM(_make_config())

    async def fake_generate_with_client(prompt: str) -> object:
        return SimpleNamespace(text='{"tripName":"Test"}')

    monkeypatch.setattr(llm, "_generate_with_client", fake_generate_with_client)

    result = await llm.generate_text("hello")

    assert result == '{"tripName":"Test"}'


@pytest.mark.asyncio
async def test_generate_text__success_falls_back_to_candidate_parts(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    llm = GeminiLLM(_make_config())
    response = SimpleNamespace(
        text=None,
        candidates=[
            SimpleNamespace(
                content=SimpleNamespace(parts=[SimpleNamespace(text='{"tripName":"Alt"}')])
            )
        ],
    )

    async def fake_generate_with_client(prompt: str) -> object:
        return response

    monkeypatch.setattr(llm, "_generate_with_client", fake_generate_with_client)

    result = await llm.generate_text("hello")

    assert result == '{"tripName":"Alt"}'


@pytest.mark.asyncio
async def test_generate_text__timeout_returns_retryable_service_unavailable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    llm = GeminiLLM(_make_config(timeout_seconds=0))

    async def fake_generate_with_client(prompt: str) -> object:
        await asyncio.sleep(0.01)
        return SimpleNamespace(text='{"tripName":"Late"}')

    monkeypatch.setattr(llm, "_generate_with_client", fake_generate_with_client)

    with pytest.raises(ServiceUnavailableException) as exc_info:
        await llm.generate_text("hello")

    assert exc_info.value.error_code == "AI_PROVIDER_TIMEOUT"
    assert exc_info.value.retryable is True


@pytest.mark.asyncio
async def test_generate_text__server_error_returns_overloaded_code(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Upstream Gemini HTTP 503 (overloaded) must surface as a dedicated,
    retryable AI_PROVIDER_OVERLOADED error — distinct from a client-side
    timeout so the FE shows accurate "quá tải" copy instead of "phản hồi quá
    lâu". See B2."""
    from google.genai.errors import ServerError

    llm = GeminiLLM(_make_config())

    async def fake_generate_with_client(prompt: str) -> object:
        raise ServerError(503, {"error": {"message": "The model is overloaded"}})

    monkeypatch.setattr(llm, "_generate_with_client", fake_generate_with_client)

    with pytest.raises(ServiceUnavailableException) as exc_info:
        await llm.generate_text("hello")

    assert exc_info.value.error_code == "AI_PROVIDER_OVERLOADED"
    assert exc_info.value.retryable is True


@pytest.mark.asyncio
async def test_generate_text__generic_provider_error_returns_service_unavailable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A generic provider/transport/client error (e.g. ConnectionError, auth
    failure, or any other non-timeout / non-overloaded SDK error) must surface
    as 503 ServiceUnavailableException (a retryable outage) — it must NOT be
    swallowed into LLMGenerationError, because the pipeline treats
    LLMGenerationError as a model-output validation failure and turns it into a
    permanent 422. Only true model-output failures (empty response / bad JSON)
    are 422. See 00135."""
    llm = GeminiLLM(_make_config())

    async def fake_generate_with_client(prompt: str) -> object:
        raise ConnectionError("connection reset by peer")

    monkeypatch.setattr(llm, "_generate_with_client", fake_generate_with_client)

    with pytest.raises(ServiceUnavailableException) as exc_info:
        await llm.generate_text("hello")

    assert exc_info.value.error_code == "AI_PROVIDER_ERROR"
    assert exc_info.value.retryable is True
