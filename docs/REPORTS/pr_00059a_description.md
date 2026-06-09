# PR #00059 — Phase 00059A: Unblock Calendar Modal E2E Date Selection

**Suggested PR title:**
```txt
fix: [#00059] unblock calendar modal e2e date selection
```

## Mô tả

Sửa calendar modal E2E blocker bằng cách tạo reusable test helper tự động chuyển sang tháng kế tiếp khi current month không đủ ngày enabled. Root cause là **test helper bug**, không phải UI bug.

**Product principle**: User thật phải chọn được ngày đi/về một cách ổn định. CalendarModal UI đã có prevMonth/nextMonth buttons - test automation cần thông minh hơn để handle edge cases.

## Thay đổi chính

### Frontend (3 files)
- [x] `tests/e2e/helpers/calendar.ts`: **NEW** - Reusable calendar helper với month navigation
- [x] `tests/e2e/00056-calendar-debug.spec.ts`: Dùng helper, bỏ manual date selection logic
- [x] `tests/e2e/00057-destination-readiness.spec.ts`: Dùng helper, bỏ manual date logic

### Docs (4 files)
- [x] `docs/REPORTS/00059a_calendar_modal_e2e_blocker_fix.md`: Comprehensive result report
- [x] `docs/REPORTS/pr_00059a_description.md`: This file
- [x] `docs/REPORTS/ISSUES/issue_calendar_modal_enabled_date_buttons_e2e_blocker.md`: Mark RESOLVED
- [x] `docs/REPORTS/REPORT.md`: Updated with 00059A entry

## Cách kiểm tra (Testing)

### Runtime

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173`

### Commands

**Frontend (PowerShell):**
```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location "$ROOT\Frontend"
npm run build -- --outDir .build-tmp\verify-00059a-calendar
npx playwright test tests\e2e\00056-calendar-debug.spec.ts --reporter=list
npx playwright test tests\e2e\00057-destination-readiness.spec.ts --reporter=list
npx playwright test --reporter=list
```

**Backend (PowerShell):**
```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location "$ROOT\Backend"
uv run ruff check src tests
uv run ruff format --check src tests
uv run pytest tests/unit/ -v --tb=short
```

### Test Results

| Test | Before | After | Evidence |
|---|---|---|---|---|
| 00056 | ⚠️ SKIP | ✅ PASS | Selected 01/06/2026 → 02/06/2026 via next month |
| 00057 | ⚠️ SKIP | ✅ PASS | Đà Lạt partial city allowed to submit, generate API called |
| Full suite | 9 PASS / 13 SKIP / 0 FAIL | 11 PASS / 11 SKIP / 0 FAIL | 00056+00057 now pass |

**Backend sanity:**
- ruff check: ✅ PASS
- ruff format: ✅ PASS
- pytest unit: ✅ 119 passed, 1 warning

### Calendar Helper Behavior

**Problem**: When test runs on May 31 (last day of month), only 1 day enabled in current month.

**Solution**: Helper automatically:
1. Counts enabled days in current month
2. If < 2 days, clicks next month button
3. Retries up to 3 months
4. Selects date range and confirms

**Console output**:
```
Month 1: Not enough enabled days (1), trying next month
[Calendar Helper] Modal closed after 0ms
[Calendar Helper] Date input text after selection: "01/06/2026 — 02/06/2026"
✓ Successfully selected date range: 01/06/2026 → 02/06/2026
```

## Lưu ý khác

### Critical Fix (This PR)
- ✅ **FIXED**: Calendar helper now handles month navigation automatically
- ✅ **VERIFIED**: 00056 and 00057 now pass consistently
- ✅ **ROOT CAUSE**: Test helper bug, not UI bug - CalendarModal already has month navigation

### What Was Verified
| Behavior | Status |
|---|---|
| Calendar month navigation in E2E | ✅ Verified |
| Date range selection after month navigation | ✅ Verified |
| Modal closes after confirming date range | ✅ Verified |
| 00057 full flow with partial city | ✅ Verified |

### What Remains Unverified
| Behavior | Status | Reason |
|---|---|---|
| Full 00058 429 UX with real browser date selection | ⚠️ Partial | Now possible but not re-tested in this PR |
| Double-click POST count protection | ⚠️ Partial | Requires dedicated test |

### Related Issues
- ✅ `ISSUES/issue_calendar_modal_enabled_date_buttons_e2e_blocker.md` - **RESOLVED**
- ⏭️ `00059B` - Full User Journey UAT (next phase)

## Files Changed

**Frontend (3 files):**
- `tests/e2e/helpers/calendar.ts` - NEW: Reusable calendar helper with month navigation
- `tests/e2e/00056-calendar-debug.spec.ts` - Use helper, simplify test
- `tests/e2e/00057-destination-readiness.spec.ts` - Use helper, remove manual date logic

**Docs (4 files):**
- `docs/REPORTS/00059a_calendar_modal_e2e_blocker_fix.md` - Comprehensive result report
- `docs/REPORTS/pr_00059a_description.md` - This file
- `docs/REPORTS/ISSUES/issue_calendar_modal_enabled_date_buttons_e2e_blocker.md` - Mark RESOLVED
- `docs/REPORTS/REPORT.md` - Updated with 00059A entry

---

**Generated**: 2026-05-31
**Branch**: `fix/00059-a-calendar-modal-e2e-blocker`
**Commit title**: `fix: [#00059] unblock calendar modal e2e date selection`
**Status**: READY - All tests pass, docs updated, awaiting user approval
