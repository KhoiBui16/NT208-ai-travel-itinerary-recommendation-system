"""Unit tests for cache key normalization with Vietnamese characters."""

from src.shared.cache import normalize_cache_key


def test_normalize_cache_key_with_vietnamese():
    """Test cache key normalization handles Vietnamese characters properly."""
    # Test with "Hà Nội"
    result = normalize_cache_key("places", "search", None, "Hà Nội", None, 20)
    expected = "places:search:None:H%C3%A0%20N%E1%BB%99i:None:20"
    assert result == expected, f"Expected {expected}, got {result}"

    # Test with "Đà Nẵng"
    result = normalize_cache_key("places", "search", None, "Đà Nẵng", None, 20)
    assert "Đ" not in result, "Vietnamese characters should be URL-encoded"
    assert "N%E1%BA%B5ng" in result, "Should encode Vietnamese characters"

    # Test with None values
    result = normalize_cache_key("places", "search", None, None, None, 20)
    expected = "places:search:None:None:None:20"
    assert result == expected

    # Test with empty strings
    result = normalize_cache_key("places", "search", "", "", "", 20)
    # Empty strings encode to empty, creating extra colons - this is correct behavior
    # as it preserves the positional parameter structure
    expected = "places:search::::20"
    assert result == expected


def test_cache_key_consistency():
    """Test that same input produces same cache key."""
    key1 = normalize_cache_key("places", "search", None, "Hà Nội", None, 20)
    key2 = normalize_cache_key("places", "search", None, "Hà Nội", None, 20)
    assert key1 == key2, "Same inputs should produce same cache key"


def test_cache_key_differentiation():
    """Test that different inputs produce different cache keys."""
    key1 = normalize_cache_key("places", "search", None, "Hà Nội", None, 20)
    key2 = normalize_cache_key("places", "search", None, "Đà Nẵng", None, 20)
    assert key1 != key2, "Different inputs should produce different cache keys"
