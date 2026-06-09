# BÁO CÁO KIỂM TRA ORM AUDIT - SQLAlchemy Models vs Database Schema

**Ngày tạo:** 2026-06-09  
**Phạm vi:** Toàn bộ SQLAlchemy ORM models so với actual database schema  
**Mục tiêu:** Xác định mapping bugs, missing columns, type conflicts, và relationship errors

---

## 1. DANH SÁCH MODELS

### 1.1 Auth Domain (`src/auth/models.py`)

| Model | Table Name | Số lượng fields | Relationships |
|-------|-----------|-----------------|---------------|
| `User` | `users` | 13 | trips, saved_places, refresh_tokens, chat_sessions |
| `RefreshToken` | `refresh_tokens` | 6 | user |

**Field highlights:**
- `User.interests`: JSON column → Python `list[str]`
- `User.password_reset_token_hash`: Optional, indexed
- `User.password_reset_expires_at`: Optional DateTime
- Missing field: **KHÔNG CÓ `traveler_info` column trong table users**

### 1.2 Itineraries Domain (`src/itineraries/models/`)

#### 1.2.1 Core Trip Models (`trip.py`)

| Model | Table Name | Số lượng fields | Relationships |
|-------|-----------|-----------------|---------------|
| `Trip` | `trips` | 14 | days, accommodations, rating, share_link, claim_tokens, chat_sessions, user |
| `TripDay` | `trip_days` | 6 | trip, activities, extra_expenses |
| `Activity` | `activities` | 16 | trip_day, place, extra_expenses |
| `ExtraExpense` | `extra_expenses` | 6 | activity (nullable), trip_day (nullable) |

**Field highlights:**
- `Trip.interests`: JSON column → Python `list[str]`
- `Trip.adults_count`, `Trip.children_count`: Integer fields
- `Trip.total_cost`: Integer field (calculated)
- **KHÔNG CÓ `traveler_info` column trong table trips** 
- **KHÔNG CÓ `travelerInfo` field trong Trip model**

#### 1.2.2 Auxiliary Models (`extras.py`)

| Model | Table Name | Số lượng fields | Relationships |
|-------|-----------|-----------------|---------------|
| `Accommodation` | `accommodations` | 11 | trip, hotel (optional) |
| `ShareLink` | `share_links` | 9 | trip, created_by_user |
| `TripRating` | `trip_ratings` | 5 | trip |
| `GuestClaimToken` | `guest_claim_tokens` | 6 | trip |

**Field highlights:**
- `Accommodation.day_ids`: JSON column → Python `list[int]`
- Bug đã được fix trong migration `20260608_0006`

#### 1.2.3 Chat Models (`chat.py`)

| Model | Table Name | Số lượng fields | Relationships |
|-------|-----------|-----------------|---------------|
| `ChatSession` | `chat_sessions` | 7 | trip, user (nullable), messages |
| `ChatMessage` | `chat_messages` | 7 | session |

**Field highlights:**
- `ChatMessage.proposed_operations`: JSON column → Python `list[dict[str, object]]`

### 1.3 Places Domain (`src/places/models.py`)

| Model | Table Name | Số lượng fields | Relationships |
|-------|-----------|-----------------|---------------|
| `Destination` | `destinations` | 11 | places, hotels |
| `Place` | `places` | 17 | destination, activities, saved_by |
| `Hotel` | `hotels` | 12 | destination |
| `SavedPlace` | `saved_places` | 4 | user, place |
| `ScrapedSource` | `scraped_sources` | 9 | None |

**Field highlights:**
- `Place.raw_metadata`: JSONB column → Python `dict | None`
- `Destination.places_count`: Denormalized counter

---

## 2. MAPPING ISSUES

### 2.1 Critical Issues

#### ISSUE-001: `travelerInfo` field không tồn tại trong database

**Vị trí:** 
- FE types: `Frontend/src/app/types/trip.types.ts` - có `travelerInfo: TravelerInfo`
- BE Response: `ItineraryResponse` - có `travelerInfo: TravelerInfo`
- DB Schema: **KHÔNG CÓ** `traveler_info` column trong `trips` table
- ORM Model: **KHÔNG CÓ** `traveler_info` field trong `Trip` model

