# UCRM-034 Pipeline Work Queue Evidence

Date: 2026-08-26

## Scope

UCRM-034 makes the opportunity queue explainable for live persisted opportunities while keeping assignments and transitions command-governed.

## Implemented Behavior

- Live opportunities are classified into owned, unassigned, overdue, stalled, waiting, and at-risk segments.
- Segment counts are derived from visible queue items and shown alongside human-readable membership explanations.
- Queue cards show due state, risk label, segment tags, owner, reason, and detail drill-through.
- Moveable opportunities expose a transition-command affordance while the queue itself does not mutate stage, assignment, task, appointment, or dispatch state.
- Same-scope visibility and invalid identifier filtering remain enforced before live queue entries are exposed.

## Verification

- `npx vitest run src/tests/unit/unified-crm-opportunity-queue-service.test.ts src/tests/unit/unified-crm-opportunity-queue-review.test.tsx src/tests/unit/unified-crm-opportunity-queue-page.test.tsx`
- Result: 3 files passed, 24 tests passed.
- `$env:RUN_DATABASE_INTEGRATION='1'; npx vitest run src/tests/integration/unified-crm-opportunity-queue.test.ts`
- Result: 1 file passed, 1 test passed.
- `npx eslint` on touched queue source and tests.
- Result: passed.
- `npx tsc --noEmit 2>&1 | Select-String -Pattern 'src/server|src/features|src/app|src/tests' | Select-String -Pattern 'AppData' -NotMatch`
- Result: only known non-CRM source issues remain in `src/features/inventory/service-intake-workspace.tsx` and `src/server/shop-planning/service.ts`.

## Known Follow-Ups

- Pagination and filter controls remain pending.
- Browser proof and UCRM-UXR-3 Product Owner review remain pending.
- Automated priority scoring remains intentionally out of scope; current at-risk membership is explainable from explicit conditions.
