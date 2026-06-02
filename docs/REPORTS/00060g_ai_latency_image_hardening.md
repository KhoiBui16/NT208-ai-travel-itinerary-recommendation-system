# 00060G AI Latency + Home Image Hardening

Date: 2026-06-03

Branch: `fix/00060-d-ai-latency-image-hardening`

## 1. Executive summary

- Home images fixed? YES
- AI timeout UX fixed? YES
- Root cause of slow generate: the observed slow section is the external Gemini request, not local DB/context loading.
- Real Gemini timeout eliminated? PARTIAL. Provider latency can still occur, but timeout handling, RCA logging, and user-facing UX are hardened.
- Can proceed to deploy staging? YES, after this PR merges and local/staging smoke checks pass.

## 2. Runtime RCA

| Question | Evidence | Finding |
|---|---|---|
| Is DB/context loading slow? | Existing 00060D logs and new pipeline timing fields for destination/context/hotel load | Not the primary root. Context loading is local and now logs duration fields for future comparison. |
| Is Gemini call slow? | Previous runtime evidence showed `gemini_request_started` followed by timeout around the provider call | YES. The provider call is the long section. |
| Is prompt too large? | Observed prompt size was around 6k chars for tested cases | Not proven as the direct root, but prompt size is now logged through `prompt_chars`. |
| Are retries making it slower? | Timeout test covers one LLM call and no persistence | No retry loop was added for timeout. |
| Is model too slow/unavailable? | Provider timeout is now classified as `AI_PROVIDER_TIMEOUT` with `retryable=true` | Possible external provider issue; app now returns a safe 503 contract. |
| Is user unauthenticated? | Earlier runtime log observed `authenticated=false` for one generate attempt | Guest flow may be involved, but it is not the timeout root. |
| Is frontend hiding 503? | New E2E submit-path test returns mocked 503 timeout | Fixed. CreateTrip shows visible actionable Vietnamese copy and does not navigate. |
| Are destination images empty from API? | Home mapping previously let empty API image override local mock image | Fixed. Empty/null/broken URLs now fall back to local/default image. |

## 3. Source changes

| File | Change | Why |
|---|---|---|
| `Frontend/src/app/pages/Home.tsx` | Added destination image resolver, aliases, default image, and `onError` fallback | Prevent empty/null/broken API images from rendering blank cards. |
| `Frontend/src/app/utils/errorHandler.ts` | Added `AI_PROVIDER_TIMEOUT` 503 copy | Make timeout UX clear: no trip was saved and user can retry shorter trips. |
| `Backend/src/core/exceptions.py` | Extended service unavailable payload with optional `error_code` and `retryable` | Preserve 503 status while exposing a structured, user-safe timeout contract. |
| `Backend/src/agent/llm.py` | Gemini timeout now returns `AI_PROVIDER_TIMEOUT` and `retryable=true` | Distinguish timeout from generic provider unavailable errors. |
| `Backend/src/itineraries/pipeline.py` | Added duration fields for destination/context/hotel load, prompt build, and persistence | Make future latency RCA evidence-based without logging secrets or prompt content. |
| `Backend/.env.example` | Documented `AGENT_TIMEOUT_SECONDS=120` for local/staging | Make timeout configurable and realistic for manual smoke runs. |
| `Backend/tests/unit/test_itinerary_pipeline.py` | Added mocked timeout no-persist test | Proves timeout does not save a trip and returns the structured contract. |

## 4. Test changes

| File | What it proves |
|---|---|
| `Frontend/tests/e2e/00060d-home-destination-image-fallback.spec.ts` | Home cards keep non-empty image `src` when API images are empty/null/broken. |
| `Frontend/tests/e2e/00060d-ai-timeout-ux.spec.ts` | CreateTrip handles 503 timeout without Gemini, shows visible alert, stays on form, and re-enables submit. |

## 5. Tests and checks

| Command | Status | Notes |
|---|---|---|
| `npm run build -- --outDir .build-tmp\verify-00060g-ai-image-ux` | PASS | Vite build succeeded; chunk-size warning only. |
| `npx playwright test tests/e2e/00060d-home-destination-image-fallback.spec.ts --reporter=list` | PASS | 1 passed. |
| `npx playwright test tests/e2e/00060d-ai-timeout-ux.spec.ts --reporter=list` | PASS | 1 passed. |
| `npx playwright test --reporter=list` | PASS | 15 passed, 11 skipped. |
| `uv run ruff check src tests` | PASS | Local Ruff cache permission warning is non-blocking. |
| `uv run ruff format --check src tests` | PASS | Backend formatting clean. |
| `uv run alembic check` | PASS | No new upgrade operations detected. |
| `uv run pytest tests/unit/ -v --tb=short` | PASS | 126 passed, 1 warning. |
| `uv run pytest tests/integration/ -v --tb=short -k "generate or itinerary"` | PASS | 17 passed, 9 skipped, 25 deselected. |

## 6. Remaining risks

| Risk | Follow-up |
|---|---|
| Real Gemini can still exceed timeout depending on provider latency, model load, or prompt complexity | Monitor new timing logs in staging and tune provider/model/prompt separately if needed. |
| Timeout hardening does not create an itinerary when provider fails | Expected behavior; user gets retry guidance and no partial trip is persisted. |
| Chat session/message API is still not implemented | Remains C3A/C3B scope. |

## 7. Decision

- Home image fallback: READY
- AI timeout UX: READY
- Backend timeout contract: READY
- Real provider latency fully solved: NO, external/provider-dependent
- Proceed to staging deploy smoke after merge: YES
