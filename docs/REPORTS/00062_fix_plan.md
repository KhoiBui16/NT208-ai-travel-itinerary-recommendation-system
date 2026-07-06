# KE HOACH FIX BUGS TOAN DIEN - TRUOC PHASE C3/C4

**Ngay tao:** 2026-06-09
**Branch base:** `main` (commit 7fc02f8)
**Nguon audit:** 7 sub-agents (PostgreSQL, Redis, ORM, BE API, FE Flow, AI Pipeline, Data Flow)
**Tong bugs phat hien:** 23 issues (4 P0, 8 P1, 11 P2)

---

## TAI SAO TEST HIEN TAI KHONG PHAT HIEN BUGS?

Day la cau hoi quan trong nhat. Tests hien tai (175+ unit + integration) PASS 100% nhung khong bat duoc bugs vi 3 ly do:

### 1. Test chi test happy path, khong test data integrity

```python
# Vi du: test_update_trip chi kiem tra status 200
async def test_update_trip():
    response = await client.put(f"/api/v1/itineraries/{trip_id}", json={...})
    assert response.status_code == 200  # PASS!
    # NHUNG khong kiem tra travelerInfo thuc su duoc update trong DB
    # NHUNG khong kiem tra extraExpenses co mat trong response
```

### 2. Test dung mock, khong dung DB that

```python
# Vi du: test_place_service dung mock repo
mock_repo.get_destination_by_name.return_value = dest
# → Luon tra ve ket qua, khong test truong hop "Ha Noi" vs "Hà Nội"
# → Khong test fuzzy matching vi mock khong co logic nay
```

### 3. Test khong verify response data match FE expectation

```python
# Vi du: test_add_activity khong kiem tra extra_expenses
response = await client.post(f"/activities?day_id={day_id}", json={...})
assert response.status_code == 200
# KHONG KIEM TRA: response.json()["extraExpenses"] == []
# → BUG-BE-002: extraExpenses luon tra ve [] nhung test khong bat duoc
```

### Giai phap testing moi (xem phan TEST PLAN o cuoi moi bug)

---

## BRANCH 1: `fix/00062-d-be-data-contract-fixes`

**Bugs gom:** BUG-BE-001, BUG-BE-002, BUG-BE-003
**Uu tien:** P1 (NEN FIX DAU TIEN - 3 bugs BE xuat phat tu data contract)
**Uoc tinh:** 2-3 gio

---

### BUG-BE-001: `travelerInfo` va `totalCost` khong duoc update khi save

#### Ly do loi (Root Cause)

**Day la loi contract mismatch giua FE va BE.**

FE gui object `travelerInfo: { adults: 2, children: 1, total: 3 }` trong PUT request,
nhung BE schema `UpdateTripRequest` KHONG CO field `travelerInfo`.

**Luong du lieu bi gian doan:**

```
FE (TripWorkspace.tsx)
  → gui PUT /itineraries/{id} voi body:
    { tripName: "Ha Noi 3 ngay", travelerInfo: { adults: 2, children: 1, total: 3 }, days: [...] }
        ↓
BE (router.py)
  → Parse body vao UpdateTripRequest
  → UpdateTripRequest chi co: trip_name, budget, days, accommodations
  → travelerInfo BI BO QUA (khong co field nhan)
        ↓
BE (service.py line 174-178)
  → Chi update trip_name va budget
  → adults_count va children_count KHONG DUOC UPDATE
        ↓
DB: adults_count = 1, children_count = 0 (gia tri cu)
        ↓
BE response: travelerInfo = { adults: 1, children: 0, total: 1 } (SAI!)
```

**Tai sao DB khong co column `traveler_info`?**
Vi `travelerInfo` la **computed field** - duoc tinh tu `adults_count + children_count` trong response serialization:
```python
# service.py line 808-812
traveler_info = TravelerInfo(
    adults=trip.adults_count,     # DB column
    children=trip.children_count,  # DB column
    total=trip.adults_count + trip.children_count,
)
```

**Vay bug nam o dau?** O BE schema `UpdateTripRequest` thieu field de NHAN `travelerInfo` tu FE, roi map no sang `adults_count` va `children_count`.

