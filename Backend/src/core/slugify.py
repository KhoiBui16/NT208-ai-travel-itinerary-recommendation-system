"""Vietnamese text to ASCII slug conversion.

Shared utility used by both the places service (public destination lookup)
and the itineraries repository (AI pipeline destination resolution).

Uses the same Vietnamese diacritics replacement table as the ETL db_loader
so that slugs generated at query time match slugs stored by the ETL pipeline.

Examples:
    "Ha Noi"          -> "ha-noi"
    "Hà Nội"          -> "ha-noi"
    "TP. Hồ Chí Minh" -> "tp-ho-chi-minh"
    "Đà Nẵng"         -> "da-nang"
"""

import re

# Maps Vietnamese diacritical characters to their ASCII equivalents.
# Mirrors the ETL db_loader replacement table exactly so slugs match DB.
_VIETNAMESE_REPLACEMENTS = {
    "đ": "d",
    "ă": "a",
    "â": "a",
    "ê": "e",
    "ô": "o",
    "ơ": "o",
    "ư": "u",
    "à": "a",
    "á": "a",
    "ả": "a",
    "ã": "a",
    "ạ": "a",
    "ắ": "a",
    "ặ": "a",
    "ằ": "a",
    "ẳ": "a",
    "ẵ": "a",
    "ấ": "a",
    "ầ": "a",
    "ẩ": "a",
    "ẫ": "a",
    "ậ": "a",
    "è": "e",
    "é": "e",
    "ẻ": "e",
    "ẽ": "e",
    "ẹ": "e",
    "ế": "e",
    "ề": "e",
    "ể": "e",
    "ễ": "e",
    "ệ": "e",
    "ì": "i",
    "í": "i",
    "ỉ": "i",
    "ĩ": "i",
    "ị": "i",
    "ò": "o",
    "ó": "o",
    "ỏ": "o",
    "õ": "o",
    "ọ": "o",
    "ố": "o",
    "ồ": "o",
    "ổ": "o",
    "ỗ": "o",
    "ộ": "o",
    "ớ": "o",
    "ờ": "o",
    "ở": "o",
    "ỡ": "o",
    "ợ": "o",
    "ù": "u",
    "ú": "u",
    "ủ": "u",
    "ũ": "u",
    "ụ": "u",
    "ứ": "u",
    "ừ": "u",
    "ử": "u",
    "ữ": "u",
    "ự": "u",
    "ỳ": "y",
    "ý": "y",
    "ỷ": "y",
    "ỹ": "y",
    "ỵ": "y",
}


def slugify(text: str) -> str:
    """Convert a Vietnamese destination name to URL-safe slug format.

    Args:
        text: Raw destination name (e.g. "Hà Nội", "Ha Noi").

    Returns:
        Lowercase ASCII slug with hyphens (e.g. "ha-noi").
    """
    slug = text.lower().strip()

    for vn_char, ascii_char in _VIETNAMESE_REPLACEMENTS.items():
        slug = slug.replace(vn_char, ascii_char)

    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-")
    return slug
