# Appointment Resource Warning Override Contract

**Work package:** EAPT-029L  
**Status:** Implemented as initial resource warning override workflow  
**Verified:** 2026-07-06

## Purpose

This contract defines the first board-visible warning override workflow for resource planning.

Before this slice, warning-level resource conflicts could be evaluated and displayed, but the Appointment Board did not provide a persisted manager action that documented why the warning was accepted. The board now exposes an **Override Warning** action for proposed resource candidates with warning-level availability results.

## User Flow

From `/appointments`:

1. User selects a persisted live draft appointment.
2. The appointment has an attached resource requirement and a `PROPOSED` resource candidate.
3. The candidate availability preview reports `WARNING`.
4. User selects **Override Warning**.
5. The server validates authentication, location schedule access, manager authority, expected appointment version, proposal ownership, draft/pending appointment state, valid appointment time, and reason documentation.
6. The server re-evaluates current resource availability.
7. If the candidate is still warning-level, the server records a `WARNING_OVERRIDDEN` appointment history event.
8. The server increments appointment version.
9. The board marks the warning as overridden locally and refreshes live appointment/resource planning state.

## Enterprise Controls

- Authentication is required.
- Location schedule visibility is required.
- Manager authority is required; appointment ownership alone is not enough for warning overrides.
- The appointment must be `DRAFT` or `PENDING_APPROVAL`.
- The reservation must belong to the appointment and still be `PROPOSED`.
- The appointment must have a valid start/end time.
- The resource candidate is rechecked server-side immediately before override.
- Hard-blocked candidates cannot be overridden.
- Clean/ready candidates cannot be overridden because there is no warning to accept.
- The request must include expected appointment version.
- The request must include reason code and reason notes.
- The override writes a `WARNING_OVERRIDDEN` appointment history event with:
  - warning key
  - resource ID and reservation ID
  - requirement code
  - warning reasons
  - prior warning snapshot
  - new override status
  - source metadata and correlation ID

## API Shape

```http
POST /api/appointments/:id/resource-reservations/:reservationId/warning-override
```

Request body:

```json
{
  "expectedAppointmentVersion": 4,
  "reasonCode": "RESOURCE_WARNING_OVERRIDDEN",
  "reasonNotes": "Manager accepted bay overlap because customer will wait.",
  "correlationId": "resource-warning-override-appointment-1-123"
}
```

Successful response:

```json
{
  "warningOverride": {
    "appointmentId": "appointment-id",
    "appointmentNumber": "APT-20001",
    "reservationId": "reservation-proposed",
    "requirementId": "requirement-id",
    "requirementCode": "SERVICE_BAY",
    "resourceId": "resource-bay-1",
    "resourceCode": "BAY_1",
    "resourceName": "Service Bay 1",
    "status": "OVERRIDDEN",
    "warningCode": "RESOURCE_WARNING",
    "warningKey": "RESOURCE|RESOURCE_WARNING|appointment-id|reservation-proposed|resource-bay-1|...",
    "reasons": [
      "Resource capacity is already reserved during the candidate window.",
      "Resource does not have enough available capacity."
    ],
    "appointmentVersion": 5
  }
}
```

## Error Mapping

- `401` for unauthenticated requests.
- `403` for schedule visibility failures or missing manager authority.
- `404` when the appointment or proposed reservation cannot be found.
- `409` when the expected appointment version is stale.
- `400` for invalid payloads, non-draft appointments, invalid time windows, ready/no-warning candidates, hard blocks, or missing reason documentation.

## Not Yet Claimed

Still pending:

- explicit warning-override reason modal fields instead of the current board-generated reason note
- persisted override linkage that changes later hold/schedule enforcement behavior
- requiring an override before holding a warning-level candidate
- staff conflict preview and staff warning overrides beside resource warnings
- browser workflow coverage for propose → warning override → hold → schedule
