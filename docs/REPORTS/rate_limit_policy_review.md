# Rate Limit Policy Review — Phase C3/C4 Readiness — 2026-05-28

## Audit Result

**Auth user: PARTIALLY READY** — có quota nhưng shared giữa generate và companion chat (C3 chưa implement).
**Guest: PARTIALLY READY** — có quota nhưng có thể bypass qua IP/UA thay đổi.
**Redis fail-closed: READY** ✅

---

## 1. Auth user rate limit

### Generate

**✅ PASS**

```python
# router.py:51-52
if user:
    await rate_limiter.enforce_ai_limit(user.id)
```

Dùng `rate:ai:user:{user_id}:{YYYYMMDD}`, giới hạn mặc định 3 calls/ngày.

### Companion chat (C3) — chưa implement

**⚠️ CHƯA CÓ** — `agent_router.py` chỉ có `GET /suggest/{activity_id}` (DB-only, có owner check).

Khi implement C3 companion chat:
- Current quota shared: `rate_limit_ai_free` (3/day) dùng chung cho generate và chat.
- Nếu user dùng hết 3 lần generate, không còn quota chat.
- **Issue**: UX companion chat sẽ bị ảnh hưởng nếu share quota cứng.

**Recommend**: Khi C3 implement, companion chat nên có quota riêng:

```python
# Companion chat router (C3)
key = f"rate:ai:chat:user:{user_id}:{YYYYMMDD}"
limit = 20-50/day cho UX tốt hơn
```

### Apply-patch

**⚠️ CHƯA CÓ rate limit riêng cho apply-patch** (endpoint đã có trên current source, nhưng limiter riêng vẫn chưa được thêm).

Apply-patch không tốn LLM nhưng nên có rate limit nhẹ chống spam.

---

## 2. Guest rate limit

### Current implementation

**✅ PASS** — dùng SHA256(ip+UA)[:16]:

```python
# rate_limiter.py:159-164
@staticmethod
def guest_actor(ip: str | None, user_agent: str | None) -> str:
    fingerprint = f"{ip or 'unknown'}|{user_agent or 'unknown'}"
    digest = sha256(fingerprint.encode("utf-8")).hexdigest()[:16]
    return f"guest:{digest}"
```

### Known gap — UA bypass

**⚠️ KNOWN ISSUE** (đã có report `ISSUES/guest_rate_limit_ua_bypass.md`)

Guest có thể bypass bằng cách thay đổi User-Agent giữa requests. Hash dùng `ip + UA`, nhưng:

- UA dễ thay đổi trong browser DevTools
- IP có thể thay đổi (mobile, VPN)
- Không có session cookie/device fingerprint

**Current status**: Không có fix trong code hiện tại. Đã ghi trong `ISSUES/guest_rate_limit_ua_bypass.md` (TO DO).

**Recommend**: Thêm session cookie hoặc device fingerprint cho guest, nhưng không block C3/C4.

---

## 3. Redis fail-closed

**✅ READY**

```python
# rate_limiter.py:85-86
if self.settings.ai_rate_limit_fail_mode == "closed":
    raise ServiceUnavailableException("AI rate limiter unavailable")
```

Fail-closed cho AI rate limit. Public places cache có thể fail-open riêng.

---

## 4. Goong API quota

**⚠️ CHƯA CÓ explicit rate limit** cho Goong AutoComplete/Detail/Directions.

ETL đang chạy 15 calls/city (5 categories × 3 keywords). Nếu C3/C4 cần re-query Goong cho context, cần:

- Cache Goong response với TTL
- Quota per city per day
- Retry với exponential backoff

---

## Gap Summary

| Area | Status | Ghi chú |
|---|---|---|
| Auth user generate quota | ✅ | 3/day |
| Auth user companion chat quota | ⚠️ | Share với generate — cần quota riêng |
| Guest generate quota | ✅ | SHA256(ip+UA)[:16] |
| Guest bypass UA | ⚠️ | Known issue — ghi trong ISSUES |
| Redis fail-closed | ✅ | AI quota fail-closed |
| Apply-patch rate limit | ⚠️ | Chưa có (C3 chưa implement) |
| Goong API quota/cache | ⚠️ | Chưa có explicit limit |

---

## Recommended next action

1. Khi implement C3 companion chat: tách quota riêng cho chat (20-50/day) khỏi generate (3/day).
2. Implement apply-patch rate limit: `rate:patch:user:{user_id}:{minute}`, 30/min.
3. Fix guest UA bypass khi có priority cao hơn (hiện ghi trong ISSUES).

---

## B2 Real Evidence (2026-05-28)

| Test | Result | Evidence |
|---|---|---|
| Guest 3/day limit | WORKING | B2: Sau 3 generate calls → 429 `Bạn đã dùng hết 3 lượt...` |
| Auth user 3/day limit | WORKING | B2: Sau 3 generate calls → 429 với message tiếng Việt rõ |
| FE 429 visibility | FAIL | B3: UI hiển thị generic "Không thể tạo lịch trình" thay vì rate limit message |
| Redis rate limit keys | WORKING | B2: `rate:ai:user:{id}:{YYYYMMDD}` và `rate:ai:guest:{hash}:{YYYYMMDD}` |

**Key finding**: Rate limit hoạt động đúng về mặt kỹ thuật. Vấn đề là FE không phân biệt 429 với các lỗi khác.

## Testing Impact

- Guest 3/day quá thấp cho manual testing — phải tạo user mới sau mỗi 3 lần test
- Auth user 3/day cũng quá thấp — B2 phải tạo 3 test users khác nhau
- Cần test/dev reset utility hoặc higher quota cho test accounts
- Xem issue: `issue_rate_limit_testing_and_ux.md`
