# UCRM-044 Opportunity Quote Lens Evidence

## Scope

`UCRM-044` adds read-only quote history to the existing opportunity and customer review surfaces:

- Opportunity Detail now includes attached quote records with quote number, draft/presented state, latest version, latest approval status, requested amount, requested discount, and safe version-review links.
- Customer 360 opportunity cards now summarize attached quote records and approval state alongside existing dispatch links.
- Quote lens data is scoped through the same organization/owner visibility rules as the existing opportunity and customer read models.
- Restricted margin, gross, pricing authority thresholds, customer presentation, quote acceptance, and operational conversion remain absent from this lens.

This checkpoint does **not** enable quote presentation, approval threshold automation, customer acceptance, finance handoff, or any downstream operational conversion.

## Files

- `src/server/unified-crm/opportunity-detail-contract.ts`
- `src/server/unified-crm/customer-360-contract.ts`
- `src/server/repositories/unified-crm-opportunity-detail-repository.ts`
- `src/server/repositories/unified-crm-customer-360-repository.ts`
- `src/server/services/unified-crm-opportunity-detail-service.ts`
- `src/server/services/unified-crm-customer-360-service.ts`
- `src/features/unified-crm/unified-crm-opportunity-detail.tsx`
- `src/features/unified-crm/unified-crm-customer-360.tsx`
- `src/tests/integration/unified-crm-opportunity-quote-lens.test.ts`

## Verification

Focused proof passed on 2026-08-26 for:

- `RUN_DATABASE_INTEGRATION=1 npx vitest run src/tests/integration/unified-crm-opportunity-quote-lens.test.ts`
- `npx vitest run src/tests/unit/unified-crm-opportunity-detail-service.test.ts src/tests/unit/unified-crm-opportunity-detail.test.tsx src/tests/unit/unified-crm-customer-360-service.test.ts src/tests/unit/unified-crm-customer-360.test.tsx`
- `npx eslint src/server/unified-crm/opportunity-detail-contract.ts src/server/unified-crm/customer-360-contract.ts src/server/repositories/unified-crm-opportunity-detail-repository.ts src/server/repositories/unified-crm-customer-360-repository.ts src/server/services/unified-crm-opportunity-detail-service.ts src/server/services/unified-crm-customer-360-service.ts src/features/unified-crm/unified-crm-opportunity-detail.tsx src/features/unified-crm/unified-crm-customer-360.tsx src/tests/integration/unified-crm-opportunity-quote-lens.test.ts --max-warnings=0`

The runtime proof seeds a customer, opportunity, quote, quote version, and pending commercial approval request in the migrated PostgreSQL schema. It verifies Opportunity Detail exposes the quote and approval state with a safe approval-request link, and Customer 360 exposes the same quote history through its opportunity lens without restricted financial fields or presentation authority.

The targeted type filter was run on 2026-08-26. It reported only the known unrelated `src/features/inventory/service-intake-workspace.tsx` and `src/server/shop-planning/service.ts` issues already present in the baseline.

## Status

- `UCRM-044`: `IMPLEMENTED_UNVERIFIED`

Browser proof and broader regression proof remain required before this can move beyond `IMPLEMENTED_UNVERIFIED`.
