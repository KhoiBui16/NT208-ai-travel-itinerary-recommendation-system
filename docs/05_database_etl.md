# 05. Database, Redis và ETL

## Database

PostgreSQL dùng Alembic làm migration source of truth. Không dùng `create_all()` trong production.

### Migration history

| Migration | Ngày | Nội dung |
|---|---|---|
| `20260428_0001_initial_mvp2_schema.py` | 2026-04-28 | Schema MVP2 ban đầu: users, trips, places, share/claim |
| `20260502_0002_sync_etl_schema.py` | 2026-05-02 | Bổ sung `scraped_sources` + unique constraints cho ETL upsert |
| `20260504_0003_password_reset.py` | 2026-05-04 | Thêm `password_reset_token_hash`, `password_reset_expires_at` vào `users` |

### Nhóm bảng chính

#### Auth/User

| Bảng | Mô tả | Columns quan trọng |
|---|---|---|
| `users` | Thông tin tài khoản | `id`, `email` (unique), `name`, `hashed_password`, `is_active`, `avatar_url`, `password_reset_token_hash`, `password_reset_expires_at`, `created_at`, `updated_at` |
| `refresh_tokens` | Refresh token rotation | `id`, `token_hash` (unique), `user_id` (FK → users), `expires_at`, `revoked_at` |

**Lưu ý bảo mật:**
- Tất cả token (refresh, share, claim, reset) đều lưu **hash** trong DB, không lưu raw token.
- `password_reset_token_hash` + `password_reset_expires_at`: one-time use, sau khi dùng sẽ clear.
- Khi reset password, tất cả refresh tokens của user bị revoke (force re-login).

#### Trips

| Bảng | Mô tả | Columns quan trọng |
|---|---|---|
| `trips` | Lịch trình chính | `id`, `user_id` (FK → users, nullable cho guest), `destination`, `trip_name`, `start_date`, `end_date`, `budget`, `adults_count`, `children_count`, `interests` (JSON), `total_cost`, `cover_image`, `created_at`, `updated_at` |
| `trip_days` | Ngày trong chuyến đi | `id`, `trip_id` (FK → trips), `label`, `date`, `destination_name` |
| `activities` | Hoạt động trong ngày | `id`, `day_id` (FK → trip_days), `time`, `end_time`, `name`, `location`, `description`, `type` (food/attraction/nature/entertainment/shopping), `image`, `transportation`, `adult_price`, `child_price`, `custom_cost`, `bus_ticket_price`, `taxi_cost` |
| `accommodations` | Chỗ ở | `id`, `trip_id` (FK → trips), `day_ids` (JSON array), `booking_type` (hourly/nightly/daily), `duration`, `name`, `check_in`, `check_out`, `price_per_night`, `total_price`, `hotel_id` (FK → hotels, nullable) |
| `extra_expenses` | Chi phí phát sinh | `id`, `day_id` (FK → trip_days, nullable), `activity_id` (FK → activities, nullable), `name`, `amount`, `category` (food/attraction/entertainment/transportation/shopping) |

**Mối quan hệ:**
- `trips` 1:N `trip_days` 1:N `activities`
- `trips` 1:N `accommodations` (một accommodation có thể cover nhiều ngày qua `day_ids`)
- `extra_expenses` có thể gắn vào `trip_day` hoặc `activity` (nullable FK)

#### Places

| Bảng | Mô tả | Columns quan trọng |
|---|---|---|
| `destinations` | Thành phố/điểm đến | `id`, `name` (unique), `description`, `image`, `country`, `latitude`, `longitude` |
| `places` | Địa điểm tham quan | `id`, `destination_id` (FK → destinations), `name`, `description`, `category`, `image`, `address`, `latitude`, `longitude`, `rating`, `price_level` |
| `hotels` | Khách sạn | `id`, `destination_id` (FK → destinations), `name`, `description`, `image`, `address`, `latitude`, `longitude`, `star_rating`, `price_per_night`, `amenities` (JSON) |
| `saved_places` | Places user đã lưu | `id`, `user_id` (FK → users), `place_id` (FK → places), `created_at` |

#### Share/Claim/Rating

| Bảng | Mô tả | Columns quan trọng |
|---|---|---|
| `share_links` | Chia sẻ trip công khai | `id`, `trip_id` (FK → trips), `share_token` (unique), `created_at`, `expires_at` (nullable) |
| `guest_claim_tokens` | Claim guest trip | `id`, `trip_id` (FK → trips), `token_hash` (unique), `expires_at`, `consumed_at` (nullable) |
| `trip_ratings` | Đánh giá trip | `id`, `trip_id` (FK → trips), `user_id` (FK → users), `rating` (1-5), `feedback`, `created_at` |

