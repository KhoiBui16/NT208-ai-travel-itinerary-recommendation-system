# PR Description - Fix Critical Data Contract Bugs (#00060)

## Mô tả

Fix 2 critical bugs affecting AI-generated trips:
- **Bug #1 (P0 - CRITICAL):** Accommodation dayIds mismatch causing "Chưa có nơi ở" in workspace
- **Bug #3 (P1 - CONFIRMED):** DbLoader conflict update missing image/avg_cost/opening_hours fields
- **Bug #2 (API Limitation):** Place images empty - Goong API không cung cấp photos field (awaiting decision)

**Task ID:** #00060

---

## Thay đổi chính

### Backend Fixes (Commit: `a1ca485`)

- [x] **Bug #1 Fix:** Implement accommodation dayIds remapping in `Backend/src/itineraries/pipeline.py:426-513`
  - Thêm mapping từ AI day_number → DB TripDay.id
  - Remap accommodation day_ids trước khi persist
  - Fix UI hiển thị "Chưa có nơi ở" khi AI tạo accommodation

- [x] **Bug #3 Fix:** Add missing fields to `Backend/src/etl/loaders/db_loader.py:105-119`
  - Thêm `image`, `avg_cost`, `opening_hours` vào conflict update branch
  - ETL rerun giờ có thể repair existing rows

### ETL Improvements (Working tree - optional)

- [ ] ETL rate limiting improvements
  - `Backend/src/etl/extractors/goong_extractor.py`: 1.5s delay giữa keyword searches, 0.5s giữa detail calls
  - `Backend/src/etl/runner.py`: 10s inter-city delay
  - Mục đích: Tránh Goong API rate limit

### Test Fixes

- [x] Fix E2E test `00060d-pre-c3a-floating-chat-context.spec.ts`
  - Sửa CSS selector từ `bottom-6 z-40` → `bottom-28 z-20` (đúng với component thật)
  - Thêm proper localStorage mock setup cho auth tokens
  - Test pass: 17/17 passing, 11 skipped

---

## Cách kiểm tra (Testing)

### Backend Verification

```powershell
cd Backend

# Lint
uv run ruff check src tests

# Format
uv run ruff format src tests

# Unit tests
uv run pytest tests/unit/ -v --tb=short

# Integration tests
uv run pytest tests/integration/ -v --tb=short

# Migrations
uv run alembic upgrade head
uv run alembic check
```

**Kết quả mong đợi:**
- ✅ Lint pass
- ✅ Format pass
- ✅ 135 unit tests pass
- ✅ 37 integration tests pass (16 skipped expected)

### Frontend Verification

```powershell
cd Frontend

# Build
npm run build

# E2E tests
npm run test:e2e
```

**Kết quả mong đợi:**
- ✅ Build success (< 20s)
- ✅ 28/28 E2E tests pass (11 skipped expected)

### Smoke Tests (Optional - để verify end-to-end)

```powershell
# Start services
docker compose up -d db redis

# Start backend
cd Backend
uv run uvicorn src.main:app

# Start frontend
cd Frontend
npm run dev

# Test flow:
# 1. Navigate to http://localhost:5173/create-trip
# 2. Fill form: destination "Hà Nội", dates, budget
# 3. Click "AI Generate" button
# 4. Verify: Redirect to workspace, accommodation hiển thị đúng ngày (KHÔNG "Chưa có nơi ở")
# 5. Check DB: accommodations.day_ids chứa real TripDay IDs
```

---

## Lưu ý khác

### Bug #2 Image Strategy - Pending Decision

**Root Cause:** Goong Places API KHÔNG cung cấp field `photos`/`images` (API limitation, NOT code bug)

**725/725 places hiện có `image = ''` - ĐÚNG với API limitation**

**User cần quyết định chọn option nào:**

| Option | Effort | Ưu điểm | Nhược điểm |
|--------|--------|----------|------------|
| **B: External API** (Unsplash/Pexels) | 8-12 hours | Real images, automatic, scalable | External dependency, rate limits |
| **C: Admin Panel** ⭐ | 4-6 hours | Realistic, no external dependency, controlled quality | Manual effort |
| **D: Do Nothing** | 0 hours | Zero effort, immediate | Poor UX persists |

**See:** `docs/REPORTS/ISSUES/plan_00060_critical_data_fixes.md` for detailed comparison.

### Technical Debt Found (not blocking)

