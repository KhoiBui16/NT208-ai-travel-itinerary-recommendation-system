# Part 16: Unit Test Specifications — Chi tiết test từng function

> **Decision lock v4.1:** Unit tests phải cover security-first updates: `claimToken`,
> `shareToken`, owner-only itinerary ID, Companion patch-confirm, Analytics feature flag/read-only
> DB role, và AI rate-limit fail mode khi Redis lỗi.

## Mục đích file này

File này trả lời câu hỏi: **"Viết code test THẾ NÀO?"**

| Câu hỏi | Trả lời ở đâu |
|---------|---------------|
| "Hệ thống LÀM GÌ?" → Use Cases | [10_use_cases_test_plan.md](10_use_cases_test_plan.md) |
| "Test case nào verify feature X?" → TCs | [10_use_cases_test_plan.md](10_use_cases_test_plan.md) §4 |
| **"Code test hàm Y mock cái gì?"** → Unit test specs | **File này** |

### WHO — Ai đọc file này?

- **Developer:** Mở file này KHI viết `pytest` code — biết mock gì, assert gì, input/output cụ thể
- **Code Reviewer:** Kiểm tra test coverage đủ chưa

### WHEN — Khi nào đọc?

- Khi implement task B3, B8, B11, C4, C5, C6, C7 trong [15_todo_checklist.md](15_todo_checklist.md)
- Khi thêm test mới → check naming conventions + mock strategy

---

## 1. Test File → Phase → TC Mapping

| Phase | Task | Test File | TC IDs | Priority |
|-------|------|-----------|--------|----------|
| B3 | Auth tests | `tests/unit/test_security.py` | TC-AUTH-01→04 | P1 |
| B3 | Auth tests | `tests/unit/test_auth_service.py` | TC-AUTH-05→13 | P1 |
| B3 | Auth integration | `tests/integration/test_auth_endpoints.py` | TC-AUTH-01→13 | P1 |
| B8 | Itinerary tests | `tests/unit/test_itinerary_service.py` | TC-ITIN-01→12 | P1 |
| B8 | Itinerary sync | `tests/unit/test_itinerary_sync.py` | TC-ITIN-13→16 | P1 |
| B8 | Itinerary schemas | `tests/unit/test_schemas.py` | TC-ITIN-17→19 | P2 |
| B8 | Itinerary integration | `tests/integration/test_itinerary_endpoints.py` | TC-ITIN-01→19 | P1 |
| B11 | Place tests | `tests/unit/test_place_service.py` | TC-PLACE-01→09 | P2 |
| B11 | Place integration | `tests/integration/test_place_endpoints.py` | TC-PLACE-01→09 | P2 |
| C4 | AI pipeline | `tests/unit/test_agent_pipeline.py` | TC-AI-01→06 | P1 |
| C4 | Rate limiter | `tests/unit/test_rate_limiter.py` | TC-AI-07→11 | P1 |
| C4 | Agent integration | `tests/integration/test_agent_endpoints.py` | TC-AI-01→11 | P1 |
| **C5** 🆕 | Supervisor | `tests/unit/test_supervisor.py` | TC-SUP-01→06 | P1 |
| **C6** 🆕 | Analytics optional | `tests/unit/test_analytics_pipeline.py` | TC-ANA-01→06 | P1 |
| **C6** 🆕 | Analytics integration optional | `tests/integration/test_analytics_endpoints.py` | TC-ANA-01→06 | P1 |
| **C7** 🆕 | Guardrails | `tests/unit/test_guardrails.py` | TC-GUARD-01→03 | P1 |

---

## 2. Auth Unit Tests — 13 TCs

### test_security.py (4 TCs)

#### TC-AUTH-01: Hash password

| Field | Value |
|-------|-------|
| **Function** | `hash_password(plain: str) → str` |
| **Kịch bản** | Hash mật khẩu thành công |
| **Input** | `"secret123"` |
| **Expected** | String bắt đầu `$2b$12$` (bcrypt format), length = 60 |
| **Assert** | `assert result.startswith("$2b$12$") and len(result) == 60` |
| **Giải thích** | bcrypt 12 rounds → ~250ms/hash, đủ chậm cho brute-force |

#### TC-AUTH-02: Verify password OK