**Hiện tượng:** 
- FE gửi `UpdateTripRequest` với `travelerInfo` object
- BE serialize `TravelerInfo` từ `adults_count` + `children_count`
- Database chỉ lưu `adults_count` và `children_count` riêng lẻ

**Gốc rễ vấn đề:**
```python
# src/itineraries/service.py line 808-812
traveler_info=TravelerInfo(
    adults=trip.adults_count,
    children=trip.children_count,
    total=trip.adults_count + trip.children_count,
)
```

**Tác động:** BUG-BE-001 - `PUT /itineraries/{id}` không update được `travelerInfo` vì:
1. `UpdateTripRequest` schema KHÔNG có `travelerInfo` field
2. `Trip` model KHÔNG có `traveler_info` field
3. Database KHÔNG có `traveler_info` column

#### ISSUE-002: `extraExpenses` serialization inconsistency

**Vị trí:**
- FE types: `Activity` interface có `extraExpenses?: ExtraExpense[]`
- BE Response: `ActivitySchema` có `extra_expenses: list[ExtraExpenseSchema]`
- ORM Model: `Activity` model có `extra_expenses` relationship

**Vấn đề:**
```python
# src/itineraries/service.py line 704-727
def _activity_to_schema(activity: Activity) -> ActivitySchema:
    return ActivitySchema(
        # ... các fields khác ...
        extra_expenses=[],  # ❌ ALWAYS EMPTY LIST
    )
```

**Tác động:** BUG-BE-002 - Single activity endpoint luôn trả về `extra_expenses: []`

**Solution đã có:**
```python
# src/itineraries/service.py line 729-818 (_to_response method)
# Đã correct eager load và serialize extra_expenses
```

### 2.2 Minor Issues

#### ISSUE-003: `interests` field name mapping

**Database:** `trips.interests` (JSON column)  
**FE Contract:** `interests: string[]`  
**Mapping:** CORRECT - `Trip.interests` → `list[str]`

#### ISSUE-004: `day_ids` JSON column type safety

**Database:** `accommodations.day_ids` (JSON column)  
**ORM Model:** `list[int]`  
**Migration fix:** Đã fix trong `20260608_0006_fix_accommodation_day_ids.py`

---

## 3. RELATIONSHIP ANALYSIS

### 3.1 Foreign Key Constraints

| Relationship | FK Column | Referenced Table | On Delete | Status |
|--------------|-----------|------------------|-----------|---------|
| Trip.user_id | trips.user_id | users.id | CASCADE | ✅ CORRECT |
| Activity.place_id | activities.place_id | places.id | (no default) | ✅ CORRECT |
| Accommodation.hotel_id | accommodations.hotel_id | hotels.id | (no default) | ✅ CORRECT |
| TripDay.trip_id | trip_days.trip_id | trips.id | CASCADE | ✅ CORRECT |
| Activity.trip_day_id | activities.trip_day_id | trip_days.id | CASCADE | ✅ CORRECT |
| ChatSession.user_id | chat_sessions.user_id | users.id | SET NULL | ✅ CORRECT |

### 3.2 Relationship Loading

**N+1 Query Prevention:** ✅ WELL IMPLEMENTED

```python
# src/itineraries/repository.py line 46-76
async def get_with_full_data(self, trip_id: int) -> Trip | None:
    stmt = (
        select(Trip)
        .where(Trip.id == trip_id)
        .options(
            selectinload(Trip.days)
            .selectinload(TripDay.activities)
            .selectinload(Activity.extra_expenses),
            selectinload(Trip.days).selectinload(TripDay.extra_expenses),
            selectinload(Trip.accommodations),
            selectinload(Trip.rating),
            selectinload(Trip.share_link),
        )
    )
```

**Lazy Load Risk Areas:**
- ⚠️ `Activity.place` relationship - NOT eager loaded in `_activity_to_schema`
- ⚠️ `Accommodation.hotel` relationship - NOT eager loaded in response serialization

