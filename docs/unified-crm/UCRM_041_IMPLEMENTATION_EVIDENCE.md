# UCRM-041 Draft Quote Workflow Implementation Evidence

## Scope

`UCRM-041` now contains the first governed live quote-draft workflow inside Unified CRM:

- quote policy now distinguishes read review from draft authority;
- `/crm/quotes` includes a real draft workspace with create/revise states and honest held messaging for presentation;
- draft create and revise routes write through the CRM quote draft service;
- draft saves remain idempotent, version-aware, and fail closed;
- focused draft route, service, page, and component proof exists.

This checkpoint does **not** enable quote presentation, quote approval, or operational conversion.

## Files

- `src/server/unified-crm/quote-contract.ts`
- `src/server/policies/unified-crm-quote.ts`
- `src/server/unified-crm/quote-access.ts`
- `src/server/unified-crm/quote-foundation-contract.ts`
- `src/server/repositories/unified-crm-quote-foundation-repository.ts`
- `src/server/repositories/unified-crm-quote-draft-repository.ts`
- `src/server/services/unified-crm-quote-foundation-service.ts`
- `src/server/services/unified-crm-quote-draft-service.ts`
- `src/server/unified-crm/quote-draft-access.ts`
- `src/server/unified-crm/quote-draft-command.ts`
- `src/server/unified-crm/quote-draft-contract.ts`
- `src/app/(app)/crm/quotes/page.tsx`
- `src/app/api/crm/v1/quotes/route.ts`
- `src/app/api/crm/v1/quotes/[quoteId]/draft/route.ts`
- `src/features/unified-crm/unified-crm-quote-foundation.tsx`
- `src/features/unified-crm/unified-crm-quote-foundation.module.css`
- `src/features/unified-crm/unified-crm-quote-draft-form.tsx`
- `src/features/unified-crm/unified-crm-quote-return.ts`
- `src/tests/integration/unified-crm-quote-draft-workflow.test.ts`
- `src/tests/unit/unified-crm-quote-draft-service.test.ts`
- `src/tests/unit/unified-crm-quote-draft-route.test.ts`
- `src/tests/unit/unified-crm-quote-foundation-service.test.ts`
- `src/tests/unit/unified-crm-quote-foundation.test.tsx`
- `src/tests/unit/unified-crm-quote-page.test.tsx`

## Verification

Focused verification passed on 2026-08-15 for:

- `src/tests/unit/unified-crm-quote-draft-service.test.ts`
- `src/tests/unit/unified-crm-quote-draft-route.test.ts`
- `src/tests/unit/unified-crm-quote-foundation-service.test.ts`
- `src/tests/unit/unified-crm-quote-foundation.test.tsx`
- `src/tests/unit/unified-crm-quote-page.test.tsx`

Focused packet command:

- `npm test -- --run src/tests/unit/unified-crm-quote-draft-service.test.ts src/tests/unit/unified-crm-quote-draft-route.test.ts src/tests/unit/unified-crm-quote-present-route.test.ts src/tests/unit/unified-crm-quote-foundation-service.test.ts src/tests/unit/unified-crm-quote-foundation.test.tsx src/tests/unit/unified-crm-quote-page.test.tsx src/tests/unit/unified-crm-quote-version-review-service.test.ts src/tests/unit/unified-crm-quote-version-review.test.tsx src/tests/unit/unified-crm-quote-version-review-page.test.tsx`

Migrated runtime proof passed on 2026-08-26 for:

- `RUN_DATABASE_INTEGRATION=1 npx vitest run src/tests/integration/unified-crm-quote-draft-workflow.test.ts`

The runtime proof creates a governed quote draft through the real service and migrated PostgreSQL schema, replays the same idempotency key safely, revises the draft with optimistic version control, rejects a stale revision, and verifies quote record, quote version, command ledger, audit, domain event, aggregate version, and outbox rows. It also verifies the foundation workspace reads the revised terms from the persisted `termsSummary` snapshot while presentation remains held.

## Status

- `UCRM-041`: `IMPLEMENTED_UNVERIFIED`

Authenticated browser proof, broader regression proof, and integrated Product Owner UX checkpoint remain required before `UCRM-041` can move beyond `IMPLEMENTED_UNVERIFIED`.
