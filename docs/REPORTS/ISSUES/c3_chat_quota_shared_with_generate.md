# Issue: Companion Chat Quota Shared with Generate — Will Block UX

**Date**: 2026-05-28
**Branch**: `docs/00050-c-c3-design-readiness-audit`
**Priority**: HIGH
**Status**: RESOLVED (PR #106 / task 00107) — apply-patch có rate limit riêng `rate_limit_ai_apply_patch_user` (namespace `rate:ai:apply_patch:*`) và companion chat dùng namespace `rate:ai:chat:*`, tách hoàn toàn khỏi generate quota.
**Related**: `docs/REPORTS/rate_limit_policy_review.md`, `ISSUES/guest_rate_limit_ua_bypass.md`

## Problem

Current `rate_limit_ai_free` (3 calls/day) được shared giữa:
- `POST /itineraries/generate` (C.1)
- Companion chat chat messages (C.3 — chưa implement)

Nếu user dùng hết 3 lần generate trong ngày:
- **Không còn quota cho companion chat**
- UX: user bị block khi hỏi chatbot

Nếu user regenerated trip 3 lần sau đó để test, companion chat sẽ không hoạt động.

## Evidence

```python
# router.py:51-52
if user:
    await rate_limiter.enforce_ai_limit(user.id)  # Dùng chung key
```

Current rate limiter dùng key `rate:ai:user:{user_id}:{YYYYMMDD}` — không phân biệt generate vs chat.

## Recommended fix

Khi implement C3 companion chat, tách quota:

```python
# Companion chat router (C3)
async def chat(...):
    key = f"rate:ai:chat:user:{user.id}:{YYYYMMDD}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expireat(key, next_midnight_utc())
    LIMIT_CHAT = 50  # Rộng hơn generate
    if count > LIMIT_CHAT:
        raise RateLimitException("Chat quota exceeded for today")
```

**Generate quota: 3/day** (hiện tại đúng)
**Companion chat quota: 20-50/day** (cần tách riêng)

## Does not block C3 implementation

Companion chat có thể implement mà không có quota riêng. Fix quota tách riêng nên là part của C3 implementation.

## No action in this audit branch

This is an audit-only branch. Fix quota tách riêng sẽ trong feature branch C3).