# Phase Report: Docs, README, CI Sync

Ngày báo cáo: 2026-05-26  
Status: PASS with local issues tracked.

## Files Liên Quan

- `README.md`
- `Backend/README.md`
- `Frontend/README.md`
- `.github/workflows/backend-ci.yml`
- `.github/workflows/frontend-ci.yml`
- `.github/workflows/pr-policy.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.claude/skills/source-plan-sync-review/SKILL.md`

## CI/CD Rules

| Rule | Current |
|---|---|
| Branch regex | `^(feat|fix|docs|style|refactor|chore)/[0-9]+-(a|b1|b2|b3|c|d)-[a-z0-9-]+$` |
| PR title regex | `^(feat|fix|docs|style|refactor|chore): \\[#([0-9]+)\\] [a-z].+$` |
| Required PR sections | `## Mô tả`, `## Thay đổi chính`, `## Cách kiểm tra (Testing)`, `## Lưu ý khác` |
| Backend CI | Ruff, unit, integration, migrations |
| Frontend CI | Build and Playwright e2e |
| External provider calls in CI | Mocked/dummy env only |

## README Sync

- Root README remains high-level source of truth and now links `docs/REPORTS/REPORT.md`.
- Backend README now documents C.1 AI generate, Goong ETL, guest quota, and debug statuses.
- Frontend README now documents Vite startup, service layer, auth/claim, protected routes, Map View boundary, and browser debug.

## Local Findings To Track

- `npm ci` completed but reported 3 audit vulnerabilities.
- Default `npm run build` is blocked by local ignored `Frontend/dist` permission lock.
- Ruff passes but cannot write local cache in `.ruff_cache`.

These are tracked under `docs/REPORTS/ISSUES/`.
