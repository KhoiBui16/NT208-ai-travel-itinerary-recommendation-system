# Generate Itinerary Pipeline Readiness — 2026-05-28

## Audit Result: PARTIALLY_READY (Updated with B2 Evidence 2026-05-28)

Pipeline C.1 logic đúng. Nhưng **PARTIALLY_READY** vì:
1. **DATA_MISSING_DESTINATION**: TP.HCM, Đà Nẵng → 422 (B2 confirmed)
2. **GEMINI_TIMEOUT**: Hà Nội 3 ngày + 3 interests → 503 timeout (B2 confirmed)
3. **FE_GENERIC_ERROR_MASKING**: UI không phân biệt 422 vs 503 (B3 confirmed)

Chỉ READY cho: Hà Nội, 1-2 ngày, 1-2 interests.

---

## 1. Direct pipeline, không qua Supervisor

**✅ PASS**

`ItineraryService.generate()` gọi trực tiếp `ItineraryPipeline.generate()`, không qua Supervisor hay routing trung gian.

```python
# service.py:55
pipeline = ItineraryPipeline(self.session)
trip = await pipeline.generate(request, user_id=user_id)
```

## 2. Destination resolve slug/no-accent

**✅ PASS**

`resolve_destination_for_ai()` xử lý "Ha Noi" → slug "ha-noi" → match DB. Đã xác nhận trong `docs/06_ai_roadmap.md` và `REPORT.md`.

## 3. Context places/hotels từ DB

**✅ PASS** — với lưu ý

```python
# pipeline.py:33-34
MAX_CONTEXT_PLACES = 15
MAX_CONTEXT_HOTELS = 4
```

- Places: query DB với category filter → tối đa 15 places → đủ cho trip 1-14 ngày
- Hotels: chỉ 4 hotels, nguồn từ `hotels.yaml` (test-only) — xem issue bên dưới
- Fallback: nếu category quá hẹp, tự động query lại không filter category

## 4. Fallback khi category interest quá hẹp

**✅ PASS**

```python
# pipeline.py:109-120
if len(places) < min_required and categories:
    places = await self.repo.search_places_for_ai(
        destination_id,
        categories=None,  # Bỏ filter category
        limit=MAX_CONTEXT_PLACES,
    )
```

## 5. Minimum places validated trước LLM call

**✅ PASS**

```python
# pipeline.py:99-131
if len(places) < min_required:
    raise ValidationException("Not enough destination places for AI recommendation.")
```

## 6. Pydantic output validation

**✅ PASS**

```python
# pipeline.py:205
itinerary = AgentItinerary.model_validate(payload)
```

Dùng `AgentItinerary` schema để validate output LLM.

## 7. Retry on invalid output

**✅ PASS**

```python
# pipeline.py:170
attempts = self.settings.agent_max_retries + 1  # mặc định 3 attempts
# pipeline.py:226-235: sleep exponential backoff
```

## 8. Budget tolerance checked

**✅ PASS**

```python
# pipeline.py:332
if itinerary.total_cost > int(request.budget * 1.2):
    raise LLMGenerationError("AI itinerary exceeds budget tolerance")
```

## 9. Max days / max activities/day enforced

**✅ PASS**

```python
# pipeline.py:348-349
if day_count < 1 or day_count > MAX_TRIP_DAYS:  # MAX_TRIP_DAYS = 14
    raise ValidationException("Trip duration must be between 1 and 14 days")

# pipeline.py:336-342
if activity_count < agent_min_activities_per_day or > agent_max_activities_per_day:
    raise LLMGenerationError("too few/too many activities")
```

## 10. Transaction/rollback on persist failure

**✅ PASS** — dùng async session

```python
# pipeline.py:316-321
await self.session.flush()
trip_id = trip.id
self.session.expire_all()
refreshed = await self.repo.get_with_full_data(trip_id)
if not refreshed:
    raise ServiceUnavailableException("Generated trip could not be loaded")
```

Nếu persist fail, transaction rollback tự động (SQLAlchemy).

## 11. No secret/API key in logs

**✅ PASS**

Logging chỉ ghi metadata, không ghi prompt content hay API key.

## 12. FE receives claimToken cho guest

**✅ PASS**

```python
# service.py:58-59
if user_id is None:
    resp.claim_token = await self._issue_claim_token(trip.id)
```

## 13. FE navigate đúng workspace

**✅ Chưa verify trong backend** — phụ thuộc FE. Backend đúng contract, FE navigation cần test riêng.

---

## Gaps

### Gap 1 — Hotels rất nghèo (3/city)

**Mức độ: CAO**

`hotels.yaml` chỉ có ~3 hotels mỗi city (test seed). Không có Goong hotel API. AI generate chỉ suggest khách sạn rất hạn chế.

→ Recommend: expand `hotels.yaml` thành 15-20 hotels mỗi city với data thực tế trước khi C3/C4 đi vào test.

### Gap 2 — Travel-time/route optimization chưa dùng

