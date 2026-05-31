# Issue: Guest Cookie Fingerprint Hardening

**Created**: 2026-05-31
**Priority**: P1
**Related**: 00058B (deferred), 00058A audit

---

## Problem

Current guest fingerprint uses **IP + User-Agent hash**:
- Method: `SHA256(ip + ua)[:16]`
- Key: `rate:ai:guest:{hash}:{YYYYMMDD}`

**Vulnerabilities**:
1. **UA spoofing**: Attacker can change User-Agent header to bypass
2. **NAT/shared networks**: Multiple users behind same NAT share quota (unfair)
3. **Mobile networks**: IP changes frequently, guests lose quota progress
4. **No persistent identity**: Guests lose quota on network change or browser update

**Current classification**:
- ✅ Stateless (no client storage)
- ⚠️ Weak to UA spoofing
- ❌ No persistence across sessions
- ❌ No protection against NAT/shared office abuse

---

## Why This Was Deferred

**Reason**: Requires security review and larger changes:
1. Need to decide between httpOnly cookie vs localStorage vs hybrid
2. Requires review of SameSite, Secure, httpOnly flags
3. Needs cross-browser testing
4. Priority P0 issues (guest remaining fake, 429 UX) took precedence

**Product decision**: Accept IP+UA limitation for MVP2, defer hardening to 00058C.

---

## Proposed Solution (00058C)

### Option 1: Signed httpOnly Cookie

**Pros**:
- Server-controlled, cannot be spoofed by client
- Survives browser restart (if expiration set)
- Can include anti-abuse metadata (creation time, salt)

**Cons**:
- Requires HTTPS (Secure flag)
- Cannot be read by JavaScript (httpOnly)
- Shared across subdomains only

**Implementation sketch**:
```python
# On first visit, generate and sign cookie
guest_id = HMAC(SERVER_SECRET, salt + random_bytes(16))
cookie = {
    "guest_id": guest_id,
    "created_at": datetime.now(UTC),
    "signature": hmac(guest_id + created_at),
}
set_cookie("guest_id", cookie, httponly=True, secure=True, samesite="Lax")

# On rate limit check
guest_id = request.cookies.get("guest_id")
if not verify_signature(guest_id):
    raise SecurityError("Invalid guest cookie")
key = f"rate:ai:guest:{guest_id}:{date}"
```

### Option 2: localStorage + Server Validation

**Pros**:
- JavaScript can read and send
- Can implement custom logic

**Cons**:
- Client can spoof (requires server validation)
- Privacy modes may block

---

## Security Considerations

**Cookie must be**:
- **httpOnly**: Prevent XSS from reading token
- **Secure**: HTTPS only (prevent MITM)
- **SameSite**: Lax or Strict (prevent CSRF)
- **Signed**: HMAC with server secret (prevent forgery)
- **Rotate**: Periodic rotation (prevent long-term abuse)

**Cookie attributes**:
```
Set-Cookie: guest_id=<value>; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000; Path=/
```

---

## Recommendation

**Implement Signed httpOnly Cookie in 00058C**:
- Most secure against client spoofing
- Survives browser restart
- Industry standard for guest tracking

**Alternative**: If cookie implementation is too large for 00058C, document as MVP2+.

---

## References

- 00058A audit: Identified guest fingerprint as weakness
- 00058B fix: Guest remaining now accurate (but still uses IP+UA)
- OWASP cookie security: https://owasp.org/www-community/controls/SecureCookieAttribute
