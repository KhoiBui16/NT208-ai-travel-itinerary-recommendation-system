## Mô tả

Audit docs-only cho 00060J — phân tích toàn bộ UX/data findings từ người dùng trước khi implement fix. **Không có thay đổi source code, tests, hay package files trong PR này.**

Audit dựa trên SHA `8b0f172` (main sau khi merge 00060I-V2 và 00060H). Đọc 26 source files, chạy grep search và query PostgreSQL để xác minh mọi finding bằng source evidence.

## Thay đổi chính

- **Tạo mới** `docs/REPORTS/00060j_audit_local_smoke_ux_data_before_fix.md`:
  - Phân tích 15 user findings → 20 sub-findings chi tiết
  - Severity: 3 P0 (crash/critical), 7 P1 (core UX/data), 4 P2 (polish), 6 Future
  - GitHub permalink cho mỗi finding tại SHA `8b0f172`
  - Runtime data diagnostics: 618/618 places có `image = ''` (empty string) — ETL critical bug
  - Cross-flow dependency map
  - Proposed fix strategy theo priority
  - Open questions cho team

**P0 findings cần fix trước deploy:**
1. `AddDaysModal.tsx:57` — `parse(day.date, "dd/MM/yyyy", new Date())` crash khi `day.date` là ISO format → `RangeError: Invalid time value`
2. `Home.tsx` — `<Link to="/cities">` không navigate đến thành phố cụ thể
3. BE `service.py:250` — `share_url = ".../shared/[REDACTED]"` (đã có FE guard trong ItineraryView nhưng DailyItinerary chưa dùng real API)

**Không triển khai trong audit này:** Google OAuth, Goong Map tile, SSE/background jobs, Premium, dark mode, PDF export, trip completed lifecycle.

## Cách kiểm tra (Testing)

Xác nhận audit-only (không có production code changes):
```powershell
git diff --name-only -- Backend/src Frontend/src Backend/tests Frontend/tests Backend/pyproject.toml Frontend/package.json
# Expected: empty output
```

Xem báo cáo đầy đủ:
```powershell
Get-Content docs/REPORTS/00060j_audit_local_smoke_ux_data_before_fix.md
```

Verify AddDays crash bằng tay:
1. Tạo AI-generated trip
2. Vào TripWorkspace
3. Click "Thêm ngày" → chọn thành phố → click "Lên lịch"
4. CalendarModal mở → `isDateAllocatedInAddFlow` được gọi với `day.date` ISO format → crash

## Lưu ý khác

- Audit-only commit — không deploy được standalone
- P0 fixes sẽ implement trong branch `fix/00060-d-*` riêng sau khi user approve scope
- ETL image issue (618 empty images) cần xử lý riêng — có thể dùng category fallback images ngắn hạn
- 14-day cap là product constraint intentional, không phải bug
- `ItineraryResponse` BE không có `coverImage` field — TripHistory cards sẽ luôn blank cho đến khi thêm field này
