"""Unit tests cho ETL scheduler wrapper."""

import pytest

from src.etl import scheduler


@pytest.mark.asyncio
async def test_run_scheduler__once_calls_run_etl(monkeypatch: pytest.MonkeyPatch) -> None:
    """Mode `--once` phải gọi đúng một vòng ETL rồi thoát sạch."""
    calls: list[dict[str, object]] = []

    async def fake_run_etl(**kwargs: object) -> None:
        calls.append(kwargs)

    monkeypatch.setattr(scheduler, "run_etl", fake_run_etl)

    await scheduler.run_scheduler(
        cities=["Hà Nội"],
        hotels_only=False,
        dry_run=True,
        once=True,
        interval_seconds=1,
    )

    assert calls == [
        {
            "cities": ["Hà Nội"],
            "dry_run": True,
            "hotels_only": False,
        }
    ]


@pytest.mark.asyncio
async def test_run_scheduler__run_immediately_enters_sleep_without_type_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Recurring mode phải qua log + sleep path mà không nổ TypeError do logger kwargs."""

    class StopLoop(Exception):
        """Sentinel để cắt vòng lặp vô hạn trong test."""

    calls: list[dict[str, object]] = []

    async def fake_run_etl(**kwargs: object) -> None:
        calls.append(kwargs)

    async def fake_sleep(_: float) -> None:
        raise StopLoop

    monkeypatch.setattr(scheduler, "run_etl", fake_run_etl)
    monkeypatch.setattr(scheduler.asyncio, "sleep", fake_sleep)

    with pytest.raises(StopLoop):
        await scheduler.run_scheduler(
            cities=["Buôn Ma Thuột"],
            dry_run=False,
            hotels_only=False,
            run_immediately=True,
            interval_seconds=1,
        )

    assert calls == [
        {
            "cities": ["Buôn Ma Thuột"],
            "dry_run": False,
            "hotels_only": False,
        }
    ]
