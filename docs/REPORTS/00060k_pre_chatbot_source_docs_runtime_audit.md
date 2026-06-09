# 00060K Pre-Chatbot Source, Docs, and Runtime Audit

Date: 2026-06-07
Branch: `fix/00060-d-local-smoke-ux-data-fix`
Scope: `Frontend/`, `Backend/`, Docker runtime, DB data, `README.md`, `Backend/README.md`, `Frontend/README.md`, `CLAUDE.md`, `AGENTS.md`, `.claude/`, `docs/`, `docs/REPORTS/`, `docs/REPORTS/ISSUES/`

## 1. Audit goal

This audit was done to establish current repo truth before implementing chatbot/C3-C4 work.

The main questions were:

- What is actually implemented in `Frontend/` and `Backend/` today?
- Which docs and reports are stale or overclaim current runtime behavior?
- Which Docker and DB issues are blocking stable FE-BE behavior right now?
- Which bugs must be fixed before chatbot work is safe?

No product/source code was changed in this audit pass. Only audit markdown files were added.

## 2. What was checked

- Read the active repo guidance: `AGENTS.md`, `CLAUDE.md`, `.claude/context/*.md`, `.claude/commands/*.md`, and the key `.claude/skills/*` instructions.
- Read the full source inventory under `Frontend/` and `Backend/`.
- Ran a delegated markdown review pass for all required `.md` files under `docs/`, `docs/REPORTS/`, and `docs/REPORTS/ISSUES/`.
- Checked Docker services, API startup, DB data quality, live endpoints, and one live AI generation request.
- Ran live browser smoke against the real FE-BE stack from `/create-trip` into `TripWorkspace`.
- Checked current logging/observability behavior for backend, frontend, Docker, Postgres, and Redis.
- Read representative backend unit/integration tests and frontend Playwright tests.
- Ran a representative backend unit test slice and a frontend production build.

## 3. Current truth summary

### 3.1 Confirmed runtime status

- `db` and `redis` can start and become healthy.
- `api` initially failed to start because the existing image did not contain `google.genai`, even though `Backend/pyproject.toml` already declares `google-genai`.
- After `docker compose build api` and `docker compose up -d api`, the API became healthy and `/api/v1/health` returned `{"status":"healthy"}`.
- This means the current Docker path is sensitive to stale images and is not robust enough for local verification unless the image is rebuilt.
- `Frontend` also ran successfully on `http://localhost:5173`, but the latest audit artifact showed a PowerShell env-assignment typo while trying to inject `VITE_API_URL`. The app still worked only because `Frontend/src/app/services/api.ts` falls back to `http://localhost:8000`.
- Real integration smoke is not globally broken right now:
  - `Frontend/tests/e2e/auth.spec.ts`: `5 passed`
  - `Frontend/tests/e2e/trips.spec.ts`: `3 passed`

### 3.2 Confirmed DB/data status

- Destination list endpoint works after rebuild.
- `destinations` currently has `10` rows; none are empty, but all `10/10` image values are relative placeholder paths like `/img/destinations/...`.
- `Hà Nội` currently returns the malformed image path `/img/destinations/ha-n-i.jpg`.
- `places` currently has `618` rows and `618/618` have empty `image` values.
- Place search returns real DB-backed places, but the place image field is empty in live responses.
- The frontend currently survives this only because it uses image fallbacks and mock/static backup data in several flows.

### 3.3 Confirmed AI generate status

- Live `POST /api/v1/itineraries/generate` succeeded after rebuild and returned a persisted trip.
- Generated activities still had `image: ""` because the upstream place data currently has no usable image values.
- Generated accommodation came back with `dayIds: [1, 2]` while the persisted trip day IDs were different database IDs, which is a real logic bug.
- A real browser smoke from `/create-trip` also succeeded end-to-end and navigated to `/trip-workspace?tripId=424` with no console or page errors.
- That same live generated trip still rendered `Chưa có nơi ở` in the workspace sidebar even though the DB contained an accommodation row, confirming the `dayIds` bug is visible in the real UI, not only in raw API payloads.

### 3.4 Confirmed logging and observability status

