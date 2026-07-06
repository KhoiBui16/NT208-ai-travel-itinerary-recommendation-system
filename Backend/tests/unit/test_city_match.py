"""Unit tests cho cross-city contamination detection (Priority A)."""

from src.etl.transformers.city_match import (
    build_city_token_map,
    detect_contamination,
    normalize_city_token,
)
from src.etl.transformers.place_transformer import transform

# --- normalize_city_token ---


def test_normalize__strips_diacritics_and_lowercases():
    assert normalize_city_token("Hà Nội") == "ha noi"
    assert normalize_city_token("Đà Nẵng") == "da nang"


def test_normalize__handles_d_with_stroke():
    # 'đ' không tách bằng NFKD, phải thay thủ công.
    assert normalize_city_token("Đồng Hới") == "dong hoi"


def test_normalize__strips_admin_prefixes():
    assert normalize_city_token("TP. Hồ Chí Minh") == "ho chi minh"
    assert normalize_city_token("Thành phố Đà Lạt") == "da lat"


def test_normalize__empty_input():
    assert normalize_city_token(None) == ""
    assert normalize_city_token("") == ""


# --- build_city_token_map ---


def test_token_map__maps_token_to_canonical():
    cities = ["Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng"]
    token_map = build_city_token_map(cities)
    assert token_map["ha noi"] == "Hà Nội"
    assert token_map["ho chi minh"] == "TP. Hồ Chí Minh"
    assert token_map["da nang"] == "Đà Nẵng"


# --- detect_contamination ---


def _map():
    return build_city_token_map(["Huế", "Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng"])


def test_detect__returns_conflict_when_location_in_other_city():
    assert detect_contamination("Quận 1, Hồ Chí Minh", "Huế", _map()) == "TP. Hồ Chí Minh"


def test_detect__none_when_location_matches_target():
    assert detect_contamination("Phú Hội, Thành phố Huế", "Huế", _map()) is None


def test_detect__none_when_location_mentions_no_known_city():
    assert detect_contamination("Một con đường nào đó", "Huế", _map()) is None


def test_detect__keeps_when_target_is_last_despite_other_city_in_name():
    # Place thật sự ở Huế nhưng tên chứa "Hồ Chí Minh" (vd Bảo tàng HCM chi nhánh).
    # Token "hue" xuất hiện cuối (Thừa Thiên Huế) -> giữ.
    assert (
        detect_contamination(
            "Bảo tàng Hồ Chí Minh chi nhánh, Lê Lợi, Thừa Thiên Huế",
            "Huế",
            _map(),
        )
        is None
    )


def test_detect__flags_when_other_city_is_last_despite_target_in_name():
    # Place ở Hà Nội nhưng tên có chữ "Huế" (vd "Nhà hàng Huế" ở Ba Đình).
    # Token "ha noi" xuất hiện cuối -> contamination.
    assert detect_contamination("Nhà hàng Huế, Ba Đình, Hà Nội", "Huế", _map()) == "Hà Nội"


def test_detect__none_without_token_map():
    assert detect_contamination("Hồ Chí Minh", "Huế", {}) is None


# --- transform (contamination guard) ---


def test_transform__filters_contaminated_poi():
    raw = [
        {"name": "Quán Sài Gòn", "category": "food", "location": "Quận 1, Hồ Chí Minh"},
        {"name": "Quán Vĩ Dạ", "category": "food", "location": "Vĩ Dạ, Huế"},
    ]
    result = transform(raw, "Huế", known_cities=["Huế", "TP. Hồ Chí Minh"])
    assert len(result) == 1
    assert result[0]["name"] == "Quán Vĩ Dạ"


def test_transform__no_filter_without_known_cities():
    # backward-compat: không truyền known_cities -> không lọc contamination.
    raw = [
        {"name": "Quán Sài Gòn", "category": "food", "location": "Hồ Chí Minh"},
    ]
    result = transform(raw, "Huế")
    assert len(result) == 1
