# Appointment Unscheduled Draft Availability Recommendations Contract

**Slice:** EAPT-029AH  
**Status:** Implemented initial API/UI recommendation boundary  
**Surface:** `/appointments` Appointment Board and `GET /api/appointments/:id/availability-recommendations`

## Purpose

When a manager is trying to place an unscheduled draft, the board should do more than warn or block the chosen slot. It should also suggest nearby schedulable slots that reuse the live scheduling engine, current draft duration, required staff, selected resources, and the proposed start time as the search anchor.

## Enterprise behavior

- The availability recommendation route accepts optional proposed schedule fields:
  - `proposedStartsAt`
  - `proposedEndsAt`
  - `proposedSchedulingTimezone`
  - `maximumCandidates`
  - `searchHorizonDays`
- The recommendation service overlays the proposed window in memory and does not save the appointment time.
- Recommendations reuse the existing availability-search and waitlist-ranking foundations instead of introducing a second ranking engine.
- The service resolves a search template from the appointment snapshot when possible and falls back safely to task-meeting or general templates when a draft does not carry a persisted purpose code.
- The board requests recommendations only for unscheduled live drafts and refreshes them as the selected date, start time, or duration changes.
- The board shows ranked slot suggestions and lets the user apply a suggestion back into the scheduling form before submitting the audited `SCHEDULE` command.

## Non-claims

- This slice does not auto-schedule the appointment.
- This slice does not bypass readiness, staff, or resource checks.
- This slice does not add drag-and-drop scheduling.
- This slice does not add browser workflow coverage.

## Acceptance evidence

- Focused route coverage proves proposed schedule and search query fields are normalized and passed to the recommendation service.
- Focused service coverage proves unscheduled drafts can return ranked candidate slots from the live scheduling search foundation.
- Appointment Board coverage plus type-check validation proves the UI can fetch and render recommendation state without breaking the existing board shell.
