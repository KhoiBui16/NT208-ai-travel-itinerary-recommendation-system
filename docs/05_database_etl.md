# 05. Database, Redis và ETL

## Mục đích

File này mô tả **chi tiết toàn bộ database schema** — từng bảng, từng cột, từng constraint, từng mối quan hệ — cộng với Redis cache strategy và ETL pipeline. Đọc file này khi cần hiểu data model, viết migration mới, hoặc debug query.

**Khi nào đọc file này:**
- Thêm bảng/cột mới → hiểu bảng nào liên quan, constraint nào cần giữ
- Viết Alembic migration → xem migration history và naming convention
- Debug query chậm → xem index và relationship
- Thiết kế ETL mới → xem upsert strategy và scraped_sources
- Code review schema change → kiểm tra invariant (hash token, owner-only, camelCase)

---

## 1. ERD — Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AUTH DOMAIN                                    │
│                                                                             │
│  ┌─────────── users ───────────┐     ┌────── refresh_tokens ──────┐       │
│  │ PK  id             int      │1──N│ PK  id              int     │       │
│  │     email          varchar  │     │ FK  user_id         int     │       │
│  │     hashed_password varchar │     │     token_hash      varchar │       │
│  │     name           varchar  │     │     expires_at      timestmp│       │
│  │     phone          varchar? │     │     is_revoked      bool    │       │
│  │     interests      json     │     │     created_at      timestmp│       │
│  │     is_active      bool     │     └────────────────────────────┘       │
│  │     password_reset_token_hash│                                          │
│  │     password_reset_expires_at│                                          │
│  │     created_at     timestmp │                                          │
│  │     updated_at     timestmp │                                          │
│  └──────────┬──────────────────┘                                          │
│             │1                                                              │
│             │                                                               │
└─────────────┼───────────────────────────────────────────────────────────────┘
              │
              │ N (trips.user_id nullable cho guest)
              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            TRIP DOMAIN                                      │
│                                                                             │
│  ┌────────────────── trips ──────────────────┐                              │
│  │ PK  id                  int                │                              │
│  │ FK  user_id             int?               │ ← nullable: guest trip      │
│  │     destination         varchar            │                              │
│  │     trip_name           varchar            │                              │
│  │     start_date          date               │                              │
│  │     end_date            date               │                              │
│  │     budget              int                │                              │
│  │     total_cost          int                │                              │
│  │     adults_count        int                │                              │
│  │     children_count      int                │                              │
│  │     interests           json               │                              │
│  │     status              varchar            │                              │
│  │     ai_generated        bool               │                              │
│  │     created_at          timestmp           │                              │
│  │     updated_at          timestmp           │                              │
│  └───┬──────────┬────────────┬───────────────┘                              │
│      │1         │1            │1                                              │
│      │N         │N            │1                                              │
│      ▼          ▼             ▼                                               │
│  ┌──────── trip_days ──────┐ ┌──── accommodations ────┐ ┌─ trip_ratings ─┐  │
│  │ PK id           int     │ │ PK id            int    │ │ PK id     int  │  │
│  │ FK trip_id      int     │ │ FK trip_id       int    │ │ FK trip_id int │  │
│  │    day_number   int     │ │ FK hotel_id?     int    │ │    rating  int │  │
│  │    label        varchar │ │    name          varchar │ │    feedback txt│  │
│  │    date         varchar │ │    check_in      varchar │ │    created_at  │  │
│  │    destination_name?    │ │    check_out     varchar │ └────────────────┘  │
│  └──┬──────────────────────┘ │    price_per_night int   │                     │
│     │1                       │    total_price    int    │ ┌─ share_links ──┐  │
│     │N                       │    booking_type?  varchar│ │ PK id     int  │  │
│     ▼                        │    duration?      int    │ │ FK trip_id int │  │
│  ┌──────── activities ─────┐ │    day_ids       json   │ │    token_hash   │  │
│  │ PK id            int    │ │    booking_url?  varchar│ │ FK created_by   │  │
│  │ FK trip_day_id   int    │ └────────────────────────┘ │    permission   │  │
│  │ FK place_id?     int    │                             │    expires_at?  │  │
│  │    name          varchar│                             │    revoked_at?  │  │
│  │    time          varchar│                             └─────────────────┘  │
│  │    end_time?     varchar│                                                  │
│  │    type          varchar│ ┌─── guest_claim_tokens ──┐                     │
│  │    location      varchar│ │ PK id           int     │                     │
│  │    description   text   │ │ FK trip_id      int     │                     │
│  │    image         varchar│ │    token_hash   varchar  │                     │
│  │    transportation?      │ │    expires_at   timestmp │                     │
│  │    adult_price?  int    │ │    consumed_at? timestmp │                     │
│  │    child_price?  int    │ └─────────────────────────┘                     │
│  │    custom_cost?  int    │                                                  │
│  │    bus_ticket_price?    │                                                  │
│  │    taxi_cost?    int    │                                                  │
│  │    order_index   int    │                                                  │
│  └──┬──────────────────────┘                                                  │
│     │1                                                                        │
│     │N (nullable — hoặc gắn vào trip_day)                                    │
│     ▼                                                                         │
│  ┌────── extra_expenses ──────┐                                               │
│  │ PK id           int        │                                               │
│  │ FK activity_id? int ───────│─ gắn vào activity HOẶC                       │
│  │ FK trip_day_id? int ───────│─ gắn vào trip_day (chỉ 1 trong 2)            │
│  │    name         varchar    │                                               │
│  │    amount       int        │                                               │
│  │    category     varchar    │                                               │
│  └────────────────────────────┘                                               │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           PLACES DOMAIN                                     │
│                                                                             │
│  ┌──────── destinations ────────┐                                           │
│  │ PK  id              int      │1──N                                       │
│  │     name            varchar  │──────────────────┐                        │
│  │     slug            varchar  │                  │                        │
│  │     description     text     │                  │                        │
│  │     image           varchar  │                  │                        │
│  │     latitude        float?   │                  ▼                        │
│  │     longitude       float?   │     ┌───────── places ───────────┐       │
│  │     is_active       bool     │     │ PK  id             int     │       │
│  │     places_count    int      │N──1 │ FK  destination_id  int     │       │
│  │     last_etl_at     timestmp?│     │     name            varchar │       │
│  └──────────────────────────────┘     │     category        varchar │       │
│                                       │     description     text    │       │
│     ┌───────── hotels ──────────┐     │     location        varchar │       │
│     │ PK  id             int    │     │     latitude        float?  │       │
│     │ FK  destination_id  int   │     │     longitude       float?  │       │
│     │     name            varchar│     │     avg_cost        int     │       │
│     │     price_per_night int   │     │     rating          float   │       │
│     │     rating          float │     │     review_count    int     │       │
│     │     review_count    int   │     │     image           varchar │       │
│     │     location        varchar│     │     opening_hours?  varchar │       │
│     │     image           varchar│     │     source          varchar │       │
│     │     booking_url?    varchar│     └──────┬─────────────────────┘       │
│     │     amenities       text   │            │1                             │
│     │     description     text   │            │N                             │
│     └────────────────────────────┘            ▼                              │
│                                   ┌──── saved_places ────┐                   │
│                                   │ PK  id        int    │                   │
│                                   │ FK  user_id   int    │ ← users.id       │
│                                   │ FK  place_id  int    │ ← places.id      │
│                                   │     created_at timest│                   │
│                                   └──────────────────────┘                   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    AI/CHAT DOMAIN (schema + API đã có trên current source)   │
│                                                                             │
│  ┌──────── chat_sessions ──────────┐     ┌──── chat_messages ────────────┐ │
│  │ PK  id               int        │1──N │ PK  id                int     │ │
│  │ FK  trip_id           int        │     │ FK  session_id         int     │ │
│  │ FK  user_id?          int        │     │     role               varchar │ │
│  │     thread_id        varchar     │     │     content            text    │ │
│  │     status           varchar     │     │     proposed_operations json   │ │
│  │     created_at       timestmp    │     │     requires_confirmation bool │ │
│  │     updated_at       timestmp    │     │     created_at          timestm│ │
│  └──────────────────────────────────┘     └──────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           ETL TRACKING                                      │
│                                                                             │
│  ┌──────── scraped_sources ────────┐                                        │
│  │ PK  id              int         │                                        │
│  │     source_name     varchar     │ ← ví dụ: "osm", "goong", "hotels_yaml"│
│  │     city            varchar?    │ ← ví dụ: "Hà Nội", "Đà Nẵng"         │
│  │     url             text?       │                                        │
│  │     last_crawled    timestmp    │                                        │
│  │     items_count     int         │                                        │
│  │     status          varchar     │ ← "pending" | "success" | "error"     │
│  │     error_message   text?       │                                        │
│  │     created_at      timestmp    │                                        │
│  └─────────────────────────────────┘                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Chi tiết từng bảng — Column-level

