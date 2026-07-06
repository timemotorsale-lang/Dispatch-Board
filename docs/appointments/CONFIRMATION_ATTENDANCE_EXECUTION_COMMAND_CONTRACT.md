# Confirmation, Attendance, and Execution Command Contract

**Work package:** EAPT-028  
**Status:** Implemented as backend service boundary  
**Verified:** 2026-07-06

## Purpose

This contract defines the first operational command slice behind the Appointment Board detail rail. It turns visible board actions such as confirm, check in, no show, start, wait, and finish into protected lifecycle commands with authorization, version checks, audit history, and reason capture.

This is not yet the complete live UI workflow. It is the backend command foundation that the visible Appointment Board can wire into next.

## Supported Commands

| Command | Appointment effect | Required documentation |
| --- | --- | --- |
| `CONFIRM` | Sets `confirmationStatus` to `CONFIRMED` and records `confirmedAt` | History event |
| `DECLINE` | Sets `confirmationStatus` to `DECLINED`, records `declinedAt`, reason, notes, and follow-up disposition | Reason code, reason notes, follow-up disposition, history event |
| `CHECK_IN` | Sets `attendanceStatus` to `CHECKED_IN` and records `checkedInAt` | History event |
| `NO_SHOW` | Sets `attendanceStatus` to `NO_SHOW`, keeps execution not started, records no-show reason, notes, follow-up disposition, and optional reservation release | Reason code, reason notes, follow-up disposition, history event |
| `START` | Sets `executionStatus` to `IN_PROGRESS` and records `startedAt` | History event |
| `WAIT` | Sets `executionStatus` to `WAITING` and records waiting reason and notes | Reason code, reason notes, history event |
| `FINISH` | Sets `executionStatus` to `FINISHED` and records `finishedAt` | History event |

## Authorization

All EAPT-028 commands use the approved E0 authority rule:

- A manager can operate appointments at the location.
- The appointment owner can operate their own appointment.
- Other users are rejected server-side.

The command planner uses the same mutable-appointment policy used by schedule, reschedule, cancel, edit, and transfer-owner flows.

## State Guards

EAPT-028 operational commands require an existing scheduled appointment.

The planner rejects commands when:

- The appointment version is stale.
- The actor is not authorized.
- The appointment is not `SCHEDULED`.
- A no-show appointment is later checked in or started without a corrective edit.
- `WAIT` or `FINISH` is attempted before execution has started.

## Audit and Reason Policy

Every successful command produces an appointment history event with the submitted command correlation.

Reason and follow-up documentation is mandatory where the action changes the business outcome or requires later work:

- `DECLINE`
- `NO_SHOW`
- `WAIT`

`NO_SHOW` can also release resource reservations in the same protected lifecycle transaction so capacity is not left blocked after the customer misses the appointment.

## Persistence Boundary

The existing EAPT-027 route orchestration and transaction executor now execute these EAPT-028 commands through the same ledger and atomic transaction path as scheduling commands.

The command response includes:

- Final command status
- Appointment update result
- History-event count
- Reservation-release count where applicable
- Command-result snapshot

## Not Yet Claimed

This contract does not claim:

- Final `COMPLETE` outcome capture; that remains part of the outcome/follow-up slice.
- Browser-tested live button wiring on `/appointments`.
- External calendar, SMS, email, CRM, or DMS integrations.
- Production deployment evidence.
