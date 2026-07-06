# Appointment Lifecycle Transaction Execution Contract

**Work package:** EAPT-027 extension  
**Status:** Implemented service boundary  
**Scope:** Atomic execution boundary and concrete Prisma transaction adapter for lifecycle command plans

## Purpose

The lifecycle command planner decides what should happen. This transaction execution boundary defines how those planned effects must be applied safely.

The Appointment system must never partially apply a command. Appointment state, resource reservations, task links, appointment history, and command-ledger completion must succeed or fail as one protected unit.

## Implemented Boundary

The executor accepts an `AppointmentLifecycleCommandExecutionPlan` and a transaction repository.

For executable plans, the executor applies:

- Appointment create or update effect.
- Reservation commit and release effects.
- Appointment-task link create and remove effects.
- Appointment history events.
- Command-ledger success completion.

The concrete Prisma repository applies those effects through one database transaction and persists:

- Appointment create/update rows with optimistic version checks.
- Appointment resource reservation create/release rows.
- Appointment-task link create/remove rows.
- Appointment history event rows.
- Appointment command-ledger completion rows.

For rejected plans, the executor:

- Applies no appointment, reservation, task-link, or history side effects.
- Records the command as `FAILED_TERMINAL`.
- Preserves the rejection code, reasons, and command-result snapshot.

## Atomicity Rule

The repository must provide one lifecycle transaction boundary.

If any later step fails, including reservation commitment, task-link persistence, history writing, or command completion, earlier effects must be rolled back.

This protects against dangerous partial states such as:

- Appointment updated but resource reservations not committed.
- Resource reservations committed but history not written.
- Task links created but the command ledger not completed.
- Command marked successful while appointment writes failed.

## Current Limits

This slice provides the concrete Prisma transaction adapter, but live production execution still requires:

- Command route integration.
- End-to-end command submission that invokes the planner, transaction executor, and Prisma adapter together.
- Live appointment read refresh in the Appointment Board.
- Browser-level mutation tests.

## Acceptance Evidence

The boundary is covered by unit tests for:

- Successful execution of appointment, reservation, task-link, history, and command-completion effects together.
- Rejected-plan handling without side effects.
- Rollback of all prior effects when a later transaction step fails.
- Prisma adapter operation-shape tests for appointment updates, reservation writes, task-link writes, history writes, command completion, stale-version rejection, reservation release, and task-link removal.