- Backend app logs are structured through `structlog` and emitted to `stdout`; request logs include `request_id`, `method`, `path`, `status_code`, and `duration_ms`.
- The request-correlation path is real and working:
  - `Backend/src/core/middleware/request_id.py` binds `X-Request-ID`
  - live `docker compose logs api` showed `request_completed`, `ai_generate_persisted`, and `ai_generate_completed` events with `request_id`
- SQLAlchemy engine logs are also emitted to container stdout and are currently noisy/duplicated in the Docker log stream.
- Postgres and Redis logs currently live in container stdout/stderr only.
- `docker-compose.yml` does not define a dedicated logging driver, file sink, retention policy, or monitoring/export pipeline.
- Frontend has no centralized telemetry sink; current runtime evidence comes from:
  - browser console output
  - Vite terminal stdout/stderr
  - ad hoc Playwright artifacts under `Frontend/playwright-report`, `Frontend/test-results`, and audit-only `.codex-run-logs/`

## 4. Confirmed findings

### High

#### 4.1 Docker/API startup is fragile because Alembic pulls in AI imports

- `docker compose up -d api` initially failed with `ImportError: cannot import name 'genai' from 'google'`.
- Root cause was a stale image missing `google-genai`.
- Architectural risk remains even after rebuild because `Backend/alembic/env.py` imports `src.itineraries`, which imports `service.py`, which imports `pipeline.py`, which imports `src.agent.llm`.
- Result: an AI dependency problem can break DB migration and API boot, even though migrations should not depend on live AI infrastructure.

#### 4.2 Image/data pipeline is incomplete and explains the current "image not loading" behavior

- Live `GET /api/v1/places/search?city=Hà Nội&limit=3` returned places with `image: ""`.
- `Frontend/src/app/utils/placeImage.ts` explicitly documents that all 618 places currently have empty image fields.
- `Backend/src/etl/transformers/place_transformer.py` is still the source-level reason for this, because it normalizes places with empty image values.
- `Backend/src/etl/loaders/db_loader.py` does not refresh `image`, `avg_cost`, or `opening_hours` in the `on_conflict_do_update()` branch for places, so later ETL runs cannot fully repair existing rows.
- `Frontend/src/app/pages/Home.tsx` already works around this by refusing to use relative `/img/destinations/...` paths from the API and falling back to static external images.

#### 4.3 AI-generated accommodation day mapping is wrong

- Live generate returned a trip whose `days[].id` values were DB IDs, but `accommodations[].dayIds` were still `[1, 2]`.
- `Backend/src/itineraries/pipeline.py` persists `accommodation.day_ids` directly from the AI payload instead of remapping them to the created `TripDay.id` values.
- `Frontend/src/app/hooks/trips/useTripSync.ts` loads accommodations by indexing them with returned `dayIds`, so this mismatch can make generated accommodation display incorrectly or disappear from the expected day.
- Live browser smoke confirmed the UI symptom: the generated trip workspace still showed `Chưa có nơi ở` even though the trip had a persisted accommodation row in the DB.
- This bug is not meaningfully covered by the current test suite.

#### 4.4 Frontend still mixes real backend data with mock/static data in important paths

- `Frontend/src/app/pages/TripWorkspace.tsx` still boots from `initialDays`, `allPlaces`, `availableHotels`, and `availableDestinations` from `tripConstants.ts`.
- `Frontend/src/app/hooks/trips/usePlacesManager.ts` starts from `allPlaces` mock data and only replaces it opportunistically after successful API search.
- `Frontend/src/app/hooks/trips/useAccommodation.ts` still selects hotels from static `availableHotels`.
- `Frontend/src/app/pages/CityDetail.tsx`, `ManualTripSetup.tsx`, `DailyItinerary.tsx`, and `ContextualSuggestionsPanel.tsx` are still not cleanly backend-first.
- This directly contradicts several docs that say the main FE pages are already backend-connected with only fallback mock usage.

#### 4.5 Floating chat is still a placeholder, not chatbot/C3

- `Frontend/src/app/components/FloatingAIChat.tsx` is a local placeholder chat using `setTimeout()` to append a canned AI message.
- There is no real companion REST API behind this UI yet.
- The repo may visually suggest an AI assistant exists, but current behavior is still mock/placeholder.

### Medium

#### 4.6 FE-BE contract bugs exist even where both sides already have endpoints

