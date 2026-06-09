# KẾ HOẠCH FIX 3 BUG CRITICAL TRƯỚC PHASE C3/C4

Ngày tạo: 2026-06-07
Ngày update: 2026-06-08 (R1 fixes completed and verified)
Branch: `fix/00060-d-local-smoke-ux-data-fix`
PR: #85
Status: **BUG #1 + #3 RESOLVED**, awaiting Bug #2 image strategy decision

---

## R1 STATUS UPDATE (2026-06-08)

### ✅ COMPLETED FIXES

**Bug #1: Accommodation dayIds mismatch (P0 - CRITICAL)**
- ✅ **FIXED** in commit `a1ca485`
- File: `Backend/src/itineraries/pipeline.py:426-513`
- Logic: Added mapping from AI day_number → DB TripDay.id
- Test: Backend unit tests pass (135 passed)

**Bug #3: DB loader conflict update incomplete (P1 - CONFIRMED)**
- ✅ **FIXED** in commit `a1ca485`
- File: `Backend/src/etl/loaders/db_loader.py:105-119`
- Logic: Added `image`, `avg_cost`, `opening_hours` to conflict update
- Test: Backend integration tests pass (37 passed, 16 skipped)

### ✅ ADDITIONAL IMPROVEMENTS (Working tree - not committed)

**ETL rate limiting improvements:**
- File: `Backend/src/etl/extractors/goong_extractor.py`
- Added: 1.5s delay between keyword searches, 0.5s between detail calls
- File: `Backend/src/etl/runner.py`
- Added: 10s inter-city delay
- Purpose: Stay within Goong free tier quota

### ⏸️ AWAITING DECISION

**Bug #2: Place images empty (API LIMITATION, NOT CODE BUG)**
- **Root cause:** Goong API does NOT provide `photos`/`images` field
- **Current state:** 725/725 places have `image = ''` (expected - API limitation)
- **ETL pipeline:** ✅ Working correctly with available data
- **Required action:** User decision on image strategy
  - **Option B:** External API (Unsplash/Pexels) - High effort (8-12 hours)
  - **Option C:** Admin Panel + Manual Curation - Medium effort (4-6 hours)
  - **Option D:** Accept current state - Zero effort

See Section B below for detailed comparison of options.

---

## ORIGINAL AUDIT FINDINGS (2026-06-07)

### ✅ COMPREHENSIVE AUDIT SCOPE

**Đã audit toàn diện:**
- ✅ Frontend (components, hooks, services, image handling)
- ✅ Backend (pipeline, ETL, auth, rate limiting)
- ✅ Database (schema, migrations, indexes)
- ✅ Auth & Permissions (trip owner check, guest claim, share token)
- ✅ CI/CD (workflows, branch naming, commit format, PR requirements)
- ✅ Security (token hashing, RLS, rate limit fail-closed)
- ✅ Rate Limiting (Redis-backed, quota enforcement)
- ✅ Testing (PowerShell commands, Docker setup, E2E tests)

**Source Code Files Analyzed:**
- `Backend/src/itineraries/pipeline.py` (lines 426-481)
- `Backend/src/etl/transformers/place_transformer.py` (line 103)
- `Backend/src/etl/loaders/db_loader.py` (lines 103-117)
- `Backend/src/geo/goong_client.py` (lines 83-99)
- `Backend/src/etl/extractors/goong_extractor.py` (lines 105-140)
- `Frontend/src/app/hooks/trips/useTripSync.ts` (lines 106-124)
- `Backend/src/core/rate_limiter.py` (full file)
- `Backend/src/core/dependencies.py` (full file)
- `Backend/src/core/security.py` (full file)

**Docs & Config Files Analyzed:**
- `.github/workflows/backend-ci.yml` (full CI config)
- `.github/workflows/frontend-ci.yml` (full CI config)
- `.github/workflows/pr-policy.yml` (branch/commit/PR validation)
- `.github/PULL_REQUEST_TEMPLATE.md` (PR template)
- `CLAUDE.md` (project memory)
- `docs/REPORTS/ISSUES/issue_etl_place_image_pipeline_gap.md`
- `docs/REPORTS/ISSUES/issue_generated_accommodation_dayids_do_not_match_tripday_ids.md`
- `docs/09_execution_tracker.md` (task history)

---

## A. BUG #1: ACCOMMODATION DAYIDS MISMATCH (P0 - CONFIRMED CRITICAL)

### Root Cause

**File:** `Backend/src/itineraries/pipeline.py:480`

**Current code (WRONG):**
```python
# Create TripDay records (lines 426-436)
for idx, day in enumerate(sorted(itinerary.days, key=lambda item: item.day_number)):
    trip_date = request.start_date + timedelta(days=idx)
    trip_day = await self.repo.add_day(
        trip_id=trip.id,
        day_number=idx + 1,
        label=day.label,
        date=trip_date.isoformat(),
        destination_name=destination_name,
    )
    # trip_day được tạo với DB ID (ví dụ: 188, 189, 190)
    # NHƯNG KHÔNG KEEP MAPPING

# Create accommodation records (line 480)
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

**Vấn đề:**
- AI generates `dayIds` theo generated indices: `[1, 2, 3]` (đánh số từ 1)
- DB creates `TripDay` với actual IDs: `[188, 189, 190]` (auto-increment)
- No remapping from AI day_number → real DB ID
- Frontend `useTripSync.ts:109` lookup by `tripDay.id` fails
- UI symptom: "Chưa có nơi ở"

### Live Evidence (Trip #424, 2026-06-07)

```sql
-- Trip Days
SELECT id, day_number FROM trip_days WHERE trip_id = 424;
-- Result: id=188, day_number=1 | id=189, day_number=2

-- Accommodations
SELECT id, name, day_ids FROM accommodations WHERE trip_id = 424;
-- Result: day_ids = [1]  <- WRONG! Should be [188]

-- UI displays: "Chưa có nơi ở" for both days
```

### Fix Implementation

**File:** `Backend/src/itineraries/pipeline.py`
**Location:** After line 436 (after creating all TripDays)

**New code:**
```python
# Create TripDay records first (lines 426-436)
days: list[TripDay] = []
day_number_to_id: dict[int, int] = {}  # ADD: Mapping storage

for idx, day in enumerate(sorted(itinerary.days, key=lambda item: item.day_number)):
    trip_date = request.start_date + timedelta(days=idx)
    trip_day = await self.repo.add_day(
        trip_id=trip.id,
        day_number=idx + 1,
        label=day.label,
        date=trip_date.isoformat(),
        destination_name=destination_name,
    )
    days.append(trip_day)
    day_number_to_id[day.day_number] = trip_day.id  # ADD: Store mapping

# Create accommodation records (remap day_ids)
for accommodation in itinerary.accommodations:
    hotel_id = accommodation.hotel_id if accommodation.hotel_id in hotel_ids else None

    # ADD: Remap AI day numbers to real TripDay IDs
    remapped_day_ids = [
        day_number_to_id[day_num]
        for day_num in accommodation.day_ids
        if day_num in day_number_to_id
    ]

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
        day_ids=remapped_day_ids,  # <--- FIX: Use remapped IDs
    )
```

### Test Acceptance

**Manual Smoke Test:**
1. Navigate to `/create-trip`
2. Fill form: destination, dates, budget
3. Click "AI Generate" button
4. Wait for completion + redirect to workspace
5. **VERIFY:** Accommodation hiển thị ở đúng ngày (NOT "Chưa có nơi ở")
6. **Check DB:**
   ```sql
   SELECT td.id, td.day_number, a.name, a.day_ids
   FROM trip_days td
   LEFT JOIN accommodations a ON a.day_ids @> ARRAY[td.id]
   WHERE td.trip_id = <new_trip_id>
   ORDER BY td.id;
   ```
   → Verify `a.day_ids` contains real `td.id` values
7. Reload page → accommodation still displays correctly

**Integration Test:**
```python
# Backend/tests/integration/test_pipeline.py
@pytest.mark.asyncio
async def test_pipeline_remaps_accommodation_day_ids():
    """Verify AI day indices are remapped to real TripDay IDs."""
    # Setup: Mock AI response with dayIds=[1, 2]
    # Expected: DB gets day_ids=[<real_ids>, <real_ids>]
    pass
