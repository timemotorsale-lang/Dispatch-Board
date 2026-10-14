# Time & Attendance Architecture

## Decision

Build Time & Attendance as a bounded module in the existing Next.js modular monolith. Reuse PostgreSQL, Prisma, server-side authentication/policies, organization/location ownership, aggregate versioning, enterprise command ledger, immutable audit events, domain events, transactional outbox, integration exchange ledger, and reconciliation cases.

Do not create a second deployment or microservice for the MVP.

## Component model

```text
CCC / Time & Attendance console
  -> protected command/read routes
    -> time command service
      -> authorization and employee-policy eligibility
      -> expected-version and idempotency validation
      -> append-only time event
      -> calculation and exception projection
      -> enterprise audit/domain event/outbox
    -> PostgreSQL transaction

Read models
  <- time events + effective policy assignments + schedules + absences
  <- calculated cards + exceptions + attestations + approvals + exports

External boundaries
  -> Dispatch availability projection
  -> payroll file/connector adapter
  -> People & HR protected-leave referral
```

## Core aggregates

### Time policy assignment

Effective-dated assignment of organization, location, employee, coverage, employment basis, workweek, policy bundle, timezone, and validation state. An overlap for the same employee/profile dimension is invalid.

### Time session

The employee's active/inactive attendance state. Commands are `CLOCK_IN`, `START_MEAL`, `END_MEAL`, and `CLOCK_OUT`. Duplicate retries return the original result. Conflicting active sessions are rejected.

### Time event stream

Append-only source facts:

- clock in/out;
- paid rest attestation;
- meal start/end;
- manual entry;
- correction proposal/acceptance/rejection;
- work allocation;
- system import;
- controlled reversal.

Every event stores organization, location, employee, source, occurrence instant, location timezone, actor, command/correlation IDs, source reference, and sequence/version.

### Time card

A projection for one employee and workweek/pay period. It retains source-event watermark, policy versions, calculated segments, regular/overtime/leave totals, exceptions, workflow state, attestation/approval versions, and lock/export references.

### Absence request

Dates, duration, time code, privacy class, operational status, decision, balance snapshot, and approved time-card effect. Protected case details are referenced, not copied.

### Pay period and export batch

The period owns close readiness and lock state. The export batch owns mapping version, included card versions, totals, content hash, idempotency, delivery state, acknowledgment, rejection, and reconciliation.

## Required persistence characteristics

- UTC instants plus explicit IANA timezone; no local timestamp without zone.
- Integer minutes for MVP calculations; raw capture retains timestamp precision.
- Monetary values remain outside this module until a separately approved pay-rate contract.
- Append-only raw events and audit records.
- Optimistic aggregate versions for mutable workflow records.
- Unique idempotency keys per organization/domain/command.
- Effective dates are inclusive start and exclusive end.
- Calculation output retains source-event and policy-version checksums.
- Locked/exported records use correction/reversal workflows, never direct mutation.

## Implemented persistence foundation

TA-G1 adds the initial authoritative tables:

- `TimeAttendancePolicyProfile` and `TimeAttendancePolicyAssignment`;
- `TimeAttendanceSession`, `TimeAttendanceEvent`, and `TimeAttendanceBreakInterval`;
- `TimeCard`, `TimeCardException`, `TimeCardAttestation`, and `TimeCardApproval`;
- `TimeOffRequest` and `TimeOffBalance`;
- `TimeAttendanceExportBatch` and `TimeAttendanceExportLine`.

`TimeAttendanceEvent` links to `EnterpriseCommandLedger` when a mutation originates from the command boundary. A PostgreSQL partial unique index allows historical closed sessions while enforcing one active `OPEN` or `ON_MEAL` session per staff member and organization.

## Calculation pipeline

```text
resolve employee profile
  -> resolve jurisdiction and effective policy versions
  -> normalize/replay source events
  -> pair events into attendance and meal intervals
  -> detect gaps, overlaps, impossible order, and unsupported cases
  -> split by location-local workday and configured workweek
  -> classify compensable/noncompensable intervals
  -> calculate regular/overtime/leave categories
  -> evaluate break and policy exceptions
  -> reconcile attendance versus allocation
  -> produce explanation + policy/source lineage
```

Any blocking error prevents payroll-ready status. Warnings require configured acknowledgment or manager review but do not silently change time.

## Command transaction contract

Every accepted mutation commits atomically:

1. idempotent command ledger entry;
2. expected aggregate-version check;
3. domain mutation or append-only event;
4. aggregate version increment;
5. immutable audit event with reason and prior/new snapshot;
6. exact domain event;
7. outbox message where another projection/system must react.

## Read/write separation

Command services write authoritative facts. Read models serve the exception-first console. A delayed projection must show its watermark/lag and cannot claim a card is current when it has not consumed the latest event.

## Integration boundaries

- **Dispatch:** receives approved or pending availability intervals; does not calculate leave eligibility.
- **Appointments:** consumes staff availability; does not mutate time cards.
- **Shop labor clocks:** record job/activity allocation and may propose attendance evidence, but never silently clock an employee in/out.
- **People & HR:** owns protected-leave cases and restricted evidence.
- **Payroll:** remains final pay authority and returns acknowledgment/rejection/reconciliation status.

## Failure behavior

- Offline/duplicate submissions use client-generated idempotency keys.
- An ambiguous event order creates an exception; the engine does not guess.
- Policy resolution failure blocks calculation.
- Export transport failure retries the same batch and hash.
- Payroll rejection creates an owned reconciliation case.
- Projection lag and dead-letter outbox messages appear in enterprise operations.
- Historical replay uses the policy version effective for the original work, unless an authorized retroactive recalculation explicitly records a new basis.
