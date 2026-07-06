# Bulk Reschedule Dry Run and Controlled Execution Contract

**Work package:** EAPT-023  
**Status:** Implemented as service boundary  
**Purpose:** Define safe bulk-rescheduling preview and controlled execution behavior.

## Enterprise Rule

Bulk rescheduling must never silently half-change the board.

Before execution, the system must perform a dry run that evaluates each affected appointment independently and produces an operation-level summary. Execution requires a reason and must be retry-safe.

## Dry Run Behavior

The implemented dry run evaluates each target through the EAPT-022 reschedule impact preview and classifies it as:

- `READY`
- `WARNING`
- `BLOCKED`
- `UNAUTHORIZED`
- `SKIPPED`

The dry run returns:

- Operation ID
- Atomicity policy
- Preview token
- Executable flag
- Reason-required flag
- Per-item previews
- Summary counts

## Atomicity Policies

Supported policies:

- `ALL_OR_NOTHING`
- `PARTIAL_ALLOWED`

`ALL_OR_NOTHING` can execute only when every item is ready.

`PARTIAL_ALLOWED` can execute ready items while skipping blocked, warning, or unauthorized items. Skipped items are reported explicitly.

## Controlled Execution

Execution requires:

- A prior dry run
- Structured reason code
- Reason notes
- Operation ID
- Preview token
- Execution repository
- Item executor

The service executes only `READY` items. Non-ready items are skipped with their dry-run reasons.

## Retry and Idempotency

The operation ID and preview token form the retry-safety boundary.

- Repeating the same operation ID with the same preview token returns the stored result as a duplicate.
- Reusing the operation ID for a different dry run is rejected.
- Failed item results are reported as retryable by the caller.

## Implemented Boundary

The implementation lives in:

- `src/server/appointments/appointment-bulk-reschedule-service.ts`
- `src/tests/unit/appointment-bulk-reschedule-service.test.ts`

Implemented behavior:

- Classifies dry-run targets as ready, warning, blocked, or unauthorized.
- Blocks all-or-nothing execution when any target is not ready.
- Executes only ready items in partial mode.
- Records skipped items.
- Requires a reason code and notes.
- Returns duplicate results for matching operation retries.
- Rejects operation ID reuse for a different dry run.

## Not Yet Claimed

This contract does not yet persist bulk operation rows in Prisma, execute real appointment mutations, write appointment history, release/recreate reservations, or expose the bulk-rescheduling workspace in the Appointment Board UI. Those are covered by later command execution, lifecycle, persistence, and UI work packages.
