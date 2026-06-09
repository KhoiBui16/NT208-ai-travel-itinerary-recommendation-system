# PR Description - Fix Critical Data Contracts & Documentation

**Branch:** `fix/00060-d-local-smoke-ux-data-fix`
**Task ID:** #00060
**Status:** Ready for Review ✅

---

## Summary

Comprehensive documentation organization, Bug #1 verification (PASSED), Bug #1 migration script, and ETL rate limiting improvements to prepare system for Phase C3/C4.

---

## Changes in This PR

### 1. Documentation Organization (10 files, +2040 lines)

**New Files:**
- `docs/INDEX.md` - Comprehensive index of 150 .md files with categorization
- `docs/REPORTS/TASK_TRACKER.md` - Central progress tracker for all tasks
- `docs/REPORTS/00060l_bug1_verification_report.md` - Bug #1 analysis report
- `docs/REPORTS/00060m_bug1_runtime_verification.md` - **Bug #1 runtime verification - PASSED** ✅
- `docs/REPORTS/00061_comprehensive_browser_test_plan.md` - 40+ test scenarios with evidence templates

**Updated Files:**
- `README.md` - Added section 11 "Tài liệu Documentation" with links
- `Backend/README.md` - Added documentation references
- `Frontend/README.md` - Added documentation references
- `Frontend/tests/e2e/00060d-pre-c3a-floating-chat-context.spec.ts` - Fixed auth context mock

### 2. Bug #1 - Accommodation dayIds (P0 - CRITICAL) ✅ RESOLVED

**Problem:** AI-generated accommodations have `day_ids = [1, 2]` (AI day numbers) instead of real TripDay IDs `[188, 189]`, causing TripWorkspace to show "Chưa có nơi ở".

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

**Runtime Verification - PASSED ✅**
- Generated NEW trip (ID 458) to verify fix
- **Evidence:** `accommodation.day_ids = [202, 203]` (CORRECT - real TripDay IDs)
- **Report:** `docs/REPORTS/00060m_bug1_runtime_verification.md`

**Migration Script Created**
- File: `Backend/alembic/versions/20260608_0006_fix_accommodation_day_ids.py`
- Purpose: Repair ALL existing trips (50+ affected) created before fix
- Status: **READY** - Requires review + approval before execution

### 3. ETL Rate Limiting Improvements

**Problem:** Goong API rate limits blocking ETL pipeline.

**Fix:**
- `Backend/src/etl/extractors/goong_extractor.py` - Added 1.5s delay between keyword searches, 0.5s between place detail calls
- `Backend/src/etl/runner.py` - Added 10s inter-city delay

**Impact:** ETL pipeline now stays within Goong free tier quota.

### 4. Bug #3 - ETL Conflict Update (Already in Previous Commit)

**Fix Location:** `Backend/src/etl/loaders/db_loader.py:105-119`
- Added `image`, `avg_cost`, `opening_hours` to conflict update SET clause
- **Status:** Already fixed in commit a1ca485

---

## Testing

### Backend Tests
```powershell
cd Backend
uv run pytest tests/unit/ -v --tb=short      # 135 passed
uv run pytest tests/integration/ -v --tb=short  # 37 passed, 16 skipped
```

### Frontend Tests
```powershell
cd Frontend
npm run test:e2e  # 28 passed, 11 skipped
```

### Manual Verification
- ✅ Bug #1 fix verified with NEW trip generation (trip 458)
- ✅ Documentation index works (150 files categorized)
- ✅ Task tracker created for progress tracking

---

## Migration Required After Merge

**IMPORTANT:** After this PR is merged, the Bug #1 migration must be executed to repair existing trips.

**Steps:**
1. Merge this PR
2. Deploy to staging
3. Run migration:
   ```powershell
   cd Backend
   uv run alembic upgrade head
   ```
4. Verify migration results
5. Deploy to production
6. Run migration on production

**Migration Details:**
- File: `Backend/alembic/versions/20260608_0006_fix_accommodation_day_ids.py`
- Affects: ~50 AI-generated trips created before 2026-06-08
- Safe: Yes - only updates accommodation.day_ids field
- Rollback: Available (`alembic downgrade -1`)

---

## Known Issues (Not Blocking)

### Bug #2 - Place Images Empty (API Limitation)
- **Root Cause:** Goong API does NOT provide `photos`/`images` field
- **Impact:** 725/725 places have `image = ''` (expected - not a bug)
- **Status:** Awaiting user decision on Option C (Admin Panel)

See `docs/REPORTS/ISSUES/explanation_option_c_admin_panel.md` for detailed analysis.

### Data Quality Issues (Documented)
- All places have rating = 0 (Goong API limitation)
- Redis cache UTF-8 encoding (cache keys show corrupted Vietnamese)
- Vietnamese URL encoding required (API requirement)

See `docs/REPORTS/00060k_r2_backend_testing_report.md` for details.

---

## Next Steps (After This PR)

### Immediate (Week 1)
1. ✅ Merge this PR
2. ⏸️ Execute Bug #1 migration (staging → production)
3. ⏸️ User decides Bug #2 image strategy (Option C recommended)
4. 🔧 Implement Option C Admin Panel (4-6 hours)

### Short-term (Week 2)
- 🔧 Fix data quality issues (rating, encoding)
- 🔧 Execute comprehensive browser testing (00061 test plan)
- 🔧 Verify Bug #3 runtime (ETL rerun test)

### Before Phase C3/C4
- [ ] All critical bugs resolved
- [ ] All data repaired (migration executed)
- [ ] Browser testing executed
- [ ] Documentation complete

---

## Files Changed

**Commit aeb216b:**
```
 docs/INDEX.md                                 |  274 +++++++
 docs/REPORTS/TASK_TRACKER.md                  |  226 +++++++
 docs/REPORTS/00060l_bug1_verification_report.md |  236 +++++++
 docs/REPORTS/00061_comprehensive_browser_test_plan.md |  617 +++++++++++++++++++++++
 Backend/README.md                             |   19 +++++
 Backend/src/etl/extractors/goong_extractor.py  |   14 +++-
 Backend/src/etl/runner.py                    |   14 +++
 Frontend/README.md                            |   21 +++++
 Frontend/tests/e2e/00060d-pre-c3a-floating-chat-context.spec.ts | 31 +++++---
 README.md                                      |  76 +++++++++++++++++++++--
 10 files changed, 2040 insertions(+), 14 deletions(-)
```

---

**Generated:** 2026-06-09
**Status:** ✅ Ready for review and merge
**Next:** Execute Bug #1 migration after merge, then implement Option C Admin Panel
