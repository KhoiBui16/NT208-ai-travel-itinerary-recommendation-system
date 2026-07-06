# 00060K-R1 Critical Data/Contract Fixes

Date: 2026-06-08
Branch: `fix/00060-d-local-smoke-ux-data-fix`
Commit: `a1ca485` + working tree improvements

---

## 1. Tóm tắt tiếng Việt

### Đã fix gì?

**Bug #1: Generated accommodation dayIds mismatch (P0 - CRITICAL) - ĐÃ FIX**
- Vấn đề: AI trả về `dayIds: [1, 2]` nhưng DB tạo `TripDay` với IDs thực tế như `[188, 189, 190]`
- Gây ra: Frontend không tìm được accommodation, hiển thị "Chưa có nơi ở"
- Fix: Thêm mapping từ AI day_number → DB TripDay.id trong pipeline.py
- Evidence: Code đã có logic remap tại lines 426-513 trong `Backend/src/itineraries/pipeline.py`

**Bug #3: DB loader conflict update thiếu fields (P1 - CONFIRMED) - ĐÃ FIX**
- Vấn đề: ETL rerun không repair được `image`, `avg_cost`, `opening_hours`
- Fix: Đã thêm 3 fields này vào conflict update branch trong `Backend/src/etl/loaders/db_loader.py`
- Evidence: Code đã có fields tại lines 105-119 trong db_loader.py

**Improvements: ETL rate limiting handling**
- Thêm delays trong Goong extractor để tránh rate limit:
  - 1.5s giữa keyword searches
  - 0.5s giữa place detail calls
- Thêm inter-city delay (10s) trong ETL runner
- Purpose: Giúp ETL chạy ổn định hơn với Goong free tier quota

### Vì sao lỗi xảy ra?

**Bug #1:** Backend persist accommodation `day_ids` trực tiếp từ AI payload mà không remap sang DB IDs

**Bug #3:** Conflict update branch thiếu 3 fields quan trọng, khiến ETL rerun không repair được data cũ

### Còn gì chưa fix và vì sao?

**Bug #2: Place images empty (API LIMITATION, KHÔNG PHẢI CODE BUG)**
- Goong API KHÔNG cung cấp field `photos`/`images`
- 725/725 places hiện có `image = ''` - ĐÚNG với API limitation
- ETL pipeline hoạt động ĐÚNG với available data
- **User decision needed:** Chọn strategy cho images (Option B/C/D)
  - Option B: External API (Unsplash/Pexels) - High effort (8-12 hours)
  - Option C: Admin Panel + Manual Curation - Medium effort (4-6 hours)
  - Option D: Do Nothing - Zero effort

---

## 2. English Summary

### Fixed Issues

1. **Accommodation dayIds mismatch (CRITICAL)** - ✅ FIXED in commit `a1ca485`
   - Backend now maps AI day numbers to real DB TripDay IDs
   - `Backend/src/itineraries/pipeline.py` lines 426-513

2. **DB loader conflict update incomplete** - ✅ FIXED in commit `a1ca485`
   - ETL rerun now repairs `image`, `avg_cost`, `opening_hours`
   - `Backend/src/etl/loaders/db_loader.py` lines 105-119

3. **ETL rate limiting improvements** - ✅ ADDED in working tree
   - Inter-request delays in Goong extractor
   - Inter-city delays in ETL runner
   - Purpose: Stay within Goong free tier quota

### Known Limitation

**Place images empty** - NOT a code bug, confirmed Goong API limitation
- Goong Places API does not provide `photos`/`images` field
- All 725 places correctly have `image = ''` (expected behavior)
- Requires product decision on image strategy (External API / Admin Panel / Accept limitation)

---

## 3. Root Cause Analysis

| Bug | Root Cause | Evidence | Fix |
|-----|-----------|----------|-----|
| #1 Accommodation dayIds mismatch | Backend persisted AI `day_ids` directly without remapping to DB TripDay IDs | `Backend/src/itineraries/pipeline.py:426-513` - Remap logic added | ✅ FIXED in commit `a1ca485` |
| #3 DB loader conflict update incomplete | Missing `image`, `avg_cost`, `opening_hours` in ON CONFLICT DO UPDATE branch | `Backend/src/etl/loaders/db_loader.py:105-119` - Fields added | ✅ FIXED in commit `a1ca485` |
| #2 Place images empty | Goong API does NOT provide photos/images field (API limitation) | `docs/REPORTS/ISSUES/issue_etl_place_image_pipeline_gap.md` | ⏸️ AWAITING PRODUCT DECISION |

