# 00133 Runtime Data Inventory Report

## Branch

- `fix/00133-c-tripworkspace-ai-runtime-hardening`
- Base hiện tại: `992ba50` (`origin/main`, `main`)

## Local Runtime Verify

### FE/BE smoke

- Backend local: `http://localhost:8020/api/v1/health` -> `200`
- Frontend local: `http://localhost:5173` -> `200`

### Browser smoke đã chạy

Flow đã verify bằng Playwright script trực tiếp:

1. mở `trip-workspace?tripId=4321`
2. chuyển tab `Nơi ở`
3. bấm `Thay đổi thiết lập`
4. bấm `Lưu lịch trình`

Kết quả:

- `bookingTypeValue = nightly`
- `toastCount = 1`
- `pageErrors = []`
- `sessionStorage.currentTrip.tripId = 4321`
- `sessionStorage.currentTrip.name = "Trip Workspace Runtime Saved"`
- `sessionStorage.currentTrip.accommodations` dùng key persisted `777`

## DB Inventory Truth

Snapshot local Docker Postgres hiện tại:

- destinations: `28`
- places: `1559`
- hotels: `38`

### Cities theo place count

- Hà Nội: `132`
- TP. Hồ Chí Minh: `101`
- Đà Nẵng: `85`
- Hạ Long: `81`
- Hải Phòng: `75`
- Vũng Tàu: `70`
- Ninh Bình: `69`
- Buôn Ma Thuột: `68`
- Huế: `67`
- Quy Nhơn: `67`
- Cần Thơ: `65`
- Nha Trang: `64`
- Phú Quốc: `64`
- Pleiku: `64`
- Đà Lạt: `63`
- Phan Thiết: `60`
- Hà Giang: `57`
- Hội An: `56`
- Tuy Hòa: `55`
- Mộc Châu: `52`
- Phong Nha: `43`
- Sapa: `43`
- Đồng Hới: `40`
- Mũi Né: `10`
- Vịnh Hạ Long: `5`
- Tây Ninh: `3`
- Châu Đốc: `0`
- Côn Đảo: `0`

### Sparse / zero-data cities

- Zero data: `Châu Đốc`, `Côn Đảo`
- Sparse nghiêm trọng: `Tây Ninh (3)`, `Vịnh Hạ Long (5)`
- Sparse nhẹ / partial: `Mũi Né (10)`

### Image truth

- Places không có image: `1558 / 1559`
- Hotels không có image: `0 / 38`

Kết luận:

- Hotel image gần như đã đủ để dùng.
- Place image gần như trống hoàn toàn, nên cần file inventory để user tự map ảnh thật.

## Inventory Files

- `docs/REPORTS/00133_etl_destination_place_inventory.csv`
- `docs/REPORTS/00133_etl_destination_hotel_inventory.csv`

### CSV columns

Places:

- `destination_id`
- `destination_slug`
- `destination_name`
- `place_id`
- `place_name`
- `category`
- `location`
- `image`
- `rating`
- `review_count`
- `source`
- `avg_cost`

Hotels:

- `destination_id`
- `destination_slug`
- `destination_name`
- `hotel_id`
- `hotel_name`
- `location`
- `image`
- `rating`
- `review_count`
- `price_per_night`

## Contamination Notes

Vẫn còn row nghi ngờ contamination trong local DB hiện tại, ví dụ:

- `Huế -> Công viên Kim Đồng -> Hà Nội`
- `Sapa -> Beta Cinemas Lào Cai`
- `Phong Nha -> Beta Cinemas Lào Cai`
- `TP. Hồ Chí Minh -> Vũng Tàu`

Kết luận:

- Local DB hiện tại đủ dùng để tiếp tục runtime testing và map ảnh theo `place_id`.
- Nhưng nếu làm bulk image mapping theo `name` thuần thì rất dễ gắn nhầm.
- Nên map ảnh theo `destination_slug + place_id` hoặc ít nhất `destination_slug + place_name`.

## Code Fixes In This Batch

Các fix đã làm trong batch runtime hiện tại:

- chặn restore `sessionStorage` sai `tripId` khi API load theo URL fail
- thêm `isSaving` guard để tránh save đè / toast trùng
- preserve `nightly` booking khi mở lại `Thay đổi thiết lập`
- preserve `daily` multi-day range khi reopen accommodation editor
- thêm fallback image resolver cho `PlaceSelectionModal`
- loại mock/stale place search fallback ở `usePlacesManager`
- đổi `useAccommodation` sang lấy hotel theo API city detail thay vì mock constant
- bỏ duplicate page-level `Toaster` trong `TripWorkspace`

## Remaining Gaps

Chưa xử lý hết trong batch này:

- `TripWorkspace` default `initialDays` mock state vẫn còn trong code
- `PlaceSelectionModal` vẫn chưa thay hoàn toàn city source/multi-city flow theo API-first
- accommodation delete-then-create vẫn chưa transaction-safe nếu delete thành công nhưng create fail
- contamination cleanup rule vẫn cần pass riêng nếu muốn làm sạch DB trước khi bulk map ảnh/place QA
