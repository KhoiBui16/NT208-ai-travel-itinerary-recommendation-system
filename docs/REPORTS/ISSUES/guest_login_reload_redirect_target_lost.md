# Issue: Guest Login Reload Loses Redirect Target

Ngày tạo: 2026-05-26  
Ngày xử lý: 2026-05-26
Status: DONE
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

## Resolution

Branch: `fix/00044-c-stabilize-c1-guest-flow`

- `pendingClaim` now stores `returnTo: /trip-workspace?tripId={id}`.
- `AuthContext.login()` and `AuthContext.register()` return the claimed trip redirect target after successful claim.
- `Login.tsx` and `Register.tsx` navigate to the claimed workspace when claim succeeds.
- `pendingClaim` is cleared after successful claim.

## Verification

```text
npx playwright test --reporter=list
13 passed
```

Browser smoke evidence:

```text
pendingBeforeReload = true
pendingAfterReload = true
POST /api/v1/itineraries/144/claim = 200
GET /api/v1/itineraries/144 = 200
finalUrl = /trip-workspace?tripId=144
pendingAfterClaim = null
```

Screenshots:

- `docs/REPORTS/assets/2026-05-26/fix-00044-seeded-guest-login-before-reload.png`
- `docs/REPORTS/assets/2026-05-26/fix-00044-seeded-guest-claimed-after-login-reload.png`
