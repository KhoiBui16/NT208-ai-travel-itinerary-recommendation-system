# 12. Current Source Audit & Docs Sync

**Cập nhật:** 2026-07-16
**Nguồn chi tiết:** [`docs/REPORTS/00138_source_docs_sync_audit.md`](REPORTS/00138_source_docs_sync_audit.md)

## Current Runtime Truth

| Layer | Current truth |
|---|---|
| Backend | FastAPI async trong `Backend/src/`, chạy bằng `uv`, SQLAlchemy async, Alembic, Redis |
| API | 41 route dưới `/api/v1/*` + root static asset route `/img/{file_path:path}` |
| Database | PostgreSQL là runtime DB; Alembic head hiện tại `20260707_0016_add_activity_coordinates` |
| CSV | `dulichviet_full_database_one_file.csv` là database snapshot/export artifact, không phải runtime storage backend |
| Static images | `asserts/images/` là source/crawl archive; `Backend/static/img/` là runtime folder; DB lưu `/img/...` |
| Frontend | Vite + React + TypeScript trong `Frontend/`; routes ở `Frontend/src/app/routes.tsx` |
| Maps | Backend dùng Goong REST key; FE chỉ dùng public map-tiles key `VITE_GOONG_MAP_API_KEY` |
| Deploy | FE target Vercel; BE target Render web + Render Postgres + Render Key Value/Redis; migration tự chạy bằng `preDeployCommand` |

## Re-check Evidence 2026-07-16

- `rg --files Backend` inventory: 524 files.
- `rg --files Frontend` inventory: 183 files.
- `rg --files docs -g "*.md"` inventory: 208 markdown files.
- Backend route introspection: 41 `/api/v1/*` routes + 1 root `/img/{file_path:path}` route.
- Backend collect-only: 194 unit tests + 79 integration tests.
- Frontend e2e source inventory: 18 spec files + 37 `test(...)` declarations.
- Root README architecture Mermaid was changed to avoid HTML `<br/>` labels because some IDE Markdown renderers fail rich-display parsing on those labels.

## Backend Scope

- Auth/users: register, login, refresh rotation, logout, profile, change password, forgot/reset password.
- Itineraries: manual CRUD, generate pipeline, guest claim, share link, rating, nested day/activity/accommodation operations.
- Companion chat: trip-bound sessions, persisted messages, Gemini-backed replies, `requiresConfirmation` + `proposedOperations`, `apply-patch` after user confirm.
- Places: destinations, destination detail, place search/detail, saved places, hotels, Redis read cache.
- ETL: Goong-first extract/transform/load, OSM fallback, sample hotels, scheduler behind Docker Compose `etl` profile.
- Assets: `/img/...` served from `Backend/static/img` with placeholder fallback and extension fallback.

## Frontend Scope

- Public pages: home, cities, city detail, shared trip, auth pages, forgot/reset password.
- Protected pages: trip library/history/workspace, saved places/itineraries, profile/account/settings.
- Trip workspace: BE-backed load/save, optimistic updates with revert, accommodation/activity/place operations.
- AI surfaces: `CreateTrip` calls generate API; `ChatPanel` is the active runtime companion UI; legacy demo/mock AI components remain in source but are not the primary runtime surface.
- Map surface: DailyItinerary map tab uses `GoongMap.tsx` and renders markers for places/activities with coordinates.

## Data Boundary

Do not document or implement "CSV as runtime database" unless a real importer/runtime code path is added. Current valid statements:

- PostgreSQL stores runtime app data.
- Alembic owns schema evolution.
- Goong ETL and migrations enrich destinations/places/hotels/activity images/coordinates.
- `dulichviet_full_database_one_file.csv` can be used only as a snapshot artifact after a separate import/restore process is defined.

## Docs Sync Checklist

When source changes, sync these together:

- Root `README.md`
- `Backend/README.md`
- `Frontend/README.md`
- `.claude/context/00_project_overview.md`
- `docs/INDEX.md`
- Relevant detailed docs: `03_backend.md`, `04_frontend.md`, `05_database_etl.md`, `08_testing_local_run.md`, `STAGING_DEPLOYMENT_GUIDE.md`
- A dated report under `docs/REPORTS/`
