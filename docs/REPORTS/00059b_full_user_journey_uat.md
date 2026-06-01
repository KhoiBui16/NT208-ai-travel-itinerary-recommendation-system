# 00059B — Full User Journey UAT + Manual Run Guide

Date: 2026-06-01
Branch: `docs/00059-b1-full-user-journey-uat`
PR title: `docs: [#00059] add full user journey UAT and manual run guide`

## 1. Executive Summary

| Item | Result |
|---|---|
| Overall readiness | `PARTIAL_READY_FOR_00060` |
| Can proceed to `00060 — Architecture/System Review before C3/C4`? | `YES`, as a review phase |
| Can proceed directly to implementation-heavy C3/C4? | `NO`, fix or explicitly triage authz gap first |
| Gemini real call | Not run by design |
| Goong real call / ETL | Not run by design |
| Main blocker found | Nested activity/accommodation membership authorization gap |

The current product is stable enough for a system/architecture review phase. Core FE/BE checks pass, 00059A calendar unblock is present in `main`, and the current browser suite passes with 19 active tests and 3 legacy B3 skips. The main risk found by source UAT is a backend authorization gap in nested itinerary subresource mutation.

## 2. Step 2 — Branch/Base Verification

| Check | Result | Evidence |
|---|---|---|
| main pulled from origin | PASS | `git pull origin main` fast-forwarded `main` to `556bcfe` |
| 00059A merged into main | YES | `556bcfe fix: [#00059] unblock calendar modal e2e date selection (#63)` |
| Current branch | PASS | `docs/00059-b1-full-user-journey-uat` |
| Branch policy valid | YES | Matches `^(feat|fix|docs|style|refactor|chore)/[0-9]+-(a|b1|b2|b3|c|d)-...$` |
| Working tree clean before changes | NO | Pre-existing untracked artifacts were present: old `.build-tmp*`, `test-results/`, old `00055` report files |

## 3. Step 3 — Guidance/Workflow Review

| Source | Key rule found | How it affects 00059B |
|---|---|---|
| `CLAUDE.md` | Local commands must be PowerShell-safe and anchored from repo root | New guide uses `$ROOT = git rev-parse --show-toplevel` |
| `AGENTS.md` | C3/C4 non-negotiables and no C3/C4 implementation during audit | This phase only documents/audits UAT |
| `.claude/agents/product-flow-reviewer.md` | Map end-to-end product journeys | Created `docs/USER_JOURNEY_UAT.md` |
| `.claude/agents/frontend-e2e-ux-tester.md` | Verify browser behavior, pending claim, 429 UX | Full Playwright suite was run |
| `.claude/agents/backend-auth-rate-limit-auditor.md` | Rate limit fail-closed; guest/auth claim safety | Rate-limit and nested authz areas reviewed |
| `.claude/agents/docs-sync-reviewer.md` | README/docs/REPORTS must avoid local machine details | New docs use `localhost` and no absolute local paths |
| `.claude/skills/source-plan-sync-review/SKILL.md` | Compare source, docs, reports, and plans | README/docs drift was checked and synced where scoped |
| `.claude/skills/fullstack-browser-debug/SKILL.md` | Use Docker/servers/browser evidence for real FE-BE flow | Docker db/redis + backend + Playwright were run |
| `.claude/skills/code-review/SKILL.md` | Prioritize bugs, risks, missing tests | Nested subresource authz issue was filed |
| `.claude/skills/git-pr-workflow/SKILL.md` | PR body sections and no `git add .` | PR body file uses required section headings; no staging was done |
| `.github/workflows/pr-policy.yml` | Branch/title/body policy | Branch and PR title are valid |
| `.github/workflows/frontend-ci.yml` | Frontend build and e2e checks | Local build + Playwright were run |
| `.github/workflows/backend-ci.yml` | Backend lint/unit/integration/migrations | Ruff, unit, integration, alembic upgrade/check were run |

## 4. Step 4 — Source Coverage

