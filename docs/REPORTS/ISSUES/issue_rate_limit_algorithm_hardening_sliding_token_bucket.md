# Issue: Rate Limit Algorithm Hardening - Sliding Window / Token Bucket

**Created**: 2026-05-31
**Priority**: P2
**Related**: 00058B (fixed guest remaining), 00058C (deferred)

---

## Problem

Current rate limiting implementation uses **fixed daily window**:
- Counter resets at midnight UTC
- Redis key: `rate:ai:user:{user_id}:{YYYYMMDD}`
- Possible burst at boundary: user can make 3 calls at 23:59 and 3 more at 00:01

**Risk**: Users can exploit the boundary to get 6 calls instead of 3 in a 2-minute window.

**Current algorithm classification**:
- ✅ Redis central counter (shared across instances)
- ✅ Fixed daily window with midnight reset
- ❌ No sliding window
- ❌ No token bucket

---

## Why This Was Deferred

**Reason**: Fixed window is acceptable for MVP2 because:
1. Main risk is API cost per day, not high-throughput public API traffic
2. Daily quota is small (3 calls), so burst at boundary is limited
3. Priority P0 issues (guest remaining fake, 429 UX) took precedence
4. Sliding window/token bucket requires design discussion

**Product decision**: Accept fixed window limitation for MVP2, defer hardening to 00058C.

---

## Proposed Solution (00058C)

### Option 1: Sliding Window Log

**Pros**:
- Accurate rate limiting within time window
- No burst at boundaries

**Cons**:
- Requires O(N) memory where N = window size
- More complex Redis operations

**Implementation sketch**:
```python
# Key: rate:ai:user:{user_id}
# Store sorted set of timestamps
# On request: ZADD current timestamp, ZREMRANGEBYSCORE to remove old entries
# Count: ZCARD
```

### Option 2: Token Bucket

**Pros**:
- Better for burst tolerance
- Can rate-limit long-term average while allowing short bursts
- Industry standard for API rate limiting

**Cons**:
- More complex configuration (rate, bucket size)
- Requires refresher job to add tokens

**Implementation sketch**:
```python
# Key: rate:ai:user:{user_id}
# Store tokens count, last refill time
# On request: Check tokens >= 1, decrement, save
# Refresher: Add tokens at fixed rate
```

---

## Recommendation

**Implement Token Bucket in 00058C**:
- More flexible for product requirements (burst tolerance)
- Industry standard
- Can configure different rates for auth vs guest

**Configuration**:
```yaml
ai_rate_limit_algorithm: token_bucket  # or "fixed_window", "sliding_window"
ai_rate_limit_tokens: 3               # Initial bucket size
ai_rate_limit_refill_rate: 3          # Tokens per day
ai_rate_limit_burst: 1                # Allow 1 burst within hour
```

---

## References

- 00058B fix: Guest remaining headers now accurate
- 00058A audit: Identified rate limit as P0 issue
- Rate limiting best practices: https://cloud.google.com/architecture/rate-limiting-strategies-techniques
