"""Unit tests for Goong ETL extraction logic."""

import pytest

from src.etl.extractors.goong_extractor import GoongExtractor


class FakeGoongClient:
    async def geocode(self, address: str):
        return {"lat": 21.03, "lng": 105.85}

    async def autocomplete(self, input_text: str, location: str | None = None):
        return [{"place_id": "goong-1", "description": "Văn Miếu, Hà Nội"}]

    async def place_detail(self, place_id: str):
        return {
            "name": "Văn Miếu",
            "formatted_address": "58 Quốc Tử Giám, Hà Nội",
            "geometry": {"location": {"lat": 21.028, "lng": 105.835}},
        }


@pytest.mark.asyncio
async def test_goong_extractor__extract_pois_builds_raw_records():
    extractor = GoongExtractor(api_key="test-key", client=FakeGoongClient())  # type: ignore[arg-type]

    result = await extractor.extract_pois("Hà Nội", max_items=1)

    assert result == [
        {
            "name": "Văn Miếu",
            "category": "food",
            "lat": 21.028,
            "lng": 105.835,
            "location": "58 Quốc Tử Giám, Hà Nội",
            "description": "",
            "avg_cost": 0,
            "rating": 0.0,
            "review_count": 0,
            "image": "",
            "opening_hours": None,
            "external_id": "goong-1",
            "source": "goong_places",
            "raw_metadata": {
                "provider": "goong",
                "prediction": {"place_id": "goong-1", "description": "Văn Miếu, Hà Nội"},
                "detail": {
                    "name": "Văn Miếu",
                    "formatted_address": "58 Quốc Tử Giám, Hà Nội",
                    "geometry": {"location": {"lat": 21.028, "lng": 105.835}},
                },
            },
        }
    ]


def test_goong_extractor__build_raw_poi_uses_prediction_name_when_detail_missing():
    extractor = GoongExtractor(api_key="test-key", client=FakeGoongClient())  # type: ignore[arg-type]

    result = extractor._build_raw_poi(
        city="Hà Nội",
        category="attraction",
        place_id="goong-2",
        prediction={
            "place_id": "goong-2",
            "description": "Hồ Hoàn Kiếm, Hà Nội",
            "structured_formatting": {"main_text": "Hồ Hoàn Kiếm"},
        },
        detail=None,
    )

    assert result is not None
    assert result["name"] == "Hồ Hoàn Kiếm"
    assert result["category"] == "attraction"
    assert result["location"] == "Hồ Hoàn Kiếm, Hà Nội"


def test_goong_extractor__build_raw_poi_preserves_optional_provider_fields():
    extractor = GoongExtractor(api_key="test-key", client=FakeGoongClient())  # type: ignore[arg-type]

    result = extractor._build_raw_poi(
        city="Hà Nội",
        category="food",
        place_id="goong-3",
        prediction={"place_id": "goong-3", "description": "Bún Chả, Hà Nội"},
        detail={
            "name": "Bún Chả",
            "formatted_address": "Hà Nội",
            "geometry": {"location": {"lat": 21.03, "lng": 105.85}},
            "avg_cost": "150000",
            "rating": "4.6",
            "user_ratings_total": "245",
            "image": "https://cdn.test/bun-cha.jpg",
            "opening_hours": {"weekday_text": ["Mon: 08:00-20:00"]},
        },
    )

    assert result is not None
    assert result["avg_cost"] == 150000
    assert result["rating"] == 4.6
    assert result["review_count"] == 245
    assert result["image"] == "https://cdn.test/bun-cha.jpg"
    assert result["opening_hours"] == "Mon: 08:00-20:00"