### 2.1 `users` — Thông tin tài khoản

| Column | Type | Constraint | Default | Mô tả |
|---|---|---|---|---|
| `id` | `int` | PK, auto-increment | — | Integer PK, FE dùng `id: number` |
| `email` | `varchar(255)` | UNIQUE, NOT NULL, INDEX | — | Email đăng nhập, case-sensitive |
| `hashed_password` | `varchar(255)` | NOT NULL | — | bcrypt hash, không lưu plaintext |
| `name` | `varchar(100)` | NOT NULL | — | Tên hiển thị |
| `phone` | `varchar(30)` | NULLABLE | — | Số điện thoại (chưa dùng trong API hiện tại) |
| `interests` | `json` | NOT NULL | `[]` | List string — ví dụ `["food","nature"]` |
| `is_active` | `bool` | NOT NULL | `true` | Deactivate account mà không xóa |
| `password_reset_token_hash` | `varchar(255)` | NULLABLE, INDEX | — | SHA-256 hash của reset token, NULL khi chưa yêu cầu |
| `password_reset_expires_at` | `timestamptz` | NULLABLE | — | Thời hạn reset token (mặc định 1 giờ) |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Server-generated, không set từ client |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Auto-update khi record thay đổi (`onupdate=now()`) |

**Relationships:**

| Relationship | Type | Target | Cascade |
|---|---|---|---|
| `trips` | 1:N | `Trip` | `all, delete-orphan` |
| `saved_places` | 1:N | `SavedPlace` | — |
| `refresh_tokens` | 1:N | `RefreshToken` | `all, delete-orphan` |
| `chat_sessions` | 1:N | `ChatSession` | — |

**Tại sao dùng `password_reset_token_hash` thay vì raw token:** Raw token chỉ xuất hiện 1 lần trong email và response. DB chỉ lưu hash để chống lộ token nếu DB bị compromise. Tương tự pattern cho refresh_token, share_token, claim_token.

---

### 2.2 `refresh_tokens` — Refresh token rotation

