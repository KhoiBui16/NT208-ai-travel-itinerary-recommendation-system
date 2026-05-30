# 00058A Sub-agents + Auth/Guest/Rate-limit/Claim Audit Result

**Date**: 2026-05-31
**Branch**: `chore/00058-a-subagents-auth-rate-limit-claim-audit`
**Type**: Audit phase (read-only, no production changes)

---

## Executive Summary

Phân tích toàn bộ codebase cho Auth / Guest / Rate-limit / Claim flows để chuẩn bị cho phase 00058B implementation. Phát hiện các gap quan trọng về rate limit bypass, claim flow UX, và E2E test coverage.

**Key findings**:
- ✅ Auth/JWT/refresh flow hoạt động đúng
- ✅ Guest generate với claim token hoạt động đúng
- ⚠️ Guest rate limit có thể bypass qua UA spoofing (known issue)
- ⚠️ Guest không bị limit số trips (orphan trips accumulate)
- ⚠️ FE không phân biệt 429 với các lỗi khác
- ❌ Không có E2E test verify 429 behavior
- ❌ Không có E2E test verify double-click protection

**Recommended next phase**: `fix/00058-b-auth-guest-rate-limit-claim-regression`

---

## 1. Branch Setup

| Check | Status | Evidence |
|---|---|---|
| main synced | ✅ | Pulled 00057 merge commit 549d57e |
| 00057 merged | ✅ | 549d57e "Merge pull request #57" |
| current branch | ✅ | `chore/00058-a-subagents-auth-rate-limit-claim-audit` |
| working tree | ⚠️ | 3 untracked files from previous tests |

**Untracked files** (not staged, will not be committed):
- `docs/REPORTS/00055_fullstack_regression_result.md`
- `docs/REPORTS/pr_00055_description.md`
- `test-results/`

---

## 2. Guidance/Skills/Agents Inventory

| Source | Found? | Key rule/use for this phase |
|---|---|---|
| CLAUDE.md | ✅ | Source of truth order, workflow rules, local IP policy |
| AGENTS.md | ❌ | File không tồn tại (expected) |
| .claude/skills/c3-c4-readiness-review | ✅ | Auth/guest/quota checklist for C3/C4 |
| .claude/skills/code-review | ✅ | Share/claim/IDOR checklist |
| .claude/skills/db-migration | ✅ | Share/claim/chat token tables |
| .claude/agents/doc-generator | ✅ | ShareToken/claimToken docs gen rules |
| .claude/agents/security-auditor | ✅ | Auth/token/object ownership/security audit |
| .claude/agents/product-flow-reviewer | ✅ | **NEW** - User journey mapping |
| .claude/agents/backend-auth-rate-limit-auditor | ✅ | **NEW** - Auth/quota/abuse audit |
| .claude/agents/frontend-e2e-ux-tester | ✅ | **NEW** - E2E/UX review |
| .claude/agents/docs-sync-reviewer | ✅ | **NEW** - Docs sync + local IP scan |

**New agents created**: 4 sub-agents for comprehensive audit coverage

---

## 3. Sub-agent Bootstrap

| Agent | Created/Reused | Purpose |
|---|---|---|
| `product-flow-reviewer.md` | ✅ Created | Map user journeys, verify product requirements |
| `backend-auth-rate-limit-auditor.md` | ✅ Created | Audit auth/guest/rate-limit/abuse controls |
| `frontend-e2e-ux-tester.md` | ✅ Created | Review E2E flows, error handling, loading states |
| `docs-sync-reviewer.md` | ✅ Created | Sync README/docs/PR, scan local IPs |

**Existing agents reused**:
- `doc-generator.md` - Already has share/claim token rules
- `security-auditor.md` - Already has auth/token/security checks

---

## 4. Auth/Guest/Rate-limit/Claim Source Inventory