| Field | Value |
|-------|-------|
| **Function** | `verify_password(plain, hashed) → bool` |
| **Kịch bản** | Mật khẩu đúng |
| **Input** | `plain="secret123", hashed=hash_password("secret123")` |
| **Expected** | `True` |
| **Assert** | `assert verify_password("secret123", hashed) is True` |

#### TC-AUTH-03: Verify password FAIL

| Field | Value |
|-------|-------|
| **Function** | `verify_password(plain, hashed) → bool` |
| **Kịch bản** | Mật khẩu sai |
| **Input** | `plain="wrong", hashed=hash_password("secret123")` |
| **Expected** | `False` |

#### TC-AUTH-04: Create JWT token

| Field | Value |
|-------|-------|
| **Function** | `create_access_token(data: dict) → str` |
| **Kịch bản** | Tạo JWT từ user data |
| **Input** | `{"sub": "1", "email": "a@b.com"}` |
| **Expected** | Valid JWT string, decode → chứa `sub`, `exp`, `iat` |
| **Assert** | `decoded = jwt.decode(token, SECRET_KEY); assert decoded["sub"] == "1"` |
| **Giải thích** | Expiry = 15 phút, algorithm = HS256 |

### test_auth_service.py (9 TCs)

#### TC-AUTH-05: Register success

| Field | Value |
|-------|-------|
| **Function** | `AuthService.register(request)` |
| **Kịch bản** | Đăng ký thành công |
| **Input** | `RegisterRequest(email="a@b.com", password="secret123", full_name="Test")` |
| **Mock** | `user_repo.get_by_email.return_value = None` (email chưa tồn tại) |
| **Expected** | `AuthResponse(access_token=..., refresh_token=..., user=UserResponse)` |
| **Assert** | `user_repo.create.assert_called_once()` |

#### TC-AUTH-06: Register — duplicate email

| Field | Value |
|-------|-------|
| **Function** | `AuthService.register(request)` |
| **Kịch bản** | Email đã tồn tại |
| **Input** | `RegisterRequest(email="exist@b.com", ...)` |
| **Mock** | `user_repo.get_by_email.return_value = MagicMock()` (email tồn tại) |
| **Expected** | `raises ConflictException` |
| **Assert** | `pytest.raises(ConflictException)` |

#### TC-AUTH-07: Login success

| Field | Value |
|-------|-------|
| **Function** | `AuthService.login(request)` |
| **Kịch bản** | Đăng nhập thành công |
| **Input** | `LoginRequest(email="a@b.com", password="secret123")` |
| **Mock** | `user_repo.get_by_email → user(hashed_password=hash("secret123"))` |
| **Expected** | `AuthResponse(access_token, refresh_token, user)` |

#### TC-AUTH-08: Login — wrong password

| Field | Value |
|-------|-------|
| **Function** | `AuthService.login(request)` |
| **Kịch bản** | Sai mật khẩu |
| **Mock** | `user_repo.get_by_email → user(hashed_password=hash("correct"))` |
| **Input** | `LoginRequest(email="a@b.com", password="wrong")` |
| **Expected** | `raises UnauthorizedException` |

#### TC-AUTH-09: Login — email not found

| Field | Value |
|-------|-------|
| **Function** | `AuthService.login(request)` |
| **Mock** | `user_repo.get_by_email.return_value = None` |
| **Expected** | `raises UnauthorizedException` |

#### TC-AUTH-10: Refresh token success

| Field | Value |
|-------|-------|
| **Function** | `AuthService.refresh(refresh_token)` |
| **Mock** | `token_repo.get_by_hash → valid token record (not expired)` |
| **Expected** | New token pair (old refresh revoked) |

#### TC-AUTH-11: Refresh token expired

| Field | Value |
|-------|-------|
| **Function** | `AuthService.refresh(refresh_token)` |
| **Mock** | `token_repo.get_by_hash → token record (expires_at < now)` |
| **Expected** | `raises UnauthorizedException` |

#### TC-AUTH-12: Logout success

| Field | Value |
|-------|-------|
| **Function** | `AuthService.logout(refresh_token)` |
| **Mock** | `token_repo.revoke → True` |
| **Expected** | No exception, token revoked |

#### TC-AUTH-13: Logout — invalid token

| Field | Value |
|-------|-------|
| **Function** | `AuthService.logout(refresh_token)` |
| **Mock** | `token_repo.get_by_hash → None` |
| **Expected** | `raises UnauthorizedException` |

---

