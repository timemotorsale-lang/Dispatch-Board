# UCRM-022 Notes and Visibility Checkpoint

**Date:** 2026-08-15

**Implementation baseline:** `aa4a62a9+working`

**Branch:** `codex/unified-crm-console`

**Status:** `IMPLEMENTED_UNVERIFIED`; authenticated browser proof and isolated PostgreSQL proof remain pending

## Delivered boundary

- Customer 360 now contains a hardened note command path through the existing note form and `/api/crm/v1/customers/[customerId]/notes` route.
- The slice supports the currently approved visibility classes only:
  - `INTERNAL`
  - `RESTRICTED`
- Notes remain team context only. They do not notify the customer, do not send external communications, and do not mutate source-owned operational workflows.

## Security and authority

- Blank and oversized customer IDs now fail closed as `INVALID_NOTE_COMMAND`.
- Exact customer authorization now precedes idempotency replay in the note repository.
- Restricted-note creation remains fail-closed behind `crm.sensitive.view`.
- Zero organization scope returns `CUSTOMER_360_NOT_AUTHORIZED`; multiple active scopes return `CUSTOMER_SOURCE_UNAVAILABLE`.
- Replay is now bound to the same authorized customer subject and defensively validated before reuse.
- The route now maps typed note validation errors to the correct status codes and masks unknown failures behind a generic 500 response.
- The note command now uses a dedicated CRM mutation access boundary instead of riding on Customer 360 read access alone.
- Customer 360 only advertises live note entry when shell review, customer-read review, note-command review, and the CRM mutation capability all allow it together.

## Quality and correctness improvements

- The note form now uses stronger honest language around internal-only team context and non-sharing behavior.
- The note form adds accessible disclosure semantics, disabled pending state, helper guidance, and clearer action-copy/status behavior.
- When note entry is unavailable, Customer 360 now renders a fail-closed review-only note state with safe fallback links and explicit “no note was recorded” messaging.

## Automated evidence

- 2026-08-26 refresh: the focused CRM-2 verification batch passed for timeline, manual interaction, notes, next action, task bridge, task handoff, and My Work queue coverage.
- 2026-08-26 refresh command: `npx vitest run src/tests/unit/unified-crm-customer-timeline-repository.test.ts src/tests/unit/unified-crm-customer-interaction-service.test.ts src/tests/unit/unified-crm-customer-interaction-route.test.ts src/tests/unit/unified-crm-customer-interaction-repository.test.ts src/tests/unit/unified-crm-customer-interaction-form.test.tsx src/tests/unit/unified-crm-customer-note-service.test.ts src/tests/unit/unified-crm-customer-note-route.test.ts src/tests/unit/unified-crm-customer-note-repository.test.ts src/tests/unit/unified-crm-customer-note-form.test.tsx src/tests/unit/unified-crm-customer-next-action-access.test.ts src/tests/unit/unified-crm-customer-next-action-service.test.ts src/tests/unit/unified-crm-customer-next-action-route.test.ts src/tests/unit/unified-crm-customer-next-action-repository.test.ts src/tests/unit/unified-crm-customer-next-action-form.test.tsx src/tests/unit/unified-crm-customer-task-bridge-service.test.ts src/tests/unit/unified-crm-customer-task-bridge-route.test.ts src/tests/unit/unified-crm-customer-task-bridge-repository.test.ts src/tests/unit/unified-crm-customer-task-bridge-form.test.tsx src/tests/unit/unified-crm-task-intake-handoff.test.ts src/tests/unit/unified-crm-work-queue-service.test.ts` completed with 20 files and 112 tests passing.
- Focused integrated verification passed:
  - `src/tests/unit/unified-crm-customer-note-service.test.ts`
  - `src/tests/unit/unified-crm-customer-note-route.test.ts`
  - `src/tests/unit/unified-crm-customer-note-repository.test.ts`
  - `src/tests/unit/unified-crm-customer-note-form.test.tsx`
- `src/tests/unit/unified-crm-customer-360-service.test.ts`
- `src/tests/unit/unified-crm-customer-360.test.tsx`
- Result: 6 files, 80 focused packet tests passed on the working baseline together with the adjacent interaction and task-bridge command surfaces.
- Focused ESLint passed on the changed TypeScript and TSX files.

## Remaining gates

- Authenticated browser proof is still required for keyboard/mobile review of note creation and restricted-note visibility behavior.
- Isolated PostgreSQL proof remains required for migrated command persistence/replay before this slice can be promoted beyond `IMPLEMENTED_UNVERIFIED`.
- UCRM-022 is not yet `VERIFIED`, merged, piloted, or production-enabled from this checkpoint.
