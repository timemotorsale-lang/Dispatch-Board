# UCRM-071 Release-Candidate Validation Evidence

## Scope

UCRM-071 adds the CRM release-candidate validation gate.

## Implementation

- Added a manager-only release-candidate validation service and API at `/api/crm/v1/release-candidate-validation`.
- Requires UCRM-060 through UCRM-067 evidence to be current against the exact release-candidate commit and production configuration.
- Records the release-candidate commit and migration version as pending until they are known.
- Keeps validation `HELD` while any required evidence needs rerun or remains held.

## Controls

- Non-management CRM workspaces are denied.
- Validation cannot pass unless every evidence row is confirmed current.
- The API lists the exact required action for each stale or held evidence row.

## Verification

Passed for this checkpoint:

- `npx vitest run src/tests/unit/unified-crm-release-candidate-validation-service.test.ts src/tests/unit/unified-crm-release-candidate-validation-route.test.ts`
- `npx eslint src/server/unified-crm/release-candidate-validation-contract.ts src/server/services/unified-crm-release-candidate-validation-service.ts src/app/api/crm/v1/release-candidate-validation/route.ts src/tests/unit/unified-crm-release-candidate-validation-service.test.ts src/tests/unit/unified-crm-release-candidate-validation-route.test.ts --max-warnings=0`
- `npx tsc --noEmit` with the source/test output filtered to `src/server`, `src/features`, `src/app`, and `src/tests`; no source/test errors were emitted.

## Residual Work

- Rerun or accept UCRM-060 through UCRM-067 evidence on the final release-candidate commit before UCRM-073 can declare internal release.
