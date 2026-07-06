# Appointment Proposed-Time Resource Candidate Availability Contract

**Slice:** EAPT-029AF  
**Status:** Implemented initial API/UI preview boundary  
**Surface:** `/appointments` Appointment Board and `GET /api/appointments/:id/resource-candidate-availability`

## Purpose

When an unscheduled draft is being scheduled into a proposed slot, proposed resource candidates must be evaluated against the slot the manager is actually choosing. A missing saved appointment time should not prevent the board from previewing whether an already proposed resource candidate is ready, warning-only, or blocked for the selected time.

## Enterprise behavior

- The resource candidate availability route accepts optional proposed schedule fields:
  - `proposedStartsAt`
  - `proposedEndsAt`
  - `proposedSchedulingTimezone`
- The availability service overlays the proposed window in memory and does not save the appointment time.
- Proposed resource reservations are evaluated against the proposed slot when those proposed fields are supplied.
- The Appointment Board sends the selected unscheduled-draft date, start time, and duration while loading candidate availability.
- The preview still enforces schedule visibility plus manager/owner mutation authority.

## Non-claims

- This slice does not commit, hold, or rewrite resource reservations.
- This slice does not override hard resource blocks.
- This slice does not add full availability-search recommendations.
- This slice does not add browser workflow coverage.

## Acceptance evidence

- Focused route coverage proves proposed schedule query fields are normalized and passed to the resource candidate availability service.
- Focused service coverage proves a missing-time draft can evaluate proposed resource candidates against a proposed schedule window.
- The board sends proposed schedule fields only for unscheduled draft candidate availability previews.