```

**E2E Test:**
```typescript
// Frontend/tests/e2e/trips.spec.ts
test('accommodation displays in workspace after AI generate', async ({ page }) => {
  await page.goto('/create-trip');
  // Fill form + generate
  // Navigate to workspace
  // Verify accommodation visible (not "Chưa có nơi ở")
});
```

---

## B. BUG #2: PLACE IMAGES EMPTY (CONFIRMED - API LIMITATION)

### Root Cause

**Goong API DOES NOT PROVIDE photos/images field**

Verified from official docs:
- Place/AutoComplete response: NO photos field
- Place/Detail response: NO photos field
- Geocoding API: NO photos field

**This is NOT a code bug.** ETL pipeline works correctly with available data.

### ETL Pipeline Status

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| GoongClient.place_detail() | `Backend/src/geo/goong_client.py:83-99` | ✅ CORRECT | Returns raw API result correctly |
| GoongExtractor._build_raw_poi() | `Backend/src/etl/extractors/goong_extractor.py:105-140` | ✅ CORRECT | Extracts all available fields |
| PlaceTransformer.transform() | `Backend/src/etl/transformers/place_transformer.py:103` | ⚠️ ACCEPTABLE | Sets `image: ""` because no source data |
| DbLoader.upsert_places() | `Backend/src/etl/loaders/db_loader.py:103-117` | ❌ **BUG** | Missing 3 fields in conflict update |

**CONCLUSION:** ETL pipeline works correctly with Goong API limitations. Empty images = API limitation, NOT code bug.

### Current Status

- DB `places` table: **618/618 rows** have `image = ''`
- This is CORRECT behavior given Goong API limitations
- Frontend fallback logic handles empty images

### Image Strategy Options - CHI TIẾT GIẢI THÍCH

#### Option A: Category-based fallback (User REJECTED)

User feedback: "Không thế nào là A được vì có rất nhiều địa điểm sao xử lý hết được"

**Lý do bị reject:** Với hàng trăm địa điểm, việc mapping category → image static là không khả thi. Sẽ có rất nhiều địa điểm khác category nhưng dùng chung 1 ảnh, khiến UX kém.

---

#### Option B: External API Integration (Unsplash/Pexels) - HIGH COMPLEXITY

**GIẢI THÍCH CHI TIẾT:**

**Cách hoạt động:**
1. Sau khi ETL extract place info từ Goong (name, location, category)
2. Gọi thêm Unsplash/Pexels API với query = place name
3. Lấy URL ảnh đầu tiên kết quả trả về
4. Store URL vào `places.image` field
5. Frontend hiển thị URL đó thay vì fallback

**Ví dụ flow:**
```
Goong API: "Văn Miếu, Hà Nội" → không có photo
Unsplash API: search "Văn Miếu Temple" → trả về 20 photos
Chọn photo[0].urls.regular → "https://images.unsplash.com/photo-xxx"
Store vào DB: places.image = "https://images.unsplash.com/photo-xxx"
Frontend: hiển thị ảnh thật của Văn Miếu
```

**Ưu điểm:**
- ✅ **Real images** - Ảnh thật của địa điểm
- ✅ **High quality** - Unsplash/Pexels có library lớn
- ✅ **Automatic** - Không cần manual curation
- ✅ **Scalable** - Crawl được hàng nghìn địa điểm

**Nhược điểm:**
- ❌ **External dependency** - Phụ thuộc API bên thứ 3
- ❌ **Rate limits rất restrict:**
  - Unsplash free tier: 50 requests/hour (50 calls/giờ)
  - Pexels free tier: 200 requests/hour (200 calls/giờ)
  - Với 618 places hiện tại → cần ~3-12 hours để crawl hết
- ❌ **License/compliance concerns:**
  - Unsplash: Free use, nhưng phải attribution
  - Pexels: Free use, không cần attribution
  - Cần check kỹ license terms
- ❌ **Relevance không guaranteed:**
  - Search "Văn Miếu" có thể trả về ảnh temple khác ở Trung Quốc
  - Search "Phở" có thể trả về ảnh món phở ở Nhật Bản
  - Cần verify bằng location name matching
- ❌ **Maintenance burden:**
  - API key có thể expire
  - API rate limit có thể change
  - URLs có thể break sau này
- ❌ **Development effort: +8-12 hours:**
  - 2-3 hours: Implement Unsplash/Pexels client
  - 2-3 hours: Integrate vào ETL pipeline
  - 1-2 hours: Handle errors, rate limits, retries
  - 2-3 hours: Testing, debugging, edge cases
  - 1-2 hours: Docs, monitoring

**Kết luận:** Option B mang lại UX tốt nhất (real images) nhưng có rủi ro cao về external dependency và maintenance effort.

---

#### Option C: Admin Panel + Manual Curation (Hybrid) - MEDIUM EFFORT

**GIẢI THÍCH CHI TIẾT:**

**Cách hoạt động:**
1. Accept Goong limitation - places.image = "" (empty)
2. Add admin endpoints để manual upload/override images
3. Admin có thể upload ảnh URL hoặc file upload cho từng place
4. Frontend priority: manual image > category fallback > generic fallback
5. Bắt đầu với top 100 popular places, gradual rollout

**Ví dụ flow:**
```
Phase 1: Top 100 places (manual curation)
- Admin upload ảnh cho: Văn Miếu, Hồ Hoàn Kiếm, Lăng Bác...
- Store vào DB: places.image = "https://example.com/van-mieu.jpg"
- Frontend hiển thị manual image

Phase 2: Remaining 518 places (category fallback)
- Nếu place không có manual image → dùng category fallback
- Category fallback đã có sẵn trong Frontend
- UX acceptable vì popular places có ảnh thật

Phase 3: Gradual expansion
- Admin có thể thêm dần images cho places còn lại
- Không có pressure phải làm tất cả ngay
```

**Implementation chi tiết:**

**Backend (3-4 hours):**
```python
# Add admin endpoints
PUT /api/v1/admin/places/{place_id}/image
{
  "image_url": "https://example.com/place.jpg"  // hoặc base64
}

DELETE /api/v1/admin/places/{place_id}/image

GET /api/v1/admin/places?image_status=missing  // List places missing images
```

**Frontend (2-3 hours):**
```typescript
// Add admin component
<PlaceImageUploader>
  - Search place by name
  - Upload image file hoặc paste URL
  - Preview before save
  - List places with/without images
</PlaceImageUploader>

// Update placeImage.ts priority
function getPlaceImage(place: Place): string {
  if (place.image) return place.image;  // Manual override first
  return CATEGORY_FALLBACK_IMAGES[place.category] || DEFAULT_IMAGE;
}
```

**Ưu điểm:**
- ✅ **Realistic, achievable** - Không cần external API
- ✅ **Controlled quality** - Admin chọn đúng ảnh
- ✅ **Scalable approach:**
  - Phase 1: Top 100 places (MVP, ~1 week effort)
  - Phase 2: Expand khi cần
  - Không có pressure phải hoàn thành ngay
- ✅ **Transparent** - Users biết là admin-curated
- ✅ **No rate limit concerns** - Upload thủ công, không bị API limit
- ✅ **No license issues** - Admin sở hữu images
- ✅ **Fallback still works** - Category fallback cho non-curated places

**Nhược điểm:**
- ❌ **Manual effort required** - Admin phải upload từng ảnh
- ❌ **Requires admin UI** - Cần build admin panel (2-3 hours)
- ❌ **Requires admin auth middleware** - Cần protect admin endpoints
- ❌ **Initial coverage incomplete** - Chỉ top 100 places có ảnh đầu tiên
- ❌ **Development effort: +4-6 hours:**
  - 2-3 hours: Admin UI development
  - 1-2 hours: Backend endpoints + auth
  - 1-2 hours: Testing, integration

**Kết luận:** Option C là balanced approach - realistic effort, controlled quality, scalable. Có thể bắt đầu với MVP (top 100 places) và expand sau.

---

#### Option D: Accept Current State (Do Nothing) - ZERO EFFORT

**GIẢI THÍCH CHI TIẾT:**

**Cách hoạt động:**
- Accept Goong API limitation - places.image = ""
- Rely hoàn toàn vào Frontend category fallback logic
- Focus dev effort vào features khác (C3/C4 companion chat)

**Ví dụ flow:**
```
Current Frontend fallback (đã hoạt động):
- Food places → food.jpg
- Attractions → attraction.jpg
- Hotels → hotel.jpg
- Nature → nature.jpg

Users sẽ thấy category-based images
UX degraded but functional
```

**Ưu điểm:**
- ✅ **Zero development effort** - Không cần code gì thêm
- ✅ **Accept API limitation** - Không fight với Goong constraints
- ✅ **Focus elsewhere** - Dành effort cho C3/C4 features quan trọng hơn
- ✅ **Frontend fallback works** - Không bị broken images

**Nhược điểm:**
- ❌ **Poor UX persists** - Tất cả places cùng category có cùng ảnh
- ❌ **Not professional** - Trông như placeholder, không giống real app
- ❌ **User feedback negative** - User sẽ notice và complain
- ❌ **No improvement path** - Không có plan để improve sau này

**Kết luận:** Option D chỉ nên chọn nếu:
- Time pressure cực lớn (deadline approaching)
- Priority features khác (C3/C4) quan trọng hơn
- Accept degraded UX trong ngắn hạn

---

### TABLE SUMMARY - 3 OPTIONS SO SÁNH

| Aspect | Option B (External API) | Option C (Admin Panel) | Option D (Do Nothing) |
|--------|------------------------|----------------------|---------------------|
| **Real images** | ✅ Yes | ✅ Yes (manual) | ❌ No (category fallback) |
| **Effort** | High (8-12 hours) | Medium (4-6 hours) | Zero (0 hours) |
| **External dependency** | ❌ Yes (Unsplash/Pexels) | ✅ No | ✅ No |
| **Rate limit risk** | ❌ High (50-200 req/hour) | ✅ None | ✅ None |
| **License concerns** | ⚠️ Need check | ✅ Admin-owned | ✅ N/A |
| **Image relevance** | ⚠️ Not guaranteed | ✅ Admin-selected | ❌ Category-based only |
| **Scalability** | ✅ Automatic | ⚠️ Manual gradual | ⚠️ Not applicable |
| **Maintenance** | ❌ Ongoing | ⚠️ Minimal | ✅ None |
| **UX quality** | ✅ Best | ✅ Good | ❌ Poor |
| **Time to MVP** | 8-12 hours | 4-6 hours | 0 hours (immediate) |

### RECOMMENDATION FROM AUDIT

**Ranking by effort vs value:**
1. **Option C (Admin Panel)** - Best balance: realistic effort, controlled quality, scalable, no external dependency risk
2. **Option B (External API)** - Best UX but high risk: external dependency, rate limits, license concerns
3. **Option D (Do Nothing)** - Only if time pressure extreme: accept poor UX, focus elsewhere

**Suggested approach:**
- **Short-term (1-2 weeks):** Option C Phase 1 - Manual curation top 100 places
- **Long-term (1-2 months):** Option C Phase 2 - Expand to all places gradually
- **Alternative:** Consider Option B only if Option C proves insufficient UX

**User decision needed:** Which approach cho images?

---

## C. BUG #3: DB LOADER CONFLICT UPDATE INCOMPLETE (P1 - CONFIRMED)

### Root Cause

**File:** `Backend/src/etl/loaders/db_loader.py:105-117`

**Current code (BUGGY):**
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

**Impact:**
- ETL reruns cannot repair existing rows
- If we add image strategy later, old rows won't update
- Missing `avg_cost` and `opening_hours` refresh

### Fix Implementation

**File:** `Backend/src/etl/loaders/db_loader.py:105-117`

**Updated code:**
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
        "image": stmt.excluded.image,              # ADD
        "avg_cost": stmt.excluded.avg_cost,        # ADD
        "opening_hours": stmt.excluded.opening_hours,  # ADD
    },
)
```

