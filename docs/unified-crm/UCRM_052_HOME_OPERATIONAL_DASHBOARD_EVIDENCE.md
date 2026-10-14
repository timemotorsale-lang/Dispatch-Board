# UCRM-052 CRM Home Operational Dashboard Evidence

## Scope

UCRM-052 adds a read-only operational dashboard to CRM Home with drill-through metrics for owned/team work, overdue follow-up, pipeline, quotes, and dispatch handoffs.

## Implementation

- Added the `ucrm.home-dashboard/v1` read model.
- Added a repository that reconciles open opportunities, overdue next actions, visible quotes, and CRM dispatch handoffs from canonical CRM tables.
- Added a service that applies existing CRM customer visibility policy and single-organization scope.
- Added a compact CRM Home dashboard strip with drill-through links.
- Preserved the existing work queue and source-specific filtering behavior.

## Controls

- Sales users receive owner-scoped counts.
- Management users receive organization-scoped counts.
- The dashboard is read-only and does not create, update, sell, deliver, invoice, export, or complete any record.
- Freshness reports the newest visible source update used by the dashboard.

## Verification

- `npx vitest run src/tests/unit/unified-crm-home-dashboard-service.test.ts src/tests/unit/unified-crm-shell-review.test.tsx`
  passed 18 focused service and shell render tests.
- `npx eslint src/server/unified-crm/home-dashboard-contract.ts src/server/repositories/unified-crm-home-dashboard-repository.ts src/server/services/unified-crm-home-dashboard-service.ts 'src/app/(app)/crm/page.tsx' src/features/unified-crm/unified-crm-shell.tsx src/tests/unit/unified-crm-home-dashboard-service.test.ts src/tests/unit/unified-crm-shell-review.test.tsx --max-warnings=0`
  passed.
- `npx tsc --noEmit` with the CRM/source filter returned only the known unrelated baseline issues in
  `src/features/inventory/service-intake-workspace.tsx` and `src/server/shop-planning/service.ts`.

## Residual Work

- Runtime database proof and authenticated browser drill-through proof remain required before marking verified.
- UCRM-053 should add manager exception queues rather than expanding this dashboard into an action console.
