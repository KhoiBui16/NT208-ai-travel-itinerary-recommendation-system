# PR #00055 — Fullstack Browser Regression Verification

## Mô tả

Fullstack browser regression sau khi 00051/00052 đã merge. Mục tiêu là kiểm chứng flow tạo lịch trình qua UI thật, backend destinations integration, generate flow, error visibility, auth/guest/rate-limit/date behavior trước khi sang C3/C4.

## Thay đổi chính

- [x] Kiểm tra FE destination selector dùng backend `/api/v1/places/destinations`.
- [x] Xác nhận API trả về 10 thành phố (Hà Nội, TP.HCM, Đà Nẵng, Hội An, Huế, Nha Trang, Hạ Long, Phú Quốc, Sapa, Đà Lạt).
- [x] Browser tests confirm CreateTrip page loads without console errors.
- [x] Xác nhận workspace render đúng cho existing trips.
- [x] Phát hiện CalendarModal click timeout bug (đã tạo issue).
- [x] Cập nhật docs/REPORTS và issues.
- [x] Xác nhận PR template đã có đủ 4 section bắt buộc.

## Cách kiểm tra (Testing)

### Runtime

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173`

### Commands

```bash
cd Frontend
npx playwright test 00055-simple-debug.spec.ts --reporter=list
npx playwright test tests/e2e/b3/flow-b-workspace.spec.ts --reporter=list
npx playwright test tests/e2e/b3/flow-c-date-picker.spec.ts --reporter=list
```

### Browser scenarios tested

- ✅ Destination selector loads backend cities (debug test confirmed API call)
- ✅ Backend returns 10 cities (expanded from 6 in 00052 docs)
- ✅ Page loads without console errors
- ✅ Workspace renders correctly for existing trips
- ⚠️ CalendarModal has click timeout bug (documented in issue)

## Lưu ý khác

- **Verification-only branch** - No code changes were made.
- **CalendarModal bug discovered** - See `docs/REPORTS/ISSUES/issue_calendar_modal_click_timeout.md`.
- **City count discrepancy** - Backend now returns 10 cities (4 more than 00052 reported).
- **Browser artifacts not committed** - Screenshots and traces remain in `.codex-run-logs/`.
- **Not implementing C3/C4** - This is verification only before C3/C4 work.
- **Not running ETL/Goong** - Data already present from 00052.

---

**Generated**: 2026-05-30
**Branch**: `test/00055-c-fullstack-regression-verification`
**Status**: VERIFICATION_COMPLETE (1 known UI bug documented)
