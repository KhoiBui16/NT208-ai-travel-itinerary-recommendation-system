# BÁO CÁO KIỂM TRA DATABASE TOÀN DIỆN

**Thời gian audit:** 2026-06-09  
**Database:** dulichviet (PostgreSQL)  
**Container:** nt208-ai-travel-itinerary-recommendation-system-db-1  
**Alembic version:** 20260608_0006

---

## 1. TỔNG QUAN SCHEMA

### Bảng dữ liệu (18 tables)
- **users**: 524 records
- **trips**: 420 records  
- **trip_days**: 169 records
- **activities**: 557 records
- **accommodations**: 64 records
- **places**: 725 records
- **destinations**: 28 records
- **hotels**: 38 records
- **refresh_tokens**: 816 records
- **share_links**: 14 records
- **guest_claim_tokens**: 115 records
- **saved_places**: 0 records
- **chat_sessions**: 0 records
- **chat_messages**: 0 records
- **extra_expenses**: 0 records
- **trip_ratings**: 6 records
- **scraped_sources**: 29 records

### Thông tin schema
- **Users**: Authentication, profile, password reset
- **Trips**: Lịch trình với metadata, budget, status
- **Trip_days**: Các ngày trong trip (trip-day relationship)
- **Activities**: Hoạt động theo trip_day, có place reference
- **Accommodations**: Lưu trú với hotel_id reference, day_ids JSON
- **Places**: Địa điểm du lịch với destination linkage
- **Destinations**: 28 điểm đến chính
- **Hotels**: 38 khách sạn (chủ yếu test data)
- **Tokens**: Refresh tokens, share links, guest claim tokens
- **Chat**: Sessions và messages (chưa có data)
- **Extra expenses**: Chi phí thêm (chưa có data)

---

## 2. QUAN HỆ (RELATIONSHIPS)

### Foreign Key Summary (20 FKs)
```
accommodations     → trips (CASCADE DELETE)
accommodations     → hotels (NO ACTION)
activities         → trip_days (CASCADE DELETE)
activities         → places (NO ACTION)
chat_messages      → chat_sessions (CASCADE DELETE)
chat_sessions      → trips (CASCADE DELETE)
chat_sessions      → users (SET NULL)
extra_expenses     → activities (CASCADE DELETE)
extra_expenses     → trip_days (CASCADE DELETE)
guest_claim_tokens → trips (CASCADE DELETE)
hotels             → destinations (CASCADE DELETE)
places             → destinations (CASCADE DELETE)
refresh_tokens     → users (CASCADE DELETE)
saved_places       → places (CASCADE DELETE)
saved_places       → users (CASCADE DELETE)
share_links        → users (CASCADE DELETE)
share_links        → trips (CASCADE DELETE)
trip_days          → trips (CASCADE DELETE)
trip_ratings       → trips (CASCADE DELETE)
trips              → users (CASCADE DELETE)
```

### Cascade Behavior
- **CASCADE DELETE**: Hầu hết các relationship dùng CASCADE DELETE
- **SET NULL**: chat_sessions.user_id (cho phép guest chat)

---

## 3. KIỂM TRA TỐNG VỆ DỮ LIỆU

### ✅ Integrity Checks PASSED
- **0 orphan trips**: Không có trip không có owner
- **0 orphan activities**: Không có activity không có trip_day
- **0 orphan accommodations**: Không có accommodation không có trip
- **0 activities without place reference**: Tất cả place_id đều valid

### ⚠️ Data Quality Issues

#### 1. Trips không có trip_days (311/420 trips = 74%)
**P0 - CRITICAL**
```
311 trips không có trip_days nào
Ví dụ: Trip ID 2-312, 374-460 (chủ yếu test trips)
```
**Impact**: Generate pipeline không thể chạy vì thiếu trip_days

#### 2. Accommodations với day_ids rỗng (22/64 = 34%)
**P1 - HIGH**
```
22 accommodations có day_ids = []
Đây là BUG từ trước, không map được accommodation vào trip_days
```
**Impact**: Không thể hiển thị accommodation trong timeline

#### 3. Places thiếu metadata quan trọng
**P1 - HIGH**
```
- 724/725 places (99.9%) không có image
- 724/725 places (99.9%) có rating = 0 (không có rating)
- 0/725 places thiếu category
```
**Impact**: UX kém, không có visual content

