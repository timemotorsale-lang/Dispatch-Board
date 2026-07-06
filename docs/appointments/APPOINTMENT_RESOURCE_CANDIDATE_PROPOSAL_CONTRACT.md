# Appointment Resource Candidate Proposal Contract

**Work package:** EAPT-029F  
**Status:** Implemented as initial proposed-resource selection boundary  
**Verified:** 2026-07-06

## Purpose

This contract defines the first visible candidate-selection action after an appointment resource requirement has been attached.

The Appointment Board can now propose a specific active resource candidate for an attached requirement. The proposal is stored as an `AppointmentResourceReservation` with status `PROPOSED`. A proposed reservation records manager/owner intent, but it does not consume capacity and does not guarantee the resource is held or committed.

## User Flow

From `/appointments`:

1. User selects a persisted draft appointment.
2. The detail rail loads **Resource Planning**.
3. User attaches a recommended requirement if needed.
4. For an attached requirement, the row shows active candidate resources.
5. User selects a candidate and clicks **Propose Candidate**.
6. The UI submits `POST /api/appointments/:id/resource-requirements/:requirementId/candidate-proposals`.
7. The server validates authentication, schedule visibility, manager/owner authority, draft state, expected version, requirement ownership, valid appointment time window, and active matching resource.
8. The server cancels prior `PROPOSED` reservations for that requirement, creates a new `PROPOSED` reservation, increments the appointment version, and writes a `FIELD_UPDATED` history event.
9. The board refreshes live appointments, Schedule Readiness, and Resource Planning.

## Enterprise Controls

- Authentication is required.
- Location schedule access is required.
- Manager or appointment-owner authority is required.
- Only draft or pending-approval appointments can receive candidate proposals.
- Expected appointment version is required.
- Stale versions return conflict.
- Requirement must belong to the appointment.
- Resource must be active, effective, at the appointment location, in the same organization, and match the requirement resource type.
- Prior proposed candidates for the same requirement are cancelled before the new proposal is recorded.
- `PROPOSED` reservations remain non-capacity-consuming.
- The write records a reasoned appointment history event.

## API Shape

```http
POST /api/appointments/:id/resource-requirements/:requirementId/candidate-proposals
```

Request body:

```json
{
  "resourceId": "resource-bay-1",
  "expectedAppointmentVersion": 4,
  "reasonCode": "RESOURCE_CANDIDATE_PROPOSED",
  "reasonNotes": "Proposed Service Bay 1 for Service bay from Appointment Board resource planning.",
  "correlationId": "resource-candidate-correlation-id"
}
```

Successful create response:

```json
{
  "proposal": {
    "id": "reservation-proposed",
    "appointmentId": "appointment-id",
    "requirementId": "requirement-id",
    "resourceId": "resource-bay-1",
    "resourceCode": "BAY_1",
    "resourceName": "Service Bay 1",
    "status": "PROPOSED",
    "capacityUnits": 1,
    "created": true,
    "cancelledPriorProposalCount": 1,
    "appointmentVersion": 5
  }
}
```

## Not Yet Claimed

Partially addressed after this slice:

- EAPT-029G evaluates proposed candidates against live resource availability and displays READY/WARNING/BLOCKED in the detail rail.

Still pending:

- held reservation workflow
- committed reservation workflow through the final scheduling command
- warning override capture
- release/change controls for held or committed reservations
- staff/resource conflict preview against proposed candidates
