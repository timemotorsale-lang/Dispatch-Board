# Appointment Proposed-Time Resource Mutation Contract

**Slice:** EAPT-029AG  
**Status:** Implemented initial API/UI mutation boundary  
**Surface:** `/appointments`, `POST /api/appointments/:id/resource-requirements/:requirementId/candidate-proposals`, and `POST /api/appointments/:id/resource-reservations/:reservationId/hold`

## Purpose

Unscheduled draft appointments need to reserve resources for the slot the manager is selecting before the appointment time is saved. Resource proposal and hold actions must therefore use the proposed scheduling window from the board instead of requiring the appointment record to already have persisted start/end times.

## Enterprise behavior

- Resource candidate proposal accepts optional proposed schedule fields:
  - `proposedStartsAt`
  - `proposedEndsAt`
  - `proposedSchedulingTimezone`
- For missing-time drafts, the Appointment Board sends the selected date, start time, duration, and timezone when proposing a resource candidate.
- The proposal service stores the proposed window on the `PROPOSED` resource reservation while leaving the appointment itself unscheduled.
- If the same resource is already proposed for the same requirement and same proposed window, the service returns the existing proposal instead of creating a duplicate.
- If the same resource is proposed for a different window, prior proposed reservations for that requirement are cancelled and a new proposal is created for the new window.
- Hold now validates and rechecks the proposed reservation window, so a missing-time draft can hold a proposed candidate before the final Schedule command persists the appointment time.
- The hold action still enforces manager/owner authority, expected version, current availability, warning overrides, and documented reason notes.

## Non-claims

- This slice does not schedule the appointment by itself.
- This slice does not bypass resource availability checks.
- This slice does not override hard resource blocks.
- This slice does not add drag-and-drop scheduling or availability recommendations.
- This slice does not add browser workflow coverage.

## Acceptance evidence

- Focused route coverage proves proposed schedule fields are parsed and passed to the resource proposal service.
- Focused service coverage proves a missing-time draft can create a proposed resource reservation for the proposed window.
- Focused hold coverage proves a missing-time draft can hold a proposed resource candidate using the reservation window.
- Full validation confirms lint, type-check, unit coverage, and Prisma schema validation remain clean.
