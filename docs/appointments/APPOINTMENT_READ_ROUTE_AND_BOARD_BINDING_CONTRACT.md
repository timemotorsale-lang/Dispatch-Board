# Appointment Read Route and Board Binding Contract

**Work package:** EAPT-026 UI binding continuation  
**Status:** Implemented as API and client hydration boundary  
**Verified:** 2026-07-06

## Purpose

This contract connects the implemented appointment read model to the visible Appointment Board without removing the approved mockup fallback.

The board now attempts to load persisted appointment records from the appointment read API. If no persisted appointments exist for the selected day, the board keeps showing the approved preview composition so the screen remains useful while database-backed appointment creation and seeding continue.

## API Boundary

`GET /api/appointments`

Supported query inputs:

- `date=YYYY-MM-DD`
- `locationId`
- `windowStart` and `windowEnd`
- `includeCancelled=true|false`

Default behavior:

- Location defaults to Time Motor Sales — Minneapolis.
- Date defaults to the current day in the Minneapolis timezone.
- A `date` query resolves to the full local-day window using the shared location-time service.

## Security and Visibility

The route uses the existing appointment read service, so it inherits:

- Authentication checks.
- Location schedule-access checks.
- Manager, owner, participant, and location-viewer visibility projection.
- Customer and vehicle masking rules.
- Cancelled appointment filtering unless explicitly requested.

## Board Binding

The `/appointments` client now:

- Fetches the read API for the selected board day.
- Converts live read-model rows into calendar cards.
- Preserves appointment IDs and versions for command execution.
- Adds live owners as staff columns when they are not part of the mockup staff baseline.
- Keeps the mockup fallback when the read model returns zero rows or cannot be loaded.
- Shows a status banner explaining whether live data or preview fallback is active.

## Not Yet Claimed

This contract does not claim:

- Persisted day-one sample appointment records exist.
- The New Appointment modal creates records.
- Live reschedule, create, edit, and completion UI flows are fully wired.
- Browser workflow tests cover a persisted appointment end to end.
- Production deployment evidence exists.