### 3.3 Cascade Deletes

**Cascade Configuration:** ✅ CORRECT

```python
# Trip cascade configuration
days: Mapped[list["TripDay"]] = relationship(
    back_populates="trip",
    cascade="all, delete-orphan",  # ✅ Correct
)
```

**Database Schema:**
```sql
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
```

---

## 4. REPOSITORY QUERY ISSUES

### 4.1 Missing Eager Loading

#### ISSUE-005: Activity single-endpoint missing extra expenses

**Vị trí:** `src/itineraries/service.py line 704-727`

```python
@staticmethod
def _activity_to_schema(activity: Activity) -> ActivitySchema:
    return ActivitySchema(
        # ... fields ...
        extra_expenses=[],  # ❌ ALWAYS EMPTY
    )
```

**Root Cause:** Method này không eager load `extra_expenses` relationship

**Impact:** BUG-BE-002 - Activity detail endpoint thiếu extra expenses

#### ISSUE-006: Place destination lazy load in search

**Vì trí:** `src/places/repository.py line 130-144`

```python
async def search(...) -> list[Place]:
    stmt = select(Place).options(selectinload(Place.destination))
    # ✅ CORRECT - đã eager load
```

**Status:** ✅ FIXED - Eager load đã được implement

### 4.2 Query Efficiency

#### Destination Detail Query

**Vị trí:** `src/places/service.py line 86-123`

```python
async def get_destination_detail(self, name: str) -> dict:
    dest = await self.repo.get_destination_by_name(name)
    if not dest:
        dest = await self.repo.get_destination_by_slug(name)
    # ❌ Potentially 3 additional queries:
    # - get_destination_by_name
    # - get_destination_by_slug 
    # - get_by_destination (places)
    # - get_hotels_by_destination
```

**Optimization:** ✅ Acceptable tradeoff for code simplicity

#### Trip Listing Query

**Vị trí:** `src/itineraries/repository.py line 77-98`

```python
async def list_by_user(...) -> tuple[list[Trip], int]:
    count_stmt = select(func.count()).select_from(Trip).where(Trip.user_id == user_id)
    total = (await self.session.execute(count_stmt)).scalar_one()
    
    stmt = select(Trip).where(Trip.user_id == user_id).order_by(Trip.created_at.desc())
    # ✅ CORRECT - 2 queries for pagination
```

**Status:** ✅ CORRECT - Standard pagination pattern

---

## 5. DATA CONTRACT ANALYSIS

### 5.1 BE Schema ↔ DB Mapping

| Field | BE Schema | DB Column | Type Match | Status |
|-------|-----------|-----------|------------|---------|
| Trip.destination | string | destination (String(100)) | ✅ | CORRECT |
| Trip.trip_name | string | trip_name (String(200)) | ✅ | CORRECT |
| Trip.interests | string[] | interests (JSON) | ✅ | CORRECT |
| Trip.total_cost | number | total_cost (Integer) | ✅ | CORRECT |
| Trip.traveler_info | TravelerInfo | **NOT EXISTS** | ❌ | **MISSING** |
| Activity.extra_expenses | ExtraExpense[] | extra_expenses (rel) | ✅ | CORRECT (in full response) |
| Accommodation.day_ids | number[] | day_ids (JSON) | ✅ | CORRECT |

### 5.2 BE Schema ↔ FE Type Alignment

| Field | BE Schema | FE Type | Alignment | Status |
|-------|-----------|---------|------------|---------|
| Trip.destination | string | destination | ✅ | ALIGNED |
| Trip.trip_name | string | tripName | ✅ | CAMELCASE_CONVERTED |
| Trip.traveler_info | TravelerInfo | travelerInfo | ✅ | CAMELCASE_CONVERTED |
| Trip.interests | string[] | interests | ✅ | ALIGNED |
| Activity.time | string | time | ✅ | ALIGNED |
| Activity.end_time | string \| null | endTime?: string | ✅ | CAMELCASE_CONVERTED |
| Activity.extra_expenses | ExtraExpense[] | extraExpenses?: ExtraExpense[] | ✅ | CAMELCASE_CONVERTED |
| Accommodation.day_ids | number[] | dayIds: number[] | ✅ | CAMELCASE_CONVERTED |