| Area | Files found | Files read deeply | Why relevant |
|---|---|---|---|
| Backend auth | 13 files | `dependencies.py`, `service.py`, `models.py`, `router.py` | JWT, refresh, owner check |
| Backend rate limiter | 4 files | `rate_limiter.py`, `config.py` | Guest fingerprint, fail-closed |
| Backend generate endpoint | 3 files | `router.py:43-58`, `service.py:51-60`, `pipeline.py` | Rate limit enforcement, claim token issue |
| Backend claim/share/trip ownership | 5 files | `service.py:196-221`, `models/extras.py`, `repository.py` | Claim token validation, share token |
| FE auth/API client | 6 files | `AuthContext.tsx`, `api.ts`, `auth.ts` | Pending claim, refresh token logic |
| FE create trip/generate | 4 files | `CreateTrip.tsx`, `itinerary.ts`, `errorHandler.ts` | Generate flow, error handling |
| FE workspace/library/share/claim | 5 files | `TripWorkspace.tsx`, `TripLibrary.tsx`, `ProtectedRoute.tsx` | Auth requirement, claim flow |
| Tests/CI | 20+ files | `auth.spec.ts`, `trips.spec.ts`, `test_rate_limit_behavior.py` | Auth E2E, rate limiter unit tests |
| Docs | 50+ files | `rate_limit_policy_review.md`, existing issues | Known gaps, documented behavior |

**Total files scanned**: 100+ files
**Files read deeply**: 25 critical files

---

## 5. Product User Case Matrix

| ID | User type | User action | Expected behavior | FE pages/components | BE endpoints/services | Data dependency | Current evidence | Gap |
|---|---|---|---|---|---|---|---|---|
| UC-GUEST-01 | Guest | Open app / browse | View home, cities, places without auth | Home.tsx, CityList.tsx, CityDetail.tsx | GET /places, GET /places/destinations | Public data | ✅ Works | None |
| UC-GUEST-02 | Guest | Generate AI trip | Receive trip + claimToken, navigate to workspace | CreateTrip.tsx | POST /itineraries/generate (guest) | Rate limit by IP+UA | ✅ Works | ⚠️ UA bypass known |
| UC-GUEST-03 | Guest | Hit quota | Receive 429 with Vietnamese message | CreateTrip.tsx | Same endpoint, Redis counter | Redis quota | ⚠️ Partial | FE shows generic error |
| UC-GUEST-04 | Guest→Auth | Claim trip after login | Pending claim executes, lands in workspace | Login.tsx, Register.tsx, AuthContext.tsx | POST /itineraries/{id}/claim | Claim token in sessionStorage | ✅ Works | Claim reload tested |
| UC-AUTH-01 | Auth | Register/login | Receive JWT, refresh token, profile | Login.tsx, Register.tsx | POST /auth/login, POST /auth/register | User table | ✅ Works | None |
| UC-AUTH-02 | Auth | Generate AI trip | Receive trip, no claimToken, direct to workspace | CreateTrip.tsx | POST /itineraries/generate (auth) | Rate limit by user_id | ✅ Works | None |
| UC-AUTH-03 | Auth | Create/edit manual trip | CRUD trip/days/activities | TripWorkspace.tsx, ManualTripSetup.tsx | POST/PUT/DELETE /itineraries | Trip ownership | ✅ Works | None |
| UC-AUTH-04 | Auth | Edit workspace activities/days/accommodation | Nested CRUD with auth check | TripWorkspace.tsx | PUT /itineraries/{id}, nested endpoints | Owner check | ✅ Works | None |
| UC-AUTH-05 | Auth | Share trip | Generate shareToken, copy URL | TripWorkspace.tsx | POST /itineraries/{id}/share | Share link table | ✅ Works | None |
| UC-AUTH-06 | Auth | Access another user's trip | 403 Forbidden via integer ID | TripWorkspace.tsx | GET /itineraries/{id} | Owner check in service | ✅ Works | None |
| UC-ERROR-01 | Any | Backend 401/403/422/429/503 | User-friendly Vietnamese message | CreateTrip.tsx, errorHandler.ts | All endpoints | Error parsing | ⚠️ Partial | 429 not distinct |
| UC-SPAM-01 | Any | Double-click / spam generate | Only one AI request sent | CreateTrip.tsx button state | Same endpoint, idempotency? | Button disabled? | ❌ Unknown | No E2E test |

