# Appointment Resource Warning Hold Enforcement Contract

**Work package:** EAPT-029M  
**Status:** Implemented as initial warning-before-hold enforcement  
**Verified:** 2026-07-06

## Purpose

This contract closes the first enforcement loop between resource warning override capture and resource reservation hold.

Before this slice, the board could record a manager override for a warning-level proposed resource candidate, but the hold workflow did not require that override before changing a `PROPOSED` reservation to `HELD`. The hold service now blocks warning-level candidates until a matching `WARNING_OVERRIDDEN` appointment history event exists.

## User Flow

From `/appointments`:

1. User selects a persisted live draft appointment.
2. User attaches a resource requirement and proposes a resource candidate.
3. Candidate availability reports `WARNING`.
4. If the user selects **Hold Candidate** before the warning is overridden, the server rejects the hold.
5. Manager selects **Override Warning** and the server records a `WARNING_OVERRIDDEN` history event.
6. User selects **Hold Candidate** again.
7. The server re-evaluates availability and confirms the matching override history exists.
8. The candidate can then move from `PROPOSED` to `HELD`.

## Enterprise Controls

- Hard blocks remain non-overridable and still cannot be held.
- Clean `READY` candidates do not need warning override history.
- Warning-level candidates require a persisted `WARNING_OVERRIDDEN` event before they can become capacity-consuming holds.
- The override match uses the same warning key generated from:
  - warning source
  - appointment ID
  - reservation ID
  - resource ID
  - current warning reasons
- Hold still enforces all existing controls:
  - authentication
  - schedule visibility
  - manager or owner mutation authority
  - draft/pending appointment state
  - expected appointment version
  - reason code and notes
  - server-side availability recheck
  - appointment version increment
  - appointment history write

## API Behavior

The existing hold endpoint remains the API boundary:

```http
POST /api/appointments/:id/resource-reservations/:reservationId/hold
```

New warning enforcement failure:

```json
{
  "error": "Resource warning must be overridden before this candidate can be held."
}
```

This maps to `400` because the user can resolve it by completing the manager warning override workflow.

## Not Yet Claimed

Still pending:

- persisted override marker on the reservation itself
- warning override summary in candidate availability responses after page refresh
- schedule-time enforcement for legacy held warning reservations that predate this slice
- explicit warning-override reason modal fields
- staff warning override and staff hold/schedule enforcement
- browser workflow coverage for warning → blocked hold → override → successful hold