#### Vi tri code can sua

**File 1:** `Backend/src/itineraries/schemas.py` line 206-218
```python
# HIEN TAI
class UpdateTripRequest(CamelCaseModel):
    trip_name: str | None = None
    budget: int | None = Field(default=None, gt=0)
    days: list[DaySchema] | None = None
    accommodations: list[AccommodationSchema] | None = None
    # ❌ THIEU traveler_info

# CAN SUA THANH
class UpdateTripRequest(CamelCaseModel):
    trip_name: str | None = None
    budget: int | None = Field(default=None, gt=0)
    traveler_info: TravelerInfo | None = None  # ✅ THEM FIELD NAY
    days: list[DaySchema] | None = None
    accommodations: list[AccommodationSchema] | None = None
```

**File 2:** `Backend/src/itineraries/service.py` line 174-178
```python
# HIEN TAI (line 174-178)
if data.trip_name is not None:
    trip.trip_name = data.trip_name
if data.budget is not None:
    trip.budget = data.budget
# ❌ KHONG CO xu ly traveler_info

# CAN SUA THANH (them sau line 178)
if data.traveler_info is not None:
    trip.adults_count = data.traveler_info.adults
    trip.children_count = data.traveler_info.children
```

#### Cach test moi

```bash
# Test 1: Verify travelerInfo update qua curl
curl -X PUT http://localhost:8000/api/v1/itineraries/{trip_id} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"travelerInfo": {"adults": 3, "children": 2, "total": 5}}'

# KIEM TRA: response.travelerInfo.adults == 3
# KIEM TRA: response.travelerInfo.children == 2
# KIEM TRA: DB: SELECT adults_count, children_count FROM trips WHERE id = {trip_id}

# Test 2: Verify totalCost recalculate sau khi update travelerInfo
# totalCost nen thay doi neu adult_price/child_price cua activities khac 0

# Test 3: Verify FE hien thi dung so nguoi
# Mo TripWorkspace → thay doi so nguoi → save → reload → kiem tra
```

**Test unit can them:**
```python
async def test_update_traveler_info():
    """Verify PUT /itineraries/{id} updates adults_count and children_count."""
    response = await client.put(
        f"/api/v1/itineraries/{trip_id}",
        json={"travelerInfo": {"adults": 3, "children": 2, "total": 5}},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["travelerInfo"]["adults"] == 3
    assert data["travelerInfo"]["children"] == 2

    # Verify DB level
    trip = await session.get(Trip, trip_id)
    assert trip.adults_count == 3
    assert trip.children_count == 2
```

---

### BUG-BE-002: `extraExpenses` bi mat trong single activity response

#### Ly do loi (Root Cause)

**Day la loi inconsistent serialization - 2 duong dan khac nhau cho cung 1 data.**

BE co 2 cach serialize activity:
1. **`_to_response()` (line 729)**: Serialize ca trip → **DUNG** (co extra_expenses)
2. **`_activity_to_schema()` (line 704)**: Serialize 1 activity → **SAI** (hardcode `[]`)

**Tai sao lai hardcode `[]`?**
Vi khi method `_activity_to_schema()` duoc viet, tac gia muon tranh lazy-load issue:
- Activity duoc fetch don le khong co `selectinload(Activity.extra_expenses)`
- Nen `activity.extra_expenses` se trigger lazy-load query (them 1 query moi)
- De tranh risk, hardcode `[]` - nhung dieu nay lam mat data!

**Luong du lieu bi gian doan:**

```
FE: Tao activity voi extraExpenses: [{name: "Drink", amount: 20000}]
  → POST /activities?day_id=123
        ↓
BE: add_activity() luu activity + extra_expenses vao DB (OK)
  → Nhung response goi _activity_to_schema()
  → _activity_to_schema() tra ve extra_expenses: [] (HARDCODE!)
        ↓
FE nhan response: { extraExpenses: [] } (MAT DATA!)
  → FE cap nhat local state = [] (XOA du lieu vua nhap!)
        ↓
Lan save tiep theo: FE gui extraExpenses: [] (DA MAT DU LIEU GOC)
```

