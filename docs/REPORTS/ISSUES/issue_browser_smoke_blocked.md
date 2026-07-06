# Issue: Browser Smoke Test Blocked

## Status
OPEN

## Evidence
- Command: `npm run test:e2e` — script exists in package.json but no test files for required flows
- Frontend dev server running on `http://localhost:5173`
- Backend running on `http://localhost:8000`
- Playwright installed (`@playwright/test ^1.59.1` in devDependencies)
- `Frontend/playwright-report/` directory exists (untracked) — suggests previous runs

## Impact
- FloatingAIChat current state (mock vs API-connected) unverified
- TripWorkspace render unverified
- Browser console errors unknown
- Network 401/403/500 errors in real browser flow unknown

## Reproduction
1. `cd Frontend && npm run test:e2e`
2. No test files found for login/generate/TripWorkspace flows

## Expected
Browser smoke tests run and verify:
1. Login/register flow
2. Generate trip flow
3. TripWorkspace renders itinerary
4. FloatingAIChat state (mock/disabled/connected)
5. No console errors

## Actual
No Playwright test files exist for these flows.

## Suggested fix
Create `Frontend/tests/smoke/` with:
- `auth.spec.ts` — register/login/logout
- `generate.spec.ts` — create trip with Hà Nội
- `workspace.spec.ts` — open TripWorkspace, verify itinerary renders
- `floating-chat.spec.ts` — verify FloatingAIChat state

This should be done in branch `feat/00056-c-c3-chat-session-foundation` or in `test/00055-c-fullstack-regression-verification`.
