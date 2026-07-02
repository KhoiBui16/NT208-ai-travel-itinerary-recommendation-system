# Evidence — Task 00135 (Runtime + ETL/Data + End-User Audit)

Bằng chứng verification local cho `docs/REPORTS/00135_runtime_etl_end_user_audit_report.md`.
Tất cả chạy từ repo root (`D:\...\NT208-ai-travel-itinerary-recommendation-system`), Windows + local Docker DB/Redis (không tạo stack/volume mới).

| File | Gate | Kết quả |
|---|---|---|
| `01_ruff_check.txt` | `uv run ruff check src tests` | All checks passed |
| `02_ruff_format_check.txt` | `uv run ruff format --check src tests` | 106 files already formatted |
| `03_pytest_f1_f2.txt` | `pytest tests/unit/test_config.py tests/unit/test_itinerary_pipeline.py` | 14 passed |
| `04_f3_testclient.txt` | `TestClient` `/img/destinations/ha-long.jpg` | 200 `image/svg+xml` (placeholder fallback) |
| `05_f1_db_proof.txt` | `docker exec db psql` post-migration | alembic=`20260703_0010`, 27 dests, ha-long 86 places/2 hotels, vinh-ha-long gone |
| `06_pytest_full_unit.txt` | `pytest tests/unit/` (full) | **193 passed** |
| `07_frontend_build.txt` | `npm run build -- --outDir <empty tmp>` | `✓ built in 17.15s` |

Lưu ý môi trường:
- Host Windows không kết nối được docker DB qua localhost (asyncpg `WinError 64`); DB query qua `docker exec db psql` (compose network).
- `api` container bị wedge (shim chết do `up --build` bị kill giữa chừng) — environmental, không phải regression code; F3 verify qua `TestClient` độc lập. Phục hồi = restart Docker Desktop.
- FE build EPERM ban đầu chỉ là Windows file-lock `dist/assets`; build ra outDir trống xanh sạch. CI chạy Linux nên không gặp.