#### Vi tri code can sua

**File:** `Backend/src/itineraries/service.py` line 704-727

```python
# HIEN TAI (line 726)
extra_expenses=[],  # ❌ HARDCODE EMPTY

# CAN SUA THANH
extra_expenses=[
    ExtraExpenseSchema(
        id=e.id,
        name=e.name,
        amount=e.amount,
        category=e.category,
    )
    for e in activity.extra_expenses
],
```

**NHUNG:** Can dam bao activity duoc fetch VOI `selectinload(Activity.extra_expenses)` truoc khi goi `_activity_to_schema()`.

**File can them eager load:** `Backend/src/itineraries/repository.py`
Tim cac method fetch single activity va them `selectinload(Activity.extra_expenses)`.

#### Cach test moi

```bash
# Test 1: Tao activity voi extra expenses, verify response
curl -X POST "http://localhost:8000/api/v1/itineraries/{trip_id}/activities?day_id={day_id}" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "An trua",
    "time": "12:00",
    "extraExpenses": [
      {"name": "Nuoc ngot", "amount": 20000, "category": "food"}
    ]
  }'

# KIEM TRA: response.extraExpenses KHAC []
# KIEM TRA: response.extraExpenses[0].name == "Nuoc ngot"
# KIEM TRA: response.extraExpenses[0].amount == 20000

# Test 2: Verify full trip response cung co extraExpenses
curl http://localhost:8000/api/v1/itineraries/{trip_id}
# KIEM TRA: days[0].activities[0].extraExpenses khac []
```

---

### BUG-BE-003: Destination detail lookup fail voi 404

#### Ly do loi (Root Cause)

**Day la loi thieu fuzzy matching.** Place service chi co 2 strategies:
1. Exact match: `Destination.name == name` (case-sensitive!)
2. Slug match: `Destination.slug == slug`

NHUNG AI pipeline co 3 strategies (bao gom fuzzy ILIKE). Place service thieu strategy thu 3.

**Vi du that:**

```
DB: destinations.name = "Hà Nội", destinations.slug = "ha-noi"

User gui: GET /destinations/Ha Noi
  → exact_match("Ha Noi") → "Ha Noi" != "Hà Nội" → None
  → slug_match("Ha Noi") → "Ha Noi" != "ha-noi" → None
  → ❌ 404 Not Found!

User gui: GET /destinations/ha-noi
  → exact_match("ha-noi") → "ha-noi" != "Hà Nội" → None
  → slug_match("ha-noi") → "ha-noi" == "ha-noi" → ✅ OK!

User gui: GET /destinations/Hà Nội
  → exact_match("Hà Nội") → "Hà Nội" == "Hà Nội" → ✅ OK!
```

**Van de:** FE Home.tsx gui destination name (co dau tieng Viet) cho detail page,
nhung URL co the bi normalize thanh "Ha Noi" (khong dau) → 404.

#### Vi tri code can sua

**File 1:** `Backend/src/places/repository.py` line 94-98
```python
# HIEN TAI
async def get_destination_by_name(self, name: str) -> Destination | None:
    stmt = select(Destination).where(Destination.name == name)  # CASE-SENSITIVE!
    result = await self.session.execute(stmt)
    return result.scalar_one_or_none()

# CAN SUA: Them case-insensitive match
async def get_destination_by_name(self, name: str) -> Destination | None:
    from sqlalchemy import func
    stmt = select(Destination).where(func.lower(Destination.name) == name.lower())
    result = await self.session.execute(stmt)
    return result.scalar_one_or_none()
```

**File 2:** `Backend/src/places/service.py` line 86-106
```python
# HIEN TAI: Chi 2 strategies
dest = await self.repo.get_destination_by_name(name)
if not dest:
    dest = await self.repo.get_destination_by_slug(name)
if not dest:
    raise NotFoundException("Destination not found")

# CAN SUA: Them fuzzy fallback (giong AI pipeline)
dest = await self.repo.get_destination_by_name(name)
if not dest:
    dest = await self.repo.get_destination_by_slug(name)
if not dest:
    # Strategy 3: Fuzzy ILIKE (giong resolve_destination_for_ai)
    dest = await self.repo.get_destination_by_fuzzy(name)
if not dest:
    raise NotFoundException("Destination not found")
```

