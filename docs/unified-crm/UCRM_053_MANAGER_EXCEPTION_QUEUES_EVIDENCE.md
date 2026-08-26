# UCRM-053 Manager Exception Queues Evidence

## Scope

UCRM-053 adds read-only manager exception queues for unassigned, stalled, overdue, commercial approval, and dispatch-handoff CRM exceptions.

## Implementation

- Added the `ucrm.manager-exception-queue/v1` read model and safe error contract.
- Added a repository that builds explainable exception rows from canonical CRM opportunity, quote approval, and dispatch-link records.
- Added a service restricted to management workspace users with organization-scope resolution.
- Added `GET /api/crm/v1/manager-exceptions` with typed safe errors.
- Added offset/limit pagination metadata.

## Controls

- Non-management users are rejected.
- The queue is read-only and does not assign, approve, transition, invoice, sell, deliver, or complete records.
- Every item includes a membership reason, owner label, recommended next inspection action, and source link.

## Verification

- `npx vitest run src/tests/unit/unified-crm-manager-exception-queue-service.test.ts src/tests/unit/unified-crm-manager-exception-queue-route.test.ts`
  passed 4 focused service and route tests.
- `npx eslint src/server/unified-crm/manager-exception-queue-contract.ts src/server/repositories/unified-crm-manager-exception-queue-repository.ts src/server/services/unified-crm-manager-exception-queue-service.ts src/app/api/crm/v1/manager-exceptions/route.ts src/tests/unit/unified-crm-manager-exception-queue-service.test.ts src/tests/unit/unified-crm-manager-exception-queue-route.test.ts --max-warnings=0`
  passed.
- `npx tsc --noEmit` with the CRM/source filter returned only the known unrelated baseline issues in
  `src/features/inventory/service-intake-workspace.tsx` and `src/server/shop-planning/service.ts`.

## Residual Work

- Runtime database proof and authenticated browser proof remain required before marking verified.
- Follow-up slices should add approved manager actions only after command authority is explicitly implemented.
