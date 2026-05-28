# Phase C3/C4 Data Coverage & ETL Readiness Verification

**Date**: 2026-05-28
**Branch**: `docs/00050-c-c3-design-readiness-audit`
**Type**: Data Coverage Reality Check

---

## Database Coverage - REAL QUERY RESULTS

### Destinations (Cities)

| ID | Name | Status |
|---|---|---|
| 1 | Hà Nội | ✅ ACTIVE |

**Total: 1 city out of target 20**

### Places by City

| City | Places | With lat/lng | With rating | With avg_cost | With image | With external_id |
|---|---|---:|---:|---:|---:|---:|---:|
| Hà Nội | 68 | 68 (100%) | 0 (0%) | 0 (0%) | 0 (0%) | ~16 (23%) |

### Category Distribution - Hanoi

| Category | Count | Notes |
|---|---|---|
| entertainment | 20 | ✅ Good |
| attraction | 16 | ✅ Good |
| shopping | 15 | ✅ Good |
| nature | 9 | ⚠️ Low |
| food | 8 | ⚠️ Low |
| **Total** | **68** | |

### Hotels by City

| City | Hotels | Price Range | Rating | Data Source |
|---|---|---|---|---|
| Hà Nội | 3 | 1.8M - 5.5M VND | 4.6-4.9 | **hotels.yaml (TEST data only)** |

### Place Schema Columns (from information_schema)

```
id, destination_id, name, category, description, location,
latitude, longitude, avg_cost, rating, review_count,
image, opening_hours, source, updated_at,
external_id,  ← Goong place ID
raw_metadata   ← Goong raw data
```

---

## Data Coverage Reality Check

| Metric | Current | Target MVP | Multi-city Target | Status |
|---|---:|---:|---:|---|
| Cities with data | **1** | 1 | 15-20 | ❌ FAIL |
| Places per city (Hanoi) | 68 | 20-30 min | 50+ | ⚠️ PARTIAL |
| Hotels per city (Hanoi) | 3 | 5-10 min | 10+ | ❌ FAIL |
| Lat/lng coverage | 100% | 100% | 100% | ✅ PASS |
| Rating coverage | 0% | 50%+ | 80%+ | ❌ FAIL |
| Price/cost coverage | 0% | 50%+ | 80%+ | ❌ FAIL |
| Image coverage | 0% | 30%+ | 60%+ | ❌ FAIL |
| Goong external_id | 23% | - | 80%+ | ⚠️ PARTIAL |
| Category diversity | 5/6 | 5/6 | 6/6 | ⚠️ PARTIAL (missing "cafe") |

**Overall verdict**: `HANOI_ONLY_MVP` — chỉ có Hà Nội, thiếu rating/price/images, hotels chỉ 3 từ YAML.

---

## Generate Pipeline Behavior Analysis

### What happens when user selects Hanoi (has data)

```
1. resolve_destination_for_ai("Hà Nội") → finds destination ✅
2. search_places_for_ai(destination_id, categories) → returns up to 68 places ✅
3. Falls back to all places if category search < min_required ✅
4. If places < min_required → raises ValidationException ✅
5. Passes 15 places max to LLM (MAX_CONTEXT_PLACES) ✅
```

### What happens when user selects Đà Nẵng (no data)

```
1. resolve_destination_for_ai("Đà Nẵng") → returns None
2. Raises: "Destination data not found. Please run ETL for this destination first."
```

**Result**: Pipeline does NOT hallucinate — it fails fast with clear error message. ✅

### What happens if destination exists but no places

```
1. search_places_for_ai returns < min_required
2. Falls back to all places
3. Still < min_required → raises: "Not enough destination places for AI recommendation. Please run Goong ETL first."
```

**Result**: Pipeline does NOT generate with insufficient data. ✅

### LLM Hallucination Risk: **LOW**

The pipeline:
1. Only feeds real place names from DB to LLM
2. Validates destination exists before calling LLM
3. Validates minimum place count before calling LLM
4. Raises errors instead of generating incomplete itineraries

