# Appointment Unscheduled Draft Scheduling Contract

**Slice:** EAPT-029AB  
**Status:** Implemented initial UI/API command bridge  
**Surface:** `/appointments` Appointment Board

## Purpose

Unscheduled follow-up drafts must be schedulable from the Appointment Board without bypassing the enterprise lifecycle command path. The board now lets an authorized manager or appointment owner choose a Minneapolis date/time window, document why the draft is being scheduled, and submit the existing `SCHEDULE` command.

## Enterprise behavior

- The detail rail shows **Schedule Unscheduled Draft** only for live draft appointments that do not have a saved start/end time.
- The form captures appointment date, start time, duration, and required scheduling reason notes.
- Submission sends `SCHEDULE` to `/api/appointments/commands` with:
  - appointment ID,
  - expected appointment version,
  - generated idempotency/correlation key,
  - proposed `startsAt` / `endsAt`,
  - scheduling timezone,
  - reason code and reason notes.
- The command executor passes the proposed schedule window into the staff-conflict preview so unscheduled drafts are evaluated against the selected time instead of the missing saved time.
- The lifecycle planner records optional schedule reason details on the `SCHEDULED` history event.
- After success, the board refreshes the live read model and keeps the scheduled appointment selected.

## Non-claims

- This slice does not add availability-search recommendations.
- This slice does not add drag-and-drop scheduling.
- This slice does not add browser workflow coverage.
- This slice does not yet expose proposed-time readiness preview before submit; the command path remains the write-time authority.

## Acceptance evidence

- Focused command-execution tests prove proposed schedule times are passed to staff-conflict evaluation for unscheduled drafts.
- Board UI provides a dedicated reason-required scheduling form for unscheduled drafts.
- Timed calendar placement still comes from the refreshed read model after the command succeeds.
