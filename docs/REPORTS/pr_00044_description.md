# PR Description: fix/00044-c-stabilize-c1-guest-flow

## Mô tả

- Ổn định luồng guest claim sau C.1 AI Generate trước khi chuyển sang C.2/C.3.
- Sửa lỗi reload `/login` hoặc `/register` làm mất redirect target về generated workspace.
- Triage và fix FE dependency audit vulnerabilities.
- Task ID: [#00044](https://app.clickup.com/t/00044)

## Thay đổi chính

- [x] Lưu `returnTo` cùng `pendingClaim` trong `sessionStorage`.
- [x] Cho `login()` và `register()` trả về redirect target sau khi claim thành công.
- [x] Điều hướng Login/Register về workspace đã claim, fallback về flow cũ nếu không có claim.
- [x] Thêm Playwright e2e cho login reload claim và register reload claim.
- [x] Cập nhật Vite lên `6.4.2` và lockfile để `npm audit` còn 0 vulnerabilities.
- [x] Cập nhật report/issue notes và screenshot evidence.

## Cách kiểm tra (Testing)

- Backend:
  - `uv run ruff check src tests`
  - `uv run ruff format --check src tests`
  - `uv run alembic upgrade head`
  - `uv run alembic check`
  - `uv run pytest tests/unit/ -v --tb=short`
  - `uv run pytest tests/integration/ -v --tb=short`
- Frontend:
  - Clean worktree: `npm ci`
  - `npm audit --json` -> 0 vulnerabilities
  - Clean worktree: `npm run build`
  - `npm run build -- --outDir ..\.codex-run-logs\frontend-dist-fix-00044-after-audit --emptyOutDir=true`
  - `npx playwright test --reporter=list` -> 13 passed
- CI policy:
  - Local branch regex check -> pass
  - Local PR title regex check -> pass
  - Local required PR body section check -> pass
- Browser smoke:
  - Auth UI generate -> `POST /api/v1/itineraries/generate = 201`
  - Seeded guest pending claim survives reload
  - Seeded guest login claim -> `POST /api/v1/itineraries/{id}/claim = 200`
  - Claimed workspace -> `GET /api/v1/itineraries/{id} = 200`

## Lưu ý khác

- Không đổi UI/UX.
- Không thay đổi DB schema hoặc API contract.
- Guest AI generate manual smoke bị chặn bởi Gemini `ResourceExhausted`; đã ghi issue riêng trong `docs/REPORTS/ISSUES/gemini_resource_exhausted_manual_smoke.md`.
- Local working copy `Frontend/dist` vẫn bị Windows file lock, nhưng clean worktree `npm ci && npm run build` đã pass giống CI clean checkout.
