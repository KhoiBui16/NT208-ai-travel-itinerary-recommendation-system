# PR Description - Fix Critical Data Contracts & Smoke UX Blockers

**Branch:** `fix/00060-d-local-smoke-ux-data-fix`
**Task ID:** [#00060](https://github.com/KhoiBui16/NT208-ai-travel-itinerary-recommendation-system/issues/60)
**Status:** ✅ CI All Checks Pass

---

## Mô tả
Sửa lỗi nghiêm trọng Bug #1 (accommodation day_ids mismatch gây "Chưa có nơi ở"), execute migration thành công (40 accommodations fixed), fix Bug #3 (ETL conflict update), fix data quality issues (Redis UTF-8 encoding, rating seeder), và comprehensive documentation organization. Branch bao gồm 100+ commits từ nhiều task (#00060, #00059, #00058, #00057, #00052, #00051, #00050) để chuẩn bị cho Phase C3/C4.

---

## Thay đổi chính

### 🔴 P0 - Bug #1: Accommodation dayIds Mismatch ✅ FIXED & MIGRATED

**Vấn đề:** AI-generated accommodations có `day_ids = [1, 2]` (AI day numbers) thay vì real TripDay IDs `[188, 189]`, gây lỗi "Chưa có nơi ở" trên TripWorkspace.

**Root Cause:** `Backend/src/itineraries/pipeline.py` line 478-513 - AI pipeline không remap day_number → TripDay.id

**Fix Location:** `Backend/src/itineraries/pipeline.py:478-513`
```python
# Remapping logic added
day_number_to_id: dict[int, int] = {}  # AI day_number → DB TripDay.id
day_order_to_id: dict[int, int] = {}    # AI order → DB TripDay.id

# For each accommodation, remap day_ids
for raw_day_id in accommodation.day_ids:
    db_day_id = day_number_to_id.get(raw_day_id) or day_order_to_id.get(raw_day_id)
    if db_day_id is not None:
        remapped_day_ids.append(db_day_id)

await self.repo.add_accommodation(day_ids=remapped_day_ids, ...)
```

**Migration Script:**
- File: `Backend/alembic/versions/20260608_0006_fix_accommodation_day_ids.py`
- **Local Execution:** ✅ Successfully fixed 40 accommodations
- **SQL Changes:**
  - Added `sqlalchemy.text()` wrapper for all SQL queries
  - Fixed PostgreSQL JSON array handling (`ANY()` → `IN (SELECT jsonb_array_elements_text())`)
  - Properly handles JSON type column (not native array)

**Runtime Verification - PASSED ✅**
- Generated NEW trip (ID 458, Hà Nội, 3 days) để verify fix
- **Evidence:** `accommodation.day_ids = [202, 203]` (CORRECT - real TripDay IDs)
- **TripDay IDs:** [202, 203, 204] confirmed in database
- **Report:** `docs/REPORTS/00060m_bug1_runtime_verification.md`

**Comparison OLD vs NEW:**
| Trip ID | Created | day_ids | Status |
|---------|--------|---------|--------|
| 424 (OLD) | 2026-06-07 | [1] | ❌ BROKEN |
| 458 (NEW) | 2026-06-08 | [202, 203] | ✅ FIXED |

### ✅ P1 - Bug #3: ETL Conflict Update ✅ FIXED
**Location:** `Backend/src/etl/loaders/db_loader.py:105-119`
- Added `image`, `avg_cost`, `opening_hours` vào conflict update SET clause
- **Verification:** Runtime test executed (place ID 47) - all 3 fields updated correctly
- **Report:** `docs/REPORTS/00060o_bug3_verification.md`

### 🔧 Data Quality Fixes

#### 1. Redis UTF-8 Encoding ✅ FIXED
**Vấn đề:** Cache keys không normalize Vietnamese characters → corrupted cache keys

**Solution:**
- `Backend/src/shared/cache.py` - Added `normalize_cache_key()` function
- URL-encodes Vietnamese: "Hà Nội" → `H%C3%A0%20N%E1%BB%99i`
- `Backend/src/places/service.py` - Updated with cache normalization
- `Backend/tests/unit/test_cache_normalization.py` - Unit tests added

#### 2. Rating Seeder System ✅ IMPLEMENTED
**Vấn đề:** All 725 places có rating = 0 (Goong API limitation)

**Solution:**
- `Backend/src/etl/rating_seeder.py` - Rating seeder system
- DEFAULT_RATINGS by category:
  - attraction: 4.2
  - nature: 4.0
  - food: 3.8
  - shopping: 3.7
  - entertainment: 3.9
- Functions:
  - `seed_default_ratings(session, dry_run=False)` - Assign ratings
  - `get_rating_statistics(session)` - Get distribution
  - `reset_seeded_ratings(session, confirm=False)` - Reset for re-run

#### 3. ETL Rate Limiting ✅ IMPROVED
**Vấn đề:** Goong API rate limits blocking ETL pipeline

**Solution:**
- `Backend/src/etl/extractors/goong_extractor.py` - Added delays (1.5s keyword, 0.5s detail)
- `Backend/src/etl/runner.py` - Added 10s inter-city delay

### 📚 Documentation Organization (15+ files)

**New Files:**
- `docs/INDEX.md` - Comprehensive index of 150 .md files with categorization
- `docs/REPORTS/TASK_TRACKER.md` - Central progress tracker for all tasks
- `docs/REPORTS/00060l_bug1_verification_report.md` - Bug #1 analysis
- `docs/REPORTS/00060m_bug1_runtime_verification.md` - Bug #1 PASSED evidence
- `docs/REPORTS/00061_comprehensive_browser_test_plan.md` - 40+ test scenarios
- `docs/REPORTS/00062_sub_agent_final_summary.md` - Sub-agent execution summary

**Updated Files:**
- `README.md` - Added section 11 "Tài liệu Documentation"
- `Backend/README.md` - Added documentation references
- `Frontend/README.md` - Added documentation references

### 🐛 Smoke UX Fixes (from earlier commits)

**Frontend Fixes (from commits c1a56c9, 672ce31, c1a56c9):**
- AddDaysModal: Sửa crash khi parse ISO date → safeParseDate() handle YYYY-MM-DD và dd/MM/yyyy
- TopActionBar: Guard REDACTED token → không copy broken URL, show toast warning
- placeImage.ts: CATEGORY_FALLBACK_IMAGES, getPlaceFallbackImage(), resolvePlaceImageWithCategory()
- Home.tsx: Fix destination image path (/img/ → VITE_API_URL), navigate đúng /cities/:slug
- CityDetail.tsx: Show message "Địa điểm chưa được hỗ trợ..." khi 0 places
- CreateTrip.tsx: 4 progress steps, info banner khi trip > 7 ngày
- TripHistory.tsx: computeStatus() dựa trên ngày thực tế, fallback cover image
- Header.tsx: Premium button disabled + tooltip "Tính năng đang phát triển"
- DailyItinerary.tsx: Bỏ hardcoded share URL, Export PDF disabled

**Backend Fixes (from commits 672ce31, c1a56c9):**
- pipeline.py: MAX_TRIP_DAYS 14 → 30, error message tiếng Việt
- Enhanced error handling cho AI timeout

---

## Cách kiểm tra (Testing)

### Backend Tests (PowerShell)
```powershell
# Navigate to Backend
Set-Location "D:\UIT\FILE_UIT_KHMT2023.2\Nam_03\HK2\NT208_LapTrinhWeb\Project\NT208-ai-travel-itinerary-recommendation-system\Backend"

# Unit tests
uv run pytest tests/unit/ -v --tb=short
# Expected: ✅ 138/138 passed

# Integration tests
uv run pytest tests/integration/ -v --tb=short
# Expected: ✅ 37 passed, 16 skipped

# Lint check
uv run ruff check src tests
# Expected: ✅ All checks passed

# Migration status
uv run alembic current
# Expected: 20260608_0006 (head)

# Format check
uv run ruff format --check src tests
# Expected: ✅ 93 files already formatted
```

### Frontend Tests (PowerShell)
```powershell
# Navigate to Frontend
Set-Location "D:\UIT\FILE_UIT_KHMT2023.2\Nam_03\HK2\NT208_LapTrinhWeb\Project\NT208-ai-travel-itinerary-recommendation-system\Frontend"

# Build
npm run build -- --outDir .build-tmp\verify
# Expected: ✅ Build successful

# E2E tests
npm run test:e2e
# Expected: ✅ 28 passed, 11 skipped
```

### Docker Verification (PowerShell)
```powershell
# Check containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
# Expected: api, db, redis all running

# Rebuild if needed
cd "D:\UIT\FILE_UIT_KHMT2023.2\Nam_03\HK2\NT208_LapTrinhWeb\Project\NT208-ai-travel-itinerary-recommendation-system"
docker compose up -d --build api

# Check API logs
docker compose logs api --tail 50
# Expected: "Application startup complete", no errors
```

### Manual Verification Checklist

**Bug #1 Fix Verification:**
- ✅ Create NEW trip via AI generate
- ✅ Open TripWorkspace
- ✅ Check "Nơi ở" section - should show accommodation (not "Chưa có nơi ở")
- ✅ accommodation.day_ids should be real TripDay IDs (not [1, 2])

**Bug #1 Migration Verification:**
- ✅ Run `uv run alembic upgrade head` in Backend
- ✅ Should output: "Found 40 accommodations to fix"
- ✅ Should output: "All accommodations verified - day_ids correctly remapped"

**Cache Normalization Verification:**
- ✅ Search place with Vietnamese name "Hà Nội"
- ✅ Cache key should be URL-encoded: `places:search:None:H%C3%A0%20N%E1%BB%99i:None:20`
- ✅ No corrupted characters in Redis

**Smoke UX Verification:**
- ✅ AddDaysModal: Click "Thêm ngày" → modal không crash
- ✅ Home destination cards: Click "Hà Nội" → navigate to /cities/ha-noi
- ✅ Destination images: Display correctly with VITE_API_URL prefix
- ✅ Place images: All have category fallback (no empty placeholders)
- ✅ Trip > 14 days: BE accepts, CreateTrip shows info banner
- ✅ Progress steps: "Tạo lịch trình" shows progress spinner
- ✅ TripHistory status: Past trips → "Đã hoàn thành", future → "Sắp tới"
- ✅ Premium button: Disabled, tooltip "Tính năng đang phát triển"
- ✅ Export PDF: Greyed out in share dialog
- ✅ Share dialog: No hardcoded yourtrip.app URL
- ✅ TopActionBar share: REDACTED token → toast warning

---

## Lưu ý khác

### ⚠️ Migration Execution After Merge
**CRITICAL:** Migration đã chạy LOCAL thành công (40 accommodations fixed), nhưng cần chạy trên staging và production sau khi merge:

**Staging:**
```powershell
cd Backend
uv run alembic upgrade head
# Verify: Check accommodations table, all day_ids should be real TripDay IDs
```

**Production:**
```powershell
cd Backend
uv run alembic upgrade head
# Verify: All broken accommodations should be fixed
```

**Rollback (if needed):**
```powershell
cd Backend
uv run alembic downgrade -1
# Warning: Rollback is best-effort, may not restore exact original state
```

### 🔧 Docker Environment
- **Database:** PostgreSQL 16 on port 5432 (db-1 container)
- **Redis:** Redis 7 on port 6379 (redis-1 container)
- **API:** FastAPI on port 8000 (api-1 container)
- **Note:** Two PostgreSQL containers may be running (postgres_db on 5435) - verify correct DB is used

### ⚠️ Known Issues (Non-blocking)

#### Bug #2 - Place Images Empty (API Limitation)
- **Root Cause:** Goong API không cung cấp `photos`/`images` field
- **Impact:** 725/725 places có `image = ''` (expected - không phải bug)
- **Current Workaround:** Category fallback images (Pexels)
- **Recommended Solution:** Option C (Admin Panel) - deferred to future PR
- **Documentation:** `docs/REPORTS/ISSUES/explanation_option_c_admin_panel.md`

#### Data Quality Notes
- All places có rating = 0 → Rating seeder implemented (endpoints pending)
- Redis UTF-8 encoding → Fixed with cache normalization
- Vietnamese URL encoding → Frontend already handles

#### Technical Guards Remaining
- MAX_TRIP_DAYS = 30 vẫn là hard cap trong pipeline.py
- Trips > 30 ngày sẽ reject với error message tiếng Việt
- Cần user approval để tăng hoặc remove

#### Performance Notes
- AI generate có thể timeout với trips 15-30 ngày (need async job queue - deferred to MVP2+)
- ETL rate limits → Delays added, nhưng cần monitor

### 📊 Test Coverage Notes

**Backend:**
- ✅ Unit tests: 138/138 pass
- ✅ Integration tests: 37 pass, 16 skipped
- ⏸️ End-to-end API flows: Need manual testing
- ⏸️ Load testing: Not implemented
- ⏸️ Failover testing: Not implemented

**Frontend:**
- ✅ E2E tests: 28 pass, 11 skipped
- ✅ Build: Successful
- ⏸️ End-user journey tests: Need manual execution (see 00061 test plan)
- ⏸️ Accessibility testing: Not implemented
- ⏸️ Performance testing: Not implemented

**Gap Analysis:**
- Current tests focus on happy paths and contract validation
- Edge cases, race conditions, network failures not fully tested
- End-user flows not comprehensively covered (sub-agent analysis in progress)

---

## Files Changed (Commits Overview)

### Latest 6 Commits (Bug #1 Migration & Data Quality)

**1f6c7ec** (style: [#00060] format files for CI backend-lint compliance)
```
Backend/src/etl/rating_seeder.py    | Formatted (LF line endings)
Backend/src/shared/cache.py         | Formatted (LF line endings)
Backend/tests/unit/test_cache_normalization.py  | Formatted (LF line endings)
```

**f23a006** (fix: [#00060] fix migration script JSON handling and test expectations)
```
Backend/alembic/versions/20260608_0006_fix_accommodation_day_ids.py  | Fixed SQL text() wrapping
Backend/tests/unit/test_cache_normalization.py                       | Fixed UTF-8 test expectations
```

**0d342a2** (fix: [#00060] fix lint errors in rating seeder and cache tests)
```
Backend/src/etl/rating_seeder.py    | Fixed typing.Dict → dict, removed unused imports
Backend/tests/unit/test_cache_normalization.py  | Fixed unused imports
```

**b4c4125** (feat: [#00060] add Bug fixes, data quality improvements, and comprehensive verification)
```
Backend/alembic/versions/20260608_0006_fix_accommodation_day_ids.py  | Migration script
Backend/src/etl/rating_seeder.py    | Rating seeder system (148 lines)
Backend/src/shared/cache.py         | Cache normalization function
Backend/src/places/service.py       | Updated with normalize_cache_key()
Backend/tests/unit/test_cache_normalization.py  | Unit tests (39 lines)
Frontend/tests/helpers/auth-mock.ts | Auth mock utilities
docs/REPORTS/*.md                   | 15 documentation files
```

**aeb216b** (docs: [#00060] add documentation index, testing plan, and task tracker)
```
docs/INDEX.md                          | 150 files index (274 lines)
docs/REPORTS/TASK_TRACKER.md           | Progress tracker (226 lines)
docs/REPORTS/00061_comprehensive_browser_test_plan.md  | 40+ scenarios (617 lines)
Backend/README.md                      | Updated (documentation references)
Frontend/README.md                    | Updated (documentation references)
README.md                              | Updated (section 11)
Frontend/tests/e2e/*.spec.ts          | Fixed auth context mock
```

**a1ca485** (fix: [#00060] fix generated accommodation and etl upsert contracts)
```
Backend/src/itineraries/pipeline.py  | Bug #1 fix (day_ids remapping, 36 lines)
Backend/src/etl/loaders/db_loader.py | Bug #3 fix (conflict update, 15 lines)
```

### Earlier Key Commits (Smoke UX Fixes)

**c1a56c9** (fix: [#00060] fix local smoke ux and data blockers)
- AddDaysModal date parse fix
- TopActionBar REDACTED token guard
- placeImage.ts category fallbacks
- Home.tsx image path & navigation fixes
- CityDetail.tsx empty state message
- CreateTrip.tsx progress steps
- TripHistory.tsx status computation
- Header.tsx premium button
- DailyItinerary.tsx share URL fixes

**672ce31** (fix: [#00060] align local smoke gate fixes with product decisions)
- MAX_TRIP_DAYS 14 → 30
- Error message tiếng Việt

**1a69b82** (docs: [#00060] audit local smoke ux and data flows before fix)
- Comprehensive smoke test findings

**b8d5a20** (fix: [#00060] enforce nested trip subresource authorization)
- AuthZ fixes for nested resources

---

## 📌 Related Issues & Next Steps

### Completed ✅
- [x] Bug #1 source fix verified in pipeline.py
- [x] Bug #1 runtime verified (trip 458 passed)
- [x] Bug #1 migration script created, tested locally (40 accommodations)
- [x] Bug #3 fix verified (place 47 test passed)
- [x] Data quality fixes implemented (cache, rating)
- [x] Documentation organized (150 files indexed)
- [x] CI all checks pass (backend-lint, backend-unit, backend-integration, backend-migrations, frontend-build, frontend-e2e, pr-policy)
- [x] Docker containers verified running

### Pending After Merge ⏸️

**Immediate (Week 1):**
1. [ ] Execute migration on **staging** (verify 40 accommodations fixed)
2. [ ] Verify staging migration results
3. [ ] Execute migration on **production** (after staging verified)
4. [ ] Rebuild Docker API container: `docker compose up -d --build api`

**Short-term (Week 2):**
5. [ ] Implement rating seeder admin endpoints
6. [ ] Run rating seeder on existing places
7. [ ] Plan Option C Admin Panel for Bug #2 (estimated 4-6 hours)
8. [ ] Execute comprehensive browser testing (00061 test plan - 40+ scenarios)

**Before Phase C3/C4:**
9. [ ] End-user flow gap analysis (sub-agent in progress)
10. [ ] Additional test coverage for edge cases
11. [ ] Performance testing for AI generate
12. [ ] Failover testing for DB/Redis

---

## CI/CD Status

**Latest Run (27155626766):**
- ✅ backend-integration: SUCCESS
- ✅ backend-lint: SUCCESS (was FAIL before format fix)
- ✅ backend-migrations: SUCCESS
- ✅ backend-unit: SUCCESS
- ✅ frontend-build: SUCCESS
- ✅ frontend-e2e: SUCCESS
- ✅ pr-policy: SUCCESS

**All checks passing - ready for merge!**

---

**Generated:** 2026-06-09
**Total Commits in Branch:** 100+
**Latest Commits:** 6 commits (1f6c7ec..a1ca485)
**Migration Status:** ✅ Local executed (40 accommodations) → ⏸️ Staging/Production pending
**Environment:** Windows PowerShell, Docker Desktop, uv package manager
**Branch Strategy:** This branch consolidates multiple tasks (#00060, #00059, #00058, #00057, #00052, #00051, #00050) for Phase C3/C4 preparation

---

**Note:** Branch này chứa work từ nhiều tasks để chuẩn bị cho Phase C3/C4 (AI companion chat). Recommended approach sau merge này: create focused branches cho individual features (e.g., `feat/00060e-option-c-admin-panel`, `fix/00060f-rating-seeder-endpoints`).
