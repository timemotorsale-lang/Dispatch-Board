# Appointment Schedule Readiness Preview Contract

**Work package:** EAPT-029C  
**Status:** Implemented as initial server-backed warning/block preview  
**Verified:** 2026-07-06

## Purpose

This contract defines the first live readiness check shown before a persisted draft appointment is scheduled from the Appointment Board.

The board now asks the server whether the selected draft is ready to schedule. The response is shown in the detail rail as **Schedule Readiness** and is also used as a client-side safety guard before submitting `SCHEDULE`.

## User Flow

From `/appointments`:

1. User selects a persisted draft appointment.
2. The detail rail calls `GET /api/appointments/:id/schedule-readiness`.
3. The server verifies authentication, schedule visibility, and manager/owner change authority.
4. The server returns readiness checks as `READY`, `WARNING`, or `BLOCKED`.
5. The detail rail displays the checks before the user presses **Schedule Draft**.
6. If the readiness response contains a hard block, the board stops the schedule submission and shows the blocking reason.

## Current Readiness Checks

Hard blocks:

- Appointment must still be draft or pending approval.
- Appointment must have an owner.
- Appointment must have a valid start and end time.

Warnings:

- Customer context is missing.
- Vehicle context is missing.
- Resource requirements are not selected yet.

## Enterprise Controls

- Authentication is required.
- Location schedule access is required.
- Manager or appointment-owner authority is required.
- The readiness response is generated server-side from the persisted appointment record.
- Hard blocks are not treated as overridable by the UI.
- The existing `SCHEDULE` command boundary remains the final source of truth.

## API Shape

```http
GET /api/appointments/:id/schedule-readiness
```

Successful response:

```json
{
  "readiness": {
    "appointmentId": "appointment-id",
    "status": "WARNING",
    "canSubmitSchedule": true,
    "checks": [
      {
        "code": "RESOURCE_REQUIREMENTS_NOT_SELECTED",
        "label": "Resource requirements",
        "status": "WARNING",
        "message": "No resource requirements are selected yet. Scheduling can continue, but resource reservations are not protected."
      }
    ]
  }
}
```

## Not Yet Claimed

This slice does not claim the full enterprise conflict and reservation decision panel yet.

Still pending:

- appointment-template-driven resource requirement selection
- live candidate resource reservation UI
- staff/resource conflict preview against selected candidates
- warning override reason capture
- recurrence scheduling preview
- availability-search integration from the visible board
