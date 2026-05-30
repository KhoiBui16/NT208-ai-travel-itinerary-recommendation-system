# Issue: Backend Place Service Unit Test Fixture Activity Relationship Failure

**Date**: 2026-05-30
**Status**: RESOLVED (2026-05-30)
**Priority**: MEDIUM
**Component**: Backend tests

---

## Problem

`tests/unit/test_place_service.py` fails with SQLAlchemy error when trying to create `Destination` model instances in test fixtures:

```
sqlalchemy.exc.InvalidRequestError: When initializing mapper Mapper[Place(places)],
expression 'Activity' failed to locate a name ('Activity').
If this is a class name, consider adding this relationship() to the <class 'src.places.models.Place'> class
after both dependent classes have been defined.
```

### Affected command

```bash
cd Backend
uv run pytest tests/unit/test_place_service.py -v
```

### Failure summary

- 6/17 unit tests pass
- 11 tests fail with `KeyError: 'Activity'` during model initialization
- Failing tests all use `_make_destination()` helper which creates `Destination()` model instances
- `Place` model has relationship to `Activity` but `Activity` is not imported/available in test context

### Why not caused by 00057

- 00057 only modified `service.py` response building (`_to_destination_response_with_counts`)
- 00057 did NOT touch model relationships or test fixtures
- Same failure occurs in `main` branch before 00057 changes
- This is a pre-existing test fixture issue

### Integration endpoint tests pass

```bash
cd Backend
uv run pytest tests/integration/test_place_endpoints.py -v
# Result: 10/11 passed, 1 skipped (6.28s)
```

Integration tests that test actual API endpoints with real DB all pass. Only unit test fixtures fail.

### Fix deferred

- Not blocking 00057 which only touches response serialization
- Integration tests verify API contract is correct
- Unit test fixture issue needs separate fix to either:
  1. Import `Activity` model in test conftest or fixtures
  2. Mock the relationship in fixtures
  3. Use test doubles instead of real model instances in unit tests

---

## Impact

- Unit tests for `PlaceService` cannot run locally
- CI backend-unit job may fail (if enabled)
- Integration tests still verify API behavior

---

## Recommended next step

Fix test fixtures in separate issue/branch. Options:

1. Add proper model imports to conftest
2. Create test-specific base model without problematic relationships
3. Use `create_mock_place()` without real SQLAlchemy models

---

**Detected in**: 00057 commit gate check
**Does NOT block**: 00057 (integration tests pass)

---

## Resolution (2026-05-30)

### Fix applied

1. **Added Activity import**: `from src.itineraries.models import Activity` in `tests/unit/test_place_service.py`
   - This allows SQLAlchemy to resolve the `Place.activities` relationship string reference

2. **Updated test mocks**: Changed from `mock_repo.get_destinations` to `mock_repo.get_destinations_with_counts`
   - Service now calls `get_destinations_with_counts()` which returns `list[dict]`
   - Created `_make_destination_dict()` helper to match the new response structure

3. **Fixed ruff issues**: Reformatted function signature to comply with line length limit

### Files changed

- `Backend/tests/unit/test_place_service.py`:
  - Added Activity import
  - Added `_make_destination_dict()` helper
  - Updated `test_get_destinations__cache_miss` and `test_get_destinations__redis_down` mocks

### Verification

```bash
cd Backend
uv run pytest tests/unit/ -v --tb=short
# Result: 115 passed, 1 warning (7.33s)
```

All unit tests now pass. CI backend-unit check should pass.
