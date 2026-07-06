# Appointment Proposed-Time Staff Warning Override Contract

**Slice:** EAPT-029AE  
**Status:** Implemented initial API/UI warning-override boundary  
**Surface:** `/appointments` Appointment Board and `POST /api/appointments/:id/staff-conflicts/override`

## Purpose

When an unscheduled draft is being scheduled into a proposed slot, manager staff-warning overrides must apply to that exact proposed slot. Otherwise the warning key shown before scheduling would not match the warning key enforced by the final `SCHEDULE` command.

## Enterprise behavior

- The staff-warning override route accepts optional proposed schedule fields:
  - `proposedStartsAt`
  - `proposedEndsAt`
  - `proposedSchedulingTimezone`
- The override service evaluates the proposed window in memory and does not save the appointment time.
- The Appointment Board sends the selected unscheduled-draft date, start time, and duration when overriding a staff warning from the proposed-time preview.
- The warning override history metadata records the warning key, staff identity, proposed start/end, proposed timezone, expected version, and documented manager reason.
- The final `SCHEDULE` command still re-evaluates staff conflicts and only proceeds when the matching override history is present.

## Non-claims

- This slice does not override hard staff blocks.
- This slice does not bypass the final `SCHEDULE` command validation.
- This slice does not add full availability-search recommendations.
- This slice does not add browser workflow coverage.

## Acceptance evidence

- Focused route coverage proves proposed schedule fields are normalized and passed to staff warning override service.
- Focused service coverage proves a missing-time draft can record a proposed-time staff warning override with proposed-window metadata.
- The board sends proposed schedule fields only for unscheduled draft overrides.
