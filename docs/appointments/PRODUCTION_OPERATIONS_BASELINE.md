# Production Operations Baseline

**Work package:** EAPT-011  
**Status:** Proposed for E1 approval  
**Scope:** Production-volume assumptions, retention, indexing, archive, RTO, RPO, and operational ownership inputs  
**Baseline location:** Time Motor Sales — Minneapolis / `TMS-MSP-01`  
**Effective planning date:** 2026-07-05

## Purpose

This document establishes measurable operating assumptions for the Appointment Command Center. These numbers are used by future scheduling, command-center, reporting, backup, archive, load-test, and release-readiness work.

The baseline is intentionally explicit. If actual production usage exceeds these assumptions, the release plan must update capacity, indexes, tests, and operating procedures before signoff.

## Approval Owners

| Area | Owner |
| --- | --- |
| Business workflow and launch approval | General Manager |
| Data, KPI, reconciliation, and reporting approval | Data/reporting reviewer |
| Backup, restore, monitoring, and operations approval | Operations reviewer |
| Retention, privacy, and restricted-data approval | Security/privacy reviewer |
| Test-volume, load, recovery, and release evidence approval | Quality reviewer |

## Production Volume Baseline

| Metric | E1 baseline |
| --- | ---: |
| Expected appointments per business day | 75 |
| Peak appointments per business day | 125 |
| Peak appointments per hour | 24 |
| Concurrent command-center users | 20 |
| Appointment owners | 15 |
| Schedulable resources | 50 |
| Active automation rules | 40 |
| Bulk operation appointment limit | 500 |

These values are not toy/demo volumes. They are the minimum production-shaped test profile for E2 through E9 qualification until the General Manager and operations reviewers approve a different baseline.

## Retention Baseline

| Data class | Retention |
| --- | --- |
| Hot operational appointment records | 24 months |
| Appointment records | 7 years |
| Appointment history events | 7 years |
| Appointment command-ledger evidence | 2 years |
| Automation execution evidence | 3 years |
| Internal notification records | 18 months |
| Reporting aggregates | 7 years |

Audit events are not hard-deleted as part of ordinary appointment cleanup. Retention jobs may archive or redact according to an approved privacy procedure, but audit integrity, correlation IDs, appointment identity, and required reason/outcome history must remain reconstructable.

## Archive Baseline

Closed appointments are eligible for archive review after 24 months when their booking status is:

- `CANCELLED`
- `COMPLETED`

Archive behavior must preserve:

- Linked tasks
- Appointment history events
- Command-ledger evidence
- Customer and vehicle snapshots required for appointment reconstruction
- Reason, outcome, and follow-up disposition records
- Reporting reconciliation keys

Archived data must support restore reconciliation before the archive procedure is accepted.

## Recovery Baseline

| Control | Target |
| --- | ---: |
| Recovery-time objective | 4 hours |
| Recovery-point objective | 15 minutes |
| Backup frequency | 15 minutes |
| Restore drill frequency | Every 90 days |

A backup is not considered release-ready until a restore is exercised in an approved recovery environment and appointment records, task links, history events, command ledger entries, resources, and reporting counts reconcile.

## Performance Baseline

| Interaction | P95 target |
| --- | ---: |
| Initial command-center load | 2,000 ms |
| Appointment mutation response | 1,000 ms |
| Availability search | 1,500 ms |
| Schedule navigation | 1,000 ms |
| Reporting dashboard load | 3,000 ms |

Reporting queries must not degrade operational scheduling or command execution. If reporting requires heavy aggregation, E8 must use isolated read models or bounded background aggregation.

## Required Index and Query Coverage

Future schema and load-test work must cover these query families:

- Location day schedule
- Location status schedule
- Owner status schedule
- Resource reservation window
- Appointment history timeline
- Appointment command idempotency
- Appointment-task bidirectional links
- Customer and vehicle search

Existing E1 indexes already cover several of these query families. E2 through E8 must verify coverage again after live scheduling, recurrence, reporting, automation, and archive behavior are implemented.

## Release Gates Affected

This baseline feeds:

- E2 scheduling and capacity load tests
- E3 lifecycle, command, retry, and automation tests
- E4 command-center query and UI-performance tests
- E8 reporting and reconciliation tests
- E9 load, recovery, security, backup, retention, and archive qualification
- E10 pilot, cutover, rollback, and stabilization planning

## Change Control

Changing any of the following requires recorded approval from the named owner area:

- Expected or peak appointment volume
- Concurrent-user target
- Bulk-operation limit
- Retention period
- Archive eligibility
- RTO or RPO
- Backup frequency
- Restore drill requirement
- P95 performance target
- Required query/index coverage

Temporary exceptions must identify:

- Owner
- Rationale
- Exposure
- Compensating control
- Review date
- Expiration date or permanent decision

## Current Approval State

This is the E1 proposed baseline. It is ready for General Manager, operations, security/privacy, data/reporting, and quality review.

Until explicitly approved, implementation may use these numbers as the minimum design target, but E1 release signoff must record approval or replacement values.
