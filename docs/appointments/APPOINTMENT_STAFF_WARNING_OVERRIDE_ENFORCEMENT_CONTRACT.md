# Appointment Staff Warning Override Enforcement Contract

**Work package:** EAPT-029Q  
**Status:** Implemented as initial owner-staff warning override and schedule enforcement  
**Verified:** 2026-07-06

## Purpose

This contract closes the first staff-warning loop in the Appointment Board.

Before this slice, the board could preview owner-staff warning conflicts, but scheduling did not require a documented manager acceptance. The board now lets a manager override warning-level owner-staff conflicts, stores that decision in appointment history, reflects persisted override status in the staff conflict preview, and blocks Schedule Draft while a staff warning remains unresolved.

## User Flow

From `/appointments`:

1. User selects a persisted live draft appointment.
2. **Staff Conflict Preview** evaluates the accountable owner.
3. If owner-staff availability is warning-level, the board shows **Manager staff warning reason**.
4. Manager enters a reason and selects **Override Staff Warning**.
5. The server validates manager authority, appointment version, draft state, current staff warning state, and reason documentation.
6. The server writes a `WARNING_OVERRIDDEN` history event with staff warning metadata.
7. The staff preview refreshes and shows the warning as satisfied.
8. Schedule Draft injects unresolved owner-staff warnings into the lifecycle command payload if no matching override exists.

## Enterprise Controls

- Authentication is required.
- Location schedule visibility is required.
- Only an authorized manager can override staff warnings.
- Staff hard blocks cannot be overridden.
- Ready staff availability cannot be overridden because there is no warning to accept.
- Staff warning override requires expected appointment version, reason code, and reason notes.
- Schedule Draft rejects unresolved owner-staff warnings with lifecycle rejection code `UNRESOLVED_WARNING`.
- Persisted override state is matched through a stable warning key based on:
  - warning source
  - appointment ID
  - staff user ID
  - staff resource ID
  - current warning reasons

## API Shape

```http
POST /api/appointments/:id/staff-conflicts/override
```

Request body:

```json
{
  "expectedAppointmentVersion": 4,
  "reasonCode": "STAFF_WARNING_OVERRIDDEN",
  "reasonNotes": "Manager accepts overlap because another advisor is covering intake.",
  "correlationId": "staff-warning-override-appointment-1-123"
}
```

Successful response:

```json
{
  "staffWarningOverride": {
    "appointmentId": "appointment-id",
    "appointmentNumber": "APT-20001",
    "staffUserId": "user-brock",
    "staffName": "Brock Peterson",
    "resourceId": "resource-staff-brock",
    "resourceName": "Brock Peterson",
    "status": "OVERRIDDEN",
    "warningCode": "STAFF_OVERLAP",
    "warningKey": "STAFF|STAFF_OVERLAP|appointment-id|user-brock|resource-staff-brock|...",
    "reasons": [
      "Resource capacity is already reserved during the candidate window."
    ],
    "appointmentVersion": 5
  }
}
```

## Not Yet Claimed

Still pending:

- participant-staff warning overrides beyond the accountable owner
- staff reassignment workflow
- denormalized staff warning override markers
- browser workflow coverage for warning → blocked schedule → override → successful schedule
- manager approval modal/catalog-driven reason codes