**File 3:** `Backend/src/places/repository.py` - Them method moi
```python
async def get_destination_by_fuzzy(self, name: str) -> Destination | None:
    """Fuzzy match destination name using ILIKE."""
    from sqlalchemy import func
    stmt = (
        select(Destination)
        .where(Destination.name.ilike(f"%{name}%"))
        .order_by(Destination.places_count.desc())
        .limit(1)
    )
    result = await self.session.execute(stmt)
    return result.scalar_one_or_none()
```

#### Cach test moi

```bash
# Test 1: Exact match (co dau) - PHAI OK
curl http://localhost:8000/api/v1/places/destinations/H%C3%A0%20N%E1%BB%99i
# Expected: 200 + destination data

# Test 2: Case-insensitive (khong dau, hoa/thuong) - HIEN TAI FAIL
curl http://localhost:8000/api/v1/places/destinations/Ha%20Noi
# Expected: 200 (SAU FIX), hien tai: 404

# Test 3: Slug match - PHAI OK
curl http://localhost:8000/api/v1/places/destinations/ha-noi
# Expected: 200

# Test 4: Fuzzy match (mot phan ten) - HIEN TAI FAIL
curl http://localhost:8000/api/v1/places/destinations/Ho%20Chi%20Minh
# Expected: 200 (SAU FIX), hien tai: 404 (vi DB la "TP. Ho Chi Minh")

# Test 5: FE end-to-end
# Mo Home → click "Ha Noi" → PHAI navigate thanh cong den CityDetail page
```

---

## BRANCH 2: `fix/00062-d-fe-error-handling-fixes`

**Bugs gom:** BUG-FE-007 (P0), BUG-FE-002, BUG-FE-004, BUG-FE-005 (P1)
**Uu tien:** P0 + P1
**Uoc tinh:** 2-3 gio

---

### BUG-FE-007: `useTripSync.ts` line 188 - Empty catch block (P0)

#### Ly do loi (Root Cause)

**Day la loi CRITICAL vi no anh huong toan bo viec save itinerary.**

Khi BE tra loi loi (401, 500, timeout), FE khong bao cho user biet. User nghi save thanh cong nhung thuc te du lieu KHONG DUOC LUU.

```typescript
// useTripSync.ts line 188
} catch (error) {}  // ❌ EMPTY! Khong co toast, khong co log, khong co revert
```

**Dong thoi, useActivityManager.ts cung co 3 cho tuong tu:**

```typescript
// useActivityManager.ts line 63
itineraryService.deleteActivity(tripId, actId).catch(() => {
  // Chi revert UI, KHONG bao cho user biet
});

// useActivityManager.ts line 145
itineraryService.updateActivity(tripId, editingActivity).catch(() => {
  // Chi revert UI, KHONG bao cho user biet
});

// useActivityManager.ts line 197
}).catch(() => {
  // Chi revert UI, KHONG bao cho user biet
});
```

#### Vi tri code can sua

**File 1:** `Frontend/src/app/hooks/trips/useTripSync.ts` line 188
```typescript
// HIEN TAI
} catch (error) {}

// CAN SUA THANH
} catch (error) {
  console.error("[useTripSync] Save failed:", error);
  toast.error("Khong the luu lich trinh. Thu lai sau.", {
    position: "top-right",
    duration: 5000,
  });
}
```

**File 2:** `Frontend/src/app/hooks/trips/useActivityManager.ts` line 63, 145, 197

Them toast error cho moi catch block:
```typescript
// Line 63
itineraryService.deleteActivity(tripId, actId).catch(() => {
  // ... existing revert logic ...
  toast.error("Khong the xoa hoat dong. Thu lai sau.");
});

// Line 145
}).catch(() => {
  // ... existing revert logic ...
  toast.error("Khong the cap nhat hoat dong. Thu lai sau.");
});

// Line 197
}).catch(() => {
  // ... existing revert logic ...
  toast.error("Khong the them hoat dong. Thu lai sau.");
});
```

