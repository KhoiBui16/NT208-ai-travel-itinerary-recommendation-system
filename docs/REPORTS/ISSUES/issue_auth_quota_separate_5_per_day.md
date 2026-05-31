# Issue: Auth Quota Separate (5/day)

**Created**: 2026-05-31
**Priority**: P2
**Related**: 00058B (deferred), 00058A audit

---

## Problem

Current AI quota configuration uses **same limit for all actors**:
```python
# config.py
rate_limit_ai_free: int = 3  # Same for guest AND auth users
```

**Product requirement** (from user research):
- **Guest**: 3 lượt/ngày (free tier)
- **Auth user**: 5 lượt/ngày (free tier)

**Current state**:
- ✅ Rate limiter supports per-actor limits (code already ready)
- ❌ Config only has single `rate_limit_ai_free` setting
- ❌ No way to set different quota for auth vs guest

---

## Why This Was Deferred

**Reason**: Requires product decision and config design:
1. Should quota be in config or environment variable?
2. Should we add `rate_limit_ai_auth` setting?
3. Migration path for existing deployments?
4. Priority P0 issues (guest remaining fake, 429 UX) took precedence

**Product decision**: Keep same quota for MVP2, defer separate auth quota to 00058C.

---

## Proposed Solution (00058C)

### Option 1: Separate Config Settings

**Implementation sketch**:
```python
# config.py
rate_limit_ai_guest: int = 3
rate_limit_ai_auth: int = 5

# rate_limiter.py
async def get_quota_for_actor(self, actor: str) -> int:
    if actor.startswith("user:"):
        return self.settings.rate_limit_ai_auth
    elif actor.startswith("guest:"):
        return self.settings.rate_limit_ai_guest
    else:
        return self.settings.rate_limit_ai_free  # Fallback
```

**Pros**:
- Explicit configuration
- Easy to adjust per environment

**Cons**:
- Requires config migration
- Backwards compatibility break if env var exists

### Option 2: Tiered Quota System

**Implementation sketch**:
```python
# config.py
rate_limit_tiers = {
    "guest": 3,
    "free": 5,
    "premium": 50,
}

# rate_limiter.py
async def get_quota_for_user(self, user: User | None) -> int:
    if not user:
        return self.settings.rate_limit_tiers["guest"]
    if user.is_premium:
        return self.settings.rate_limit_tiers["premium"]
    return self.settings.rate_limit_tiers["free"]
```

**Pros**:
- Extensible for future tiers (premium)
- Single source of truth

**Cons**:
- More complex (requires user.tier field)
- Overkill for current requirement

---

## Recommendation

**Implement Separate Config Settings in 00058C**:
- Simple and meets current requirement
- Can extend to tiers later if needed
- Backwards compatible if old env var exists

**Configuration**:
```yaml
# config.yaml
ai_calls_per_day: 3              # Fallback (legacy)
ai_calls_per_day_guest: 3       # Guest quota
ai_calls_per_day_auth: 5        # Auth user quota
```

**Migration**:
```python
# config.py - Support legacy env var
rate_limit_ai_free: int = 3  # Legacy fallback
rate_limit_ai_guest: int | None = None
rate_limit_ai_auth: int | None = None

# rate_limiter.py - Use guest/auth if available, else fallback
def get_effective_quota(self) -> dict[str, int]:
    return {
        "guest": self.settings.rate_limit_ai_guest or self.settings.rate_limit_ai_free,
        "auth": self.settings.rate_limit_ai_auth or self.settings.rate_limit_ai_free,
    }
```

---

## References

- 00058A audit: Identified same quota for guest and auth
- 00058B fix: Rate limiter ready for per-actor quota (just needs config)