- `Frontend/src/app/hooks/trips/usePlacesManager.ts` calls `unsavePlace(id)` using the place ID, but the backend DELETE endpoint expects the saved bookmark row ID.
- `Frontend/src/app/hooks/trips/useAccommodation.ts` uses `selectedHotel.pricePerNight`, but the `Hotel` type in `Frontend/src/app/types/trip.types.ts` defines `price`, not `pricePerNight`.
- `Frontend/src/app/hooks/trips/useTripSync.ts` maps accommodations into a `Record<number, Accommodation>` keyed by day ID. When the backend sends invalid `dayIds`, the frontend can duplicate or misplace the same accommodation object.

#### 4.7 Docs and reporting corpus are materially stale

- Active docs still overclaim FE backend integration.
- Endpoint counts and test counts differ across `README.md`, `Backend/README.md`, `Frontend/README.md`, `CLAUDE.md`, `.claude/commands/analyze-project.md`, and `docs/03_backend.md`.
- Some active docs still reference deleted files such as `docs/README.md`.
- Historical reports under `docs/REPORTS/` and `docs/REPORTS/ISSUES/` contain outdated conclusions that are no longer safe to treat as current truth.

#### 4.8 Test counts are high, but logic coverage is not equally strong

- Backend test inventory currently contains `134` unit tests and `51` integration tests.
- Frontend Playwright inventory currently contains `28` e2e tests.
- Live checks in this audit:
  - `Backend`: `49 passed` for a representative slice of itinerary pipeline/service/place/LLM tests.
  - `Frontend`: production build passed.
- However, many current tests still emphasize:
  - request validation
  - auth guards
  - mocked route/UI flows
  - response-shape checks
- Coverage is still weak for the logic failures that matter most right now:
  - generated accommodation day remapping
  - image backfill/update behavior after ETL reruns
  - workspace hotel behavior from generated trips
  - end-to-end bookmark save/unsave row-ID handling
  - mock-vs-BE boundaries in trip editing flows

#### 4.9 Observability is only partially ready for real monitoring

- Backend request/event logging exists and already carries `request_id`, which is a good foundation.
- But current logs are operationally fragile:
  - app/db/redis logs are only available through Docker stdout/stderr
  - there is no repo-native persistent log sink, rotation policy, or dashboard/export setup
  - SQL logs are verbose enough to drown out higher-signal app events during generate flows
- Frontend has no equivalent monitoring path today beyond console output and Playwright artifacts.
- This is enough for local debugging, but not yet enough for reliable long-lived monitoring once chatbot/C3-C4 work increases AI/runtime complexity.

## 5. Documentation audit summary

The delegated markdown pass read all required markdown content and confirmed:

- Required markdown files read in scope: `154`
- Root docs checked: `README.md`, `Backend/README.md`, `Frontend/README.md`, `CLAUDE.md`, `AGENTS.md`
- `.claude/context` files checked: `7`
- `.claude/commands` files checked: `5`
- `docs/*.md` top-level files checked: `17`
- `docs/REPORTS/*.md` checked: `80`
- `docs/REPORTS/ISSUES/*.md` checked: `40`

Most important doc-side conclusions:

- Frontend docs currently overclaim BE integration.
- Current endpoint/test counts are inconsistent across active docs.
- Historical reports are useful as history, but not reliable current-truth artifacts.
- Before chatbot work, repo docs must be re-based onto what the source and runtime actually do now.

## 6. Cleanup candidates

### Safe cleanup candidates after confirmation

- Untracked frontend build artifacts:
  - `Frontend/.build-tmpverify-*`
  - `Frontend/.build-tmp/audit`
- Untracked Playwright output:
  - `test-results/`
- PR-body style report artifacts with low long-term operational value:
  - `docs/REPORTS/pr_*.md`
- Generated Python bytecode folders if present outside ignored scope:
  - `Backend/**/__pycache__/`
  - `Backend/**/*.pyc`

### Keep, even if currently empty

- `Backend/src/etl/extractors/__init__.py`
- `Backend/src/etl/loaders/__init__.py`
- `Backend/src/etl/transformers/__init__.py`

These are empty, but they still serve package/module layout purposes.

### Review-before-delete candidates