## 3. Itinerary Unit Tests — 19 TCs

### test_itinerary_service.py (12 TCs)

#### TC-ITIN-01: Generate trip AI thành công

| Field | Value |
|-------|-------|
| **Function** | `ItineraryService.generate(request, user_id)` |
| **Input** | `GenerateRequest(destination="Hà Nội", start_date, end_date, budget=5M, ...)` |
| **Mock** | `agent_pipeline.run → AgentItinerary(days=[...], total_cost=4.5M)` |
| **Expected** | Trip saved, 3 days, totalCost ≤ budget |
| **Assert** | `trip_repo.create.assert_called_once(); assert trip.ai_generated == True` |

#### TC-ITIN-02: Generate — rate limit exceeded

| Field | Value |
|-------|-------|
| **Function** | `ItineraryService.generate(request, user_id)` |
| **Mock** | `rate_limiter.check → RateLimitExceeded` |
| **Expected** | `raises RateLimitException (429)` |
| **Assert** | `agent_pipeline.run.assert_not_called()` |

#### TC-ITIN-03: Get trip — owner

| Field | Value |
|-------|-------|
| **Function** | `ItineraryService.get(trip_id, user_id)` |
| **Mock** | `trip_repo.get_by_id → trip(user_id=42)`, current_user_id=42 |
| **Expected** | `ItineraryResponse` with days, activities |

#### TC-ITIN-04: Get trip — not owner

| Field | Value |
|-------|-------|
| **Function** | `ItineraryService.get(trip_id, user_id)` |
| **Mock** | `trip_repo.get_by_id → trip(user_id=1)`, current_user_id=2 |
| **Expected** | `raises ForbiddenException` |

#### TC-ITIN-05: Get trip — not found

| Field | Value |
|-------|-------|
| **Function** | `ItineraryService.get(trip_id, user_id)` |
| **Mock** | `trip_repo.get_by_id → None` |
| **Expected** | `raises NotFoundException` |

#### TC-ITIN-06: Update (auto-save) — happy path

| Field | Value |
|-------|-------|
| **Function** | `ItineraryService.update(trip_id, request, user_id)` |
| **Mock** | `trip_repo.get_by_id → trip(user_id=42, days=[day1, day2])` |
| **Input** | `UpdateRequest(tripName="updated", days=[updated_day1, new_day3])` |
| **Expected** | Day1 updated, Day2 deleted, Day3 created |

#### TC-ITIN-07: Delete trip

| Field | Value |
|-------|-------|
| **Function** | `ItineraryService.delete(trip_id, user_id)` |
| **Mock** | Trip exists, user is owner |
| **Expected** | `trip_repo.delete.assert_called_once()` |

#### TC-ITIN-08: List user trips

| Field | Value |
|-------|-------|
| **Function** | `ItineraryService.list(user_id, page, limit)` |
| **Mock** | `trip_repo.list_by_user → [trip1, trip2, trip3]` |
| **Expected** | `PaginatedResponse(items=[3], total=3, page=1)` |

#### TC-ITIN-09: Rate trip

| Field | Value |
|-------|-------|
| **Function** | `ItineraryService.rate(trip_id, rating, user_id)` |
| **Input** | `rating=4` |
| **Mock** | Trip exists, user is owner |
| **Expected** | `trip.rating = 4` |

#### TC-ITIN-10: Share trip — generate link

| Field | Value |
|-------|-------|
| **Function** | `ItineraryService.share(trip_id, user_id)` |
| **Mock** | Trip exists, user is owner |
| **Expected** | `ShareResponse(share_url="/shared/abc123", share_token="abc123", expires_at=...)` |
| **Assert** | `share_link_repo.create` called with `token_hash`, not raw token |

#### TC-ITIN-11: Claim guest trip (UC-18)

| Field | Value |
|-------|-------|
| **Function** | `ItineraryService.claim(trip_id, user_id, claim_token)` |
| **Mock** | `trip_repo.get_by_id → trip(user_id=None)`, `guest_claim_repo.verify → valid token` |
| **Expected** | `trip.user_id = current_user_id` |
| **Assert** | `trip_repo.update.assert_called_once(); guest_claim_repo.consume.assert_called_once()` |

#### TC-ITIN-12: Claim — trip already owned

