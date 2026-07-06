# Appointment Aggregate Contract

**Work package:** EAPT-004  
**Status:** Implemented foundation  
**Effective date:** 2026-07-05

## Purpose

The Appointment aggregate is the authoritative record for appointment identity, accountable ownership, current lifecycle state, scheduling facts, operational snapshots, exception documentation, and optimistic-concurrency version.

It is intentionally separate from Task. Task links, resources, participants, recurrence, audit history, and automation execution are added through later work packages without collapsing their independent lifecycles into this record.

## Identity and Scope

Every appointment has:

- An immutable internal ID
- A unique human-readable appointment number
- Organization and location ownership
- A scheduling timezone
- A creation source and optional source reference
- A title
- A positive concurrency version

The database prevents deletion of a referenced organization or location while appointments exist.

## Ownership

- A draft may be unowned when automation or review has not resolved an owner.
- Every scheduled, cancelled, or completed appointment has exactly one accountable owner.
- A manager or the accountable owner may change an appointment.
- Approval, ownership transfer, and warning override remain manager-only.
- Appointment configuration administration remains General-Manager-only at the initial location.

Location-access enforcement is implemented by EAPT-005 and requires an active location grant in addition to manager or owner authority.

## Independent State Dimensions

| Dimension | Values |
| --- | --- |
| Booking | `DRAFT`, `PENDING_APPROVAL`, `SCHEDULED`, `CANCELLED`, `COMPLETED` |
| Confirmation | `NOT_REQUIRED`, `NOT_SENT`, `PENDING`, `CONFIRMED`, `DECLINED` |
| Attendance | `EXPECTED`, `CHECKED_IN`, `NO_SHOW` |
| Execution | `NOT_STARTED`, `IN_PROGRESS`, `WAITING`, `FINISHED` |

Rescheduling is not a current status. It will be recorded as an appointment-history event containing the prior and resulting scheduling facts.

## Scheduling and Snapshot Rules

A committed appointment—scheduled, cancelled, or completed—requires:

- One owner
- Start and end timestamps
- End after start
- The timezone used to interpret its schedule
- A retained purpose snapshot

Optional customer, vehicle, and source snapshots are present now so later internal reference models can preserve historical context without changing earlier appointments.

## Documentation Rules

The aggregate and database constraints require:

- Cancellation timestamp, structured reason, and follow-up disposition for cancellation
- Completion timestamp, finished execution, outcome, and follow-up disposition for completion
- Confirmation timestamp when confirmed
- Decline timestamp, structured reason, and follow-up disposition when declined
- Check-in timestamp when checked in
- No-show timestamp, structured reason, follow-up disposition, and no started execution for no-show
- Start timestamp for in-progress execution
- Start timestamp, waiting timestamp, structured reason, and expected-next-step notes while waiting
- Start and finish timestamps for finished execution

Append-only actor, prior-value, reason, and correlation history is added in EAPT-008. These current-state requirements do not replace audit history.

## Concurrency Boundary

The appointment begins at version `1`. Every later mutation command must compare the expected version and increment it atomically. The record and database already reject zero or negative versions; command-level stale-write handling is completed in EAPT-009 and EAPT-037.

## Source Types

The initial source catalog is:

- `MANUAL`
- `TASK`
- `AUTOMATION`
- `RECURRENCE`
- `COPY`
- `IMPORT`

Source-specific idempotency and correlation rules are added in EAPT-009. A source reference is not itself treated as a complete idempotency key.

## Implemented Evidence

- Prisma Appointment model and independent enums
- Additive SQL migration with lifecycle and documentation constraints
- Server-side aggregate normalization and invariant validation
- Manager/owner authorization policies
- Unit and schema-constraint tests

## Next Boundary

EAPT-005 is implemented in `PARTICIPANT_RESOURCE_CONTRACT.md`. EAPT-006 adds versioned purposes, templates, outcomes, reasons, and configuration lifecycle.
