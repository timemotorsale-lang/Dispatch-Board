# Scheduling Engine Quality Gate

**Work package:** EAPT-025  
**Status:** Implemented as automated quality coverage  
**Purpose:** Prove the E2 scheduling foundation behaves under approved production-shaped load, concurrency, retry, and failure scenarios.

## Enterprise Rule

The scheduling engine cannot be considered ready because individual services pass isolated tests. It must also pass quality-gate scenarios that exercise the E2 services together.

This gate uses the EAPT-011 production baseline as the minimum test profile until the business, operations, and quality reviewers approve replacement values.

## Approved Baseline Covered

The automated quality tests cover:

| Baseline area | Covered value |
| --- | ---: |
| Peak appointments per business day | 125 |
| Peak appointments per hour | 24 |
| Concurrent command-center users | 20 |
| Schedulable resources | 50 |
| Bulk operation appointment limit | 500 |
| Availability search p95 target | 1,500 ms |

## Implemented Quality Scenarios

The quality gate verifies:

- The approved scheduling production profile remains explicit in code.
- Availability search handles the approved peak-hour profile under the p95 target.
- Concurrent exclusive-resource commitments allow exactly one successful commitment.
- Failed reservation transaction adapters do not leave partial reservation state.
- Bulk-reschedule dry run handles the approved 500-appointment bulk limit without executing mutations.

## Implemented Boundary

The implementation lives in:

- `src/tests/unit/appointment-scheduling-engine-quality.test.ts`

The test suite exercises these implemented services together:

- EAPT-014 resource availability
- EAPT-018 hard-conflict evaluation
- EAPT-019 warning evaluation
- EAPT-020 protected reservation commitment
- EAPT-021 availability search
- EAPT-023 bulk-reschedule dry run

## E2 Gate Coverage

This completes the first automated coverage for the E2 scheduling foundation gate:

- Hard conflicts cannot be overridden.
- Warning overrides are manager-only and reasoned.
- Concurrent scheduling cannot overbook exclusive capacity.
- Recurrence and DST behavior passes.
- Bulk operations are previewable, retry-safe, and auditable.
- Availability search and commit behavior reconcile.
- Performance passes approved scheduling volume.

## Not Yet Claimed

This quality gate is still service-boundary coverage. It does not replace future database-backed integration tests, browser workflow tests, production load tests, restore drills, monitoring checks, or release qualification evidence.
