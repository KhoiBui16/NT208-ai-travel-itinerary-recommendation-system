# 02 Auth Users

## Purpose

Tom tat scope Auth + Users de implement dung contract, dung security, dung test gate.

## Current truth

- MVP1 chi co auth/user flow co ban
- Chua co refresh token flow day du
- Chua co logout revoke that
- FE moi can profile flow ro hon

## Target state

- Auth core: register, login, refresh, logout
- User core: get profile, update profile, change password
- Access token ngan, refresh token dai va revoke duoc

## Key invariants

- Public JSON dung camelCase
- Khong tra password hash hoac secret fields trong response
- Refresh token nen luu hash trong DB, revoke khi logout
- Moi endpoint user profile phai dua tren `current_user`, khong tin client-provided user id
- Test logic moi bang unit test; endpoint moi bang integration test

## Do next

- Tao schemas auth/user request-response
- Tao repository cho user + refresh token
- Tao service cho register/login/refresh/logout/profile/password
- Tao router va dependency auth
- Viet unit tests cho security/auth service
- Viet integration tests cho auth/user endpoints

## Do not do

- Khong tai su dung schema chung lam response cho moi use case
- Khong luu refresh token raw neu da chot hash strategy
- Khong bo qua revoke/logout flow
- Khong de endpoint profile phu thuoc vao user id tu FE

## Acceptance checkpoints

- Register/login/refresh/logout/profile/password hoat dong
- Token flow ro rang va revoke duoc
- Response khop naming rules
- Unit + integration tests pass theo pham vi auth/users

## Read more

- `../../plan/03_be_refactor_plan.md`
- `../../plan/12_be_crud_endpoints.md`
- `../../plan/16_unit_test_specs.md`
- `../../plan/08_coding_standards.md`