| Feature area | Files found by inventory | Files read deeply | Key finding |
|---|---|---|---|
| Local run / infrastructure | `docker-compose.yml`, `Backend/.env.example`, `Frontend/.env.example`, package files, workflows | Same plus `docs/08_testing_local_run.md`, `README.md` | Confirmed Docker db/redis, uv backend, Vite frontend, Playwright commands |
| Auth/register/login/logout/session | `Backend/src/auth/*`, `Frontend/src/app/contexts/AuthContext.tsx`, auth pages/tests | `router.py`, `service.py`, `dependencies.py`, `AuthContext.tsx`, `Login.tsx`, `Register.tsx`, `auth.spec.ts` | Register/login/protected route and pending claim are covered; logout browser flow not directly covered |
| Guest identity / guest trip / claim | `ItineraryService`, claim schemas/models, `AuthContext`, e2e auth | `service.py`, `extras.py`, `AuthContext.tsx`, `auth.spec.ts` | Guest claim token is one-time/hash-backed in service and browser claim paths pass |
| Destination selector / Calendar / CreateTrip | `CreateTrip.tsx`, `CalendarModal.tsx`, `useDestinations.ts`, E2E helper/specs | All listed | Calendar helper works; partial city warning is advisory and not a submit gate |
| AI generate / rate-limit / error handling | `pipeline.py`, `rate_limiter.py`, `exceptions.py`, `errorHandler.ts`, 00058 tests | All listed | Rate-limit headers and 429/503 mapping exist; real Gemini smoke intentionally deferred |
| Trip workspace / itinerary CRUD | `TripWorkspace.tsx`, `useTripSync.ts`, `useActivityManager.ts`, BE itinerary service/router | All listed | Basic CRUD exists; nested activity/accommodation membership authz gap found |
| Share / saved places / profile | `TopActionBar`, `ItineraryView`, `SharedTripView`, `SavedPlaces`, BE share/saved endpoints | Key FE pages/services and BE services | Share backend unit covered; valid share browser path needs UAT |
| Frontend routes / protected routes | `routes.tsx`, `ProtectedRoute.tsx` | Both | Eight protected routes redirect guests through login |
| Backend endpoints/services/models | `main.py`, routers/services/repositories/models | Key routers/services/repositories | REST surface is active; C3/C4 chat/apply endpoints are not implemented |
| E2E tests / CI | `Frontend/tests/e2e`, workflows | Key e2e specs and workflows | Full suite passes; B3 legacy flows are skipped |
| README/docs/REPORTS | `README.md`, `docs/*`, `docs/REPORTS/*` | README, run docs, latest reports | Active README/test counts were stale and synced in this phase |

## 5. Step 5 — User Journey Matrix Summary

Full matrix lives in `docs/USER_JOURNEY_UAT.md`.

| Journey | Actor | Status | Evidence | Issue |
|---|---|---|---|---|
| UJ-GUEST-01 | Guest | PASS | Public Playwright pages, place endpoint tests | None |
| UJ-GUEST-02 | Guest | PARTIAL | Calendar + mocked generate submit; backend pipeline unit tests | No real Gemini call |
| UJ-GUEST-03 | Guest | PARTIAL | Rate-limit unit tests + 429 E2E mock structure | No repeated real generate loop |
| UJ-GUEST-04 | Guest to Auth | PASS | Playwright pending claim login/register reload paths | None |
| UJ-AUTH-01 | Auth | PASS/PARTIAL | Register/login/protected route browser pass; auth unit tests | Logout browser path not directly covered |
| UJ-AUTH-02 | Auth | PARTIAL | Pipeline unit tests; trip workspace opens via seeded API trip | No real Gemini call |
| UJ-AUTH-03 | Auth | PARTIAL | Backend CRUD tests; Playwright trip list/delete path | Nested subresource authz gap |
| UJ-AUTH-04 | Auth | PARTIAL | Source supports optimistic workspace save | No browser persistence test |
| UJ-AUTH-05 | Auth | PARTIAL | Backend share unit tests; shared invalid token test | No valid share browser UAT |
| UJ-AUTH-06 | Auth | PARTIAL | Trip owner unit tests | Nested subresource authz gap |
| UJ-ERROR-01 | Any | PASS | `00057` Playwright pass | None |
| UJ-ERROR-02 | Any | PARTIAL | Backend 422 integration tests; FE mapping source | Legacy browser 422 flow skipped |
| UJ-ERROR-03 | Any | PARTIAL | 503 source mapping and fail-closed code | No browser 503 UAT |

## 6. Step 6 — Manual Run Guide Status

| Section | Status | Notes |
|---|---|---|
| Prerequisites | ADDED | Docker, Python/uv, Node/npm, Playwright |
| Env setup | ADDED | Uses `Backend/.env.example` and `Frontend/.env.example` |
| Start DB/Redis | ADDED | `docker compose up -d db redis` |
| Run migrations | ADDED | `uv run alembic upgrade head` and `uv run alembic check` |
| Start backend | ADDED | `uv run uvicorn src.main:app --host localhost --port 8000` |
| Start frontend | ADDED | `npm run dev -- --host localhost --port 5173` |
| Verify URLs | ADDED | `localhost:5173`, `localhost:8000/docs`, health endpoint |
| Run tests | ADDED | Backend and frontend CI-equivalent commands |
| Stop cleanup | ADDED | Stop terminals and `docker compose stop db redis` |
| Troubleshooting | ADDED | Do not stage `.build-tmp*`, `test-results`, `playwright-report`; external AI/ETL are optional |

## 7. Step 7 — UAT Execution Evidence

