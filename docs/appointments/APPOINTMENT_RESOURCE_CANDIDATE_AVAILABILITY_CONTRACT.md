# Appointment Resource Candidate Availability Contract

**Work package:** EAPT-029G  
**Status:** Implemented as initial proposed-candidate availability preview  
**Verified:** 2026-07-06

## Purpose

This contract defines the first live availability check for proposed resource candidates in the Appointment Board.

The board can now evaluate `PROPOSED` resource reservations against current resource operating windows, outages/unavailability, held reservations, and committed reservations. This preview does not itself hold or commit capacity; the hold workflow is handled by EAPT-029H.

## User Flow

From `/appointments`:

1. User selects a persisted draft appointment.
2. User attaches a resource requirement and proposes a resource candidate.
3. The detail rail calls `GET /api/appointments/:id/resource-candidate-availability`.
4. The server validates authentication, schedule visibility, manager/owner authority, and a valid appointment time window.
5. The server evaluates each proposed candidate with the existing resource availability evaluator.
6. The Resource Planning row displays **Availability: READY**, **WARNING**, **BLOCKED**, or unavailable/loading state.

## Enterprise Controls

- Authentication is required.
- Location schedule access is required.
- Manager or appointment-owner authority is required.
- Evaluation uses persisted `PROPOSED` reservations.
- `PROPOSED` reservations remain non-capacity-consuming.
- Existing `HELD` and `COMMITTED` reservations consume capacity.
- Resource operating windows and unavailability are evaluated server-side.
- Hard-block resources return `BLOCKED`.
- Warning-policy resources can return `WARNING`.
- The final hold/commit workflow remains separate from preview and must re-check availability before writing capacity-consuming reservations.

## API Shape

```http
GET /api/appointments/:id/resource-candidate-availability
```

Successful response:

```json
{
  "resourceCandidateAvailability": {
    "appointmentId": "appointment-id",
    "appointmentNumber": "APT-20001",
    "status": "READY",
    "canProceedToHold": true,
    "proposals": [
      {
        "reservationId": "reservation-proposed",
        "requirementId": "requirement-id",
        "requirementCode": "SERVICE_BAY",
        "resourceId": "resource-bay-1",
        "resourceCode": "BAY_1",
        "resourceName": "Service Bay 1",
        "status": "READY",
        "canProceedToHold": true,
        "reasons": [],
        "availableCapacity": 1,
        "requiredCapacity": 1,
        "reservedCapacity": 0,
        "unavailableCapacity": 0
      }
    ]
  }
}
```

## Not Yet Claimed

Still pending:

- warning override capture
- replacement/change workflow for swapping one resource to another
- staff conflict preview alongside resource availability
