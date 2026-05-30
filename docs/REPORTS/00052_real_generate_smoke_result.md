# 00052 Real Generate Smoke Result

**Date**: 2026-05-30
**Branch**: `feat/00052-c-etl-goong-data-expansion`
**Phase**: 4B — Controlled Real Generate Smoke

---

## Executive Summary

Successfully generated **2 real itineraries** using Gemini API for Hà Nội and TP.HCM. Both generate calls completed successfully with proper schema validation, DB persistence, and reasonable quality.

| Metric | Result | Status |
|---|---|---|
| Cities tested | 2 (Hà Nội, TP.HCM) | ✅ |
| Generate calls | 2 (1 per city) | ✅ |
| Gemini API used | YES | ✅ |
| Goong API used | NO | ✅ |
| ETL import | NO | ✅ |
| HTTP 201 | 2/2 | ✅ |
| Trips persisted | 2/2 | ✅ |
| Unit tests after | 115 passed | ✅ |
| Integration tests after | 37 passed | ✅ |

---

## Test Environment

### Services

| Service | Status | Evidence |
|---|---|---|
| PostgreSQL (db) | ✅ UP | `db-1: Up 16 hours (healthy)` |
| Redis | ✅ UP | `redis-1: Up 16 hours (healthy)` |
| Backend API | ✅ UP | `api-1: Up 16 hours, port 8000` |
| Health endpoint | ✅ 200 | `{"status":"healthy"}` |

### Config (boolean only)

| Config | Status |
|---|---|
| GEMINI_API_KEY | ✅ PRESENT |
| DATABASE_URL | ✅ PRESENT |
| REDIS_URL | ✅ CONFIGURED (docker-compose) |
| GOONG_API_KEY | ⚠️ MISSING (no call in this phase) |

---

## DB Readiness Before Generate

| City | Places | Hotels | Categories | Status |
|---|---|---|---|---|
| Hà Nội | 73 | 3 | 5 | ✅ READY |
| TP. Hồ Chí Minh | 73 | 2 | 5 | ✅ READY |

Source: Phase 3 import results (`00052_multicity_real_import_result.md`)

---

## Generate Results

### Hà Nội

**Request**:
```json
{
  "destination": "Hà Nội",
  "start_date": "2026-06-10",
  "end_date": "2026-06-11",
  "budget": 1000000,
  "adults": 1,
  "children": 0,
  "interests": ["văn hóa", "ẩm thực"]
}
```

**Response**:
- HTTP Status: **201**
- Latency: **37.4s**
- Trip ID: **236**
- Destination: **Hà Nội**
- Trip Name: **"Khám phá Hà Nội: Văn hóa và Ẩm thực"**
- Days: **2**
- Activities: **10** (5 per day)
- Accommodations: **1**
- Total Cost: **780,000 VND**

**Sample Activities**:
- Tham quan Di tích 48 Hàng Ngang (attraction)
- Thưởng thức Phở truyền thống Hà Nội (food)
- Tham quan Bảo tàng Lịch sử Quân Sự Việt Nam (attraction)
- Tham quan Văn Miếu - Quốc Tử Giám (attraction)
- Khám phá Phố Cổ và thưởng thức Cà phê trứng (food)

**Persistence Verified**:
- ✅ GET `/api/v1/itineraries/236` returns same trip
- ✅ 2 days persisted
- ✅ 10 activities persisted
- ✅ 1 accommodation persisted

---

### TP. Hồ Chí Minh

**Request**:
```json
{
  "destination": "TP. Hồ Chí Minh",
  "start_date": "2026-06-12",
  "end_date": "2026-06-13",
  "budget": 1000000,
  "adults": 1,
  "children": 0,
  "interests": ["ẩm thực", "mua sắm"]
}
```

**Response**:
- HTTP Status: **201**
- Latency: **38.7s**
- Trip ID: **237**
- Destination: **TP. Hồ Chí Minh**
- Trip Name: **"Khám phá Ẩm thực và Mua sắm Sài Gòn"**
- Days: **2**
- Activities: **10** (5 per day)
- Accommodations: **1**
- Total Cost: **818,000 VND**

