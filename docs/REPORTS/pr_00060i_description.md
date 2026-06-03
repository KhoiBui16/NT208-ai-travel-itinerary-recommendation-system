# PR: fix: [#00060] harden real user smoke critical flows

## Mô tả

Harden các critical flow sau deep audit real-user smoke: sửa savedId/placeId contract, filteredPlaces blank bug, manual activity location, share URL guard, và thêm Request ID middleware cho log correlation.

## Thay đổi chính

### Backend
- **NEW** `src/core/middleware/request_id.py` — `RequestIDMiddleware` đọc/sinh X-Request-ID và bind vào structlog context
- **NEW** `src/core/middleware/__init__.py` — package init
- **MODIFIED** `src/core/middlewares.py` — đăng ký `RequestIDMiddleware` trước CORS
- **NEW** `tests/unit/test_request_id_middleware.py` — 3 unit tests

### Frontend
- **NEW** `src/app/utils/savedPlaces.ts` — `NormalizedSavedPlace` interface + `normalizeSavedPlace()` + lookup helpers
- **MODIFIED** `src/app/services/places.ts` — fix type mismatches với BE schema: `rating: number | null`, `price: string | null`, `description: string | null`
- **MODIFIED** `src/app/hooks/trips/usePlacesManager.ts` — fix `filteredPlaces` trả empty khi `destinationName` undefined; fix API search city fallback
- **MODIFIED** `src/app/pages/TripWorkspace.tsx` — fix `location: place.location || place.name` (thay vì `place.name`)
- **MODIFIED** `src/app/pages/SavedPlaces.tsx` — dùng `savedId` để unsave, `placeId` để re-save via normalizer
- **MODIFIED** `src/app/components/PlaceSelectionModal.tsx` — fix name lookup `p.place?.name`
- **MODIFIED** `src/app/pages/CityDetail.tsx` — fix saved state lookup `p.place?.name`
- **MODIFIED** `src/app/pages/Home.tsx` — thêm empty state "Chưa có dữ liệu điểm đến" khi API trả []
- **MODIFIED** `src/app/pages/ItineraryView.tsx` — guard shareToken validity trước khi build link
- **NEW** `tests/unit/savedPlaces.test.mjs` — 10 unit tests (Node.js)

## Cách kiểm tra (Testing)

### Backend
```powershell
Set-Location Backend
uv run ruff check src/core/middleware/ src/core/middlewares.py
uv run pytest tests/unit/test_request_id_middleware.py -v
uv run pytest tests/unit/ -k "places or saved or itinerary or share or request" -v
```

### Frontend
```powershell
Set-Location Frontend
node tests/unit/savedPlaces.test.mjs
npm run build -- --outDir .build-tmp/verify-00060i
```

### Manual smoke
1. Truy cập `/cities` → click vào city → kiểm tra saved/unsave button hoạt động đúng
2. Vào TripWorkspace → chọn place từ modal → kiểm tra activity location là địa chỉ thực, không phải tên place
3. Vào TripWorkspace → không có destinationName → kiểm tra places panel không blank
4. Vào ItineraryView → click "Chia Sẻ" → kiểm tra URL hợp lệ hoặc toast warning
5. Check response headers: `X-Request-ID` có mặt trong mọi response

## Lưu ý khác

### Deferred (không thuộc scope này)
- SSE/streaming generation
- Google OAuth / email OTP
- Premium tier
- Dark mode Settings thực tế
- Goong Map tile integration
- TripHistory interactive map
- Budget AI suggestion
- Trip completed lifecycle

### Known remaining risks
- `PlaceSelectionModal` và `CityDetail` vẫn dùng mock `places` data để track savedId — cần migration sang API-backed data trong phase tiếp theo
- `DailyItinerary.tsx` dùng mock `suggestionId` (string) — cần replace bằng real numeric placeId
