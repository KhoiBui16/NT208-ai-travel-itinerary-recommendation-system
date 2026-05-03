# 01. Tổng quan MVP2

DuLichViet là hệ thống gợi ý lịch trình du lịch gồm Frontend React/Vite, Backend FastAPI, PostgreSQL, Redis cache, ETL dữ liệu địa điểm/khách sạn và roadmap AI itinerary/chat.

## Đã hoàn thành

- Foundation Backend MVP2: `Backend/src/`, `uv`, FastAPI app factory, async SQLAlchemy, Alembic, Docker.
- Auth/users: register, login, refresh, logout, profile, update profile, change password.
- Itinerary core: CRUD trip, nested days/activities/accommodations, owner check, share token, guest claim token, rating.
- Places/cache: destinations, place search/detail, saved places, Redis read cache fail-open.
- ETL D1: OSM/Goong extractors, transformers, DB upsert loader, `hotels.yaml`, CLI `uv run python -m src.etl`.
- CI/CD gate: PR policy, backend lint/unit/integration/migration, frontend build.
- README mới: hướng dẫn Docker-only, local `uv`, Redis URL, ETL, test.

## Chưa hoàn thành

- Phase C AI services chưa implement thật.
- `POST /api/v1/itineraries/generate` vẫn là stub, chưa gọi direct AI itinerary pipeline.
- AI companion chat chưa có patch-confirm flow thật.
- Chat history projection bằng `chat_sessions`/`chat_messages` chưa nối API đầy đủ.
- Full ETL real data cần `GOONG_API_KEY`.
- FE còn nhiều mock/localStorage; một số city/hotel/place data chưa nối hoàn toàn với BE.
- Docker Compose chưa có service frontend chính thức; hiện README hướng dẫn chạy FE bằng host Node hoặc container Node tạm.

## Nguyên tắc giữ ổn định

- Public API JSON dùng `camelCase`.
- Endpoint theo integer ID phải owner-only.
- Public share chỉ qua `shareToken`.
- Guest claim phải dùng `claimToken` one-time, hash trong DB, có expiry/consume.
- AI chat không tự ghi DB trước khi user confirm patch.
- Redis cache fail-open được; AI/rate-limit trả phí không được fail-open im lặng.

