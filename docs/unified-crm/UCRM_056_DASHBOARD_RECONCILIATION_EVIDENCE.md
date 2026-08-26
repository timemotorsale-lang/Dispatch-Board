# UCRM-056 Dashboard Reconciliation Gate Evidence

## Scope

UCRM-056 adds a manager-only reconciliation gate for CRM dashboard metrics.

## Implementation

- Added a read-only reconciliation service and API at `/api/crm/v1/dashboard-reconciliation`.
- Reconciles CRM home metric categories to sampled source records for owned/team work, overdue follow-up, pipeline, quotes, and dispatch handoffs.
- Adds freshness, drill-through, masking, performance, and manager-workflow checks.
- Keeps output organization-scoped and manager-only.

## Controls

- The gate exposes operational labels, IDs, hrefs, and timestamps only.
- Email and phone-like contact payloads are treated as masking failures if they appear in sampled labels.
- Non-manager CRM workspaces are denied.
- Ambiguous or missing organization scope fails closed.

## Verification

- `npx vitest run src/tests/unit/unified-crm-dashboard-reconciliation-service.test.ts src/tests/unit/unified-crm-dashboard-reconciliation-route.test.ts` passed 5 tests.
- `RUN_DATABASE_INTEGRATION=1 npx vitest run src/tests/integration/unified-crm-dashboard-reconciliation.test.ts` passed 1 database-backed integration test.
- `npx eslint ... --max-warnings=0` passed for the reconciliation contract, repository, service, route, and tests.
- `npx tsc --noEmit` filtered to source/test paths produced only the existing unrelated baseline errors in `src/features/inventory/service-intake-workspace.tsx` and `src/server/shop-planning/service.ts`.

## Residual Work

- Authenticated browser proof and full dashboard UX review remain pending.
