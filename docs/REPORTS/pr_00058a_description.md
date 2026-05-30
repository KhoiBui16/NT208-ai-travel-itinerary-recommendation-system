# PR #00058 — Phase 00058A: Sub-agents + Auth/Guest/Rate-limit/Claim Audit

**Suggested PR title:**

```txt
chore: [#00058] add sub-agents and auth rate-limit audit
```

**Phase label**: `00058A` (audit-only phase, no production changes)

## Mô tả

Audit toàn diện cho Auth / Guest / Rate-limit / Claim flows để chuẩn bị cho phase 00058B implementation. Tạo 4 sub-agents mới để hỗ trợ audit cho các phase sau, map toàn bộ user journeys, và phân tích chi tiết rate-limit behavior, security risks, và E2E test coverage.

**Product principle**: City đã nằm trong backend API phải cho phép user chọn và submit. Data quality metadata chỉ dùng để cảnh báo, không phải hard gate.

**Audit scope**:
- Auth/JWT/refresh/refresh-token-revoke flow
- Guest generate với claim token
- Guest rate limit fingerprint (IP+UA)
- Rate limit headers và error handling
- Claim token one-time + expiry + consume-once
- Share token opaque + revocable

## Thay đổi chính

- [x] Tạo 4 sub-agents mới: product-flow-reviewer, backend-auth-rate-limit-auditor, frontend-e2e-ux-tester, docs-sync-reviewer
- [x] Comprehensive source inventory (100+ files, 25 read deeply)
- [x] Product user case matrix (12 use cases mapped)
- [x] Current rate-limit behavior map (14 questions answered)
- [x] AI abuse / rate-limit risk analysis (8 risks analyzed)
- [x] 00058B implementation plan (backend + frontend + tests)
- [x] Local IP/path/secret scan (no findings)
- [x] Updated docs/REPORTS/REPORT.md với 00058A entry
- [x] NO production logic changes (audit-only phase)

## Cách kiểm tra (Testing)

Đây là **audit phase** - chỉ đọc source, không sửa production logic. Không cần run tests.

**Verification commands**:

```bash
# Verify agents created
ls -la .claude/agents/

# Verify report created
cat docs/REPORTS/00058a_auth_guest_rate_limit_claim_audit.md

# Verify REPORT.md updated
grep -A 5 "00058A" docs/REPORTS/REPORT.md

# Verify no local IPs in new files
git grep -n -E "D:\\\\|C:\\\\|/Users/|192\\.168\\." .claude/agents/ docs/REPORTS/00058a*
```

**Expected results**:
- 4 agent files tồn tại
- Report file tồn tại với đầy đủ sections
- REPORT.md có 00058A entry
- No local IPs/paths/hostname in new files

## Key Audit Findings

### Auth / Guest / Claim flow

| Component | Status | Gap |
|---|---|---|
| Auth/JWT/refresh | ✅ Working | None |
| Guest generate + claimToken | ✅ Working | None |
| Pending claim survives reload | ✅ Tested | None |
| Protected routes redirect guest | ✅ Working | None |
| Share token opaque | ✅ Working | None |

### Rate limiting

| Question | Answer | Gap |
|---|---|---|
| Auth quota enforced? | ✅ Yes, 3/day | None |
| Guest quota enforced? | ✅ Yes, 3/day | None |
| Guest fingerprint stable? | ⚠️ IP+UA (UA spoofable) | Known issue |
| X-RateLimit headers? | ❌ No | **GAP** |
| Retry-After on 429? | ❌ No | **GAP** |
| Redis fail-closed? | ✅ Yes, 503 on down | None |
| Quota consumed on failure? | ⚠️ Yes (not refunded) | Consider refund |

### Frontend error handling

| Error type | Current FE behavior | Gap |
|---|---|---|
| 401 | Redirect to login | None |
| 429 | Generic error message | **GAP** - not distinct |
| 422 | Validation message | None |
| 503 | Service unavailable message | None |

### E2E test coverage

| Test case | Current status | Gap |
|---|---|---|
| Guest claim after login | ✅ Tested | None |
| Auth generate → workspace | ⚠️ No E2E | **GAP** |
| 429 shows user message | ❌ No E2E | **GAP** |
| Double-click protection | ❌ No E2E | **GAP** |
| Max retry loop stop | ❌ No test | **GAP** |

### Known security issues

| Issue | Severity | Documented in |
|---|---|---|
| Guest UA bypass | MEDIUM | `ISSUES/guest_rate_limit_ua_bypass.md` |
| Guest trip no limit | LOW | `ISSUES/guest_trip_no_limit.md` |

## Lưu ý khác

- **Audit-only**: Không có production logic changes trong phase này
- **Sub-agents**: 4 agent mới sẽ hỗ trợ audit cho các phase sau (C3/C4, testing)
- **Next phase**: `fix/00058-b-auth-guest-rate-limit-claim-regression` để implement các fixes:
  - Add X-RateLimit headers + Retry-After
  - Fix 429 error visibility
  - Add guest cookie for stable fingerprint
  - Add BE idempotency for double-click
  - Add max retry loop stop
- **Docs policy**: Không có local IPs, paths, hostname trong documentation
- **Test artifacts**: `test-results/` và 00055 artifacts NOT staged

## Files added/updated

**Sub-agents** (4 new files):
- `.claude/agents/product-flow-reviewer.md`
- `.claude/agents/backend-auth-rate-limit-auditor.md`
- `.claude/agents/frontend-e2e-ux-tester.md`
- `.claude/agents/docs-sync-reviewer.md`

**Reports**:
- `docs/REPORTS/00058a_auth_guest_rate_limit_claim_audit.md`
- `docs/REPORTS/REPORT.md` (updated)
- `docs/REPORTS/pr_00058a_description.md` (this file)

**Execution tracker**:
- `docs/09_execution_tracker.md` (needs update)

---

**Generated**: 2026-05-31
**Branch**: `chore/00058-a-subagents-auth-rate-limit-claim-audit`
**Status**: READY_FOR_MERGE - Audit complete, 00058B plan ready
