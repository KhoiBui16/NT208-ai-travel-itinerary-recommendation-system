---
name: source-plan-sync-review
description: Use when reviewing this repository for drift between source code, plan files, docs, README files, CI workflows, and phase reports. The skill guides agents to compare current implementation against plan/, write Vietnamese reports under docs/REPORTS, create issue notes for mismatches, and avoid changing application UI/UX or behavior unless a separate fix branch is explicitly required.
---

# Source Plan Sync Review

Use this skill before or after feature work when the user asks whether source code, plans, docs, README, and CI are still aligned.

## Read First

1. `CLAUDE.md`
2. `AGENTS.md`
3. `.claude/context/00_project_overview.md`
4. Relevant `.claude/context/*` phase file
5. Relevant files in `plan/`, `docs/`, `Backend/`, `Frontend/`, and `.github/workflows/`

## Workflow

1. Confirm branch, latest `main`, dirty tree, and local artifacts.
2. List relevant plan files and classify each as implemented, partial, not started, stale, or superseded.
3. Compare implementation paths against docs and README claims.
4. Run or cite verification gates before writing final docs.
5. Write reports in Vietnamese with dates under `docs/REPORTS/`.
6. Create one issue note per material mismatch under `docs/REPORTS/ISSUES/`.
7. Update docs/README only after tests or smoke evidence supports the new statement.

## Report Rules

- `docs/REPORTS/REPORT.md` is the high-level index and phase status.
- Phase reports use `docs/REPORTS/phase_{name}_{function}.md`.
- Issue notes use `docs/REPORTS/ISSUES/{issue_name}.md`.
- Each report includes date, related files, commands/evidence, status, risks, and next actions.
- Reports should be Vietnamese with accents unless the user asks otherwise.

## Phase C3/C4 Additions

When syncing Phase C3/C4, enforce these non-negotiables:

- C3 is trip-bound companion chat, NOT a global chatroom.
- C3 MVP uses REST, NOT WebSocket/SSE.
- Chat returns `requiresConfirmation` + `proposedOperations`; does NOT persist itinerary before user confirms.
- `apply-patch` updates DB only after user confirms.
- `companion_service.py` lives in `Backend/src/itineraries/`, NOT in `Backend/src/agent/`.
- `Backend/src/agent/` only contains shared AI infra (LLM client, prompts, schemas).
- Companion chat requires authenticated user and trip owner.
- Paid AI rate limit must be fail-closed when Redis is down.
- Do not implement C5 Analytics when C3/C4 are not stable.

## Safety Rules

- Do not change UI/UX while doing sync review.
- Do not commit `.env`, tokens, raw claim tokens, JWTs, or provider API keys.
- Do not log secrets in reports.
- Do not commit temporary smoke scripts, traces, or local logs.
- If source behavior must change, stop and create a separate `fix/...` branch that follows repo branch and commit policy.
