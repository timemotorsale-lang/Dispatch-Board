# UCRM-060 Pilot Data Load Rehearsal Evidence

## Scope

UCRM-060 adds an administrator-assisted dry-run rehearsal for CRM pilot data loading.

## Implementation

- Added a dry-run-only rehearsal service and API at `/api/crm/v1/pilot-data-load-rehearsal`.
- Accepts bounded pilot rows from an approved administrator payload.
- Normalizes customer, contact, opportunity, vehicle, and source-reference fields.
- Detects invalid rows, duplicate rows inside the batch, and duplicate keys already present in CRM/source tables.
- Returns per-record outcomes, counts, checksum, provenance, and backup/restore timing estimates.

## Controls

- The rehearsal writes no customer, opportunity, contact, or vehicle records.
- General Manager access is required.
- Organization scope must resolve to exactly one active organization.
- The report states dry-run mode and administrator-assisted rollback authority.
- Duplicate and invalid outcomes block live-load readiness.

## Verification

- `npx vitest run src/tests/unit/unified-crm-pilot-data-load-rehearsal-service.test.ts src/tests/unit/unified-crm-pilot-data-load-rehearsal-route.test.ts` passed 5 tests.
- `RUN_DATABASE_INTEGRATION=1 npx vitest run src/tests/integration/unified-crm-pilot-data-load-rehearsal.test.ts` passed 1 database-backed integration test.
- `npx eslint ... --max-warnings=0` passed for the rehearsal contract, repository, service, route, and tests.
- `npx tsc --noEmit` filtered to source/test paths produced only the existing unrelated baseline errors in `src/features/inventory/service-intake-workspace.tsx` and `src/server/shop-planning/service.ts`.

## Residual Work

- A real pilot load still requires an approved source file, manual backup confirmation, and administrator signoff.
- No self-service import UI is included in this milestone.
