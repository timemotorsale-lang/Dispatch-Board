# UCRM-033 Visual Pipeline Board Evidence

Date: 2026-08-26

## Scope

UCRM-033 upgrades the CRM pipeline board from synthetic-only preview columns to a live, permission-filtered lifecycle board when persisted opportunities exist.

## Implemented Behavior

- Pipeline preview records now include stage, next action, due time, and version.
- Persisted opportunities are grouped into the approved lifecycle stage columns.
- Each board card shows customer, owner, next action, due state, stage, and version.
- Moveable cards link into the UCRM-031 governed transition command instead of mutating from drag/drop directly.
- The existing list collection remains as the keyboard/non-drag drill-through alternative.
- Empty or no-live-record states keep the earlier synthetic preview board so review pages remain usable.

## Verification

- `npx vitest run src/tests/unit/unified-crm-opportunity-read-service.test.ts src/tests/unit/unified-crm-opportunity-preview-repository.test.ts src/tests/unit/unified-crm-opportunity-preview.test.tsx`
- Result: 3 files passed, 13 tests passed.
- `$env:RUN_DATABASE_INTEGRATION='1'; npx vitest run src/tests/integration/unified-crm-opportunity-pipeline.test.ts`
- Result: 1 file passed, 1 test passed.
- `npx eslint` on touched pipeline source and tests.
- Result: passed.
- `npx tsc --noEmit 2>&1 | Select-String -Pattern 'src/server|src/features|src/app|src/tests' | Select-String -Pattern 'AppData' -NotMatch`
- Result: only known non-CRM source issues remain in `src/features/inventory/service-intake-workspace.tsx` and `src/server/shop-planning/service.ts`.

## Known Follow-Ups

- Drag/drop as a direct gesture remains pending; the safe alternative is the command link on each moveable card.
- Browser proof and UCRM-UXR-3 Product Owner review remain pending.
- Activity/task/appointment/dispatch relationships remain reserved for UCRM-035 through UCRM-037.
