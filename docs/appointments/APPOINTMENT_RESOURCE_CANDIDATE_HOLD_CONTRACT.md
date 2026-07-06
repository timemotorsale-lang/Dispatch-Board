# Appointment Resource Candidate Hold Contract

**Work package:** EAPT-029H  
**Status:** Implemented as initial proposed-to-held reservation workflow  
**Verified:** 2026-07-06

## Purpose

This contract defines the first capacity-protecting resource action in the Appointment Board.

The board can now convert a `PROPOSED` resource reservation into a `HELD` reservation after re-checking current availability. A held reservation consumes capacity for conflict evaluation, but it is still not the final committed scheduling state.

## User Flow

From `/appointments`:

1. User selects a persisted draft appointment.
2. User attaches a resource requirement.
3. User proposes a resource candidate.
4. The board displays the candidate availability result.
5. If the candidate is not hard-blocked, the user selects **Hold Candidate**.
6. The server re-checks resource operating windows, unavailability, held reservations, and committed reservations immediately before writing the hold.
7. The server changes the reservation from `PROPOSED` to `HELD`, increments the appointment version, and writes appointment history.
8. The board refreshes schedule readiness, resource planning, candidate availability, and live appointment data.

## Enterprise Controls

- Authentication is required.
- Location schedule access is required.
- Manager or appointment-owner authority is required.
- The appointment must be `DRAFT` or `PENDING_APPROVAL`.
- A valid appointment time window is required.
- The request must include the expected appointment version.
- The request must include a documented reason code and reason notes.
- The reservation must belong to the appointment and still be `PROPOSED`.
- Availability is re-evaluated before the hold is written.
- Hard-blocked candidates cannot be held.
- Warning-policy candidates can be held, with warning reasons returned and written into history metadata.
- The hold writes a `FIELD_UPDATED` appointment history event.

## API Shape

```http
POST /api/appointments/:id/resource-reservations/:reservationId/hold
```

Request body:

```json
{
  "expectedAppointmentVersion": 3,
  "reasonCode": "RESOURCE_CANDIDATE_HELD",
  "reasonNotes": "Held Service Bay 1 before scheduling.",
  "correlationId": "resource-hold-appointment-1-123"
}
```

Successful response:

```json
{
  "reservation": {
    "id": "reservation-proposed",
    "appointmentId": "appointment-id",
    "requirementId": "requirement-id",
    "resourceId": "resource-bay-1",
    "resourceCode": "BAY_1",
    "resourceName": "Service Bay 1",
    "status": "HELD",
    "startsAt": "2026-07-06T15:00:00.000Z",
    "endsAt": "2026-07-06T16:00:00.000Z",
    "capacityUnits": 1,
    "appointmentVersion": 4,
    "availabilityStatus": "READY",
    "warningReasons": []
  }
}
```

## Error Mapping

- `401` for unauthenticated requests.
- `403` for schedule visibility or command authorization failures.
- `404` when the appointment or proposed reservation cannot be found.
- `409` when the expected appointment version is stale.
- `400` for invalid payloads, non-draft appointments, invalid time windows, already-changed proposals, or hard-blocked holds.

## Not Yet Claimed

Still pending:

- warning override capture as a dedicated UI/history artifact
- release/change controls for held or committed reservations
- staff conflict preview alongside resource availability
