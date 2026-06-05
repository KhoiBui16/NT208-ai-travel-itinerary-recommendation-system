# PR #85 Audit Note - 00060J-R6

**PR**: #85 - "fix: [#00060] fix local smoke ux and data blockers"  
**Branch**: `fix/00060-d-local-smoke-ux-data-fix`  
**Audit Date**: 2026-06-05  
**Current Head**: `da74392` (origin) / `445b0f6` (local R5, not pushed)

---

## Quick Summary for PR Reviewer

### Status: ⚠️ DO NOT MERGE YET

**Reason**: 19 confirmed issues remain across P0-P2 severity, including 6 critical P0 issues.

---

## What's Fixed (in PR #85 as of da74392)

1. ✅ Local smoke gate fixes (445b0f6, c1a56c9, 672ce31)
2. ✅ Image fallback behavior improvement
3. ⚠️ **NOT in PR #85**: R5 fixes (445b0f6) - destination image 404, AI timeout, budget warning

**Note**: R5 commit (445b0f6) is LOCAL ONLY and NOT included in PR #85. PR #85 ends at da74392.

---

## Critical Findings (P0) Blocking Merge

| ID | Issue | Impact | Location | Fix Phase |
|---|---|---|---|---|---|
| **F10** | Trip workspace save: "Lưu lên server thất bại, đã lưu tạm thời" | Users don't know why save failed (quota? auth? network?) | `useTripSync.ts:333` | R7C |
| **F11** | Trip limit 5/5 has no specific message | Generic error when quota exceeded | Quota enforcement exists | R7C |
| **F17** | AI generation slow (60s timeout) | Poor UX, no progress indicator | `CreateTrip.tsx` + `pipeline.py` | 00060L |
| **F8** | Budget warning for all budgets | **Fixed in R5 (not in PR)** | `BudgetSetup.tsx` | ✅ R5 |
| **F9** | AI timeout misleading message | **Fixed in R5 (not in PR)** | `llm.py:97-98` | ✅ R5 |

---

## High Priority Findings (P1) Blocking Good UX

| ID | Issue | Impact | Fix Phase |
|---|---|---|---|---|
| **F2** | Destination image 404 (relative paths) | **Partially fixed in R5 (not in PR)** | R7A |
| **F3** | All place images NULL in DB | No images for 618 places | 00060K |
| **F4** | City not found vs no places same message | Confusing UX | R7A |
| **F5** | Save place has no UX feedback | No toast on save/unsave | R7A |
| **F12** | Manual add place shows other cities | Can select wrong-city places | R7B |
| **F18** | Expense + button covered by chatbot | UI overlap, can't click | R7A |
| **F19** | Map UI missing / too sơ sài | No map integration | 00060M |

---

## Medium Priority Findings (P2)

| ID | Issue | Fix Phase |
|---|---|---|
| **F1** | Web title "Travel (Copy)" | R7A |
| **F6** | Premium click has no response | R7A |
| **F7** | Footer team info incomplete | R7A |
| **F13** | Daily itinerary lacks save button | R7C |
| **F14** | Trip history has no status controls | Future |
| **F15** | Delete flow inconvenient | Future |
| **F16** | Date picker modal scales poorly | R7B |
| **F20** | Đà Lạt partial data (10 places) | 00060K |

---

## Data Quality Assessment

### Good News ✅
- All 10 destinations have 56-73 places
- Places distributed across 5 categories (food, attraction, nature, entertainment, shopping)
- 22 hotels available
- Backend API healthy and responding
- Logging infrastructure solid

### Bad News ❌
- **All 618 places have `image = NULL`**
- **All 22 hotels have `image = NULL`**
- All destination image paths are relative (`/img/destinations/...`)
- No actual image files exist for relative paths
- Đà Lạt partial (10 places, food only)

---

## R5 Commit Status (Local Only)

**Commit**: `445b0f6` - "fix: [#00060] fix destination image 404, ai timeout message, and budget warning threshold"

**Status**: LOCAL ONLY, NOT PUSHED, NOT IN PR #85

**What R5 Fixes**:
1. ✅ Destination image 404 - skip relative paths, use fallback URLs
2. ✅ AI timeout message - generic "Chưa có lịch trình nào được lưu"
3. ✅ Budget warning threshold - increased from 10K to 1M VND

**Recommendation**: Push R5 to branch before next fix phase.

---

## Recommended Fix Sequence

1. **Push R5** (445b0f6) to branch
2. **R7A** - Quick visual/static fixes (F1, F4-F7, F18)
3. **R7C** - Critical save errors (F10, F11)
4. **R7B** - Manual trip fixes (F12, F16)
5. **R7D** - Test coverage hardening
6. **00060K** - ETL image crawl
7. **00060L** - Async generation
8. **00060M** - Goong map (future)

---

## Test Coverage Gaps

**Zero tests exist for**:
- Web title
- Destination image fallback
- City not found vs no places
- Save place toast feedback
- Premium button behavior
- Footer team info
- Manual add place city filter
- Trip save error specificity
- LiveBudgetBar overlap

**Recommendation**: Add at least 5 critical e2e tests before merge.

---

## Final Recommendation

### For PR #85:
❌ **DO NOT MERGE** - 6 P0 issues remain, 7 P1 issues block good UX

### Next Actions:
1. User reviews audit report (`00060j_r6_deep_end_user_audit.md`)
2. User approves fix group prioritization
3. Push R5 commit (445b0f6) to branch
4. Run fix prompt for R7A → R7C → R7B
5. Add critical e2e tests
6. Re-audit before merge

---

## Evidence

- Main audit: `docs/REPORTS/00060j_r6_deep_end_user_audit.md`
- DB diagnostics: 10 destinations, 618 places (all images NULL)
- Backend health: ✅ All services running
- API endpoints: ✅ `/api/v1/health`, `/api/v1/places/destinations`

---

**End of PR Note**