### 5.3 Critical Contract Gaps

#### GAP-001: UpdateTripRequest không support traveler_info

**Request Schema:**
```python
# src/itineraries/schemas.py line 206-218
class UpdateTripRequest(CamelCaseModel):
    trip_name: str | None = None
    budget: int | None = None
    days: list[DaySchema] | None = None
    accommodations: list[AccommodationSchema] | None = None
    # ❌ MISSING: traveler_info field
```

**FE Expectation:**
```typescript
// Frontend gửi object với travelerInfo
{
  tripName: "...",
  travelerInfo: { adults: 2, children: 1, total: 3 }
}
```

**Root Cause:** BUG-BE-001 - Contract mismatch

---

## 6. BUG ROOT CAUSES

### 6.1 BUG-BE-001: `PUT /itineraries/{id}` không update `travelerInfo` và `totalCost`

#### Root Cause Analysis

**1. Contract Mismatch:**
```typescript
// FE expectation (trip.types.ts)
interface Trip {
  trip_name: string;
  traveler_info: TravelerInfo;  // ❌ FE gửi field này
  total_cost: number;
}
```

```python
# BE UpdateTripRequest schema
class UpdateTripRequest(CamelCaseModel):
    trip_name: str | None = None
    budget: int | None = None
    # ❌ KHÔNG CÓ traveler_info field
    # ❌ KHÔNG CÓ total_cost field (read-only, calculated)
```

**2. Service Layer Logic:**
```python
# src/itineraries/service.py line 155-196
async def update(self, trip_id: int, data: UpdateTripRequest, user_id: int):
    # Step 1: Update trip-level fields (only if provided)
    if data.trip_name is not None:
        trip.trip_name = data.trip_name
    if data.budget is not None:
        trip.budget = data.budget
    # ❌ KHÔNG XỬ LÝ traveler_info vì không có trong request
    
    # Step 4: Recalculate total cost from all nested entities
    trip.total_cost = self._calculate_total_cost(trip)  # ✅ Recalculate
```

**3. Database Schema:**
```sql
-- trips table structure
CREATE TABLE trips (
    id INTEGER PRIMARY KEY,
    trip_name VARCHAR(200) NOT NULL,
    budget INTEGER NOT NULL,
    adults_count INTEGER DEFAULT 1,  -- ✅ Exist separately
    children_count INTEGER DEFAULT 0, -- ✅ Exist separately
    total_cost INTEGER DEFAULT 0,     -- ✅ Exist (calculated)
    -- ❌ KHÔNG CÓ traveler_info column
);
```

**4. ORM Model:**
```python
# src/itineraries/models/trip.py line 50-152
class Trip(Base):
    __tablename__ = "trips"
    
    trip_name: Mapped[str] = mapped_column(String(200), nullable=False)
    adults_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    children_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_cost: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # ❌ KHÔNG CÓ traveler_info field
```

#### Why This Happens

1. **Database Design:** `traveler_info` là **computed field**, không lưu trực tiếp trong DB
2. **Source of Truth:** `adults_count` và `children_count` là actual storage
3. **Serialization:** `TravelerInfo` object được tạo **on-the-fly** khi serialize response
4. **Update Flow:** FE gửi `travelerInfo` nhưng BE không có field tương ứng trong request schema

#### Actual Behavior vs Expected

**FE Sends:**
```json
{
  "tripName": "Hà Nội 3 ngày",
  "travelerInfo": {
    "adults": 2,
    "children": 1,
    "total": 3
  },
  "days": [...]
}
```

**BE Actually Processes:**
```python
# BE chỉ lấy trip_name và days, bỏ qua travelerInfo
trip.trip_name = "Hà Nội 3 ngày"
# travelerInfo bị IGNORE
```

**What FE Expects:**
```python
# FE mong đợi:
trip.adults_count = 2  # ❌ NOT UPDATED
trip.children_count = 1  # ❌ NOT UPDATED
```