- `Frontend/src/app/hooks/useTripState.ts`
- `Frontend/src/styles/fonts.css`

These are currently empty and look unused, but should be confirmed against import references before deletion.

## 7. Recommended fix order before chatbot/C3-C4

### Phase 0. Freeze current truth in docs

- Keep this audit report as the baseline.
- Update `README.md`, `Backend/README.md`, `Frontend/README.md`, `CLAUDE.md`, `.claude/context/00_project_overview.md`, `.claude/commands/analyze-project.md`, `docs/03_backend.md`, and `docs/04_frontend.md`.
- Mark stale historical reports as superseded instead of deleting them blindly.

### Phase 1. Stabilize local runtime first

- Make Docker/API boot reliable without relying on a manual lucky rebuild.
- Reduce or remove Alembic's dependency on AI import paths.
- Fix and document the PowerShell-safe frontend env/start command so local runs do not silently depend on fallback `API_BASE`.
- Recheck the local start flow documented in READMEs after runtime stabilization.

### Phase 2. Fix data and image pipeline

- Decide the real source-of-truth strategy for destination/place images.
- Stop normalizing places with empty image values when source data exists.
- Update ETL upsert logic so reruns can refresh `image`, `avg_cost`, and `opening_hours`.
- Run a backfill ETL or dedicated data repair pass.
- Recheck cache invalidation and frontend image assumptions after the backfill.

### Phase 3. Fix FE-BE contract bugs

- Fix saved-place unsave flow so FE uses saved bookmark row IDs, not place IDs.
- Fix accommodation hotel pricing field mismatch.
- Fix generated accommodation `dayIds` remapping so backend returns real `TripDay.id` values.
- Remove or sharply reduce mock-first initialization in `TripWorkspace` and related hooks/pages.

### Phase 4. Strengthen logic tests

- Add backend tests for:
  - accommodation `dayIds` remapping on generate
  - ETL place upsert refresh behavior
  - image propagation from ETL to generated activities
- Add frontend tests for:
  - save/unsave bookmark with saved row IDs
  - generated trip accommodation rendering
  - backend-first workspace load without mock leakage

### Phase 5. Re-run full FE-BE smoke and update SRS/docs

- Validate:
  - Docker start path
  - frontend PowerShell start path
  - image rendering paths
  - generate flow
  - trip workspace edits
  - saved places
  - hotel/accommodation behavior
  - request/log visibility during runtime failures
- Only after that, sync SRS-style docs and README run guides.

### Phase 6. Start chatbot/C3-C4 work

- Do not treat the current floating chat UI as MVP chatbot readiness.
- Start chatbot work only after runtime, data, and contract stabilization are green.

## 8. Source inventory read in this audit

### 8.1 Backend inventory

