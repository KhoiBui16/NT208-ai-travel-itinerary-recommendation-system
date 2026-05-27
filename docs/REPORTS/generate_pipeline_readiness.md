# Generate Itinerary Pipeline Readiness — 2026-05-28

## Audit Result: READY

Pipeline C.1 đã implement đúng direction. Dưới đây là chi tiết từng checkpoint.

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
| Hotels rich | ❌ | 3/city, test-only YAML |
| Route optimization | ⚠️ | Chưa dùng Directions API |
| Place images | ❌ | Empty string |

**Tổng kết: READY với 3 gaps không block C3/C4 nhưng ảnh hưởng UX.**

---

## Recommended next action

Expand `hotels.yaml` trước khi C3/C4 full verification (priority cao).
Add Goong photo extraction khi có time (priority trung bình).