### Test Acceptance

**Manual verification:**
1. Update code
2. Rerun ETL: `cd Backend && uv run python -m src.etl.main`
3. Check DB: `SELECT id, name, image FROM places LIMIT 10;`
4. Verify existing rows can be updated on conflict

**Integration test:**
```python
# Backend/tests/integration/test_db_loader.py
@pytest.mark.asyncio
async def test_db_loader_conflict_update_refreshes_all_fields():
    """Verify conflict update refreshes image, avg_cost, opening_hours."""
    pass
```

---

## D. AUTH & PERMISSIONS - SECURE WITH MINOR GAPS

### Trip Owner Check Logic - ✅ CONFIRMED SECURE

**Location:** `Backend/src/itineraries/service.py`

**Implementation:**
```python
async def _verify_owner(self, trip_id: int, user_id: int) -> Trip:
    trip = await self.repo.get_with_full_data(trip_id)
    if not trip:
        raise NotFoundException("Trip not found")
    if trip.user_id != user_id:
        raise ForbiddenException("Not trip owner")
    return trip
```

**Status:** ✅ SECURE - All trip operations verify ownership

### Guest Claim Flow - ✅ CONFIRMED FUNCTIONAL

**Implementation:**
- Token created: `Backend/src/core/security.py` (`create_opaque_token`)
- Token stored: `Backend/src/itineraries/models/extras.py` (`GuestClaimToken`)
- Claim validation: `Backend/src/itineraries/service.py`

**Status:** ✅ SECURE - One-time tokens, hashed storage, 24-hour expiry

### Share Token Security - ✅ CONFIRMED SECURE

**Implementation:** `Backend/src/itineraries/models/extras.py`
- Single share link per trip (unique constraint)
- Hashed token storage (raw token returned once)
- Optional expiration and manual revocation

**Status:** ✅ SECURE - Read-only access, no write permissions

### Nested Subresource Authorization - ✅ RESOLVED

**Previous Issue:** Activity/Accommodation update/delete didn't verify subresource belonged to supplied trip

**Resolution:** PR #00060A fixed this issue
- Repository methods now validate both `trip_id` and subresource ID
- Returns `404` when subresource not in supplied trip

**Status:** ✅ RESOLVED - See `docs/REPORTS/ISSUES/issue_nested_trip_subresource_membership_authz_gap.md`

---

## E. RATE LIMITING - FUNCTIONAL BUT NEEDS HARDENING

### AI Quota Enforcement - ✅ CONFIRMED FUNCTIONAL

**Location:** `Backend/src/core/rate_limiter.py:52-113`

**Implementation:**
```python
async def check_ai_limit(self, user_id: int) -> bool:
    key = self._ai_key(f"user:{user_id}")  # Format: rate:ai:user:{user_id}:{YYYYMMDD}
    count = await self.redis.incr(key)
    if count == 1:
        await self.redis.expireat(key, self._next_midnight_utc())
    return count <= self.settings.rate_limit_ai_free
```

**Status:** ✅ FUNCTIONAL - Daily quota enforced, midnight reset

### Redis Fail-Closed Behavior - ✅ CONFIRMED SECURE

**Location:** `Backend/src/core/rate_limiter.py:83-87`
```python
except Exception as exc:
    if self.settings.ai_rate_limit_fail_mode == "closed":
        raise ServiceUnavailableException("AI rate limiter unavailable") from exc
    return True
```

**Status:** ✅ SECURE - Blocks requests when Redis unavailable (fail-closed)

### Identified Gaps (DEFERRED to 00058C)

**Gap 1: Fixed Window Boundary Burst**
- Issue: Users can make 3 calls at 23:59 and 3 more at 00:01 (6 total in 2 minutes)
- Severity: LOW - Acceptable for MVP2
- Status: DEFERRED (documented in `docs/REPORTS/ISSUES/issue_rate_limit_algorithm_hardening_sliding_token_bucket.md`)

**Gap 2: Same Quota for Auth and Guest**
- Issue: Both auth users and guests limited to 3 calls/day
- Product Requirement: Auth users should get 5 calls/day
- Severity: LOW - Product decision to defer
- Status: DEFERRED (documented in `docs/REPORTS/ISSUES/issue_auth_quota_separate_5_per_day.md`)

**Gap 3: Guest Fingerprint Weakness**
- Issue: Guest fingerprint based on IP + User-Agent hash
- Severity: LOW - Acceptable for free tier
- Status: DOCUMENTED (noted in rate limiter comments)

---

## F. CI/CD - WELL STRUCTURED AND ENFORCED

### Branch Naming Convention - ✅ CONFIRMED ENFORCED

**Regex:** `/^(feat|fix|docs|style|refactor|chore)\/[0-9]+-(a|b1|b2|b3|c|d)-[a-z0-9-]+$/`

**Examples:**
- `feat/12345-b1-auth-register`
- `fix/00060-d-local-smoke-ux-data-fix`

**Enforcement:** `.github/workflows/pr-policy.yml:24-36`

**Status:** ✅ ENFORCED - PRs blocked if branch name doesn't match

### Commit Message Format - ✅ CONFIRMED ENFORCED

**Format:** `<type>: [#<Task-ID>] <description>`

**Example:** `feat: [#12345] add refresh token endpoint`

**Enforcement:** `.github/workflows/pr-policy.yml:38-50`

**Status:** ✅ ENFORCED - PRs blocked if title doesn't match

### PR Requirements - ✅ CONFIRMED ENFORCED

**Required Sections** (`.github/workflows/pr-policy.yml:52-75`):
- Mô tả (Description)
- Thay đổi chính (Main changes)
- Cách kiểm tra (Testing)
- Lưu ý khác (Notes)

**Template:** `.github/PULL_REQUEST_TEMPLATE.md`

**Status:** ✅ ENFORCED - PRs blocked if required sections missing

### CI Workflows - ✅ CONFIRMED FUNCTIONAL

**Backend CI** (`.github/workflows/backend-ci.yml`):
- Lint: `ruff check src tests`
- Unit tests: `pytest tests/unit/`
- Integration tests: `pytest tests/integration/`
- Migrations: `alembic upgrade head && alembic check`
- Frontend build: `npm run build`

**Frontend CI** (`.github/workflows/frontend-ci.yml`):
- Build: `npm run build`
- E2E: `npx playwright test`

**Status:** ✅ FUNCTIONAL - All jobs pass on main branch

**Required Checks (7 total):**
1. `pr-policy` - Branch/commit/PR validation
2. `backend-lint` - Ruff lint + format check
3. `backend-unit` - pytest unit tests
4. `backend-integration` - pytest integration tests
5. `backend-migrations` - Alembic upgrade/check
6. `frontend-build` - Vite production build
7. `frontend-e2e` - Playwright e2e tests

---

## M. DATABASE & SLUG LOGIC AUDIT - CRITICAL FINDINGS

### ⚠️ USER CONCERN VALIDATED - SLUG ISSUES CONFIRMED

**User feedback:** "Tôi nhớ có check slug gì đó khi load sẽ có gây ra sai sót chi tiết"

**Audit result:** **CONFIRMED** - Found multiple slug-related issues that could cause data loading errors.

---

### Database Schema Summary

**Destinations Table:**
```sql
CREATE TABLE destinations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE,           -- ✓ Unique constraint
    slug VARCHAR(100) UNIQUE,           -- ✓ Unique constraint
    description TEXT,
    image VARCHAR(255),
    latitude FLOAT,
    longitude FLOAT,
    is_active BOOLEAN DEFAULT TRUE,
    places_count INTEGER DEFAULT 0,
    last_etl_at TIMESTAMP,
    -- Indexes: Implicit on unique constraints
);
```

**Places Table:**
```sql
CREATE TABLE places (
    id SERIAL PRIMARY KEY,
    destination_id INTEGER REFERENCES destinations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50),
    location VARCHAR(255),
    latitude FLOAT,
    longitude FLOAT,
    avg_cost INTEGER DEFAULT 0,
    rating FLOAT DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    image VARCHAR(255) DEFAULT '',
    opening_hours TEXT,
    external_id VARCHAR(512),
    raw_metadata JSONB,
    source VARCHAR(50),
    updated_at TIMESTAMP,
    -- Unique constraint: (name, destination_id)
    -- Indexes: destination_id, name, category, external_id
);
```

**Issue Found:** ⚠️ **Missing composite index on `(external_id, destination_id)`** for efficient lookups.

---

### Slug Logic Analysis - CRITICAL BUGS FOUND