| Field | Value |
|-------|-------|
| **Function** | `ItineraryService.claim(trip_id, user_id, claim_token)` |
| **Mock** | `trip_repo.get_by_id → trip(user_id=99)` (owned by another) |
| **Expected** | `raises ConflictException` |

#### TC-ITIN-12b: Claim — invalid/expired claimToken

| Field | Value |
|-------|-------|
| **Function** | `ItineraryService.claim(trip_id, user_id, claim_token)` |
| **Mock** | `trip_repo.get_by_id → trip(user_id=None)`, `guest_claim_repo.verify → False` |
| **Expected** | `raises ForbiddenException` |
| **Assert** | `trip_repo.update.assert_not_called()` |

### test_itinerary_sync.py (4 TCs)

#### TC-ITIN-13: Diff — detect added day

| Field | Value |
|-------|-------|
| **Function** | `diff_itinerary(old_days, new_days)` |
| **Input** | `old=[day1], new=[day1, day2]` |
| **Expected** | `DiffResult(added=[day2], updated=[], deleted=[])` |

#### TC-ITIN-14: Diff — detect deleted activity

| Field | Value |
|-------|-------|
| **Function** | `diff_itinerary(old_days, new_days)` |
| **Input** | `old=day1(3 activities), new=day1(2 activities)` |
| **Expected** | `DiffResult(deleted=[activity3])` |

#### TC-ITIN-15: Merge — apply diff to DB

| Field | Value |
|-------|-------|
| **Function** | `merge_itinerary(trip_id, diff_result, session)` |
| **Mock** | DB session |
| **Expected** | INSERT + UPDATE + DELETE in single transaction |

#### TC-ITIN-16: Merge — empty diff (no changes)

| Field | Value |
|-------|-------|
| **Function** | `merge_itinerary(trip_id, diff_result, session)` |
| **Input** | `DiffResult(added=[], updated=[], deleted=[])` |
| **Expected** | No DB operations, no commit |

### test_schemas.py (3 TCs)

#### TC-ITIN-17: Validate budget — negative value

| Field | Value |
|-------|-------|
| **Function** | `GenerateRequest(budget=-1)` |
| **Expected** | `raises ValidationError: "budget must be positive"` |

#### TC-ITIN-18: Validate dates — end before start

| Field | Value |
|-------|-------|
| **Function** | `GenerateRequest(start_date="2026-05-03", end_date="2026-05-01")` |
| **Expected** | `raises ValidationError: "end_date must be after start_date"` |

#### TC-ITIN-19: Validate — 0 days trip

| Field | Value |
|-------|-------|
| **Function** | `GenerateRequest(start_date="2026-05-01", end_date="2026-05-01")` |
| **Expected** | Valid (1-day trip) |

---

## 4. Place Unit Tests — 9 TCs

### test_place_service.py (9 TCs)

#### TC-PLACE-01: Search places — happy path

| Field | Value |
|-------|-------|
| **Function** | `PlaceService.search(query, city, category)` |
| **Input** | `query="phở", city="Hà Nội", category="food"` |
| **Mock** | `place_repo.search → [place1(rating=4.5), place2(rating=4.0)]` |
| **Expected** | `[PlaceResponse(name=..., rating=4.5), ...]` sorted by rating DESC |

#### TC-PLACE-02: Search — empty results

| Field | Value |
|-------|-------|
| **Input** | `query="xyzabc"` |
| **Mock** | `place_repo.search → []` |
| **Expected** | `[]` (empty list, NOT 404) |

#### TC-PLACE-03: Get destinations — cached

| Field | Value |
|-------|-------|
| **Function** | `PlaceService.get_destinations()` |
| **Mock** | `redis.get("destinations") → cached JSON` |
| **Expected** | Return from cache, DB NOT called |
| **Assert** | `place_repo.get_destinations.assert_not_called()` |

#### TC-PLACE-04: Get destinations — cache miss

| Field | Value |
|-------|-------|
| **Mock** | `redis.get("destinations") → None` |
| **Expected** | Query DB, cache result (TTL=1h) |
| **Assert** | `redis.set.assert_called_once()` |

#### TC-PLACE-05: Bookmark place — success

| Field | Value |
|-------|-------|
| **Function** | `PlaceService.bookmark(user_id, place_id)` |
| **Mock** | `saved_repo.exists → False, place_repo.get → place` |
| **Expected** | `saved_repo.create.assert_called_once()` |

