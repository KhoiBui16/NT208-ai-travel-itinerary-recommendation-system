# DATA FLOW AUDIT SUMMARY - CRITICAL ISSUES

**Date:** 2026-06-09  
**Branch:** `main`  
**Scope:** Complete data flow trace for 3 critical journeys

---

## TÓM TẮT TRONG 30 GIÂY

### Vấn đề chính
- **Data corruption trong Edit & Save flow** → User expenses lost
- **Silent failures trong FE operations** → User không biết lỗi
- **Empty place images trong DB** → UX tệ, fallback irrelevant

### Impact
- **CRITICAL:** BUG-BE-002 (extra_expenses not synced) → User expenses lost
- **HIGH:** BUG-FE-007 (empty catch blocks) → Silent data loss
- **HIGH:** DATA-01 (empty images) → 618 places affected

### Solution khuyến nghị
**Priority 1 (MUST FIX immediately):**
1. Fix BUG-BE-002: Sync extra_expenses (2 hours)
2. Fix BUG-FE-007: Add error toasts (3 hours)
3. Fix DATA-01: Run ETL for images (4 hours)

**Total: ~9 hours (1-2 days)**

---

## CRITICAL BUGS (Fix Immediately)

### 1. BUG-BE-002: extra_expenses Not Synced
- **File:** `Backend/src/itineraries/service.py:554-613`
- **Impact:** HIGH - User expenses lost during save
- **Root cause:** `_sync_activities()` không sync `extra_expenses`
- **Fix:** Add sync logic cho expense arrays
```python
if act_data.extra_expenses is not None:
    # Delete existing
    for existing_exp in activity.extra_expenses:
        await self.session.delete(existing_exp)
    # Create new
    for exp_data in act_data.extra_expenses:
        await self.repo.add_extra_expense(activity.id, exp_data)
```

### 2. BUG-FE-007: Silent Failures in Activity Operations
- **File:** `Frontend/src/app/hooks/trips/useActivityManager.ts`
- **Lines:** 63, 145, 197 (empty `.catch()` blocks)
- **Impact:** HIGH - Data loss without user notification
- **Root cause:** Empty `.catch()` → silent failure
- **Fix:** Add error toasts
```typescript
.catch((err) => {
  console.error("Operation failed:", err);
  toast.error("Không thể lưu thay đổi. Vui lòng thử lại.");
  // revert logic
});
```

### 3. DATA-01: All Places Have Empty Images
- **File:** Database `places` table
- **Impact:** CRITICAL - Poor UX, fallback images irrelevant
- **Root cause:** ETL pipeline không populate `image` field
- **Fix:** Run ETL to populate images from Goong API

---

## HIGH PRIORITY BUGS

### 4. BUG-BE-001: traveler_info Not Updated
- **File:** `Backend/src/itineraries/service.py:174-178`
- **Impact:** HIGH - Budget calculation wrong
- **Root cause:** `update()` không sync `traveler_info`
- **Fix:**
```python
if data.traveler_info is not None:
    trip.adults_count = data.traveler_info.adults
    trip.children_count = data.traveler_info.children
```

### 5. Activity ID Random Mapping
- **File:** `Frontend/src/app/hooks/trips/useTripSync.ts:75`
- **Impact:** MEDIUM - Sync failures
- **Root cause:** `a.id ?? Date.now() + random` → random ID
- **Fix:** Use `undefined` instead

### 6. totalCost Validation Missing
- **File:** `Backend/src/itineraries/service.py:668-699`
- **Impact:** MEDIUM - Wrong budget display
- **Root cause:** `totalCost` không validated vs budget
- **Fix:** Add validation `totalCost <= budget * 1.2`

---

## DATA TRANSFORMATION ISSUES

| Field | Issue | Impact | Fix |
|-------|-------|--------|-----|
| `taxiCost` | Field name mismatch (FE → BE) | Data not saved | Fix mapping |
| `image` | Always empty in DB (618 places) | Always fallback | Run ETL |
| `totalCost` | Doesn't include extra_expenses | Wrong calculation | Update calc |
| `travelerInfo.total` | Not updated on change | Display inconsistency | Add sync |

---

## BOTTLENECKS

### Performance
1. **AI Generation:** 10-30s per LLM call → 3 retries = 30-90s worst case
2. **Trip Sync:** `get_with_full_data` eager loads all relations → slow for large trips
3. **Places Search:** Cache not invalidated → stale data

### Reliability
1. **Redis dependency:** Rate limiting fails silent if Redis down
2. **LLM reliability:** 3 retries → 503 error not parsed by FE
3. **Transaction integrity:** `flush()` without `commit()` → rollback risk

---

## DATA FLOW HEALTH SCORE

| Journey | Health | Key Issues |
|---------|--------|------------|
| **AI Generate** | 70% | Validation weak, error parsing missing |
| **Edit & Save** | 55% | Sync bugs (extra_expenses), silent failures |
| **Places & Search** | 70% | Data quality poor (empty images), cache stale |