| Command / check | Status | Result |
|---|---|---|
| `uv run ruff check src tests` | PASS | All checks passed; ruff cache write warnings only |
| `uv run ruff format --check src tests` | PASS | 88 files already formatted; ruff cache write warnings only |
| `uv run pytest tests/unit/ -v --tb=short` | PASS | 119 passed, 1 warning |
| `docker compose up -d db redis` | PASS | db and redis healthy |
| `uv run alembic upgrade head` | PASS | Migrations applied/no pending upgrade output |
| `uv run alembic check` | PASS | No new upgrade operations detected |
| `$env:CI="true"; uv run pytest tests/integration/ -v --tb=short` | PASS | 44 passed |
| `npm run build -- --outDir .build-tmp\verify-00059b-uat` | PASS | Vite build completed; chunk-size warning only |
| `npx playwright test --reporter=list` | PASS | 19 passed, 3 skipped |
| Backend health | PASS | `GET /api/v1/health` returned `{"status":"healthy"}` |

## 8. Issues Found / Deferred

| Issue | Severity | Evidence | Next action |
|---|---|---|---|
| Nested activity/accommodation membership authz gap | HIGH | `ItineraryService.update_activity/delete_activity/delete_accommodation` load nested IDs directly after checking supplied trip owner | Fix before C3/C4 implementation-heavy work |
| Valid share browser path not covered | MEDIUM | Backend unit exists; no browser valid token UAT in this run | Add Playwright/UAT test |
| Workspace edit persistence not browser-tested | MEDIUM | Source supports optimistic update; full persistence/revert not exercised | Add Playwright/UAT test |
| Real Gemini generate not run | MEDIUM | Skipped by phase rule | Keep as controlled smoke only with approval |
| 00058 E2E comments still mention old calendar blocker | LOW | Full suite now passes after 00059A; test comments are stale | Clean in a later test-doc polish PR |

## 9. Files Changed

| File | Change | Why |
|---|---|---|
| `docs/USER_JOURNEY_UAT.md` | Added full journey matrix and readiness summary | Gives product-level UAT truth before 00060 |
| `docs/LOCAL_MANUAL_UAT_GUIDE.md` | Added PowerShell-safe local run/test guide | Gives repeatable manual verification path |
| `docs/REPORTS/00059b_full_user_journey_uat.md` | Added detailed execution report | Records evidence and risks |
| `docs/REPORTS/pr_00059b_description.md` | Added PR body draft | Satisfies PR policy template |
| `docs/REPORTS/ISSUES/issue_nested_trip_subresource_membership_authz_gap.md` | Added issue note | Tracks authz risk found during UAT |
| `docs/REPORTS/REPORT.md` | Updated report index | Makes 00059B discoverable |
| `README.md` | Synced UAT guide links, counts, CI checks | Removes stale current-state info |
| `docs/08_testing_local_run.md` | Synced active local docs to `localhost` and current guide | Avoids stale loopback-literal local instructions |
| `docs/01_overview.md` | Synced current test counts | Keeps overview aligned with source/test suite |

## 10. No Local IP/Path/Secret Scan

| Scan | Result | Notes |
|---|---|---|
| Local path/private IP/hostname scan | PASS_WITH_EXISTING_EXAMPLES | Matches are pre-existing policy/example lines in `.claude` and historical reports; new 00059B docs use `localhost` and no local absolute paths |
| Token/key pattern scan | PASS_WITH_PLACEHOLDERS | Matches are placeholder docs/examples such as `<api-key>`, `raw_token_from_localStorage`, and legacy `plan/` examples; no real key/token found in new 00059B docs |
| `git diff --check` | PASS | No whitespace errors; Git reported line-ending warnings for touched markdown files on Windows |

## 11. Stage Plan

| File/Area | Stage? | Reason |
|---|---|---|
| `docs/USER_JOURNEY_UAT.md` | YES | New UAT matrix |
| `docs/LOCAL_MANUAL_UAT_GUIDE.md` | YES | New manual run guide |
| `docs/REPORTS/00059b_full_user_journey_uat.md` | YES | Main report |
| `docs/REPORTS/pr_00059b_description.md` | YES | PR body |
| `docs/REPORTS/ISSUES/issue_nested_trip_subresource_membership_authz_gap.md` | YES | New issue found |
| `docs/REPORTS/REPORT.md` | YES | Report index update |
| `README.md` | YES | Stale current-state info synced |
| `docs/08_testing_local_run.md` | YES | Active run doc synced |
| `docs/01_overview.md` | YES | Current test counts synced |
| `Frontend/.build-tmp*/` | NO | Local build artifact |
| `test-results/` | NO | Playwright artifact |
| `playwright-report/` | NO | Playwright artifact if generated |
| Old `docs/REPORTS/00055_*` files | NO | Pre-existing unrelated untracked artifacts |

## 12. Recommendation

Proceed to `00060 — Architecture/System Review before C3/C4` with the nested subresource authorization issue as a named input. Do not start implementation-heavy C3/C4 mutations until that issue is fixed or explicitly accepted with compensating tests.