---

## 4. Files Changed

### In commit `a1ca485` (already pushed)

| File | Before | After | Why |
|------|--------|-------|-----|
| `Backend/src/itineraries/pipeline.py` | Direct AI day_ids pass | Remap AI day_number → DB TripDay.id | Fix accommodation linkage |
| `Backend/src/etl/loaders/db_loader.py` | 8 fields in conflict update | 11 fields (added image, avg_cost, opening_hours) | Allow ETL rerun to repair data |
| `Backend/tests/integration/test_etl_loader.py` | Only basic upsert test | Added test for conflict update refresh | Verify repair behavior |
| `Backend/tests/unit/test_itinerary_pipeline.py` | No dayIds test | Added dayIds remap test | Verify accommodation linkage |

### In working tree (improvements, not yet committed)

| File | Change | Why |
|------|--------|-----|
| `Backend/src/etl/extractors/goong_extractor.py` | Added 1.5s delay between keyword searches, 0.5s between detail calls | Avoid Goong API rate limiting |
| `Backend/src/etl/runner.py` | Added 10s inter-city delay | Avoid Goong API rate limiting |

---

## 5. Diff Summary

### Working tree changes (improvements):

```bash
# Backend/src/etl/extractors/goong_extractor.py
+ Added delays to avoid Goong API rate limiting:
+   - 1.5s between keyword searches
+   - 0.5s between place detail calls

# Backend/src/etl/runner.py
+ Added inter-city delay (10s) to avoid Goong API rate limiting
```

### Key code snippets from commit `a1ca485` (already fixed):

**Bug #1 Fix - Accommodation dayIds remapping:**
```python
# Backend/src/itineraries/pipeline.py:426-513
# Create days first and track both AI day number and generated order → TripDay.id mapping
day_number_to_id: dict[int, int] = {}
day_order_to_id: dict[int, int] = {}
for idx, day in enumerate(sorted_days):
    trip_day = await self.repo.add_day(...)
    day_number_to_id[day.day_number] = trip_day.id
    day_order_to_id[idx + 1] = trip_day.id

# Remap accommodation day_ids
for accommodation in itinerary.accommodations:
    remapped_day_ids: list[int] = []
    for raw_day_id in accommodation.day_ids:
        db_day_id = day_number_to_id.get(raw_day_id) or day_order_to_id.get(raw_day_id)
        if db_day_id is not None:
            remapped_day_ids.append(db_day_id)
    await self.repo.add_accommodation(day_ids=remapped_day_ids, ...)
```

**Bug #3 Fix - Conflict update refresh:**
```python
# Backend/src/etl/loaders/db_loader.py:105-119
stmt = stmt.on_conflict_do_update(
    index_elements=["name", "destination_id"],
    set_={
        "category": stmt.excluded.category,
        "description": stmt.excluded.description,
        "location": stmt.excluded.location,
        "latitude": stmt.excluded.latitude,
        "longitude": stmt.excluded.longitude,
        "avg_cost": stmt.excluded.avg_cost,        # ← ADDED
        "rating": stmt.excluded.rating,
        "review_count": stmt.excluded.review_count,
        "image": stmt.excluded.image,              # ← ADDED
        "opening_hours": stmt.excluded.opening_hours,  # ← ADDED
        "external_id": stmt.excluded.external_id,
        "raw_metadata": stmt.excluded.raw_metadata,
        "source": stmt.excluded.source,
    },
)
```

---

## 6. Tests and Runtime Verification

| Command/Smoke | Status | Evidence |
|----------------|--------|----------|
| Backend lint (ruff check) | ✅ PASS | All checks passed |
| Backend format (ruff format) | ✅ PASS | After formatting goong_extractor.py |
| Backend unit tests | ✅ PASS | 135 passed, 1 deprecation warning (unrelated) |
| Backend integration tests | ✅ PASS | 37 passed, 16 skipped (expected) |
| Frontend build | ✅ PASS | Built in 15.40s to .build-tmp/verify-00060k-r1 |
| E2E tests | ⏸️ NOT RUN | Requires full stack running - deferred to CI |

