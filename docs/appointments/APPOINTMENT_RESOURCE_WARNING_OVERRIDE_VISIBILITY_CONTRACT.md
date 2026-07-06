# Appointment Resource Warning Override Visibility Contract

**Work package:** EAPT-029N  
**Status:** Implemented as persisted override visibility in candidate availability  
**Verified:** 2026-07-06

## Purpose

This contract makes warning override state visible from the server-backed resource candidate availability preview.

Before this slice, the board could record a `WARNING_OVERRIDDEN` history event and the hold service could enforce that the override existed, but the browser only remembered the override in local state immediately after the button click. After a refresh or reload, the board could not show that the persisted override already existed.

The availability preview now returns per-candidate override status so the board can render persisted override state consistently.

## User Flow

From `/appointments`:

1. User selects a persisted live draft appointment.
2. A proposed resource candidate evaluates to `WARNING`.
3. Manager records **Override Warning**.
4. The board refreshes resource planning and candidate availability.
5. The availability preview returns that the warning override is satisfied.
6. The board shows **Warning Overridden** and allows **Hold Candidate** to proceed.
7. If the browser refreshes, the board still gets the persisted override status from the server.

## API Shape

The existing candidate availability endpoint remains the API boundary:

```http
GET /api/appointments/:id/resource-candidate-availability
```

Each proposal now includes:

```json
{
  "reservationId": "reservation-proposed",
  "status": "WARNING",
  "canProceedToHold": true,
  "warningOverrideRequired": true,
  "warningOverrideSatisfied": true,
  "warningKey": "RESOURCE|RESOURCE_WARNING|appointment-id|reservation-id|resource-id|..."
}
```

## Enterprise Controls

- The server computes the warning key using the same resource warning identity used by override capture and hold enforcement.
- Only warning-level proposals require override satisfaction.
- Ready proposals do not require an override.
- Hard-blocked proposals remain blocked and non-overridable.
- The availability preview checks persisted `WARNING_OVERRIDDEN` appointment history events.
- `canProceedToHold` is now false for warning-level proposals until the matching override exists.
- The board no longer relies only on temporary local state after the override button is clicked.

## Not Yet Claimed

Still pending:

- denormalized warning override status on the reservation row
- schedule-time enforcement for legacy held warning reservations
- explicit warning-override reason modal fields
- staff warning override visibility
- browser workflow coverage for refresh-after-override behavior
