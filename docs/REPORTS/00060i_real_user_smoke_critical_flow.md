# 00060I — Real-User Smoke Critical Flow Hardening

**Ngày tạo:** 2025  
**Branch:** `fix/00060-d-real-user-smoke-critical-flow`  
**Dựa trên:** 00060H (commit 3e31772)

---

## 1. Executive Summary

Deep audit hoàn thành toàn bộ 20 source files theo yêu cầu. Xác định 8 issue cần fix ngay và 6 issue defer sang phase sau. Đã implement 8 fixes, viết tests, build pass.

---

## 2. Deep real-user flow audit trước khi sửa

| Flow / issue | Source evidence | Root cause | Fix now? | Future phase? |
|---|---|---|---|---|
| Home destinations = [] → blank section | `Home.tsx:useEffect` loads from API, fallback to `mockDestinations` nếu apiDests empty. Nếu mockDestinations = [] thì blank. | Không có empty state message khi cả API lẫn mock đều rỗng | YES | - |
| CityDetail saved state sai API shape | `CityDetail.tsx`: `p.placeName || p.name` — BE shape thực tế là `p.place.name` | Name lookup sai, savedState không sync | YES | - |
| filteredPlaces luôn rỗng nếu destinationName undefined | `usePlacesManager.ts:filteredPlaces`: `selectedDay ? p.city === selectedDay.destinationName : false` — nếu destinationName là undefined, mọi place bị lọc ra | Short-circuit `false` khi destinationName undefined | YES | - |
| Manual activity location = place.name thay vì place.location | `TripWorkspace.tsx:handleAddPlaceFromModal`: `location: place.name` | Copy-paste bug — không dùng place.location | YES | - |
| SavedPlaces.tsx dùng sai ID để unsave | `SavedPlaces.tsx:handleDelete(id)`: gọi `unsavePlace(Number(id))` nhưng `id` là `savedId` (BE bookmark row). Sau refactor là đúng. Tuy nhiên `handleToggleBookmark` re-save dùng `Number(id)` = savedId thay vì placeId. | Lẫn lộn savedId vs placeId | YES | - |
| PlaceSelectionModal/CityDetail name lookup dùng `p.placeName \|\| p.name` | BE thực tế trả `{ id: savedId, place: { id, name, ... } }` | Name lookup sai path | YES | - |
| Share URL có thể build link từ "[REDACTED]" token | `ItineraryView.tsx:handleShare`: `const link = \`…/shared/${resp.shareToken}\`` không kiểm tra token validity | Không guard placeholder token | YES | - |
| Request ID thiếu → log không correlation | Không có X-Request-ID middleware | Chưa implement | YES | - |
| AI generate images reload mất | Đã fix trong 00060H — `_activity_image_for_generated_activity()` trong `pipeline.py` | Fixed upstream | CONFIRMED ✅ | - |
| SSE / background job | Không implement | Scope lock | - | Phase D+ |
| Google OAuth / Email OTP | Placeholder | Scope lock | - | Phase D+ |
| Premium tier | Placeholder | Scope lock | - | Phase D+ |
| Dark mode Settings | Placeholder | Scope lock | - | Phase D+ |
| Goong Map tile | Mock only | ETL phase | - | Phase ETL |
| TripHistory no map | Mock map | Future | - | Phase D+ |
| Budget suggestion rule-based | `calculateDayCost` etc. là rule-based | Expected | - | Phase C5+ |
| Trip completed lifecycle | Status hardcoded "planning" | Future | - | Phase D+ |

---

## 3. Issue classification (14 items)

