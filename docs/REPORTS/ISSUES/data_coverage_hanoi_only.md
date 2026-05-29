# Issue: Data Coverage is Currently Hanoi-Only

**Date**: 2026-05-28
**Branch**: `docs/00050-c-c3-design-readiness-audit`
**Priority**: HIGH
**Status**: OPEN
**Related**: `docs/REPORTS/phase_c3_data_coverage_verification.md`

---

## Evidence

### Query Results

```
DESTINATIONS:
Total: 1 city

PLACES (per city):
Hà Nội: 68 places, 68 with lat/lng (100%), 0 with rating (0%), 0 with avg_cost (0%), 0 with image (0%)

HOTELS (per city):
Hà Nội: 3 hotels (from hotels.yaml — TEST DATA only)

CATEGORY DISTRIBUTION (Hà Nội):
- entertainment: 20
- attraction: 16
- shopping: 15
- nature: 9
- food: 8
Total: 68
```

### Current Cities

| City | Places | Hotels | Has ETL? |
|---|---|---|---|
| Hà Nội | 68 | 3 | ✅ Yes |
| Đà Nẵng | 0 | 0 | ❌ No ETL |
| TP. Hồ Chí Minh | 0 | 0 | ❌ No ETL |
| Other 17 cities | 0 | 0 | ❌ No ETL |

---

## Impact

### Generate Pipeline Multi-City Quality

| Scenario | Behavior |
|---|---|
| User selects Hà Nội | ✅ Works — 68 places, good lat/lng |
| User selects Đà Nẵng | ❌ Fails fast — "Please run ETL for this destination first" |
| User selects TP.HCM | ❌ Fails fast — same error |
| LLM Hallucination Risk | **LOW** — pipeline validates data exists before calling LLM |

### C2 Suggestions

| Scenario | Behavior |
|---|---|
| Activity in Hà Nội | ✅ Suggests from 68 places |
| Activity in Đà Nẵng | ❌ Empty — no place data |
| Activity in TP.HCM | ❌ Empty — no place data |

### C3 Companion Chat

| Feature | Hanoi Status | Multi-city Impact |
|---|---|---|
| Trip context Q&A | ✅ Works | ✅ Works |
| Place recommendations | ⚠️ 68 places | ❌ No data |
| Route optimization | ❌ No Directions API | ❌ Not implemented |
| Budget suggestions | ❌ No avg_cost | ❌ No data |
| Category coverage | ⚠️ Food only 8 places | ❌ No data |

---

## Expected vs Actual

### Expected (Multi-City MVP Target)

| Metric | Target |
|---|---|
| Cities with data | 5-15 |
| Places per city | 20-50 |
| Hotels per city | 5-10 |
| Rating coverage | 50%+ |
| Price/cost coverage | 50%+ |

### Actual

| Metric | Current | Gap |
|---|---:|---:|
| Cities with data | 1 | ❌ Need 4-14 more |
| Places per city | 68 (Hanoi) / 0 (others) | ❌ Need ETL |
| Hotels per city | 3 (Hanoi) / 0 (others) | ❌ Need ETL + real data |
| Rating coverage | 0% | ❌ Need Goong detail extraction |
| Price/cost coverage | 0% | ❌ Need Goong detail extraction |

---

## Suggested Fix

### Phase 1: ETL Data Expansion (Parallel with C3/C4)

1. **Target cities for MVP**: Hà Nội (done), Đà Nẵng, TP.HCM, Hội An, Nha Trang
2. **Places target**: 30-50 per city
3. **Hotels target**: 10-15 per city (real data, not YAML)
4. **Data quality**: Extract rating, cost, images from Goong Place Detail

### Phase 2: Multi-City C3 (After ETL)

1. Feature flag companion chat per destination
2. Only enable C3 companion features when destination has sufficient data
3. Guardrail: if city lacks data, show message instead of empty results

---

## Recommended Branch

```
feat/00052-c-etl-goong-data-expansion
```

This branch should:
1. Add Goong Place Detail extraction for rating, cost, photos
2. ETL 5 cities: Hà Nội, Đà Nẵng, TP.HCM, Hội An, Nha Trang
3. Add real hotel data (not YAML)
4. Add data freshness tracking

---

## Notes

- Hotels currently are test YAML data — **NOT suitable for production**
- Pipeline is SAFE — does NOT hallucinate, fails fast on missing data
- No action required in this audit branch — data expansion is a separate effort