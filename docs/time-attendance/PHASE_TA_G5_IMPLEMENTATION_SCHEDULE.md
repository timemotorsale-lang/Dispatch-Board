# Phase TA-G5 Implementation Schedule — Hardening and Pilot

## Branch

`codex/time-attendance-g5-hardening-pilot`

## Phase purpose

Phase TA-G5 turns the Time & Attendance MVP into an evidence-controlled pilot candidate. It does not approve production or pilot use by itself. Instead, it makes the required security, reliability, restore, accessibility, payroll-pilot, training, support, and rollback evidence visible and fail-closed.

## Slice checkpoints

| Slice | Status | Implementation target |
| --- | --- | --- |
| TA-050 | Started | Manager-only security/privacy evidence gate for least privilege, protected leave data, export scope, logging, and abuse-case review. |
| TA-051 | Started | Reliability/load/concurrency evidence gate for duplicate punch, concurrent correction, retry, timeout, and dead-letter scenarios. |
| TA-052 | Blocked | Backup/restore/retention evidence gate requires migrated-runtime restore drill and checksum reconciliation. |
| TA-053 | Started | Accessibility/responsive evidence gate for keyboard, screen reader, mobile, and failure/recovery states. |
| TA-054 | Blocked | Parallel payroll pilot evidence gate requires one representative pay period reconciled by employee and earning code. |
| TA-055 | Started | Training/support/rollback evidence gate for runbooks, support owner, rollback drill, and first-live checklist. |

## Current implementation notes

- The live CCC Time & Attendance page includes the Hardening and Pilot panel.
- The server boundary is `/api/time-attendance/hardening-pilot`.
- Non-managers cannot see the detailed hardening gate list.
- Pilot eligibility remains false.
- Production eligibility remains false.
- The gate is intentionally honest: source readiness does not stand in for legal/payroll approval, a restore drill, accessibility proof, or a parallel payroll pilot.

## Production gates still open

- TA-004 legal/payroll configuration approval.
- TA-015 migrated-runtime application, seed data, rollback, and restore evidence.
- TA-016 capability and rollout policy.
- Security/privacy adversarial review.
- Production-like concurrency/load proof.
- Accessibility and responsive-browser evidence.
- Representative parallel payroll pilot reconciliation.
- Training/support ownership and rollback drill.
