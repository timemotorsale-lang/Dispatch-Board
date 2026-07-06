# Appointment Proposed-Time Readiness Preview Contract

**Slice:** EAPT-029AC  
**Status:** Implemented initial API/UI preview boundary  
**Surface:** `/appointments` Appointment Board and `GET /api/appointments/:id/schedule-readiness`

## Purpose

Managers should see whether a selected schedule slot is ready, warning, or blocked before submitting the final scheduling command for an unscheduled draft.

## Enterprise behavior

- The schedule-readiness API accepts optional proposed schedule query parameters:
  - `proposedStartsAt`
  - `proposedEndsAt`
  - `proposedSchedulingTimezone`
- The readiness service evaluates the proposed window in memory and does not mutate the appointment.
- The Appointment Board sends the selected unscheduled-draft date, start time, and duration to the readiness API.
- The existing Schedule Readiness detail panel updates as the proposed time changes.
- The unscheduled-draft Schedule button is disabled while readiness is loading or when readiness reports a hard block.
- The final `SCHEDULE` command remains the write-time authority.

## Non-claims

- This slice does not add full availability-search recommendations.
- This slice does not add drag-and-drop scheduling.
- This slice does not add browser workflow coverage.
- This slice does not yet preview resource candidate availability for proposed unscheduled slots.

## Acceptance evidence

- Focused service coverage proves a missing-time draft can pass the time-window readiness check when a valid proposed window is supplied.
- Focused route coverage proves proposed schedule query parameters are normalized and passed to the readiness service.
- The board reuses the Schedule Readiness panel for the selected unscheduled-draft slot.
