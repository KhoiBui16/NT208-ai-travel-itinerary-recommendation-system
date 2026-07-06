"""import crawled image paths

Revision ID: 20260703_0012
Revises: 20260703_0010
Create Date: 2026-07-04

Imports the user-crawled image set into the canonical runtime image contract
and consolidates the former one-off 0011 (example.com strip).

Canonical contract (see docs/REPORTS/00136_local_runtime_image_fix_report.md):
  - crawled image archive: ``asserts/images/`` (committed; source-of-truth crawl,
    NOT served directly by the API)
  - runtime folder: ``Backend/static/img/`` (served by FastAPI ``/img/{path}``)
  - DB stores origin-relative paths like ``/img/destinations/<slug>.<ext>``
  - ``AnhDaiDien.<ext>`` per city folder -> that destination's cover
  - missing images stay empty ('') -> FE fallback (``placeImage.ts``)

What this migration does (all idempotent):
  1. Defensive strip of leftover fake ``example.com`` image URLs (merged from
     former 0011; a no-op on a clean DB — 0 such rows exist today).
  2. Set 23 destination covers to ``/img/destinations/<slug>.<ext>`` using each
     crawled cover's REAL extension (.jpg/.webp/.png). Also fixes the ``ha-noi``
     typo (was ``/img/destinations/ha-n-i.jpg``) and the ``.jpg``-only assumption
     that mismatched 9 ``.webp`` + 1 ``.png`` cities.
  3. Clear the 4 destinations with NO crawled source folder (chau-doc, con-dao,
     mui-ne, phong-nha) to ``''`` so the FE fallback renders cleanly instead of
     a 404 round-trip on a non-existent file.
  4. Set 18 high-confidence PLACE images: exact Vietnamese-slug match of the DB
     place name to the crawled file stem, within the same destination.
  5. Clear every hotel whose image points to a non-existent
     ``/img/hotels/<short>.jpg`` short-slug path (the ETL minted these but never
     downloaded the bytes), THEN set the 12 high-confidence hotel matches. Order
     matters: blank-before-set, because the new matched paths also match
     ``LIKE '/img/hotels/%'``.

Stability: destinations update by ``slug``; places/hotels update by
``(name, destination slug)`` via subquery (NOT numeric id) so the migration
applies identically to the local Docker DB and Render prod, whose row ids are
not guaranteed to match. ``(name, destination_id)`` is unique
(``uq_places_name_dest`` and the hotels analogue), so each UPDATE hits one row.

Idempotent: re-running re-sets the same paths/values. Downgrade is one-way
(data enrichment, like 0010/0011) and intentionally a no-op.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260703_0012"
down_revision: str | None = "20260703_0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Defensive: strip leftover fake example.com image URLs (merged from
    #    former 0011). No-op on a clean DB. Columns are NOT NULL -> ''.
    op.execute(
        """
        UPDATE places
        SET image = ''
        WHERE image ILIKE '%example.com%'
        """
    )

    op.execute(
        """
        UPDATE hotels
        SET image = ''
        WHERE image ILIKE '%example.com%'
        """
    )

    # 2. Destination covers (by slug). Fixes ha-noi typo + extension mismatch.
    op.execute(
        """
        UPDATE destinations
        SET image = '/img/destinations/buon-ma-thuot.jpg'
        WHERE slug = 'buon-ma-thuot'
        """
    )
    op.execute(
        """
        UPDATE destinations
        SET image = '/img/destinations/can-tho.jpg'
        WHERE slug = 'can-tho'
        """
    )
    op.execute(
        """
        UPDATE destinations
        SET image = '/img/destinations/da-nang.webp'
        WHERE slug = 'da-nang'
        """
    )
    op.execute(
        """
        UPDATE destinations
        SET image = '/img/destinations/da-lat.webp'
        WHERE slug = 'da-lat'
        """
    )
    op.execute(
        """
        UPDATE destinations
        SET image = '/img/destinations/dong-hoi.jpg'
        WHERE slug = 'dong-hoi'
        """
    )
    op.execute(
        """
        UPDATE destinations
        SET image = '/img/destinations/ha-giang.jpg'
        WHERE slug = 'ha-giang'
        """
    )
    op.execute(
        """
        UPDATE destinations
        SET image = '/img/destinations/ha-long.jpg'
        WHERE slug = 'ha-long'
        """
    )
    op.execute(
        """
        UPDATE destinations
        SET image = '/img/destinations/ha-noi.jpg'
        WHERE slug = 'ha-noi'
        """
    )
    op.execute(
        """
        UPDATE destinations
        SET image = '/img/destinations/hai-phong.jpg'
        WHERE slug = 'hai-phong'
        """
    )
    op.execute(
        """
        UPDATE destinations
        SET image = '/img/destinations/hoi-an.jpg'
        WHERE slug = 'hoi-an'
        """
    )
    op.execute(
        """
        UPDATE destinations
        SET image = '/img/destinations/hue.webp'
        WHERE slug = 'hue'
        """
    )
    op.execute(
        """
        UPDATE destinations
        SET image = '/img/destinations/moc-chau.jpg'
        WHERE slug = 'moc-chau'
        """
    )
    op.execute(
        """
        UPDATE destinations
        SET image = '/img/destinations/nha-trang.webp'
        WHERE slug = 'nha-trang'
        """
    )
    op.execute(
        """
        UPDATE destinations
        SET image = '/img/destinations/ninh-binh.webp'
        WHERE slug = 'ninh-binh'
        """
    )
    op.execute(
        """
        UPDATE destinations
        SET image = '/img/destinations/phan-thiet.webp'
        WHERE slug = 'phan-thiet'
        """
    )
    op.execute(
        """
        UPDATE destinations
        SET image = '/img/destinations/phu-quoc.jpg'
        WHERE slug = 'phu-quoc'
        """
    )
    op.execute(
        """
        UPDATE destinations
        SET image = '/img/destinations/pleiku.jpg'
        WHERE slug = 'pleiku'
        """
    )
    op.execute(
        """
        UPDATE destinations
        SET image = '/img/destinations/quy-nhon.webp'
        WHERE slug = 'quy-nhon'
        """
    )
    op.execute(
        """
        UPDATE destinations
        SET image = '/img/destinations/sapa.jpg'
        WHERE slug = 'sapa'
        """
    )
    op.execute(
        """
        UPDATE destinations
        SET image = '/img/destinations/tay-ninh.webp'
        WHERE slug = 'tay-ninh'
        """
    )
    op.execute(
        """
        UPDATE destinations
        SET image = '/img/destinations/tp-ho-chi-minh.jpg'
        WHERE slug = 'tp-ho-chi-minh'
        """
    )
    op.execute(
        """
        UPDATE destinations
        SET image = '/img/destinations/tuy-hoa.png'
        WHERE slug = 'tuy-hoa'
        """
    )
    op.execute(
        """
        UPDATE destinations
        SET image = '/img/destinations/vung-tau.webp'
        WHERE slug = 'vung-tau'
        """
    )

    # 3. Destinations with no crawled source -> clear lying path to ''.
    op.execute(
        """
        UPDATE destinations
        SET image = ''
        WHERE slug = 'chau-doc'
        """
    )
    op.execute(
        """
        UPDATE destinations
        SET image = ''
        WHERE slug = 'con-dao'
        """
    )
    op.execute(
        """
        UPDATE destinations
        SET image = ''
        WHERE slug = 'mui-ne'
        """
    )
    op.execute(
        """
        UPDATE destinations
        SET image = ''
        WHERE slug = 'phong-nha'
        """
    )

    # 4. High-confidence PLACE image matches (name + destination slug).
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/ha-long/bao-tang-quang-ninh.jpg'
        WHERE name = 'Bảo Tàng Quảng Ninh'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'ha-long')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/ha-long/vinh-ha-long.jpg'
        WHERE name = 'Vịnh Hạ Long'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'ha-long')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/nha-trang/an-cafe-nha-trang.jpg'
        WHERE name = 'An Cafe Nha Trang'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'nha-trang')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/phan-thiet/cho-phan-thiet.jpg'
        WHERE name = 'Chợ Phan Thiết'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'phan-thiet')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/pleiku/cong-vien-dien-hong-pleiku.jpg'
        WHERE name = 'Công Viên Diên Hồng Pleiku'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'pleiku')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/quy-nhon/cho-quy-nhon.jpg'
        WHERE name = 'Chợ Quy Nhơn'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'quy-nhon')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/quy-nhon/du-lich-quy-nhon-vung-boi.jpg'
        WHERE name = 'Du lịch Quy Nhơn - Vũng Bồi'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'quy-nhon')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/sapa/cho-dem-sapa.png'
        WHERE name = 'Chợ đêm Sapa'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'sapa')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/sapa/hem-may-cafe-sapa.jpg'
        WHERE name = 'Hẻm Mây Cafe Sapa'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'sapa')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/sapa/khu-du-lich-sinh-thai-ham-rong-sapa.jpg'
        WHERE name = 'Khu Du Lịch Sinh Thái Hàm Rồng SaPa'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'sapa')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/sapa/nha-hang-sapa.jpg'
        WHERE name = 'Nhà hàng Sapa'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'sapa')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/tay-ninh/lotte-cinema-tay-ninh.jpg'
        WHERE name = 'Lotte Cinema Tây Ninh'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'tay-ninh')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/tuy-hoa/cong-vien-tuy-hoa.jpeg'
        WHERE name = 'Công viên Tuy Hòa'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'tuy-hoa')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/tuy-hoa/nha-sach-fahasa-phu-yen.jpg'
        WHERE name = 'Nhà Sách FAHASA Phú Yên'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'tuy-hoa')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/vung-tau/di-tich-bach-dinh.jpg'
        WHERE name = 'Di tích Bạch Dinh'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'vung-tau')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/vung-tau/di-tich-lich-su-nha-tron.jpg'
        WHERE name = 'Di tích lịch sử Nhà Tròn'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'vung-tau')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/vung-tau/khu-b-cho-vung-tau.jpg'
        WHERE name = 'Khu B Chợ Vũng Tàu'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'vung-tau')
        """
    )
    op.execute(
        """
        UPDATE places
        SET image = '/img/places/vung-tau/vuon-hoa-thach-thao.jpg'
        WHERE name = 'Vườn Hoa Thạch Thảo'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'vung-tau')
        """
    )

    # 5a. Clear hotels whose image points to a non-existent /img/hotels/* path
    #     (ETL short-slug paths; bytes never downloaded). NOT NULL -> ''.
    op.execute(
        """
        UPDATE hotels
        SET image = ''
        WHERE image LIKE '/img/hotels/%'
        """
    )

    # 5b. High-confidence HOTEL image matches (name + destination slug).
    op.execute(
        """
        UPDATE hotels
        SET image = '/img/hotels/ha-long/wyndham-legend-ha-long.jpg'
        WHERE name = 'Wyndham Legend Hạ Long'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'ha-long')
        """
    )
    op.execute(
        """
        UPDATE hotels
        SET image = '/img/hotels/ha-noi/sofitel-legend-metropole-ha-noi.jpg'
        WHERE name = 'Sofitel Legend Metropole Hà Nội'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'ha-noi')
        """
    )
    op.execute(
        """
        UPDATE hotels
        SET image = '/img/hotels/hoi-an/almanity-hoi-an.jpg'
        WHERE name = 'Almanity Hoi An'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'hoi-an')
        """
    )
    op.execute(
        """
        UPDATE hotels
        SET image = '/img/hotels/moc-chau/moc-chau-eco-garden-resort.jpg'
        WHERE name = 'Mộc Châu Eco Garden Resort'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'moc-chau')
        """
    )
    op.execute(
        """
        UPDATE hotels
        SET image = '/img/hotels/nha-trang/sheraton-nha-trang.webp'
        WHERE name = 'Sheraton Nha Trang'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'nha-trang')
        """
    )
    op.execute(
        """
        UPDATE hotels
        SET image = '/img/hotels/phu-quoc/intercontinental-phu-quoc.jpg'
        WHERE name = 'InterContinental Phú Quốc'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'phu-quoc')
        """
    )
    op.execute(
        """
        UPDATE hotels
        SET image = '/img/hotels/pleiku/hagl-hotel-pleiku.jpg'
        WHERE name = 'HAGL Hotel Pleiku'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'pleiku')
        """
    )
    op.execute(
        """
        UPDATE hotels
        SET image = '/img/hotels/sapa/hotel-de-la-coupole-sapa.jpg'
        WHERE name = 'Hotel de la Coupole Sapa'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'sapa')
        """
    )
    op.execute(
        """
        UPDATE hotels
        SET image = '/img/hotels/tay-ninh/melia-vinpearl-tay-ninh.avif'
        WHERE name = 'Melia Vinpearl Tây Ninh'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'tay-ninh')
        """
    )
    op.execute(
        """
        UPDATE hotels
        SET image = '/img/hotels/tp-ho-chi-minh/caravelle-saigon.jpg'
        WHERE name = 'Caravelle Saigon'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'tp-ho-chi-minh')
        """
    )
    op.execute(
        """
        UPDATE hotels
        SET image = '/img/hotels/tuy-hoa/sala-tuy-hoa-beach-hotel.jpg'
        WHERE name = 'Sala Tuy Hòa Beach Hotel'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'tuy-hoa')
        """
    )
    op.execute(
        """
        UPDATE hotels
        SET image = '/img/hotels/vung-tau/imperial-hotel-vung-tau.jpg'
        WHERE name = 'Imperial Hotel Vũng Tàu'
          AND destination_id = (SELECT id FROM destinations WHERE slug = 'vung-tau')
        """
    )


def downgrade() -> None:
    # Image-path enrichment is one-way data import (like 0010/0011). The
    # crawled assets are the source of truth; the pre-import lying/empty
    # paths are not worth restoring.
    pass