### 6.2 BUG-BE-002: `extraExpenses` bị mất trong activity response

#### Root Cause Analysis

**1. Single Activity Endpoint:**
```python
# src/itineraries/service.py line 704-727
@staticmethod
def _activity_to_schema(activity: Activity) -> ActivitySchema:
    return ActivitySchema(
        id=activity.id,
        name=activity.name,
        # ... other fields ...
        extra_expenses=[],  # ❌ HARDCODED EMPTY LIST
    )
```

**2. Full Trip Response (CORRECT):**
```python
# src/itineraries/service.py line 729-818
async def _to_response(self, trip: Trip) -> ItineraryResponse:
    for act in day.activities:
        expenses = [
            ExtraExpenseSchema(id=e.id, name=e.name, amount=e.amount, category=e.category)
            for e in act.extra_expenses  # ✅ CORRECT - eager loaded
        ]
        activities.append(
            ActivitySchema(
                # ... fields ...
                extra_expenses=expenses,  # ✅ CORRECT
            )
        )
```

**3. Repository Eager Loading:**
```python
# src/itineraries/repository.py line 46-76
async def get_with_full_data(self, trip_id: int) -> Trip | None:
    stmt = (
        select(Trip)
        .options(
            selectinload(Trip.days)
            .selectinload(TripDay.activities)
            .selectinload(Activity.extra_expenses),  # ✅ CORRECT
        )
    )
```

**4. Activity Detail Endpoints:**
```python
# src/itineraries/service.py line 338-369
async def add_activity(...) -> ActivitySchema:
    activity = await self.repo.add_activity(...)
    return self._activity_to_schema(activity)  # ❌ Missing extra_expenses
```

#### Why This Happens

1. **Two Different Serialization Paths:**
   - Full trip response: ✅ Correct serialization (`_to_response`)
   - Single activity: ❌ Incorrect serialization (`_activity_to_schema`)

2. **Performance Optimization:**
   - `_activity_to_schema` được design để avoid lazy loads
   - Trade-off: luôn trả về empty list cho `extra_expenses`

3. **Inconsistent API Contract:**
   - FE expect `extraExpenses` trong tất cả activity responses
   - BE chỉ provide `extra_expenses` trong full trip response

### 6.3 BUG-BE-003: Destination detail lookup fails with 404

#### Root Cause Analysis

**1. Resolution Logic:**
```python
# src/places/service.py line 86-123
async def get_destination_detail(self, name: str) -> dict:
    # Strategy 1: Exact name match
    dest = await self.repo.get_destination_by_name(name)
    if not dest:
        # Strategy 2: Slug match
        dest = await self.repo.get_destination_by_slug(name)
    if not dest:
        raise NotFoundException("Destination not found")  # ❌ 404 here
```

**2. Repository Methods:**
```python
# src/places/repository.py line 88-98
async def get_destination_by_name(self, name: str) -> Destination | None:
    stmt = select(Destination).where(Destination.name == name)  # ❌ EXACT MATCH ONLY
    result = await self.session.execute(stmt)
    return result.scalar_one_or_none()

async def get_destination_by_slug(self, slug: str) -> Destination | None:
    stmt = select(Destination).where(Destination.slug == slug)  # ❌ EXACT MATCH ONLY
    result = await self.session.execute(stmt)
    return result.scalar_one_or_none()
```

**3. Database Records:**
```sql
-- destinations table
INSERT INTO destinations (name, slug) VALUES 
('Hà Nội', 'ha-noi'),
('TP. Hồ Chí Minh', 'tp-ho-chi-minh'),
('Da Nang', 'da-nang');
```

**4. User Input Variations:**
```
"Ha Noi"         → ❌ 404 (not exact match, not slug match)
"Hanoi"          → ❌ 404 (not exact match, not slug match)
"Hà Nội"         → ✅ 200 (exact name match)
"ha-noi"         → ✅ 200 (exact slug match)
"Ho Chi Minh"    → ❌ 404 (missing "TP." prefix)
```

#### Why This Happens