**Sample Activities**:
- Bữa sáng Bún Riêu Gánh (food)
- Khám phá Chợ Lớn (shopping)
- Tham quan Bảo tàng Mỹ thuật Thành phố Hồ Chí Minh (attraction)
- Mua sắm tại Chợ Quán (shopping)
- Bữa tối đặc sản Sài Gòn (food)

**Persistence Verified**:
- ✅ GET `/api/v1/itineraries/237` returns same trip
- ✅ 2 days persisted
- ✅ 10 activities persisted
- ✅ 1 accommodation persisted

---

## Quality Validation

### Schema Validity

Both trips return valid schema with:
- ✅ Trip ID (integer)
- ✅ Destination (string)
- ✅ Trip Name (string)
- ✅ Start/End dates (YYYY-MM-DD)
- ✅ Budget (integer)
- ✅ Total Cost (integer)
- ✅ Traveler Info (adults, children, total)
- ✅ Interests (array of strings)
- ✅ Days array (with id, label, date, activities)
- ✅ Activities array (with id, time, name, location, type, etc.)
- ✅ Accommodations array (with id, dayIds, bookingType, price, etc.)

### Basic Quality

| Check | Hà Nội | TP.HCM |
|---|---|---|
| Destination matches request | ✅ YES | ✅ YES |
| Days count matches request (2) | ✅ YES | ✅ YES |
| Activity count reasonable (10) | ✅ YES | ✅ YES |
| No empty activity names | ✅ PASS | ✅ PASS |
| Activity types valid | ✅ attraction, food, nature, shopping | ✅ food, shopping, attraction |
| Transportation types valid | ✅ walk, taxi | ✅ walk, bus |
| Total cost exists | ✅ 780,000 VND | ✅ 818,000 VND |
| Trip name exists and relevant | ✅ YES | ✅ YES |

### Limitations (NOT tested in this phase)

- ❌ Route/geography sanity: Not fully tested (deferred to 00053/00055)
- ❌ Distance/directions accuracy: Not tested (requires Goong Directions API)
- ❌ Budget optimization: Not tested (cost estimation only)
- ❌ LLM hallucination: Not deeply tested (basic schema validation only)
- ❌ Browser FE generate UX: Not tested (deferred to 00055)
- ❌ TC429 rate limit regression: Not stress tested (only 2 calls)

---

## Rate Limit Observation

### Redis Keys

- Rate limit key found: `rate:ai:user:276:20260530`
- Current call count: **2**
- Expected: **2** (1 Hà Nội + 1 TP.HCM)

✅ Rate limiter working correctly. No spam, no forced 429 test.

---

## Backend Tests After Smoke

All tests passing after 2 real generate calls:

| Test suite | Result | Details |
|---|---|---|
| Ruff lint | ✅ PASS | All checks passed |
| Ruff format | ✅ PASS | 88 files already formatted |
| Unit tests | ✅ PASS | 115 passed, 1 deprecation warning |
| Integration tests | ✅ PASS | 37 passed, 7 skipped |

---

## Limitations

1. **Only 2 cities tested**: Hà Nội and TP.HCM only; remaining 8 imported cities not tested
2. **Route/geography sanity NOT_FULLY_TESTED**: Distance/directions require Goong Directions API
3. **Browser NOT_TESTED**: FE generate UX, error visibility, flow validation deferred to 00055
4. **TC429 NOT_STRESS_TESTED**: Only 2 calls, no forced 429 test
5. **Budget optimization NOT_TESTED**: Cost estimation only, no optimization verification
6. **LLM hallucination NOT_DEEPLY_TESTED**: Basic schema validation only
7. **Guest flow NOT_TESTED**: Used authenticated user only
8. **Accommodation hotel selection**: Hotel data from YAML only, not real booking inventory

