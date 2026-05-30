# Issue: CalendarModal Day Button Click Timeout

## Status
✅ **RESOLVED** - Phase 00056 (2026-05-30)

## Evidence
- **Test**: Flow A (TP.HCM generate) and custom TC2/TC4 tests
- **Behavior**: Clicking day buttons in CalendarModal causes test timeout
- **Error**: `locator.click: Test timeout of 30000ms exceeded` on `button.aspect-square:not([disabled])`

## Impact
- **Medium**: Blocks full generate flow testing in Playwright
- **Low**: Manual user testing still works (Playwright timing is more strict)
- Users may be able to click manually, but automated tests cannot complete

## Root Cause
The CalendarModal day buttons may have:
1. Z-index/stacking issue where another overlay blocks clicks
2. Event propagation issue where clicks are intercepted
3. Async state update timing issue in React

From test logs:
```
<button disabled class="aspect-square rounded-lg...">...</button>
from <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">...</div>
subtree intercepts pointer events
```

## Test Evidence
```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button.aspect-square:not([disabled])').nth(2)
  - element is visible, enabled and stable
  - <div class="fixed inset-0 z-50..."> intercepts pointer events
```

## Resolution (Phase 00056)

**Status**: ✅ **RESOLVED**

Changes made:
1. Added `pointer-events-auto` to CalendarModal modal content div
2. Added `onClick={onClose}` to backdrop wrapper (allows click outside to close)
3. Added `onClick={(e) => e.stopPropagation()}` to modal content (prevents click propagation)
4. Fixed test selector to re-query elements after state update
5. Fixed screenshot paths from `tests/e2e/b3/screenshots/` to `.codex-run-logs/`
6. Created debug test `00056-calendar-debug.spec.ts` to verify fix

Evidence:
- All 3 Playwright tests now pass (Flow A, B, C)
- Calendar selection successful: first click → second click → confirm enabled
- Console errors: 0
- Test output: "Available day buttons: 2", "Confirm button enabled: true"

See `docs/REPORTS/00056_calendar_generate_flow_fix_result.md` for full details.

## Related Issues
- None - newly discovered

## Recommended Branch
✅ **COMPLETED** in `fix/00056-c-calendar-generate-flow-unblock`

## Dependencies
- Blocks full generate flow testing
- Does NOT block basic functionality (manual testing still works)

---

**Created**: 2026-05-30
**Severity**: MEDIUM
**Priority**: HIGH (if automated tests are required)
