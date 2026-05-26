# Phase Report: Frontend Flow

Ngày báo cáo: 2026-05-26  
Status: PASS, với một UX gap về reload login sau guest generate.

## Files Liên Quan

- `Frontend/src/app/App.tsx`
- `Frontend/src/app/routes.tsx`
- `Frontend/src/app/services/api.ts`
- `Frontend/src/app/services/itinerary.ts`
- `Frontend/src/app/contexts/AuthContext.tsx`
- `Frontend/src/app/pages/CreateTrip.tsx`
- `Frontend/src/app/pages/TripWorkspace.tsx`
- `Frontend/src/app/hooks/trips/useTripSync.ts`

## Luồng FE Tổng Thể

```text
main.tsx
-> App.tsx
-> ErrorBoundary
-> AuthProvider
-> TripWizardProvider
-> RouterProvider(routes.tsx)
```

API layer nằm trong `Frontend/src/app/services/`, không có hardcode base URL trong component. `api.ts` đọc `VITE_API_URL`, inject Bearer token, tự refresh khi 401, và throw `ApiError` cho non-2xx.

## Luồng AI Generate Từ FE

```text
CreateTrip.tsx
-> user chọn destination/date/travelers/budget/interests
-> generateItinerary()
-> POST /api/v1/itineraries/generate
-> nếu response có claimToken: storePendingClaim(tripId, claimToken)
-> navigate /trip-workspace?tripId=...
```

`TripWorkspace` là protected route. Auth user vào trực tiếp. Guest bị redirect sang `/login`.

## Session Storage

| Key | Vai trò |
|---|---|
| `pendingClaim` | Lưu `{ tripId, claimToken }` cho guest generate, scope theo tab |
| `currentTrip` | Quick-restore fallback trong workspace, backend vẫn là source of truth khi có `tripId` |

## Kết Quả Browser

- Auth generate -> workspace reload vẫn load trip từ BE.
- Guest generate -> redirect `/login`, `pendingClaim` tồn tại trước và sau reload login page.
- Sau login, `AuthContext` claim thành công.
- Nếu reload ở `/login`, React Router `location.state.from` mất, nên claim vẫn DONE nhưng user không tự quay lại workspace. Issue: [guest_login_reload_redirect_target_lost.md](ISSUES/guest_login_reload_redirect_target_lost.md).
