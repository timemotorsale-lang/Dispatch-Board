# Phase TA-G3 Implementation Schedule — Employee and Manager Workflows

## Branch

`codex/time-attendance-g3-workflows`

## Phase purpose

Phase TA-G3 turns the Time & Attendance foundation into the first usable staff and manager workflow layer. It should be implemented slice by slice, in order, with each slice ending in docs updates, tests, and validation before the next slice begins.

This phase belongs to the CCC Time & Attendance console. It must not be implemented as a Dispatch console feature.

## Recommended implementation instruction

Use this prompt when you are ready to start the phase:

```text
Implement Phase TA-G3 — Employee and Manager Workflows on branch codex/time-attendance-g3-workflows.

Work slice by slice in this exact order:
TA-030, TA-031, TA-032, TA-033, TA-034, TA-035.

For each slice:
1. implement the smallest complete production-quality vertical slice;
2. keep raw time events append-only and exact;
3. keep Minnesota/federal policy logic server-owned;
4. update docs and implementation status;
5. add or update tests;
6. run validation before continuing;
7. stop and ask if a legal, payroll, policy, or business decision is required.

Do not commit, push, merge, enable production rollout, or apply migrations to a live database unless I explicitly approve that action.
```

## Slice order

| Slice | Name | Implementation target | Stop condition |
| --- | --- | --- | --- |
| TA-030 | Employee My Time / capture surface | Staff can see current status and use clock-in, start-meal, end-meal, and clock-out actions through protected commands. | Stop if live capture requires an unapproved device, kiosk, geofence, biometric, or rounding policy. |
| TA-031 | Employee card review and correction | Staff can review timeline, totals, exceptions, and request a correction without changing the original punch trail. | Stop if correction authority, correction reasons, or payroll ownership is unclear. |
| TA-032 | Employee attestation | Staff can attest or dispute a versioned card with no rights-waiver language. | Stop if attestation copy needs legal/payroll approval. |
| TA-033 | Exception-first manager console | Managers can see blocking/nonblocking exceptions, filter review queues, and open the affected card. | Stop if manager role/capability boundaries are unclear. |
| TA-034 | Manager correction and approval | Managers can approve, return, or correct with reasoned decision history and audit trail. | Stop if separation-of-duties or post-attestation correction policy is unclear. |
| TA-035 | Time-off request and manager queue | Staff can request ordinary PTO, Minnesota ESST, and unpaid time off with privacy-aware routing. | Stop if balances, accrual method, payroll code mapping, or leave-admin ownership is unclear. |

## Phase exit criteria

TA-G3 is complete when:

- staff can complete the day-one time-card workflow;
- managers can resolve exceptions before payroll;
- all user actions go through server-owned permission and command boundaries;
- calculations remain exact-time and source-linked;
- employee-visible totals and manager-visible review queues agree;
- tests cover happy paths, duplicate/retry behavior, permission failures, exception routing, and correction/attestation versioning;
- docs describe what is live, what is preview-only, and what remains gated.

## Known dependency gates

- TA-004 legal/payroll configuration approval remains blocked for production release.
- TA-015 migration application, seed data, and restore drill remain pending.
- TA-016 capability and rollout policy must be completed before broader staff activation.

These gates do not prevent repository implementation of TA-G3, but they do prevent claiming production readiness.
