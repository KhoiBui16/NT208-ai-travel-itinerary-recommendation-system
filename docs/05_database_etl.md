# 05. Database, Redis và ETL

## Database

PostgreSQL dùng Alembic làm migration source of truth.

Migration chính:

- `20260428_0001_initial_mvp2_schema.py`: schema MVP2.
- `20260502_0002_sync_etl_schema.py`: bổ sung `scraped_sources` và unique constraints cho ETL upsert.

## Nhóm bảng chính

- Auth/user: `users`, `refresh_tokens`.
- Trips: `trips`, `trip_days`, `activities`, `accommodations`, `extra_expenses`.
- Places: `destinations`, `places`, `hotels`, `saved_places`.
- Share/claim/rating: `share_links`, `guest_claim_tokens`, `trip_ratings`.
- AI/chat target: `chat_sessions`, `chat_messages`.
- ETL tracking: `scraped_sources`.

## Redis

Redis hiện dùng cho read cache places/destinations và hạ tầng rate limit/cache.

Local host:

```env
REDIS_URL=redis://localhost:6379/0
```

Docker Compose API container:

```env
REDIS_URL=redis://redis:6379/0
```

Cache places có thể fail-open để app vẫn chạy khi Redis tạm down.

## ETL pipeline

Luồng:

```text
extractors → transformers → loaders → database + cache invalidation
```

Nguồn:

- OSM/Overpass cho POI.
- Goong cho geocode/detail khi có `GOONG_API_KEY`.
- `Backend/src/etl/data/hotels.yaml` cho sample hotels.

Chạy hotels-only không cần key:

```powershell
cd Backend
uv run python -m src.etl --hotels-only --cities "Hà Nội"
```

Chạy full selected cities:

```powershell
cd Backend
uv run python -m src.etl --cities "Hà Nội" "Đà Nẵng"
```

## Việc còn thiếu

- Cung cấp `GOONG_API_KEY`.
- Chạy full ETL cho danh sách city chính.
- Kiểm tra số lượng places/hotels sau crawl.
- Có lịch crawl định kỳ nếu cần dữ liệu mới theo tháng.

