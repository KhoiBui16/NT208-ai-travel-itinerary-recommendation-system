# Plan C.2 — SuggestionService (DB-only, không LLM)

> Trạng thái: **review_ready** — branch `feat/00047-c-suggestion-service`; xem `docs/REPORTS/phase_c2_suggestion_service.md`
> Độ phức tạp: ★☆☆☆☆
> Phụ thuộc: Không (độc lập)
> Endpoint: `GET /api/v1/agent/suggest/{activity_id}` (EP-30)

## Mục tiêu

Tạo service gợi ý hoạt động thay thế dựa trên DB query + filter + sort. **Không gọi LLM** — chỉ cần filter dữ liệu có sẵn.

## Tại sao không dùng LLM?

|              | DB Query                                                            | LLM                |
| ------------ | ------------------------------------------------------------------- | ------------------ |
| Latency      | <20ms                                                               | 2-5s               |
| Chi phí      | 0                                                                   | Gemini API quota   |
| Độ chính xác | Không hallucinate vì lấy từ DB; độ liên quan phụ thuộc data/ranking | Có thể hallucinate |
| Use case     | Filter + sort existing data                                         | Cần "sáng tạo"     |

Gợi ý thay thế chỉ cần lọc places cùng category + cùng destination → DB query đủ. Đây là micro-recommendation dựa trên dữ liệu đã có, không phải nơi chính của itinerary recommendation; phần recommendation chính nằm ở C.1 Generate Pipeline.

## Hiện trạng

- `PlaceRepository` đã có: `search()`, `get_by_destination()`
- `PlaceService` đã có: `search_places()`, `get_place_by_id()`
- FE có nút "Gợi ý thay thế" trong `ActivityDetailModal.tsx` (chưa kết nối API)
- FE component `companion/PlaceSuggestions.tsx` (mock data)

## Files cần tạo/sửa

### Tạo mới

| File                                       | Mục đích            | Dự kiến dòng |
| ------------------------------------------ | ------------------- | ------------ |
| `Backend/src/places/suggestion_service.py` | DB-only suggestions | ~60          |

### Sửa đổi

| File                               | Thay đổi                                                                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `Backend/src/places/router.py`     | Thêm endpoint `GET /agent/suggest/{activity_id}`                                                                                                |
| `Backend/src/places/repository.py` | Thêm method `find_alternatives(destination_id, category, exclude_ids, limit)` + helper resolve `Trip.destination` string sang `destinations.id` |
| `Backend/src/places/schemas.py`    | Thêm `SuggestionResponse` schema                                                                                                                |

## Chi tiết kỹ thuật

### Logic gợi ý

```python
class SuggestionService:
    async def suggest_alternatives(
        self,
        activity_id: int,
        user_id: int,
        limit: int = 5,
    ) -> SuggestionResponse:
        # 1. Lấy activity hiện tại
        activity = await self.repo.get_activity_with_trip(activity_id)
        if not activity:
            raise NotFoundException("Activity not found")

        # 2. Owner check
        if activity.trip.user_id != user_id:
            raise ForbiddenException("Not trip owner")

        # 3. Current Trip.destination là string, cần map sang destinations.id trước
        destination_id = await self.repo.resolve_destination_id(activity.trip.destination)

        # 4. Query places cùng category, cùng destination, loại trừ places đã có trong trip
        existing_place_ids = await self.repo.get_place_ids_in_trip(activity.trip_id)
        alternatives = await self.repo.find_alternatives(
            destination_id=destination_id,
            category=activity.type,
            exclude_ids=existing_place_ids,
            limit=limit,
        )

        # 5. Return
        return SuggestionResponse(
            activity_id=activity_id,
            current_name=activity.name,
            suggestions=[PlaceResponse.from_orm(p) for p in alternatives],
        )
```

### Repository Query

```sql
SELECT p.*, d.name as city
FROM places p
JOIN destinations d ON p.destination_id = d.id
WHERE p.destination_id = :destination_id
  AND p.category = :category
  AND p.id != ALL(:exclude_ids)
ORDER BY p.rating DESC NULLS LAST, p.review_count DESC
LIMIT :limit;
```

### Endpoint

```python
@router.get("/suggest/{activity_id}", response_model=SuggestionResponse)
async def suggest_alternatives(
    activity_id: int,
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service),
) -> SuggestionResponse:
    return await service.suggest_alternatives(activity_id, user.id)
```

**Lưu ý:** Endpoint path là `/agent/suggest/` theo plan gốc, nhưng đặt trong `places/router.py` vì logic thuộc places domain. Có thể dùng prefix `/agent/` nếu muốn tách riêng.

## Test plan

| Test                                      | Loại        | Mô tả                                             |
| ----------------------------------------- | ----------- | ------------------------------------------------- |
| `test_suggest_returns_alternatives`       | Unit        | Cùng category, cùng destination, exclude existing |
| `test_suggest_no_duplicates`              | Unit        | Không trả place đã có trong trip                  |
| `test_suggest_owner_check`                | Integration | User không phải owner → 403                       |
| `test_suggest_not_found_activity`         | Integration | Activity không tồn tại → 404                      |
| `test_suggest_empty_when_no_alternatives` | Unit        | Không có place thay thế → trả []                  |

## Xác nhận hoàn thành

- [ ] `SuggestionService` query DB, không gọi LLM
- [ ] Owner check trước khi suggest
- [ ] Exclude places đã có trong trip
- [ ] Sort by rating DESC
- [ ] Endpoint hoạt động
- [ ] Unit + integration tests pass
