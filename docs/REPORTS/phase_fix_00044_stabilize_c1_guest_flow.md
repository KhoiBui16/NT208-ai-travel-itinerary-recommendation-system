# Phase Report: Fix 00044 Stabilize C.1 Guest Flow

Ngày báo cáo: 2026-05-26  
Branch: `fix/00044-c-stabilize-c1-guest-flow`  
Status: PASS with external Gemini quota caveat.

## Mục Tiêu

Ổn định luồng C.1 sau khi PR40/PR41/PR43 đã merge, trước khi chuyển sang C.2/C.3:

- Guest generate hoặc guest-created trip phải claim được sau login/register.
- Reload trang `/login` hoặc `/register` không làm mất đường dẫn quay lại workspace.
- FE dependency audit không còn high/moderate vulnerabilities đã biết.
- Không thay đổi UI/UX.

## Files Liên Quan

- `Frontend/src/app/contexts/AuthContext.tsx`
- `Frontend/src/app/pages/Login.tsx`
- `Frontend/src/app/pages/Register.tsx`
- `Frontend/tests/e2e/auth.spec.ts`
- `Frontend/package.json`
- `Frontend/package-lock.json`
- `docs/REPORTS/ISSUES/guest_login_reload_redirect_target_lost.md`
- `docs/REPORTS/ISSUES/npm_audit_vulnerabilities.md`
- `docs/REPORTS/ISSUES/gemini_resource_exhausted_manual_smoke.md`

## Thay Đổi Chính

| Hạng mục | Trước | Sau |
|---|---|---|
| Pending claim storage | `{ tripId, claimToken }` | `{ tripId, claimToken, returnTo }` |
| Login sau claim | Dựa vào `location.state.from` | Ưu tiên `claimResult.returnTo`, fallback `location.state.from` |
| Register sau claim | Luôn về `/` | Về workspace nếu claim thành công |
| E2E coverage | 11 tests | 13 tests, thêm login/register reload claim |
| FE audit | 3 vulnerabilities | 0 vulnerabilities |
| Vite | `6.3.5` | `6.4.2` |

## Verification Commands

Backend:

```powershell
cd Backend
uv run ruff check src tests
uv run ruff format --check src tests
uv run alembic upgrade head
uv run alembic check
uv run pytest tests/unit/ -v --tb=short
uv run pytest tests/integration/ -v --tb=short
```

Frontend:

```powershell
cd Frontend
npm ci
npm audit --json
npm run build
npm run build -- --outDir ..\.codex-run-logs\frontend-dist-fix-00044-after-audit --emptyOutDir=true
npx playwright test --reporter=list
```

CI policy:

```text
branch regex check = pass
PR title regex check = pass
required PR body sections = pass
```

Clean worktree frontend-build simulation:

```text
git worktree add --detach <temp> HEAD
cd <temp>/Frontend
npm ci
npm run build
result = pass, npm audit found 0 vulnerabilities
```

Browser smoke:

```text
Auth UI generate -> POST /api/v1/itineraries/generate = 201
Auth workspace reload -> GET /api/v1/itineraries/143 = 200
Seeded guest pending claim before reload = true
Seeded guest pending claim after reload = true
Seeded guest claim -> POST /api/v1/itineraries/144/claim = 200
Seeded guest workspace -> GET /api/v1/itineraries/144 = 200
Seeded guest pending claim after claim = null
```

## Screenshot Evidence

- `docs/REPORTS/assets/2026-05-26/fix-00044-auth-generate-workspace.png`
- `docs/REPORTS/assets/2026-05-26/fix-00044-seeded-guest-login-before-reload.png`
- `docs/REPORTS/assets/2026-05-26/fix-00044-seeded-guest-claimed-after-login-reload.png`

## Remaining Risks

| Risk | Status | Ghi chú |
|---|---|---|
| Gemini guest AI smoke | Open | Provider returned `ResourceExhausted`; tracked separately |
| Local `Frontend/dist` lock | Open | Windows local artifact, not source compile failure |
| Ruff cache warning | Open | Local cache permission warning, checks still pass |

## Kết Luận

Luồng claim/reload cho guest đã ổn hơn trước C.2/C.3. C.2 có thể bắt đầu sau khi PR này pass CI. C.3 vẫn nên chờ C.1 ổn định trên CI và ít nhất một manual Gemini smoke pass lại khi provider quota sẵn sàng.
