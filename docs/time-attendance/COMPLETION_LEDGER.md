# Time & Attendance completion ledger

Status date: 2026-08-07

This ledger distinguishes implemented source behavior from evidence that must come from real reviewers or real operations. It is not a production-readiness approval.

## Gap matrix

| Area | Implemented source behavior | External or operational gate |
| --- | --- | --- |
| Projection | Immutable-event replay, effective policy and pay-period resolution, versioned persisted cards, source snapshots, stable checksums, serializable current-version creation | Representative production-volume replay evidence |
| Employee | Live state, elapsed shift, last punch, clock/meal/paid-rest capture, totals, timeline, exceptions, corrections, time off, exact-version attestation/dispute, recovery language | Formal accessibility and device review |
| Manager | Exception-first queue, correction decisions/application, redacted leave routing, exact-version card approve/return, clean-card eligibility, separation of duties | Approved reviewer roster and privacy review |
| Policy | Draft/activate/assign, effective dates, pay-period definitions, shadow/off rollout and rollback | Legal/payroll approval of policy sources and mappings; Pilot/General activation |
| Leave | Balance snapshot, protected routing, manager coverage state, Leave Administrator final decision, balance consumption, projection and internal notification | Approved accrual configuration, closure calendar, retained-document policy |
| Payroll | Configured periods, roster/card/session/exception/correction/attestation/approval gates, serializable lock, controlled reopen, versioned lines, checksums, stored CSV, idempotent status and reproduction | Provider mapping approval, provider connection, parallel-payroll reconciliation |
| Monitoring | Live control counts for sessions, projection failures, stale cards, blockers, failed commands, dead letters, policy expiration, export rejection, restricted access | Alert ownership and response drill |
| Release | Pilot and production eligibility remain false while evidence gates are open | Security/privacy, restore, accessibility, payroll, training and rollback sign-off |

## Intentionally blocked

- Pilot and General rollout activation.
- Claims of legal compliance approval.
- Claims of payroll-provider transmission or payment.
- Claims that backup/restore, accessibility, security, load or parallel-payroll evidence has passed.
- Unsupported worker classifications without an approved policy profile.

## Deferred business decisions

- Final payroll provider and approved field/earning-code mapping.
- Approved ESST accrual parameters and limits per employee class.
- Company holiday/closure calendar and pay treatment.
- Retention, legal-hold and deletion schedule.
- Independent-review assignments for sensitive corrections, leave and payroll actions.