| # | User finding | Confirmed? | Source truth | Decision |
|---|---|---|---|---|
| 1 | Home/city/click destination no image/no data | YES — apiDests empty → fallback mock → nếu mock empty thì blank section | `Home.tsx:setDestinations` | **fix now** — added empty state message |
| 2 | AI generate slow/no SSE/no background job | N/A — direct pipeline không SSE, đây là expected UX | `pipeline.py` + scope lock | **document + future** |
| 3 | Prompt makes Gemini slow? | N/A — Gemini latency là tự nhiên, retry logic có exponential backoff | `pipeline.py:_call_llm_with_retries` | **explain** — expected |
| 4 | AI activities after reload have no images | CONFIRMED FIXED in 00060H — `_activity_image_for_generated_activity()` lấy image từ Place DB | `pipeline.py:_activity_image_for_generated_activity` | **confirmed fix from 00060H** |
| 5 | Manual added place uses wrong location | YES — `location: place.name` thay vì `place.location` | `TripWorkspace.tsx:handleAddPlaceFromModal` | **fix now** |
| 6 | Saved places not updating / wrong API call | YES — `savedId` vs `placeId` lẫn lộn; name lookup sai BE shape `p.place.name` | `SavedPlaces.tsx`, `CityDetail.tsx`, `PlaceSelectionModal.tsx` | **fix now** |
| 7 | Accommodation/nơi ở display | PARTIAL — `useTripSync.ts` đã load accommodations từ BE response. `tripResponseMapper.ts` đã map. FE hiển thị qua `TripAccommodation`. Không có empty state text. | `useTripSync.ts`, `tripResponseMapper.ts` | **note only — mapper đã đúng** |
| 8 | Goong Map not visible | YES — `DailyItinerary.tsx` chỉ có mock map div với icons | Mock UI | **future** |
| 9 | Google OAuth/email OTP missing | YES — register có bypass OTP | Scope lock | **future** |
| 10 | Premium missing | YES — placeholder | Scope lock | **future** |
| 11 | Settings dark mode not real | YES — placeholder | Scope lock | **future** |
| 12 | TripHistory no map | YES — không có map | future | **future** |
| 13 | Budget suggestion is rule-based, not AI | YES — `useTripCost.ts` là pure math | Expected | **future** |
| 14 | Trip completed lifecycle missing | YES — status hardcoded "planning" | TripHistory | **future** |

---

## 4. Root causes và fixes

| Fix | File | Root cause | Giải pháp |
|---|---|---|---|
| Fix 1: Empty state | `Home.tsx` | Không show message khi destinations array rỗng | Thêm conditional render với text "Chưa có dữ liệu điểm đến. Hãy chạy ETL." |
| Fix 2: filteredPlaces | `usePlacesManager.ts` | `matchCity = selectedDay ? p.city === selectedDay.destinationName : false` — khi destinationName undefined, kết quả luôn false | Fallback chain: `selectedDay.destinationName || days.find(d => d.destinationName)?.destinationName || null`; nếu vẫn null thì `matchCity = true` (show all) |
| Fix 3: AI image (00060H) | `pipeline.py` | Đã fix trong 00060H | Xác nhận — `_activity_image_for_generated_activity` lấy image từ `place_by_id[place_id].image` |
| Fix 4: Manual location | `TripWorkspace.tsx` | `location: place.name` | Sửa thành `location: place.location \|\| place.name` |
| Fix 5: savedId/placeId | `savedPlaces.ts` (new), `SavedPlaces.tsx`, `CityDetail.tsx`, `PlaceSelectionModal.tsx` | Lẫn lộn bookmark row ID (savedId) với actual place ID (placeId) | Tạo `NormalizedSavedPlace` interface + `normalizeSavedPlace()` normalizer; sửa tất cả name lookup dùng `p.place?.name` |
| Fix 6: Accommodation | `tripResponseMapper.ts`, `useTripSync.ts` | Đã map đúng — không cần sửa thêm | Confirmed working |
| Fix 7: Share URL guard | `ItineraryView.tsx` | Không kiểm tra `resp.shareToken` có phải placeholder "[REDACTED]" không | Guard: check token validity trước khi build link; show toast warning nếu invalid |
| Fix 8: Request ID | `Backend/src/core/middleware/request_id.py` + `middlewares.py` | Không có X-Request-ID middleware | Tạo `RequestIDMiddleware` (Starlette BaseHTTPMiddleware), đăng ký trước CORS trong `setup_middlewares()` |

---

## 5. Deferred features

