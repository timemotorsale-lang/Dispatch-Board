# UCRM-035 Opportunity Activity And Task Linkage Evidence

Status: `IMPLEMENTED_UNVERIFIED`

Implemented on branch `codex/ucrm-sequential-milestones`.

## What Changed

- Added a governed opportunity task bridge command at `/api/crm/v1/opportunities/[opportunityId]/tasks`.
- Added `UnifiedCrmOpportunityTaskLink` persistence so opportunities can retain linked task activity without making CRM the task source of truth.
- Enabled only the `link-task` opportunity capability in review mode; appointment and dispatch bridge mutations remain held.
- Extended opportunity detail with a task activity panel, linked-task creation form, and recent task-link history.
- Preserved optimistic opportunity version checks while allowing safe idempotent replay after the original command advances the opportunity version.
- Kept task ownership in the existing Dispatch task workflow and wrote command ledger, domain event, audit event, and outbox rows for the opportunity bridge.

## Verification

- `npx vitest run src/tests/unit/unified-crm-opportunity-policy.test.ts src/tests/unit/unified-crm-opportunity-detail-repository.test.ts src/tests/unit/unified-crm-opportunity-detail-service.test.ts src/tests/unit/unified-crm-opportunity-detail.test.tsx src/tests/unit/unified-crm-opportunity-task-bridge-service.test.ts src/tests/unit/unified-crm-opportunity-task-bridge-route.test.ts src/tests/unit/unified-crm-opportunity-task-bridge-repository.test.ts`
  - Passed: 7 files, 28 tests.
- `npx prisma validate`
  - Passed. Prisma emitted the existing package config deprecation warning only.
- `$env:RUN_DATABASE_INTEGRATION='1'; npx vitest run src/tests/integration/unified-crm-opportunity-task-bridge.test.ts`
  - Passed: 1 file, 1 test.
- `$env:RUN_DATABASE_INTEGRATION='1'; npx vitest run src/tests/integration/unified-crm-opportunity-detail.test.ts`
  - Passed: 1 file, 1 test.
- `npx eslint <UCRM-035 changed files> --max-warnings=0`
  - Passed.
- `npx tsc --noEmit 2>&1 | Select-String -Pattern 'src/server|src/features|src/app|src/tests' | Select-String -Pattern 'AppData' -NotMatch`
  - No UCRM-035 CRM source errors found.
  - Existing unrelated errors remain in `src/features/inventory/service-intake-workspace.tsx` and `src/server/shop-planning/service.ts`.

## Remaining Before Approval

- Authenticated browser proof for the opportunity detail task activity form.
- Product Owner review that the wording and workflow match expected CRM staff behavior.
- A later task outcome sync slice for closing/archive history after linked task completion.