#### TC-PLACE-06: Bookmark — duplicate

| Field | Value |
|-------|-------|
| **Mock** | `saved_repo.exists → True` |
| **Expected** | `raises ConflictException` |

#### TC-PLACE-07: Bookmark — place not found

| Field | Value |
|-------|-------|
| **Mock** | `place_repo.get → None` |
| **Expected** | `raises NotFoundException` |

#### TC-PLACE-08: Unbookmark — success

| Field | Value |
|-------|-------|
| **Function** | `PlaceService.unbookmark(user_id, saved_id)` |
| **Mock** | `saved_repo.get → record(user_id=current)` |
| **Expected** | `saved_repo.delete.assert_called_once()` |

#### TC-PLACE-09: Unbookmark — not owner

| Field | Value |
|-------|-------|
| **Mock** | `saved_repo.get → record(user_id=other)` |
| **Expected** | `raises ForbiddenException` |

---

## 5. AI Agent Unit Tests — 23 TCs

### 5.1 Mock LLM Strategy

```python
# tests/conftest.py — AI-specific fixtures

@pytest.fixture
def mock_llm():
    """Mock ChatGoogleGenerativeAI — return predefined responses."""
    with patch("src.agent.llm.ChatGoogleGenerativeAI") as mock:
        instance = mock.return_value
        # Default: return a simple text response
        instance.ainvoke.return_value = AIMessage(content="Mocked response")
        yield instance

@pytest.fixture
def mock_llm_structured():
    """Mock LLM that returns structured JSON (for ItineraryPipeline)."""
    with patch("src.agent.llm.ChatGoogleGenerativeAI") as mock:
        instance = mock.return_value
        instance.with_structured_output.return_value.ainvoke.return_value = {
            "days": [{"day_number": 1, "activities": [...]}],
            "total_cost": 4500000,
            "summary": "Khám phá Hà Nội"
        }
        yield instance

@pytest.fixture
def mock_db_readonly():
    """Mock read-only DB session for Analytics."""
    session = AsyncMock()
    session.execute.return_value = MagicMock(
        fetchall=lambda: [(5,)],  # Default: COUNT(*) = 5
        keys=lambda: ["count"]
    )
    yield session
```

**Quy tắc mock:**
1. **Unit test:** Mock TẤT CẢ dependencies (DB, Redis, LLM, external APIs)
2. **Integration test:** Real DB + mock LLM (LLM quá chậm + tốn tiền cho CI)
3. **Naming:** `test_<module>_<scenario>` → VD: `test_supervisor_classify_itinerary`
4. **Arrange-Act-Assert:** Mỗi test rõ ràng 3 phần

### 5.2 Supervisor Tests — test_supervisor.py (5 TCs)

#### TC-SUP-01: classify_intent → CHAT/PATCH

| Field | Value |
|-------|-------|
| **Function** | `TravelSupervisor.classify_intent(message, context)` |
| **Input** | `message="Thêm phở vào ngày 1", context={"trip_id": 42}` |
| **Mock** | `mock_llm.ainvoke → {"intent": "chat", "confidence": 0.95}` |
| **Expected** | `AgentIntent.CHAT` |
| **Assert** | `assert result == AgentIntent.CHAT` |
| **Giải thích** | Generate explicit không qua Supervisor; chat modify mới cần routing |

#### TC-SUP-02: classify_intent → ANALYTICS

| Field | Value |
|-------|-------|
| **Function** | `TravelSupervisor.classify_intent(message, context)` |
| **Input** | `message="Tôi đã tạo bao nhiêu trips?", context={"user_id": 42}` |
| **Mock** | `mock_llm.ainvoke → {"intent": "analytics", "confidence": 0.88}` |
| **Expected** | `AgentIntent.ANALYTICS` |

#### TC-SUP-03: classify_intent → CHAT (fallback)

| Field | Value |
|-------|-------|
| **Function** | `TravelSupervisor.classify_intent(message, context)` |
| **Input** | `message="Hello!", context=None` |
| **Mock** | `mock_llm.ainvoke → {"intent": "unknown", "confidence": 0.3}` |
| **Expected** | `AgentIntent.CHAT` (fallback khi confidence < 0.7) |
| **Giải thích** | Confidence thấp → safe default = Companion handles |

#### TC-SUP-04: route → correct worker

