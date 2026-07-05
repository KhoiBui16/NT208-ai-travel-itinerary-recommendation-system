"""link additional crawled place images (third pass, slug/CamelCase matched)

Revision ID: 20260705_0015
Revises: 20260703_0014
Create Date: 2026-07-05

Third-pass image enrichment. The crawled assets in ``asserts/images/<city>/``
were copied into ``Backend/static/img/places/<slug>/`` (PR #130 follow-up), but
most were not yet referenced by any place — so those places kept showing the
category fallback (perceived as "mock data").

Each row below was matched automatically by a high-confidence rule: the file
stem (or its CamelCase-split form, with the destination-slug suffix removed)
equals ``slugify(place.name)``. Only EXACT, UNIQUE matches are included, so
every referenced file truly depicts that place. All files exist on disk; all
UPDATEs use the portable ``(name, destination_id)`` predicate so they apply
identically to the local and Render databases.

Idempotent: re-running sets the same value; no-op if the name is absent.
Covers 14 destinations / 43 places (can-tho +6, quy-nhon +5, tuy-hoa +6, ...).
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260705_0015"
down_revision: str | None = "20260703_0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (destination_slug, place_name, image_path) — exact slug-match only.
_PLACE_IMAGES: list[tuple[str, str, str]] = [
    ("buon-ma-thuot", "Bảo tàng Đắk Lắk", "/img/places/buon-ma-thuot/BaoTangDakLak.jpg"),
    ("can-tho", "Bảo tàng Cần Thơ", "/img/places/can-tho/BaoTangCanTho.jpg"),
    ("can-tho", "Chợ Cái Khế", "/img/places/can-tho/ChoCaiKhe.jpg"),
    ("can-tho", "Di tích Long Mỹ", "/img/places/can-tho/DiTichLongMy.jpg"),
    ("can-tho", "Nhà hàng Hoa Sứ", "/img/places/can-tho/NhaHangHoaSu.jpg"),
    ("can-tho", "Nhà hàng Lúa Nếp", "/img/places/can-tho/NhaHangLuaNep.jpg"),
    ("can-tho", "Nhà hàng Sao Hôm", "/img/places/can-tho/NhaHangSaoHom.jpg"),
    ("da-lat", "Bảo tàng Sinh học Đà Lạt", "/img/places/da-lat/BaoTangSinhHocDaLat.jpg"),
    ("da-lat", "CineStar Đà Lạt", "/img/places/da-lat/cinestarDaLat.jpg"),
    ("da-lat", "Vườn hoa Đà Lạt", "/img/places/da-lat/VuonHoaDaLat.jpg"),
    ("da-nang", "Bảo Tàng Đà Nẵng", "/img/places/da-nang/BaoTangDaNang.jpg"),
    ("da-nang", "Cơm Niêu Cội Nguồn", "/img/places/da-nang/ComNieuCoiNguon.jpg"),
    ("da-nang", "Công viên Biển Đông", "/img/places/da-nang/CongVienBienDong.jpg"),
    ("da-nang", "Công viên Kỳ Quan", "/img/places/da-nang/CongVienKyQuan.jpg"),
    ("dong-hoi", "Chợ Đồng Hới", "/img/places/dong-hoi/ChoDongHoi.jpg"),
    ("dong-hoi", "Công viên", "/img/places/dong-hoi/CongVienDongHoi.jpg"),
    ("dong-hoi", "Vườn hoa Nhật Nguyệt", "/img/places/dong-hoi/VuonHoaNhatNguyet.jpg"),
    ("ha-giang", "Di Tích Bốt Đèo Gió", "/img/places/ha-giang/DiTichBotDeoGio.jpg"),
    ("ha-giang", "Di tích Căng Bắc Mê", "/img/places/ha-giang/DiTichCangBacMe.jpg"),
    ("hai-phong", "Chợ Vĩnh Niệm", "/img/places/hai-phong/ChoVinhNiem.jpg"),
    ("hai-phong", "Khu sinh thái Nam Sơn", "/img/places/hai-phong/KhuSinhThaiNamSon.jpg"),
    ("nha-trang", "Chợ Hải sản Bốn Bao", "/img/places/nha-trang/cho-hai-san-Bon-bao-nha-trang.jpg"),
    ("nha-trang", "Chợ Vĩnh Ngọc", "/img/places/nha-trang/cho-Vinh-Ngoc-nha-trang.jpg"),
    ("nha-trang", "Khu đô thị sinh thái bán đảo Thanh Phong", "/img/places/nha-trang/khu-do-thi-sinh-thai-ban-dao-Thanh-Phong-nha-trang.jpg"),
    ("pleiku", "Khu Vui Chơi Trẻ Em", "/img/places/pleiku/khu-vui-choi-tre-em-pleiku.jpg"),
    ("pleiku", "Nhà Hàng Phố Biển", "/img/places/pleiku/Nha-hang-Pho-Bien-Pleiku.jpg"),
    ("pleiku", "Nhà hát kịch Đam San", "/img/places/pleiku/nha-hat-kich-Dam-San-pleiku.webp"),
    ("pleiku", "Touch Cinema", "/img/places/pleiku/touch-cinema-pleiku.jpg"),
    ("quy-nhon", "BẢO TÀNG QUAN TRUNG", "/img/places/quy-nhon/bao-tang-Quan-Trung-quy-nhon.jpg"),
    ("quy-nhon", "Binh Dinh museum", "/img/places/quy-nhon/binh-dinh-museum-quy-nhon.jpg"),
    ("quy-nhon", "Hata Hotel", "/img/places/quy-nhon/hata-hotel-quy-nhon.jpg"),
    ("quy-nhon", "Khu Sinh Thái Suối Tiên", "/img/places/quy-nhon/khu-sinh-thai-suoi-tien-quy-nhon.jpg"),
    ("quy-nhon", "Nhà Hàng Hải Nam", "/img/places/quy-nhon/nha-hang-hai-nam-quy-nhon.jpg"),
    ("sapa", "Bảo Tàng Dân Tộc Lai Châu", "/img/places/sapa/bao-tang-dan-toc-lai-chau-sapa.jpg"),
    ("sapa", "Nhà Hát Suối reo", "/img/places/sapa/nha-hat-Suoi-reo-sapa.jpg"),
    ("tay-ninh", "Trung tâm thương mại", "/img/places/tay-ninh/trung-tam-thuong-mai-tay-ninh.jpg"),
    ("tuy-hoa", "Bảo tàng Phú Yên", "/img/places/tuy-hoa/bao-tang-phu-yen-tuy-hoa.jpeg"),
    ("tuy-hoa", "Cafe Hương Quê", "/img/places/tuy-hoa/cafe-Huong-que-tuy-hoa.jpg"),
    ("tuy-hoa", "Cafe Lồng Đèn Đỏ", "/img/places/tuy-hoa/cafe-Long-den-do-tuy-hoa.jpg"),
    ("tuy-hoa", "Khu vui chơi HOBBY LAND", "/img/places/tuy-hoa/Khu-vui-choi-HOBBY-LAND-tuy-hoa.jpg"),
    ("tuy-hoa", "Nhà hàng Tre Việt", "/img/places/tuy-hoa/nha-hang-Tre-viet-tuy-hoa.jpg"),
    ("tuy-hoa", "Rạp Chiếu Phim Hưng Đạo", "/img/places/tuy-hoa/rap-chieu-phim-Hung-dao-tuy-hoa.jpg"),
    ("vung-tau", "Bảo Tàng Côn Đảo", "/img/places/vung-tau/bao-tang-con-dao-vung-tau.jpg"),
]


def upgrade() -> None:
    for slug, name, image in _PLACE_IMAGES:
        safe_name = name.replace("'", "''")
        safe_image = image.replace("'", "''")
        op.execute(
            "UPDATE places SET image = '"
            + safe_image
            + "' WHERE name = '"
            + safe_name
            + "' AND destination_id = (SELECT id FROM destinations WHERE slug = '"
            + slug
            + "')"
        )


def downgrade() -> None:
    # Image-path enrichment is a one-way data import (crawled assets are the
    # source of truth); not worth restoring the empty paths.
    pass
