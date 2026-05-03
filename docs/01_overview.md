# 01. Tổng Quan MVP2

DuLichViet MVP2 hiện là hệ thống web du lịch gồm Frontend React/Vite, Backend FastAPI, PostgreSQL, Redis và ETL dữ liệu địa điểm/khách sạn. AI itinerary/chat vẫn là phase kế tiếp, chưa được xem là tính năng hoàn thành trong code hiện tại.

## Thứ Tự Đọc Docs

1. **01_overview.md** (file này): trạng thái MVP2 hiện tại, phần đã làm, phần chưa làm.
2. [02_architecture.md](02_architecture.md): kiến trúc tổng thể FE, BE, DB, Redis, ETL và boundary AI pending.
3. [03_backend.md](03_backend.md): Backend FastAPI, module, endpoint, flow service/repository, config.
4. [04_frontend.md](04_frontend.md): Frontend Vite/React, route map, dữ liệu mock/localStorage, điểm cần nối BE.
5. [05_database_etl.md](05_database_etl.md): schema, migration, Redis, ETL cities/places/hotels.
6. [06_backend_phases.md](06_backend_phases.md): các phase Backend đã implement thật.
7. [07_workflow_ci.md](07_workflow_ci.md): branch, commit, PR, CI/CD, GitHub rules.
8. [08_testing_local_run.md](08_testing_local_run.md): cách chạy local, Docker, uv, npm, smoke test.
9. [09_execution_tracker.md](09_execution_tracker.md): tracker task/branch/PR hiện tại.
10. [10_automation_testing_report.md](10_automation_testing_report.md): báo cáo automation test BE/FE mới nhất.

## Quy Tắc Viết Docs

- Chỉ ghi "đã làm" khi source code, test hoặc workflow hiện tại chứng minh được.
- Phần AI hiện là pending; không tạo tài liệu như một service đã chạy thật.
- Khi đổi API contract, schema, config, CI, README hoặc flow local run, cập nhật `docs/` trong cùng branch.
- `docs/09_execution_tracker.md` phải được sync trước khi branch chuyển sang review.
- Các folder/file legacy đã loại khỏi workflow active: `plan/`, `md/`, `Diagram/`, `References/`, `guidelines/`, `Backend/BE_docs.md`, `PR_DESCRIPTIONS.md`. Nếu cần phục hồi, lấy từ git history và đối chiếu code hiện tại.

## Trạng Thái Ngắn Gọn

```text
MVP1
→ FE revamp mạnh về UI/contract
→ BE refactor MVP2 theo FastAPI async + Alembic + repository/service
→ ETL foundation cho city/place/hotel data
→ AI Phase C pending
```

## Đã Hoàn Thành

Backend:

- Foundation `Backend/src/` với FastAPI app factory, `uv`, async SQLAlchemy, Alembic, Docker.
- Config tập trung trong `Backend/config.yaml` và `Backend/src/core/config.py`.
- Auth/users: register, login, refresh rotation, logout, profile, update profile, change password.
- Itinerary core: create/list/get/update/delete, nested days/activities/accommodations, owner check, rating.
- Share/claim: public `shareToken`, guest `claimToken` one-time, token hash trong DB.
- Places/cache: destinations, destination detail, place search/detail, saved places, Redis read cache fail-open.
- ETL D1: OSM/Goong extractors, transformers, DB upsert loader, `hotels.yaml`, `scraped_sources`.
- Tests: unit + integration cho backend, CI lint/unit/integration/migration, frontend build.

Frontend:

- FE revamp UI trong `Frontend/` với Vite, React, TypeScript.
- Route set đầy đủ cho home, city list/detail, auth, trip setup, trip workspace, saved/history/settings.
- FE type contract quan trọng nằm ở `Frontend/src/app/types/trip.types.ts`.
- Root build đã trỏ đúng `Frontend/src/main.tsx`.

Docs/ops:

- Legacy docs/folder đã được dọn khỏi workflow active.
- `docs/` là tài liệu chính.
- `README.md` có hướng dẫn Docker-only, local `uv`, Redis URL, ETL, test.
- Branch/commit/PR/CI rules đã chuẩn hóa.

## Chưa Hoàn Thành

AI:

- `POST /api/v1/itineraries/generate` vẫn là stub, chưa gọi LLM pipeline thật.
- Chưa có direct itinerary pipeline, structured output validation, retry, hoặc guardrails hoàn chỉnh.
- Chưa có AI companion chat, patch-confirm flow, chat history API.
- Analytics EP-34 chưa bật và chưa có SQL guardrails.

Frontend integration:

- API client layer đã triển khai (`services/api.ts` + 4 service modules).
- Auth, profile, trip list, saved places đã nối BE API thật.
- `AuthContext` quản lý JWT state toàn app.
- 7 protected routes redirect sang `/login` khi chưa đăng nhập.
- `useTripSync` vẫn dùng localStorage cho workspace state.
- Một số màn (TripHistory, DailyItinerary) cần nối thêm.
- Chưa có Playwright/Cypress hoặc FE unit test runner.

ETL/data:

- Full ETL real data cần `GOONG_API_KEY`.
- Cần chạy ETL cho danh sách city chính sau khi có key/network.
- Cần kiểm số lượng destination/place/hotel sau crawl.

Docker/deploy:

- Docker Compose hiện chạy API, PostgreSQL, Redis.
- Chưa có service frontend chính thức trong Compose; README đang hướng dẫn host Node hoặc Node container tạm.
- Chưa tự động deploy; CI/CD hiện là quality gate.

## MVP2 Cải Tiến So Với MVP1

Backend:

- Từ MVP1 đơn giản sang kiến trúc router/service/repository/schema/model rõ ràng.
- Từ tạo bảng trực tiếp sang Alembic migration.
- Từ auth cơ bản sang JWT access token + refresh token rotation + revoke.
- Từ trip ID dễ rủi ro sang owner-only ID endpoints.
- Từ public trip by ID sang public share bằng opaque `shareToken`.
- Từ guest claim theo `user_id IS NULL` sang `claimToken` hash, expiry, consume.
- Từ data mock thuần sang ETL places/hotels có upsert và Redis cache.

Frontend:

- UI được mở rộng thành nhiều workflow thực tế hơn: city browsing, trip setup, workspace, history, saved places.
- Contract itinerary mới dùng `Activity.name`, `adultPrice`, `childPrice`, `extraExpenses`, `Day.activities`.
- Nhiều màn đã sẵn UI nhưng cần nối API thật để thay localStorage/mock.

Ops:

- Có Docker Compose, CI, PR policy, branch/commit convention, execution tracker.
- Có README và docs mới để người khác clone repo có thể chạy local.

## Invariant Cần Giữ

- Public API JSON dùng `camelCase`.
- Endpoint theo integer ID phải owner-only.
- Public share chỉ qua `shareToken`.
- Guest claim phải dùng `claimToken` one-time, hash trong DB, có expiry/consume.
- AI chat sau này không được tự ghi DB trước khi user confirm patch.
- Redis cache places có thể fail-open; AI/rate-limit trả phí không được fail-open im lặng.

## Kết Luận Hiện Tại

Backend CRUD core đã chạy và có test, nhưng mức e2e với FE vẫn chưa hoàn chỉnh vì FE còn mock/localStorage. Giai đoạn tiếp theo nên ưu tiên nối FE-BE thật cho auth/trip/place trước khi implement AI Phase C.
