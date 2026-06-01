Suggested PR title:

```txt
docs: [#00059] add full user journey UAT and manual run guide
```

## Mô tả

Thêm UAT toàn bộ user journey sau 00059A để xác nhận trạng thái sản phẩm trước phase `00060 — Architecture/System Review before C3/C4`.

Phase này chỉ audit/test/tài liệu. Không implement C3/C4, không gọi Gemini thật, không gọi Goong thật, và không chạy ETL thật.

## Thay đổi chính

- Thêm `docs/USER_JOURNEY_UAT.md` với matrix guest/auth/error journeys.
- Thêm `docs/LOCAL_MANUAL_UAT_GUIDE.md` với lệnh PowerShell-safe để chạy local UAT.
- Thêm report `docs/REPORTS/00059b_full_user_journey_uat.md`.
- Thêm issue `docs/REPORTS/ISSUES/issue_nested_trip_subresource_membership_authz_gap.md` cho authz gap ở nested activity/accommodation update/delete.
- Sync `README.md`, `docs/08_testing_local_run.md`, và `docs/REPORTS/REPORT.md` theo trạng thái hiện tại.

## Cách kiểm tra (Testing)

```powershell
$ROOT = git rev-parse --show-toplevel

Set-Location "$ROOT\Backend"
uv run ruff check src tests
uv run ruff format --check src tests
uv run pytest tests/unit/ -v --tb=short
uv run alembic upgrade head
uv run alembic check
$env:CI = "true"
uv run pytest tests/integration/ -v --tb=short

Set-Location "$ROOT\Frontend"
npm run build -- --outDir .build-tmp\verify-00059b-uat
$env:E2E_API_URL = "http://localhost:8000"
npx playwright test --reporter=list
```

Verified locally:

- Backend ruff check: PASS.
- Backend ruff format check: PASS.
- Backend unit tests: 119 passed.
- Alembic upgrade/check: PASS.
- Backend integration tests: 44 passed.
- Frontend build: PASS.
- Playwright: 19 passed, 3 skipped.

## Lưu ý khác

- Do not merge until PR Policy, Frontend CI, and Backend CI pass.
- Do not stage local artifacts such as `Frontend/.build-tmp*/`, `test-results/`, or `playwright-report/`.
- `00059B` can proceed to `00060` as a review phase, but C3/C4 implementation should not start until the nested subresource authorization gap is fixed or explicitly triaged.