| Feature | Lý do defer |
|---|---|
| SSE / streaming generation | Scope lock — direct pipeline là design hiện tại |
| Google OAuth / email OTP | Phase D+ |
| Premium tier | Phase D+ |
| Dark mode Settings | Phase D+ |
| Goong Map tile | Cần ETL + Goong key integration |
| TripHistory map | Phase D+ |
| Budget AI suggestion | Phase C5+ |
| Trip completed lifecycle | Phase D+ |

---

## 6. Files changed

| File | Loại thay đổi |
|---|---|
| `Backend/src/core/middleware/__init__.py` | **NEW** — package init |
| `Backend/src/core/middleware/request_id.py` | **NEW** — RequestIDMiddleware |
| `Backend/src/core/middlewares.py` | **MODIFIED** — add RequestIDMiddleware before CORS |
| `Backend/tests/unit/test_request_id_middleware.py` | **NEW** — 3 unit tests |
| `Frontend/src/app/utils/savedPlaces.ts` | **NEW** — NormalizedSavedPlace + normalizer + helpers |
| `Frontend/src/app/services/places.ts` | **MODIFIED** — fix type: `rating: number | null`, `price: string | null`, `description: string | null`, `location: string | null` |
| `Frontend/src/app/hooks/trips/usePlacesManager.ts` | **MODIFIED** — fix filteredPlaces destinationName fallback + API search city fallback |
| `Frontend/src/app/pages/TripWorkspace.tsx` | **MODIFIED** — fix `location: place.location \|\| place.name` |
| `Frontend/src/app/pages/SavedPlaces.tsx` | **MODIFIED** — use savedId/placeId correctly via normalizer |
| `Frontend/src/app/components/PlaceSelectionModal.tsx` | **MODIFIED** — fix name lookup to `p.place?.name` |
| `Frontend/src/app/pages/CityDetail.tsx` | **MODIFIED** — fix saved state lookup to `p.place?.name` |
| `Frontend/src/app/pages/Home.tsx` | **MODIFIED** — add empty state message when destinations array is empty |
| `Frontend/src/app/pages/ItineraryView.tsx` | **MODIFIED** — add shareToken validity guard |
| `Frontend/tests/unit/savedPlaces.test.mjs` | **NEW** — 10 unit tests (Node.js) |

---

## 7. Tests run

| Test | Result |
|---|---|
| `node Frontend/tests/unit/savedPlaces.test.mjs` | ✅ 10/10 passed |
| `uv run pytest tests/unit/test_request_id_middleware.py` | ✅ 3/3 passed |
| `uv run pytest tests/unit/ -k "places or saved or itinerary or share or request"` | ✅ 33/33 passed |
| `npm run build -- --outDir .build-tmp/verify-00060i-real-user-smoke` | ✅ Build pass (3197 modules) |
| `uv run ruff check src/core/middleware/ src/core/middlewares.py` | ✅ All checks passed |

---

## 8. Remaining risks

| Risk | Severity | Mitigation |
|---|---|---|
| `PlaceSelectionModal` và `CityDetail` vẫn dùng mock `places` data (từ `../data/places`) thay vì API data để track savedId | Medium | Cần migration sang full API-backed data trong phase tiếp theo |
| `DailyItinerary.tsx` dùng `savePlace(suggestion.id)` với mock suggestion ID (string) từ `mockSuggestions` data | Medium | Cần thay suggestions bằng real API data với numeric placeId |
| `useTripSync.ts` không reload accommodations khi không có `tripIdParam` (wizard flow) | Low | Wizard flow chưa có accommodation step |
| RequestIDMiddleware chưa có test với concurrent requests | Low | Current tests cover happy path — concurrent test cần integration env |

---

## 9. Files NOT changed (confirmed working)

- `Backend/src/itineraries/pipeline.py` — `_activity_image_for_generated_activity()` đã fix trong 00060H ✅
- `Frontend/src/app/utils/tripResponseMapper.ts` — accommodation mapping đã đúng ✅
- `Frontend/src/app/hooks/trips/useTripSync.ts` — accommodation load từ BE đã đúng ✅
