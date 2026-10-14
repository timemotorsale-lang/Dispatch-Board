# Time & Attendance Implementation Roadmap

## Status legend

- `[x]` implemented and verified
- `[~]` started or partially implemented
- `[ ]` not started
- `[blocked]` requires an approved decision/evidence

## TA-G0 — Foundation

| ID | Status | Work | Exit criteria |
| --- | --- | --- | --- |
| TA-000 | [x] | Register the CCC console and branch | Existing `Time & Attendance` launcher entry and `codex/time-attendance-mvp` branch confirmed |
| TA-001 | [x] | Product, architecture, legal, algorithm, workflow, test, and roadmap package | Foundation docs are linked and distinguish requirements from implementation |
| TA-002 | [x] | Executable policy source registry | Official sources, effective dates, rule IDs, and fail-closed profile types compile and have focused tests |
| TA-003 | [x] | Golden calculation foundation | Exact tardiness, overtime, Minnesota break, ESST, and reconciliation algorithms have deterministic unit tests |
| TA-004 | [blocked] | Legal/payroll configuration approval | Employee cohort, classifications, workweek, ESST method, local rules, payroll mapping, retention approved |
| TA-005 | [x] | Approved CCC UI source of truth | Approved Time & Attendance mockup adopted as the binding CCC console first-page direction |

## TA-G1 — Persistence and command boundary

| ID | Status | Work | Exit criteria |
| --- | --- | --- | --- |
| TA-010 | [x] | Add time policy/profile schema | Effective dates, sources, approvals, coverage and profile assignments are modeled |
| TA-011 | [x] | Add append-only time event/session schema | Active session, source, timezone, actor, command and correction lineage are modeled; PostgreSQL partial index protects one active session per staff member |
| TA-012 | [x] | Add card/exception/attestation/approval schema | Exact card version/checksum links and decision history are modeled |
| TA-013 | [x] | Add absence and balance schema | Request privacy routing, decisions, and balance snapshots are modeled |
| TA-014 | [x] | Add pay-period/export/reconciliation schema | Export batch, line, status, hash and exact card-version references are modeled |
| TA-015 | [~] | Migration/seed/rollback contract | Additive migration exists and schema validates; runtime migration application, seed data and restore drill remain pending |
| TA-016 | [ ] | Capability and rollout policy | Employee/manager/payroll/leave-admin server enforcement and feature gates |

## TA-G2 — Capture and calculation

| ID | Status | Work | Exit criteria |
| --- | --- | --- | --- |
| TA-020 | [x] | Idempotent capture commands | Clock/meal commands are retry-safe, expected-version checked, audited, event-backed and exposed through the capture API |
| TA-021 | [x] | Event normalization and interval builder | Exact attendance, meal, paid-work, missing/open/overlap and overnight local-day split cases are deterministic |
| TA-022 | [x] | Effective policy resolver | One exact policy bundle or blocking conflict |
| TA-023 | [x] | Time-card calculator | Worked, regular, overtime, meal, rest and ESST results project from exact events |
| TA-024 | [x] | Exception engine | Source-linked break, punch, policy and planned-meal exceptions are projected |
| TA-025 | [x] | Replay and checksum service | Historical results reproduce from events and versions with stable checksums |

## TA-G3 — Employee and manager workflows

| ID | Status | Work | Exit criteria |
| --- | --- | --- | --- |
| TA-030 | [~] | Employee My Time/capture surface | Staff current-state read and live clock/meal buttons are wired through protected capture commands; richer offline/mobile states remain pending |
| TA-031 | [~] | Employee card/review/correction | Employee card review includes a durable correction-request workflow; full correction history display remains pending |
| TA-032 | [~] | Employee attestation | Versioned attest/dispute command and UI are present; UI submission awaits persisted card versions replacing preview cards |
| TA-033 | [~] | Exception-first manager console | Protected manager queue surfaces correction requests, open exceptions, disputed attestations, and time-off review items; drill-in/filtering remains pending |
| TA-034 | [~] | Manager correction/approval | Reasoned approve/return/deny/apply correction decisions are wired; exact event-level reprojection and bulk-clean approval remain pending |
| TA-035 | [~] | Time-off request and manager queue | Staff PTO/ESST/unpaid requests and privacy-aware manager queue routing are wired; balance approval, leave-admin ownership, and payroll mapping remain pending |

## TA-G4 — Close and payroll handoff

| ID | Status | Work | Exit criteria |
| --- | --- | --- | --- |
| TA-040 | [~] | Pay-period readiness projection | Readiness projection checks open sessions, card approval, exceptions, corrections, time off, and existing batches; staff roster completeness remains pending |
| TA-041 | [~] | Atomic lock/reopen workflow | Manager lock/reopen commands are wired with reasoned evidence; separation-of-duties policy and live migration evidence remain pending |
| TA-042 | [~] | Versioned CSV mapping/export | Versioned export preview lines and control totals are wired for regular/overtime/ESST; final payroll-code mapping and file format approval remain pending |
| TA-043 | [~] | Acknowledgment/rejection/reconciliation | Payroll response status commands are wired; external provider delivery/retry ownership remains pending |
| TA-044 | [~] | Historical export reproduction | Stored batch snapshot, lines, and checksum can be reproduced; byte-for-byte provider file reproduction awaits final export format |

## TA-G5 — Hardening and pilot

| ID | Status | Work | Exit criteria |
| --- | --- | --- | --- |
| TA-050 | [~] | Security/privacy review | Manager-only evidence gate lists least-privilege, protected leave/export scope, logging, and abuse-case review evidence still required |
| TA-051 | [~] | Reliability/load/concurrency proof | Gate captures idempotency/concurrency/load/retry evidence requirements; production-like load run remains pending |
| TA-052 | [blocked] | Backup/restore/retention proof | Restore/retention gate is explicit and blocked until migrated-runtime restore drill reconciles events, cards, approvals, and exports |
| TA-053 | [~] | Accessibility/responsive proof | Gate captures keyboard, screen-reader, mobile, and browser-state evidence requirements; formal audit remains pending |
| TA-054 | [blocked] | Parallel payroll pilot | Parallel payroll pilot gate is explicit and blocked until one representative pay period reconciles by employee and earning code |
| TA-055 | [~] | Training/support/rollback | Gate captures training, support owner, rollback drill, and first-live checklist evidence requirements |

## TA-G6 — Production

| ID | Status | Work | Exit criteria |
| --- | --- | --- | --- |
| TA-060 | [blocked] | Legal/payroll/product release approval | Signed configuration and pilot evidence |
| TA-061 | [ ] | Cohort rollout | Feature-flagged approved employees only |
| TA-062 | [ ] | First live close | Export acknowledged and reconciled with no unexplained variance |
| TA-063 | [ ] | Stabilization review | Incidents, corrections, support and rule outcomes reviewed |

## Enterprise follow-through

- physical clocks, kiosk and offline queue;
- payroll-provider adapters;
- multiple states/countries and local overlays;
- union/CBA and prevailing-wage policies;
- minor and special-industry rules;
- advanced leave administration through People & HR;
- demand-aware scheduling and ethical overtime forecasting;
- policy simulation/promotion UI;
- multi-entity close, delegated administration, SSO/provisioning, and data residency.

Enterprise work extends the same event, policy, audit, permission, and reconciliation contracts; it does not replace the MVP foundation.
