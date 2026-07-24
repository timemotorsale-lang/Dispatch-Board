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

## Implementation notes

### TA-030 checkpoint

TA-030 now has the first repository implementation slice:

- current staff capture state is available through the Time & Attendance capture API;
- `/time-attendance` shows staff-facing clock, meal, and refresh actions;
- capture actions use expected version, idempotency, exact occurrence time, location, timezone, and reason;
- the original punch trail remains append-only;
- UI success/error feedback is present.

Remaining TA-030 hardening before final phase completion includes richer mobile/offline states, production device policy, and broader live-browser acceptance evidence.

### TA-031 checkpoint

TA-031 now has the first repository implementation slice:

- employees can submit a time-card correction request from `/time-attendance`;
- correction requests are durable records with submitted status, idempotency, requested date/time context, explanation, and evidence that the original punch trail remains unchanged;
- `/api/time-attendance/corrections` accepts protected employee correction submissions;
- duplicate safe retries return the original request, while idempotency key reuse with different content is rejected;
- manager decision and application are intentionally deferred to TA-034.

Remaining TA-031 hardening before final phase completion includes full correction history display, event-specific request linking in the UI, and richer card-version context.

### TA-032 checkpoint

TA-032 now has the first repository implementation slice:

- employees can submit an attestation or dispute through a protected `/api/time-attendance/attestations` command when a persisted card version exists;
- attestations bind to `timeCardId`, `timeCardVersion`, `cardChecksum`, staff user, statement, and evidence;
- the attestation statement explicitly avoids wage, legal, correction, and payroll-review rights waiver language;
- disputes require a meaningful explanation and route to review;
- duplicate attestation attempts for the same card version return safely when identical and conflict when materially different;
- `/time-attendance` displays the attestation/dispute control but disables submission while the visible card is preview-only.

Remaining TA-032 hardening before final phase completion includes live persisted card projection on the staff page, attestation history display, and automatic reopen behavior after post-attestation corrections.

### TA-033 checkpoint

TA-033 now has the first repository implementation slice:

- managers can read an exception-first Time & Attendance review queue through `/api/time-attendance/manager-review`;
- non-managers receive a protected empty/locked queue rather than manager-sensitive review details;
- the queue surfaces submitted/returned correction requests, open/acknowledged time-card exceptions, and disputed attestations;
- queue items are ordered by severity and age so payroll-blocking issues rise first;
- `/time-attendance` includes a manager review panel with metrics and item links;
- this slice is read-only and does not approve, deny, correct, waive, or alter payable time.

Remaining TA-033 hardening before final phase completion includes persisted card drill-in views, richer filtering, SLA timers, and live manager browser acceptance evidence.

### TA-034 checkpoint

TA-034 now has the first repository implementation slice:

- managers can record correction-request decisions through `/api/time-attendance/manager-corrections`;
- the CCC Time & Attendance manager review panel exposes approve, return, deny, and apply-approved-correction actions for correction-request queue items;
- manager decisions require a reason and manager authority;
- duplicate-safe retry behavior is supported through manager decision idempotency evidence;
- correction-request evidence keeps a manager decision history;
- applying a correction preserves the original punch trail and records that payroll reprojection/recalculation is required.

Remaining TA-034 hardening before production release includes persisted time-card drill-in, exact event-level correction application/reprojection, post-attestation reopen behavior, separation-of-duties rules, and payroll close approval gates.

### TA-035 checkpoint

TA-035 now has the first repository implementation slice:

- staff can submit PTO, Minnesota ESST, and unpaid time-off requests through `/api/time-attendance/time-off`;
- `/time-attendance` includes a staff-facing time-off request panel;
- requests are idempotent, source-attributed, and balance-snapshotted when a balance record exists;
- Minnesota ESST requests hash/restrict the private reason and show only redacted operational information in the ordinary manager queue;
- the manager review queue includes submitted ordinary time-off requests and protected ESST leave-admin review cards.

Remaining TA-035 hardening before production release includes configured balance/accrual policy approval, leave-admin ownership, payroll code mapping, holiday/company-closure handling, notification routing, and migrated-runtime acceptance evidence.

### TA-G3 closeout checkpoint

The branch has the first vertical implementation pass for TA-030 through TA-035. It remains a repository implementation checkpoint, not a production release. Known release gates still include legal/payroll configuration approval, unapplied local migrations, seed data/restore drill, capability rollout policy, and live migrated-runtime acceptance evidence.