**Overall:** 65% - Needs immediate attention

---

## QUICK FIX GUIDE

### Week 1: Critical Fixes (Priority 1)

**Day 1-2: Fix BUG-BE-002 (extra_expenses)**
```bash
# File: Backend/src/itineraries/service.py
# Location: _sync_activities() method (line 554-613)
# Add expense sync logic
```

**Day 3-4: Fix BUG-FE-007 (error toasts)**
```bash
# File: Frontend/src/app/hooks/trips/useActivityManager.ts
# Locations: Lines 63, 145, 197
# Replace all empty .catch() with error handling
```

**Day 5-6: Fix DATA-01 (place images)**
```bash
# Run ETL pipeline
cd Backend/etl
python run_goong_etl.py --populate-images
```

### Week 2: High Priority Fixes (Priority 2)

**Day 7-8: Fix BUG-BE-001 (traveler_info)**
```bash
# File: Backend/src/itineraries/service.py
# Location: update() method (line 174-178)
# Add traveler_info sync
```

**Day 9-10: Fix activity.id mapping + totalCost**
```bash
# File: Frontend/src/app/hooks/trips/useTripSync.ts
# File: Backend/src/itineraries/service.py
# Fix ID mapping + add validation
```

---

## ESTIMATED EFFORT

- **Week 1:** Critical bugs (3 issues, ~40 hours)
- **Week 2:** High priority (3 issues, ~20 hours)
- **Week 3:** Performance & reliability (3 issues, ~16 hours)
- **Week 4:** Data quality & validation (3 issues, ~16 hours)

**Total:** 4 weeks (1 developer full-time)

---

## TESTING CHECKLIST

Before deploying fixes:
- [ ] Test extra_expenses sync với manual expenses
- [ ] Test error toasts appear on network failure
- [ ] Test place images load from ETL
- [ ] Test traveler_info updates budget
- [ ] Test activity.id sync sau BE assignment
- [ ] Test totalCost validation exceeds budget
- [ ] Test Redis failure graceful degradation
- [ ] Test LLM retry loop với 503 errors
- [ ] Test transaction commit/rollback
- [ ] Test places cache invalidation

---

## FILES TO MODIFY

### Backend (6 files)
- `Backend/src/itineraries/service.py` (3 fixes)
- `Backend/src/itineraries/pipeline.py` (1 fix - already done)
- `Backend/src/itineraries/repository.py` (1 fix)
- `Backend/src/places/service.py` (1 fix)
- `Backend/etl/run_goong_etl.py` (run ETL for images)

### Frontend (4 files)
- `Frontend/src/app/hooks/trips/useActivityManager.ts` (3 fixes)
- `Frontend/src/app/hooks/trips/useTripSync.ts` (2 fixes)
- `Frontend/src/app/hooks/trips/usePlacesManager.ts` (1 fix)
- `Frontend/src/app/pages/CreateTrip.tsx` (1 fix)

---

## RISK ASSESSMENT

### CRITICAL Risk
- **BUG-BE-002:** Impact HIGH, Likelihood HIGH → Fix immediately
- **BUG-FE-007:** Impact HIGH, Likelihood HIGH → Fix immediately
- **DATA-01:** Impact HIGH, Likelihood HIGH → Fix immediately

### HIGH Risk
- **BUG-BE-001:** Impact MEDIUM, Likelihood MEDIUM → Fix this week
- **Activity ID mapping:** Impact MEDIUM, Likelihood LOW → Fix this week

### MEDIUM Risk
- **totalCost validation:** Impact MEDIUM, Likelihood LOW → Fix next week
- **Transaction integrity:** Impact MEDIUM, Likelihood LOW → Fix next week

---

## SUCCESS CRITERIA

### Required (Week 1)
- [ ] BUG-BE-002 fixed và tested
- [ ] BUG-FE-007 fixed và tested
- [ ] DATA-01 fixed (ETL completed)

### Recommended (Week 2)
- [ ] BUG-BE-001 fixed
- [ ] Activity ID mapping fixed
- [ ] totalCost validation added

### Optional (Week 3+)
- [ ] Performance improvements
- [ ] Cache invalidation
- [ ] Transaction commits

---

## CONCLUSION

**Current Data Flow Health:** 65% (NEEDS ATTENTION)

**Critical Issues:** 3 MUST FIX immediately
**High Priority Issues:** 3 SHOULD FIX this week
**Total Issues Found:** 23 (3 critical, 4 high, 8 medium, 8 low)

**Recommendation:** Focus on Priority 1 (BUG-BE-002, BUG-FE-007, DATA-01) immediately, defer Priority 2+ to Week 2+.

---

**Full Report:** `docs/REPORTS/00062_complete_data_flow_audit.md`  
**Generated:** 2026-06-09  
**Status:** Ready for implementation