| Column | Type | Constraint | Default | Mô tả |
|---|---|---|---|---|
| `id` | `int` | PK, auto-increment | — | — |
| `user_id` | `int` | FK → `users.id` (CASCADE), NOT NULL, INDEX | — | Owner của token |
| `token_hash` | `varchar(255)` | NOT NULL, INDEX | — | SHA-256 hash, không lưu raw token |
| `expires_at` | `timestamptz` | NOT NULL | — | Thời hạn (mặc định 7 ngày) |
| `is_revoked` | `bool` | NOT NULL | `false` | `true` khi logout hoặc rotate |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — |

**Rotation flow:**

```text
1. User login → tạo refresh token → lưu hash + expires_at
2. User gọi /auth/refresh → hash raw token → tìm match → check !revoked + !expired
3. Revoke token cũ (is_revoked = true)
4. Tạo token mới → lưu hash mới → trả raw token mới cho client
5. Client thay thế refresh token cũ bằng mới trong localStorage
```

**Tại sao `is_revoked` thay vì xóa record:** Giữ audit trail. Khi logout, token bị revoke nhưng record vẫn tồn tại để debug nếu cần. Giữ record cũng giúp phát hiện replay attack — nếu ai đó cố dùng token đã revoke.

---

### 2.3 `trips` — Lịch trình chính

| Column | Type | Constraint | Default | Mô tả |
|---|---|---|---|---|
| `id` | `int` | PK, auto-increment | — | Integer PK, owner-only access |
| `user_id` | `int` | FK → `users.id` (CASCADE), NULLABLE, INDEX | — | `NULL` = guest trip, cần claim |
| `destination` | `varchar(100)` | NOT NULL, INDEX | — | Tên điểm đến (VD: "Đà Nẵng") |
| `trip_name` | `varchar(200)` | NOT NULL | — | Tên hiển thị trip |
| `start_date` | `date` | NOT NULL | — | Ngày bắt đầu |
| `end_date` | `date` | NOT NULL | — | Ngày kết thúc |
| `budget` | `int` | NOT NULL | — | Ngân sách (VND) |
| `total_cost` | `int` | NOT NULL | `0` | Tổng chi phí, tự tính bởi `_calculate_total_cost()` |
| `adults_count` | `int` | NOT NULL | `1` | Số người lớn |
| `children_count` | `int` | NOT NULL | `0` | Số trẻ em |
| `interests` | `json` | NOT NULL | `[]` | List string — sở thích |
| `status` | `varchar(20)` | NOT NULL | `"draft"` | `"draft"` | `"completed"` |
| `ai_generated` | `bool` | NOT NULL | `false` | `true` nếu tạo qua AI pipeline |
| `created_at` | `timestamptz` | NOT NULL, INDEX | `now()` | — |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Auto-update |

**Relationships:**

| Relationship | Type | Target | Cascade | Note |
|---|---|---|---|---|
| `user` | N:1 | `User` | — | `NULL` cho guest |
| `days` | 1:N | `TripDay` | `all, delete-orphan` | `order_by=day_number` |
| `accommodations` | 1:N | `Accommodation` | `all, delete-orphan` | — |
| `rating` | 1:1 | `TripRating` | `all, delete-orphan` | `uselist=False` |
| `share_link` | 1:1 | `ShareLink` | `all, delete-orphan` | `uselist=False` |
| `claim_tokens` | 1:N | `GuestClaimToken` | `all, delete-orphan` | — |
| `chat_sessions` | 1:N | `ChatSession` | `all, delete-orphan` | — |

**Tại sao `user_id` nullable:** Guest tạo trip mà chưa đăng nhập. Trip tồn tại với `user_id = NULL`. Khi guest đăng ký/đăng nhập, claim flow chuyển ownership qua `claim_tokens`.

**Tại sao `total_cost` là cột riêng thay vì tính runtime:** Auto-save flow gửi toàn bộ trip data mỗi lần save. Tính `total_cost` trong service layer sau `flush()` đảm bảo consistency. Không phụ thuộc FE tính đúng.

---

### 2.4 `trip_days` — Ngày trong chuyến đi

| Column | Type | Constraint | Default | Mô tả |
|---|---|---|---|---|
| `id` | `int` | PK, auto-increment | — | — |
| `trip_id` | `int` | FK → `trips.id` (CASCADE), NOT NULL, INDEX | — | — |
| `day_number` | `int` | NOT NULL | — | 1, 2, 3... |
| `label` | `varchar(50)` | NOT NULL | — | VD: "Ngày 1 - Hà Nội" |
| `date` | `varchar(20)` | NOT NULL | — | Format `dd/MM/yyyy` (string, FE convention) |
| `destination_name` | `varchar(100)` | NULLABLE | — | Tên điểm đến trong ngày (khác destination trip) |

**Unique constraint:** `uq_trip_days_trip_number` trên `(trip_id, day_number)` — không cho 2 ngày cùng số trong 1 trip.

**Tại sao `date` là `varchar` thay vì `Date`:** FE dùng format `dd/MM/yyyy` string. Chuyển đổi qua lại dễ gây bug timezone. Lưu string giữ nguyên format FE gửi.

---

### 2.5 `activities` — Hoạt động trong ngày

