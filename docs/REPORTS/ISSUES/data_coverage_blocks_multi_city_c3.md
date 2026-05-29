# Issue: Data Coverage Blocks Multi-City C3 Companion Chat

**Date**: 2026-05-28
**Branch**: `docs/00050-c-c3-design-readiness-audit`
**Priority**: HIGH
**Status**: OPEN
**Related**: `docs/REPORTS/phase_c3_data_coverage_verification.md`, `ISSUES/data_coverage_hanoi_only.md`

---

## Problem

C3 Companion Chat companion features (place recommendations, budget suggestions, category-based suggestions) cannot work for cities without place data. Current DB has only Hà Nội.

If C3 is released with multi-city support without data expansion:
- Users in Đà Nẵng will get empty recommendations
- Companion chat will be useless for non-Hanoi trips
- UX will be broken — user asks "gợi ý nhà hàng gần đây" → empty response

---

## Evidence

### Place Data Per City

| City | Places | Hotels | avg_cost | rating | images |
|---|---|---|---|---|---|
| Hà Nội | 68 | 3 | ❌ 0% | ❌ 0% | ❌ 0% |
| Đà Nẵng | 0 | 0 | N/A | N/A | N/A |
| TP.HCM | 0 | 0 | N/A | N/A | N/A |

### C3 Companion Chat Data Needs vs Available

| C3 Feature | Data Needed | Hanoi | Other Cities |
|---|---|---|---|
| Trip context Q&A | Trip data | ✅ | ✅ |
| Add activity | Place search | ⚠️ 68 places | ❌ None |
| Replace activity | Place search by category | ⚠️ 8 food, 16 attraction | ❌ None |
| Budget suggestions | avg_cost per place | ❌ 0% coverage | ❌ None |
| Nearby suggestions | lat/lng + places | ✅ 100% lat/lng | ❌ None |
| Route optimization | Goong Directions | ❌ Not implemented | ❌ Not implemented |

---

## Options

### Option A: C3 MVP = Hanoi Only (Recommended)

Scope C3 companion chat MVP to Hà Nội only:
- Feature flag: `companion_chat_enabled = destination in ["Hà Nội"]`
- Guardrail: If user opens companion for unsupported city, show "Dữ liệu cho thành phố này đang được chuẩn bị"
- Risk: Limited demo, only Hanoi users can use companion chat

### Option B: C3 with Empty State

Implement C3 but handle empty place data gracefully:
- If city has no places, companion chat still works for trip context Q&A
- For place suggestions, say "Không có dữ liệu địa điểm cho thành phố này"
- Risk: User experience may be confusing — chat works but can't suggest places

### Option C: Defer C3 Companion Features Until ETL Done

1. Implement C3 chat sessions + chat history (no recommendation features)
2. Wait for `feat/00052-c-etl-goong-data-expansion`
3. Add companion chat recommendation features in separate branch
- Risk: C3 MVP becomes very limited

---

## Recommended Approach

**Option A with Option C elements (Split Path)**

1. **Now**: `feat/00052-c-etl-goong-data-expansion` — Multi-city ETL (TP.HCM, Đà Nẵng, etc.)
2. **Parallel**: `feat/00056-c-c3-chat-session-foundation` — Chat sessions CRUD only, no recommendations
3. **After ETL**: `feat/00057-c-c3-companion-chat-rest` — Companion chat recommendation features
4. **Future**: `feat/00060-c-c4-chat-history` — Chat history API (no city data dependency)

This way:
- C3/C4 foundation ships early (no data dependency)
- Companion chat features blocked by data, not code
- Clear prerequisite chain: ETL → C3 recommendations

---

## Suggested Fix

### Guardrail for C3 Companion Chat

```python
# In companion chat service
async def chat(request: CompanionChatRequest, user_id: int, trip: Trip):
    destination_id = trip.destination_id
    place_count = await repo.count_places_for_destination(destination_id)

    if place_count < MIN_RECOMMENDATION_PLACES:
        return CompanionResponse(
            message="Dữ liệu địa điểm cho thành phố này đang được chuẩn bị. "
                   "Hiện tại bạn có thể hỏi về lịch trình hiện tại.",
            requires_confirmation=False,
            proposed_operations=[],
        )
```

### Feature Flag Config

```python
COMPANION_CHAT_ENABLED_DESTINATIONS = ["Hà Nội"]  # Expand after ETL
MIN_RECOMMENDATION_PLACES = 20  # Minimum places before recommendations enabled
```

---

## Recommended Branch

```
feat/00052-c-etl-goong-data-expansion      # Multi-city ETL (TP.HCM, Đà Nẵng, etc.)
feat/00056-c-c3-chat-session-foundation   # C3 foundation (no data dependency)
feat/00057-c-c3-companion-chat-rest        # C3 companion features (after ETL)
```

---

## No Action in This Branch

This is an audit-only branch. Data expansion must be a separate effort before C3 companion chat can work for multi-city.