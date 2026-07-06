# Appointment Resource Reservation Replacement Contract

**Work package:** EAPT-029K  
**Status:** Implemented as initial held-reservation replacement workflow  
**Verified:** 2026-07-06

## Purpose

This contract defines the first guided resource replacement workflow in the Appointment Board.

Before this slice, a manager or appointment owner could release a held resource reservation, then manually propose a different resource candidate. The board now supports a single guarded action that releases the current `HELD` reservation and creates a new `PROPOSED` replacement candidate in one audited transaction.

## User Flow

From `/appointments`:

1. User selects a persisted draft appointment.
2. The appointment has an attached resource requirement and a `HELD` reservation.
3. User selects a different resource in the candidate dropdown.
4. User selects **Replace Reservation**.
5. The server validates authentication, schedule access, manager/owner authority, expected appointment version, draft/pending appointment state, held reservation ownership, replacement resource eligibility, and reason documentation.
6. The server releases the old held reservation.
7. The server cancels any prior proposed candidates for that requirement.
8. The server creates a new `PROPOSED` reservation for the replacement resource.
9. The server increments appointment version and writes appointment history.
10. The board refreshes Resource Planning and candidate availability. The user can then review availability and hold the new candidate.

## Enterprise Controls

- Authentication is required.
- Location schedule access is required.
- Manager or appointment-owner authority is required.
- The appointment must be `DRAFT` or `PENDING_APPROVAL`.
- The existing reservation must belong to the appointment and still be `HELD`.
- The replacement resource must be active, effective, in the same organization/location, and match the requirement resource type.
- The replacement resource must be different from the currently held resource.
- The request must include expected appointment version.
- The request must include reason code and reason notes.
- The replacement happens in one transaction:
  - appointment version increments
  - held reservation becomes `RELEASED`
  - prior proposed reservations for the same requirement become `CANCELLED`
  - replacement reservation is created as `PROPOSED`
  - appointment history records the change

## API Shape

```http
POST /api/appointments/:id/resource-reservations/:reservationId/replace
```

Request body:

```json
{
  "resourceId": "resource-bay-2",
  "expectedAppointmentVersion": 4,
  "reasonCode": "RESOURCE_RESERVATION_REPLACED",
  "reasonNotes": "Moved from Bay 1 to Bay 2 before scheduling.",
  "correlationId": "resource-replacement-appointment-1-123"
}
```

Successful response:

```json
{
  "replacement": {
    "id": "reservation-replacement",
    "appointmentId": "appointment-id",
    "requirementId": "requirement-id",
    "resourceId": "resource-bay-2",
    "resourceCode": "BAY_2",
    "resourceName": "Service Bay 2",
    "status": "PROPOSED",
    "startsAt": "2026-07-06T15:00:00.000Z",
    "endsAt": "2026-07-06T16:00:00.000Z",
    "capacityUnits": 1,
    "created": true,
    "cancelledPriorProposalCount": 0,
    "appointmentVersion": 5,
    "releasedReservationId": "reservation-held",
    "releasedResourceId": "resource-bay-1",
    "releasedResourceCode": "BAY_1",
    "releasedResourceName": "Service Bay 1",
    "releasedPriorStatus": "HELD"
  }
}
```

## Error Mapping

- `401` for unauthenticated requests.
- `403` for schedule visibility or command authorization failures.
- `404` when the appointment or held reservation cannot be found.
- `409` when the expected appointment version is stale.
- `400` for invalid payloads, non-draft appointments, invalid time windows, same-resource replacement, unavailable replacement resources, or already-changed held reservations.

## Not Yet Claimed

Still pending:

- committed scheduled resource replacement through a reschedule/reassignment workflow
- automatic hold of the replacement candidate after warning override review
- explicit replacement-reason modal fields instead of the current board-generated reason note
- staff conflict preview alongside resource availability
- browser workflow coverage for attach → propose → hold → replace → hold → schedule
