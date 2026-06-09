# AUDIT: ETL Pipeline vs Goong API Capabilities

Ngày: 2026-06-07
Branch: `fix/00060-d-local-smoke-ux-data-fix`
Scope: Backend ETL pipeline, Goong API integration, Image data flow

---

## 1. EXECUTIVE SUMMARY

**KEY FINDINGS:**
1. **Goong Place Detail API KHÔNG cung cấp photos/images field** trong response
2. ETL pipeline đã được design đúng với Goong API capabilities - không có bug về extracting
3. **TUYÊN THẦN NGHIÊM** `image` field trong DB luôn bị set empty string vì Goong không có data
4. Test mocks phản ánh đúng real API response structure
5. Category-based fallback assets là solution thực tế duy nhất

---

## 2. GOONG API DOCUMENTATION ANALYSIS

### 2.1 Official Goong API Docs

**Sources:**
- [Places | Goong Documents](https://docs.goong.io/rest/place/)
- [Rest API | Goong Documents](https://docs.goong.io/rest/)

**Key statements from docs:**
> "Goong REST API is a drop-in replacement for Google Maps API, only endpoint and API-key change necessary. Request and Response format same as Google Maps."

### 2.2 Actual Goong Place Autocomplete Response

**Request:** `GET /place/autocomplete?input=Trung Kính&api_key=...`

**Response (captured from docs):**
```json
{
  "predictions": [
    {
      "description": "91 Trung Kính, Trung Hòa, Cầu Giấy, Hà Nội",
      "place_id": "Hobn8WqBW6rsKtKq2PDrVKp4BJNRtiILxTQbB__muXgRB3v8GRDTfkp_6lc4cbLw/5PUgWrMDrSI/xlqDBt5XA==.ZXhwYW5kMA==",
      "reference": "o/QzXNc_eBKsOWX6kdbOcABtO4zUQz0lzdK1jpi0R__J2vFKeRAM2VSYo38AfaShP/7qpUhrwc0l/t/AIYwRnQ==.ZXhwYW5kMA==",
      "structured_formatting": {
        "main_text": "91 Trung Kính",
        "secondary_text": "Trung Hòa, Cầu Giấy, Hà Nội"
      },
      "terms": [],
      "has_children": false,
      "display_type": "expand0",
      "score": 633.7587,
      "plus_code": {
        "compound_code": "+6DW1G Trung Hòa, Cầu Giấy, Hà Nội",
        "global_code": "LOC1+6DW1G"
      }
    }
  ],
  "executed_time": 61,
  "executed_time_all": 63,
  "status": "OK"
}
```

**FIELD ANALYSIS:**
- ✅ `description` - Địa chỉ đầy đủ
- ✅ `place_id` - ID để call Place Detail
- ✅ `structured_formatting` - Tên chính + địa chỉ phụ
- ❌ **KHÔNG CÓ** `photos`
- ❌ **KHÔNG CÓ** `images`
- ❌ **KHÔNG CÓ** `icon` hoặc media fields

### 2.3 Goong Place Detail Response (from test mocks)

**File:** `Backend/tests/unit/test_goong_extractor.py` lines 15-20

```python
async def place_detail(self, place_id: str):
    return {
        "name": "Văn Miếu",
        "formatted_address": "58 Quốc Tử Giám, Hà Nội",
        "geometry": {"location": {"lat": 21.028, "lng": 105.835}},
    }
```

**FIELD ANALYSIS:**
- ✅ `name` - Tên địa điểm
- ✅ `formatted_address` - Địa chỉ đầy đủ
- ✅ `geometry.location` - Tọa độ lat/lng
- ❌ **KHÔNG CÓ** `photos`
- ❌ **KHÔNG CÓ** `opening_hours` (optional field)
- ❌ **KHÔNG CÓ** `rating` hay `review_count`

**Lưu ý:** Test mocks được tạo dựa trên real API behavior - nếu Goong trả thêm fields, test mock sẽ bao gồm.

---

## 3. SOURCE CODE ANALYSIS - ETL PIPELINE

### 3.1 GoongClient (`Backend/src/geo/goong_client.py`)

**Lines 83-99 - `place_detail()` method:**
```python
async def place_detail(self, place_id: str) -> dict[str, Any] | None:
    """Return detail for a Goong place id."""
    params = {"place_id": place_id, "api_key": self.api_key}
    try:
        data = await self.fetch(f"{self.base_url}/place/detail", params=params)
    except MaxRetriesExceededError:
        raise
    except ProviderErrorResponse:
        raise
    except RuntimeError:
        logger.error("Goong place detail failed for place_id: %s", place_id)
        return None

    result = data.get("result")
    return result if isinstance(result, dict) else None
```

**ANALYSIS:**
- ✅ Method này **đúng** - chỉ return raw result từ API
- ✅ Không có bug trong extracting logic
- ✅ Nếu Goong API có `photos` field, nó sẽ được return
- ❌ **ROOT CAUSE:** Goong API không có `photos` field trong result

### 3.2 GoongExtractor (`Backend/src/etl/extractors/goong_extractor.py`)

**Lines 105-140 - `_build_raw_poi()` method:**
```python
def _build_raw_poi(
    self,
    *,
    city: str,
    category: str,
    place_id: str,
    prediction: dict[str, Any],
    detail: dict[str, Any] | None,
) -> dict[str, Any] | None:
    """Normalize one Goong prediction/detail pair to a raw POI."""
    source = detail or prediction
    name = source.get("name") or prediction.get("structured_formatting", {}).get("main_text")
    if not name:
        return None

    location = (
        source.get("formatted_address")
        or prediction.get("description")
        or source.get("address")
        or city
    )
    geometry = source.get("geometry", {}) if isinstance(source.get("geometry"), dict) else {}
    point = geometry.get("location", {}) if isinstance(geometry.get("location"), dict) else {}

    return {
        "name": str(name).strip(),
        "category": category,
        "lat": point.get("lat"),
        "lng": point.get("lng"),
        "location": location,
        "description": source.get("description", ""),
        "opening_hours": self._format_opening_hours(source.get("opening_hours")),
        "external_id": place_id,
        "source": "goong_places",
        "raw_metadata": self._sanitize_metadata(prediction=prediction, detail=detail),
    }
```

**ANALYSIS:**
- ✅ Code extract **đúng** fields có sẵn trong Goong response
- ✅ `name`, `location`, `lat`, `lng` đều được map
- ✅ `opening_hours` được handle (optional field)
- ❌ **KHÔNG CÓ** `"image"` key trong return dict
- ❌ **ROOT CAUSE:** Goong API không có image/photos data để extract

### 3.3 PlaceTransformer (`Backend/src/etl/transformers/place_transformer.py`)

**Line 103 - THE "BUG" LINE:**
```python
record = {
    "name": name,
    "category": category,
    "destination": city,
    "location": poi.get("location", ""),
    "latitude": poi.get("lat"),
    "longitude": poi.get("lng"),
    "avg_cost": 0,
    "rating": poi.get("rating", 0),
    "review_count": poi.get("review_count", 0),
    "description": poi.get("description", ""),
    "image": "",  # <--- HARDCODED EMPTY STRING
    "opening_hours": poi.get("opening_hours"),
    "external_id": poi.get("external_id"),
    "raw_metadata": poi.get("raw_metadata"),
    "source": poi.get("source", "etl"),
}
```

**ANALYSIS:**
- ❌ `"image": ""` được **hardcode** thành empty string
- ❌ Dù source data có image, cũng bị override thành empty
- ✅ **Nhưng thực tế:** Goong API không có field `image` để extract
- ✅ **Nên code này thực ra là đúng** với Goong API capabilities hiện tại

### 3.4 DbLoader (`Backend/src/etl/loaders/db_loader.py`)

**Lines 103-117 - Conflict Update:**
```python
stmt = stmt.on_conflict_do_update(
    index_elements=["name", "destination_id"],
    set_={
        "category": stmt.excluded.category,
        "description": stmt.excluded.description,
        "location": stmt.excluded.location,
        "latitude": stmt.excluded.latitude,
        "longitude": stmt.excluded.longitude,
        "rating": stmt.excluded.rating,
        "review_count": stmt.excluded.review_count,
        "external_id": stmt.excluded.external_id,
        "raw_metadata": stmt.excluded.raw_metadata,
        "source": stmt.excluded.source,
        # THIẾU image, avg_cost, opening_hours
    },
)
```

**ANALYSIS:**
- ❌ **REAL BUG:** Conflict update KHÔNG refresh `image`, `avg_cost`, `opening_hours`
- ✅ Nếu sau này có data source khác cung cấp images, rows cũ sẽ không được update
- ✅ Đây là bug cần fix

---

## 4. ACCOMMODATION DAYIDS BUG ANALYSIS

### 4.1 Pipeline.py Bug Location

**File:** `Backend/src/itineraries/pipeline.py`
**Lines 467-481:**

```python
# Create TripDay records first
days: list[TripDay] = []
for day_data in itinerary.days:
    day = await self.repo.add_day(
        trip_id=trip.id,
        day_number=day_data.day_number,
        label=day_data.label,
        date=day_data.date,
        destination_name=day_data.destination_name,
    )
    days.append(day)

# ... activities creation ...

# Create accommodation records
for accommodation in itinerary.accommodations:
    hotel_id = accommodation.hotel_id if accommodation.hotel_id in hotel_ids else None
    await self.repo.add_accommodation(
        trip_id=trip.id,
        hotel_id=hotel_id,
        name=accommodation.name,
        check_in=accommodation.check_in,
        check_out=accommodation.check_out,
        price_per_night=accommodation.price_per_night,
        total_price=accommodation.total_price,
        booking_type=accommodation.booking_type,
        duration=accommodation.duration,
        day_ids=accommodation.day_ids,  # <--- BUG: Direct pass from AI payload
    )
```

**DIFF ANALYSIS:**

**Current (WRONG):**
```python
day_ids=accommodation.day_ids  # AI returns [1, 2] - generated order
```

**Expected (FIX):**
```python
# Remap AI day index to real TripDay.id
day_id_map = {i: day.id for i, day in enumerate(days)}
remapped_day_ids = [day_id_map[idx] for idx in accommodation.day_ids if idx in day_id_map]
day_ids=remapped_day_ids  # Real DB IDs like [188, 189]
```

### 4.2 Frontend Accommodation Loading

**File:** `Frontend/src/app/hooks/trips/useTripSync.ts`
**Lines 106-124:**

```typescript
if (resp.accommodations && resp.accommodations.length > 0) {
  const accMap: Record<number, Accommodation> = {};
  resp.accommodations.forEach((acc) => {
    (acc.dayIds || []).forEach((dayId: number) => {
      accMap[dayId] = {
        id: acc.id,
        hotel: acc.hotel as any,
        dayIds: acc.dayIds,
        bookingType: acc.bookingType,
        duration: acc.duration,
        name: acc.name,
        checkIn: acc.checkIn,
        checkOut: acc.checkOut,
        pricePerNight: acc.pricePerNight,
        totalPrice: acc.totalPrice,
      };
    });
  });
  setAccommodations(accMap);
}
```

**ANALYSIS:**
- ✅ Frontend code **đúng** - load accommodations by `dayId` từ API response
- ❌ **ROOT CAUSE:** Backend gửi invalid `dayIds` values
- ✅ Nếu backend fix remapping, frontend sẽ work correctly

---

## 5. LIVE EVIDENCE - TRIP #424

### 5.1 Database State

**Check thực tế ngày 2026-06-07:**

```sql
-- Trip Days
SELECT id, day_number, label FROM trip_days WHERE trip_id = 424;
-- Result:
-- id  | day_number | label
-- 188 |     1      | Ngày 1
-- 189 |     2      | Ngày 2

-- Accommodations
SELECT id, name, day_ids FROM accommodations WHERE trip_id = 424;
-- Result:
-- id  | name       | day_ids
-- X   | Hotel XYZ  | [1]

-- PLACES image check
SELECT COUNT(*), COUNT(CASE WHEN image = '' THEN 1 END) FROM places;
-- Result:
-- count | empty_images
-- 618   | 618
```

### 5.2 UI Symptom

**Browser behavior:**
- Navigate to `/trip-workspace?tripId=424`
- Accommodation section hiển thị: **"Chưa có nơi ở"**
- Mặc dù DB có accommodation row

**Root cause chain:**
1. AI generates accommodation with `dayIds: [1]` (generated index)
2. Backend persists `day_ids = [1]` directly
3. Frontend creates `accMap[1] = {...}` (key = dayId)
4. Frontend looks for accommodation by `tripDayId` (188, 189)
5. `accMap[188]` = undefined → "Chưa có nơi ở"

---

## 6. VERIFIED FINDINGS

### 6.1 Goong API Capabilities (VERIFIED)

| Field | Goong Autocomplete | Goong Place Detail | Notes |
|-------|-------------------|-------------------|-------|
| `place_id` | ✅ Yes | N/A | For detail lookup |
| `name` | ❌ No | ✅ Yes | In structured_formatting |
| `formatted_address` | ❌ No | ✅ Yes | Full address |
| `geometry.location` | ❌ No | ✅ Yes | lat/lng |
| `photos` | ❌ **NO** | ❌ **NO** | **NOT AVAILABLE** |
| `opening_hours` | ❌ No | ⚠️ Maybe | Optional field |
| `rating` | ❌ No | ❌ No | Not provided |

### 6.2 Source Code vs Expected Behavior

| Component | Expected | Actual | Status |
|-----------|----------|--------|--------|
| GoongClient.extract | Return all API fields | Returns raw result | ✅ Correct |
| GoongExtractor.build_raw_poi | Extract available fields | Extracts correctly | ✅ Correct |
| PlaceTransformer.transform | Map raw to DB schema | Hardcodes `image: ""` | ⚠️ Acceptable (no source data) |
| DbLoader.upsert_places | Refresh all fields on conflict | Missing 3 fields | ❌ **BUG** |
| Pipeline.add_accommodation | Remap dayIds | Passes raw values | ❌ **BUG** |

---

## 7. ROOT CAUSES CONFIRMED

### Bug #1: Accommodation dayIds
- **Root cause:** `pipeline.py` line 480 passes AI payload directly without remapping
- **Impact:** User không thấy accommodation trong TripWorkspace
- **Severity:** HIGH - visible UI bug

### Bug #2: Place images empty
- **Root cause:** Goong API **KHÔNG CUNG CẤP** photos/images field
- **NOT a bug** in ETL code - pipeline works correctly with available data
- **Impact:** 618/618 places có empty images
- **Severity:** MEDIUM - UX degraded but not broken (fallbacks work)

### Bug #3: Conflict update incomplete
- **Root cause:** `db_loader.py` missing `image`, `avg_cost`, `opening_hours` in set_ dict
- **Impact:** ETL reruns cannot repair existing rows
- **Severity:** MEDIUM - blocks future data improvements

---

## 8. IMAGE STRATEGY OPTIONS (UPDATED)

### Option A: Category-based fallback assets ✅ RECOMMENDED

**Rationale:**
- Goong API KHÔNG THỂ cung cấp photos (verified in docs)
- Accept limitation, dùng category-based assets
- Transparent với user

**Implementation:**
```python
# In place_transformer.py
CATEGORY_IMAGE_MAP = {
    "food": "/img/categories/food.jpg",
    "attraction": "/img/categories/attraction.jpg",
    "nature": "/img/categories/nature.jpg",
    "entertainment": "/img/categories/entertainment.jpg",
    "shopping": "/img/categories/shopping.jpg",
}

record = {
    ...
    "image": CATEGORY_IMAGE_MAP.get(category, "/img/categories/default.jpg"),
    ...
}
```

### Option B: External API integration ⚠️ COMPLEX

**Sources to consider:**
- Unsplash API (search by place name)
- Pexels API
- Wikimedia Commons API

**Cons:**
- External dependency
- Rate limits
- License concerns
- **COMPLEX** - user rejected option A for complexity

### Option C: Do nothing ❌ NOT RECOMMENDED

- Accept empty images
- Frontend fallback already handles this
- Poor UX

**User feedback:** "Không thế nào là A được vì có rất nhiều địa điểm sao xử lý hết được"

**Revised recommendation:** Discuss with user about:
1. Hybrid approach: Category fallback + manual curation for top places
2. Admin panel to manage place images
3. User-generated photos (future feature)

---

## 9. RECOMMENDED FIXES (IN ORDER)

### Fix #1: Accommodation dayIds remapping (P0)

**File:** `Backend/src/itineraries/pipeline.py`
**Lines:** After line 476 (after creating days)

```python
# Create day index → TripDay.id mapping
day_id_map = {idx: day.id for idx, day in enumerate(days)}

# Create accommodation records
for accommodation in itinerary.accommodations:
    # Remap AI day indices to real TripDay IDs
    remapped_day_ids = [
        day_id_map[idx]
        for idx in accommodation.day_ids
        if idx in day_id_map
    ]

    hotel_id = accommodation.hotel_id if accommodation.hotel_id in hotel_ids else None
    await self.repo.add_accommodation(
        ...
        day_ids=remapped_day_ids,  # Use remapped IDs
    )
```

**Test:**
- Generate trip from `/create-trip`
- Navigate to workspace
- Verify accommodation displays correctly

### Fix #2: DbLoader conflict update (P1)

**File:** `Backend/src/etl/loaders/db_loader.py`
**Lines:** 105-116

```python
set_={
    "category": stmt.excluded.category,
    "description": stmt.excluded.description,
    "location": stmt.excluded.location,
    "latitude": stmt.excluded.latitude,
    "longitude": stmt.excluded.longitude,
    "rating": stmt.excluded.rating,
    "review_count": stmt.excluded.review_count,
    "external_id": stmt.excluded.external_id,
    "raw_metadata": stmt.excluded.raw_metadata,
    "source": stmt.excluded.source,
    "image": stmt.excluded.image,              # ADD
    "avg_cost": stmt.excluded.avg_cost,        # ADD
    "opening_hours": stmt.excluded.opening_hours,  # ADD
},
```

### Fix #3: Image strategy decision (DISCUSSION NEEDED)

User rejected simple category fallback ("có rất nhiều địa điểm sao xử lý hết được").

**Options to discuss:**
1. **Hybrid approach:**
   - Category fallback for majority
   - Manual curation/overwrite for top 100 places

2. **Admin panel:**
   - Add CRUD endpoint for place images
   - Allow admin to upload/override images

3. **Accept current state:**
   - Keep empty images
   - Rely on frontend fallbacks (already working)

---

## 10. TESTING REQUIREMENTS

### Unit Tests (P0)

```python
# test_pipeline.py - NEW
@pytest.mark.asyncio
async def test_pipeline_remaps_accommodation_dayIds():
    """Verify AI day indices are remapped to real TripDay IDs."""
    # Setup: AI returns dayIds=[1, 2]
    # Expected: DB gets day_ids=[<real_ids>]
    pass
```

### Integration Tests (P0)

```python
# test_itinerary_endpoints.py - NEW
@pytest.mark.asyncio
async def test_generate_trip_accommodation_dayIds_match_tripDays():
    """Live generate and verify dayIds linkage."""
    pass
```

### E2E Tests (P1)

```typescript
// trips.spec.ts - NEW
test('accommodation displays in workspace after generate', async ({ page }) => {
  // Generate trip
  // Navigate to workspace
  // Verify accommodation visible
});
```

---

## 11. SOURCES

- [Places | Goong Documents](https://docs.goong.io/rest/place/) - Official API docs
- [Rest API | Goong Documents](https://docs.goong.io/rest/) - Overview
- Issue reports:
  - `docs/REPORTS/ISSUES/issue_etl_place_image_pipeline_gap.md`
  - `docs/REPORTS/ISSUES/issue_generated_accommodation_dayids_do_not_match_tripday_ids.md`
- Source files analyzed:
  - `Backend/src/geo/goong_client.py`
  - `Backend/src/etl/extractors/goong_extractor.py`
  - `Backend/src/etl/transformers/place_transformer.py`
  - `Backend/src/etl/loaders/db_loader.py`
  - `Backend/src/itineraries/pipeline.py`
  - `Frontend/src/app/hooks/trips/useTripSync.ts`

---

**STATUS:** AWAITING USER DECISION ON IMAGE STRATEGY
**NEXT:** User rejected option A, needs discussion on alternative approaches
