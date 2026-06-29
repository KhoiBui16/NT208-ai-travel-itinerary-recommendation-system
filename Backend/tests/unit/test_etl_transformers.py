"""Unit tests for ETL transformers and validator logic."""

from src.etl.transformers.hotel_transformer import transform_hotels
from src.etl.transformers.place_transformer import normalize_name, transform, validate_place

# --- validate_place ---


def test_validate_place__valid():
    place = {"name": "Phở Bát Đàn", "category": "food"}
    assert validate_place(place) is True


def test_validate_place__missing_name():
    place = {"category": "food"}
    assert validate_place(place) is False


def test_validate_place__missing_category():
    place = {"name": "Test Place"}
    assert validate_place(place) is False


def test_validate_place__invalid_category():
    place = {"name": "Test Place", "category": "hospital"}
    assert validate_place(place) is False


def test_validate_place__name_too_short():
    place = {"name": "AB", "category": "food"}
    assert validate_place(place) is False


def test_validate_place__coords_in_vietnam():
    place = {"name": "Hoàn Kiếm", "category": "attraction", "latitude": 21.03, "longitude": 105.85}
    assert validate_place(place) is True


def test_validate_place__coords_outside_vietnam():
    place = {"name": "Paris", "category": "attraction", "latitude": 48.85, "longitude": 2.35}
    assert validate_place(place) is False


# --- normalize_name ---


def test_normalize_name__strips_whitespace():
    assert normalize_name("  Phở Bát Đàn  ") == "Phở Bát Đàn"


def test_normalize_name__collapses_spaces():
    assert normalize_name("Phở   Bát   Đàn") == "Phở Bát Đàn"


# --- transform (places) ---


def test_transform__valid_pois():
    raw = [
        {"name": "Phở Bát Đàn", "category": "food", "lat": 21.03, "lng": 105.85},
        {"name": "Văn Miếu", "category": "attraction", "lat": 21.03, "lng": 105.85},
    ]
    result = transform(raw, "Hà Nội")
    assert len(result) == 2
    assert result[0]["destination"] == "Hà Nội"


def test_transform__skips_invalid():
    raw = [
        {"name": "AB", "category": "food"},  # too short
        {"name": "Văn Miếu", "category": "attraction"},
    ]
    result = transform(raw, "Hà Nội")
    assert len(result) == 1


def test_transform__deduplicates():
    raw = [
        {"name": "Phở Bát Đàn", "category": "food"},
        {"name": "phở bát đàn", "category": "food"},  # same, case-insensitive
    ]
    result = transform(raw, "Hà Nội")
    assert len(result) == 1


def test_transform__preserves_goong_metadata():
    raw = [
        {
            "name": "Văn Miếu",
            "category": "attraction",
            "lat": 21.028,
            "lng": 105.835,
            "avg_cost": "125000",
            "rating": "4.7",
            "review_count": "321",
            "image": "https://cdn.test/van-mieu.jpg",
            "opening_hours": "08:00-17:00",
            "external_id": "goong-1",
            "source": "goong_places",
            "raw_metadata": {"provider": "goong"},
        },
    ]
    result = transform(raw, "Hà Nội")
    assert result[0]["avg_cost"] == 125000
    assert result[0]["rating"] == 4.7
    assert result[0]["review_count"] == 321
    assert result[0]["image"] == "https://cdn.test/van-mieu.jpg"
    assert result[0]["opening_hours"] == "08:00-17:00"
    assert result[0]["external_id"] == "goong-1"
    assert result[0]["raw_metadata"] == {"provider": "goong"}
    assert result[0]["source"] == "goong_places"


def test_transform__skips_no_name():
    raw = [
        {"category": "food"},
        {"name": "Văn Miếu", "category": "attraction"},
    ]
    result = transform(raw, "Hà Nội")
    assert len(result) == 1


# --- transform_hotels ---


def test_transform_hotels__filters_by_city():
    raw = [
        {"name": "Sofitel Legend Metropole", "city": "Hà Nội", "price": 5500000, "rating": 4.9},
        {"name": "Caravelle Saigon", "city": "TP. Hồ Chí Minh", "price": 4200000, "rating": 4.8},
    ]
    result = transform_hotels(raw, "Hà Nội")
    assert len(result) == 1
    assert result[0]["name"] == "Sofitel Legend Metropole"


def test_transform_hotels__amenities_joined():
    raw = [
        {"name": "Test Hotel", "city": "Đà Nẵng", "amenities": ["wifi", "pool"], "rating": 4.5},
    ]
    result = transform_hotels(raw, "Đà Nẵng")
    assert result[0]["amenities"] == "wifi,pool"


def test_transform_hotels__skips_short_name():
    raw = [
        {"name": "AB", "city": "Đà Nẵng", "rating": 4.5},
    ]
    result = transform_hotels(raw, "Đà Nẵng")
    assert len(result) == 0