| Field | Value |
|-------|-------|
| **Function** | `TravelSupervisor.route(intent)` |
| **Input** | `AgentIntent.ANALYTICS` |
| **Expected** | Returns `AnalyticsWorker` instance |
| **Assert** | `assert isinstance(result, AnalyticsWorker)` |

#### TC-SUP-05: Worker timeout → 504

| Field | Value |
|-------|-------|
| **Function** | `TravelSupervisor.execute(message, context)` |
| **Mock** | `worker.run = AsyncMock(side_effect=asyncio.TimeoutError)` |
| **Expected** | `raises GatewayTimeoutException` |
| **Assert** | `assert error.status_code == 504` |

#### TC-SUP-06: direct generate/suggest bypass Supervisor

| Field | Value |
|-------|-------|
| **Function** | Router/service wiring |
| **Input** | `POST /itineraries/generate`, `GET /agent/suggest/1` |
| **Mock** | `TravelSupervisor.classify_intent = AsyncMock()` |
| **Expected** | Direct calls to `ItineraryPipeline.run` and `SuggestionService.get_alternatives` |
| **Assert** | `classify_intent.assert_not_called()` |

### 5.3 Analytics Tests — test_analytics_pipeline.py (6 TCs, optional/MVP2+)

#### TC-ANA-01: Analytics query thành công

| Field | Value |
|-------|-------|
| **Function** | `AnalyticsWorker.run(question, user_id)` |
| **Input** | `question="Bao nhiêu trips tháng 4?", user_id=42` |
| **Mock** | `mock_llm (SQL gen) → "SELECT COUNT(*) FROM trips WHERE user_id=42 AND ..."` |
| **Mock** | `mock_llm (checker) → {"safe": True}` |
| **Mock** | `mock_db_readonly.execute → [(3,)]` |
| **Mock** | `mock_llm (format) → "Bạn đã tạo 3 trips tháng 4."` |
| **Expected** | `AnalyticsResponse(answer="Bạn đã tạo 3 trips tháng 4.", sql="SELECT...", rows=[...])` |
| **Assert** | `mock_sql_validator.validate.assert_called_once(); mock_db_readonly.execute.assert_called_once(); audit_repo.create.assert_called_once()` |

#### TC-ANA-02: Off-topic question blocked

| Field | Value |
|-------|-------|
| **Function** | `AnalyticsWorker.run(question, user_id)` |
| **Input** | `question="Thời tiết hôm nay thế nào?", user_id=42` |
| **Mock** | `mock_llm → {"off_topic": True}` |
| **Expected** | `raises BadRequestException("Câu hỏi không liên quan đến dữ liệu")` |
| **Assert** | `mock_db_readonly.execute.assert_not_called()` |

#### TC-ANA-03: Unsafe SQL blocked + retry

| Field | Value |
|-------|-------|
| **Function** | `AnalyticsWorker.run(question, user_id)` |
| **Mock** | `mock_llm (SQL gen) → "DELETE FROM trips"` (lần 1) |
| **Mock** | `mock_sql_validator.validate → invalid("DML not allowed")` |
| **Mock** | `mock_llm (SQL gen retry) → "SELECT COUNT(*) FROM trips"` (lần 2) |
| **Expected** | Retry succeeded, query executed |
| **Assert** | `mock_db_readonly.execute` only called for SELECT; DELETE never executed |

#### TC-ANA-04: User-scope auto-injection

| Field | Value |
|-------|-------|
| **Function** | `AnalyticsWorker._inject_user_scope(sql, user_id)` |
| **Input** | `sql="SELECT * FROM trips", user_id=42` |
| **Expected** | `"SELECT * FROM trips WHERE user_id = 42 LIMIT 100"` |
| **Giải thích** | Nếu SQL không có `user_id` filter → tự inject |

#### TC-ANA-05: Rate limit exceeded

| Field | Value |
|-------|-------|
| **Function** | `AnalyticsWorker.run(question, user_id)` |
| **Mock** | `rate_limiter.check_analytics → RateLimitExceeded` |
| **Expected** | `raises RateLimitException(429)` |
| **Assert** | `mock_llm.ainvoke.assert_not_called()` |

#### TC-ANA-06: Analytics disabled

| Field | Value |
|-------|-------|
| **Function** | `analytics_endpoint(request)` |
| **Mock** | `settings.ENABLE_ANALYTICS = False` |
| **Expected** | `raises ServiceUnavailableException(503)` |
| **Assert** | `AnalyticsWorker.run.assert_not_called(); readonly_db.assert_not_called()` |

