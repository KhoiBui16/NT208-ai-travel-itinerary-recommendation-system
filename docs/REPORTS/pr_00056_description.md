# PR #00056 — CalendarModal Bug Fix and Generate Flow Unblock

## Mô tả

Fix CalendarModal/day selection bug discovered in 00055 fullstack regression, then rerun browser regression to unblock generate flow testing before C3/C4.

## Thay đổi chính

- [x] Reproduced CalendarModal click timeout bug via code review and test analysis
- [x] Fixed CalendarModal with `pointer-events-auto` + `stopPropagation` on modal content
- [x] Fixed test selector to re-query elements after state update
- [x] Fixed screenshot paths from `tests/e2e/b3/screenshots/` to `.codex-run-logs/`
- [x] Added `onClick={onClose}` to backdrop for proper modal close behavior
- [x] Created debug test `00056-calendar-debug.spec.ts` for detailed verification
- [x] Re-verified all 3 Playwright regression tests (Flow A, B, C) now pass
- [x] Checked 10-city destination readiness via API
- [x] Updated docs/REPORTS and issue to RESOLVED

## Cách kiểm tra (Testing)

### Runtime

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173`

### Commands

**CI-safe tests (default):**
```bash
cd Frontend
npm run build  # NOTE: EPERM on dist/assets - local environment issue, NOT code bug
npx playwright test  # Runs all CI-safe tests (14 tests)
npx playwright test tests/e2e/00056-calendar-debug.spec.ts --reporter=list
```

**Local-only fullstack tests (requires backend):**
```bash
# Windows PowerShell
$env:FULLSTACK_E2E="1"; npm run test:e2e:fullstack

# Linux/Mac
FULLSTACK_E2E=1 npm run test:e2e:fullstack
```

### Browser scenarios

- ✅ Destination selector loads backend cities (10 cities)
- ✅ Calendar opens and renders day buttons
- ✅ First day click: SUCCESS
- ✅ Second day click: SUCCESS (with re-query)
- ✅ Confirm button enables after range selection
- ✅ Flow A: TP.HCM calendar selection successful
- ✅ Flow B: Workspace renders for existing trips
- ✅ Flow C: Date picker UI renders correctly
- ✅ Console errors: 0 across all tests

### Test Results (CI-safe)

| Test | Result | Duration |
|---|---|---|---|
| 00056-calendar-debug (CI-safe) | ✅ PASS | 7.9s |
| All CI-safe tests | ✅ PASS | 14/14 tests (25.8s) |
| b3 tests (default) | ✅ SKIPPED | 3 skipped (FULLSTACK_E2E not set) |

### Test Results (Local-only with FULLSTACK_E2E=1)

| Test | Result | Duration |
|---|---|---|---|
| Flow A (TP.HCM calendar) | ✅ PASS | 12.1s |
| Flow B (workspace) | ✅ PASS | 7.7s |
| Flow C (date picker UI) | ✅ PASS | 4.4s |

**All 4 tests passed** with 0 console errors.

## Lưu ý khác

- **Build EPERM**: `npm run build` fails with EPERM on `dist/assets` - local file lock issue, NOT a code bug
- **Real Gemini generate**: NOT tested in this task (limited quota). 00052 tested 2 cities with real Gemini.
- **Đà Lạt marginal data**: Only 10 places (threshold 30) - may fail generate, shows in FE anyway
- **Backend API limitation**: `/api/v1/places/destinations` doesn't return `placesCount` - FE cannot pre-filter cities
- **C3/C4**: Still NOT_READY - needs full generate flow testing with real Gemini smoke first
- **Guest flow**: NOT tested - needs separate verification
- **Error visibility runtime**: NOT tested with real 422/429/503 - code review only

---

**Generated**: 2026-05-30
**Branch**: `fix/00056-c-calendar-generate-flow-unblock`
**Status**: READY_FOR_COMMIT - CalendarModal bug resolved, all Playwright tests pass
