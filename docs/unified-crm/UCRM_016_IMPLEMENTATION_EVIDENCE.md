# UCRM-016 Duplicate Candidate Warning Evidence

## Scope

UCRM-016 adds deterministic duplicate-candidate warnings for CRM customer/contact edits.

## Implementation

- Added warning-only GET API `/api/crm/v1/customers/[customerId]/duplicate-candidates`.
- Matches candidate customers by normalized email, normalized phone, and normalized display name.
- Returns masked candidate contact details, source links, match explanations, and a score.
- Explicitly returns `warningOnly: true`; the service performs no merge and no automatic customer mutation.

## Controls

- Reuses CRM customer read policy and active organization scope.
- Sales users remain owner-scoped; managers remain organization-scoped.
- Duplicate warning can be disabled independently and fails closed.
- Candidate contact values are masked in the response.

## Verification

Passed for this checkpoint:

- `npx vitest run src/tests/unit/unified-crm-customer-controlled-edit-service.test.ts src/tests/unit/unified-crm-customer-controlled-edit-route.test.ts src/tests/unit/unified-crm-customer-duplicate-candidate-service.test.ts src/tests/unit/unified-crm-customer-duplicate-candidate-route.test.ts`
- `npx eslint src/server/unified-crm/customer-controlled-edit-command.ts src/server/unified-crm/customer-controlled-edit-access.ts src/server/repositories/unified-crm-customer-controlled-edit-repository.ts src/server/services/unified-crm-customer-controlled-edit-service.ts src/app/api/crm/v1/customers/[customerId]/edit/route.ts src/server/unified-crm/customer-duplicate-candidate-contract.ts src/server/repositories/unified-crm-customer-duplicate-candidate-repository.ts src/server/services/unified-crm-customer-duplicate-candidate-service.ts src/app/api/crm/v1/customers/[customerId]/duplicate-candidates/route.ts src/tests/unit/unified-crm-customer-controlled-edit-service.test.ts src/tests/unit/unified-crm-customer-controlled-edit-route.test.ts src/tests/unit/unified-crm-customer-duplicate-candidate-service.test.ts src/tests/unit/unified-crm-customer-duplicate-candidate-route.test.ts --max-warnings=0`
- `npx tsc --noEmit` with the source/test output filtered to `src/server`, `src/features`, `src/app`, and `src/tests`; no source/test errors were emitted.

## Residual Work

- Authenticated browser proof and isolated PostgreSQL proof remain pending before promotion beyond `IMPLEMENTED_UNVERIFIED`.
