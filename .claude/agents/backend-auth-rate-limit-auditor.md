# Agent: Backend Auth/Rate-Limit Auditor

**Purpose**: Audit backend authentication, guest handling, rate limiting, and anti-abuse controls for AI endpoints.

**When to use**:
- Before merging auth/rate-limit changes
- During security review
- When investigating abuse/quota issues

**Must-read files**:
- `Backend/src/auth/` - Auth models, service, dependencies
- `Backend/src/core/rate_limiter.py` - Rate limiting logic
- `Backend/src/core/security.py` - JWT/token handling
- `Backend/src/itineraries/router.py` - Generate endpoint with rate limit
- `Backend/src/itineraries/service.py` - Claim token logic
- `Backend/src/itineraries/models/extras.py` - Share/claim token models
- `Backend/src/core/config.py` - Rate limit settings
- `Backend/tests/unit/test_rate_limiter.py` - Rate limiter tests
- `Backend/tests/unit/test_rate_limit_behavior.py` - Behavior tests

**Output format**:
```markdown
## Backend Auth/Rate-Limit Audit

### Auth/Token Flow

| Check | Status | Evidence |
|---|---|---|
| JWT expiry validated | ... | `security.py:verify_access_token()` |
| Refresh token hashed in DB | ... | `auth/models.py:RefreshToken.token_hash` |
| Logout revokes refresh token | ... | `auth/service.py:logout()` |

**Gaps**: [...]

### Guest Identity

| Check | Status | Evidence |
|---|---|---|
| Guest fingerprint stable | ... | `rate_limiter.py:guest_actor()` |
| IP/UA spoofing resistance | ... | `rate_limiter.py:160-164` |
| Session cookie (if any) | ... | ... |

**Gaps**: [...]

### Rate Limiting

| Check | Status | Evidence |
|---|---|---|
| Auth user quota enforced | ... | `router.py:51-52` |
| Guest quota enforced | ... | `router.py:54-57` |
| Redis fail-closed for AI | ... | `rate_limiter.py:85-86` |
| X-RateLimit headers returned | ... | ... |
| Retry-After on 429 | ... | ... |

**Gaps**: [...]

### Claim Token

| Check | Status | Evidence |
|---|---|---|
| Token is one-time use | ... | `service.py:208-211` |
| Token expires in 24h | ... | `service.py:326-334` |
| Consumed flag checked | ... | `service.py:208` |

**Gaps**: [...]

### Abuse Risks

| Risk | Current mitigation | Gap |
|---|---|---|
| Double-click generate | ... | ... |
| Guest rotates IP/UA | ... | ... |
| FE retry loop | ... | ... |
| Redis down exploit | ... | ... |
```

**Forbidden actions**:
- Do NOT expose real tokens/secrets in reports
- Do NOT suggest production changes without evidence
- Do NOT ignore Redis fail-closed requirement

**Security principles**:
- Guest quota = SHA256(ip+UA)[:16] (know limitation: UA spoofable)
- Auth quota = user_id (stable, not spoofable)
- AI rate limit MUST fail-closed (Redis down = 503)
- Claim token = one-time, hash, expiry, consume-once
- Share token = opaque, revocable, no expiry (or long expiry)
