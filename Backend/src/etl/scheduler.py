"""Lightweight ETL scheduler cho local/staging runtime.

Module này không thay thế ETL CLI hiện có; nó chỉ bọc `run_etl()` trong một
vòng lặp định kỳ để project không còn phụ thuộc hoàn toàn vào manual command.

Ví dụ:
    uv run python -m src.etl.scheduler --once --run-immediately
    uv run python -m src.etl.scheduler --run-immediately --interval-seconds 3600
"""

from __future__ import annotations

import argparse
import asyncio
import logging

from src.core.config import get_settings
from src.etl.runner import run_etl

logger = logging.getLogger(__name__)


def resolve_interval_seconds(
    *,
    interval_days: float | None = None,
    interval_seconds: int | None = None,
) -> float:
    """Chuẩn hóa interval scheduler về đơn vị giây.

    Ưu tiên:
      1. `interval_seconds` từ CLI
      2. `interval_days` từ CLI
      3. `settings.etl_update_interval_days`
    """
    settings = get_settings()

    if interval_seconds is not None:
        return max(float(interval_seconds), 1.0)

    if interval_days is not None:
        return max(float(interval_days) * 86400.0, 1.0)

    return max(float(settings.etl_update_interval_days) * 86400.0, 1.0)


async def run_scheduler(
    *,
    cities: list[str] | None = None,
    hotels_only: bool = False,
    dry_run: bool = False,
    run_immediately: bool = False,
    once: bool = False,
    interval_days: float | None = None,
    interval_seconds: int | None = None,
) -> None:
    """Chạy ETL theo chu kỳ tuần tự, không overlap job.

    Args:
        cities: Danh sách city muốn crawl; `None` nghĩa là dùng config hiện tại.
        hotels_only: Chỉ load hotels YAML nếu cần seed lodging.
        dry_run: Chạy transform không ghi DB.
        run_immediately: Chạy ngay một vòng ETL trước khi sleep.
        once: Nếu `True`, scheduler chỉ chạy một vòng rồi thoát.
        interval_days: Override chu kỳ theo ngày.
        interval_seconds: Override chu kỳ theo giây, ưu tiên cao nhất.
    """
    interval = resolve_interval_seconds(
        interval_days=interval_days,
        interval_seconds=interval_seconds,
    )
    cycle = 0

    if once:
        logger.info("etl_scheduler_once_started")
        await run_etl(cities=cities, dry_run=dry_run, hotels_only=hotels_only)
        logger.info("etl_scheduler_once_completed")
        return

    if run_immediately:
        cycle += 1
        logger.info(
            "etl_scheduler_cycle_started cycle=%s immediate=%s",
            cycle,
            True,
        )
        try:
            await run_etl(cities=cities, dry_run=dry_run, hotels_only=hotels_only)
            logger.info("etl_scheduler_cycle_completed cycle=%s", cycle)
        except Exception:
            logger.exception("etl_scheduler_cycle_failed cycle=%s", cycle)

    while True:
        logger.info("etl_scheduler_sleeping interval_seconds=%s", interval)
        await asyncio.sleep(interval)
        cycle += 1
        logger.info(
            "etl_scheduler_cycle_started cycle=%s immediate=%s",
            cycle,
            False,
        )
        try:
            await run_etl(cities=cities, dry_run=dry_run, hotels_only=hotels_only)
            logger.info("etl_scheduler_cycle_completed cycle=%s", cycle)
        except Exception:
            logger.exception("etl_scheduler_cycle_failed cycle=%s", cycle)


def main() -> None:
    """CLI entry point cho scheduler."""
    parser = argparse.ArgumentParser(description="DuLichViet ETL Scheduler")
    parser.add_argument(
        "--cities",
        nargs="+",
        default=None,
        help="Cities to process (default: configured etl.cities)",
    )
    parser.add_argument(
        "--hotels-only",
        action="store_true",
        help="Load hotels from YAML only",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Extract and transform only — no DB writes",
    )
    parser.add_argument(
        "--run-immediately",
        action="store_true",
        help="Run one ETL cycle immediately before entering the sleep loop",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run a single ETL cycle and exit",
    )
    parser.add_argument(
        "--interval-days",
        type=float,
        default=None,
        help="Override schedule interval in days",
    )
    parser.add_argument(
        "--interval-seconds",
        type=int,
        default=None,
        help="Override schedule interval in seconds (useful for smoke tests)",
    )

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    asyncio.run(
        run_scheduler(
            cities=args.cities,
            hotels_only=args.hotels_only,
            dry_run=args.dry_run,
            run_immediately=args.run_immediately,
            once=args.once,
            interval_days=args.interval_days,
            interval_seconds=args.interval_seconds,
        )
    )


if __name__ == "__main__":
    main()
