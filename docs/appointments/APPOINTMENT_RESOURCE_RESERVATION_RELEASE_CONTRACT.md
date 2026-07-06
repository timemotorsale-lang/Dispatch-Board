# Appointment Resource Reservation Release Contract

**Work package:** EAPT-029J  
**Status:** Implemented as initial held/committed reservation release control  
**Verified:** 2026-07-06

## Purpose

This contract defines the first Appointment Board control for releasing protected resource capacity.

The board can now release `HELD` and `COMMITTED` resource reservations with a documented reason. This gives managers and appointment owners a controlled way to free a service bay, vehicle, room, equipment, or other schedulable resource when the appointment plan changes.

## User Flow

From `/appointments`:

1. User selects a persisted live appointment.
2. Resource Planning loads for the appointment.
3. If the selected resource reservation is `HELD` or `COMMITTED`, the board shows **Release Reservation**.
4. User selects **Release Reservation**.
5. The server validates authentication, schedule access, manager/owner authority, expected appointment version, active appointment state, reservation ownership, and reason documentation.
6. The server changes the reservation to `RELEASED`, increments the appointment version, and writes appointment history.
7. The board refreshes resource planning, schedule readiness when applicable, and live appointment state.

## Enterprise Controls

- Authentication is required.
- Location schedule access is required.
- Manager or appointment-owner authority is required.
- The appointment must be active: `DRAFT`, `PENDING_APPROVAL`, or `SCHEDULED`.
- The reservation must belong to the appointment.
- Only `HELD` and `COMMITTED` reservations can be released from this control.
- The request must include the expected appointment version.
- The request must include a documented reason code and reason notes.
- The appointment version increments when the reservation is released.
- A `FIELD_UPDATED` appointment history event records prior status, new status, resource identity, requirement identity, reason, and correlation.

## API Shape

```http
POST /api/appointments/:id/resource-reservations/:reservationId/release
```

Request body:

```json
{
  "expectedAppointmentVersion": 4,
  "reasonCode": "RESOURCE_RESERVATION_RELEASED",
  "reasonNotes": "Released Service Bay 1 after customer changed timing.",
  "correlationId": "resource-release-appointment-1-123"
}
```

Successful response:

```json
{
  "reservation": {
    "id": "reservation-held",
    "appointmentId": "appointment-id",
    "requirementId": "requirement-id",
    "resourceId": "resource-bay-1",
    "resourceCode": "BAY_1",
    "resourceName": "Service Bay 1",
    "priorStatus": "HELD",
    "status": "RELEASED",
    "startsAt": "2026-07-06T15:00:00.000Z",
    "endsAt": "2026-07-06T16:00:00.000Z",
    "capacityUnits": 1,
    "appointmentVersion": 5
  }
}
```

## Error Mapping

- `401` for unauthenticated requests.
- `403` for schedule visibility or command authorization failures.
- `404` when the appointment or releasable reservation cannot be found.
- `409` when the expected appointment version is stale.
- `400` for invalid payloads, inactive appointment states, missing release documentation, or already-changed reservations.

## Not Yet Claimed

Still pending:

- explicit release-reason modal fields instead of the current board-generated reason note
- replacement/change workflow that releases one resource and proposes another in one guided path
- warning override UI/history capture
- staff conflict preview alongside resource availability
- browser workflow coverage for attach → propose → hold → schedule → release