| Column | Type | Constraint | Default | Mô tả |
|---|---|---|---|---|
| `id` | `int` | PK, auto-increment | — | — |
| `trip_day_id` | `int` | FK → `trip_days.id` (CASCADE), NOT NULL, INDEX | — | — |
| `place_id` | `int` | FK → `places.id`, NULLABLE | — | Liên kết place từ DB (nếu có) |
| `name` | `varchar(200)` | NOT NULL | — | **LUÔN dùng `name`**, không dùng `title` |
| `time` | `varchar(10)` | NOT NULL | — | Format `HH:mm` |
| `end_time` | `varchar(10)` | NULLABLE | — | Format `HH:mm` |
| `type` | `varchar(30)` | NOT NULL | — | `food/attraction/nature/entertainment/shopping` |
| `location` | `varchar(300)` | NOT NULL | `""` | Địa chỉ |
| `description` | `text` | NOT NULL | `""` | Mô tả chi tiết |
| `image` | `varchar(500)` | NOT NULL | `""` | URL hình ảnh |
| `transportation` | `varchar(50)` | NULLABLE | — | `walk/bike/bus/taxi` |
| `adult_price` | `int` | NULLABLE | — | Giá người lớn (VND) |
| `child_price` | `int` | NULLABLE | — | Giá trẻ em (VND) |
| `custom_cost` | `int` | NULLABLE | — | Chi phí tùy chỉnh |
| `bus_ticket_price` | `int` | NULLABLE | — | Giá vé xe buýt |
| `taxi_cost` | `int` | NULLABLE | — | Chi phí taxi |
| `order_index` | `int` | NOT NULL | `0` | Thứ tự trong ngày (drag-and-drop) |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — |

**Relationships:**

| Relationship | Type | Target | Note |
|---|---|---|---|
| `trip_day` | N:1 | `TripDay` | — |
| `place` | N:1 | `Place` | Nullable — activity không nhất thiết liên kết place |
| `extra_expenses` | 1:N | `ExtraExpense` | Cascade delete |

**Tại sao giá là `int` nullable thay vì `0`:** `NULL` = chưa nhập giá (FE hiện "—"). `0` = miễn phí. Phân biệt 2 trạng thái này.

---

### 2.6 `accommodations` — Chỗ ở

| Column | Type | Constraint | Default | Mô tả |
|---|---|---|---|---|
| `id` | `int` | PK, auto-increment | — | — |
| `trip_id` | `int` | FK → `trips.id` (CASCADE), NOT NULL, INDEX | — | — |
| `hotel_id` | `int` | FK → `hotels.id`, NULLABLE | — | Liên kết hotel từ DB (nếu có) |
| `name` | `varchar(200)` | NOT NULL | — | Tên khách sạn |
| `check_in` | `varchar(20)` | NOT NULL | — | Ngày check-in |
| `check_out` | `varchar(20)` | NOT NULL | — | Ngày check-out |
| `price_per_night` | `int` | NOT NULL | `0` | Giá/đêm (VND) |
| `total_price` | `int` | NOT NULL | `0` | Tổng giá |
| `booking_url` | `varchar(500)` | NULLABLE | — | Link đặt phòng |
| `booking_type` | `varchar(20)` | NULLABLE | — | `hourly/nightly/daily` |
| `duration` | `int` | NULLABLE | — | Số đêm/ngày |
| `day_ids` | `json` | NOT NULL | `[]` | List int — IDs ngày cover bởi accommodation |

**Tại sao `day_ids` là JSON array:** Một accommodation có thể cover nhiều ngày (VD: khách sạn 3 đêm). Thay vì tạo bảng trung gian, dùng JSON array vì: (1) query theo accommodation → trip, không cần query ngược; (2) ít record; (3) đơn giản cho FE.

---

### 2.7 `extra_expenses` — Chi phí phát sinh

| Column | Type | Constraint | Default | Mô tả |
|---|---|---|---|---|
| `id` | `int` | PK, auto-increment | — | — |
| `activity_id` | `int` | FK → `activities.id` (CASCADE), NULLABLE, INDEX | — | Gắn vào activity HOẶC |
| `trip_day_id` | `int` | FK → `trip_days.id` (CASCADE), NULLABLE, INDEX | — | Gắn vào trip_day (chỉ 1 trong 2) |
| `name` | `varchar(200)` | NOT NULL | — | Tên chi phí |
| `amount` | `int` | NOT NULL | — | Số tiền (VND) |
| `category` | `varchar(30)` | NOT NULL | — | `food/attraction/entertainment/transportation/shopping` |

**Check constraint:** `ck_extra_expenses_single_parent` — đảm bảo chỉ gắn vào MỘT parent (activity HOẶC trip_day, không cả hai).

```sql
CHECK (
  (activity_id IS NOT NULL AND trip_day_id IS NULL) OR
  (activity_id IS NULL AND trip_day_id IS NOT NULL)
)
```

---

### 2.8 `share_links` — Chia sẻ trip công khai

| Column | Type | Constraint | Default | Mô tả |
|---|---|---|---|---|
| `id` | `int` | PK, auto-increment | — | — |
| `trip_id` | `int` | FK → `trips.id` (CASCADE), NOT NULL, UNIQUE | — | 1 trip chỉ có 1 share link |
| `token_hash` | `varchar(255)` | UNIQUE, NOT NULL | — | SHA-256 hash, không lưu raw token |
| `created_by_user_id` | `int` | FK → `users.id` (CASCADE), NOT NULL, INDEX | — | Ai tạo share link |
| `permission` | `varchar(20)` | NOT NULL | `"view"` | Chỉ `"view"` hiện tại |
| `expires_at` | `timestamptz` | NULLABLE | — | `NULL` = không hết hạn |
| `revoked_at` | `timestamptz` | NULLABLE | — | `NOT NULL` = đã revoke |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — |

**Unique constraint:** `uq_share_links_trip_id` — 1 trip chỉ tạo 1 share link. Share lại trả token cũ (redacted vì không recover raw token từ hash).

**Tại sao share_token là opaque thay vì integer ID:** Không cho đoán được link share. Nếu dùng `trip_id`, ai biết ID có thể xem trip bất kỳ. Opaque token = không đoán được.

---

### 2.9 `guest_claim_tokens` — Claim guest trip

