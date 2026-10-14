# UCRM-031 Governed Stage Transition Evidence

Date: 2026-08-26

## Scope

UCRM-031 turns the opportunity transition surface from held review into a governed live command path. It allows authorized CRM users to move a persisted opportunity only along the approved lifecycle graph:

- `NEW_INQUIRY` -> `QUALIFIED` or `LOST`
- `QUALIFIED` -> `APPOINTMENT_SET`, `WORKING_DEAL`, or `LOST`
- `APPOINTMENT_SET` -> `WORKING_DEAL`, `CUSTOMER_DECIDING`, or `LOST`
- `WORKING_DEAL` -> `QUOTE_PRESENTED`, `CUSTOMER_DECIDING`, or `LOST`
- `QUOTE_PRESENTED` -> `CUSTOMER_DECIDING`, `WON`, or `LOST`
- `CUSTOMER_DECIDING` -> `QUOTE_PRESENTED`, `WON`, or `LOST`
- `WON` and `LOST` are terminal until a later manager reopen control is approved.

## Implemented Controls

- Active target stages require a next action and due time.
- `WON` requires acceptance evidence and a handoff target, and cannot keep an active next action.
- `LOST` requires a lost reason, and cannot keep an active next action.
- The command requires expected version and idempotency key.
- Invalid edges are rejected inside the serializable database transaction before any opportunity update.
- Each successful move updates the opportunity stage and version, writes stage history, command ledger, domain event, audit event, and outbox message.
- Replays with the same idempotency key and same request hash return the stored receipt.
- Later task, appointment, and dispatch bridge mutations remain held for their own milestones.

## Verification

- `npx vitest run src/tests/unit/unified-crm-opportunity-policy.test.ts src/tests/unit/unified-crm-opportunity-transition-service.test.ts src/tests/unit/unified-crm-opportunity-transition-command-service.test.ts src/tests/unit/unified-crm-opportunity-transition-route.test.ts src/tests/unit/unified-crm-opportunity-transition-review.test.tsx src/tests/unit/unified-crm-opportunity-transition-page.test.tsx`
- Result: 6 files passed, 23 tests passed.
- `$env:RUN_DATABASE_INTEGRATION='1'; npx vitest run src/tests/integration/unified-crm-opportunity-create.test.ts`
- Result: 1 file passed, 1 test passed.
- `$env:RUN_DATABASE_INTEGRATION='1'; npx vitest run src/tests/integration/unified-crm-opportunity-transition.test.ts`
- Result: 1 file passed, 1 test passed.
- `npx eslint` on the touched CRM transition files and tests.
- Result: passed.
- `npx tsc --noEmit 2>&1 | Select-String -Pattern 'unified-crm|api/crm/v1/opportunities/.+transition'`
- Result: no CRM transition type errors reported.

## Known Follow-Ups

- Full `npx tsc --noEmit` still exits nonzero because generated Next validator cache and pre-existing non-CRM inventory/shop-planning type issues remain outside this slice.
- Running both CRM opportunity database integration files concurrently can hit PostgreSQL serializable transaction retry noise. Each proof passes independently.
- Browser proof and UCRM-UXR-3 Product Owner review remain pending.
- UCRM-033 must reuse this same command from the visual pipeline board and keyboard alternative.
