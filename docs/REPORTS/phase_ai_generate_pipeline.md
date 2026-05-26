# Phase Report: C.1 AI Generate Pipeline

Ngày báo cáo: 2026-05-26  
Status: IMPLEMENTED + runtime smoke PASS.

## Files Liên Quan

- `Backend/src/agent/config.py`
- `Backend/src/agent/llm.py`
- `Backend/src/agent/prompts/itinerary_prompts.py`
- `Backend/src/agent/schemas/itinerary_schemas.py`
- `Backend/src/itineraries/pipeline.py`
- `Backend/src/itineraries/repository.py`
- `Backend/tests/unit/test_itinerary_pipeline.py`

## Input

```json
{
  "destination": "Hà Nội",
  "startDate": "2026-05-27",
  "endDate": "2026-05-27",
  "budget": 5000000,
  "adults": 1,
  "children": 0,
  "interests": ["culture", "food"]
}
```

## Pipeline

```text
validate request
-> resolve destination string to Destination row
-> query candidate places by requested categories
-> fallback broader place query if needed
-> query candidate hotels
-> build compact JSON prompt
-> Gemini model gemini-2.5-flash
-> parse JSON
-> validate day count, activity count, budget tolerance
-> persist trip, day, activities, accommodation
```

## Runtime Evidence

Auth smoke:

- `ai_generate_context_loaded`: 15 places, 3 hotels, prompt ~6,275 chars.
- `gemini_request_started`: timeout 120s.
- `ai_generate_llm_attempt_received`: ~20.7s.
- `ai_generate_llm_attempt_validated`: 1 day, 5 activities.
- `ai_generate_completed`: trip `136`.

Guest smoke:

- `ai_generate_llm_attempt_received`: ~24.8s.
- `ai_generate_completed`: trip `137`.
- Response included `claimToken`.

## Notes

- Local smoke used `AGENT_TIMEOUT_SECONDS=120` to avoid provider latency false negative.
- Product pacing is currently exactly 5 activities/day through `AGENT_MIN_ACTIVITIES_PER_DAY=5` and `AGENT_MAX_ACTIVITIES_PER_DAY=5`.
- C.1 is not multi-agent. C.3 Companion Chat is the future agent/tool-calling phase.
