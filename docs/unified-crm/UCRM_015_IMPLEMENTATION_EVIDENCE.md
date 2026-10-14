# UCRM-015 Customer/Contact Controlled Edit Evidence

## Scope

UCRM-015 adds a bounded customer/contact edit command for the CRM Customer 360 surface.

## Implementation

- Added guarded PATCH API `/api/crm/v1/customers/[customerId]/edit`.
- Supports approved edits only: display name, email, phone number, and preferred contact method.
- Requires CRM mutation access, CRM shell/read review mode, one active organization scope, idempotency key, edit reason, and optimistic `expectedVersion`.
- Persists through a serializable transaction with customer/contact-point updates, aggregate versioning, command ledger, domain event, audit event, and outbox message.
- Replays duplicate idempotency keys safely and rejects conflicting replay or stale versions.

## Controls

- Sales users remain owner-scoped; managers remain organization-scoped.
- Blank/no-op edits fail closed.
- Contact values are normalized before persistence and command hashing.
- This slice does not perform duplicate merge or external communication.

## Verification

Passed for this checkpoint:

- `npx vitest run src/tests/unit/unified-crm-customer-controlled-edit-service.test.ts src/tests/unit/unified-crm-customer-controlled-edit-route.test.ts src/tests/unit/unified-crm-customer-duplicate-candidate-service.test.ts src/tests/unit/unified-crm-customer-duplicate-candidate-route.test.ts`
- `npx eslint src/server/unified-crm/customer-controlled-edit-command.ts src/server/unified-crm/customer-controlled-edit-access.ts src/server/repositories/unified-crm-customer-controlled-edit-repository.ts src/server/services/unified-crm-customer-controlled-edit-service.ts src/app/api/crm/v1/customers/[customerId]/edit/route.ts src/server/unified-crm/customer-duplicate-candidate-contract.ts src/server/repositories/unified-crm-customer-duplicate-candidate-repository.ts src/server/services/unified-crm-customer-duplicate-candidate-service.ts src/app/api/crm/v1/customers/[customerId]/duplicate-candidates/route.ts src/tests/unit/unified-crm-customer-controlled-edit-service.test.ts src/tests/unit/unified-crm-customer-controlled-edit-route.test.ts src/tests/unit/unified-crm-customer-duplicate-candidate-service.test.ts src/tests/unit/unified-crm-customer-duplicate-candidate-route.test.ts --max-warnings=0`
- `npx tsc --noEmit` with the source/test output filtered to `src/server`, `src/features`, `src/app`, and `src/tests`; no source/test errors were emitted.

## Residual Work

- Authenticated browser proof and isolated PostgreSQL proof remain pending before promotion beyond `IMPLEMENTED_UNVERIFIED`.