---

## Conclusion

Phase 4B — Controlled Real Generate Smoke **SUCCESS**.

Both Hà Nội and TP.HCM generate calls completed successfully with:
- ✅ Gemini API integration working
- ✅ Schema validation passing
- ✅ DB persistence verified
- ✅ Rate limiting functional
- ✅ Basic quality acceptable

**Recommended next phase**: `00052 Phase 5 — Scheduler/deployment ETL setup` or `00053 — Generate pipeline hardening` (if budget/geography issues appear).

**Not recommended**: C3/C4 implementation yet — companion chat should wait after generate is stable.

---

**Generated**: 2026-05-30
**Status**: GENERATE_SMOKE_COMPLETE (2/2 cities)
**Total duration**: ~10 minutes (including setup, validation, tests)

---

## Security Notes

- **LOCAL_TEST_TOKEN_EXPOSED_IN_TERMINAL_OUTPUT**: During Phase 4B smoke testing, authentication tokens (accessToken, refreshToken) were visible in local terminal output when writing temporary JSON files to `/tmp/`.
- **Temp files cleaned**: All temporary payload files (`/tmp/register_user.json`, `/tmp/login_user.json`, `/tmp/generate_*.json`, `/tmp/trip_*.json`) have been deleted.
- **No tracked secrets**: No raw tokens or API keys are stored in tracked documentation. Test user credentials should be considered disposable.
- **Test data only**: Generated trips (id 236, 237) exist in local PostgreSQL Docker container only, not committed.

---

## Technical Limitations Notes

### Direct DB Query Limitation

A planned repository script to verify DB readiness before generate smoke failed due to SQLAlchemy import/registry issues. Phase 4B relied on:
1. Phase 3 Consolidated DB evidence (`00052_multicity_real_import_result.md`) for place/hotel counts
2. API verification (`GET /api/v1/places/destinations`) for city existence

**Resolution**: DB readiness confirmed via Phase 3 evidence + API calls. Direct query script not required for smoke validation.

### Terminal Encoding Note

During generate execution, destination string comparison (`Hà Nội` == response destination) printed `False` in terminal output due to console encoding (mojibake). However:
- API JSON response inspected directly showed correct destination: `"Hà Nội"`
- Persisted trips verified via GET endpoint with correct data
- No actual data mismatch found

**Resolution**: Encoding issue was display-only; API and DB data were correct. Vietnamese characters handled properly by FastAPI/PostgreSQL.

---

## No Overclaim — Scope Clarification

### What WAS Tested (2-City Smoke)

| Component | Scope | Evidence |
|---|---|---|
| Real Gemini API | 2 cities (Hà Nội, TP.HCM) | 2/2 HTTP 201, ~38s latency |
| Schema validation | 2 trips | Both valid: trip, days, activities, accommodations |
| DB persistence | 2 trips (id 236, 237) | GET endpoint confirms |
| Rate limiting | 2 AI calls | Redis key count = 2 |
| Backend tests | smoke after-check | 115 unit + 37 integration pass |

### What Was NOT Tested

| Component | Status | Reason |
|---|---|---|
| Remaining 4 cities (Đà Nẵng, Hội An, Huế, Nha Trang) | NOT_TESTED | 2-city smoke scope only |
| Route/geography sanity | NOT_FULLY_TESTED | Requires Goong Directions API |
| Budget optimization | NOT_TESTED | Cost estimation only |
| LLM hallucination deep test | NOT_TESTED | Basic schema validation only |
| Browser FE generate UX | NOT_TESTED | Deferred to 00055 |
| Guest flow | NOT_TESTED | Authenticated user only |
| TC429 stress test | NOT_TESTED | Only 2 calls, no forced 429 |
| C3/C4 features | NOT_TESTED | Companion chat not in scope |

**Verdict**: `REAL_GENERATE_SMOKE_READY_2_CITIES` — NOT full multi-city readiness, NOT C3/C4 readiness.
