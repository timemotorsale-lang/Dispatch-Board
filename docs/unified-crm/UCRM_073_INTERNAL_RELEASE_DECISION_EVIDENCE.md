# UCRM-073 Internal Release Decision Evidence

## Scope

UCRM-073 adds the CRM internal release decision gate.

## Implementation

- Added a manager-only internal release decision service and API at `/api/crm/v1/internal-release-decision`.
- Records the required release decision fields: approved cohorts, approved capabilities, known limitations, evidence commit, migration version, and rollback trigger.
- Keeps the decision `HELD` until UCRM-069 through UCRM-072 are approved and the release identity fields are recorded.
- Supports future approved or reduced-scope decisions without enabling anything by default.

## Controls

- Non-management CRM workspaces are denied.
- No cohorts or capabilities are approved while the decision is held.
- Evidence commit, migration version, and rollback trigger are mandatory before enablement.

## Verification

Passed for this checkpoint:

- `npx vitest run src/tests/unit/unified-crm-internal-release-decision-service.test.ts src/tests/unit/unified-crm-internal-release-decision-route.test.ts`
- `npx eslint src/server/unified-crm/internal-release-decision-contract.ts src/server/services/unified-crm-internal-release-decision-service.ts src/app/api/crm/v1/internal-release-decision/route.ts src/tests/unit/unified-crm-internal-release-decision-service.test.ts src/tests/unit/unified-crm-internal-release-decision-route.test.ts --max-warnings=0`
- `npx tsc --noEmit` with the source/test output filtered to `src/server`, `src/features`, `src/app`, and `src/tests`; no source/test errors were emitted.

## Residual Work

- UCRM-073 may only declare internal MVP release after UCRM-069 through UCRM-072 are approved against the same release candidate.
