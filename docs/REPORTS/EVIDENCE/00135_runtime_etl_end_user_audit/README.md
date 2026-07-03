# Evidence — Task 00135 (Runtime + ETL/Data + End-User Audit)

Bằng chứng verification local cho `docs/REPORTS/00135_runtime_etl_end_user_audit_report.md`.
Tất cả chạy từ repo root (`<repo-root>`), Windows + local Docker DB/Redis (không tạo stack/volume mới).

> **Sanitized**: mọi local absolute path đã thay bằng placeholder (`<repo-root>`, `<temp-build-dir>`); ANSI color code đã strip. Không expose secret/token.
> **DB commands** dùng dạng chuẩn `docker compose exec -T db psql -U postgres -d dulichviet`.
> **Production note**: production Render/Vercel chạy `main`, KHÔNG chứa PR #126 đến khi merge — evidence này verify **branch PR** (local + CI), không phải production (xem báo cáo §A6).

| File | Gate | Kết quả |
|---|---|---|
| `01_ruff_check.txt` | `uv run ruff check src tests` | All checks passed |
| `02_ruff_format_check.txt` | `uv run ruff format --check src tests` | 106 files already formatted |
| `03_pytest_focused.txt` | `pytest test_config test_itinerary_pipeline test_agent_llm` | **22 passed** (incl. new generic-provider 503 test) |
| `04_f3_testclient.txt` | `TestClient` `/img/destinations/ha-long.jpg` | 200 `image/svg+xml` (placeholder fallback) |
| `05_migration_db_proof.txt` | `docker compose exec -T db psql` downgrade↔upgrade cycle | ha-long `places_count=86=real`, downgrade `INSERT 0 1` valid, vinh gone |
| `06_pytest_full_unit.txt` | `pytest tests/unit/` (full) | **194 passed** |
| `07_frontend_build.txt` | `npm run build -- --outDir <temp-build-dir>` | `✓ built in 12.30s` |
| `08_pr_status.txt` | `gh pr checks 126` + `gh pr view 126` (post-push) | **8/8 required checks pass** on `a7d3664`: pr-policy, backend-lint, backend-unit, backend-integration, backend-migrations, frontend-build, frontend-e2e, Vercel — state `OPEN`, `MERGEABLE` |

Lưu ý môi trường:
- Host Windows không kết nối được docker DB qua localhost (asyncpg `WinError 64`); DB query qua `docker compose exec -T db psql` (compose network).
- `api` container wedge (shim chết do `up --build` bị kill giữa chừng ở pass trước) — environmental, **không phải regression code**. F3 `/img` verify qua `TestClient` in-process; alembic runner đầy đủ chạy trên CI `backend-migrations`. Phục hồi api = restart Docker Desktop.
- FE build ra outDir ngoài repo (`<temp-build-dir>`) thay vì `Frontend/.build-tmp` vì (a) Windows file-lock gây EPERM trên `dist/.build-tmp`, (b) `.build-tmp` không gitignored → không được commit. Kết quả build giống nhau.