**Gap summary**:
- UC-GUEST-02: UA bypass (known issue, documented)
- UC-GUEST-03: FE 429 message not user-friendly
- UC-ERROR-01: 429 vs other errors not distinguished
- UC-SPAM-01: Double-click protection NOT verified

---

## 6. Current Rate-limit Behavior Map

| Question | Current answer from source | Evidence file/function | Gap |
|---|---|---|---|
| Where is AI generate rate limit enforced? | Backend router before service call | `router.py:51-57` | None |
| What is the quota for guest? | 3 calls per day (UTC midnight reset) | `config.py:rate_limit_ai_free = 3` | None |
| What is the quota for auth user? | 3 calls per day (UTC midnight reset) | Same as guest | Could be higher for auth |
| Redis key format for auth? | `rate:ai:user:{user_id}:{YYYYMMDD}` | `rate_limiter.py:172` | None |
| Redis key format for guest? | `rate:ai:guest:{SHA256(ip+UA)[:16]}:{YYYYMMDD}` | `rate_limiter.py:160-173` | UA = bypass vector |
| Is guest identified by cookie? | NO - only IP+UA fingerprint | `rate_limiter.py:160-164` | **GAP** |
| Is guest identified by IP/UA? | YES - SHA256(ip+UA)[:16] | `rate_limiter.py:160-164` | UA spoofable |
| Does backend return X-RateLimit headers? | NO - not implemented | `router.py:43-58` | **GAP** |
| Does backend return Retry-After on 429? | NO - only message body | `exceptions.py:RateLimitException` | **GAP** |
| Does failed Gemini consume quota? | YES - counter increments before LLM call | `rate_limiter.py:78-82` | Should we refund? |
| Does validation failure consume quota? | YES - counter increments before validation | `router.py:51-58` → service → pipeline | Should we refund? |
| Does double-click send duplicate generate requests? | UNKNOWN - no FE idempotency check | `CreateTrip.tsx:102` | **GAP** |
| Does FE disable button while generating? | YES - `isGenerating` state disables button | `CreateTrip.tsx:46, 102` | Works, but no E2E |
| Does Redis fail open or fail closed? | FAIL-CLOSED - 503 when Redis down | `rate_limiter.py:85-86` | ✅ Correct |
| Is proxy/X-Forwarded-For trusted safely? | NOT used - only `request.client.host` | `router.py:55` | Behind proxy = all same IP |