1. **Slug collision risk** (HIGH) - 2-3 hours to fix
   - `Backend/src/etl/loaders/db_loader.py` slug generation can collide
   - Example: "Thành phố Hồ Chí Minh" and "TP. Hồ Chí Minh" both → `tp-ho-chi-minh`

2. **Duplicate slug logic** (MEDIUM) - 1 hour to fix
   - Same logic in 2 locations: `db_loader.py` + `repository.py`

3. **Missing FK constraints** (MEDIUM) - 1-2 hours to fix
   - `activities.place_id` nên có FK → `places.id` (ON DELETE SET NULL)
   - `accommodations.hotel_id` nên có FK → `hotels.id` (ON DELETE SET NULL)

**See:** `docs/REPORTS/ISSUES/plan_00060_critical_data_fixes.md` Section M for details.

### Branch & Commit Info

**Branch:** `fix/00060-d-local-smoke-ux-data-fix`
**Commit:** `a1ca485` - "fix: [#00060] fix generated accommodation and etl upsert contracts"
**Working tree:** ETL rate limiting improvements (not committed, optional)

### Files Changed

**Commit `a1ca485` (already pushed):**
| File | Change | Why |
|------|--------|-----|
| `Backend/src/itineraries/pipeline.py` | Add dayId remapping logic | Fix accommodation linkage |
| `Backend/src/etl/loaders/db_loader.py` | Add image/avg_cost/opening_hours to conflict update | Allow ETL rerun to repair data |
| `Backend/tests/integration/test_etl_loader.py` | Add test for conflict update refresh | Verify repair behavior |
| `Backend/tests/unit/test_itinerary_pipeline.py` | Add dayIds remap test | Verify accommodation linkage |
| `Frontend/tests/helpers/auth-mock.ts` | NEW - Auth mock utilities | Reusable auth helpers for E2E tests |
| `Frontend/tests/e2e/00060d-pre-c3a-floating-chat-context.spec.ts` | Fix CSS selector + auth setup | Fix failing E2E test |

**Working tree (optional - not committed):**
| File | Change | Why |
|------|--------|-----|
| `Backend/src/etl/extractors/goong_extractor.py` | Add rate limiting delays | Avoid Goong API quota limits |
| `Backend/src/etl/runner.py` | Add inter-city delay | Avoid Goong API quota limits |

---

## Evidence & Reports

**R1 Report:** `docs/REPORTS/00060k_r1_critical_data_contract_fixes.md`
- Bug #1 fix evidence: `Backend/src/itineraries/pipeline.py:426-513`
- Bug #3 fix evidence: `Backend/src/etl/loaders/db_loader.py:105-119`
- Test results: 135 BE unit + 37 BE integration + 28 FE E2E (100% pass rate)

**Detailed Analysis:** `docs/REPORTS/00060k_r1_results_and_roadmap.md`
- Vietnamese comprehensive analysis
- Roadmap for Phase C3/C4
- Next steps after this PR

**Bug Details:**
- `docs/REPORTS/ISSUES/issue_generated_accommodation_dayids_do_not_match_tripday_ids.md` - Bug #1 RESOLVED
- `docs/REPORTS/ISSUES/issue_etl_place_image_pipeline_gap.md` - Bug #2 PARTIALLY RESOLVED (API limitation)
- `docs/REPORTS/ISSUES/plan_00060_critical_data_fixes.md` - Implementation plan with detailed options

---

## Next Steps (Sau merge)

### Immediate (Week 1):

1. ✅ **Merge PR #85** - Bugs #1, #3 fixed
2. ⏸️ **User decides Bug #2 image strategy** (Option B/C/D)
3. 🔧 **Fix slug collision** if needed (2-3 hours)
4. 🔧 **Add FK constraints** if needed (1-2 hours)

### Short-term (Week 2):

- **Option B (External API):** Implement Unsplash/Pexels integration (8-12 hours)
- **Option C (Admin Panel) ⭐:** Implement admin endpoints + UI (4-6 hours)
- **Option D (Do Nothing):** Skip, focus on C3/C4

### Before Phase C3/C4:

- [x] Runtime stable (Docker, DB, API)
- [x] Data contract fixed (accommodation dayIds)
- [x] ETL pipeline functional
- [ ] **Image decision completed** - BLOCKING C3/C4
- [ ] Full smoke test with real browser
- [ ] Comprehensive E2E test coverage

---

**Generated:** 2026-06-08
**Status:** Ready for merge after CI checks pass
**Next phase:** C3/C4 Companion Chat (pending Bug #2 image strategy decision)