1. **No Fuzzy Matching:** Place service không có fallback fuzzy search
2. **Case Sensitivity:** Name match là exact match, không có case-insensitive fallback
3. **Input Normalization:** FE không normalize user input trước khi gọi API

**Compare with AI Resolution (CORRECT):**
```python
# src/itineraries/repository.py line 139-175
async def resolve_destination_for_ai(self, destination: str) -> Destination | None:
    # Strategy 1: Exact case-insensitive match ✅
    exact_stmt = select(Destination).where(func.lower(Destination.name) == name.lower())
    
    # Strategy 2: Slug match ✅
    slug_candidate = self._to_slug(name)
    slug_stmt = select(Destination).where(Destination.slug == slug_candidate)
    
    # Strategy 3: Fuzzy ILIKE match ✅
    fuzzy_stmt = select(Destination).where(Destination.name.ilike(f"%{name}%"))
```

---

## 7. KHUYẾN NGHỆ

### 7.1 Fix BUG-BE-001: Update travelerInfo support

**Option 1: Add Traveler Info to UpdateTripRequest (RECOMMENDED)**

```python
# File: src/itineraries/schemas.py
class UpdateTripRequest(CamelCaseModel):
    trip_name: str | None = None
    budget: int | None = None
    traveler_info: TravelerInfo | None = None  # ✅ ADD THIS
    days: list[DaySchema] | None = None
    accommodations: list[AccommodationSchema] | None = None
```

```python
# File: src/itineraries/service.py
async def update(self, trip_id: int, data: UpdateTripRequest, user_id: int):
    # ... existing code ...
    
    # ✅ ADD: Handle traveler_info update
    if data.traveler_info is not None:
        trip.adults_count = data.traveler_info.adults
        trip.children_count = data.traveler_info.children
    
    # ... rest of update logic ...
```

**Option 2: Extract travelerInfo from days (ALTERNATIVE)**

```python
# If FE sends traveler_info in a different format
# Extract it from the first day or compute from activities
```

### 7.2 Fix BUG-BE-002: Add extra expenses to activity endpoints

**Solution A: Eager Load in Repository**

```python
# File: src/itineraries/repository.py
async def get_activity_by_id(self, activity_id: int) -> Activity | None:
    stmt = (
        select(Activity)
        .where(Activity.id == activity_id)
        .options(selectinload(Activity.extra_expenses))  # ✅ ADD THIS
    )
    result = await self.session.execute(stmt)
    return result.scalar_one_or_none()
```

**Solution B: Update Serialization Method**

```python
# File: src/itineraries/service.py
@staticmethod
def _activity_to_schema(activity: Activity) -> ActivitySchema:
    return ActivitySchema(
        id=activity.id,
        name=activity.name,
        # ... other fields ...
        extra_expenses=[
            ExtraExpenseSchema(id=e.id, name=e.name, amount=e.amount, category=e.category)
            for e in activity.extra_expenses  # ✅ USE ACTUAL DATA
        ],  # ✅ FIX THIS
    )
```

### 7.3 Fix BUG-BE-003: Improve destination resolution

**Solution A: Add Case-Insensitive Match**

```python
# File: src/places/repository.py
async def get_destination_by_name(self, name: str) -> Destination | None:
    # ✅ ADD: Case-insensitive match
    stmt = select(Destination).where(func.lower(Destination.name) == func.lower(name))
    result = await self.session.execute(stmt)
    return result.scalar_one_or_none()
```

**Solution B: Add Fuzzy Fallback**

```python
# File: src/places/service.py
async def get_destination_detail(self, name: str) -> dict:
    # Strategy 1: Exact name match (case-insensitive)
    dest = await self.repo.get_destination_by_name(name)
    if not dest:
        # Strategy 2: Slug match
        dest = await self.repo.get_destination_by_slug(name)
    if not dest:
        # ✅ ADD: Strategy 3 - Fuzzy match (similar to AI resolution)
        dest = await self._fuzzy_match_destination(name)
    if not dest:
        raise NotFoundException("Destination not found")
    # ... rest of logic ...

async def _fuzzy_match_destination(self, name: str) -> Destination | None:
    """Fallback fuzzy match for destination resolution."""
    stmt = (
        select(Destination)
        .where(Destination.name.ilike(f"%{name}%"))
        .order_by(Destination.places_count.desc())
        .limit(1)
    )
    result = await self.session.execute(stmt)
    return result.scalar_one_or_none()
```