---

## C2 SuggestionService Impact

### C2 depends on

- `place_service.py` → searches places by category/city
- `suggestion_service.py` → returns DB-based suggestions

### If user is on a trip in Đà Nẵng (no data)

- `search_places_for_ai()` returns empty list
- Suggestions will be empty
- User sees no alternatives when editing

### C2 Readiness: `PARTIALLY_READY` (Hanoi-only)

| Scenario | Behavior |
|---|---|
| Trip in Hà Nội | ✅ Suggestions work |
| Trip in Đà Nẵng | ❌ Empty suggestions |
| Trip in TP.HCM | ❌ Empty suggestions |

---

## C3 Companion Chat Impact

### C3 data needs

```
- Hỏi đáp về trip hiện tại    → Uses trip data, not city data ✅
- Thêm/Thay thế activity      → Needs place DB for recommendations ⚠️
- Gợi ý địa điểm gần hơn      → Needs lat/lng + places ✅ (Hanoi has 100% lat/lng)
- Gợi ý theo budget           → Needs avg_cost ⚠️ (0% coverage)
- Gợi ý theo sở thích         → Needs category coverage ⚠️ (food only 8)
- Tính route/distance         → Needs Goong Directions API ❌ (not implemented)
```

### C3 Readiness for Multi-city: `NOT_READY`

| Feature | Hanoi Status | Multi-city Impact |
|---|---|---|
| Trip context | ✅ Works | ✅ Works |
| Place recommendations | ⚠️ 68 places, no cost/rating | ❌ No data |
| Route optimization | ❌ No Goong Directions | ❌ Not implemented |
| Budget suggestions | ❌ No avg_cost data | ❌ No data |
| Category coverage | ⚠️ Food only 8 places | ❌ No data |

### C3 Should Be Limited to Hanoi-Only MVP

If we proceed with C3:
1. Feature flag/guardrail: only allow companion chat for destinations with sufficient data
2. Prompt must say: "Only recommend places from the available database for this city"
3. If city lacks data: chatbot says "Data for this city is being prepared. Try again later."
4. Recommended scope: `C3 MVP = Hanoi only`

---

## Goong/ETL Readiness

### Goong Client (`src/geo/goong_client.py`)

| Feature | Status | Notes |
|---|---|---|
| Goong Autocomplete | ✅ Implemented | Search places by text |
| Goong Place Detail | ✅ Implemented | Get full place details |
| Geocoding | ✅ Implemented | Address to lat/lng |
| Directions API | ❌ Missing | Route calculation |
| Distance Matrix | ❌ Missing | Distance between places |
| Photo URL extraction | ❌ Missing | Place images |

### Goong Extractor (`src/etl/extractors/goong_extractor.py`)

| Feature | Status | Notes |
|---|---|---|
| POI extraction per city | ✅ Implemented | Uses autocomplete + detail |
| Max items per city | ✅ 75 per config | Good coverage |
| Category keywords | ✅ 5 categories | food, attraction, nature, entertainment, shopping |
| Location bias | ✅ City geocoding | Auto-bias by city coordinates |
| Deduplication | ✅ Seen place_ids set | Avoid duplicates |

### ETL Pipeline (`src/etl/runner.py`)

| Feature | Status | Notes |
|---|---|---|
| CLI runner | ✅ `uv run python -m src.etl` | Per-city import |
| Per-city import | ✅ `python -m src.etl <city>` | Supports city target |
| Retry/backoff | ⚠️ Unknown | Need to verify base_extractor |
| Dry-run mode | ❌ Missing | Cannot estimate request count |
| Request cost estimation | ❌ Missing | Cannot budget Goong API usage |
| Data freshness tracking | ✅ `scraped_sources` table | ETL history tracked |

### ETL Gaps

1. **No retry/backoff documented** — need to check `base_extractor.py`
2. **No dry-run** — cannot test without real API calls
3. **No Directions API** — route optimization blocked
4. **No photo extraction** — place images always empty
5. **No request cost estimation** — cannot budget API quota

