# Issue: AI Generate Idempotency Key

**Created**: 2026-05-31
**Priority**: P1
**Related**: 00058B (deferred), double-click protection

---

## Problem

Current double-click protection is **frontend-only**:
```typescript
// CreateTrip.tsx
if (isGenerating) {
    return;  // Early return
}
setIsGenerating(true);
```

**Limitations**:
1. **No BE idempotency**: Backend has no idempotency key to deduplicate requests
2. **Race condition**: If two requests reach backend simultaneously, both will execute
3. **Cross-tab clicks**: User can click in multiple tabs, each has own `isGenerating` state
4. **No request dedup**: If client retries, backend processes again

**Current classification**:
- ✅ FE double-click protection exists (early return)
- ❌ No BE idempotency key
- ❌ No request deduplication
- ❌ Vulnerable to cross-tab duplicate clicks

---

## Why This Was Deferred

**Reason**: Requires design discussion:
1. Key format: UUID vs random vs hash of input
2. Key scope: Per user vs per session vs global
3. TTL: How long to keep keys (1 hour? 1 day?)
4. Storage: Redis vs memory (multi-instance safety)
5. Product requirement: Do we need strong dedup or is FE protection enough for MVP2?

**Product decision**: Accept FE-only protection for MVP2, defer BE idempotency to 00058C.

---

## Proposed Solution (00058C)

### Option 1: Request Hash Dedup

**Approach**: Hash request parameters + store in Redis

**Implementation sketch**:
```python
# Frontend: Generate idempotency key
const idempotencyKey = crypto.randomUUID();
fetch("/api/v1/itineraries/generate", {
    method: "POST",
    headers: { "X-Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ ... }),
});

# Backend: Check and store key
key = request.headers.get("X-Idempotency-Key")
if not key:
    key = generate_hash(request_body)  # Fallback

redis_key = f"idempotency:generate:{key}"
if await redis.exists(redis_key):
    return JSONResponse(
        {"detail": "Duplicate request", "request_id": key},
        status_code=409,
    )
await redis.setex(redis_key, 300, "1")  # TTL 5 minutes

# Continue with generate...
```

**Pros**:
- Simple to implement
- Can return cached result on duplicate

**Cons**:
- Requires frontend changes (add header)
- TTL decision needed

### Option 2: Input-Based Hash

**Approach**: Hash input parameters automatically

**Implementation sketch**:
```python
# Backend: Auto-hash input
input_hash = sha256(json.dumps(request_body)).hexdigest()
redis_key = f"idempotency:generate:{user_id}:{input_hash}"

if await redis.exists(redis_key):
    # Return cached result if available
    cached = await redis.get(redis_key + ":result")
    if cached:
        return JSONResponse(cached, status_code=200)
    return JSONResponse({"detail": "Already processing"}, status_code=409)

# Store processing status
await redis.setex(redis_key, 300, "processing")

# After generate, store result
await redis.setex(redis_key + ":result", 300, json.dumps(result))
```

**Pros**:
- No frontend changes required
- Automatic deduplication

**Cons**:
- Must handle hash collisions (unlikely but possible)
- Different inputs with same hash could conflict (very low probability)

---

## Recommendation

**Implement Request Hash Dedup in 00058C**:
- More explicit (client can see duplicate response)
- Can return cached result
- Industry standard (Stripe API uses similar approach)

**Configuration**:
```yaml
ai_generate_idempotency_ttl: 300  # 5 minutes
ai_generate_cache_result: true       # Cache successful result
```

---

## References

- 00058B fix: FE double-click protection exists (early return)
- 00058A audit: Identified lack of BE idempotency
- Stripe idempotency: https://stripe.com/docs/api/idempotent_requests
