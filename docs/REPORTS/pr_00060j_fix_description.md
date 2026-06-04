## Mô tả

Sửa các lỗi UX và data blockers phát hiện trong smoke test local, bao gồm: crash date parse trong AddDays, share URL hardcoded, ảnh không hiển thị, navigation sai, giới hạn 14 ngày, và các nút chức năng chưa phát triển không báo gì với người dùng.

## Thay đổi chính

### Backend
- `pipeline.py`: Tăng `MAX_TRIP_DAYS` từ 14 lên 30; cập nhật error message thành tiếng Việt chung chung (không expose technical limit cho user)

### Frontend
- **AddDaysModal**: Sửa crash khi parse ISO date từ BE — thêm `safeParseDate()` handle cả `YYYY-MM-DD` lẫn `dd/MM/yyyy`
- **placeImage.ts**: Thêm `CATEGORY_FALLBACK_IMAGES`, `getPlaceFallbackImage()`, `resolvePlaceImageWithCategory()`, `getDestinationFallbackImage()` cho TripHistory cards
- **Home.tsx**: `resolveDestinationImage` prefix relative `/img/` path với `VITE_API_URL`; destination cards navigate đúng tới `/cities/:slug`
- **CityDetail.tsx**: Dùng `resolvePlaceImageWithCategory` cho places; hiện message "Địa điểm chưa được hỗ trợ" khi API trả về 0 places
- **CreateTrip.tsx**: Thêm 4 progress steps khi generate AI; thêm info banner khi trip > 7 ngày; bỏ dayCount trong local scope (dùng state)
- **TripHistory.tsx**: Thêm `computeStatus()` dựa trên ngày thực tế; thêm fallback cover image theo destination
- **Header.tsx**: Button "Nâng Cấp Ngay" (Premium) disabled + tooltip "Tính năng đang phát triển"
- **DailyItinerary.tsx**: Bỏ hardcoded share URL `yourtrip.app/trip/abc123`; "Export as PDF" disabled + label; share dialog auth-aware

## Cách kiểm tra (Testing)

1. **AddDaysModal**: Tạo trip qua AI, mở TripWorkspace, click "Thêm ngày" → modal không crash, ngày đã có trong trip được highlight đúng
2. **Home destination cards**: Click vào "Hà Nội" → navigate tới `/cities/ha-noi` (không phải `/cities`)
3. **Destination images**: API trả `/img/destinations/ha-n-i.jpg` → hiển thị ảnh từ `http://localhost:8000/img/destinations/ha-n-i.jpg`
4. **Place images**: CityDetail API places section → tất cả có ảnh (category fallback), không còn placeholder box trống
5. **14-day cap**: Chọn trip 20 ngày → BE không reject; thấy info banner trên CreateTrip
6. **Progress steps**: Bấm "Tạo lịch trình" → spinner hiện các bước tiến trình thay vì text cố định
7. **TripHistory status**: Trip đã qua → "Đã hoàn thành"; trip tương lai → "Sắp tới"
8. **Premium button**: Click "Nâng Cấp Ngay" → không có action, tooltip "Tính năng đang phát triển"
9. **Export PDF**: Mở share dialog DailyItinerary → "Export as PDF" greyed out, không clickable
10. **Share dialog DailyItinerary**: Không còn hiện `yourtrip.app/trip/abc123` placeholder

```powershell
# Backend
cd <repo-root>/Backend
uv run pytest tests/unit/ -v --tb=short

# Frontend
cd <repo-root>/Frontend
node tests/unit/savedPlaces.test.mjs
npm run build
```

## Lưu ý khác

- **Không implement:** Goong Map, PDF export thực, Google OAuth, Email OTP, Premium billing
- **Deferred:** Place images trong DB vẫn empty (`618/618`); cần ETL crawl images để có ảnh thực tế — hiện tại dùng category fallback từ Pexels
- **Risk:** Trip > 14 ngày chưa được test E2E với Gemini LLM; long trip banner đã cảnh báo user về thời gian tạo lâu hơn
- **ItineraryView share guard**: Giữ nguyên từ 00060I, không thay đổi