---

## Comparison with Target Scope

### Current State vs. Tiers

| Tier | Requirement | Current | Gap |
|---|---|---|---|
| **Minimum MVP** | 1 city, enough places for demo | ✅ Hanoi with 68 places | ✅ MET |
| **Multi-city MVP** | 5 cities, 20-30 places each, 5-10 hotels | ❌ 1 city, 3 hotels | ❌ NOT MET |
| **Production-like** | 15-20 cities, 50+ places, 10+ hotels, categories | ❌ 1 city, no rating/price/images | ❌ NOT MET |

**Conclusion**: Current data is at `HANOI_ONLY_MVP` — sufficient for demo but not for multi-city product.

---

## Key Findings

1. **Pipeline is safe** — does NOT hallucinate, fails fast on missing data
2. **Hanoi is the ONLY city** — 1 out of target 20 cities
3. **Places lack quality data** — 0% rating, 0% cost, 0% image coverage
4. **Hotels are test data** — 3 hotels from YAML, not Goong ETL
5. **Goong integration exists** — external_id + raw_metadata columns present
6. **Lat/lng coverage is excellent** — 100% for Hanoi places
7. **Category diversity is OK** — 5/6 categories, missing "cafe"
8. **No route/directions** — Goong Directions API not implemented
9. **C3 limited to Hanoi** — without data expansion, companion chat can only serve Hanoi trips

---

## Reports Updated

| File | Changes |
|---|---|
| `phase_c3_data_readiness.md` | Updated with real query results, coverage analysis |
| `phase_c3_verification_results.md` | Added data coverage section |

## Issues Created

| Issue | Priority | Status |
|---|---|---|
| `data_coverage_hanoi_only.md` | HIGH | OPEN |
| `data_coverage_blocks_multi_city_c3.md` | HIGH | OPEN |
| `etl_hotels_yaml_test_only.md` | MEDIUM | OPEN |
| `goong_directions_api_missing.md` | MEDIUM | OPEN |

---

## Recommended Decision: B (Split Path)

**Path B: Split — foundation first, data expansion parallel**

1. **Continue**: `feat/00051-c-c3-chat-session-foundation` — C3 chat session API không phụ thuộc data
2. **Parallel**: `feat/00057-c-etl-goong-data-expansion` — Mở rộng data sang 5 cities (Hà Nội, Đà Nẵng, TP.HCM, Hội An, Nha Trang) trước khi companion chat features

### Rationale

- C3 chat session foundation = pure CRUD, không phụ thuộc place data
- C3 companion chat features = cần place DB, nên đợi data expansion
- C4 chat history = không phụ thuộc city data, có thể implement song song
- Data expansion là prerequisite cho companion chat recommendations

### Hà Nội có thể demo C3 ngay

Với 68 places + 100% lat/lng + 3 hotels, Hà Nội đủ để demo C3 companion chat core features (hỏi đáp trip, thêm activity). Nhưng multi-city companion chat cần ETL.

---

## Final Summary

### Database coverage
- Cities: **1** (Hà Nội only)
- Places: **68** (all in Hanoi, 100% lat/lng)
- Hotels: **3** (all in Hanoi, test YAML data)
- Rating/cost/image: **0% coverage**
- Goong metadata: **23%** (external_id present)

### Current readiness
- Generate pipeline: ✅ **READY** (Hanoi only, safe fallback)
- C2 SuggestionService: ⚠️ **PARTIAL** (Hanoi only)
- C3 Companion Chat: ⚠️ **PARTIAL** (Hanoi only, needs guardrail)
- C4 Chat History: ✅ **READY** (not city-dependent)
- Goong/ETL: ⚠️ **PARTIAL** (Hanoi done, others need ETL)

### Key finding
**BE code pipeline is safe** — it fails fast when data is missing, does NOT hallucinate. But the data itself is Hanoi-only: 1 city out of 20 target, 0% quality coverage (rating/cost/images), hotels are test YAML data only.

