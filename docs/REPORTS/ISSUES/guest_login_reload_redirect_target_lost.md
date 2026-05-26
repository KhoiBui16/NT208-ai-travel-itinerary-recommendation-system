# Issue: Guest Login Reload Loses Redirect Target

Ngày tạo: 2026-05-26  
Status: TO DO  
Severity: Medium UX / Low data-loss risk

## Triệu Chứng

Guest generate creates a trip and stores `pendingClaim` in `sessionStorage`. If the guest lands on `/login` and reloads that page before logging in, the `pendingClaim` survives, but React Router `location.state.from` is lost.

## Evidence

Browser smoke:

```text
Guest generated trip 137
pendingClaim before reload = true
pendingClaim after reload = true
claim endpoint after login = 200
manual /trip-workspace?tripId=137 = 200
```

## Assessment

The generated trip is not lost. It is persisted in PostgreSQL as a guest trip and claimed after login. The UX gap is that the user may not be automatically redirected back to the generated workspace after reloading `/login`.

## Suggested Fix

In a separate fix branch, store a `pendingReturnTo` value beside `pendingClaim`, for example `/trip-workspace?tripId={id}`, and clear it after login/register navigation.