| Column | Type | Constraint | Default | Mô tả |
|---|---|---|---|---|
| `id` | `int` | PK, auto-increment | — | — |
| `trip_id` | `int` | FK → `trips.id` (CASCADE), NOT NULL, INDEX | — | — |
| `token_hash` | `varchar(255)` | UNIQUE, NOT NULL | — | SHA-256 hash |
| `expires_at` | `timestamptz` | NOT NULL | — | Mặc định 24 giờ |
| `consumed_at` | `timestamptz` | NULLABLE | — | `NOT NULL` = đã sử dụng |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — |

**Tại sao one-time (consumed_at):** Chống replay. Nếu chỉ check `user_id IS NULL`, ai biết claimToken có thể claim trip nhiều lần. Check `consumed_at IS NULL` đảm bảo token chỉ dùng 1 lần.

---

### 2.10 `trip_ratings` — Đánh giá trip

| Column | Type | Constraint | Default | Mô tả |
|---|---|---|---|---|
| `id` | `int` | PK, auto-increment | — | — |
| `trip_id` | `int` | FK → `trips.id` (CASCADE), NOT NULL, UNIQUE | — | 1 trip chỉ 1 rating |
| `rating` | `int` | NOT NULL | — | 1-5 sao |
| `feedback` | `text` | NULLABLE | — | Nhận xét text |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — |

**Check constraint:** `ck_trip_ratings_rating_range` — `rating >= 1 AND rating <= 5`.

---

### 2.11 `destinations` — Thành phố/điểm đến

| Column | Type | Constraint | Default | Mô tả |
|---|---|---|---|---|
| `id` | `int` | PK, auto-increment | — | — |
| `name` | `varchar(100)` | UNIQUE, NOT NULL | — | Tên thành phố |
| `slug` | `varchar(100)` | UNIQUE, NOT NULL | — | URL-safe slug |
| `description` | `text` | NOT NULL | `""` | — |
| `image` | `varchar(500)` | NOT NULL | `""` | — |
| `latitude` | `float` | NULLABLE | — | — |
| `longitude` | `float` | NULLABLE | — | — |
| `is_active` | `bool` | NOT NULL | `true` | — |
| `places_count` | `int` | NOT NULL | `0` | Đếm số places (cập nhật bởi ETL) |
| `last_etl_at` | `timestamptz` | NULLABLE | — | Lần cuối ETL crawl destination này |

---

### 2.12 `places` — Địa điểm tham quan

| Column | Type | Constraint | Default | Mô tả |
|---|---|---|---|---|
| `id` | `int` | PK, auto-increment | — | — |
| `destination_id` | `int` | FK → `destinations.id` (CASCADE), NOT NULL, INDEX | — | — |
| `name` | `varchar(200)` | NOT NULL, INDEX | — | Tên địa điểm |
| `category` | `varchar(30)` | NOT NULL, INDEX | — | VD: `attraction`, `restaurant`, `museum` |
| `description` | `text` | NOT NULL | `""` | — |
| `location` | `varchar(300)` | NOT NULL | `""` | Địa chỉ |
| `latitude` | `float` | NULLABLE | — | — |
| `longitude` | `float` | NULLABLE | — | — |
| `avg_cost` | `int` | NOT NULL | `0` | Chi phí trung bình (VND) |
| `rating` | `float` | NOT NULL | `0` | Điểm rating |
| `review_count` | `int` | NOT NULL | `0` | Số review |
| `image` | `varchar(500)` | NOT NULL | `""` | — |
| `opening_hours` | `varchar(100)` | NULLABLE | — | Giờ mở cửa |
| `external_id` | `varchar(512)` | NULLABLE, INDEX | — | Provider place id; Goong `place_id` có thể rất dài |
| `raw_metadata` | `jsonb` | NULLABLE | — | Sanitized provider detail/prediction, không chứa API key |
| `source` | `varchar(30)` | NOT NULL | `"seed"` | `"seed"` / `"osm_overpass"` / `"goong_places"` |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Auto-update |

**Unique constraint:** `uq_places_name_dest` trên `(name, destination_id)` — không trùng tên trong cùng destination.

**Goong metadata:** `external_id` được ưu tiên khi upsert để rerun ETL không tạo duplicate lớn; nếu thiếu `external_id`, loader fallback về `(name, destination_id)`.

---

### 2.13 `hotels` — Khách sạn

| Column | Type | Constraint | Default | Mô tả |
|---|---|---|---|---|
| `id` | `int` | PK, auto-increment | — | — |
| `destination_id` | `int` | FK → `destinations.id` (CASCADE), NOT NULL, INDEX | — | — |
| `name` | `varchar(200)` | NOT NULL | — | — |
| `price_per_night` | `int` | NOT NULL | `0` | VND |
| `rating` | `float` | NOT NULL | `0` | — |
| `review_count` | `int` | NOT NULL | `0` | — |
| `location` | `varchar(300)` | NOT NULL | `""` | — |
| `image` | `varchar(500)` | NOT NULL | `""` | — |
| `booking_url` | `varchar(500)` | NULLABLE | — | Link đặt phòng |
| `amenities` | `text` | NOT NULL | `""` | Comma-separated (VD: "WiFi,Pool,Gym") |
| `description` | `text` | NOT NULL | `""` | — |

**Unique constraint:** `uq_hotels_name_dest` trên `(name, destination_id)`.

---

### 2.14 `saved_places` — Places user đã lưu