**Mức độ: TRUNG BÌNH**

Pipeline sinh activities theo context, không tối ưu route theo lat/lng + distance. Goong Directions/Distance Matrix chưa được dùng.

→ Không block C3/C4, nhưng itinerary chưa "thông minh" về lộ trình.

### Gap 3 — Place `image` không lưu

**Mức độ: TRUNG BÌNH**

Activities lưu `image=""` (empty). Goong có `photos[]` nhưng không extract.

→ Trip workspace hiển thị activities không có ảnh đẹp.

---

## Readiness Summary

| Checkpoint | Status | Ghi chú |
|---|---|---|
| Direct pipeline | ✅ | Không qua Supervisor |
| Destination resolve | ✅ | Hỗ trợ slug/no-accent |
| DB context places | ✅ | 15 places, fallback category |
| Min places validation | ✅ | Trước LLM call |
| Pydantic validation | ✅ | AgentItinerary schema |
| Retry invalid output | ✅ | 3 attempts, exponential backoff |
| Budget tolerance | ✅ | 1.2× budget |
| Max days/activities | ✅ | 14 days, 5 activities/day |
| Transaction/rollback | ✅ | Flush + re-fetch |
| No secret in logs | ✅ | Metadata only |
| Guest claimToken | ✅ | FE nhận đúng |
| Hotels rich | ❌ | 3 hotels total in DB (Hà Nội only) — verified via `SELECT COUNT(*) FROM hotels` = 3 |
| Route optimization | ⚠️ | Chưa dùng Directions API |
| Place images | ❌ | Empty string — verified via places search API response |
| Destination coverage | ❌ | **Only 1 destination in DB (Hà Nội)** — verified 2026-05-28 via DB query |

**Tổng kết: PARTIALLY_READY — pipeline logic đúng nhưng data coverage chỉ có Hà Nội, và Gemini timeout với prompt lớn.**

---

## B2 Real API Evidence (2026-05-28)

| Test case | Status | Evidence |
|---|---|---|
| Guest Hà Nội 2 ngày + 1 interest | **PASS** | 201, trip_id=234, claimToken PRESENT |
| Auth Hà Nội 1 ngày + 1 interest | **PASS** | 201, trip_id=235, claimToken NULL |
| Guest Hà Nội 3 ngày + 3 interests | **FAIL** | 503 Gemini timeout — prompt quá lớn |
| Auth TP.HCM | **FAIL** | 422 `Destination data not found` |
| Auth Đà Nẵng | **FAIL** | 422 `Destination data not found` |
| Auth "TP. Ho Chi Minh" (FE label) | **FAIL** | 422 `Destination data not found` |

**Root causes xác nhận:**
1. `DATA_MISSING_DESTINATION` — TP.HCM, Đà Nẵng không có row trong `destinations` table
2. `GEMINI_TIMEOUT` — prompt lớn (3 ngày × 3 interests × 15 places context) vượt timeout
3. `FE_GENERIC_ERROR_MASKING` — B3 xác nhận UI hiển thị generic error cho cả 422 lẫn 503

---

## Verification Evidence (2026-05-28)

```
Command: docker compose exec -T db psql -U postgres -d dulichviet -c "SELECT id, name, slug FROM destinations ORDER BY name;"
Result: 1 row — id=2, name=Hà Nội, slug=ha-noi

Command: docker compose exec -T db psql -U postgres -d dulichviet -c "SELECT COUNT(*) FROM hotels;"
Result: 3

Command: docker compose exec -T db psql -U postgres -d dulichviet -c "SELECT COUNT(*) FROM places;"
Result: 68

Command: GET /api/v1/places/destinations
Result: [{"id":2,"name":"Hà Nội","slug":"ha-noi"}]

B2 API: POST /api/v1/itineraries/generate {"destination":"Ha Noi","startDate":"2026-05-30","endDate":"2026-05-31","budget":2000000,"adults":1,"children":0,"interests":["food"]}
Result: 201, trip_id=235

B2 API: POST /api/v1/itineraries/generate {"destination":"Thanh pho Ho Chi Minh",...}
Result: 422 {"detail":"Destination data not found. Please run ETL for this destination first."}

B3 Browser: TP.HCM generate → UI shows "Không thể tạo lịch trình. Vui lòng thử lại." (generic)
B3 Browser: TripWorkspace trip_id=235 → PASS, 0 errors, FloatingAIChat NOT_VISIBLE
```

---

## Recommended next action

**Priority 1 (blocks multi-city testing)**: Chạy ETL cho TP.HCM và Đà Nẵng — branch `feat/00052-c-etl-goong-data-expansion`
**Priority 2 (UX)**: Fix FE error handling để phân biệt 422/429/503 — **DONE** in `fix/00051-c-fe-error-visibility` (2026-05-29)
**Priority 3 (C3 foundation)**: Bắt đầu C3 chat session CRUD — branch `feat/00056-c-c3-chat-session-foundation`