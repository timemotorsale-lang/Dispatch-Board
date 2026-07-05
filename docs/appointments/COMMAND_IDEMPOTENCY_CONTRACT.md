# Appointment Command, Idempotency, Transaction, and Retry Contract

**Work package:** EAPT-009  
**Status:** Implemented foundation  
**Effective date:** 2026-07-05

## Purpose

Appointment commands must be safe under retries, concurrent users, automation replays, browser refreshes, and bulk operations.

The command ledger is the durable record of each intended mutation. It prevents duplicate effects, records stale-write conflicts, and gives retry/replay workflows a reliable source of truth.

## Command Ledger Scope

Each command ledger entry records:

- Organization
- Optional location
- Optional appointment
- Optional actor user
- Command type
- Status
- Idempotency key
- Request hash
- Correlation ID
- Optional causation ID
- Expected and current appointment versions
- Retry counters and retry schedule
- Lock, completion, and failure timestamps
- Result snapshot or error details

## Command Types

The initial command catalog includes:

- Create draft
- Schedule
- Reschedule
- Cancel
- Complete
- Confirm / decline
- Check in / no-show
- Start / wait / finish
- Transfer owner
- Override warning
- Link / unlink task
- Automation run
- Bulk reschedule
- Import

Later APIs may expose these as separate route handlers or command services, but they must use the same idempotency and versioning boundary.

## Idempotency Boundary

The database prevents duplicate command effects with:

```text
organizationId + commandType + idempotencyKey
```

If the same command is retried with the same request hash, the command service returns the existing result or current command state.

If the same idempotency key is reused with a different request hash, the command service must reject it as an idempotency-key conflict.

## Optimistic Concurrency

Existing-appointment mutation commands require an expected appointment version.

If the expected version differs from the current appointment version:

- No appointment mutation is applied.
- No reservation, task-link, or history mutation is applied.
- The ledger records `CONFLICT`.
- The current appointment version is retained for safe client reconciliation.

Create-draft commands may omit an appointment version because the appointment does not exist yet.

## Status Rules

| Status | Meaning | Required evidence |
| --- | --- | --- |
| `PENDING` | Command accepted but not started | Idempotency key, request hash, correlation |
| `RUNNING` | Command is executing | Lock timestamp |
| `SUCCEEDED` | Command committed | Completion timestamp and optional result snapshot |
| `FAILED_RETRYABLE` | Transient failure | Failure timestamp, error code, next retry |
| `FAILED_TERMINAL` | Permanent failure | Failure timestamp and error code |
| `CONFLICT` | Stale version or idempotency conflict | Failure timestamp, error code, current version where relevant |
| `DUPLICATE_RETURNED` | Retry returned an existing result | Existing command reference/result |
| `CANCELLED` | Command was cancelled before execution | Cancellation recorded by service history |

Retry counters must be non-negative and cannot exceed the configured maximum.

## Transaction Boundary

Future command services must write the following in one database transaction when they are part of the same command:

- Appointment aggregate mutation
- Resource requirements or reservations
- Appointment-task links
- Appointment history event
- Command ledger state/result
- Future outbox or notification records

Silent partial success is prohibited.

## Retry Boundary

Retry is allowed for transient operational failures such as temporary lock/contention failures.

Retry is not allowed for:

- Validation failures
- Authorization failures
- Hard conflicts
- Stale appointment versions
- Reused idempotency keys with different request hashes
- Missing required reason or audit data

Replay of terminal failures requires explicit authority, a reason, and a new command or approved reuse of the original idempotency identity according to the replay workflow.

## Implemented Evidence

- `AppointmentCommandType` enum
- `AppointmentCommandStatus` enum
- `AppointmentCommandLedger` table
- Organization-scoped idempotency uniqueness
- Retry, status, correlation, actor, appointment, and location indexes
- SQL safeguards for non-blank idempotency key, request hash, correlation, positive versions, retry counters, running lock time, completion time, failure evidence, and retry schedule
- Server-side normalization and stale-version assertion helper
- Unit and schema tests

## Next Boundary

EAPT-010 defines repository, service, validation, policy, and API boundaries. Later E3 command services will use this ledger to implement actual create, schedule, reschedule, lifecycle, task-link, automation, and bulk mutation workflows.