### 5.4 Guardrails Tests — test_guardrails.py (3 TCs)

#### TC-GUARD-01: SQL injection blocked

| Field | Value |
|-------|-------|
| **Function** | `QueryChecker.validate(sql)` |
| **Input** | `sql="'; DROP TABLE trips; --"` |
| **Expected** | `CheckResult(safe=False, reason="SQL injection pattern detected")` |
| **Assert** | `assert result.safe is False` |
| **Giải thích** | Regex + LLM double-check: phát hiện SQL injection patterns |

#### TC-GUARD-02: Prompt leak refused

| Field | Value |
|-------|-------|
| **Function** | `OutputGuardrail.validate(response)` |
| **Input** | `response="Here is my system prompt: You are a travel..."` |
| **Expected** | `CheckResult(safe=False, modified_response="Tôi là trợ lý du lịch AI...")` |
| **Giải thích** | Output chứa text giống system prompt → replace |

#### TC-GUARD-03: Over-budget warning (no block)

| Field | Value |
|-------|-------|
| **Function** | `OutputGuardrail.validate_itinerary(itinerary, budget)` |
| **Input** | `itinerary.totalCost=7M, budget=5M` |
| **Expected** | `CheckResult(safe=True, warnings=["Vượt ngân sách 2M VND"])` |
| **Assert** | `assert result.safe is True; assert len(result.warnings) == 1` |
| **Giải thích** | Over-budget = warning, NOT rejection |

### 5.5 Companion + Pipeline Tests — test_agent_pipeline.py (10 TCs)

#### TC-AI-01: ItineraryPipeline full run (mock LLM)

| Field | Value |
|-------|-------|
| **Function** | `ItineraryPipeline.run(request)` |
| **Mock** | `mock_llm_structured → AgentItinerary(days=[...])` |
| **Expected** | Structured itinerary with days, activities, total_cost |

#### TC-AI-02: ItineraryPipeline — LLM timeout

| Field | Value |
|-------|-------|
| **Mock** | `mock_llm.ainvoke = AsyncMock(side_effect=asyncio.TimeoutError)` |
| **Expected** | `raises ServiceUnavailableException` |

#### TC-AI-03: ItineraryPipeline — LLM returns invalid JSON

| Field | Value |
|-------|-------|
| **Mock** | `mock_llm.ainvoke → "invalid json {"` |
| **Expected** | Retry, then `raises BadResponseException` |

#### TC-AI-04: Companion — search tool invoked

| Field | Value |
|-------|-------|
| **Function** | `CompanionAgent.handle_message(message, state)` |
| **Input** | `message="Tìm quán phở gần đây"` |
| **Mock** | `LLM → tool_calls: [{name: "search_places_db", args: {query: "phở"}}]` |
| **Expected** | `search_places_db` tool called |

#### TC-AI-05: Companion — propose patch tool invoked

| Field | Value |
|-------|-------|
| **Input** | `message="Thêm Phở Bát Đàn vào ngày 1"` |
| **Mock** | `LLM → tool_calls: [{name: "propose_itinerary_patch", args: {action: "add", ...}}]` |
| **Expected** | `requiresConfirmation=True`, `proposedOperations=[{"op":"addActivity", ...}]` |
| **Assert** | `trip_repo.create_activity.assert_not_called()` |

#### TC-AI-06: Suggest alternatives — pure DB (no AI)

| Field | Value |
|-------|-------|
| **Function** | `SuggestService.get_alternatives(activity_id)` |
| **Mock** | `place_repo.search_similar → [place1, place2, ...]` |
| **Expected** | 5 places, same category, same city |
| **Assert** | `mock_llm.assert_not_called()` (pure DB) |

#### TC-AI-07: Rate limit check — remaining > 0

| Field | Value |
|-------|-------|
| **Function** | `RateLimiter.get_status(user_id)` |
| **Mock** | `redis.get("rate:42") → 1` |
| **Expected** | `RateLimitStatus(remaining=2, limit=3, resetAt=...)` |

#### TC-AI-08: Rate limit check — all used

| Field | Value |
|-------|-------|
| **Mock** | `redis.get("rate:42") → 3` |
| **Expected** | `RateLimitStatus(remaining=0, limit=3, resetAt=...)` |

