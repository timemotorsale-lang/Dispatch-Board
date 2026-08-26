# UCRM-043 Commercial Approval Request Evidence

## Scope

`UCRM-043` adds the first internal commercial approval request and decision workflow for Unified CRM quotes:

- additive approval request and approval decision tables;
- quote-version-bound approval requests with amount, discount, purpose, reason, requester, and policy snapshot;
- manager decision commands for approve, return, and deny outcomes;
- separation-of-duties protection so the requester cannot approve their own request;
- idempotent request and decision replay through the enterprise command ledger;
- audit, domain event, aggregate version, and outbox evidence for requested and decided approval events;
- typed API routes for quote approval requests and approval decisions.

This checkpoint does **not** enable customer-facing quote presentation, operational conversion, quote acceptance, finance handoff, or numeric threshold automation. `UCRM-DEC-013` remains deferred, so no dollar or discount threshold is inferred by this slice.

## Files

- `prisma/schema.prisma`
- `prisma/migrations/20260826070000_add_unified_crm_commercial_approval/migration.sql`
- `src/server/unified-crm/commercial-approval-command.ts`
- `src/server/repositories/unified-crm-commercial-approval-repository.ts`
- `src/server/services/unified-crm-commercial-approval-service.ts`
- `src/app/api/crm/v1/quotes/[quoteId]/commercial-approvals/route.ts`
- `src/app/api/crm/v1/commercial-approvals/[requestId]/decision/route.ts`
- `src/tests/unit/unified-crm-commercial-approval-service.test.ts`
- `src/tests/unit/unified-crm-commercial-approval-route.test.ts`
- `src/tests/integration/unified-crm-commercial-approval.test.ts`

## Verification

Migration and focused proof passed on 2026-08-26 for:

- `npx prisma validate`
- `npx prisma migrate deploy`
- `npx vitest run src/tests/unit/unified-crm-commercial-approval-service.test.ts src/tests/unit/unified-crm-commercial-approval-route.test.ts`
- `RUN_DATABASE_INTEGRATION=1 npx vitest run src/tests/integration/unified-crm-commercial-approval.test.ts`
- `npx eslint src/server/unified-crm/commercial-approval-command.ts src/server/repositories/unified-crm-commercial-approval-repository.ts src/server/services/unified-crm-commercial-approval-service.ts src/app/api/crm/v1/quotes/[quoteId]/commercial-approvals/route.ts src/app/api/crm/v1/commercial-approvals/[requestId]/decision/route.ts src/tests/unit/unified-crm-commercial-approval-service.test.ts src/tests/unit/unified-crm-commercial-approval-route.test.ts src/tests/integration/unified-crm-commercial-approval.test.ts --max-warnings=0`

The runtime proof creates a quote draft, requests commercial approval for the exact draft version, replays the request idempotently, blocks salesperson decision attempts, blocks manager self-approval on a manager-created request, records an independent manager approval, replays the decision idempotently, blocks a second decision on the closed request, and verifies request, decision, command ledger, audit, domain event, aggregate version, and outbox rows.

The targeted type filter was run on 2026-08-26. It reported only the known unrelated `src/features/inventory/service-intake-workspace.tsx` and `src/server/shop-planning/service.ts` issues already present in the baseline.

## Status

- `UCRM-043`: `IMPLEMENTED_UNVERIFIED`

Browser and broader regression proof remain required before this can move beyond `IMPLEMENTED_UNVERIFIED`.
