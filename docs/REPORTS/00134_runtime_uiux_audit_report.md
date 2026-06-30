# Báo cáo 00134 — Live Runtime / UI-UX / Auth / AI / Cost Audit

## 1. Scope và base

- Repo: `NT208-ai-travel-itinerary-recommendation-system`
- Base đã audit: `main` tại commit `44e4651`
- Nhánh fix hiện tại: `fix/00134-c-runtime-image-fallbacks`
- Phạm vi pass này: runtime + UX + data verification, không làm broad docs sync

## 2. Runtime domain truth

- Authoritative frontend production domain: `https://nt-208-ai-travel-itinerary-recommen.vercel.app`
- Authoritative backend production domain: `https://dulichviet-api.onrender.com`
- FE -> BE wiring hiện tại là **đúng**
  - FE bundle đang dùng Render API URL
  - Backend `CORS_ORIGINS` chấp nhận production FE domain
  - `GET /api/v1/health` trả `200`

## 3. Điều đã verify bằng runtime thật

### 3.1 Local + deployed generate

- Local `POST /api/v1/itineraries/generate`: thành công
- Deployed `POST /api/v1/itineraries/generate`: thành công
- AI generate hiện **không bị gãy toàn cục**

### 3.2 Auth UX

- Login sai credentials hiện trả thông điệp cụ thể:
  - `Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.`
- Forgot-password hiện là **truthful**
  - local: báo môi trường chưa gửi email thật
  - deployed: báo hệ thống chưa cấu hình email reset

### 3.3 TripWorkspace / Accommodation

- Browser verify trước pass fix cho thấy:
  - tab `Nơi ở` mở được
  - khi trip đã có state hợp lệ, flow không crash
- Harness tự dựng `currentTrip` không đủ shape có thể dẫn tới kết quả giả `Chưa có nơi ở`
- Vì vậy phải tách:
  - **runtime FE thật**: không còn bằng chứng chắc chắn cho lỗi “button không bấm được”
  - **test harness sai shape**: có thể tạo false negative

### 3.4 Responsive / overflow

- Chụp lại mobile `daily-itinerary` với viewport `390x844`
- Không tái hiện horizontal overflow ở page đó trong pass này
- Kết luận: chưa đủ bằng chứng để claim lỗi responsive toàn cục, nhưng vẫn cần audit rộng hơn ở batch sau

## 4. Root cause chính đã xác nhận

### 4.1 Image/data contract lệch giữa BE và runtime

Backend hiện trả destination / hotel image dạng local path:

- destinations: `/img/destinations/{slug}.jpg`
- hotels: `/img/hotels/{slug}.jpg`

Nhưng current runtime local và deployed đều cho:

- `GET /img/destinations/...` -> `404`
- `GET /img/hotels/...` -> `404`

Nguồn chứng cứ:

- local API response `GET /api/v1/places/destinations`
- deployed API response `GET /api/v1/places/destinations`
- direct `GET` tới local/deployed `/img/...`
- source `Backend/src/places/service.py`
- source `Backend/src/main.py` hiện **không mount static files**

=> Đây là blocker dữ liệu/runtime thật:

- FE có thể harden fallback
- nhưng nếu repo chưa có asset thật + backend chưa serve static thì city/hotel images vẫn không thể hiển thị đúng theo DB path

### 4.2 FE trước fix đang xử lý image path tương đối chưa chặt

Trước fix:

- FE destination/accommodation cards dựa vào `src="/img/..."`
- trình duyệt sẽ resolve theo FE origin hoặc vỡ sang fallback không rõ nguyên nhân

Sau fix ở nhánh này:

- utility image resolver nối relative path với `VITE_API_URL`
- hotel/destination cards có `onError` fallback nhất quán
- accommodation image block không còn để trắng khi path hỏng

Lưu ý:

- fix này chỉ harden runtime
- không tạo ra ảnh thật khi backend/data chưa có asset

## 5. Data truth hiện tại

### 5.1 Local DB counts

- destinations: `28`
- places: `1559`
- hotels: `38`

### 5.2 Image field truth

- places:
  - empty image: `1558/1559`
  - local `/img/...` path: `0/1559`
- hotels:
  - empty image: `0/38`
  - local `/img/...` path: `38/38`

### 5.3 Sparse cities

Local và deployed hiện khớp nhau:

- sparse:
  - `Châu Đốc`
  - `Côn Đảo`
  - `Tây Ninh`
  - `Vịnh Hạ Long`

## 6. Files đã fix trong nhánh này

- `Frontend/src/app/services/api.ts`
- `Frontend/src/app/utils/placeImage.ts`
- `Frontend/src/app/pages/Home.tsx`
- `Frontend/src/app/pages/CityList.tsx`
- `Frontend/src/app/pages/ManualTripSetup.tsx`
- `Frontend/src/app/pages/CityDetail.tsx`
- `Frontend/src/app/components/TripAccommodation.tsx`

## 7. Inventory files đã tạo

- `docs/REPORTS/00134_destination_place_inventory.csv`
- `docs/REPORTS/00134_destination_hotel_inventory.csv`

Mục đích:

- user có danh sách city/place/hotel thật từ DB để bổ sung ảnh thủ công sau
- tách rõ lỗi “thiếu asset thật” khỏi lỗi “frontend path mapping”

## 8. Evidence mới của pass này

Folder:

- `docs/REPORTS/EVIDENCE/00134_live_runtime_uiux_audit/`

Các file nổi bật:

- `local-home.png`
- `local-cities.png`
- `deployed-home.png`
- `deployed-cities.png`
- `local-cities-after-api-image-fix.png`
- `local-daily-mobile.png`
- `local-accommodation-regression-check-2.png`
- `image-runtime-summary.json`
- `local-cities-image-network.json`
- `local-accommodation-regression-check-2.json`

## 9. Verify đã chạy

- `uv run ruff check src tests`
- `uv run pytest tests\unit\test_itinerary_pipeline.py -q --tb=short`
- `uv run pytest tests\unit\test_companion_service.py -q --tb=short`
- `npm run build -- --outDir .build-tmp\00134-runtime-image`
- local browser verification
- deployed browser/API verification

## 10. Kết luận pass này

### Đã fix / đã chặn

- FE dùng đúng backend origin cho relative API image paths
- hotel/destination image fallback nhất quán hơn
- accommodation card không còn để trắng khi image path lỗi

### Chưa fix dứt điểm

- backend/data vẫn trả `/img/...` nhưng repo/runtime chưa có asset thật và chưa serve static
- vì vậy city/hotel images vẫn fallback thay vì hiển thị ảnh chuẩn

### Follow-up đúng thứ tự

1. bổ sung asset thật cho destinations/hotels
2. mount static files hoặc chuyển ảnh sang hosted URL thật
3. sau đó verify lại FE không còn phải rơi về fallback generic
