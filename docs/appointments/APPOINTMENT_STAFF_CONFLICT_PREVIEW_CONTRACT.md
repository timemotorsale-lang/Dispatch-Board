# Appointment Staff Conflict Preview Contract

**Work package:** EAPT-029P  
**Status:** Implemented as initial owner-staff conflict preview  
**Verified:** 2026-07-06

## Purpose

This contract adds a server-backed staff/person conflict preview to the Appointment Board detail rail.

Before this slice, the board could preview schedule readiness and resource conflicts, but it did not show whether the accountable staff owner was actually eligible and available for the appointment window. The board now evaluates owner staff availability through the existing staff availability service and displays the result before scheduling.

## User Flow

From `/appointments`:

1. User selects a persisted live draft appointment.
2. The board loads **Staff Conflict Preview** in the detail rail.
3. The server evaluates the appointment owner as the accountable staff person.
4. The preview returns `READY`, `WARNING`, or `BLOCKED`.
5. The board shows the owner name, role, status, and explanation.

## Enterprise Controls

- Authentication is required.
- Location schedule visibility is required.
- Manager or owner mutation authority is required.
- A missing owner produces `BLOCKED`.
- Invalid appointment time produces `BLOCKED`.
- Inactive staff, missing owner access, owner access gaps, missing staff resource, or mismatched staff resource produce `BLOCKED`.
- Staff-resource reservations, absences, and operating-window issues flow through the staff availability engine:
  - hard-block policies return `BLOCKED`
  - warning policies return `WARNING`
  - clean availability returns `READY`
- The preview excludes reservations from the same appointment to avoid self-conflict.

## API Shape

```http
GET /api/appointments/:id/staff-conflicts
```

Successful response:

```json
{
  "staffConflicts": {
    "appointmentId": "appointment-id",
    "appointmentNumber": "APT-20001",
    "bookingStatus": "DRAFT",
    "status": "WARNING",
    "canProceedWithStaff": true,
    "staff": {
      "userId": "user-brock",
      "name": "Brock Peterson",
      "role": "OWNER",
      "resourceId": "resource-staff-brock",
      "resourceName": "Brock Peterson"
    },
    "checks": [],
    "reasons": [
      "Resource capacity is already reserved during the candidate window."
    ]
  }
}
```

## Not Yet Claimed

Still pending:

- participant-staff conflict preview beyond the owner
- staff warning override workflow
- schedule-time enforcement for owner staff warnings
- staff reassignment controls
- browser workflow coverage for staff conflict display
