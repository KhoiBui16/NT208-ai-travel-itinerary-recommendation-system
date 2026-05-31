# Issue: Calendar Modal Enabled Date Buttons E2E Blocker

**Created**: 2026-05-31
**Priority**: P1
**Status**: OPEN
**Related**: 00056 (SKIP), 00057 (FAIL), 00058B (partial verify)

---

## Problem

Calendar modal in Playwright/local test environment only exposes **1 enabled date button**, but selecting a date range requires at least **2 enabled buttons** (from date and to date).

**Symptom**: 
- Test attempts to open calendar modal
- Finds only 1 enabled day button
- Cannot complete date range selection
- Blocks generate flow submission

**Error pattern**:
```
Calendar modal visible: true
Total day buttons: 31
Enabled day buttons (initial): 1
ERROR: Not enough enabled buttons
```

---

## Why This Was Deferred

**Reason**: Out of scope for 00058B which focuses on:
1. Guest rate-limit remaining headers (backend)
2. Rate-limit metadata parsing (frontend)
3. 429 UX structure (E2E smoke)

Calendar modal UI is a separate concern that existed before 00058B.

**Product decision**: Document limitation honestly, fix calendar modal in separate task.

---

## Impact

| Test | Status | Evidence |
|---|---|---|
| 00056 | SKIP | "Not enough enabled date buttons" |
| 00057 | FAIL | "WARNING: Not enough enabled date buttons", timeout on submit |
| 00058B | Partial | Cannot verify full 429 UX or double-click POST count |
| 00059 | BLOCKED | Full user journey UAT requires date selection |

---

## Evidence from Current Runs

### 00056 Calendar Debug Test (2026-05-31)

```
=== Navigating to create-trip ===
Calendar modal visible: true
Total day buttons: 31
Enabled day buttons (initial): 1
ERROR: Not enough enabled buttons
  -  1 [chromium] › tests\e2e\00056-calendar-debug.spec.ts:14:1 › CalendarModal day clicks after pointer-events fix

  1 skipped
```

### 00057 Destination Readiness Test (2026-05-31)

```
WARNING: Not enough enabled date buttons
=== Submitting with Đà Lạt (partial city) ===
  ✘  1 [chromium] › tests\e2e\00057-destination-readiness.spec.ts:14:1 › Destination data quality advisory allows submit (30.2s)

Error: locator.click: Test timeout of 30000ms exceeded.
```

### 00058B Rate Limit Test (2026-05-31)

```
Calendar modal visible: true
Enabled day buttons: 1
ISSUE: Not enough enabled date buttons in test environment
This is a pre-existing calendar modal issue (see 00056-calendar-debug)
```

**Conclusion**: All three tests show the **same error pattern** ("Not enough enabled date buttons"), proving this is a **pre-existing issue** that affects multiple tests, NOT caused by 00058B changes.

---

## Root Cause (Preliminary)

Possible causes (need investigation):

1. **Date initialization logic**: Calendar modal may only enable "today" or future dates starting from tomorrow
2. **Test environment time mismatch**: Server time vs local browser time difference
3. **Date constraint logic**: Business rules may disable past dates, leaving only current day enabled
4. **Min/Max date props**: Calendar component may have restrictive min/max bounds

**Investigation needed**:
- Read `Frontend/src/app/components/CalendarModal.tsx`
- Check `fromDate`, `toDate`, `disabled` logic
- Verify test environment date settings
- Check if date constraints need adjustment for testing

---

## Proposed Solution

### Option 1: Fix Calendar Modal Date Logic

**Investigation steps**:
1. Read `CalendarModal.tsx` source code
2. Identify why only 1 button is enabled
3. Adjust date constraints to allow reasonable date range selection in test environment
4. Add test-specific date overrides if needed

**Acceptance criteria**:
- At least 2-3 enabled date buttons available in test environment
- 00056 can complete full generate flow
- 00057 can submit form successfully
- 00058B can verify full 429 UX

### Option 2: Test Environment Date Override

**Implementation sketch**:
```typescript
// In test setup, override current date to a known "good" date
const TEST_DATE = new Date('2026-06-01'); // Future date with plenty of enabled buttons
// Mock Date.now() or provide test calendar with fixed date
```

**Pros**:
- No changes to production calendar logic
- Predictable test environment
- Easy to debug

**Cons**:
- Test may not reflect real user behavior
- Requires test-specific code paths

---

## Recommended Next Phase

**Branch**: `fix/00059-a-calendar-modal-e2e-blocker`

**Scope**:
1. Investigate calendar modal date logic
2. Fix or work around the "1 enabled button" issue
3. Unblock 00056, 00057, and full 00058B verification
4. Enable 00059 full user journey UAT

**Priority**: P1 - Blocks multiple E2E tests

---

## References

- 00056 test: `Frontend/tests/e2e/00056-calendar-debug.spec.ts`
- 00057 test: `Frontend/tests/e2e/00057-destination-readiness.spec.ts`
- 00058B test: `Frontend/tests/e2e/00058-rate-limit-claim.spec.ts`
- Previous calendar issue: `docs/REPORTS/ISSUES/issue_calendar_modal_click_timeout.md` (marked RESOLVED but different issue)

---

**Note**: The existing `issue_calendar_modal_click_timeout.md` is marked RESOLVED but describes a "click timeout" issue (pointer-events problem). The current issue is "not enough enabled date buttons" which is a different root cause — fewer buttons available than needed for date range selection.
