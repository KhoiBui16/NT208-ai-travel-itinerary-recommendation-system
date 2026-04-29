# 00 Project Overview

## Purpose

Tom tat nhanh current repo, target MVP2, va quy tac workflow de Claude doc truoc moi task.

## Current truth

- Backend hien tai dang chay o `Backend/app/`, entrypoint la `Backend/main.py`, dependencies o `Backend/requirements.txt`
- Frontend da thay doi manh tren branch `feat/frontend-revamp`
- Public contract cho trip/day/activity/accommodation nam o `Frontend/src/app/types/trip.types.ts`
- `plan/` la bo docs day du cho user; `.claude/context/` la operational summary cho Claude

## Target state

- Backend refactor sang `Backend/src/`
- Dung `uv` + `pyproject.toml` + `uv.lock`
- Dung Alembic thay cho `create_all()`
- Kien truc `router -> service -> repository -> db`
- Auth, itinerary, places, AI services, tests, CI gate du de chay local truoc deploy

## Key invariants

- `33` core endpoints, `EP-34 /agent/analytics` la optional/MVP2+
- Public JSON contract dung `camelCase`
- `GET /api/v1/itineraries/{id}` la owner-only
- Public share chi qua `GET /api/v1/shared/{shareToken}`
- Guest claim bat buoc co `claimToken`
- Generate di direct `ItineraryPipeline`
- Companion chat tra patch de user confirm, khong tu persist DB
- `SuggestionService` la DB-only
- AI rate limit khong duoc fail-open im lang

## Do next

- Doc file phase phu hop trong `.claude/context/`
- Doi chieu voi file plan nguon
- Mo `plan/17_execution_tracker.md` truoc khi code
- Xac nhan branch, commit, PR, va local verification rule

## Do not do

- Khong dua moi request AI qua Supervisor
- Khong dung public integer trip ID cho share
- Khong su dung `.claude/settings.local.json` lam tai lieu shared
- Khong tin template generic neu repo that te khac

## Acceptance checkpoints

- Biet repo dang o current MVP1 shape hay da len target MVP2 shape
- Biet file phase nao can doc tiep
- Biet source of truth order
- Biet 4 invariants nhay cam nhat: camelCase, owner-only by ID, shareToken, claimToken

## Read more

- `../../CLAUDE.md`
- `../../plan/00_overview_changes.md`
- `../../plan/13_architecture_overview.md`
- `../../plan/12_be_crud_endpoints.md`