#### Cach test moi

```bash
# Test 1: Ngat BE va thu save
# 1. Mo TripWorkspace, edit activity
# 2. Stop BE: docker stop nt208-ai-travel-itinerary-recommendation-system-api-1
# 3. Click Save
# 4. KIEM TRA: Phai hien toast error "Khong the luu lich trinh"

# Test 2: BE tra 500
# 1. Trigger BE error (vi du: edit trip cua user khac)
# 2. KIEM TRA: Phai hien toast error

# Test 3: Network timeout
# 1. Mo DevTools → Network → Offline mode
# 2. Thu save
# 3. KIEM TRA: Phai hien toast error
```

---

### BUG-FE-002: TripWorkspace - Khong co loading state khi save

#### Ly do loi

Khi user click save, khong co visual feedback. User co the click nhieu lan (double-submit).

**File:** `Frontend/src/app/pages/TripWorkspace.tsx`

Can them:
1. `isSaving` state
2. Loading spinner tren save button
3. Disable save button khi dang save

#### Cach fix

```typescript
// Them state
const [isSaving, setIsSaving] = useState(false);

// Trong handleSaveItinerary
const handleSaveItinerary = async () => {
  if (isSaving) return; // Prevent double-submit
  setIsSaving(true);
  try {
    await saveTrip();
    toast.success("Da luu lich trinh");
  } catch (error) {
    toast.error("Khong the luu lich trinh");
  } finally {
    setIsSaving(false);
  }
};

// Save button
<button disabled={isSaving}>
  {isSaving ? "Dang luu..." : "Luu"}
</button>
```

---

### BUG-FE-004: DailyItinerary - Silent load errors

#### Ly do loi

Khi load trip data that bai, FE chi `console.error` ma khong hien thi gi cho user.
User thay trang trong va khong biet la loi.

**File:** `Frontend/src/app/pages/DailyItinerary.tsx` line 133, 146

```typescript
// HIEN TAI
} catch (error) {
  console.error("Error loading trip data:", error);
  // ❌ Khong co UI feedback
}

// CAN SUA
} catch (error) {
  console.error("Error loading trip data:", error);
  setLoadError("Khong the tai lich trinh. Vui long tai lai trang.");
}
// Them UI: if (loadError) return <ErrorState message={loadError} onRetry={reload} />
```

---

### BUG-FE-005: SavedPlaces - Empty catch blocks

#### Ly do loi

4 cho trong SavedPlaces.tsx co empty catch. User tuong save/unsave thanh cong nhung that ra that bai.

**File:** `Frontend/src/app/pages/SavedPlaces.tsx` line 61, 72, 75, 87

```typescript
// HIEN TAI (line 72, 75)
placesService.savePlace(place.placeId).catch(() => {});
placesService.unsavePlace(savedId).catch(() => {});

// CAN SUA
placesService.savePlace(place.placeId).catch(() => {
  // Revert UI
  setSavedLocations(prev =>
    prev.map(loc =>
      loc.savedId === savedId ? { ...loc, isBookmarked: place.isBookmarked } : loc
    )
  );
  toast.error("Khong the luu dia diem. Thu lai sau.");
});
```

---

## BRANCH 3: `fix/00062-d-ai-pipeline-timeout-perf`

**Bugs gom:** BUG-BE-004, PERF-01, PERF-02
**Uu tien:** P0 + Performance
**Uoc tinh:** 3-4 gio

---

### BUG-BE-004: AI generate tra 503 "failed validation" (P0)

#### Ly do loi (CAN INVESTIGATE)

AI generate tra 503 khi validation that bai sau khi LLM response. Nguyen nhân có thể là:

1. **GEMINI_API_KEY het quota hoac khong hop le**
2. **LLM response khong pass Pydantic validation** (JSON structure sai)
3. **Place IDs trong LLM response khong ton tai trong DB**
4. **Day count khong khop giua request va LLM response**

**De investigate, can:**

