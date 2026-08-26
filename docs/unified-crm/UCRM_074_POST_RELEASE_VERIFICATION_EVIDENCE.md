# UCRM-074 Post-Release Verification Evidence

## Scope

UCRM-074 adds the CRM post-release verification gate.

## Implementation

- Added a manager-only post-release verification service and API at `/api/crm/v1/post-release-verification`.
- Tracks smoke workflows, reconciliation, alerts, error/latency/freshness, audit delivery, and support intake after controlled enablement.
- Keeps health `PENDING_ENABLEMENT` until checks are run after UCRM-073 approval.
- Marks rollback-required checks so failed critical controls can trigger rollback criteria.

## Controls

- Non-management CRM workspaces are denied.
- Release cannot be declared healthy before post-release checks pass.
- Critical post-release checks are explicitly tied to rollback criteria.

## Verification

Passed for this checkpoint:

- `npx vitest run src/tests/unit/unified-crm-post-release-verification-service.test.ts src/tests/unit/unified-crm-post-release-verification-route.test.ts`
- `npx eslint src/server/unified-crm/post-release-verification-contract.ts src/server/services/unified-crm-post-release-verification-service.ts src/app/api/crm/v1/post-release-verification/route.ts src/tests/unit/unified-crm-post-release-verification-service.test.ts src/tests/unit/unified-crm-post-release-verification-route.test.ts --max-warnings=0`
- `npx tsc --noEmit` with the source/test output filtered to `src/server`, `src/features`, `src/app`, and `src/tests`; no source/test errors were emitted.

## Residual Work

- After UCRM-073 approved enablement, run these checks live and mark the release healthy, held, or rollback-required based on actual evidence.
