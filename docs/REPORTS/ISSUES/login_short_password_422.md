# Issue: Login Với Password Ngắn Trả 422 Thay Vì 401

**Ngày phát hiện:** 2026-05-27  
**Severity:** Low  
**Status:** KNOWN / ACCEPTABLE  
**Phase:** B1

## Mô tả

`POST /auth/login` với password < 8 ký tự trả **422 Unprocessable Entity** (Pydantic validation error) thay vì **401 Unauthorized**.

## Nguyên nhân

`LoginRequest` schema có `min_length=8` trên field `password`. Pydantic validate trước khi service xử lý, nên password ngắn bị reject ở tầng schema với 422.

## Behavior thực tế

```
POST /auth/login {"email":"x@test.com","password":"x"}
→ 422 Unprocessable Entity
  {"detail":[{"type":"string_too_short","loc":["body","password"],...}]}

POST /auth/login {"email":"x@test.com","password":"wrongpassword123"}
→ 401 Unauthorized
```

## Đánh giá

Behavior này **không phải bug bảo mật** — attacker không thể bypass auth. Tuy nhiên về UX, FE nên handle cả 422 và 401 khi hiển thị lỗi login.

FE hiện tại (`Login.tsx`) đã handle `ApiError` chung, nên user vẫn thấy thông báo lỗi.

## Không cần fix ngay

Đây là behavior đúng theo Pydantic validation. Nếu muốn thống nhất trả 401 cho mọi trường hợp sai credentials, cần bỏ `min_length` khỏi `LoginRequest.password` và để service xử lý. Nhưng điều này không cần thiết cho MVP2.
