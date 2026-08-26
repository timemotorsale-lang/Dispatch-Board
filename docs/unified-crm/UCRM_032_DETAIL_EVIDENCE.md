# UCRM-032 Opportunity Detail Read Model Evidence

Date: 2026-08-26

## Scope

UCRM-032 enriches the persisted opportunity detail read model so staff can see the current lifecycle state without guessing from summary text.

## Implemented Read Model

- Current stage, terminal status, version, next action, next action due time, and allowed next moves are exposed under `lifecycle`.
- Recent stage history is read from `UnifiedCrmOpportunityStageEvent`, including prior stage, target stage, actor label, timestamp, and reason.
- The detail screen displays lifecycle status, current version, allowed next moves, direct transition link when movement is available, and recent stage history.
- Customer context, source bridge, same-customer related opportunities, freshness, owner/organization scope, and safe missing/restricted states remain intact.
- Detail remains a read-focused surface. The actual write path stays in the UCRM-031 transition command.

## Verification

- `npx vitest run src/tests/unit/unified-crm-opportunity-detail-repository.test.ts src/tests/unit/unified-crm-opportunity-detail-service.test.ts src/tests/unit/unified-crm-opportunity-detail-page.test.tsx src/tests/unit/unified-crm-opportunity-detail.test.tsx`
- Result: 4 files passed, 31 tests passed.
- `$env:RUN_DATABASE_INTEGRATION='1'; npx vitest run src/tests/integration/unified-crm-opportunity-detail.test.ts`
- Result: 1 file passed, 1 test passed.
- `npx eslint` on touched detail source and tests.
- Result: passed with no warnings for linted files.
- `npx tsc --noEmit 2>&1 | Select-String -Pattern 'src/server|src/features|src/app|src/tests' | Select-String -Pattern 'AppData' -NotMatch`
- Result: only known non-CRM source issues remain in `src/features/inventory/service-intake-workspace.tsx` and `src/server/shop-planning/service.ts`.

## Known Follow-Ups

- Activity stream and task/appointment/dispatch related-work bridges remain reserved for UCRM-035 through UCRM-037.
- Browser proof and UCRM-UXR-3 Product Owner review remain pending.
- Full `npx tsc --noEmit` still exits nonzero because generated Next validator cache and pre-existing non-CRM source issues remain outside this slice.