```bash
# Step 1: Check API logs
docker compose logs api --tail 100 | grep -i "generate\|pipeline\|validation\|gemini"

# Step 2: Test Gemini API key truc tiep
docker exec nt208-ai-travel-itinerary-recommendation-system-api-1 python -c "
import google.genai as genai
client = genai.Client(api_key='YOUR_KEY')
response = client.models.generate_content(
    model='gemini-2.5-flash',
    contents='Say hello',
)
print(response.text)
"

# Step 3: Test generate voi curl va xem full error
curl -X POST http://localhost:8000/api/v1/itineraries/generate \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "Ha Noi",
    "budget": 5000000,
    "startDate": "2026-07-01",
    "endDate": "2026-07-03",
    "interests": ["food", "culture"],
    "adults": 2,
    "children": 0
  }' -v 2>&1
```

#### Cach fix (sau khi identify root cause)

Neu la **API key issue:** Update `.env`
Neu la **validation issue:** Relax validation hoac improve prompt
Neu la **place IDs:** Improve place ID mapping trong pipeline

**Khong the fix chua cho den khi investigate xong. Day la P0 vi toan bo AI feature khong hoat dong.**

---

### PERF-01: Pipeline eager loading re-fetch (30-40% persistence overhead)

#### Ly do loi

Pipeline insert data xong, sau do **re-fetch toan bo tu DB** bang `get_with_full_data()` - day la 1 query phuc tap voi 6 join va eager loading.

**Tai sao?** Tac gia muon dam bao response du lieu "fresh" tu DB (co timestamps tu DB, etc.)

**File:** `Backend/src/itineraries/pipeline.py` line 515-522

```python
# HIEN TAI
await self.session.flush()
trip_id = trip.id
self.session.expire_all()  # ❌ XOA toan bo in-memory data!
refreshed = await self.repo.get_with_full_data(trip_id)  # ❌ Re-fetch tu DB!
if not refreshed:
    raise ServiceUnavailableException("...")
return refreshed

# CAN SUA (don gian hon)
await self.session.flush()
await self.session.refresh(trip)
return trip
# HOAC: await self.repo.get_with_full_data(trip_id) ma khong expire_all()
```

**Canh bao:** Can kiem tra FE co phu thuoc vao DB-generated timestamps (created_at, updated_at) khong.
Neu co, giu lai `get_with_full_data()` nhung bo `expire_all()`.

---

### PERF-02: Fixed context size (luon 15 places)

#### Ly do loi

Pipeline luon fetch 15 places va 4 hotels cho moi trip, bat ke trip ngan hay dai.
Trip 1 ngay khong can 15 places, nhung van fetch het → prompt lon hon can thiet → LLM cham hon.

**File:** `Backend/src/itineraries/pipeline.py` line 168-220

```python
# HIEN TAI
places = await self.repo.search_places_for_ai(
    destination_id,
    categories=categories,
    limit=MAX_CONTEXT_PLACES,  # LUON 15
)

# CAN SUA: Dynamic context
def _calculate_context_limits(day_count: int) -> tuple[int, int]:
    if day_count <= 3:
        return 8, 2   # Short trip: 8 places, 2 hotels
    elif day_count <= 7:
        return 12, 3  # Medium trip: 12 places, 3 hotels
    else:
        return 15, 4  # Long trip: 15 places, 4 hotels
```

---

## BRANCH 4: `fix/00062-d-db-data-quality`

**Bugs gom:** DB-DATA-01, DB-DATA-02, DB-DATA-05
**Uu tien:** P1
**Uoc tinh:** 2-3 gio

---

### DB-DATA-01: 311/420 trips (74%) khong co trip_days (P1 - URGENT)

#### Ly do loi

Day la van de data quality lon nhat trong he thong. 74% trips trong DB khong co trip_days nao.

**Nguyen nhân có thể là:**
1. Test data duoc seed truc tiep vao table `trips` ma khong tao `trip_days`
2. Guest trips duoc tao nhung pipeline chay that bai truoc khi tao trip_days
3. Trips duoc tao bang `POST /itineraries` (manual create) nhung khong tao trip_days

**NHUNG:** Day co the la EXPECTED behavior neu nhung trips la test data hoac draft trips.
Can investigate them truoc khi fix.

