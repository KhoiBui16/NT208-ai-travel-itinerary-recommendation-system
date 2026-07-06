## Mô tả

Harden pre-staging UX for two issues observed after the 00060F staging plan:

- Home destination cards could lose images when API destination data returned empty/null/broken image URLs.
- AI itinerary generation could time out at the Gemini provider call and leave the user without clear guidance.

## Thay đổi chính

- Added robust Home destination image fallback logic with destination aliases and default image fallback.
- Added visible AI provider-timeout UX copy for CreateTrip submit failures.
- Added structured 503 timeout contract with `AI_PROVIDER_TIMEOUT` and `retryable=true`.
- Added minimal backend timing logs for generate RCA without logging prompt content or secrets.
- Added Playwright regressions for Home image fallback and AI timeout submit-path UX.
- Added backend unit coverage proving AI timeout does not persist a trip.
- Updated README and reports with the latest test counts and findings.

## Cách kiểm tra (Testing)

- `npm run build -- --outDir .build-tmp\verify-00060g-ai-image-ux`
- `npx playwright test tests/e2e/00060d-home-destination-image-fallback.spec.ts --reporter=list`
- `npx playwright test tests/e2e/00060d-ai-timeout-ux.spec.ts --reporter=list`
- `npx playwright test --reporter=list`
- `uv run ruff check src tests`
- `uv run ruff format --check src tests`
- `uv run alembic check`
- `uv run pytest tests/unit/ -v --tb=short`
- `uv run pytest tests/integration/ -v --tb=short -k "generate or itinerary"`

## Lưu ý khác

- No real Gemini call is used in the new tests.
- The fix does not eliminate all possible external Gemini latency; it makes timeout handling structured, observable, and user-safe.
- Generated build/test artifacts are intentionally not committed.