```text
Backend\uv.lock
Backend\tests\unit\test_user_service.py
Backend\tests\unit\test_suggestion_service.py
Backend\tests\unit\test_security.py
Backend\tests\unit\test_schema_base.py
Backend\tests\unit\test_request_id_middleware.py
Backend\tests\unit\test_rate_limit_behavior.py
Backend\tests\unit\test_rate_limiter.py
Backend\tests\unit\test_place_service.py
Backend\tests\unit\test_password_reset.py
Backend\tests\unit\test_itinerary_service.py
Backend\tests\unit\test_itinerary_pipeline.py
Backend\tests\unit\test_goong_extractor.py
Backend\tests\unit\test_goong_client.py
Backend\tests\unit\test_goong_api_key_error.py
Backend\tests\unit\test_etl_transformers.py
Backend\tests\unit\test_config.py
Backend\tests\unit\test_auth_service.py
Backend\tests\unit\test_agent_llm.py
Backend\Dockerfile
Backend\config.yaml
Backend\alembic.ini
Backend\README.md
Backend\tests\conftest.py
Backend\pyproject.toml
Backend\tests\integration\test_place_endpoints.py
Backend\tests\integration\test_itinerary_endpoints.py
Backend\tests\integration\test_health_endpoint.py
Backend\tests\integration\test_etl_loader.py
Backend\tests\integration\test_auth_endpoints.py
Backend\tests\integration\test_agent_endpoints.py
Backend\src\__init__.py
Backend\src\shared\__init__.py
Backend\src\shared\service.py
Backend\src\shared\pagination.py
Backend\src\shared\cache.py
Backend\src\places\__init__.py
Backend\src\places\suggestion_service.py
Backend\src\places\service.py
Backend\src\places\schemas.py
Backend\src\places\router.py
Backend\src\places\repository.py
Backend\src\places\models.py
Backend\src\main.py
Backend\alembic\versions\20260525_0005_expand_goong_external_id.py
Backend\alembic\versions\20260525_0004_add_goong_place_metadata.py
Backend\alembic\versions\20260504_0003_add_password_reset_fields.py
Backend\alembic\versions\20260502_0002_sync_etl_schema.py
Backend\alembic\versions\20260428_0001_initial_mvp2_schema.py
Backend\alembic\env.py
Backend\src\itineraries\__init__.py
Backend\src\itineraries\service.py
Backend\src\itineraries\schemas.py
Backend\src\itineraries\router.py
Backend\src\itineraries\repository.py
Backend\src\itineraries\pipeline.py
Backend\src\itineraries\models\__init__.py
Backend\src\itineraries\models\trip.py
Backend\src\itineraries\models\extras.py
Backend\src\itineraries\models\chat.py
Backend\src\core\__init__.py
Backend\src\geo\__init__.py
Backend\src\core\security.py
Backend\src\core\schema.py
Backend\src\core\rate_limiter.py
Backend\src\core\middlewares.py
Backend\src\geo\goong_client.py
Backend\src\etl\__main__.py
Backend\src\etl\__init__.py
Backend\src\core\database.py
Backend\src\core\exceptions.py
Backend\src\core\dependencies.py
Backend\src\core\config.py
Backend\src\core\logger.py
Backend\src\core\middleware\__init__.py
Backend\src\etl\transformers\__init__.py
Backend\src\etl\transformers\place_transformer.py
Backend\src\etl\transformers\hotel_transformer.py
Backend\src\core\middleware\request_id.py
Backend\src\etl\runner.py
Backend\src\etl\base_extractor.py
Backend\src\etl\data\hotels.yaml
Backend\src\etl\loaders\__init__.py
Backend\src\etl\loaders\db_loader.py
Backend\src\auth\dependencies.py
Backend\src\etl\extractors\__init__.py
Backend\src\agent\__init__.py
Backend\src\etl\extractors\osm_extractor.py
Backend\src\etl\extractors\goong_extractor.py
Backend\src\agent\llm.py
Backend\src\agent\config.py
Backend\src\auth\__init__.py
Backend\src\auth\service.py
Backend\src\auth\schemas.py
Backend\src\auth\router.py
Backend\src\auth\repository.py
Backend\src\auth\profile_service.py
Backend\src\auth\models.py
Backend\src\auth\email.py
Backend\src\agent\router.py
Backend\src\agent\schemas\__init__.py
Backend\src\agent\schemas\itinerary_schemas.py
Backend\src\agent\prompts\__init__.py
Backend\src\agent\prompts\itinerary_prompts.py
```

### 8.2 Frontend inventory