#### TC-AI-09: Redis down for paid AI rate limit

| Field | Value |
|-------|-------|
| **Function** | `RateLimiter.check_ai_or_raise(user_id)` |
| **Mock** | `redis.get.side_effect = ConnectionError`, `settings.AI_RATE_LIMIT_FAIL_MODE="closed"` |
| **Expected** | `raises ServiceUnavailableException` |
| **Assert** | Gemini/LLM caller is not invoked by endpoint test |

#### TC-AI-10: WebSocket — message handler unit test

| Field | Value |
|-------|-------|
| **Function** | `WSMessageHandler.handle(message_data)` |
| **Input** | `{"type": "message", "content": "Hello"}` |
| **Mock** | `companion_agent.handle_message → "Hi! Tôi có thể giúp gì?"` |
| **Expected** | `WSResponse(type="response", content="Hi! ...", requiresConfirmation=False, proposedOperations=[])` |
| **Giải thích** | Test handler logic, NOT WebSocket connection (connection = integration) |

#### TC-AI-11: WebSocket — invalid message type

| Field | Value |
|-------|-------|
| **Input** | `{"type": "invalid", "content": "..."}` |
| **Expected** | `WSResponse(type="error", content="Loại message không hợp lệ")` |

---

## 6. Fixtures & Factories

```python
# tests/conftest.py — Complete shared fixtures

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from unittest.mock import AsyncMock, MagicMock, patch

TEST_DB_URL = "postgresql+asyncpg://test:test@localhost:5433/test_db"

# === DB Fixtures ===

@pytest.fixture
async def db_session():
    """Create test DB session — rollback after each test."""
    engine = create_async_engine(TEST_DB_URL)
    async with AsyncSession(engine) as session:
        yield session
        await session.rollback()

@pytest.fixture
async def client(db_session):
    """HTTP test client with test DB."""
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

# === Auth Fixtures ===

@pytest.fixture
async def auth_user(client):
    """Create and login a test user, return headers."""
    await client.post("/api/v1/auth/register", json={
        "email": "test@test.com",
        "password": "secret123",
        "full_name": "Test User"
    })
    response = await client.post("/api/v1/auth/login", json={
        "email": "test@test.com",
        "password": "secret123"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

# === AI Fixtures ===

@pytest.fixture
def mock_llm():
    """Mock ChatGoogleGenerativeAI."""
    with patch("src.agent.llm.ChatGoogleGenerativeAI") as mock:
        instance = mock.return_value
        instance.ainvoke.return_value = AIMessage(content="Mocked response")
        yield instance

@pytest.fixture
def mock_db_readonly():
    """Mock read-only DB for Analytics tests."""
    session = AsyncMock()
    session.execute.return_value = MagicMock(
        fetchall=lambda: [(5,)],
        keys=lambda: ["count"]
    )
    yield session

# === Factory Functions ===

def create_test_user(**overrides):
    """Factory: tạo User mock."""
    defaults = {"id": 1, "email": "test@test.com", "full_name": "Test", "is_active": True}
    defaults.update(overrides)
    return MagicMock(**defaults)

def create_test_trip(**overrides):
    """Factory: tạo Trip mock."""
    defaults = {"id": 42, "user_id": 1, "destination": "Hà Nội", 
                "trip_name": "Test Trip", "budget": 5000000, "ai_generated": True}
    defaults.update(overrides)
    return MagicMock(**defaults)
```

---

## 7. Coverage Targets per Module

```
┌──────────────────────────────────────────────────────┐
│              COVERAGE TARGETS                         │
├────────────────────┬─────────────────────────────────┤
│ Module             │ Min Coverage                     │
├────────────────────┼─────────────────────────────────┤
│ src/core/          │ 90%  (security, config, DI)     │
│ src/services/      │ 85%  (business logic)           │
│ src/repositories/  │ 80%  (SQL operations)           │
│ src/api/           │ 75%  (request handling)          │
│ src/agent/         │ 70%  (AI — harder to test)      │
│ OVERALL            │ 80%  minimum                     │
└────────────────────┴─────────────────────────────────┘
```

> [!TIP]
> Command chạy coverage: `uv run pytest tests/ --cov=src --cov-report=html --cov-fail-under=80`
> Report HTML sẽ sinh ở `htmlcov/index.html` — mở browser xem dòng nào chưa test.