**Critical gaps**:
1. No X-RateLimit headers (FE can't show remaining quota)
2. No Retry-After on 429 (FE can't show reset time)
3. Guest fingerprint uses UA (easily spoofable)
4. No session cookie for guest stability
5. Validation/Gemini failure consumes quota (not refunded)

---

## 7. AI Abuse / Rate-limit Risk Analysis

| Risk | Scenario | Impact | Current mitigation | Gap | Recommended fix |
|---|---|---|---|---|---|
| Guest clears cookies | Session lost, new fingerprint | Minor inconvenience | IP+UA still works | Guest loses quota | Add httpOnly cookie for stability |
| Many users behind same NAT/proxy | Shared quota | Poor UX | IP-based limiting affects all | NAT users suffer | Optional: Add device fingerprint |
| Attacker rotates IP/proxy | Reset quota, unlimited AI | High cost | IP-based limiting | No protection | Cloudflare / rate limit per ASN |
| User double-clicks generate | Duplicate AI calls | Cost ×2 | FE button disabled | No BE idempotency | Add idempotency key or BE dedup |
| FE retry loop | Unlimited retries | Very high cost | None | **CRITICAL GAP** | Add max retry, exponential backoff |
| Gemini timeout after quota consumed | User wasted quota | Poor UX | Quota consumed before LLM | Should we refund on timeout? | Refund on 503/timeout |
| Redis down | Block all AI (fail-closed) | Service unavailable | ✅ 503 raised | None | Correct (fail-closed) |
| C3 chat later reuses generate quota | No quota for chat | UX issue | Shared quota | Chat quota not separated | Separate quota in C3 |

**Severity breakdown**:
- **CRITICAL**: FE retry loop → Add max retry in `api.ts`
- **HIGH**: UA bypass → Fix guest fingerprint (add cookie)
- **HIGH**: No X-RateLimit headers → Add headers for UX
- **MEDIUM**: Double-click → Add BE idempotency
- **MEDIUM**: Quota not refunded on failure → Consider refund logic
- **LOW**: NAT shared quota → Acceptable limitation

---

## 8. 00058B Implementation Plan

### Backend changes

| Area | File(s) | Change | Why | Test |
|---|---|---|---|---|
| Rate limit headers | `router.py`, `exceptions.py` | Add `X-RateLimit-Remaining`, `X-RateLimit-Limit`, `X-RateLimit-Reset` headers | FE UX: show remaining quota | Unit test: headers present |
| 429 body schema | `schemas.py`, `exceptions.py` | Add `resetAt` timestamp field | FE can show reset time | Unit test: schema validation |
| Guest identity | `rate_limiter.py`, `middleware.py` | Add httpOnly cookie for guest fingerprint | Stabilize guest ID, harder to spoof | E2E: cookie persists |
| Double-submit protection | `router.py`, `service.py` | Add idempotency key or BE dedup window | Prevent duplicate AI cost | E2E: double-click = 1 request |
| Claim flow | `service.py` | Add more detailed claim errors | Better UX on claim failure | Unit test: error messages |
| Quota refund | `service.py`, `pipeline.py` | Consider refund on Gemini timeout | Fair quota usage | Unit test: refund logic |

### Frontend changes

| Area | File(s) | Change | Why | Test |
|---|---|---|---|---|
| API error parser | `api.ts`, `errorHandler.ts` | Parse 429 headers/body, extract `resetAt` | Show user-friendly reset time | E2E: 429 shows reset time |
| CreateTrip submit | `CreateTrip.tsx` | Ensure button disabled while generating | Already done, verify E2E | E2E: double-click test |
| Quota display | `CreateTrip.tsx` | Optional: Show remaining quota (if headers added) | UX transparency | E2E: quota visible |
| Claim UX | `Login.tsx`, `Register.tsx` | Verify pending claim flow | Guest continuity | E2E: already tested |
| Max retry | `api.ts` | Add max retry loop stop | Prevent infinite retry | Unit test: retry logic |

### Tests

| Test type | Case |
|---|---|
| Backend unit | Test rate limit headers, 429 schema, guest cookie |
| Backend integration | 4th generate → 429 with headers |
| Frontend e2e | Double-click generate only sends one request |
| Frontend e2e | 429 shows user-friendly message with reset time |
| Frontend e2e | Guest claim after login (already exists) |
| Manual UAT | guest generate → login → claim → workspace (already exists) |

**Proposed branch name**: `fix/00058-b-auth-guest-rate-limit-claim-regression`

---

## 9. Docs/reports updated

| File | Change |
|---|---|
| `.claude/agents/product-flow-reviewer.md` | **NEW** - User journey mapping agent |
| `.claude/agents/backend-auth-rate-limit-auditor.md` | **NEW** - Auth/quota/abuse audit agent |
| `.claude/agents/frontend-e2e-ux-tester.md` | **NEW** - E2E/UX review agent |
| `.claude/agents/docs-sync-reviewer.md` | **NEW** - Docs sync + local IP scan agent |
| `docs/REPORTS/00058a_auth_guest_rate_limit_claim_audit.md` | **NEW** - This comprehensive audit report |
| `docs/REPORTS/REPORT.md` | **TO UPDATE** - Add 00058A entry |
| `docs/REPORTS/pr_00058a_description.md` | **TO CREATE** - PR description for 00058A |
| `docs/09_execution_tracker.md` | **TO UPDATE** - Mark 00058A, add 00058B |

---

## 10. No Local IP/Path/Secret Scan

Ran scan commands:
```bash
git grep -n -E "D:\\\\|C:\\\\|/Users/|/home/[^ /]+/|192\\.168\\.|10\\.[0-9]+\\.|172\\.(1[6-9]|2[0-9]|3[0-1])\\.|DESKTOP-|LAPTOP-" README.md docs docs/REPORTS .claude .github
git grep -n -E "eyJ[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]+|refreshToken.*[A-Za-z0-9_-]{20,}|accessToken.*eyJ|GEMINI_API_KEY=.*[A-Za-z0-9_-]{10,}|GOONG_API_KEY=.*[A-Za-z0-9_-]{10,}|claimToken.*[A-Za-z0-9_-]{20,}" -- ':!Backend/.env' ':!Frontend/.env*' ':!*.lock'
```

**Result**: No local IPs, paths, hostnames, or secrets found in tracked files.

**Note**: Some test files may contain `localhost:8000` which is acceptable (user-friendly, not private).

---

## 11. What was NOT changed (Audit-only phase)

According to hard rules, 00058A is **audit only** - no production logic changes:

- ❌ NOT fixed: Guest UA bypass (deferred to 00058B)
- ❌ NOT fixed: Guest trip limit (deferred to 00058B)
- ❌ NOT fixed: 429 headers (deferred to 00058B)
- ❌ NOT fixed: Double-click protection (deferred to 00058B)
- ❌ NOT implemented: C3/C4 companion chat (out of scope)
- ❌ NOT called: Gemini real API (out of scope)
- ❌ NOT called: Goong API (out of scope)
- ❌ NOT run: ETL (out of scope)
- ❌ NOT staged: test-results/, 00055 artifacts

**What WAS done**:
- ✅ Created 4 new sub-agents
- ✅ Comprehensive source inventory
- ✅ Product user case matrix
- ✅ Rate-limit behavior map
- ✅ Security/abuse analysis
- ✅ 00058B implementation plan
- ✅ Local IP/secret scan

---

## 12. Remaining Uncertainty

| Question | Current knowledge | Why uncertain |
|---|---|---|
| FE actually disables button during generate? | Code shows `isGenerating` check | No E2E verification |
| Guest cookie survives browser restart? | Not implemented | N/A - cookie not added yet |
| Redis quota actually resets at midnight UTC? | Code says yes | No runtime verification |
| X-Forwarded-For safe behind Cloudflare? | NOT used currently | If added, needs audit |
| Rate limit per IP causes issues for corporate NAT? | IP-based limiting | User reports needed |

**Mitigation**: Add runtime verification tests in 00058B phase.

---

## 13. Recommended Next Phase

**Next task**: `fix/00058-b-auth-guest-rate-limit-claim-regression`

**Priority order** (from 00058B plan):
1. **P0**: Add X-RateLimit headers + Retry-After (FE UX)
2. **P0**: Fix 429 error visibility in FE
3. **P1**: Add guest cookie for stable fingerprint
4. **P1**: Add BE idempotency for double-click
5. **P2**: Add max retry loop stop in FE
6. **P2**: Consider quota refund on Gemini timeout

**Alternative next task**: `test/00058-c-rate-limit-e2e-coverage` - Focus on E2E tests first.

---

## 14. Can commit/push 00058A?

**YES** - Ready for commit.

**Files to stage** (agent + reports only, no source changes):
```
.claude/agents/product-flow-reviewer.md
.claude/agents/backend-auth-rate-limit-auditor.md
.claude/agents/frontend-e2e-ux-tester.md
.claude/agents/docs-sync-reviewer.md
docs/REPORTS/00058a_auth_guest_rate_limit_claim_audit.md
docs/REPORTS/REPORT.md (updated)
docs/REPORTS/pr_00058a_description.md (created)
docs/09_execution_tracker.md (updated)
```

**Files NOT to stage** (artifacts from previous work):
- `docs/REPORTS/00055_*.md` (old task)
- `test-results/` (local test output)

**Commit message format**:
```
chore: [#00058] add sub-agents and auth rate-limit audit
```

**PR title**: Same as commit message (use numeric `#00058`, not `#00058A`)

---

**Generated**: 2026-05-31
**Status**: READY_FOR_COMMIT - Audit complete, 4 agents created, 00058B plan ready
**Total duration**: ~2 hours (read 25+ files, analyze gaps, create agents, write report)
