# 00137 Current Source Docs Sync Audit

**Ngày:** 2026-07-10
**Scope:** `.claude/`, `docs/`, `README.md`, `Backend/README.md`, `Frontend/README.md`, source inventory từ `Backend/`, `Frontend/`, database/deploy artifacts.

## Kết luận ngắn

Runtime hiện tại **chưa chuyển sang đọc database từ CSV trực tiếp**. Source vẫn dùng FastAPI + PostgreSQL + async SQLAlchemy + Alembic + Redis. File `dulichviet_full_database_one_file.csv` ở repo root là snapshot/export artifact của database, không có code path backend nào đọc file CSV này ở runtime.

## Evidence đã kiểm tra

| Hạng mục | Evidence |
|---|---|
| Branch/HEAD | `main`, HEAD `42f4d33 Update video demo link in README.md` |
| Dirty tree | `asserts/videos/VideoDemoNhom9-TravelAI.mp4` đang untracked tại thời điểm audit; file này cần Git LFS vì >100 MB |
| API routes | 41 route dưới `/api/v1/*` + 1 root asset route `/img/{file_path:path}` |
| Backend runtime | `Backend/src/main.py` include routers auth/users/places/agent/itineraries/shared; lifespan chỉ check DB, không `create_all()` |
| Backend test inventory | `uv run pytest tests/unit --collect-only -q` → 194 collected; `uv run pytest tests/integration --collect-only -q` → 79 collected |
| Database | 17 SQLAlchemy model tables; Alembic migration chain đến `20260707_0016_add_activity_coordinates` |
| CSV snapshot | `dulichviet_full_database_one_file.csv` tồn tại ở repo root, header `table_name,record_id,record_json`; `alembic_version` trong snapshot đang là `20260705_0015`, thấp hơn code head `0016` |
| Static assets | `Backend/static/img/` có 395 runtime image files; `asserts/images/` có 239 crawl/source files |
| Frontend | Vite + React + TS; route source `Frontend/src/app/routes.tsx`; Goong map ở `GoongMap.tsx` dùng `VITE_GOONG_MAP_API_KEY` |
| E2E inventory | `npx playwright test --list` → 37 tests in 18 files |
| Deploy | `render.yaml` dùng Render Postgres + Key Value + web service, `preDeployCommand: uv run alembic upgrade head`; `Frontend/vercel.json` SPA fallback rewrite |

## Drift đã sync

- Root README: cập nhật current HEAD, migration count, e2e spec count, database/CSV note, static image contract, video demo local embed.
- Backend README: cập nhật migration head `0016`, CSV snapshot boundary, image/coordinate migration notes.
- Frontend README: cập nhật e2e inventory và Goong/static image/runtime state.
- `.claude`: thêm sub-agent `current-source-docs-auditor`, cập nhật agent registry và condensed overview.
- `docs/INDEX.md`, `docs/01_overview.md`, `docs/05_database_etl.md`, `docs/08_testing_local_run.md`, `docs/11_phase_roadmap.md`: cập nhật source-truth snapshot ngày 2026-07-10.

## Database/CSV verdict

- **Runtime source of truth:** PostgreSQL schema do Alembic quản lý.
- **Migration head:** `20260707_0016_add_activity_coordinates`.
- **CSV role:** snapshot/export artifact để tham khảo hoặc seed/import thủ công nếu có quy trình riêng.
- **Không nên nói:** "backend đã chuyển sang dùng CSV" hoặc "deploy đọc CSV trực tiếp".
- **Nếu import CSV lên DB:** cần reconcile `alembic_version` trong snapshot (`0015`) với code head (`0016`) bằng migration sau restore, và không paste dữ liệu auth/user ra docs.

## Rủi ro còn lại

- CSV snapshot chứa dữ liệu nguyên bảng dạng JSON record, có thể bao gồm auth/user rows đã export. Nếu repo public/nộp bài công khai, cần review privacy/security trước khi public hoặc thay bằng sanitized demo seed.
- Backend collect-only đã chạy trong turn này: `194 unit + 79 integration = 273` tests collected. Full pass chưa chạy, nên không claim current green.

## Next actions

1. Chạy collect/test lại khi cần claim "verified pass" mới nhất:
   - `cd Backend && uv run pytest tests/unit tests/integration --collect-only -q`
   - `cd Frontend && npx playwright test --list`
2. Quyết định xử lý `dulichviet_full_database_one_file.csv`: giữ private artifact, sanitize, hoặc tạo importer/seed script rõ ràng.
3. Nếu muốn deploy bằng CSV snapshot, tạo runbook import chính thức thay vì chỉ để CSV ở repo root.
