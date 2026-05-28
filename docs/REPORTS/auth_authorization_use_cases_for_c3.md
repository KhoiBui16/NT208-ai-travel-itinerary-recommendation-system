# Auth/AuthZ Use Cases for C3 — Phase C3/C4 Readiness — 2026-05-28

## Audit Result

**Status: MOSTLY READY** — các use cases cơ bản đã có, nhưng 8 use cases sau C3 implement mới cần verify.

---

## Use Cases hiện tại (MVP2 — đã implement)

### ✅ U1 — Guest generate itinerary

```python
# router.py:47-58
user: User | None = Depends(get_current_user_optional)
if user:
    await rate_limiter.enforce_ai_limit(user.id)
else:
    await rate_limiter.enforce_ai_guest_limit(ip, user_agent)
return await service.generate(body, user_id=user.id if user else None)
```

→ Guest nhận `claimToken`, FE lưu vào `sessionStorage`.

### ✅ U2 — Guest login/register → claim trip

```python
# service.py:196-221
valid_token: GuestClaimToken | None = None
for ct in claim_tokens:
    if ct.token_hash == token_hash and ct.consumed_at is None:
        if ct.expires_at > datetime.now(UTC):
            valid_token = ct
```

→ Token hash + expiry + consumed flag + one-time use.

### ✅ U3 — Auth user xem own trip

```python
# service.py:89-91
if trip.user_id != user_id:
    raise ForbiddenException("Not trip owner")
```

→ Owner check trên `GET /itineraries/{tripId}`.

### ✅ U4 — Auth user không xem được trip user khác

**✅ PASS** — `trip.user_id != user_id → ForbiddenException`

### ✅ U5 — Auth user sửa own trip

```python
# service.py:105-106
if trip.user_id != user_id:
    raise ForbiddenException("Not trip owner")
```

→ Owner check trên `PUT /itineraries/{tripId}`.

### ✅ U6 — Auth user không sửa được trip user khác

**✅ PASS** — cùng check với U5.

### ✅ U7 — SharedTripView read-only

```python
# router.py:205-210
shared_router.get("/{share_token}", ...)
```

→ `get_shared_trip()` chỉ gọi `get_by_share_token()`, không có companion chat endpoint.

### ✅ U8 — Expired access token → refresh → retry

**✅ PASS** — có trong `auth/router.py`.

### ✅ U9 — Expired refresh token → logout

**✅ PASS** — có trong `auth/router.py`.

### ✅ U10 — Logout không thể call protected API

**✅ PASS** — JWT invalid sau logout.

---

## Use Cases C3 mới (chưa implement — verify khi C3 code)

### ⚠️ U11 — Auth user mở FloatingAIChat trong own trip

**CHƯA IMPLEMENT** — `FloatingAIChat.tsx` đang là mock.

Khi implement:
- `POST /agent/chat` phải có `user: User = Depends(get_current_user)` — đã có trong `agent/router.py` cho suggest endpoint.
- Cần thêm `owner-check` trong companion service: verify `trip.user_id == user_id`.

### ⚠️ U12 — Auth user không chat được với trip user khác

**CHƯA IMPLEMENT** — cần verify companion service có owner-check.

Plan trong `docs/06_ai_roadmap.md`:

```python
# Companion chat — owner check bắt buộc
trip = await repo.get_with_full_data(tripId)
if trip.user_id != user_id:
    raise ForbiddenException("Not trip owner")
```

### ⚠️ U13 — Auth user không apply-patch trip user khác

**CHƯA IMPLEMENT** — `POST /agent/apply-patch` (C3) chưa có.

Plan:

```python
# Apply-patch — re-verify ownership
trip = await repo.get_with_full_data(tripId)
if trip.user_id != user_id:
    raise ForbiddenException("Not trip owner")
# Validate operations...
```

### ⚠️ U14 — User A không đọc được chat session của User B

**CHƯA IMPLEMENT** — `chat_sessions` + `chat_messages` schema có sẵn nhưng API chưa implement.

Khi implement C4 chat history:
- `GET /chat/sessions` phải filter `user_id = current_user`
- `GET /chat/sessions/{sessionId}/messages` phải verify session thuộc current user
- Schema: `chat_sessions.user_id` + `chat_sessions.trip_id` (trip owner check)

### ⚠️ U15 — Stale patch → reject 409

**CHƯA IMPLEMENT** — C3 apply-patch chưa có.

Plan: thêm `patch_version` hoặc `day_version` field, reject nếu version không match.

### ⚠️ U16 — Claim token expired → 403

**✅ CÓ TRONG CODE** — `service.py:209`

```python
if ct.expires_at > datetime.now(UTC):
    valid_token = ct
if not valid_token:
    raise ForbiddenException("Invalid or expired claim token")
```

### ⚠️ U17 — Claim token reused → reject

**✅ CÓ TRONG CODE** — `service.py:208`

```python
if ct.consumed_at is None:
    ...valid_token = ct
```

Sau khi claim: `valid_token.consumed_at = datetime.now(UTC)` — consume once.

---

## Auth/AuthZ Gap Summary

| Use Case | Status | Ghi chú |
|---|---|---|
| Guest generate + claimToken | ✅ | Đã implement |
| Guest login → claim | ✅ | Token hash + expiry + consumed |
| Auth user own trip read/write | ✅ | Owner check |
| Auth user other trip blocked | ✅ | ForbiddenException |
| SharedTripView read-only | ✅ | Không companion chat |
| Token refresh/retry | ✅ | Có trong auth |
| C3 companion chat owner-check | ⚠️ | Chưa implement — verify khi C3 code |
| C3 apply-patch owner-check | ⚠️ | Chưa implement — verify khi C3 code |
| C4 chat session isolation | ⚠️ | Chưa implement — verify khi C4 code |
| Stale patch reject | ⚠️ | Chưa implement — C3 design cần bổ sung |
| Guest UA bypass | ⚠️ | Known ISSUES/guest_rate_limit_ua_bypass.md |

---

## Recommended next action

Khi implement C3:
1. Companion chat service bắt buộc có owner-check đầu tiên.
2. Apply-patch re-verify ownership + operation validation.
3. Thêm `patch_version` field để reject stale patches (409 Conflict).
4. C4 chat history API phải filter `user_id = current_user` trên mọi query.

---

## B2/B3 Real Evidence (2026-05-28)

| Use case | B2/B3 result | Evidence |
|---|---|---|
| Guest generate → claimToken PRESENT | ✅ CONFIRMED | B2: trip_id=234, claimToken PRESENT |
| Auth generate → claimToken NULL | ✅ CONFIRMED | B2: trip_id=235, claimToken NULL |
| TripWorkspace protected route | ✅ CONFIRMED | B3: `/trip-workspace?tripId=235` cần login, render đúng sau login |
| Auth user own trip workspace render | ✅ CONFIRMED | B3: trip_id=235 renders, 0 network errors |
| Owner-check behavior (non-owner) | ✅ CONFIRMED | B1: `GET /agent/suggest/1` non-owner → 403 `Not trip owner` |
| FloatingAIChat state | NOT_VISIBLE | B3: `FloatingAIChat visible: false` — C3 chưa implement |
| C3 companion chat owner-check | PENDING | Chưa implement — cần verify khi C3 code |
