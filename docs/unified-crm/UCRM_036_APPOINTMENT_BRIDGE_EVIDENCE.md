# UCRM-036 Appointment Bridge Evidence

Status: `IMPLEMENTED_UNVERIFIED`

Implemented on branch `codex/ucrm-sequential-milestones`.

## What Changed

- Added a governed opportunity appointment bridge command at `/api/crm/v1/opportunities/[opportunityId]/appointments`.
- Added `UnifiedCrmOpportunityAppointmentLink` persistence so opportunities retain linked appointment activity without making CRM the scheduling source of truth.
- Enabled only `link-appointment` in review mode alongside create, transition, and task linkage; dispatch remains held.
- Reused the existing appointment command engine for `CREATE_DRAFT` instead of creating a parallel appointment writer.
- Extended opportunity detail with a draft appointment panel and appointment-link history.
- Preserved opportunity optimistic version checks and safe idempotent replay when the underlying appointment command has already completed.

## Verification

- `npx vitest run src/tests/unit/unified-crm-opportunity-policy.test.ts src/tests/unit/unified-crm-opportunity-detail-repository.test.ts src/tests/unit/unified-crm-opportunity-detail-service.test.ts src/tests/unit/unified-crm-opportunity-detail.test.tsx src/tests/unit/unified-crm-opportunity-appointment-bridge-service.test.ts src/tests/unit/unified-crm-opportunity-appointment-bridge-route.test.ts`
  - Passed: 6 files, 26 tests.
- `npx prisma validate`
  - Passed. Prisma emitted the existing package config deprecation warning only.
- `npx prisma migrate deploy`
  - Applied `20260826050000_add_unified_crm_opportunity_appointment_link`.
- `$env:RUN_DATABASE_INTEGRATION='1'; npx vitest run src/tests/integration/unified-crm-opportunity-appointment-bridge.test.ts`
  - Passed: 1 file, 1 test.
- `$env:RUN_DATABASE_INTEGRATION='1'; npx vitest run src/tests/integration/unified-crm-opportunity-detail.test.ts`
  - Passed: 1 file, 1 test.
- `npx eslint <UCRM-036 changed files> --max-warnings=0`
  - Passed.
- `npx tsc --noEmit 2>&1 | Select-String -Pattern 'src/server|src/features|src/app|src/tests' | Select-String -Pattern 'AppData' -NotMatch`
  - No UCRM-036 CRM source errors found.
  - Existing unrelated errors remain in `src/features/inventory/service-intake-workspace.tsx` and `src/server/shop-planning/service.ts`.

## Remaining Before Approval

- Authenticated browser proof for the opportunity detail appointment bridge form.
- Product Owner review that location/time wording fits dealership scheduling workflow.
- Later support for linking an already-existing appointment, if needed by operations.
