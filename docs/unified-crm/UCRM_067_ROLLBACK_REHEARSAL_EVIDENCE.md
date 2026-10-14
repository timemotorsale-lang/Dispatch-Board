# UCRM-067 Rollback Rehearsal Evidence

## Scope

UCRM-067 adds the CRM rollback rehearsal package.

## Implementation

- Added a manager-only rollback rehearsal service and API at `/api/crm/v1/rollback-rehearsal`.
- Added a rollback rehearsal runbook at `docs/unified-crm/UCRM_067_ROLLBACK_REHEARSAL.md`.
- Covers kill switches, prior-release recovery, in-flight writes, retained evidence, existing Customers/Sales fallback, restore timing, and decision logging.

## Controls

- Non-management CRM workspaces are denied.
- Every rehearsal step has an owner and required evidence.
- The package stays `HELD` until measured restore timing and rollback decision authority are recorded.

## Verification

- `npx vitest run src/tests/unit/unified-crm-rollback-rehearsal-service.test.ts src/tests/unit/unified-crm-rollback-rehearsal-route.test.ts` passed 4 tests.
- `npx eslint ... --max-warnings=0` passed for the rollback rehearsal contract, service, route, and tests.
- `npx tsc --noEmit` filtered to source/test paths emitted no source/test errors.

## Residual Work

- Execute the rehearsal against the release candidate and attach measured recovery timings before UCRM-069 go/no-go.
