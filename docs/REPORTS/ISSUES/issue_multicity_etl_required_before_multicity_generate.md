# Issue: Multi-city ETL Required Before Multi-city Generate

## Status
IN_PROGRESS — Phase 2B fixes implemented, Phase 3 staggered import pending (2026-05-30)

## Evidence
- **B2 API Matrix** (2026-05-28):
  - `POST /generate {"destination":"Thanh pho Ho Chi Minh",...}` → 422
  - `POST /generate {"destination":"TP. Ho Chi Minh",...}` → 422
  - `POST /generate {"destination":"Da Nang",...}` → 422
  - Response: `{"detail":"Destination data not found. Please run ETL for this destination first.","error_code":"VALIDATION_ERROR","status_code":422}`
- **DB query**: `SELECT id, name FROM destinations` → 1 row (Hà Nội only)
- **FE cities.ts**: 12 thành phố hiển thị, chỉ 1 có data
- **Phase 2A Dry-run** (2026-05-30):
  - Hà Nội, TP.HCM, Đà Nẵng, Hội An: ✅ PASS (60-72 places/city)
  - Huế: ❌ BLOCKED by Goong 429 rate limit
  - Confirmed: ~90 API calls/city consumed during dry-run

## Impact
- 11/12 thành phố FE hiển thị sẽ fail 422 khi user generate
- C3 companion chat không thể test multi-city
- C2 suggestions trả empty cho mọi thành phố ngoài Hà Nội
- Demo/presentation chỉ có thể dùng Hà Nội
- **NEW**: Goong quota constraint — cannot bulk ETL all cities in one session

## Reproduction
1. `POST /api/v1/itineraries/generate` với `destination: "Ho Chi Minh City"`
2. Response: 422 `Destination data not found`

## Expected
- TP.HCM, Đà Nẵng, Hội An, Nha Trang có data trong DB
- Generate pipeline hoạt động cho ít nhất 5 thành phố chính
- **NEW**: 10-15 cities coverage for demo via staggered import

## Actual
- DB chỉ có Hà Nội: 68 places, 3 hotels
- TP.HCM: 0 places, 0 hotels
- Đà Nẵng: 0 places, 0 hotels
- **NEW**: `destinations.last_etl_at` NULL — cannot detect stale data

## Fixes Implemented (Phase 2B)

### Required Fix 1: Update `destinations.last_etl_at`
**File**: `Backend/src/etl/loaders/db_loader.py`
- Set `last_etl_at = datetime.now(UTC)` on destination creation
- Update `last_etl_at` after successful `upsert_places()` and `upsert_hotels()`
- **Status**: ✅ DONE

### Required Fix 2: 429 Stop Behavior
**File**: `Backend/src/etl/runner.py`
- Added `ETLResult` dataclass for per-city metrics
- Catch `RuntimeError` with "rate limit" or "429" message
- Break city loop gracefully on rate limit
- Record `status="rate_limited"` in `scraped_sources`
- **Status**: ✅ DONE

### Required Fix 3: ETL Summary Log
**File**: `Backend/src/etl/runner.py`
- Track results per city: status, places, hotels, source, duration, error
- Log summary table before completion
- **Status**: ✅ DONE

## Suggested Import Strategy (Phase 3)

### Staggered Import — Mandatory Due to Quota

**Estimated quota**: ~400 API calls = quota limit (4 cities confirmed in Phase 2A)

**Batch A — Validation/Demo Core** (5 cities, 5 days):
- Day 1: Hà Nội (idempotency verify)
- Day 2: TP. Hồ Chí Minh
- Day 3: Đà Nẵng
- Day 4: Hội An
- Day 5: Huế

**Batch B — Demo Expansion** (10 cities, 5-7 days):
- 2 cities/day after quota reset
- Nha Trang, Đà Lạt, Phú Quốc, Hạ Long, Sapa, Cần Thơ, Vũng Tàu, Quy Nhơn, Ninh Bình, Hải Phòng

**Commands** (run one city at a time):
```bash
# Từ Backend/
uv run python -m src.etl --cities "Hà Nội"
uv run python -m src.etl --cities "TP. Hồ Chí Minh"
uv run python -m src.etl --cities "Đà Nẵng"
# ... etc
```

## Recommended Branch
`feat/00052-c-etl-goong-data-expansion` — Phase 2B fixes complete, ready for Phase 3A staggered import

## Related Issues
- `issue_goong_quota_blocks_bulk_etl.md` — Root cause analysis
- `issue_etl_scheduler_missing.md` — Scheduler needed for auto-staggered imports