#### 4. Trip cost chưa tính (376/420 = 89%)
**P2 - MEDIUM**
```
- 376 trips có total_cost = 0
- 44 trips có total_cost > 0
- 0 trips có total_cost = NULL
```
**Impact**: Budget tracking không hoạt động

#### 5. Token expiry issues
**P2 - MEDIUM**
```
Refresh tokens:
  - 816 total
  - 588 active (72%)
  - 228 expired (28%)

Share links:
  - 14 total
  - 0 active
  - 14 expired (100%)

Guest claim tokens:
  - 115 total
  - 2 active (1.7%)
  - 113 expired (98.3%)
```
**Impact**: Share/claim flow có thể fail với old tokens

#### 6. Destination coverage không đều
**P2 - MEDIUM**
```
10 destinations có places data:
  - Hà Nội: 222 places
  - TP.HCM: 150 places
  - Đà Nẵng: 144 places
  - Hội An: 134 places
  - Đà Lạt: 128 places
  - Phú Quốc: 73 places
  - Hạ Long: 71 places
  - Huế: 68 places
  - Nha Trang: 66 places
  - Sapa: 56 places

18 destinations KHÔNG có places data (0 places):
  - Cần Thơ, Buôn Ma Thuột, Châu Đốc, Côn Đảo, Mộc Châu, Vũng Tàu, 
    Phan Thiết, Ninh Bình, Hải Phòng, Pleiku, Quy Nhơn, Đồng Hới, 
    Hà Giang, Phong Nha, Tuy Hòa, Mũi Né, Tây Ninh
```
**Impact**: Generate pipeline không thể create itinerary cho 18 destinations này

---

## 4. VẤN ĐỀ PHÁT HIỆN

### P0 - CRITICAL (Blocker)
1. **74% trips không có trip_days** (311/420)
   - Generate pipeline sẽ fail
   - User không thể create/edit itinerary
   - **Fix needed**: Seed trip_days cho existing trips

### P1 - HIGH (Urgent)
1. **34% accommodations có day_ids rỗng** (22/64)
   - UX bug: accommodation không hiển thị trong timeline
   - **Fix needed**: Migration để populate day_ids

2. **99.9% places không có image** (724/725)
   - UX: không có visual content
   - **Fix needed**: Run ETL để fetch images

3. **99.9% places có rating = 0** (724/725)
   - Data quality issue
   - **Fix needed**: Update rating từ source

### P2 - MEDIUM (Important)
1. **89% trips có total_cost = 0** (376/420)
   - Budget tracking không hoạt động
   - **Fix needed**: Calculate total_cost từ activities/accommodations

2. **100% share_links expired** (14/14)
   - Share flow có thể fail
   - **Fix needed**: Clean expired tokens hoặc extend TTL

3. **98.3% guest_claim_tokens expired** (113/115)
   - Guest claim flow có thể fail
   - **Fix needed**: Clean expired tokens

4. **18 destinations không có places data**
   - Generate pipeline không support 18 destinations này
   - **Fix needed**: Run ETL cho missing destinations

---

## 5. INDEX ANALYSIS

### Existing Indexes (53 indexes)
**Coverage:** ✅ Tốt
- Tất cả PK/FK columns đều có index
- Unique constraints được enforce (email, token_hash, slug, etc.)
- Search columns có index (destination, category, created_at)

### Missing Indexes (Potential improvements)
1. **trips.status**
   - Index cho filter theo status (draft, published, archived)
   - Impact: Medium

2. **accommodations.hotel_id**
   - FK nhưng chưa có index
   - Impact: Low (hotel query ít phổ biến)

3. **chat_sessions.status**
   - Index cho filter theo status khi C3 implement
   - Impact: Medium (cho future chat features)

### Index Usage Recommendations
**Current:** ✅ Tốt cho MVP2
**Future:** Cần thêm indexes cho chat queries khi C3/C4 roll out

---

## 6. COLUMN TYPE ISSUES

### JSON/JSONB Columns (5 columns)
1. **accommodations.day_ids** (JSON, NOT NULL)
   - Type: JSON array of integers
   - Issue: 22 records có empty array `[]`
   - Recommendation: Validate NOT EMPTY sau khi fix

2. **chat_messages.proposed_operations** (JSON, NOT NULL)
   - Type: JSON object for C3 operations
   - Status: Ready cho C3 implementation

3. **places.raw_metadata** (JSONB, nullable)
   - Type: Flexible metadata storage
   - Status: Good design

4. **trips.interests** (JSON, NOT NULL)
   - Type: Array of strings
   - Status: Good

