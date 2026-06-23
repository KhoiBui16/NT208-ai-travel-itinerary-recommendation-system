"""Unit tests for TripRepository.get_or_create_day (B3 race fix).

Pins the race-safe semantics of the day upsert helper *without* a real
database: when the ``INSERT ... ON CONFLICT (trip_id, day_number) DO NOTHING``
insert is skipped because a matching row already exists (RETURNING yields
NULL), the helper must return the pre-existing row instead of raising
IntegrityError. A fresh insert returns the newly created row.

These are pure-Python tests: the session is a fake whose ``execute()`` returns
queued result objects, so the PG-specific insert statement is never compiled or
run — we only assert the helper's control flow and returned identity.
"""

from __future__ import annotations

from datetime import date

import pytest

from src.itineraries.models.trip import TripDay
from src.itineraries.repository import TripRepository


class _ScalarResult:
    """Minimal stand-in for a SQLAlchemy result exposing scalar accessors."""

    def __init__(self, scalar: object) -> None:
        self._scalar = scalar

    def scalar_one_or_none(self) -> object:
        return self._scalar

    def scalar_one(self) -> object:
        return self._scalar


class _FakeSession:
    """Async session that returns queued results for each execute() call."""

    def __init__(self, results: list[_ScalarResult]) -> None:
        self._results = list(results)
        self.executed: list[object] = []
        self.flush_count = 0

    async def execute(self, stmt: object) -> _ScalarResult:
        self.executed.append(stmt)
        return self._results.pop(0)

    async def flush(self) -> None:
        self.flush_count += 1


def _day(day_id: int, day_number: int) -> TripDay:
    return TripDay(
        id=day_id,
        trip_id=1,
        day_number=day_number,
        label=f"Ngày {day_number}",
        date=date(2026, 6, 23),
        destination_name="Hà Nội",
    )


@pytest.mark.asyncio
async def test_get_or_create_day__fresh_insert_returns_new_row() -> None:
    # ON CONFLICT DO NOTHING insert RETURNING id -> 42 (inserted), then SELECT
    # the created row by id.
    session = _FakeSession([_ScalarResult(42), _ScalarResult(_day(42, 1))])
    repo = TripRepository(session)  # type: ignore[arg-type]

    result = await repo.get_or_create_day(
        trip_id=1,
        day_number=1,
        label="Ngày 1",
        date=date(2026, 6, 23),
        destination_name="Hà Nội",
    )

    assert isinstance(result, TripDay)
    assert result.id == 42
    assert result.day_number == 1
    # Exactly two statements: the upsert insert, then SELECT created-by-id.
    assert len(session.executed) == 2
    assert session.flush_count == 1


@pytest.mark.asyncio
async def test_get_or_create_day__conflict_returns_existing_row_without_raising() -> None:
    existing = _day(99, 2)
    # RETURNING yields None -> conflict branch must SELECT and return existing.
    session = _FakeSession([_ScalarResult(None), _ScalarResult(existing)])
    repo = TripRepository(session)  # type: ignore[arg-type]

    result = await repo.get_or_create_day(
        trip_id=1,
        day_number=2,
        label="Ngày 2",
        date=date(2026, 6, 24),
        destination_name="Hà Nội",
    )

    # The pre-existing row wins — this is the B3 regression guard: no
    # IntegrityError is raised for a duplicate (trip_id, day_number).
    assert isinstance(result, TripDay)
    assert result.id == 99
    assert result.day_number == 2
    assert len(session.executed) == 2
    assert session.flush_count == 1
