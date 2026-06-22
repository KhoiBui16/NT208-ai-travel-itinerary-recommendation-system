"""Phát hiện cross-city contamination cho place ETL.

Goong autocomplete dùng city-bias nên đôi khi trả về POI thực chất thuộc một
thành phố khác (ví dụ crawl "Huế" nhưng place lại có địa chỉ "Hồ Chí Minh").
Module này dùng CHÍNH tên các destination làm chuẩn so khớp (normalization
layer), giúp ETL từ chối / dọn place sai thành phố một cách tất định (deterministic)
mà không cần hardcode từng thành phố.
"""

from __future__ import annotations

import re
import unicodedata

# Các tiền tố hành chính Việt Nam nhiều ký tự — bóc ra khỏi đầu tên thành phố
# trước khi so khớp để "TP. Hồ Chí Minh", "Thành phố Đà Nẵng" về cùng token gốc.
# Không dùng tiền tố 1 ký tự (q/p/x/h) để tránh bóc nhầm.
_ADMIN_PREFIXES = ("thanh pho", "thi xa", "thi tran", "tinh", "tx", "tt", "tp")


def normalize_city_token(name: str | None) -> str:
    """Chuẩn hoá một tên thành phố / địa chỉ về token không dấu để so khớp.

    Các bước:
      - ``đ``/``Đ`` (không tách được bằng NFKD) được thay bằng ``d``.
      - Bỏ dấu tiếng Việt qua NFKD + loại combining marks.
      - Đổi mọi ký tự không chữ-số thành khoảng trắng, gộp khoảng trắng.
      - Bóc các tiền tố hành chính phổ biến ở đầu lặp lại.

    Trả về chuỗi rỗng nếu đầu vào thiếu.
    """
    if not name:
        return ""
    text = name.replace("đ", "d").replace("Đ", "d")
    decomposed = unicodedata.normalize("NFKD", text)
    no_accents = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    text = re.sub(r"[^a-z0-9]+", " ", no_accents.lower())
    text = re.sub(r"\s+", " ", text).strip()

    changed = True
    while changed:
        changed = False
        for prefix in _ADMIN_PREFIXES:
            if not text or text == prefix:
                return ""
            if text.startswith(prefix + " "):
                text = text[len(prefix) + 1 :].strip()
                changed = True
    return text


def build_city_token_map(cities: list[str]) -> dict[str, str]:
    """Map token chuẩn hoá -> tên thành phố gốc (canonical).

    Nếu hai thành phố chuẩn hoá trùng token (hiếm), giữ giá trị cuối để vẫn có
    một map dùng được.
    """
    token_map: dict[str, str] = {}
    for city in cities:
        token = normalize_city_token(city)
        if token:
            token_map[token] = city
    return token_map


def detect_contamination(
    location: str | None,
    target_city: str | None,
    token_map: dict[str, str],
) -> str | None:
    """Trả về tên thành phố XUNG ĐỘT nếu thành phố HÀNH CHÍNH của địa chỉ khác target.

    Goong địa chỉ thường liệt kê theo thứ tự ``[tên, đường, phường, quận, tỉnh/thành]``
    nên city token XUẤT HIỆN CUỐI CÙNG là tín hiệu hành chính đáng tin hơn tên thành
    phố xuất hiện trong tên nhà hàng (ví dụ "Nhà hàng Huế" ở Ba Đình, Hà Nội — token
    "hue" ở đầu nhưng thành phố hành chính là "Hà Nội" ở cuối).

    Quy tắc tất định (deterministic):
      - Tìm city token xuất hiện cuối cùng trong địa chỉ (rfind).
      - Nếu token cuối khác target -> contamination (trả về city tương ứng).
      - Nếu token cuối == target, hoặc không có city token nào -> None (giữ).
    """
    if not token_map or not target_city:
        return None

    norm_location = f" {normalize_city_token(location)} "
    target_token = normalize_city_token(target_city)
    if not target_token:
        return None

    last_pos = -1
    last_token: str | None = None
    last_canonical: str | None = None
    for token, canonical in token_map.items():
        idx = norm_location.rfind(f" {token} ")
        if idx != -1 and idx > last_pos:
            last_pos = idx
            last_token = token
            last_canonical = canonical

    if last_token is None or last_token == target_token:
        return None
    return last_canonical