```text
Frontend\package-lock.json
Frontend\playwright.config.ts
Frontend\index.html
Frontend\README.md
Frontend\package.json
Frontend\postcss.config.mjs
Frontend\vite.config.ts
Frontend\vercel.json
Frontend\public\app_logo.png
Frontend\tests\unit\savedPlaces.test.mjs
Frontend\src\imports\travel-app-design-audit.json
Frontend\src\styles\index.css
Frontend\src\styles\theme.css
Frontend\src\styles\tailwind.css
Frontend\src\styles\fonts.css
Frontend\src\main.tsx
Frontend\tests\e2e\00056-calendar-debug.spec.ts
Frontend\tests\e2e\00057-destination-readiness.spec.ts
Frontend\tests\e2e\00058-rate-limit-claim.spec.ts
Frontend\tests\e2e\trips.spec.ts
Frontend\tests\e2e\public.spec.ts
Frontend\src\app\utils\tripResponseMapper.ts
Frontend\src\app\utils\tripConstants.ts
Frontend\src\app\utils\timeHelpers.ts
Frontend\src\app\utils\savedPlaces.ts
Frontend\src\app\utils\placeImage.ts
Frontend\src\app\utils\itinerary.ts
Frontend\src\app\utils\errorHandler.ts
Frontend\src\app\utils\analytics.ts
Frontend\src\app\types\trip.types.ts
Frontend\tests\e2e\helpers\calendar.ts
Frontend\tests\e2e\helpers\auth.ts
Frontend\src\app\services\users.ts
Frontend\src\app\services\places.ts
Frontend\src\app\services\itinerary.ts
Frontend\src\app\services\auth.ts
Frontend\src\app\services\api.ts
Frontend\src\app\routes.tsx
Frontend\tests\e2e\b3\flow-c-date-picker.spec.ts
Frontend\tests\e2e\b3\flow-b-workspace.spec.ts
Frontend\tests\e2e\b3\flow-a-hcm-error.spec.ts
Frontend\tests\e2e\auth.spec.ts
Frontend\tests\e2e\00060h-guest-workspace-boundary.spec.ts
Frontend\tests\e2e\00060d-pre-c3a-floating-chat-context.spec.ts
Frontend\tests\e2e\00060d-pre-c3a-429-submit-ux.spec.ts
Frontend\tests\e2e\00060d-home-destination-image-fallback.spec.ts
Frontend\tests\e2e\00060d-ai-timeout-ux.spec.ts
Frontend\src\app\pages\DailyItinerary.tsx
Frontend\src\app\pages\CreateTrip.tsx
Frontend\src\app\pages\CompanionDemo.tsx
Frontend\src\app\pages\CityList.tsx
Frontend\src\app\pages\CityDetail.tsx
Frontend\src\app\pages\BudgetSetup.tsx
Frontend\src\app\pages\Account.tsx
Frontend\src\app\pages\TripWorkspace.tsx
Frontend\src\app\pages\TripPlanning.tsx
Frontend\src\app\pages\TripLibrary.tsx
Frontend\src\app\pages\TripHistory.tsx
Frontend\src\app\pages\TravelersSelection.tsx
Frontend\src\app\pages\SharedTripView.tsx
Frontend\src\app\pages\Settings.tsx
Frontend\src\app\pages\SavedPlaces.tsx
Frontend\src\app\pages\SavedItineraries.tsx
Frontend\src\app\pages\ResetPassword.tsx
Frontend\src\app\pages\Register.tsx
Frontend\src\app\pages\Profile.tsx
Frontend\src\app\pages\Onboarding.tsx
Frontend\src\app\pages\NotFound.tsx
Frontend\src\app\pages\ManualTripSetup.tsx
Frontend\src\app\pages\Login.tsx
Frontend\src\app\pages\ItineraryView.tsx
Frontend\src\app\pages\Home.tsx
Frontend\src\app\pages\ForgotPassword.tsx
Frontend\src\app\pages\DayAllocation.tsx
Frontend\src\app\hooks\useTripState.ts
Frontend\src\app\hooks\useTripCost.ts
Frontend\src\app\hooks\useDestinations.ts
Frontend\src\app\hooks\trips\useTripSync.ts
Frontend\src\app\hooks\trips\usePlacesManager.ts
Frontend\src\app\hooks\trips\useActivityManager.ts
Frontend\src\app\hooks\trips\useAccommodation.ts
Frontend\src\app\data\trips.ts
Frontend\src\app\data\suggestions.ts
Frontend\src\app\data\places.ts
Frontend\src\app\data\homeData.ts
Frontend\src\app\data\destinations.ts
Frontend\src\app\data\cities.ts
Frontend\src\app\data\budget.ts
Frontend\src\app\components\ui\utils.ts
Frontend\src\app\components\ui\use-mobile.ts
Frontend\src\app\components\ui\tooltip.tsx
Frontend\src\app\components\ui\toggle.tsx
Frontend\src\app\components\ui\toggle-group.tsx
Frontend\src\app\components\ui\textarea.tsx
Frontend\src\app\components\ui\tabs.tsx
Frontend\src\app\components\ui\table.tsx
Frontend\src\app\components\ui\switch.tsx
Frontend\src\app\components\ui\sonner.tsx
Frontend\src\app\components\ui\slider.tsx
Frontend\src\app\components\ui\skeleton.tsx
Frontend\src\app\components\ui\sidebar.tsx
Frontend\src\app\components\ui\sheet.tsx
Frontend\src\app\components\ui\separator.tsx
Frontend\src\app\components\ui\select.tsx
Frontend\src\app\components\ui\scroll-area.tsx
Frontend\src\app\components\ui\resizable.tsx
Frontend\src\app\components\ui\radio-group.tsx
Frontend\src\app\components\ui\progress.tsx
Frontend\src\app\components\ui\popover.tsx
Frontend\src\app\components\ui\pagination.tsx
Frontend\src\app\components\ui\navigation-menu.tsx
Frontend\src\app\components\ui\menubar.tsx
Frontend\src\app\components\ui\label.tsx
Frontend\src\app\components\ui\input.tsx
Frontend\src\app\components\ui\input-otp.tsx
Frontend\src\app\components\ui\hover-card.tsx
Frontend\src\app\components\ui\form.tsx
Frontend\src\app\components\ui\dropdown-menu.tsx
Frontend\src\app\components\ui\drawer.tsx
Frontend\src\app\components\ui\dialog.tsx
Frontend\src\app\components\ui\context-menu.tsx
Frontend\src\app\components\ui\command.tsx
Frontend\src\app\components\ui\collapsible.tsx
Frontend\src\app\components\ui\checkbox.tsx
Frontend\src\app\components\ui\chart.tsx
Frontend\src\app\components\ui\carousel.tsx
Frontend\src\app\components\ui\card.tsx
Frontend\src\app\components\ui\calendar.tsx
Frontend\src\app\components\ui\button.tsx
Frontend\src\app\components\ui\breadcrumb.tsx
Frontend\src\app\components\ui\badge.tsx
Frontend\src\app\components\ui\avatar.tsx
Frontend\src\app\components\ui\aspect-ratio.tsx
Frontend\src\app\components\ui\alert.tsx
Frontend\src\app\components\ui\alert-dialog.tsx
Frontend\src\app\components\ui\accordion.tsx
Frontend\src\app\components\TripTimeline.tsx
Frontend\src\app\components\TripSidebar.tsx
Frontend\src\app\components\TripBudgetSidebar.tsx
Frontend\src\app\components\TripAccommodation.tsx
Frontend\src\app\components\TopActionBar.tsx
Frontend\src\app\components\SimpleFooter.tsx
Frontend\src\app\components\SavedSuggestions.tsx
Frontend\src\app\components\ProtectedRoute.tsx
Frontend\src\app\components\PlaceSelectionModal.tsx
Frontend\src\app\components\PlaceInfoModal.tsx
Frontend\src\app\components\OTPModal.tsx
Frontend\src\app\components\LoginRequiredModal.tsx
Frontend\src\app\components\Header.tsx
Frontend\src\app\contexts\AuthContext.tsx
Frontend\src\app\components\FloatingAIChat.tsx
Frontend\src\app\contexts\TripWizardContext.tsx
Frontend\src\app\components\BudgetDetailModal.tsx
Frontend\src\app\components\AddDaysModal.tsx
Frontend\src\app\components\ActivityDetailModal.tsx
Frontend\src\app\App.tsx
Frontend\src\app\components\AIPromoBubble.tsx
Frontend\src\app\components\AuthLayout.tsx
Frontend\src\app\components\AddPlaceModal.tsx
Frontend\src\app\components\BudgetTracker.tsx
Frontend\src\app\components\ContextualSuggestionsPanel.tsx
Frontend\src\app\components\EditTravelersModal.tsx
Frontend\src\app\components\ErrorBoundary.tsx
Frontend\src\app\components\CalendarModal.tsx
Frontend\src\app\components\figma\ImageWithFallback.tsx
Frontend\src\app\components\companion\SmartReminders.tsx
Frontend\src\app\components\companion\PlaceSuggestions.tsx
Frontend\src\app\components\companion\LiveBudgetBar.tsx
Frontend\src\app\components\companion\DailyBrief.tsx
```

## 9. Suggested immediate next actions

1. Fix the two backend/data issues captured in the new issue files created alongside this report.
2. Decide whether we want the next pass to be:
   - runtime/data stabilization first
   - FE-BE contract cleanup first
   - docs sync first after bug fixes land
3. Keep chatbot/C3-C4 work paused until Phases 1-4 above are complete.
