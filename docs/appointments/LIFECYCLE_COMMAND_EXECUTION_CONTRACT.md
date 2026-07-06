# Appointment Lifecycle Command Execution Contract

**Work package:** EAPT-027  
**Status:** Implemented service boundary  
**Scope:** Execution planning for create draft, schedule, reschedule, cancel, and transfer owner commands

## Purpose

EAPT-027 connects the command-intake boundary to the lifecycle, scheduling, reservation, task-link, and history contracts.

This slice does not yet write live appointment mutations to the database. It defines the transaction plan that the future Prisma adapter must execute atomically.

## Implemented Boundary

The lifecycle command planner supports:

- `CREATE_DRAFT`
- `SCHEDULE`
- `RESCHEDULE`
- `CANCEL`
- `TRANSFER_OWNER`

For each supported command, the planner returns:

- Whether the command is executable.
- Any rejection code and rejection reasons.
- The appointment create/update effect.
- Reservation commit/release effects.
- Task-link effects.
- Appointment-history effects.
- A command-result snapshot for the command ledger.

## Enterprise Protections

The planner enforces:

- Manager or owner authorization according to the existing location-access policy.
- Manager-only ownership transfer.
- Expected-version matching before existing appointment changes.
- Hard-conflict rejection before scheduling or rescheduling.
- Unresolved-warning rejection before scheduling or rescheduling.
- Required structured reason and notes for reschedule, cancellation, and owner transfer.
- Required follow-up disposition for cancellation.
- Appointment version increment intent for every update.

## Atomic Effect Groups

Future database execution must commit each command plan as one protected unit.

| Command | Appointment effect | Reservation effect | History effect |
| --- | --- | --- | --- |
| `CREATE_DRAFT` | Create draft appointment | None | `CREATED` |
| `SCHEDULE` | Set scheduled time and status | Commit reservations when candidates are supplied | `SCHEDULED` |
| `RESCHEDULE` | Replace appointment time | Release old reservations and commit new reservations when supplied | `RESCHEDULED` with prior/new time and reason |
| `CANCEL` | Set cancelled state and follow-up disposition | Release active reservations when supplied | `CANCELLED` with reason |
| `TRANSFER_OWNER` | Replace owner | None | `OWNER_CHANGED` with prior/new owner and reason |

No future adapter may apply only part of a plan. If reservation commitment, task-link persistence, history writing, or command-ledger completion fails, the appointment state change must not be partially committed.

## Current Command Catalog Gap

The roadmap names approve and edit behavior in EAPT-027. The current command enum does not yet contain dedicated `APPROVE` or general `EDIT` command types.

This slice preserves the existing command catalog and implements the supported EAPT-027 command set. Before live mutation wiring, the product/architecture decision should either:

- Add dedicated `APPROVE` and `EDIT` command types through an additive migration, or
- Explicitly map approval/edit behavior onto existing command types and history events.

## Current Limits

This slice intentionally does not:

- Execute the plan in Prisma transactions.
- Update the existing `POST /api/appointments/commands` route to run lifecycle effects.
- Replace the preview data in `/appointments`.
- Implement confirmation, attendance, execution, completion, outcome, or follow-up commands.
- Add approve/edit command enum values.

Those items remain planned in later E3 work packages and live wiring slices.

## Acceptance Evidence

The boundary is covered by unit tests for:

- Draft creation effects with task-link and history planning.
- Hard-conflict and unresolved-warning rejection.
- Scheduling with reservation commitment planning.
- Rescheduling with reservation release, recommit, reason, and history.
- Cancellation with follow-up disposition, reservation release, and history.
- Manager-only owner transfer and stale-version rejection.
