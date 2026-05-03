# 06. Phase Backend Đã Implement

File này mô tả các phase Backend đã làm thật trong code hiện tại. Phần AI chưa implement được ghi là pending trong overview/tracker, không xem là tính năng đã hoàn thành.

## Phase A: Foundation

Mục tiêu của phase A là chuyển Backend từ MVP1 rời rạc sang cấu trúc có thể chạy local, test và mở rộng:

```text
Backend/src/
├── main.py
├── api/v1/
├── base/
├── core/
├── models/
├── repositories/
├── schemas/
├── services/
└── etl/
```

Đã làm:

- `Backend/pyproject.toml` dùng `uv` để quản lý dependency.
- `src.main:create_app()` tạo FastAPI app, mount router `/api/v1`, middleware và exception handlers.
- `src/core/config.py` gom config từ env, `.env`, `config.yaml`, default.
- `src/core/database.py` dùng async SQLAlchemy engine/session.
- Alembic là source of truth cho schema.
- Docker Compose chạy API, PostgreSQL, Redis.
- Test nền có unit/integration, CI dùng `uv`.

Điểm cần nhớ:

- Secret không đặt trong `config.yaml`.
- Host local dùng `localhost`; container API dùng service name `db` và `redis`.
- Nếu đổi model/schema phải tạo migration.

## Phase B1: Auth và Users

Đã làm:

- `POST /api/v1/auth/register`: tạo user, hash password, trả access token + refresh token.
- `POST /api/v1/auth/login`: verify email/password, trả token pair.
- `POST /api/v1/auth/refresh`: rotate refresh token, revoke token cũ.
- `POST /api/v1/auth/logout`: revoke refresh token.
- `GET /api/v1/users/profile`: đọc profile user hiện tại.
- `PUT /api/v1/users/profile`: update name/phone/interests.
- `PUT /api/v1/users/password`: đổi password sau khi verify password cũ.

Luồng chuẩn:

```text
router auth/users
→ AuthService/UserService
→ UserRepository/RefreshTokenRepository
→ users + refresh_tokens
```

Security đã có:

- Password hash bằng bcrypt.
- Access token là JWT ngắn hạn.
- Refresh token là opaque token, chỉ lưu hash trong DB.
- Refresh/logout không lưu raw token.

Test hiện có:

- Unit test cho auth service, user service, security.
- Integration test cho auth endpoints.

## Phase B2: Itineraries, Share, Claim

Đã làm:

- Manual trip create/list/get/update/delete.
- Nested update cho `days`, `activities`, `accommodations`.
- Activity create/update/delete theo trip owner.
- Accommodation create/delete theo trip owner.
- Rating trip.
- Public share bằng `shareToken`.
- Guest claim bằng `claimToken`.

Luồng owner-only:

```text
FE gọi /itineraries/{tripId}
→ get_current_user từ Bearer token
→ ItineraryService verify owner
→ TripRepository query full data
→ trả ItineraryResponse camelCase
```

Luồng guest claim:

```text
Guest create/generate trip
→ BE trả tripId + claimToken một lần
→ user login/register
→ POST /itineraries/{tripId}/claim với claimToken
→ BE hash token, check expiry/consumed
→ gán trip.user_id
```

Luồng share:

```text
Owner POST /itineraries/{tripId}/share
→ tạo opaque token, lưu token_hash
→ public GET /shared/{shareToken}
→ trả read-only itinerary
```

Điểm còn cần kiểm thử sâu hơn sau này:

- Full e2e FE auto-save khi FE đã nối API thật.
- Activity extra expenses CRUD riêng nếu FE cần endpoint tách.
- Update accommodation hiện có add/delete và nested sync, chưa có endpoint update accommodation riêng.

## Phase B3: Places, Saved Places, Redis Cache

Đã làm:

- Public list destinations.
- Public destination detail gồm destination, places, hotels.
- Public place search/detail.
- Auth saved places list/save/unsave.
- Redis read cache cho destinations/search/detail.

Luồng places:

```text
router places
→ PlaceService
→ Redis cache get
→ PlaceRepository
→ Redis cache set
→ response camelCase
```

Cache rule:

- Cache places/destinations được fail-open.
- Nếu Redis lỗi, API log warning và fallback DB.
- Không áp dụng fail-open này cho rate limit AI trả phí sau này.

## Phase D: ETL và Local Readiness

Đã làm:

- ETL CLI: `uv run python -m src.etl`.
- OSM extractor cho POI.
- Goong extractor cho geocode/detail khi có `GOONG_API_KEY`.
- Transformer chuẩn hóa places/hotels.
- DB loader upsert destinations, places, hotels.
- `scraped_sources` track ETL run.
- `hotels.yaml` làm sample hotel data không cần API key.
- `config.yaml` có danh sách 28 city Việt Nam.

Luồng ETL:

```text
config.yaml cities
→ OSM/Goong extractors
→ transformers
→ db_loader upsert
→ invalidate Redis cache
```

Chạy hotels-only không cần Goong:

```powershell
cd Backend
uv run python -m src.etl --hotels-only --cities "Hà Nội"
```

Chạy full selected cities cần network và nên có Goong key:

```powershell
cd Backend
uv run python -m src.etl --cities "Hà Nội" "Đà Nẵng"
```

## Phase C: AI Pending

Chưa implement trong code hiện tại:

- Direct AI itinerary pipeline.
- Structured output validation từ LLM.
- Companion chat.
- Patch-confirm flow.
- Chat history API.
- Analytics EP-34.

Do đó không coi Phase C là done trong tracker hoặc báo cáo test.
