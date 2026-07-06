# Appointment Proposed-Time Staff Conflict Preview Contract

**Slice:** EAPT-029AD  
**Status:** Implemented initial API/UI preview boundary  
**Surface:** `/appointments` Appointment Board and `GET /api/appointments/:id/staff-conflicts`

## Purpose

Managers should see owner and required-participant staff conflicts for the selected unscheduled-draft slot before submitting the final scheduling command.

## Enterprise behavior

- The staff-conflict API accepts optional proposed schedule query parameters:
  - `proposedStartsAt`
  - `proposedEndsAt`
  - `proposedSchedulingTimezone`
- The staff-conflict service evaluates the proposed window in memory and does not mutate the appointment.
- The Appointment Board sends the selected unscheduled-draft date, start time, and duration to the staff-conflict API.
- The existing Staff Conflict Preview panel updates as the proposed time changes.
- `Schedule This Draft` waits for staff preview and stays disabled when staff availability is blocked or warning override remains unsatisfied.
- The final `SCHEDULE` command remains the write-time authority.

## Non-claims

- This slice does not add proposed-time staff warning override creation.
- This slice does not add full availability-search recommendations.
- This slice does not add proposed resource candidate availability for unscheduled slots.
- This slice does not add browser workflow coverage.

## Acceptance evidence

- Focused route coverage proves proposed schedule query parameters are normalized and passed to the staff-conflict preview service.
- The board reuses the Staff Conflict Preview panel for the selected unscheduled-draft slot.
- The unscheduled-draft scheduling action is guarded by staff preview readiness.
