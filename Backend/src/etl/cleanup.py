"""Idempotent cleanup cho dữ liệu ETL: contamination sai thành phố + place thiếu tọa độ.

Sửa hai loại dữ liệu sai đã có sẵn trong DB:
  - Cross-city contamination: place có địa chỉ thuộc thành phố khác (do Goong
    city-bias leak). Xử lý an toàn với FK: ưu tiên REASSIGN ``destination_id``
    sang thành phố đúng; chỉ DELETE khi reassign sẽ đụng unique constraint và
    place không bị activity reference.
  - Place thiếu tọa độ (latitude/longitude): chỉ DELETE khi không bị activity
    reference (vì ``activities.place_id`` không có ON DELETE CASCADE).

Re-run an toàn: sau lần đầu sẽ tìm 0 row.

CLI::
    uv run python -m src.etl.cleanup            # dọn thật + ghi DB
    uv run python -m src.etl.cleanup --dry-run  # chỉ báo cáo, không ghi
"""

from __future__ import annotations

import argparse
import asyncio
import logging

from redis.asyncio import Redis
from sqlalchemy import func, select

# ETL chạy ngoài app bootstrap -> import để đăng ký relationship string-based.
import src.auth.models  # noqa: F401
import src.itineraries.models  # noqa: F401
from src.core.config import get_settings
from src.core.database import AsyncSessionLocal
from src.etl.transformers.city_match import build_city_token_map, detect_contamination
from src.itineraries.models.trip import Activity
from src.places.models import Destination, Place

logger = logging.getLogger(__name__)


async def _referenced_place_ids(session, place_ids: list[int]) -> set[int]:
    """Trả về tập hợp place_id đang được ít nhất một Activity reference."""
    if not place_ids:
        return set()
    result = await session.execute(
        select(Activity.place_id).where(Activity.place_id.in_(place_ids))
    )
    return {pid for pid in result.scalars().all() if pid is not None}


async def cleanup_data(dry_run: bool = False) -> dict:
    """Dọn contamination và place thiếu tọa độ. Trả về dict thống kê.

    Hàm idempotent: chạy lại không thay đổi dữ liệu đã sạch.
    """
    settings = get_settings()
    stats = {
        "contaminated_reassigned": 0,
        "contaminated_removed_duplicate": 0,
        "contaminated_unknown_city": 0,
        "contaminated_referenced_skipped": 0,
        "invalid_removed": 0,
        "invalid_referenced_skipped": 0,
        "destinations_recounted": 0,
        "dry_run": dry_run,
    }

    redis: Redis | None = None
    if not dry_run:
        try:
            redis = Redis.from_url(settings.redis_url, decode_responses=True)
        except Exception:
            logger.warning("Redis không khả dụng — bỏ qua invalidate cache")
            redis = None

    async with AsyncSessionLocal() as session:
        destinations = (await session.execute(select(Destination))).scalars().all()
        token_map = build_city_token_map([d.name for d in destinations])
        dest_by_name = {d.name: d for d in destinations}
        dest_by_id = {d.id: d for d in destinations}

        places = (await session.execute(select(Place))).scalars().all()
        existing_pairs = {(p.name, p.destination_id) for p in places}

        contaminated: list[tuple[Place, str]] = []
        invalid_coord: list[Place] = []
        suspect_ids: list[int] = []
        for p in places:
            target = dest_by_id.get(p.destination_id)
            target_name = target.name if target else None
            conflict = detect_contamination(p.location, target_name, token_map)
            if conflict:
                contaminated.append((p, conflict))
                suspect_ids.append(p.id)
                continue
            if p.latitude is None or p.longitude is None:
                invalid_coord.append(p)
                suspect_ids.append(p.id)

        referenced = await _referenced_place_ids(session, suspect_ids)

        for p, conflict in contaminated:
            target_dest = dest_by_name.get(conflict)
            if not target_dest or target_dest.id == p.destination_id:
                stats["contaminated_unknown_city"] += 1
                logger.info(
                    "Contamination không có dest gốc để gán lại: place=%s conflict=%s",
                    p.id,
                    conflict,
                )
                continue

            # Reassign sẽ đụng unique (name, destination_id) nếu target đã có place
            # cùng tên -> bỏ place thừa khi không bị activity reference.
            if (p.name, target_dest.id) in existing_pairs:
                if p.id in referenced:
                    stats["contaminated_referenced_skipped"] += 1
                    logger.info(
                        "Contamination trùng tên + bị activity reference, giữ: place=%s",
                        p.id,
                    )
                else:
                    if not dry_run:
                        await session.delete(p)
                        existing_pairs.discard((p.name, p.destination_id))
                    stats["contaminated_removed_duplicate"] += 1
                    logger.info(
                        "Xoá contamination trùng tên (không reference): place=%s -> %s",
                        p.id,
                        conflict,
                    )
                continue

            # Reassign an toàn: đổi destination_id, không đụng FK activity.
            old_name = dest_by_id.get(p.destination_id)
            if not dry_run:
                existing_pairs.discard((p.name, p.destination_id))
                p.destination_id = target_dest.id
                existing_pairs.add((p.name, target_dest.id))
            stats["contaminated_reassigned"] += 1
            logger.info(
                "Reassign contamination: place=%s '%s' %s -> %s",
                p.id,
                p.name,
                old_name,
                conflict,
            )

        for p in invalid_coord:
            if p.id in referenced:
                stats["invalid_referenced_skipped"] += 1
                logger.info(
                    "Place thiếu tọa độ nhưng bị activity reference, giữ: place=%s",
                    p.id,
                )
                continue
            if not dry_run:
                await session.delete(p)
            stats["invalid_removed"] += 1
            logger.info(
                "Xoá place thiếu tọa độ (không reference): place=%s '%s'",
                p.id,
                p.name,
            )

        if not dry_run:
            # Flush các reassign/delete trước khi đếm lại để count thấy state mới
            # (tránh đọc count cũ rồi set places_count = giá trị cũ -> no-op).
            await session.flush()
            # Recompute places_count cho mọi destination sau khi dọn xong.
            for d in destinations:
                count = await session.scalar(
                    select(func.count()).select_from(Place).where(Place.destination_id == d.id)
                )
                d.places_count = count or 0
            stats["destinations_recounted"] = len(destinations)
            await session.commit()

    if not dry_run and redis:
        try:
            async for key in redis.scan_iter("destinations:*"):
                await redis.delete(key)
            async for key in redis.scan_iter("places:*"):
                await redis.delete(key)
            logger.info("Đã invalidate cache destinations:* + places:*")
        except Exception:
            logger.warning("Cache invalidation thất bại", exc_info=True)
        await redis.aclose()

    return stats


def main() -> None:
    """CLI entry point cho ETL data cleanup."""
    parser = argparse.ArgumentParser(
        description="DuLichViet ETL data cleanup (contamination + tọa độ)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Chỉ báo cáo, không ghi DB",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    stats = asyncio.run(cleanup_data(dry_run=args.dry_run))
    logger.info("Cleanup stats: %s", stats)


if __name__ == "__main__":
    main()
