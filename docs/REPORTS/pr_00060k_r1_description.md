## Mô tả

Fix các lỗi data/contract critical trước C3/C4 trên PR #85 (`fix/00060-d-local-smoke-ux-data-fix`):

- **Accommodation `dayIds`:** AI trả day number `[1,2]` nhưng DB dùng `TripDay.id` thật → workspace hiện "Chưa có nơi ở". Pipeline giờ remap sang DB id trước khi persist.
- **ETL upsert:** `on_conflict_do_update` thiếu `image`, `avg_cost`, `opening_hours` → rerun không repair row cũ.
- **Saved places FE:** `unsavePlace` dùng nhầm `place_id` thay vì `saved_id`; đồng bộ qua `savedPlaces.ts` normalizer.
- **Lazy import:** `itineraries/__init__.py` tránh kéo AI provider khi chỉ import models.

Task ID: [#00060](https://github.com/KhoiBui16/NT208-ai-travel-itinerary-recommendation-system)

**Chưa claim trong PR này:** ảnh place thật từ Goong (API không có photos), Goong map tile, companion chat C3.

## Thay đổi chính

- [x] Remap `accommodation.day_ids` từ AI day number → persisted `TripDay.id` trong `pipeline.py`
- [x] Bổ sung `image`, `avg_cost`, `opening_hours` vào conflict update của `db_loader.py`
- [x] Unit test accommodation remap + invalid day id warning
- [x] Integration test ETL conflict update + external_id update paths
- [x] FE: `usePlacesManager`, `TripWorkspace`, `DailyItinerary`, `SavedSuggestions` dùng `savedId`/`placeId` đúng contract
- [x] Cập nhật README §11 Quick Start (PowerShell + ETL 10 thành phố + DB verify)

## Cách kiểm tra (Testing)

**Backend:**
```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location "$ROOT\Backend"
uv run ruff check src tests
uv run ruff format --check src tests
uv run alembic upgrade head
uv run alembic check
uv run pytest tests/unit/ -v --tb=short
$env:CI="true"
uv run pytest tests/integration/ -v --tb=short
```

**Frontend:**
```powershell
Set-Location "$ROOT\Frontend"
npm run build -- --outDir .build-tmp\verify-00060k-r1
```

**ETL + DB (cần `GOONG_API_KEY` trong `Backend/.env`):**
```powershell
docker compose up -d db redis
Set-Location "$ROOT\Backend"
uv run python -m src.etl --cities "Hà Nội" "TP. Hồ Chí Minh" "Đà Nẵng" "Hội An" "Huế" "Nha Trang" "Hạ Long" "Phú Quốc" "Sapa" "Đà Lạt"
docker compose exec db psql -U postgres -d dulichviet -c "select d.name, count(p.id) from destinations d left join places p on p.destination_id=d.id group by d.name;"
```

**Smoke thủ công:**
1. `/create-trip` → AI generate → `/trip-workspace?tripId=...`
2. Xác nhận accommodation hiển thị đúng ngày (không còn "Chưa có nơi ở" khi BE đã tạo accommodation)
3. Bookmark địa điểm → reload `/saved-places` → unsave/re-save hoạt động

**Kết quả local verify (2026-06-08):**
- Backend unit: **135 passed**
- Backend integration (CI=true): **53 passed**
- ETL Đà Lạt: **10 → 64 places**
- Frontend build: **PASS**

## Lưu ý khác

- Không đổi schema/migration/API contract breaking.
- `places.image` vẫn rỗng sau ETL — giới hạn Goong Place Detail, không phải bug upsert.
- Cần `GEMINI_API_KEY` cho smoke generate thật; timeout khuyến nghị `AGENT_TIMEOUT_SECONDS=120`.
- Không commit `.env`, build artifacts, `test-results/`.
