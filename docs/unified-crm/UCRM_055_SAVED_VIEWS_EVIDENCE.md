# UCRM-055 Saved Views Evidence

## Scope

UCRM-055 adds durable Unified CRM saved views for repeat CRM navigation and filter workflows.

## Implementation

- Added `UnifiedCrmSavedView` storage with personal/team visibility, config schema version, version, creator, and timestamps.
- Added governed saved-view config normalization for CRM tab, search text, stage filters, owner filter, date window, archived visibility, and sort.
- Added CRM read-policy enforcement so saved views do not grant record access.
- Added manager-only team sharing while allowing sales users to create personal saved views.
- Added `GET`, `POST`, and `DELETE` saved-view APIs under `/api/crm/v1/saved-views`.

## Controls

- Invalid or retired stored filters recover to safe defaults with a user-visible recovery notice.
- Staff see their own personal views and shared team views only.
- Managers can create and delete team views; staff cannot create team views.
- Deleting a personal view requires creator ownership.
- Saved-view config is versioned separately from the row version for future schema migrations.

## Verification

- `npx prisma validate` passed.
- `npx prisma migrate deploy` applied `20260826083000_add_unified_crm_saved_views`.
- `npx vitest run src/tests/unit/unified-crm-saved-view-service.test.ts src/tests/unit/unified-crm-saved-view-route.test.ts` passed 9 tests.
- `RUN_DATABASE_INTEGRATION=1 npx vitest run src/tests/integration/unified-crm-saved-view.test.ts` passed 1 database-backed integration test.
- `npx eslint ... --max-warnings=0` passed for the saved-view contract, repository, service, routes, and tests.
- `npx tsc --noEmit` filtered to source/test paths produced only the existing unrelated baseline errors in `src/features/inventory/service-intake-workspace.tsx` and `src/server/shop-planning/service.ts`.

## Residual Work

- UI saved-view menu wiring and authenticated browser proof remain pending.
- Broader dashboard/search reconciliation proof remains UCRM-056.
