"""Tests for security helper primitives."""

from src.core.security import create_opaque_token, hash_token


def test_hash_token__same_raw_token__returns_same_hash() -> None:
    """Token hashes must be deterministic for lookup."""
    assert hash_token("claim_abc") == hash_token("claim_abc")


def test_create_opaque_token__prefix__returns_raw_and_hash() -> None:
    """Opaque tokens should expose raw token once and store only hash."""
    raw_token, token_hash = create_opaque_token("claim")

    assert raw_token.startswith("claim_")
    assert token_hash == hash_token(raw_token)
    assert token_hash != raw_token
