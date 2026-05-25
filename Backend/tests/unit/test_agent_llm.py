"""Unit tests for LLM response parsing helpers."""

import pytest

from src.agent.llm import LLMGenerationError, parse_json_response


def test_parse_json_response__plain_object() -> None:
    assert parse_json_response('{"tripName":"Test"}') == {"tripName": "Test"}


def test_parse_json_response__fenced_json() -> None:
    assert parse_json_response('```json\n{"tripName":"Test"}\n```') == {"tripName": "Test"}


def test_parse_json_response__invalid_json_raises() -> None:
    with pytest.raises(LLMGenerationError):
        parse_json_response("not-json")
