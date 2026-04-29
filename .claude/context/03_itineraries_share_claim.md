# 03 Itineraries Share Claim

## Purpose

Giu cac invariants de code trip CRUD, nested sync, share, va guest claim dung chuan.

## Current truth

- FE moi dang co nhieu logic localStorage/mock
- MVP1 backend chua co day du nested trip/day/activity/accommodation workflow
- Public security cho share/claim chua du chat

## Target state

- Trip CRUD day du, owner-only theo integer ID
- Nested days/activities/accommodations duoc sync dung transaction
- Public share bang opaque `shareToken`
- Guest trip co the claim sau login bang one-time `claimToken`

## Key invariants

- `GET /api/v1/itineraries/{id}` la owner-only
- Public read chi qua `GET /api/v1/shared/{shareToken}`
- `claimToken` phai one-time, hash, co expiry
- Contract bam `Frontend/src/app/types/trip.types.ts`
- Activity field dung `name`, khong quay lai `title`
- Auto-save va patch apply phai dung chung nested sync logic

## Do next

- Tao trip/day/activity/accommodation schemas dung camelCase
- Implement list/get/create/update/delete trip
- Implement nested sync cho `PUT /itineraries/{id}`
- Implement rating, share create, shared read-only, claim
- Them owner checks, share-token checks, claim-token checks
- Viet unit + integration tests cho owner/share/claim/nested update

## Do not do

- Khong public trip qua integer ID
- Khong claim trip guest chi vi `user_id IS NULL`
- Khong de AI chat tu write DB khi user chua confirm
- Khong map field tay mot cach tuy y neu FE contract da ro

## Acceptance checkpoints

- CRUD trip chay duoc voi nested data
- Shared read-only chi qua `shareToken`
- Claim guest trip can token hop le va chua het han
- Owner khong doc/sua/xoa duoc trip nguoi khac

## Read more

- `../../plan/12_be_crud_endpoints.md`
- `../../plan/03_be_refactor_plan.md`
- `../../plan/09_database_design.md`
- `../../plan/04_ai_agent_plan.md`
