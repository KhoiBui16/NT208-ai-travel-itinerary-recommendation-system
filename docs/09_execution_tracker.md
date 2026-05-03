# 09. Execution tracker

Tracker này thay thế `plan/17_execution_tracker.md` sau khi dọn repo.

| Task ID | Phase | Branch | Scope | Status | Local verify | PR |
|---|---|---|---|---|---|---|
| 00000 | A | `feat/00000-a-foundation-bootstrap` | Backend foundation bootstrap | merged | passed | #1 |
| 00001 | B1 | `feat/00001-b1-auth-users` | Auth + users endpoints | merged | passed | #2 |
| 00002 | B2 | `feat/00002-b2-itineraries` | Itinerary CRUD/share/claim/rating | merged | passed | #3 |
| 00003 | B3 | `feat/00003-b3-places-cache` | Places, destinations, saved places, Redis cache | merged | passed | #4 |
| 00004 | D | `feat/00004-d-etl-pipeline` | ETL extract/transform/load foundation | merged | passed | #5 |
| 00005 | D | `fix/00005-d-etl-backend-readiness` | ETL schema, local readiness, CI frontend build | merged | passed | #6 |
| 00006 | D | `docs/00006-d-docs-cleanup` | Dọn legacy docs, chuyển source docs vào `docs/`, test FE/BE start | review_ready | passed | pending |

## Còn lại

- Phase C AI services.
- Full FE-BE integration cho các màn còn mock.
- Full ETL real data sau khi có `GOONG_API_KEY`.
- Optional analytics EP-34 nếu cần.