**Share flow:**
1. Owner gọi `POST /itineraries/{tripId}/share` → tạo `share_token` (opaque, unique)
2. Public user truy cập `GET /shared/{shareToken}` → đọc-only, không cần auth
3. `share_token` có thể có expiry, nhưng default là không hết hạn

**Claim flow:**
1. Guest tạo trip (không auth) → response chứa `claimToken` (raw, chỉ hiển thị 1 lần)
2. DB lưu `token_hash` (SHA-256) + `expires_at`
3. User đăng ký/đăng nhập → FE gọi `POST /itineraries/{tripId}/claim` với claimToken
4. BE hash token → tìm match → check expiry + chưa consumed → transfer ownership → set `consumed_at`

#### AI/Chat (schema sẵn, chưa có API)

| Bảng | Mô tả | Columns quan trọng |
|---|---|---|
| `chat_sessions` | Phiên chat | `id`, `user_id` (FK → users), `trip_id` (FK → trips, nullable), `title`, `created_at`, `updated_at` |
| `chat_messages` | Tin nhắn trong session | `id`, `session_id` (FK → chat_sessions), `role` (user/assistant/system), `content`, `metadata` (JSON, nullable), `created_at` |

#### ETL Tracking

| Bảng | Mô tả | Columns quan trọng |
|---|---|---|
| `scraped_sources` | Theo dõi nguồn đã crawl | `id`, `source_type`, `source_id`, `city`, `scraped_at` |

## Redis

Redis dùng cho read cache places/destinations và hạ tầng rate limit/cache.

### Cache strategy

| Key pattern | TTL | Mô tả |
|---|---|---|
| `destinations:all` | 1 giờ | Cache danh sách destinations |
| `destinations:{name}` | 1 giờ | Cache chi tiết destination theo tên |
| `places:search:{query}:{city}:{category}` | 30 phút | Cache kết quả search places |

### Fail-open policy

- Places/destinations cache có thể **fail-open**: nếu Redis tạm down, API vẫn query thẳng DB và trả kết quả.
- AI rate limit **không được fail-open im lặng**: nếu Redis down khi check rate limit, phải return lỗi thay vì cho phép request đi qua.

### Kết nối

Local host:

```env
REDIS_URL=redis://localhost:6379/0
```

Docker Compose API container:

```env
REDIS_URL=redis://redis:6379/0
```

## ETL Pipeline

Luồng xử lý:

```text
extractors → transformers → loaders → database + cache invalidation
```

### Nguồn dữ liệu

| Nguồn | Mô tả | Yêu cầu API key |
|---|---|---|
| OSM/Overpass | POI (Point of Interest) từ OpenStreetMap | Không |
| Goong | Geocode, place detail, search | Có (`GOONG_API_KEY`) |
| `hotels.yaml` | Sample hotels dữ liệu tĩnh | Không |

### Chạy ETL

Hotels-only (không cần API key):

```powershell
cd Backend
uv run python -m src.etl --hotels-only --cities "Hà Nội"
```

Full selected cities:

```powershell
cd Backend
uv run python -m src.etl --cities "Hà Nội" "Đà Nẵng"
```

### ETL modules

```text
Backend/src/etl/
├── runner.py           # ETL orchestrator
├── __main__.py         # CLI entry point
├── extractors/
│   ├── osm_extractor.py    # OSM/Overpass POI extraction
│   └── goong_extractor.py  # Goong geocode/detail (cần API key)
├── transformers/
│   ├── hotel_transformer.py  # Chuẩn hóa hotel data
│   └── place_transformer.py  # Chuẩn hóa place data
├── loaders/
│   └── db_loader.py       # DB upsert loader
└── data/
    └── hotels.yaml        # Sample hotel data cho test
```

### Upsert strategy

ETL dùng upsert (insert hoặc update) thay vì insert-only:
- Dựa trên unique constraint (`source_type` + `source_id`) trong `scraped_sources`
- Nếu dữ liệu đã tồn tại, update thay vì duplicate
- Đảm bảo chạy ETL nhiều lần không tạo bản ghi trùng

## Việc còn thiếu

- Cung cấp `GOONG_API_KEY` để chạy full ETL (geocode + detail).
- Chạy full ETL cho danh sách city chính (Hà Nội, Đà Nẵng, TP.HCM, Phú Quốc, Hội An...).
- Kiểm tra số lượng places/hotels sau crawl — hiện DB có thể trống nếu chưa chạy ETL.
- Thiết lập lịch crawl định kỳ nếu cần dữ liệu mới (gợi ý: cron 30 ngày/lần).
- ETL chưa có incremental update — mỗi lần chạy reload toàn bộ city.