| Column | Type | Constraint | Default | Mô tả |
|---|---|---|---|---|
| `id` | `int` | PK, auto-increment | — | — |
| `user_id` | `int` | FK → `users.id` (CASCADE), NOT NULL, INDEX | — | — |
| `place_id` | `int` | FK → `places.id` (CASCADE), NOT NULL, INDEX | — | — |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — |

**Unique constraint:** `uq_saved_places_user_place` trên `(user_id, place_id)` — không lưu trùng.

---

### 2.15 `chat_sessions` / `chat_messages` — AI Chat (Phase C)

Schema đã có trong DB qua Alembic migration, và current source đã có session/message/apply-patch endpoints.

**`chat_sessions`:**

| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | `int` | PK | — |
| `trip_id` | `int` | FK → `trips.id` (CASCADE), NOT NULL | Session gắn với trip |
| `user_id` | `int` | FK → `users.id` (SET NULL), NULLABLE | `NULL` khi user bị xóa |
| `thread_id` | `varchar(120)` | UNIQUE, NOT NULL | LangGraph thread mapping |
| `status` | `varchar(20)` | NOT NULL, default `"active"` | `"active"` / `"archived"` |
| `created_at` / `updated_at` | `timestamptz` | — | — |

**`chat_messages`:**

| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | `int` | PK | — |
| `session_id` | `int` | FK → `chat_sessions.id` (CASCADE), NOT NULL | — |
| `role` | `varchar(20)` | NOT NULL | `"user"` / `"assistant"` / `"system"` |
| `content` | `text` | NOT NULL | Nội dung tin nhắn |
| `proposed_operations` | `json` | NOT NULL, default `[]` | Patch-confirm operations |
| `requires_confirmation` | `bool` | NOT NULL, default `false` | `true` = cần user confirm |
| `created_at` | `timestamptz` | NOT NULL | — |

---

### 2.16 `scraped_sources` — ETL Tracking

| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | `int` | PK | — |
| `source_name` | `varchar(100)` | NOT NULL | `"osm"` / `"goong"` / `"hotels_yaml"` |
| `city` | `varchar(100)` | NULLABLE | `"Hà Nội"` / `"Đà Nẵng"` |
| `url` | `text` | NULLABLE | URL nguồn crawl |
| `last_crawled` | `timestamptz` | NOT NULL | Lần crawl cuối |
| `items_count` | `int` | NOT NULL, default `0` | Số item crawl được |
| `status` | `varchar(20)` | NOT NULL, default `"pending"` | `"pending"` / `"success"` / `"error"` |
| `error_message` | `text` | NULLABLE | Lỗi nếu `status = "error"` |
| `created_at` | `timestamptz` | NOT NULL | — |

---

## 3. Migration History

| Migration | Ngày | Nội dung | Bảng thêm/sửa |
|---|---|---|---|
| `20260428_0001_initial_mvp2_schema` | 2026-04-28 | Schema MVP2 ban đầu | `users`, `refresh_tokens`, `trips`, `trip_days`, `activities`, `accommodations`, `extra_expenses`, `destinations`, `places`, `hotels`, `saved_places`, `share_links`, `guest_claim_tokens`, `trip_ratings`, `chat_sessions`, `chat_messages`, `scraped_sources` |
| `20260502_0002_sync_etl_schema` | 2026-05-02 | Bổ sung ETL tracking | `scraped_sources` thêm `source_name`, `city`, `url`, `items_count`, `status`, `error_message`; unique constraints cho places/hotels upsert |
| `20260504_0003_add_password_reset_fields` | 2026-05-04 | Password reset | `users` thêm `password_reset_token_hash`, `password_reset_expires_at` |
| `20260525_0004_add_goong_place_metadata` | 2026-05-25 | Goong ETL metadata | `places` thêm `external_id` (120 char), `raw_metadata` (JSONB); index `ix_places_external_id` |
| `20260525_0005_expand_goong_external_id` | 2026-05-25 | Long Goong place_id | `places.external_id` mở rộng `varchar(512)` để chứa Goong `place_id` dài |
| `20260608_0006_fix_accommodation_day_ids` | 2026-06-08 | Accommodation day linking fix | Chuẩn hóa `accommodations.day_ids` cho dữ liệu cũ |
| `20260609_0007_seed_trip_days_for_existing_trips` | 2026-06-09 | Backfill trip days | Seed `trip_days` cho trip cũ để workspace/edit flow ổn định |
| `20260621_0008_add_chat_message_confirmation_fields` | 2026-06-21 | C3C apply-patch confirmation state | `chat_messages` thêm `confirmation_status`, `trip_snapshot_updated_at`, `resolved_at` |
| `20260622_0009_add_chat_session_title` | 2026-06-22 | C4 chat session rename | `chat_sessions` thêm `title` |
| `20260703_0010_merge_vinh_ha_long_into_ha_long` | 2026-07-03 | Gộp `vinh-ha-long` lệch vào `ha-long` + tính lại `destinations.places_count` | `destinations`, `places.destination_id` |
| `20260703_0012_import_crawled_image_paths` | 2026-07-03 | Import ảnh crawl thật (places/hotels/destinations) theo slug | `places.image`, `hotels.image`, `destinations.image` |
| `20260703_0013_expand_crawled_image_paths` | 2026-07-03 | Bổ sung ảnh thật cho 13 place + 1 hotel còn trống (predicate `name`+`destination_id`) | `places.image`, `hotels.image` |
| `20260703_0014_backfill_activity_images_from_places` | 2026-07-03 | Backfill `activities.image` rỗng từ `places.image` qua `place_id` (sửa snapshot trip đóng băng lúc generate, vd. trip 837) | `activities.image` |
**Nguyên tắc migration:**
- Alembic là source of truth — không dùng `create_all()` trong production.
- Mỗi migration phải có `upgrade()` và `downgrade()`.
- Naming convention: `YYYYMMDD_NNNN_description.py`.
- Chạy `alembic upgrade head` trước khi start BE.

