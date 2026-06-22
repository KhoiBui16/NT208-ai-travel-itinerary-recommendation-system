# Issue: ETL Scheduler Missing — Manual Only

## Status
RESOLVED (PR #106 / task 00107): scheduler đã wired vào `docker-compose.yml` qua compose profile `etl` (service `scheduler`, không chạy cùng `docker compose up` mặc định). One-shot qua `docker compose exec -T api uv run python -m src.etl.scheduler --once --cities "<city>"`. (Historical Phase 3A-R: deployment strategy documented in `00052_deployment_etl_strategy.md`)

## Evidence
- **B1.5 ETL Scheduling Audit** (2026-05-28): `ETL_MANUAL_ONLY`
- `docker-compose.yml`: không có cron/worker service
- `.github/workflows/backend-ci.yml`: không có `schedule:` trigger
- `Backend/src/etl/runner.py`: CLI only — `uv run python -m src.etl`
- Không có Celery, APScheduler, RQ, hay bất kỳ scheduler nào
- `destinations.last_etl_at`: luôn NULL (không được update sau ETL)

## Impact
- Data có thể stale nếu developer quên chạy ETL
- Không có cách biết data được refresh lần cuối khi nào (`last_etl_at = NULL`)
- Goong POI data thay đổi theo thời gian (địa điểm mới, đóng cửa, thay đổi giờ)
- Không có alerting khi ETL fail

## Reproduction
1. Kiểm tra `destinations.last_etl_at` → NULL
2. Kiểm tra `scraped_sources` → chỉ có 3 rows từ manual runs (2026-05-25, 2026-05-27)
3. Không có scheduled job nào

## Expected
- ETL chạy tự động theo lịch (weekly hoặc bi-weekly)
- `destinations.last_etl_at` được update sau mỗi ETL run
- Alert khi ETL fail

## Actual
- ETL chỉ chạy khi developer gõ command thủ công
- `destinations.last_etl_at` = NULL

## Suggested fixes

**Option A (GitHub Actions schedule)**:
```yaml
# .github/workflows/etl-scheduled.yml
on:
  schedule:
    - cron: '0 2 * * 0'  # Every Sunday 2AM UTC
jobs:
  etl:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run ETL
        run: uv run python -m src.etl --cities "Hà Nội" "Đà Nẵng" "Thành phố Hồ Chí Minh"
        env:
          GOONG_API_KEY: ${{ secrets.GOONG_API_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

**Option B (Docker cron sidecar)**: Thêm cron service vào `docker-compose.yml`.

**Fix `destinations.last_etl_at`**: Update trong `db_loader.py` sau mỗi ETL run thành công.

## Recommended branch
`feat/00052-c-etl-goong-data-expansion` (bao gồm fix `last_etl_at` và schedule)
