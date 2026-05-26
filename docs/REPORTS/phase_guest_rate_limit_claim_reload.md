# Phase Report: Guest Claim, Reload, Rate Limit

Ngày báo cáo: 2026-05-26  
Status: PASS với một UX gap.

## Files Liên Quan

- `Frontend/src/app/contexts/AuthContext.tsx`
- `Frontend/src/app/components/ProtectedRoute.tsx`
- `Backend/src/core/rate_limiter.py`
- `Backend/src/itineraries/router.py`
- `Backend/src/itineraries/service.py`

## Guest Generate

```text
Guest CreateTrip
-> POST /api/v1/itineraries/generate
-> 201 with tripId + claimToken
-> FE stores pendingClaim in sessionStorage
-> FE navigates to protected workspace
-> ProtectedRoute redirects to /login
```

Smoke result:

| Step | Result |
|---|---|
| Guest generate | 201 |
| `pendingClaim` before reload | true |
| `pendingClaim` after `/login` reload | true |
| Login after reload | success |
| Claim endpoint | 200 |
| Manual open claimed workspace | 200 and rendered |

## Rate Limit

The smoke used a fake destination to exercise quota without calling Gemini:

```text
POST /api/v1/itineraries/generate x4
-> 422
-> 422
-> 422
-> 429
```

This confirms the guest key increments before pipeline validation and blocks on the 4th daily call.

## Gap

Reloading `/login` loses React Router `location.state.from`. Claim still succeeds because `pendingClaim` survives in `sessionStorage`, but redirect target is lost. See [guest_login_reload_redirect_target_lost.md](ISSUES/guest_login_reload_redirect_target_lost.md).