**Current truth after `00060B` / `00060C`:**
- `chat_sessions` và `chat_messages` đã nằm trong `20260428_0001_initial_mvp2_schema`.
- Trên `main` hiện tại không có migration riêng kiểu `add_companion_chat_tables`.
- `C3A` cần thêm session API và ownership rules, không cần dựng lại chat tables từ đầu.

---

## 4. Redis Cache Strategy

### Cache key patterns

| Key pattern | TTL | Khi nào invalidate | Dữ liệu cache |
|---|---|---|---|
| `destinations:all` | 1 giờ (configurable) | ETL reload destinations | `list[DestinationResponse]` JSON |
| `destinations:detail:{name}` | 1 giờ | ETL reload destination đó | `{ destination, places, hotels }` JSON |
| `places:search:{query}:{city}:{category}:{limit}` | 30 phút (configurable) | ETL reload places | `list[PlaceResponse]` JSON |

### Cache flow

```text
FE gọi GET /places/destinations
  │
  ├── PlaceService.get_destinations()
  │     ├── Redis GET "destinations:all"
  │     │     ├── HIT → parse JSON → return
  │     │     └── MISS → query DB → cache result → return
  │     └── Nếu Redis lỗi → log warning → query DB trực tiếp (fail-open)
  │
  └── FE nhận data (từ cache hoặc DB)
```

### Fail-open vs Fail-closed

| Context | Redis down | Tại sao |
|---|---|---|
| Places/destinations cache | **Fail-open**: query DB trực tiếp | App vẫn chạy, chỉ chậm hơn |
| AI rate limit | **Fail-closed**: return lỗi | Không cho request đi qua khi không kiểm soát được rate |

### Kết nối

| Môi trường | URL |
|---|---|
| Local dev | `redis://localhost:6379/0` |
| Docker Compose | `redis://redis:6379/0` |

---

## 5. ETL Pipeline

### Luồng tổng thể

```text
┌─────────────────────────────────────────────────────────────┐
│                    ETL PIPELINE                              │
│                                                              │
│  CLI: python -m src.etl --cities "Hà Nội" "Đà Nẵng"        │
│    │                                                         │
│    ▼                                                         │
│  ┌───── runner.py (orchestrator) ─────────────────────────┐ │
│  │  1. Parse CLI args (--cities, --hotels-only)            │ │
│  │  2. For each city:                                      │ │
│  │     ├── Extractor: fetch data từ nguồn                  │ │
│  │     ├── Transformer: chuẩn hóa format                   │ │
│  │     └── Loader: upsert vào DB                           │ │
│  │  3. Update scraped_sources tracking                     │ │
│  │  4. Invalidate Redis cache                              │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Sources:                                                    │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐  │
│  │ Goong API     │  │ OSM/Overpass  │  │ hotels.yaml    │  │
│  │ autocomplete, │  │ fallback POI  │  │ static hotel   │  │
│  │ detail,       │  │ no API key    │  │ seed data      │  │
│  │ geocode       │  │               │  │                │  │
│  │               │  │ Cần API key   │  │ No API key     │  │
│  └───────┬───────┘  └───────┬───────┘  └───────┬────────┘  │
│          │                  │                   │            │
│          ▼                  ▼                   ▼            │
│  ┌─────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │ goong_      │  │ osm_           │  │ hotel_         │  │
│  │ extractor   │  │ extractor      │  │ transformer    │  │
│  └──────┬──────┘  └───────┬────────┘  └───────┬────────┘  │
│         │                 │                    │            │
│         ▼                 ▼                    ▼            │
│  ┌──────────────────────────────────────────────────┐      │
│  │           place_transformer / hotel_transformer  │      │
│  │           Chuẩn hóa data → DB schema format       │      │
│  └──────────────────────┬───────────────────────────┘      │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────┐      │
│  │              db_loader (upsert)                   │      │
│  │  • Match external_id first, fallback name+dest   │      │
│  │  • Insert mới HOẶC update existing              │      │
│  │  • Update scraped_sources tracking               │      │
│  └──────────────────────┬───────────────────────────┘      │
│                          ▼                                   │
│                   PostgreSQL + Redis                         │
└─────────────────────────────────────────────────────────────┘
```

### ETL modules

```text
Backend/src/etl/
├── runner.py                # ETL orchestrator — điều phối extract/transform/load
├── __main__.py              # CLI entry point — `python -m src.etl`
├── extractors/
│   ├── osm_extractor.py     # OSM/Overpass POI extraction (không cần API key)
│   └── goong_extractor.py   # Goong autocomplete/detail/geocode
├── transformers/
│   ├── hotel_transformer.py # Chuẩn hóa hotel data → hotels schema
│   └── place_transformer.py # Chuẩn hóa place data → places schema
├── loaders/
│   └── db_loader.py         # DB upsert loader — insert hoặc update
└── data/
    └── hotels.yaml          # Sample hotel data cho test (không cần API key)
```

### Upsert strategy

```text
1. Nếu provider có `external_id`:
   ├── Query: SELECT FROM places WHERE external_id = ?
   ├── Tồn tại → UPDATE các trường thay đổi
   └── Không tồn tại → tiếp tục insert/upsert theo unique constraint

2. Fallback unique constraint:
   ├── ON CONFLICT (name, destination_id) DO UPDATE
   └── Không tồn tại → INSERT record mới

3. Update scraped_sources:
   ├── source_name = "etl_pipeline"
   ├── city = "Hà Nội"
   ├── items_count = số record đã insert/update
   ├── status = "success" / "error"
   └── last_crawled = now()

4. Invalidate Redis cache:
   ├── Xóa key "destinations:all"
   ├── Xóa key "destinations:detail:{city}"
   └── Xóa key pattern "places:search:*"
```

