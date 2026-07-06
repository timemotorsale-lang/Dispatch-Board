# Appointment Outcome Follow-Up Appointment Automation Contract

**Work package:** EAPT-029Y  
**Status:** Implemented initial transaction-backed draft appointment automation  
**Trigger:** `COMPLETE` appointment command  
**Automation rule:** `APPOINTMENT_OUTCOME_FOLLOW_UP_APPOINTMENT` version 1

## Purpose

When a completed appointment requires another appointment, the system should create a governed draft appointment automatically instead of leaving only a reminder for staff to recreate the context manually.

This automation creates an unscheduled draft follow-up appointment. It does not guess a date, time, staff availability, or resource reservation.

## Implemented Behavior

When `COMPLETE` is submitted with `followUpDispositionCode = FOLLOW_UP_APPOINTMENT_REQUIRED`, the lifecycle planner creates:

- the completed appointment update;
- the existing follow-up task automation from EAPT-029X;
- a new draft appointment with:
  - source type `AUTOMATION`;
  - source reference set to the completed appointment ID;
  - title `Follow-up: {original title}`;
  - same organization, location, owner, and timezone as the completed appointment;
  - no start/end time;
  - booking status `DRAFT`;
  - customer and vehicle snapshots from the board-provided references when available;
  - source snapshot pointing back to the original appointment.

The command also records `AUTOMATION_EVALUATED` history on the completed appointment and adds `automatedFollowUpAppointmentCount` / `createdAppointmentCount` to the command execution result.

## Guardrails

- The follow-up appointment remains a draft until a user schedules it through the normal Schedule Draft workflow.
- No availability or resource commitment is assumed.
- The draft appointment is created in the same lifecycle transaction as completion, task creation, task linking, history, and command completion.
- If any write fails, the whole lifecycle transaction rolls back.

## Evidence

- `src/server/appointments/appointment-lifecycle-command-service.ts`
- `src/server/appointments/appointment-lifecycle-transaction-service.ts`
- `src/server/repositories/appointment-lifecycle-transaction-repository.ts`
- `src/tests/unit/appointment-lifecycle-command-service.test.ts`
- `src/tests/unit/appointment-lifecycle-transaction-service.test.ts`

## Still Pending

- Browser workflow coverage for completed appointment → generated draft appointment.
- UI surfacing of the generated draft appointment ID/number in the success notice.
- Admin-editable automation templates and due rules.
- Dedicated appointment-to-appointment relationship table if future reporting requires direct parent/child traversal beyond source snapshots.
