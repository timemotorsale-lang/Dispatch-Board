# UCRM-038 Customer 360 Opportunity Lens Evidence

UCRM-038 expands Customer 360 so a customer record shows authorized persisted opportunities together with linked Dispatch work reconciled from the opportunity bridge records.

## Implemented

- Extended the Customer 360 opportunity lens contract with stage, dispatch link count, and safe repair-order/repair-job link summaries.
- Added a tenant- and owner-scoped raw dispatch-link read so Customer 360 does not depend on regenerated Prisma relation metadata while the local generated client is locked.
- Updated Customer 360 service shaping to reconcile dispatch links by opportunity number and expose a total linked Dispatch count.
- Updated the Customer 360 UI to show visible opportunity count, dispatch-link count, opportunity stage, and linked repair identifiers under each opportunity card.
- Preserved read-only behavior: Customer 360 does not mutate opportunities, repair orders, repair jobs, or dispatch links.

## Verification

- `npx vitest run src/tests/unit/unified-crm-customer-360-service.test.ts src/tests/unit/unified-crm-customer-360-repository.test.ts src/tests/unit/unified-crm-customer-360.test.tsx`
  - Passed: 3 files, 36 tests.
- `$env:RUN_DATABASE_INTEGRATION='1'; npx vitest run src/tests/integration/unified-crm-customer-360-opportunity-lens.test.ts`
  - Passed: real customer, opportunity, repair order, dispatch link, and Customer 360 readback.
- `npx eslint <UCRM-038 changed files and tests> --max-warnings=0`
  - Passed.
- `npx tsc --noEmit 2>&1 | Select-String -Pattern 'src/server|src/features|src/app|src/tests' | Select-String -Pattern 'AppData' -NotMatch`
  - No UCRM-038 CRM source errors found.
  - Existing unrelated errors remain in `src/features/inventory/service-intake-workspace.tsx` and `src/server/shop-planning/service.ts`.

## Remaining

- Authenticated browser proof over a data-bearing Customer 360 record.
- Final Product Owner UXR-3 review.
- Later slices can add richer quote/dispatch drilldowns and pagination if opportunity history grows beyond the bounded lens.
