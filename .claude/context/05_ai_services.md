# 05 AI Services

## Purpose

Tom tat AI architecture de Claude code dung direct pipeline, dung patch-confirm flow, va khong over-engineer.

## Current truth

- MVP1 dung raw Gemini SDK + parse JSON thu cong
- FE moi co FloatingAIChat va DailyItinerary con mock/local behavior o nhieu cho
- Multi-agent can duoc dung vua du, khong phai cho moi request

## Target state

- `ItineraryPipeline` direct structured-output cho generate
- `CompanionService` cho chat/tool-calling va patch proposals
- `TravelSupervisor` chi route natural-language chat/analytics
- `SuggestionService` la DB-only service
- `AnalyticsWorker` optional/MVP2+ va phai co guardrails
- Chat history projection qua `chat_sessions` + `chat_messages`

## Key invariants

- Generate khong qua Supervisor
- Companion tra `requiresConfirmation` + `proposedOperations`
- BE khong tu apply patch neu user chua confirm
- Suggest alternatives la DB-only, khong goi LLM
- Analytics Text-to-SQL chi bat khi co allowlist, read-only role, validator, max rows, audit log
- Output AI phai di qua validation pipeline/structured output

## Do next

- Refactor generate sang structured output pipeline
- Tao tools cho companion doc trip, de xuat patch, tra response co confirmation
- Tao chat session/message persistence
- Them WebSocket/API contract cho chat
- De optional analytics sau core AI flows

## Do not do

- Khong parse text AI bang `json.loads()` nhu main path neu da co structured output
- Khong doi ten DB-only service thanh "agent" neu no khong goi model
- Khong tu persist thay doi lich trinh tu chat message
- Khong day analytics vao MVP2 core neu guardrails chua co

## Acceptance checkpoints

- Generate trip on dinh voi structured output
- Chat flow tra patch-confirm dung contract
- Chat history doc lai duoc tu DB projection
- Analytics van de optional va bi khoa neu chua dat guardrails

## Read more

- `../../plan/04_ai_agent_plan.md`
- `../../plan/12_be_crud_endpoints.md`
- `../../plan/14_config_plan.md`
- `../../plan/16_unit_test_specs.md`