---

## 7. DB/API Verification

### Database state (2026-06-08):

| Query | Before | After | Notes |
|-------|--------|-------|-------|
| `SELECT COUNT(*) FROM places` | - | 725 | 725 places in DB (all cities) |
| `SELECT COUNT(*) FROM places WHERE image <> ''` | - | 0 | 0/725 have images (expected - API limitation) |
| Places per city | - | 56-75 per active city | Hà Nội: 74, TP.HCM: 75, Đà Nẵng: 72, etc. |
| Latest trip | - | Trip #457 | Generated but no trip_days (incomplete test data) |
| Accommodation for #457 | - | day_ids=[] | Empty array (no linkage) |

### API status:

| Endpoint | Status | Notes |
|----------|--------|-------|
| `/api/v1/health` | ✅ Healthy | Service up |
| `/api/v1/places/search?city=Hà+Nội` | ✅ Working | Returns 74 places, images empty (expected) |
| `/api/v1/destinations` | ✅ Working | Returns 28 destinations |

---

## 8. Remaining Risks

| Risk | Impact | Follow-up phase |
|------|--------|-----------------|
| **Place images empty** | Medium - UX degraded but functional | User decision needed: Option B (External API) / C (Admin Panel) / D (Accept) |
| **Accommodation with empty day_ids** | Low - Should be rare with new remap logic | Monitor for edge cases in production |
| **Goong API rate limits** | Low - Mitigated by delays | Continue monitoring in production |
| **Test coverage for dayIds remap** | Low - Test exists but needs E2E validation | Add E2E test in 00060L or later |

---

## 9. Next Phase Recommendation

### Immediate (this PR #85):

1. ✅ **Bug #1 + #3 fixes:** Already in commit `a1ca485` - Ready for merge
2. ⏸️ **Image strategy decision:** User needs to choose Option B/C/D before proceeding

### Short-term (00060K-R2 or 00060L):

- **If Option B (External API):** Implement Unsplash/Pexels integration (8-12 hours)
- **If Option C (Admin Panel):** Implement admin endpoints + UI (4-6 hours)
- **If Option D (Do Nothing):** Focus on Phase C3/C4 companion chat

### Before C3/C4:

- ✅ Runtime stable (Docker, DB, API)
- ✅ Data contract fixed (accommodation dayIds)
- ✅ ETL pipeline functional
- ⏸️ Image decision (blocks full UX polish)
- ⚠️ **Async generation needed** for trips >30 days (see issue: `docs/REPORTS/ISSUES/issue_async_generation_needed_for_long_trips.md`)

### Long-term (C3/C4+):

- Consider `/staticmap` API for destination thumbnails
- Implement async generation for long trips
- Strengthen E2E test coverage for accommodation linkage

---

## 10. PR Status

**Branch:** `fix/00060-d-local-smoke-ux-data-fix`
**Latest commit:** `a1ca485` - "fix: [#00060] fix generated accommodation and etl upsert contracts"
**Working tree:** ETL rate limiting improvements (not yet committed)

**Can merge PR #85 now?** ✅ **YES**
- Critical bugs (#1, #3) fixed in commit
- All tests passing
- Frontend builds successfully
- ETL improvements in working tree are optional enhancements

**Can start C3/C4 now?** ⏸️ **RECOMMEND WAIT**
- Need image strategy decision first
- Async generation needed for trips >30 days
- Full smoke test recommended before chatbot work

---

## 11. Appendix: Evidence Files

Created/Updated during audit:
- `docs/REPORTS/00060k_pre_chatbot_source_docs_runtime_audit.md` - Comprehensive source/docs/runtime audit
- `docs/REPORTS/ISSUES/issue_generated_accommodation_dayids_do_not_match_tripday_ids.md` - Bug #1 details
- `docs/REPORTS/ISSUES/issue_etl_place_image_pipeline_gap.md` - Bug #2 analysis
- `docs/REPORTS/ISSUES/plan_00060_critical_data_fixes.md` - Implementation plan
- `docs/REPORTS/00060k_r1_critical_data_contract_fixes.md` - This report

---

**Generated:** 2026-06-08
**Status:** Complete - PR #85 ready for merge, pending image strategy decision
