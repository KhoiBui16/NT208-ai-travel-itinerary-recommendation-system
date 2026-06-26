# 06. Phase Backend Đã Implement

> ⚠️ **Tài liệu này tóm tắt phase Backend tại thời điểm Phase C.1 và không còn được duy trì.**
> Source of truth hiện tại cho trạng thái phase/AI nằm ở:
> - `docs/06_ai_roadmap.md` (C.1–C.4 đã merge)
> - `docs/11_phase_roadmap.md`
> - `docs/09_execution_tracker.md`
> - Bảng trạng thái phase trong `README.md`
> Các claim "Chưa implement" ở phần Phase C bên dưới đã LỆCH thời gian (C.2/C.3/C.4 đã merge).

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
- `POST /api/v1/auth/forgot-password`: gửi email reset password (silent nếu email không tồn tại).
- `POST /api/v1/auth/reset-password`: tiêu hao reset token + đổi mật khẩu mới.

Bug fixes (PR #24):

- `update_profile` và `change_password` đổi từ nhận `user: User` sang `user_id: int` — tránh cross-session ORM object access gây MissingGreenlet.
- `UserRepository.update()` thêm `session.refresh(user)` sau `flush()` — reload server-default columns.
- `get_current_user_optional` thêm `_optional_token(request)` dependency — FastAPI không extract Bearer token nếu chỉ dùng Python default `token: str | None = None`.

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

- Full e2e FE auto-save khi FE đã nối API thật — **FE đã nối qua useTripSync, useActivityManager, useAccommodation**.
- Activity extra expenses CRUD riêng nếu FE cần endpoint tách.
- Update accommodation hiện có add/delete và nested sync, chưa có endpoint update accommodation riêng.
- `ItineraryView` đã có share button (PR #19) — share flow nằm trong cả `TopActionBar` (TripWorkspace) và `ItineraryView`.
- Update trip sau `flush()` phải gọi `session.expire_all()` rồi re-fetch, nếu không SQLAlchemy Identity Map trả stale data (PR #24).
- `ActivitySchema.model_validate(activity, from_attributes=True)` trigger MissingGreenlet trên lazy `extra_expenses`. Dùng `_activity_to_schema()` static method xây schema từ scalar fields, default `extra_expenses=[]` (PR #24).
- `TripRepository.add_activity()`, `update_activity()`, `add_accommodation()` thêm `session.refresh()` sau `flush()` — reload server-generated columns (PR #24).

Async session lifecycle patterns (rút ra từ PR #24):

- Không truyền ORM object qua session boundary. Dependency `get_current_user` tạo User trong session A, nhưng service dùng session B. Giải pháp: truyền `user.id` và re-fetch trong service.
- `flush()` commit vào DB nhưng không refresh Python object. `session.refresh(obj)` load lại server defaults. `session.expire_all()` clear Identity Map cache để query fresh.
- Lazy relationship (`extra_expenses`) không access được ngoài eager-load context. Khi convert ORM → schema, phải build từ scalar fields thay vì dùng `model_validate(from_attributes=True)`.

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

## Phase C: AI Services

Đã implement C.1 trong branch `feat/00041-c-generate-pipeline`:

- Direct AI itinerary pipeline cho `POST /api/v1/itineraries/generate`.
- Build recommendation context từ Goong-enriched places/hotels trong DB.
- Gemini structured JSON output với Pydantic validation và retry.
- Persist Trip/Day/Activity/Accommodation, trả `ItineraryResponse`.
- AI quota cho authenticated user và guest fingerprint; Redis down fail-closed.

> **Cập nhật 2026-06-26:** Đoạn này từng phản ánh trạng thái thời Phase C.1. Hiện tại C.2/C.3/C.4 đã merge (chi tiết ở `docs/06_ai_roadmap.md` + `docs/11_phase_roadmap.md`), chỉ còn C.5 Analytics là optional/deferred.

Phase C hiện tại (đã merge):

- C.1 generate pipeline — merged (#42).
- C.2 SuggestionService (DB-only, EP-30) — merged (#49).
- C.3A chat session REST APIs — merged (#98–100).
- C.3B/C.3C companion chat + apply-patch confirm — merged (#105).
- C.4 chat history + session management (rename/delete/switcher) — merged (#106).
- C.5 Analytics (EP-34, Text-to-SQL) — optional/deferred (cần guardrails nếu bật).

Đã implement (trước đây ghi Phase C pending):

- Password reset endpoint (EP-31 forgot-password, EP-32 reset-password) — PR #20.

Do đó Phase C.1–C.4 đã local-ready; chỉ C.5 Analytics là optional.

## FE Integration Status Tổng Hợp

Tất cả trang FE chính đã nối BE API (xem chi tiết tại `docs/04_frontend.md`):

- Auth (login/register/logout) — `AuthContext`
- Profile/Account — `GET/PUT /users/profile`, `PUT /users/password`
- Trip CRUD — `useTripSync` (create/update/get)
- Activity CRUD — `useActivityManager` (add/update/delete + optimistic)
- Accommodation CRUD — `useAccommodation` (add/delete + optimistic)
- Places search/saved — `usePlacesManager` (debounced search, save/unsave)
- CreateTrip — `generateItinerary` → navigate TripWorkspace
- Share/Claim — `TopActionBar` + `AuthContext`
- City detail — `getDestinationDetail` + mock fallback