**Cach kiem tra:**
```sql
-- Check nao la test trips vs real trips
SELECT t.id, t.trip_name, t.destination, t.start_date, t.user_id,
       (SELECT count(*) FROM trip_days td WHERE td.trip_id = t.id) as day_count
FROM trips t
WHERE NOT EXISTS (SELECT 1 FROM trip_days td WHERE td.trip_id = t.id)
ORDER BY t.created_at DESC
LIMIT 20;
```

**Neu la test data:** Khong can fix, nhung nen clean up.
**Neu la real data:** Can seed trip_days dua tren start_date, end_date.

---

### DB-DATA-02: 22/64 accommodations (34%) co day_ids rong

#### Ly do loi

Migration `20260608_0006` da fix cho 40 accommodations, nhung 22 accommodations van co `day_ids=[]`.

**Nguyen nhân có thể là:**
1. Accommodations duoc tao manual (khong qua AI pipeline)
2. Accommodations tao sau migration
3. Guest-created accommodations

**Cach fix:** Can them logic trong `_sync_accommodations()` de auto-populate day_ids.

---

### DB-DATA-05: 89% trips total_cost = 0

#### Ly do loi

`total_cost` chi duoc tinh khi user SAVE itinerary qua `PUT /itineraries/{id}`.
AI-generated trips co the khong duoc re-calculate total_cost.

**Cach fix:** Chay 1 SQL migration de re-calculate total_cost cho tat ca trips:
```sql
UPDATE trips SET total_cost = (
    SELECT COALESCE(SUM(
        COALESCE(a.adult_price, 0) + COALESCE(a.child_price, 0) +
        COALESCE(a.custom_cost, 0) + COALESCE(a.bus_ticket_price, 0) +
        COALESCE(a.taxi_cost, 0)
    ), 0)
    FROM trip_days td
    JOIN activities a ON a.trip_day_id = td.id
    WHERE td.trip_id = trips.id
);
```

---

## BRANCH 5: `fix/00062-d-redis-config-hardening`

**Bugs gom:** REDIS-01, REDIS-02
**Uu tien:** P2
**Uoc tinh:** 1-2 gio

---

### REDIS-01: Khong co maxmemory limit

#### Ly do loi

`docker-compose.yml` khong cau hinh `maxmemory` cho Redis. Neu cache tang qua lon,
Redis co the an het RAM va crash toan he thong.

**Fix:** Update `docker-compose.yml`
```yaml
redis:
  image: redis:7-alpine
  command: redis-server --maxmemory 128mb --maxmemory-policy allkeys-lru
```

### REDIS-02: Cache inconsistency sau ETL

#### Ly do loi

ETL pipeline cap nhat places/hotels trong DB nhung KHONG xoa cache trong Redis.
User co the thay data cu trong 24 gio (cho den khi cache TTL het han).

**Fix:** Them cache invalidation trong ETL loader.

---

## THU TU TRIEN KHAI

| Thu tu | Branch | Bugs | Thoi gian | Risk |
|--------|--------|------|-----------|------|
| 1 | `fix/00062-d-be-data-contract-fixes` | BUG-BE-001, 002, 003 | 2-3h | LOW |
| 2 | `fix/00062-d-fe-error-handling-fixes` | BUG-FE-007, 002, 004, 005 | 2-3h | LOW |
| 3 | `fix/00062-d-ai-pipeline-timeout-perf` | BUG-BE-004, PERF-01, 02 | 3-4h | MEDIUM |
| 4 | `fix/00062-d-db-data-quality` | DB-DATA-01, 02, 05 | 2-3h | LOW |
| 5 | `fix/00062-d-redis-config-hardening` | REDIS-01, 02 | 1-2h | LOW |

**Tong cong: 10-15 gio**

Branch 1 va 2 co the lam song song (BE va FE doc lap).
Branch 3 can investigate BUG-BE-004 truoc khi fix.
Branch 4 can investigate DB-DATA-01 truoc khi fix.
Branch 5 co the defer.

---

## TEST PLAN CHUNG - CACH TEST MOI