5. **users.interests** (JSON, NOT NULL)
   - Type: Array of strings
   - Status: Good

### Nullable Columns Analysis (36 nullable columns)
**By category:**

**Authentication (3):**
- users.phone, password_reset_token_hash, password_reset_expires_at
- ✅ OK: Optional features

**Location coordinates (4):**
- destinations.latitude/longitude, places.latitude/longitude
- ⚠️ Issue: Coordinates không được populate
- **Impact**: Map features không hoạt động

**Trip metadata (1):**
- trips.user_id (nullable cho guest trips)
- ✅ OK: Design intention

**Chat (1):**
- chat_sessions.user_id (nullable cho guest chat)
- ✅ OK: Design intention cho C3

**Activity costs (7):**
- activities.end_time, transportation, adult_price, child_price, custom_cost, bus_ticket_price, taxi_cost
- ✅ OK: Optional pricing fields

**Accommodation (4):**
- accommodations.hotel_id, booking_url, booking_type, duration
- ✅ OK: Optional booking info

**Token expiry (2):**
- share_links.expires_at, revoked_at
- ⚠️ Issue: expires_at luôn NULL → 100% expired
- **Fix needed**: Set default expiry

**ETL/Scraping (3):**
- scraped_sources.city, url, error_message
- ✅ OK: Optional tracking

**Trip planning (2):**
- trip_days.destination_name, trip_ratings.feedback
- ✅ OK: Optional user input

---

## 7. KHUYẾN NGHỊ

### Immediate Actions (P0)
1. **Fix trip_days missing (311 trips)**
   ```sql
   -- Migration seed trip_days cho existing trips
   -- Dựa trên start_date, end_date, destination
   ```

2. **Fix accommodations.day_ids empty (22 records)**
   ```sql
   -- Migration populate day_ids từ trip_id và check_in/check_out
   ```

### Short-term Actions (P1)
1. **ETL places metadata**
   - Fetch images từ Goong/Google Places API
   - Update ratings từ review sources
   - Target: 100% places có image + rating

2. **Calculate trip total_cost**
   ```sql
   -- Migration: Sum up activities costs + accommodations cost
   -- Update trips.total_cost
   ```

3. **Clean expired tokens**
   ```sql
   -- Delete share_links expired > 30 days
   -- Delete guest_claim_tokens expired > 7 days
   -- Delete refresh_tokens expired > 90 days
   ```

### Medium-term Actions (P2)
1. **ETL cho 18 destinations thiếu places**
   - Prioritize: Cần Thơ, Ninh Bình, Hải Phòng (high demand)
   - Source: Goong API, scraping

2. **Add missing coordinates**
   - destinations.latitude/longitude
   - places.latitude/longitude
   - Source: Geocoding API

3. **Set default TTL cho share_links**
   ```sql
   -- ALTER TABLE share_links ALTER expires_at SET DEFAULT NOW() + INTERVAL '30 days'
   ```

### Schema Improvements
1. **Add indexes cho C3/C4**
   - chat_sessions.status
   - chat_messages.requires_confirmation

2. **Add constraints**
   - accommodations.day_ids NOT EMPTY check
   - Validate JSON structure cho proposed_operations

---

## 8. ALEMBIC STATUS

**Current version:** 20260608_0006  
**Status:** ✅ Up to date  
**Migration gap:** None

---

## SUMMARY

### Overall Health: ⚠️ WARNING
- **Schema design:** ✅ Good (18 tables, proper relationships)
- **Data integrity:** ✅ Good (no orphans, FK constraints enforced)
- **Data quality:** ⚠️ Poor (missing trip_days, empty day_ids, no images/ratings)
- **Token management:** ⚠️ Needs cleanup (high expired rate)
- **ETL coverage:** ⚠️ Incomplete (18/28 destinations missing places)

### Critical Path
1. Fix P0: trip_days missing
2. Fix P1: accommodations.day_ids empty
3. Fix P1: ETL places metadata
4. Fix P2: Clean expired tokens
5. Fix P2: ETL missing destinations

### Readiness cho C3/C4
**Current status:** ⚠️ NOT READY
- Chat schema ✅ ready
- Nhưng generate pipeline data ⚠️ incomplete
- Cần fix P0/P1 trước khi implement C3/C4

---

**Report Generated:** 2026-06-09  
**Database:** dulichviet @ nt208-ai-travel-itinerary-recommendation-system-db-1  
**Audited by:** Claude Code (PostgreSQL Schema Audit)