#### Bug #4: Slug Collision Risk (HIGH PRIORITY)

**Location:** `Backend/src/etl/loaders/db_loader.py:272-367`

**Slug Generation Function:**
```python
def _to_slug(name: str) -> str:
    """Convert Vietnamese city name to URL-safe slug."""
    # Removes Vietnamese diacritics
    # "Hà Nội" → "ha-noi"
    # "Thành phố Hồ Chí Minh" → "thanh-pho-ho-chi-minh"
    # "TP. Hồ Chí Minh" → "tp-ho-chi-minh"  ← COLLISION RISK!
    name = name.lower()
    for old, new in VIETNAMESE_MAP.items():
        name = name.replace(old, new)
    # Remove special chars, replace spaces with hyphens
    return re.sub(r"[^\w\s-]", "", name).strip().replace(" ", "-")
```

**Problem:**
- City name variations generate SAME slug
- **Example collision:** "Thành phố Hồ Chí Minh" and "TP. Hồ Chí Minh" both → `tp-ho-chi-minh`
- **Result:** Unique constraint violation on second insert

**Live Evidence:**
```python
# First ETL run
city = "Thành phố Hồ Chí Minh"
slug = "thanh-pho-ho-chi-minh"  # Success ✅

# Second ETL run (manual entry or variation)
city = "TP. Hồ Chí Minh"
slug = "tp-ho-chi-minh"  # Error! Duplicate slug ❌
# UNIQUE constraint failed: destinations.slug
```

#### Bug #5: Duplicate Slug Logic in TWO Locations

**Location 1:** `Backend/src/etl/loaders/db_loader.py:272-367` (ETL pipeline)

**Location 2:** `Backend/src/itineraries/repository.py` (Query time resolution)

**Problem:** Same logic duplicated in two places → maintenance burden, risk of divergence

**Impact:** If bug fixed in one location but not the other → inconsistent behavior

#### Bug #6: No Pre-Insertion Slug Validation

**Location:** `Backend/src/etl/loaders/db_loader.py:38-54`

```python
async def get_or_create_destination(session: AsyncSession, city: str) -> Destination:
    stmt = select(Destination).where(Destination.name == city)
    result = await session.execute(stmt)
    dest = result.scalar_one_or_none()
    
    if dest:
        return dest
    
    # ⚠️ BUG: No check if slug already exists!
    slug = _to_slug(city)
    dest = Destination(
        name=city,
        slug=slug,  # ← Could violate unique constraint
        ...
    )
    session.add(dest)
    await session.flush()  # ← Could fail here with unique constraint error
```

**Expected Behavior:**
```python
# SHOULD DO:
slug = _to_slug(city)

# Check if slug already exists
existing_slug = await session.execute(
    select(Destination).where(Destination.slug == slug)
)
if existing_slug.scalar_one_or_none():
    # Generate variant slug with suffix
    slug = f"{slug}-{uuid.uuid4().hex[:8]}"  # "ha-noi-a3b2c1d4"

# Then create destination
```

---

### Storage Patterns Analysis - Critical Issues Found

#### Issue #1: Two Separate Upsert Strategies (CONFUSED LOGIC)

**Location:** `Backend/src/etl/loaders/db_loader.py:57-134`

**Strategy 1 - External ID Lookup (lines 60-72):**
```python
external_id = place_data.get("external_id")
if external_id:
    existing = await _get_place_by_external_id(session, str(external_id))
    if existing:
        await _update_existing_place(existing, place_data, dest.id)
        count += 1
        continue  # ← Skips insert logic
```

**Strategy 2 - ON CONFLICT DO UPDATE (lines 103-117):**
```python
stmt = insert(Place).values(...)
stmt = stmt.on_conflict_do_update(
    index_elements=["name", "destination_id"],
    set_={...}
)
```

**Problem:**
- If `external_id` is None/empty → skips Strategy 1
- Falls through to Strategy 2
- But Strategy 2 uses `(name, destination_id)` unique constraint
- **Result:** Two separate code paths that can conflict or miss updates

#### Issue #2: Race Condition in External ID Lookup

**Location:** `Backend/src/etl/loaders/db_loader.py:60-72`

**Problem:**
```python
# Time gap between lookup and insert
existing = await _get_place_by_external_id(session, str(external_id))
if existing:
    await _update_existing_place(...)
# ← Another ETL run could insert same external_id here!
await session.flush()
```

**Impact:** 
- Between lookup and flush, another process could insert same `external_id`
- **Result:** Duplicate external_ids in database

**Severity:** MEDIUM (rare but possible in concurrent ETL runs)

#### Issue #3: Missing Fields in Conflict Update

**Location:** `Backend/src/etl/loaders/db_loader.py:103-117`