### 7.4 Additional Improvements

**1. Add Database Indexes (Performance)**

```sql
-- Missing indexes that should be added:
CREATE INDEX ix_places_external_id ON places(external_id);  -- ✅ Already exists
CREATE INDEX ix_places_category ON places(category);          -- ✅ Already exists
CREATE INDEX ix_activities_order_index ON activities(order_index);  -- ❌ MISSING
```

**2. Add Validation for JSON Columns**

```python
# File: src/itineraries/models/trip.py
class Trip(Base):
    # ✅ ADD: Validation for interests JSON field
    interests: Mapped[list[str]] = mapped_column(
        JSON, 
        default=list, 
        nullable=False,
        # TODO: Add validator to ensure array of strings
    )
```

**3. Consistent Relationship Loading Strategy**

```python
# Create a helper method for consistent activity serialization
def serialize_activity_with_expenses(activity: Activity) -> ActivitySchema:
    """Consistent activity serialization with extra expenses."""
    return ActivitySchema(
        id=activity.id,
        name=activity.name,
        # ... all fields ...
        extra_expenses=[
            ExtraExpenseSchema(id=e.id, name=e.name, amount=e.amount, category=e.category)
            for e in activity.extra_expenses
        ],
    )
```

---

## 8. SUMMARY

### 8.1 Critical Issues Found

| Issue | Severity | Impact | File Location |
|-------|----------|--------|---------------|
| BUG-BE-001 | HIGH | travelerInfo không update được | `itineraries/schemas.py`, `itineraries/service.py` |
| BUG-BE-002 | MEDIUM | extraExpenses bị mất trong single activity response | `itineraries/service.py:704-727` |
| BUG-BE-003 | MEDIUM | Destination lookup fail với partial match | `places/repository.py`, `places/service.py` |

### 8.2 Schema Alignment Status

| Component | Status | Notes |
|-----------|--------|-------|
| Database → ORM | ✅ ALIGNED | SQLAlchemy models match schema exactly |
| ORM → BE Schemas | ⚠️ PARTIAL | travelerInfo gap in update endpoint |
| BE Schemas → FE Types | ✅ ALIGNED | CamelCase conversion working correctly |
| FE Types → Actual BE Response | ❌ MISMATCH | travelerInfo not updated |

### 8.3 Relationship Health

| Aspect | Status | Notes |
|--------|--------|-------|
| Foreign Keys | ✅ CORRECT | All FKs properly defined |
| Cascade Deletes | ✅ CORRECT | CASCADE/SET NULL appropriate |
| Eager Loading | ⚠️ PARTIAL | Some endpoints missing eager loads |
| N+1 Prevention | ✅ GOOD | selectinload used in critical paths |

### 8.4 Data Contract Health

| Contract Layer | Status | Issues |
|----------------|--------|--------|
| DB → ORM | ✅ HEALTHY | Direct mapping |
| ORM → Service | ✅ HEALTHY | Repository pattern correct |
| Service → API Response | ⚠️ GAPS | travelerInfo, extraExpenses inconsistencies |
| API Response → FE Types | ⚠️ GAPS | Contract mismatches in update flow |

---

## 9. NEXT STEPS

1. **Priority 1:** Fix BUG-BE-001 (travelerInfo update)
2. **Priority 2:** Fix BUG-BE-002 (extraExpenses serialization)
3. **Priority 3:** Fix BUG-BE-003 (destination resolution)
4. **Priority 4:** Add integration tests for update endpoints
5. **Priority 5:** Performance testing with eager loads

---

**Report Generated By:** Claude Code Agent  
**Audit Date:** 2026-06-09  
**Focus:** SQLAlchemy ORM vs Database Schema Alignment  
**Scope:** MVP2 Backend + Frontend Contract Analysis