# UCRM-037 Dispatch Bridge Evidence

UCRM-037 adds a governed dispatch bridge from a persisted CRM opportunity to existing Dispatch/Repair work without moving repair-order or repair-job authority into CRM.

## Implemented

- Added durable `UnifiedCrmOpportunityDispatchLink` persistence for repair-order and repair-job links with target snapshots, creator, command id, archive state, and tenant indexes.
- Enabled the `link-dispatch` opportunity capability only in REVIEW mode for authorized CRM mutators.
- Added an idempotent `CRM_OPPORTUNITY_DISPATCH_BRIDGE_LINK` command with opportunity version, dispatch target version, tenant scope, command ledger, domain event, audit event, and outbox writes in one transaction.
- Added `/api/crm/v1/opportunities/[opportunityId]/dispatch` for governed link creation.
- Extended the opportunity detail read model and UI with dispatch activity, link history, and a form to link existing repair orders or repair jobs while Dispatch remains authoritative.

## Verification

- `npx vitest run src/tests/unit/unified-crm-opportunity-policy.test.ts src/tests/unit/unified-crm-opportunity-detail-repository.test.ts src/tests/unit/unified-crm-opportunity-detail-service.test.ts src/tests/unit/unified-crm-opportunity-detail.test.tsx src/tests/unit/unified-crm-opportunity-dispatch-bridge-service.test.ts src/tests/unit/unified-crm-opportunity-dispatch-bridge-route.test.ts src/tests/unit/unified-crm-opportunity-dispatch-bridge-repository.test.ts`
  - Passed: 7 files, 31 tests.
- `npx prisma validate`
  - Passed with the existing Prisma config deprecation warning.
- `npx prisma migrate deploy`
  - Applied `20260826053000_add_unified_crm_opportunity_dispatch_link`.
- `$env:RUN_DATABASE_INTEGRATION='1'; npx vitest run src/tests/integration/unified-crm-opportunity-dispatch-bridge.test.ts`
  - Passed: links an existing repair order, replays idempotently, and reads the link back through opportunity detail.
- `$env:RUN_DATABASE_INTEGRATION='1'; npx vitest run src/tests/integration/unified-crm-opportunity-detail.test.ts`
  - Passed sequentially. A combined parallel run can hit expected serializable transaction contention, so the database proofs were executed one after another.
- `npx eslint <UCRM-037 changed files and tests> --max-warnings=0`
  - Passed.
- `npx tsc --noEmit 2>&1 | Select-String -Pattern 'src/server|src/features|src/app|src/tests' | Select-String -Pattern 'AppData' -NotMatch`
  - No UCRM-037 CRM source errors found.
  - Existing unrelated errors remain in `src/features/inventory/service-intake-workspace.tsx` and `src/server/shop-planning/service.ts`.

## Remaining

- Browser proof in an authenticated CRM session.
- Final Product Owner UXR-3 review.
- Later UCRM slices can add richer existing-record search/pickers and optional repair-job creation when the approved operational ownership rules are ready.