### Chạy ETL

```powershell
# Hotels-only (không cần API key)
cd Backend
uv run python -m src.etl --hotels-only --cities "Hà Nội"

# Full selected cities (cần GOONG_API_KEY)
uv run python -m src.etl --cities "Hà Nội" "Đà Nẵng"

# Dry-run Goong-first ETL, không ghi DB
uv run python -m src.etl --cities "Hà Nội" --dry-run
```

### Goong-first ETL readiness

- `GOONG_API_KEY`, `GOONG_MAP_KEY`, và `GOONG_MAP_API_KEY` đều được nhận bởi config; dùng một key REST ở BE/ETL, không đưa key REST vào FE.
- Goong endpoint chuẩn: `/place/autocomplete`, `/place/detail`, `/geocode`.
- Luồng hiện tại: Goong autocomplete theo keyword/category → place detail → transform/dedupe → DB upsert; OSM chỉ là fallback khi Goong lỗi hoặc trả quá ít dữ liệu.
- ETL CLI import đủ ORM registry để chạy độc lập ngoài FastAPI app bootstrap.
- HTTP provider logs được giảm xuống mức warning để tránh log query string chứa API key.
- Local smoke 2026-05-25: `Hà Nội` dry-run trả 75 candidates, 60 valid places; write load được 60 places + 3 hotels và invalidate Redis cache.

---

## 6. Index Strategy

| Bảng | Column(s) | Index Type | Mục đích |
|---|---|---|---|
| `users` | `email` | UNIQUE | Login lookup |
| `users` | `password_reset_token_hash` | B-tree | Reset token lookup |
| `refresh_tokens` | `user_id` | B-tree | List tokens by user |
| `refresh_tokens` | `token_hash` | B-tree | Token rotation lookup |
| `trips` | `user_id` | B-tree | List trips by owner |
| `trips` | `destination` | B-tree | Search by destination |
| `trips` | `created_at` | B-tree | Sort by newest |
| `trip_days` | `trip_id` | B-tree | List days by trip |
| `trip_days` | `(trip_id, day_number)` | UNIQUE | Prevent duplicate day number |
| `activities` | `trip_day_id` | B-tree | List activities by day |
| `places` | `name` | B-tree | Search by name |
| `places` | `category` | B-tree | Filter by category |
| `places` | `destination_id` | B-tree | List by destination |
| `places` | `external_id` | B-tree | Idempotent provider upsert |
| `places` | `(name, destination_id)` | UNIQUE | Prevent duplicate in same dest |
| `hotels` | `destination_id` | B-tree | List by destination |
| `hotels` | `(name, destination_id)` | UNIQUE | Prevent duplicate in same dest |
| `saved_places` | `user_id` | B-tree | List by user |
| `saved_places` | `place_id` | B-tree | Check if saved |
| `saved_places` | `(user_id, place_id)` | UNIQUE | Prevent double-save |
| `share_links` | `trip_id` | UNIQUE | 1 share per trip |
| `guest_claim_tokens` | `trip_id` | B-tree | Find tokens for trip |

---

## 7. Việc còn thiếu

- Chạy full ETL cho các city chính còn lại (Đà Nẵng, TP.HCM, Phú Quốc, Hội An...).
- Kiểm tra số lượng places/hotels sau crawl trước khi test AI generate cho city đó.
- ETL chưa có incremental update — mỗi lần chạy reload toàn bộ city.
- Phase C (post-00107): `chat_sessions`/`chat_messages` đã có full runtime APIs + session-management UX (rename/delete/switcher/load-more); `apply-patch` có rate limit riêng; phần còn thiếu chủ yếu là **data coverage cho city sparse** (Goong không trả places cho ~9/28 destination) — đã xử lý bằng `isGenerateReady=false` + pipeline empty-context guard.

## 8. Data quality ops (00107)

- **Cross-city contamination**: ETL guard trong `src.etl.transformers.city_match` dùng heuristic "last city token wins" (city hành chính cuối địa chỉ) để từ chối place sai thành phố — đáng tin hơn tên thành phố xuất hiện trong tên nhà hàng (vd "Nhà hàng Huế" ở Ba Đình, Hà Nội). Cleanup dữ liệu đã có qua CLI idempotent:
  - `docker compose exec -T api uv run python -m src.etl.cleanup --dry-run` (chỉ báo cáo)
  - `docker compose exec -T api uv run python -m src.etl.cleanup` (dọn thật: reassign `destination_id` cho place sai city; xoá place thiếu tọa độ không bị activity reference; recompute `places_count`)
- **Scheduler wiring**: service `scheduler` trong `docker-compose.yml` gate bởi profile `etl` (KHÔNG chạy cùng `docker compose up` mặc định). Bật khi cần refresh định kỳ: `docker compose --profile etl up -d scheduler`. One-shot: `docker compose exec -T api uv run python -m src.etl.scheduler --once --cities "Hà Nội"`.
- **Image/review sparsity là giới hạn provider**: Goong Places API (autocomplete + place_detail) không trả trường photo/image hay rating/review_count, nên phần lớn place trong DB có `image=''` và `review_count=0`. Đây là hạn chế nguồn dữ liệu, không phải bug — không fake ảnh/rating. Ranking theo rating chưa khả thi cho đến khi thêm provider có photo+review.