### Nguyen tac test moi

1. **Test voi DB that** - Chay test chong DB that (khong mock DB)
2. **Verify response data** - Khong chi check status code, kiem tra tung field
3. **Test voi du lieu tieng Viet** - "Ha Noi", "Hà Nội", "ha-noi"
4. **Test error scenarios** - Ngat BE, Redis, timeout
5. **Test end-to-end** - Tu FE browser den BE API den DB

### Checklist test cho moi branch

```bash
# === Branch 1: BE Data Contract Fixes ===

# 1. Run existing tests (phai van pass)
cd Backend && uv run pytest tests/ -v --tb=short

# 2. Test BUG-BE-001: travelerInfo update
curl -X PUT http://localhost:8000/api/v1/itineraries/{trip_id} \
  -H "Authorization: Bearer {token}" \
  -d '{"travelerInfo": {"adults": 3, "children": 2, "total": 5}}'
# Verify: response.travelerInfo.adults == 3

# 3. Test BUG-BE-002: extraExpenses in response
curl -X POST "http://localhost:8000/api/v1/itineraries/{trip_id}/activities?day_id={day_id}" \
  -H "Authorization: Bearer {token}" \
  -d '{"name":"Test","time":"12:00","extraExpenses":[{"name":"Drink","amount":20000,"category":"food"}]}'
# Verify: response.extraExpenses.length > 0

# 4. Test BUG-BE-003: Destination fuzzy match
curl http://localhost:8000/api/v1/places/destinations/Ha%20Noi
# Verify: 200 (khong phai 404)

# 5. Lint check
uv run ruff check src tests && uv run ruff format --check src tests


# === Branch 2: FE Error Handling Fixes ===

# 1. Build FE
cd Frontend && npm run build

# 2. E2E tests
npm run test:e2e

# 3. Manual test: Stop BE → try save → verify toast error appears

# 4. Manual test: Open TripWorkspace → edit → verify loading spinner on save


# === Branch 3: AI Pipeline ===

# 1. Check API logs for generate errors
docker compose logs api --tail 200 | grep -i "generate\|pipeline\|validation"

# 2. Test generate voi curl
curl -X POST http://localhost:8000/api/v1/itineraries/generate \
  -H "Authorization: Bearer {token}" \
  -d '{"destination":"Ha Noi","budget":5000000,"startDate":"2026-07-01","endDate":"2026-07-03","interests":["food"],"adults":2,"children":0}'
# Verify: 200 with itinerary data (not 503)


# === Branch 4: DB Data Quality ===

# 1. Check trip_days missing
docker exec nt208-ai-travel-itinerary-recommendation-system-db-1 psql -U postgres -d travel_itinerary -c \
  "SELECT count(*) FROM trips WHERE NOT EXISTS (SELECT 1 FROM trip_days td WHERE td.trip_id = trips.id);"

# 2. Check accommodations with empty day_ids
docker exec nt208-ai-travel-itinerary-recommendation-system-db-1 psql -U postgres -d travel_itinerary -c \
  "SELECT count(*) FROM accommodations WHERE day_ids = '[]'::jsonb;"
```

---

## SUCCESS CRITERIA

### Bat buoc truoc C3/C4
- [ ] BUG-BE-001 fixed: travelerInfo update duoc
- [ ] BUG-BE-002 fixed: extraExpenses co trong response
- [ ] BUG-BE-003 fixed: Destination lookup khong con 404
- [ ] BUG-FE-007 fixed: Catch blocks co error notification
- [ ] BUG-BE-004 investigated va fixed (AI generate hoat dong)
- [ ] Tat ca 175+ existing tests van PASS
- [ ] Lint check PASS

### Khuyen nghi
- [ ] BUG-FE-002/004/005 fixed: Loading states va error toasts
- [ ] PERF-01/02 fixed: Pipeline faster
- [ ] DB-DATA-01 investigated: Trip days data quality
- [ ] REDIS-01 fixed: Memory limit

---

**Plan created:** 2026-06-09
**Author:** Claude Code (comprehensive audit)
**Status:** CHO REVIEW - User can kiem tra truoc khi trien khai
