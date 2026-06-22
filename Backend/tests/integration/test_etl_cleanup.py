"""Integration tests cho ETL data cleanup (contamination + tọa độ).

Cần PostgreSQL đã chạy Alembic. Bật trong CI với ``CI=true``. Dùng tên destination
dạng "Cleanup HN"/"Cleanup HCMC" (token duy nhất, không đụng dữ liệu thật) để
kiểm cơ chế reassign / delete / idempotent mà không phụ thuộc seed city.
"""

import os

import pytest
from sqlalchemy import delete, select

from src.core import database
from src.etl.cleanup import cleanup_data
from src.places.models import Destination, Place

IN_CI = os.getenv("CI") == "true"

HN = "Cleanup HN"
HCMC = "Cleanup HCMC"


@pytest.mark.skipif(not IN_CI, reason="Requires running DB - runs in CI with postgres service")
async def test_cleanup__reassigns_contamination_and_removes_invalid() -> None:
    try:
        # Seed: 1 contaminated (thuộc HN nhưng địa chỉ HCMC), 1 thiếu tọa độ, 1 sạch.
        async with database.AsyncSessionLocal() as session:
            async with session.begin():
                d_hn = Destination(name=HN, slug="cleanup-hn", is_active=True)
                d_hcmc = Destination(name=HCMC, slug="cleanup-hcmc", is_active=True)
                session.add_all([d_hn, d_hcmc])
                await session.flush()
                session.add_all(
                    [
                        Place(
                            name="Quán Sai Thành Phố",
                            category="food",
                            destination_id=d_hn.id,
                            location="Cleanup HCMC District 1",
                            latitude=10.7,
                            longitude=106.7,
                        ),
                        Place(
                            name="Place Thiếu Tọa Độ",
                            category="attraction",
                            destination_id=d_hn.id,
                            location="Cleanup HN Old Quarter",
                            latitude=None,
                            longitude=None,
                        ),
                        Place(
                            name="Quán Đúng Thành Phố",
                            category="food",
                            destination_id=d_hn.id,
                            location="Cleanup HN Hoàn Kiếm",
                            latitude=21.0,
                            longitude=105.8,
                        ),
                    ]
                )

        stats = await cleanup_data(dry_run=False)
        assert stats["contaminated_reassigned"] >= 1
        assert stats["invalid_removed"] >= 1

        async with database.AsyncSessionLocal() as session:
            d_hn_db = (
                await session.execute(select(Destination).where(Destination.name == HN))
            ).scalar_one()
            d_hcmc_db = (
                await session.execute(select(Destination).where(Destination.name == HCMC))
            ).scalar_one()

            # Contaminated place phải được reassign sang HCMC.
            bad = (
                await session.execute(select(Place).where(Place.name == "Quán Sai Thành Phố"))
            ).scalar_one()
            assert bad.destination_id == d_hcmc_db.id

            # Place thiếu tọa độ (không bị reference) phải bị xoá.
            nocoord = (
                await session.execute(select(Place).where(Place.name == "Place Thiếu Tọa Độ"))
            ).scalar_one_or_none()
            assert nocoord is None

            # Place sạch vẫn thuộc HN.
            ok = (
                await session.execute(select(Place).where(Place.name == "Quán Đúng Thành Phố"))
            ).scalar_one()
            assert ok.destination_id == d_hn_db.id

        # Idempotent: chạy lại không thay đổi gì thêm.
        stats2 = await cleanup_data(dry_run=False)
        assert stats2["contaminated_reassigned"] == 0
        assert stats2["invalid_removed"] == 0
    finally:
        async with database.AsyncSessionLocal() as session:
            async with session.begin():
                await session.execute(
                    delete(Place).where(
                        Place.name.in_(
                            ["Quán Sai Thành Phố", "Place Thiếu Tọa Độ", "Quán Đúng Thành Phố"]
                        )
                    )
                )
                await session.execute(delete(Destination).where(Destination.name.in_([HN, HCMC])))