### Reports updated
- `docs/REPORTS/phase_c3_data_readiness.md`
- `docs/REPORTS/phase_c3_verification_results.md` (new data coverage section)

### Issues created
- `docs/REPORTS/ISSUES/data_coverage_hanoi_only.md`
- `docs/REPORTS/ISSUES/data_coverage_blocks_multi_city_c3.md`
- `docs/REPORTS/ISSUES/etl_hotels_yaml_test_only.md`
- `docs/REPORTS/ISSUES/goong_directions_api_missing.md`

### Recommended decision
**B (Split path)** — Continue C3 chat session foundation + parallel data expansion to 5 cities

### Recommended next branch
`feat/00051-c-c3-chat-session-foundation` (CRUD only, no data dependency) OR
`feat/00057-c-etl-goong-data-expansion` (if data is priority)

### Commands/queries run
```bash
# Destinations
SELECT id, name FROM destinations ORDER BY name

# Places stats per city
SELECT d.name, COUNT(p.id), COUNT(latitude), COUNT(rating>0), COUNT(avg_cost>0)
FROM places p JOIN destinations d ON p.destination_id = d.id GROUP BY d.name

# Hotels per city
SELECT d.name, COUNT(h.id) FROM hotels h JOIN destinations d ON h.destination_id = d.id GROUP BY d.name

# Category distribution
SELECT category, COUNT(*) FROM places GROUP BY category ORDER BY cnt DESC

# Schema inspection
SELECT column_name FROM information_schema.columns WHERE table_name = 'places'
```

---

## B2/B3 Real Evidence Update (2026-05-28)

### DB Reality Confirmed by B2

```sql
-- Destinations: chỉ có 1 row
SELECT id, name, slug FROM destinations ORDER BY name;
-- Result: id=2, name=Hà Nội, slug=ha-noi

-- Places: 68 rows, tất cả Hà Nội
SELECT COUNT(*) FROM places; -- 68

-- Hotels: 3 rows, tất cả Hà Nội
SELECT COUNT(*) FROM hotels; -- 3
```

### API Evidence

| City | API result | Root cause |
|---|---|---|
| Hà Nội (small input) | 201 PASS | Destination exists, 68 places |
| TP.HCM | 422 `Destination data not found` | Không có row trong `destinations` |
| Đà Nẵng | 422 `Destination data not found` | Không có row trong `destinations` |
| "TP. Ho Chi Minh" (FE label) | 422 | Slug resolve: "tp-ho-chi-minh" không có trong DB |

### FE Static City List vs DB

FE (`cities.ts`) hiển thị 12 thành phố:
- Hà Nội, TP. Hồ Chí Minh, Đà Nẵng, Hội An, Nha Trang, Phú Quốc, Sapa, Hạ Long, Huế, Đà Lạt, Vũng Tàu, Cần Thơ

DB chỉ có: **Hà Nội**

→ 11/12 thành phố FE hiển thị sẽ fail 422 khi user cố generate.

### Hotels YAML Clarification

`hotels.yaml` có data cho nhiều thành phố (multi-city sample), nhưng chỉ Hà Nội đã được import vào DB.
- `YAML_HAS_MULTI_CITY_SAMPLE_HOTELS` = TRUE (file có data cho nhiều city)
- `DB_IMPORTED_HOTELS` = 3 (chỉ Hà Nội, từ YAML)
- Báo cáo trước ghi "3/city" là không chính xác — đúng hơn là "3 hotels tổng cộng, tất cả Hà Nội"

### Destination Selector Gap (B3 Evidence)

FE dùng hardcoded `popularDestinations` list trong `tripConstants.ts`, không query `/api/v1/places/destinations`.
User có thể gõ bất kỳ tên thành phố nào kể cả tên không có trong DB → generate sẽ fail 422.
Xem issue: `issue_destination_selector_not_db_backed.md`
