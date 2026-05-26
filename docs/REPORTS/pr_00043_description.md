# PR Description: docs/00043-d-post-merge-audit-reporting

## Mô tả

- Đồng bộ tài liệu sau khi PR40 Goong ETL và PR41 AI Generate đã merge vào main.
- Bổ sung báo cáo kiểm thử fullstack, luồng FE/BE/AI, guest claim/rate limit/reload, CI/CD và README run guide.
- Task ID: [#00043](https://app.clickup.com/t/00043)

## Thay đổi chính

- [x] Thêm `docs/REPORTS` tổng quan, phase reports, issue tracking format và screenshot evidence.
- [x] Cập nhật README gốc, Backend README, Frontend README theo source hiện tại.
- [x] Thêm skill `source-plan-sync-review` trong `.claude` để tránh lệch source/plan/docs.
- [x] Ghi lại kết quả test fullstack, browser screenshots, API/log evidence.

## Cách kiểm tra (Testing)

- Backend: `ruff check`, `ruff format --check`, `alembic upgrade/check`, unit tests, integration tests.
- Frontend: `npm ci`, clean alternate `npm run build`, `npm run test:e2e`.
- Manual smoke: start Docker db/redis, Backend 8000, Frontend 5173, test CreateTrip AI generate auth + guest.
- Kết quả mong đợi: FE gọi đúng BE, BE gọi Gemini khi đủ context, trip persist vào DB, guest claim hoạt động sau login.

## Lưu ý khác

- Không đổi UI/UX.
- Không thay đổi API contract hoặc DB schema trong PR docs này.
- Không commit `Backend/.env` hoặc secret.
- Các issue còn mở được ghi trong `docs/REPORTS/ISSUES/`.