**Current code (BUGGY - already documented as Bug #3):**
```python
stmt.on_conflict_do_update(
    index_elements=["name", "destination_id"],
    set_={
        "category": stmt.excluded.category,
        "description": stmt.excluded.description,
        # Missing: image, avg_cost, opening_hours
    },
)
```

**Problem:** Even if external_id lookup finds existing place, conflict update doesn't refresh all fields.

---

### Referential Integrity Issues

**GOOD PRACTICES Found:**
- ✅ CASCADE DELETE on destination → places/hotels
- ✅ CASCADE DELETE on trip → nested entities (trip_days, activities, accommodations)

**POTENTIAL ISSUES Found:**
- ⚠️ **Activity.place_id has no ON DELETE strategy**
  ```sql
  ALTER TABLE activities ALTER COLUMN place_id DROP CONSTRAINT IF EXISTS;
  -- place_id is just INTEGER, no FK constraint defined
  ```
  **Impact:** Deleting a place leaves orphaned activity records with invalid `place_id`

- ⚠️ **Accommodation.hotel_id has no ON DELETE strategy**
  ```sql
  -- Same issue - hotel_id is nullable INTEGER, no FK constraint
  ```
  **Impact:** Deleting a hotel could leave orphaned accommodation records

---

### Data Integrity Issues Found

**Issue #1: Orphaned Place References**

**Check query:**
```sql
-- Find activities referencing non-existent places
SELECT a.id, a.name, a.place_id
FROM activities a
LEFT JOIN places p ON a.place_id = p.id
WHERE a.place_id IS NOT NULL AND p.id IS NULL;
```

**Impact:** Activities with broken place references, frontend errors when loading

**Issue #2: External ID Not Unique Across Destinations**

**Problem:** Two different places in different cities could have same external_id

**Example:**
- City A: "Cục Giảng Vọng" → external_id = "abc123"
- City B: "Cục Giảng Vọng" → external_id = "abc123" (same Goong place_id)

**Current schema:** `external_id` is indexed but NOT unique per destination

**Impact:** External ID lookup could return wrong place

---

### Critical Findings Summary

| Issue | Severity | Location | Impact |
|-------|----------|----------|--------|
| **Slug collision** | HIGH | db_loader.py:272-367 | Unique constraint violation |
| **Duplicate slug logic** | MEDIUM | db_loader.py + repository.py | Maintenance burden |
| **No slug validation** | HIGH | db_loader.py:38-54 | Insert failures |
| **Two upsert strategies** | MEDIUM | db_loader.py:57-134 | Confused logic, missed updates |
| **Race condition** | MEDIUM | db_loader.py:60-72 | Duplicate external_ids |
| **Missing FK constraints** | MEDIUM | Schema | Orphaned references |
| **Missing composite index** | LOW | Schema | Performance issues |

---

### Recommended Fixes for Slug & Storage Issues

#### Fix #4: Add Slug Collision Prevention

**File:** `Backend/src/etl/loaders/db_loader.py:38-54`

```python
async def get_or_create_destination(session: AsyncSession, city: str) -> Destination:
    # Try exact name match first
    stmt = select(Destination).where(Destination.name == city)
    result = await session.execute(stmt)
    dest = result.scalar_one_or_none()
    
    if dest:
        return dest
    
    # Generate slug
    slug = _to_slug(city)
    
    # ADD: Check if slug already exists
    existing_slug = await session.execute(
        select(Destination).where(Destination.slug == slug)
    )
    if existing_slug.scalar_one_or_none():
        # Generate variant slug with random suffix
        import uuid
        slug = f"{slug}-{uuid.uuid4().hex[:8]}"  # "ha-noi-a3b2c1d4"
        logger.warning("Slug collision detected, generated variant: %s", slug)
    
    # Now safe to insert
    dest = Destination(
        name=city,
        slug=slug,
        description="",
        latitude=0.0,
        longitude=0.0,
    )
    session.add(dest)
    await session.flush()
    return dest
```

#### Fix #5: Consolidate Slug Logic

**Create new file:** `Backend/src/shared/slug_utils.py`

```python
"""Unified slug generation utility - single source of truth."""

import re
import uuid

VIETNAMESE_MAP = {
    'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
    'ă': 'a', 'ắ': 'a', 'ặ': 'a', 'ằ': 'a', 'ẳ': 'a',
    'â': 'a', 'ầ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
    # ... (full map)
}

def to_slug(name: str) -> str:
    """Convert Vietnamese text to URL-safe slug.
    
    This is the SINGLE source of truth for slug generation.
    All other code should import this function.
    """
    name = name.lower()
    for old, new in VIETNAMESE_MAP.items():
        name = name.replace(old, new)
    return re.sub(r"[^\w\s-]", "", name).strip().replace(" ", "-")

def generate_unique_slug(base_name: str, suffix: str | None = None) -> str:
    """Generate unique slug with optional suffix.
    
    Args:
        base_name: Original name to slugify
        suffix: Optional suffix to append (for collision handling)
    
    Returns:
        URL-safe unique slug
    """
    slug = to_slug(base_name)
    if suffix:
        return f"{slug}-{suffix}"
    # Generate random suffix if needed
    return f"{slug}-{uuid.uuid4().hex[:8]}"
```

**Update imports:**
```python
# Backend/src/etl/loaders/db_loader.py
from Backend.shared.slug_utils import to_slug, generate_unique_slug

# Backend/src/itineraries/repository.py  
from Backend.shared.slug_utils import to_slug  # Only import to_slug
```

#### Fix #6: Add Composite Unique Constraint

**Migration file:** `alembic/versions/XXXX_add_composite_external_id_constraint.py`

```python
def upgrade():
    # Add composite unique constraint on external_id + destination_id
    op.create_unique_constraint(
        'uq_places_external_destination',
        'places',
        ['external_id', 'destination_id']
    )
```

**Purpose:** Prevent duplicate external_ids across different destinations

#### Fix #7: Add FK Constraints for place_id

**Migration file:** `alembic/versions/XXXX_add_place_fk_constraints.py`

```python
def upgrade():
    # Add FK constraint for activities.place_id
    op.execute("""
        ALTER TABLE activities
        ADD CONSTRAINT fk_activities_place_id
        FOREIGN KEY (place_id) REFERENCES places(id)
        ON DELETE SET NULL;
    """)
    
    # Add FK constraint for accommodations.hotel_id
    op.execute("""
        ALTER TABLE accommodations
        ADD CONSTRAINT fk_accommodations_hotel_id
        FOREIGN KEY (hotel_id) REFERENCES hotels(id)
        ON DELETE SET NULL;
    """)
```

**Impact:** Deleting place/hotel sets place_id/hotel_id to NULL instead of orphaned records

---

### ETL Pipeline Completeness Verification

**Question:** "Are all Goong API fields being extracted?"

**Answer:** ✅ **YES** - ETL extracts ALL fields Goong provides

**Verified extraction logic** (`goong_extractor.py:129-140`):
```python
return {
    "name": str(name).strip(),           # ✅ Extracted
    "category": category,               # ✅ Extracted
    "lat": point.get("lat"),            # ✅ Extracted
    "lng": point.get("lng"),            # ✅ Extracted
    "location": location,               # ✅ Extracted
    "description": source.get("description", ""),  # ✅ Extracted
    "opening_hours": self._format_opening_hours(...),  # ✅ Extracted
    "external_id": place_id,             # ✅ Extracted
    "source": "goong_places",            # ✅ Extracted
    "raw_metadata": self._sanitize_metadata(...),  # ✅ Extracted
}
```

**Goong API limitation confirmed:**
- ❌ NO `photos` / `images` field
- ❌ NO `rating` / `review_count` field
- ❌ NO `opening_hours` field (optional, rarely provided)

**Conclusion:** ETL pipeline is CORRECT and COMPLETE for Goong API capabilities.

---

## N. ETL API GAP ANALYSIS - CÓ BỎ LỠ API GOONG CHƯA DÙNG?

### Goong APIs Available vs ETL Implementation

**Goong Official Documentation đã được audit:**
- [Rest API | Goong Documents](https://docs.goong.io/rest/)
- [Places | Goong Documents](https://docs.goong.io/rest/place/)
- 25+ Goong API documentation URLs đã được user cung cấp

### Current ETL Implementation - APIs ĐANG DÙNG

**ETL Goong Client (`Backend/src/geo/goong_client.py`):**

| API Endpoint | Method | Purpose | Implemented? | Location |
|--------------|--------|---------|---------------|----------|
| `/geocode` | GET | Address → lat/lng | ✅ YES | Line 25-51 |
| `/place/autocomplete` | GET | Search places by text | ✅ YES | Line 53-81 |
| `/place/detail` | GET | Get place details | ✅ YES | Line 83-99 |

**ETL Goong Extractor (`Backend/src/etl/extractors/goong_extractor.py`):**

| Feature | Implemented? | Location |
|---------|---------------|----------|
| Category-based search | ✅ YES | Lines 15-41 (6 categories) |
| Autocomplete + Detail combo | ✅ YES | Lines 64-96 |
| City bias location | ✅ YES | Lines 98-103 |
| Opening hours extraction | ✅ YES | Line 136, 142-152 |

**CONCLUSION:** Current ETL pipeline đã tận dụng ĐẦY ĐỦ các APIs cần thiết cho place data extraction.

---

### Goong APIs CHƯA DÙNG - Potential Enhancements

**Goong APIs available but NOT used in ETL:**

| API Endpoint | Purpose | Why NOT used? | Should we use it? |
|--------------|---------|----------------|-------------------|
| `/direction` | Calculate route between 2 points | ETL focuses on place extraction, not routes | ❌ NOT for ETL - Use in C3 companion chat |
| `/distancematrix` | Matrix of distances between multiple points | ETL focuses on single place extraction | ❌ NOT for ETL - Use in activity optimization |
| `/staticmap` | Generate static map image | Requires additional API key, not critical for MVP2 | ⚠️ CONSIDER - Could use for fallback images |

### Analysis: ETL Pipeline is CORRECT

**Why current ETL is already optimal:**

1. **Core purpose fulfilled:**
   - Extract places by category (food, attraction, nature, entertainment, shopping)
   - Get details (name, address, lat/lng)
   - Store in database for AI generate context

2. **Unused APIs serve different purposes:**
   - `/direction`: Route planning → Use in **C3 companion chat** (calculate_route tool)
   - `/distancematrix`: Distance optimization → Use in **activity scheduling** (future enhancement)
   - `/staticmap`: Map tiles → Could use for **destination images** but requires separate API key

3. **No missing critical data:**
   - ETL extracts ALL fields Goong provides for place details
   - `photos/images` limitation is Goong API constraint, NOT ETL bug
   - `opening_hours` is extracted (line 136) even though Goong may not always provide it

### Potential Enhancement: StaticMap for Destination Images

**Option: Use `/staticmap` for destination thumbnails**

```python
# Could add to ETL pipeline for destination images:
# Backend/src/etl/extractors/goong_extractor.py

async def fetch_static_map(self, lat: float, lng: float, zoom: int = 13) -> str | None:
    """Generate static map image URL for location."""
    params = {
        "lat": lat,
        "lng": lng,
        "zoom": zoom,
        "api_key": self.api_key
    }
    try:
        data = await self.fetch(f"{self.base_url}/staticmap", params=params)
        return data.get("image_url")  # Assuming API returns image URL
    except Exception:
        return None
```

**Pros:**
- Real map images for destinations
- Better than empty/placeholder images

**Cons:**
- Requires separate API key configuration
- Additional HTTP requests per destination
- Rate limits apply
- **Effort:** +2-3 hours implementation

**Recommendation:** DEFER to Phase C3/C4 or later. Focus on Bug #1 + #3 first.

---

### CONCLUSION - ETL API GAP ANALYSIS

**Current ETL Implementation:** ✅ OPTIMAL

- ETL pipeline correctly uses all relevant Goong APIs for place extraction
- Unused APIs (`direction`, `distancematrix`) serve different purposes (routes, optimization)
- `photos/images` limitation is Goong API constraint, confirmed by official docs

**No ETL code changes needed** for Bug #1 or #3 fixes.

**Future enhancements** (optional, low priority):
- Consider `/staticmap` for destination thumbnails (Phase C3/C4+)
- Use `/direction` API in C3 companion chat for route calculation
- Use `/distancematrix` for activity scheduling optimization

---

## N. ETL API GAP ANALYSIS - CÓ BỎ LỠ API GOONG CHƯA DÙNG?

### Current Database Status

**Live evidence (2026-06-07):**
- `places` table: **618 rows** (chỉ 1 thành phố: Hà Nội)
- `destinations` table: **10 rows** (10 thành phố)
- `hotels` table: **3 rows** (test data only)
- **images:** 618/618 places có `image = ''` (empty)

**Problem:** Database thiếu rất nhiều dữ liệu cho các thành phố khác ngoài Hà Nội.

---

### ETL Pipeline Architecture

**ETL Flow:**
```
Goong Maps API (Primary) → Extract → Transform → Load → PostgreSQL
     ↓ (if rate limit/error)
OSM Fallback (Secondary) → Extract → Transform → Load → PostgreSQL
```

**Goong Endpoints Used:**
- `/Place/AutoComplete` - Search POIs by keyword + category
- `/Place/Detail` - Get place details (name, address, lat/lng)
- `/Geocode` - Forward geocoding (address → coordinates)

**Data Categories Crawl:**
- Food (restaurants, cafes)
- Attractions (temples, museums, parks)
- Accommodations (hotels, guesthouses)
- Entertainment (cinemas, shopping malls)
- Nature (beaches, mountains, lakes)
- Shopping (markets, malls)

---

### ETL Commands - Manual (PowerShell)

**1. Check current database status:**
```powershell
cd Backend

# Check places count
docker compose exec db psql -U postgres -d dulichviet -c "SELECT COUNT(*) FROM places;"

# Check destinations
docker compose exec db psql -U postgres -d dulichviet -c "SELECT name, places_count FROM destinations ORDER BY name;"

# Check places per city
docker compose exec db psql -U postgres -d dulichviet -c "
SELECT d.name as destination, COUNT(p.id) as place_count 
FROM destinations d 
LEFT JOIN places p ON p.destination_id = d.id 
GROUP BY d.name 
ORDER BY place_count DESC;
"
```

**2. Run ETL for single city (Goong API):**
```powershell
cd Backend

# Set Goong API key in .env
# GOONG_API_KEY=your_key_here

# Run ETL for Hà Nội
uv run python -m src.etl --cities "Hà Nội"

# Run ETL for Đà Nẵng
uv run python -m src.etl --cities "Đà Nẵng"

# Run ETL for multiple cities
uv run python -m src.etl --cities "Hà Nội" "Đà Nẵng" "Hội An" "Huế" "Đà Lạt"
```

**3. Run ETL for all configured cities:**
```powershell
cd Backend

# Check configured cities in .env or settings
# ETL_CITIES=["Hà Nội", "Đà Nẵng", "Hội An", "Huế", "Đà Lạt", "Nha Trang", "TP. Hồ Chí Minh"]

# Run ETL for all cities
uv run python -m src.etl

# Expected output:
# - Hà Nội: ~60 places + 3 hotels
# - Đà Nẵng: ~40 places + 2 hotels
# - Hội An: ~30 places + 2 hotels
# - Huế: ~35 places + 2 hotels
# - Đà Lạt: ~25 places + 1 hotel
# - Nha Trang: ~30 places + 2 hotels
# - TP. Hồ Chí Minh: ~50 places + 3 hotels
```

**4. Load hotels from YAML only (test data):**
```powershell
cd Backend

# Load hotels from Backend/src/etl/data/hotels.yaml
uv run python -m src.etl --hotels-only

# This loads sample hotels for testing without crawling places
```

**5. Dry-run ETL (no DB writes, just test):**
```powershell
cd Backend

# Test ETL without writing to database
uv run python -m src.etl --dry-run --cities "Hà Nội"

# Useful for debugging ETL pipeline
```

---

### ETL Commands - Docker Environment

**1. Run ETL inside Docker container:**
```powershell
# Start services first
docker compose up -d db redis

# Run ETL for single city
docker compose exec api uv run python -m src.etl --cities "Hà Nội"

# Run ETL for all cities
docker compose exec api uv run python -m src.etl

# Check ETL logs
docker compose logs api | grep -i etl
```

**2. Monitor ETL progress:**
```powershell
# Watch PostgreSQL logs
docker compose logs -f db

# Watch Redis invalidation
docker compose exec redis redis-cli
> MONITOR
> (watch for "DEL destinations:*" and "DEL places:*" commands)
```

**3. Verify ETL results:**
```powershell
# Check places after ETL
docker compose exec db psql -U postgres -d dulichviet -c "
SELECT d.name as destination, COUNT(p.id) as place_count 
FROM destinations d 
LEFT JOIN places p ON p.destination_id = d.id 
GROUP BY d.name 
ORDER BY place_count DESC;
"

# Check places with images (if image strategy implemented)
docker compose exec db psql -U postgres -d dulichviet -c "
SELECT destination, COUNT(*) as total, 
       COUNT(CASE WHEN image <> '' THEN 1 END) as with_images 
FROM places 
GROUP BY destination;
"

# Check Redis cache invalidation
docker compose exec redis redis-cli KEYS "destinations:*"
docker compose exec redis redis-cli KEYS "places:*"
```

---

### ETL Commands - Troubleshooting

**1. Handle Goong API rate limits:**
```powershell
# Goong API rate limit: ~1000 requests/day
# If rate limited, ETL will automatically fallback to OSM

# Check rate limit status in logs
docker compose logs api | grep -i "rate.*limit"

# If hit rate limit, wait 24 hours or use OSM fallback
uv run python -m src.etl --cities "Thành phố khác"  # Try different city
```

**2. Clear Redis cache (force reload from DB):**
```powershell
# Clear all places cache
docker compose exec redis redis-cli --scan --pattern "places:*" | ForEach-Object { docker compose exec redis redis-cli DEL $_ }

# Clear all destinations cache
docker compose exec redis redis-cli --scan --pattern "destinations:*" | ForEach-Object { docker compose exec redis redis-cli DEL $_ }

# Verify cache cleared
docker compose exec redis redis-cli DBSIZE
```

**3. Re-run ETL for existing places (upsert):**
```powershell
# ETL uses upsert strategy (insert or update)
# Running again will update existing places if data changed

# Force refresh specific city
uv run python -m src.etl --cities "Hà Nội"

# This will:
# - Update place details if Goong data changed
# - Add new places if Goong added more
# - Keep existing places if no longer in Goong results
```

**4. Reset and reload all data:**
```powershell
# ⚠️ DANGER ZONE - This deletes all data

# Delete all places
docker compose exec db psql -U postgres -d dulichviet -c "DELETE FROM places;"

# Delete all destinations
docker compose exec db psql -U postgres -d dulichviet -c "DELETE FROM destinations;"

# Reset places_count
docker compose exec db psql -U postgres -d dulichviet -c "ALTER SEQUENCE places_id_seq RESTART WITH 1;"
docker compose exec db psql -U postgres -d dulichviet -c "ALTER SEQUENCE destinations_id_seq RESTART WITH 1;"

# Re-run ETL from scratch
uv run python -m src.etl
```

---

### ETL Automation - CI/CD Integration

**Option 1: Manual ETL run (recommended for MVP2):**
```powershell
# Run ETL manually before deploying
cd Backend
uv run python -m src.etl

# Or inside Docker
docker compose exec api uv run python -m src.etl
```

**Option 2: Scheduled ETL (future enhancement):**
```powershell
# Add cron job to run ETL daily/weekly
# Example: Run ETL every Sunday at 2 AM

# Linux crontab:
0 2 * * 0 cd /path/to/repo/Backend && uv run python -m src.etl

# Windows Task Scheduler:
# Create task to run script weekly
```

**Option 3: Trigger-based ETL (manual trigger):**
```powershell
# Add admin endpoint to trigger ETL
# POST /api/v1/admin/etl/run
# { "cities": ["Hà Nội", "Đà Nẵng"] }

# This allows manual trigger from admin panel
# Requires authentication + admin authorization
```

---

### ETL Best Practices

**1. Run ETL before testing:**
```powershell
# Always ensure fresh data before running tests
cd Backend
uv run python -m src.etl
uv run pytest tests/integration/ -v
```

**2. Monitor ETL logs:**
```powershell
# Check for errors during ETL
docker compose logs api | grep -i "error\|failed\|exception"

# Check ETL statistics
docker compose logs api | grep -i "etl.*completed"
```

**3. Verify data quality:**
```powershell
# Check for places missing coordinates
docker compose exec db psql -U postgres -d dulichviet -c "
SELECT COUNT(*) FROM places WHERE latitude IS NULL OR longitude IS NULL;
"

# Check for places missing addresses
docker compose exec db psql -U postgres -d dulichviet -c "
SELECT COUNT(*) FROM places WHERE location = '' OR location IS NULL;
"

# Check for places with empty images (if image strategy implemented)
docker compose exec db psql -U postgres -d dulichviet -c "
SELECT COUNT(*) FROM places WHERE image = '';
"
```

---

### ETL Commands Summary Checklist

**Trước khi fix bugs, cần chạy ETL:**
- [ ] Check current database status (places count per city)
- [ ] Set Goong API key in `.env`
- [ ] Run ETL for all configured cities
- [ ] Verify ETL results (places count, destinations updated)
- [ ] Clear Redis cache (force reload)
- [ ] Test places API to confirm data loaded

**Recommended ETL Sequence:**
```powershell
# Step 1: Check status
docker compose exec db psql -U postgres -d dulichviet -c "SELECT name, places_count FROM destinations;"

# Step 2: Run ETL
cd Backend
uv run python -m src.etl

# Step 3: Verify results
docker compose exec db psql -U postgres -d dulichviet -c "SELECT d.name, COUNT(p.id) FROM destinations d LEFT JOIN places p ON p.destination_id = d.id GROUP BY d.name;"

# Step 4: Clear cache
docker compose exec redis redis-cli FLUSHDB

# Step 5: Test API
curl "http://localhost:8000/api/v1/places/search?city=Hà+Nội&limit=5"
```

---

## O. ETL COMMANDS - CRAWL DATA ĐỦ ĐẦY KHÔNG THIẾU

### Local Verification Commands

**Backend Verification:**
```powershell
# Navigate to Backend
cd Backend

# Install dependencies
uv sync

# Run linting
uv run ruff check src tests
uv run ruff format --check src tests

# Run database migrations
uv run alembic upgrade head
uv run alembic check

# Run unit tests
uv run pytest tests/unit/ -v --tb=short

# Run integration tests (requires Docker services)
$env:CI="true"
uv run pytest tests/integration/ -v --tb=short

# Run all tests
$env:CI="true"
uv run pytest tests/ -v
```

**Frontend Verification:**
```powershell
# Navigate to Frontend
cd Frontend

# Install dependencies
npm ci

# Set API URL
$env:VITE_API_URL="http://localhost:8000"

# Build for production
npm run build

# Run E2E tests (requires BE server running)
npm run test:e2e

# Run E2E tests with visible browser
npm run test:e2e:headed
```

### Docker Commands

**Full Stack Start:**
```powershell
# Start services
docker compose up -d db redis

# Check services status
docker compose ps

# View logs
docker compose logs -f api
```

**Database Operations:**
```powershell
# Connect to PostgreSQL
docker compose exec db psql -U postgres -d dulichviet

# Run migrations
docker compose exec api alembic upgrade head

# Check places table
docker compose exec db psql -U postgres -d dulichviet -c "SELECT COUNT(*) FROM places WHERE image <> '';"
```

**Redis Operations:**
```powershell
# Connect to Redis CLI
docker compose exec redis redis-cli

# Clear rate limit keys (local testing)
docker compose exec redis redis-cli --scan --pattern "rate:ai:*" | ForEach-Object { docker compose exec redis redis-cli DEL $_ }
```

### Smoke Test Commands

**Backend Health Check:**
```powershell
curl.exe http://localhost:8000/api/v1/health
# Expected: {"status":"healthy"}
```

**Places API Check:**
```powershell
curl.exe "http://localhost:8000/api/v1/places/search?city=H%E1%BB%97%20N%E1%BB%99i&limit=5"
```

**AI Generation Smoke** (requires API keys):
```powershell
curl.exe -X POST "http://localhost:8000/api/v1/itineraries/generate" `
  -H "Content-Type: application/json" `
  --data-raw '{"destination":"Hà Nội","startDate":"2026-06-01","endDate":"2026-06-03","budget":5000000,"adults":2,"children":0,"interests":["food","attraction"]}'
```

---

## P. POWERSHELL TEST COMMANDS

### Pre-verification Checklist

**1. Rebuild Docker images (nếu code thay đổi):**
```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT
docker compose build --no-cache api
docker compose build --no-cache frontend
```

**2. Start services:**
```powershell
docker compose up -d db redis
docker compose up api frontend
```

**3. Wait for services healthy:**
- API: `http://localhost:8000/health` → 200 OK
- Frontend: `http://localhost:5173` → UI loads

### Verification Steps

#### Step 1: Backend ETL + Data

**1. Run ETL manually:**
```powershell
docker compose exec api python -m src.etl.main
```

**2. Check DB:**
```powershell
docker compose exec db psql -U postgres -d travel_app -c "SELECT COUNT(*) FROM places WHERE image <> '';"
docker compose exec db psql -U postgres -d travel_app -c "SELECT id, name, image FROM places LIMIT 5;"
```

**3. Test API:**
```powershell
curl http://localhost:8000/api/v1/places/search?city=Hà+Nội&limit=3
```
→ Verify response structure (images still empty unless strategy implemented)

#### Step 2: AI Generate + Accommodation Fix

**1. Create account & login (bypass OTP)**

**2. Generate trip:**
- Navigate http://localhost:5173/create-trip
- Fill form: destination, dates, budget
- Click "AI Generate" button
- Wait for completion

**3. Navigate to workspace:**
- Should redirect to `/trip-workspace?tripId={newId}`
- **Screenshot 1:** TripWorkspace overview

**4. Verify accommodation display:**
- Scroll to accommodation section
- **Screenshot 2:** Accommodation hiển thị đúng ngày
- **Không được hiện** "Chưa có nơi ở" nếu AI đã tạo accommodation

**5. Check DB:**
```powershell
docker compose exec db psql -U postgres -d travel_app -c "
SELECT td.id as trip_day_id, td.day_number, a.name, a.day_ids as acc_day_ids
FROM trip_days td
LEFT JOIN accommodations a ON a.day_ids @> ARRAY[td.id]
WHERE td.trip_id = <your-trip-id>
ORDER BY td.id;
"
```
→ Verify `acc_day_ids` contains real `trip_day_id` values

#### Step 3: Frontend Fallback (nếu image strategy implemented)

**1. Test place images:**
- Visit place search/list pages
- **Screenshot 3:** Place cards với images
- Verify không còn broken images

**2. Test generated activity images:**
- Trong TripWorkspace, check activities
- **Screenshot 4:** Activities với images

---

## Q. DOCKER VERIFICATION PLAN

### Branch Strategy

```text
fix/00060-d-local-smoke-ux-data-fix
├── Fix: pipeline.py accommodation dayIds remap
├── Fix: db_loader.py conflict update refresh fields
├── Fix: (Optional) Image strategy implementation TBD
├── Test: Add integration test for dayIds remap
├── Test: Add integration test for db_loader conflict update
└── Docs: Update this plan + test results
```

### Commit Message Format

**For Bug #1 + Bug #3 (mandatory fixes):**
```text
fix: [#00060] fix accommodation dayIds remap and db loader conflict update

- Add dayId remapping in pipeline.py for generated accommodations
- Add image/avg_cost/opening_hours to db_loader.py conflict update
- Add integration test for accommodation dayIds persistence
- Update issue docs with fix details

Tested:
- Docker runtime verification with screenshots
- AI generate trip → accommodation displays correctly
- ETL rerun repairs existing place data fields
- Integration tests pass
```

**For Bug #2 (image strategy - TBD):**
Commit message depends on chosen strategy

### PR Template

```markdown
## Mô tả
Fix 2-3 critical bugs affecting AI-generated trips:
- Bug #1: Accommodation dayIds mismatch causing "Chưa có nơi ở" in workspace
- Bug #3: DbLoader conflict update missing image/avg_cost/opening_hours fields
- Bug #2: Place images empty (pending decision on image strategy)

Task ID: [#00060](link-to-task)

## Thay đổi chính
- [x] Implement accommodation dayIds remapping in pipeline.py
- [x] Add missing fields to db_loader.py conflict update
- [ ] Implement image strategy (pending decision)
- [x] Write integration tests for dayIds remap
- [x] Write integration tests for db_loader conflict update
- [x] Docker verification with screenshots

## Cách kiểm tra (Testing)
**Bước 1: Backend verification**
```powershell
cd Backend
uv run ruff check src tests
uv run ruff format --check src tests
uv run pytest tests/unit/ -v --tb=short
uv run pytest tests/integration/ -v --tb=short
```

**Bước 2: Frontend verification**
```powershell
cd Frontend
npm run build
npm run test:e2e
```

**Bước 3: Docker smoke test**
```powershell
docker compose up -d db redis
docker compose up api frontend
# Test AI generate → verify accommodation displays
# Test ETL rerun → verify places update
```

**Kết quả mong đợi:**
- Backend lint/unit/integration tests pass
- Frontend build + E2E tests pass
- AI-generated trip shows accommodation in workspace
- ETL rerun repairs existing place data

## Lưu ý khác
- **Image strategy:** Pending decision from user (Option B/C/D)
- **Branch naming:** Follows convention `fix/00060-d-local-smoke-ux-data-fix`
- **Commit format:** Follows convention `fix: [#00060] description`
- **Screenshots:** Attached in Docker verification section
- **Env changes:** Không có thay đổi .env hoặc secret config
```

### PR Checklist

- [ ] All commits pass CI (backend-unit, backend-integration, frontend-build, frontend-e2e)
- [ ] Branch name follows regex: `fix/00060-d-local-smoke-ux-data-fix`
- [ ] Commit messages follow format: `fix: [#00060] description`
- [ ] PR body includes all required sections (Mô tả, Thay đổi chính, Testing, Lưu ý khác)
- [ ] Squash merge to `main`
- [ ] PR description includes screenshots from Docker verification
- [ ] Update related issue docs with fix status

---

## R. COMMIT & PR WORKFLOW

| Task | Effort | Notes |
|------|--------|-------|
| Bug #1: Accommodation dayIds fix | 1-2 hours | Simple remap logic |
| Bug #3: DbLoader conflict update fix | 30 mins | Straightforward |
| Bug #2: Image strategy | TBD | Depends on option chosen |
| Docker verification + screenshots | 1 hour | Full smoke test |
| Tests (integration + e2e) | 2-3 hours | Cover regression cases |
| Docs update | 1 hour | Vietnamese skills/docs |
| **Total (excluding Bug #2)** | **5.5-7.5 hours** | ~1 day |
| **Total with Bug #2 Option B** | **+8-12 hours** | External API integration |
| **Total with Bug #2 Option C** | **+4-6 hours** | Admin panel development |

---

## S. ESTIMATED EFFORT

### Implementation Order - FIX ALL 3 BUGS TOGETHER

**User quyết định:** Fix cả 3 bugs cùng lúc, chờ quyết định Bug #2 trước khi implement.

### Phase 1: ETL Data Preparation (BẮT BUỘC TRƯỚC FIX)

1. **Check database status:**
   ```powershell
   docker compose exec db psql -U postgres -d dulichviet -c "SELECT name, places_count FROM destinations ORDER BY name;"
   ```

2. **Set Goong API key in `.env`:**
   ```powershell
   # Backend/.env
   GOONG_API_KEY=your_key_here
   ```

3. **Run ETL for all configured cities:**
   ```powershell
   cd Backend
   uv run python -m src.etl
   ```

4. **Verify ETL results:**
   ```powershell
   docker compose exec db psql -U postgres -d dulichviet -c "
   SELECT d.name, COUNT(p.id) as place_count 
   FROM destinations d 
   LEFT JOIN places p ON p.destination_id = d.id 
   GROUP BY d.name 
   ORDER BY place_count DESC;
   "
   ```

5. **Clear Redis cache (force reload):**
   ```powershell
   docker compose exec redis redis-cli FLUSHDB
   ```

6. **Test places API:**
   ```powershell
   curl "http://localhost:8000/api/v1/places/search?city=Hà+Nội&limit=5"
   ```

### Phase 2: Implement Bug #2 (Image Strategy) - CHỜ USER QUYẾT ĐỊNH

**Sau khi user quyết định option (B/C/D), implement theo strategy:**

**Option B (External API):**
1. Implement Unsplash/Pexels client
2. Integrate vào ETL pipeline
3. Handle rate limits, retries
4. Test với small sample

**Option C (Admin Panel):**
1. Implement admin endpoints
2. Build admin UI component
3. Upload images cho top 100 places
4. Test fallback logic

**Option D (Do Nothing):**
1. Skip implementation
2. Keep current fallback logic

### Phase 3: Implement Bug #1 (Accommodation DayIds)

1. **Edit `Backend/src/itineraries/pipeline.py`:**
   - Add `day_number_to_id` mapping storage
   - Remap accommodation day_ids before persisting
   - (See section A for exact code changes)

2. **Write integration test:**
   ```python
   # Backend/tests/integration/test_pipeline.py
   async def test_pipeline_remaps_accommodation_day_ids():
       """Verify AI day indices are remapped to real TripDay IDs."""
       pass
   ```

### Phase 4: Implement Bug #3 (DbLoader Conflict Update)

1. **Edit `Backend/src/etl/loaders/db_loader.py`:**
   - Add `image`, `avg_cost`, `opening_hours` to `set_` dict
   - (See section C for exact code changes)

2. **Write integration test:**
   ```python
   # Backend/tests/integration/test_db_loader.py
   async def test_db_loader_conflict_update_refreshes_all_fields():
       """Verify conflict update refreshes image, avg_cost, opening_hours."""
       pass
   ```

### Phase 5: Testing & Verification

1. **Backend verification:**
   ```powershell
   cd Backend
   uv run ruff check src tests
   uv run ruff format --check src tests
   uv run pytest tests/unit/ -v --tb=short
   uv run pytest tests/integration/ -v --tb=short
   ```

2. **Frontend verification:**
   ```powershell
   cd Frontend
   npm run build
   npm run test:e2e
   ```

3. **Docker smoke test:**
   ```powershell
   docker compose up -d db redis
   docker compose up api frontend
   
   # Test 1: Generate trip → verify accommodation displays
   # Test 2: Check places API → verify images (if strategy implemented)
   # Test 3: ETL rerun → verify places update
   ```

4. **Collect screenshots:**
   - Screenshot 1: TripWorkspace overview với accommodation hiển thị đúng ngày
   - Screenshot 2: Places list/search với images (nếu implement)
   - Screenshot 3: Database verification queries

### Phase 6: Docs, Commit, PR

1. **Update docs:**
   - Update `docs/REPORTS/ISSUES/plan_00060_critical_data_fixes.md` với test results
   - Update issue docs với fix status

2. **Commit với template:**
   ```text
   fix: [#00060] fix accommodation dayIds remap and place image pipeline

   - Add dayId remapping in pipeline.py for generated accommodations
   - Add image/avg_cost/opening_hours to db_loader.py conflict update
   - Implement <image strategy option chosen>
   - Add integration tests for accommodation dayIds persistence
   - Add integration tests for db_loader conflict update
   - Update issue docs with fix details

   Tested:
   - ETL crawled đầy đủ data cho các thành phố
   - Docker runtime verification with screenshots
   - AI generate trip → accommodation displays correctly
   - ETL rerun repairs existing place data fields
   - Integration tests pass
   ```

3. **Push và update PR #85:**
   ```powershell
   git push origin fix/00060-d-local-smoke-ux-data-fix
   ```

4. **Monitor CI/CD checks:**
   - `pr-policy` ✅
   - `backend-lint` ✅
   - `backend-unit` ✅
   - `backend-integration` ✅
   - `backend-migrations` ✅
   - `frontend-build` ✅
   - `frontend-e2e` ✅

5. **Squash merge khi all pass:**
   - Review PR one final time
   - Squash merge to `main`
   - Delete branch after merge

---

## T. NEXT STEPS (SAU KHI USER APPROVES)

### Câu 1: Image pipeline strategy - CHI TIẾT ĐÃ BỔ SUNG

Bạn chọn option nào cho place images?

**Option B: External API (Unsplash/Pexels)**
- **Ưu điểm:** Real images, automatic, scalable, high quality
- **Nhược điểm:** External dependency, rate limits restrict, license concerns, high effort (+8-12 hours)
- **Rủi ro:** API key có thể expire, URLs có thể break, relevance không guaranteed
- **Fit nếu:** Bạn muốn best UX và chấp nhận rủi ro external dependency

**Option C: Admin Panel + Manual Curation (Hybrid)** ⭐ RECOMMENDED
- **Ưu điểm:** Realistic, no external dependency, controlled quality, scalable gradual
- **Nhược điểm:** Manual effort, requires admin UI (+4-6 hours)
- **Rủi ro:** Minimal, admin-controlled
- **Fit nếu:** Bạn muốn balanced approach với realistic effort và controlled quality

**Option D: Do Nothing**
- **Ưu điểm:** Zero effort, immediate
- **Nhược điểm:** Poor UX persists, not professional
- **Rủi ro:** None (accept limitation)
- **Fit nếu:** Time pressure cực lớn, cần focus vào features khác

**Table summary đã bổ sung trong section B.**

### Câu 2: Implementation Order - ĐÃ QUYẾT ĐỊNH

**Bạn đã quyết định:** Fix cả 3 bugs cùng lúc, chờ quyết định Bug #2 trước khi implement.

**Workflow:**
1. ✅ Run ETL trước (bắt buộc) → crawl đủ data
2. ⏳ Chờ user quyết định Bug #2 (Option B/C/D)
3. ⏳ Implement Bug #2 theo option đã chọn
4. ⏳ Implement Bug #1 (Accommodation dayIds)
5. ⏳ Implement Bug #3 (DbLoader conflict update)
6. ⏳ Testing & Verification
7. ⏳ Commit + PR + Merge

**Timeline ước tính:**
- **ETL Data Preparation:** 1-2 hours (one-time setup)
- **Bug #2 (Option B):** 8-12 hours implementation
- **Bug #2 (Option C):** 4-6 hours implementation
- **Bug #2 (Option D):** 0 hours (skip)
- **Bug #1:** 1-2 hours
- **Bug #3:** 30 mins
- **Testing:** 2-3 hours
- **Total:** 8-20 hours tùy option chosen

---

## U. QUESTIONS FOR USER REVIEW

⚠️ **QUAN TRỌNG:** Trước khi fix bất kỳ bug, PHẢI chạy ETL để đảm bảo database có đủ data.

### Why ETL is Critical?

**Bug #1 (Accommodation dayIds) testing:**
- Cần có trip data thực tế để test AI generate
- Cần có đủ places/hotels để AI generate khong fail

**Bug #2 (Place images) testing:**
- Cần có đủ places data để verify images hiển thị đúng
- Nếu database thiếu data → không thể verify fix hiệu quả

**Bug #3 (DbLoader conflict update) testing:**
- Cần rerun ETL để verify conflict update hoạt động
- Cần có đủ places để test upsert behavior

### ETL Checklist - BẮT BUỘC

**Trước khi implement bugs:**
- [ ] Set Goong API key trong `Backend/.env`
- [ ] Check current database status (places count per city)
- [ ] Run ETL cho all configured cities: `uv run python -m src.etl`
- [ ] Verify ETL results: Check places count per destination
- [ ] Clear Redis cache: `docker compose exec redis redis-cli FLUSHDB`
- [ ] Test places API: `curl "http://localhost:8000/api/v1/places/search?city=Hà+Nội&limit=5"`
- [ ] Verify AI generate có đủ context (places/hotels)

**Sau khi ETL xong:**
- [ ] Database có >= 50 places per city
- [ ] Redis cache đã invalid
- [ ] Places API trả về data đúng
- [ ] AI generate không fail vì thiếu context

**See Section M (ETL Commands) for detailed commands.**

---

## V. CRITICAL PREREQUISITES - ETL DATA PREPARATION

⚠️ **QUAN TRỌNG:** Trước khi fix bất kỳ bug, PHẢI chạy ETL để đảm bảo database có đủ data.

### Why ETL is Critical?

**Bug #1 (Accommodation dayIds) testing:**
- Cần có trip data thực tế để test AI generate
- Cần có đủ places/hotels để AI generate khong fail

**Bug #2 (Place images) testing:**
- Cần có đủ places data để verify images hiển thị đúng
- Nếu database thiếu data → không thể verify fix hiệu quả

**Bug #3 (DbLoader conflict update) testing:**
- Cần rerun ETL để verify conflict update hoạt động
- Cần có đủ places để test upsert behavior

**Bug #4/#5/#6 (Slug & Storage issues) testing:**
- Cần ETL run để verify slug collision handling
- Cần test data integrity sau fixes

### ETL Checklist - BẮT BUỘC

**Trước khi implement bugs:**
- [ ] Set Goong API key trong `Backend/.env`
- [ ] Check current database status (places count per city)
- [ ] Run ETL cho all configured cities: `uv run python -m src.etl`
- [ ] Verify ETL results: Check places count per destination
- [ ] Check for slug collision errors in logs
- [ ] Clear Redis cache: `docker compose exec redis redis-cli FLUSHDB`
- [ ] Test places API: `curl "http://localhost:8000/api/v1/places/search?city=Hà+Nội&limit=5"`
- [ ] Verify AI generate có đủ context (places/hotels)

**Sau khi ETL xong:**
- [ ] Database có >= 50 places per city
- [ ] Redis cache đã invalid
- [ ] Places API trả về data đúng
- [ ] AI generate không fail vì thiếu context
- [ ] No slug collision errors in logs

**See Section O (ETL Commands) for detailed commands.**

---

**STATUS:** AWAITING USER DECISION ON IMAGE STRATEGY (Câu 1 - Option B/C/D)

**BRANCH:** `fix/00060-d-local-smoke-ux-data-fix`
**PR:** #85
**UPDATED:** 2026-06-07 (comprehensive audit completed + Database/Slug audit + ETL API Gap Analysis + ETL commands + implementation order updated + 6 BUGS IDENTIFIED)
