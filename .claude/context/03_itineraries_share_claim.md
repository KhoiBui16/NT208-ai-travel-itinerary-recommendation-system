# 03 Itineraries Share Claim

## Purpose

Tóm tắt itinerary CRUD, owner check, share token và guest claim.

## Current truth

- Itinerary CRUD, nested day/activity/accommodation, share, claim, rating đã implement.
- Integer ID endpoints yêu cầu auth và owner check.
- Public read dùng share token.
- Guest claim dùng claim token.

## Target state

- Auto-save/full update chạy transaction an toàn.
- Share/claim không bị IDOR.
- AI generate sau này lưu đúng cùng schema.

## Key invariants

- Không public `GET /itineraries/{id}` nếu không owner.
- Share chỉ qua opaque `shareToken`.
- Claim token one-time, hash, expiry.
- FE contract dùng `Activity.name`, `adultPrice`, `childPrice`, `extraExpenses`.

## Do next

- Khi sửa nested trip, chạy unit itinerary + integration itinerary.
- Khi đổi schema trip/day/activity, thêm migration.
- Khi đổi response, đối chiếu `Frontend/src/app/types/trip.types.ts`.

## Do not do

- Không claim guest trip chỉ dựa vào `user_id IS NULL`.
- Không tự persist AI chat patch khi user chưa confirm.
- Không đổi public field name tùy ý.

## Acceptance checkpoints

- Owner không đọc/sửa/xóa trip người khác.
- Share token public read hoạt động.
- Raw integer ID public read bị chặn.
- Claim token invalid/expired/consumed bị chặn.

## Read more

- `../../docs/03_backend.md`
- `../../docs/04_frontend.md`
- `../../docs/06_ai_roadmap.md`
