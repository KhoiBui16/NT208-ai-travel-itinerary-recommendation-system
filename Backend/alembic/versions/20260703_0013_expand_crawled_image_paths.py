"""expand crawled image paths (second pass, verified)

Revision ID: 20260703_0013
Revises: 20260703_0012
Create Date: 2026-07-05

Second-pass image enrichment. Each row below was hand-verified:
- the DB place/hotel NAME exists (queried from the live DB), AND
- the referenced crawl file exists in ``asserts/images/<city>/`` with the
  EXACT filename and extension used in the path.

Unlike a naive matcher, this migration only references files that truly exist
on disk, so the resulting ``/img/...`` paths resolve on both Windows (local)
and Linux (CI / Render) without case-mismatch 404s. All UPDATEs use the
portable ``(name, destination_id)`` predicate so they apply identically to the
local and Render databases.

Idempotent: re-running sets the same value; no-op if the name is absent.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260703_0013"
down_revision: str | None = "20260703_0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── Places ────────────────────────────────────────────────────────────
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/tp-ho-chi-minh/nha-hat-hoa-binh-tphcm.webp'
        WHERE name = 'Nhà hát Hòa Bình'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'tp-ho-chi-minh')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/ha-long/nui-bai-tho.jpg'
        WHERE name = 'Khu di tích Núi Bài Thơ - Truyền Đăng Sơn Từ'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'ha-long')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/ninh-binh/hang-mua-ninh-binh.jpg'
        WHERE name = 'Hang Múa'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'ninh-binh')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/ninh-binh/khu-du-lich-sinh-thai-trang-an.jpg'
        WHERE name = 'Tràng An'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'ninh-binh')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/ha-giang/DinhHoVuong.jpg'
        WHERE name = 'Dinh họ Vương - Vương Chí Sình'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'ha-giang')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/ha-giang/KDLSinhThaiTruongXuan.jpg'
        WHERE name = 'Khu Du lịch Sinh thái Trường Xuân'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'ha-giang')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/hai-phong/BaoTangHaiPhong.jpg'
        WHERE name = 'Bảo tàng Hải Phòng'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'hai-phong')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/hai-phong/BaoTangHaiQuan.jpg'
        WHERE name = 'Bảo tàng Hải Quân'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'hai-phong')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/vung-tau/bao-tang-vu-khi-toan-cau-vung-tau.jpg'
        WHERE name = 'Bảo tàng Vũ Khí Toàn Cầu'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'vung-tau')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/vung-tau/Cinema-Dien-Bien-Vung-tau.jpeg'
        WHERE name = 'Cinema Điện Biên'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'vung-tau')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/vung-tau/di-tich-bach-dinh.jpg'
        WHERE name = 'Di tích lịch sử văn hóa Bạch Dinh'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'vung-tau')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/tp-ho-chi-minh/bao-tang-lich-su-tphcm.jpg'
        WHERE name = 'Bảo tàng Lịch sử Thành phố Hồ Chí Minh'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'tp-ho-chi-minh')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/tp-ho-chi-minh/bao_tang_my_thuat_tphcm.webp'
        WHERE name = 'Bảo tàng Mỹ thuật Thành phố Hồ Chí Minh'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'tp-ho-chi-minh')
        """
    )

    # ── Hotels ────────────────────────────────────────────────────────────
    op.execute(
        """
        UPDATE hotels
        SET image = '/img/hotels/ninh-binh/tam-coc-garden-resort-ninh-binh.jpg'
        WHERE name = 'Tam Coc Garden Resort'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'ninh-binh')
        """
    )


def downgrade() -> None:
    # Image-path enrichment is a one-way data import. The crawled assets are
    # the source of truth; the pre-import lying/empty paths are not worth
    # restoring.
    pass
