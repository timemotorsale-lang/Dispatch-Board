# Appointment Resource Requirement Attachment Contract

**Work package:** EAPT-029E  
**Status:** Implemented as initial resource requirement write boundary  
**Verified:** 2026-07-06

## Purpose

This contract defines the first safe write action from the Appointment Board **Resource Planning** panel.

The board can now attach a server-recommended resource requirement to a persisted draft appointment. This creates the requirement record, increments the appointment version, and writes appointment history. It does not yet select a specific resource or reserve capacity.

## User Flow

From `/appointments`:

1. User selects a persisted draft appointment.
2. The detail rail loads **Resource Planning**.
3. For a recommended requirement whose resource type is configured and not already attached, the row shows **Attach Requirement**.
4. The UI submits `POST /api/appointments/:id/resource-requirements`.
5. The server validates authentication, schedule visibility, manager/owner authority, draft state, expected version, recommendation eligibility, and configured resource type.
6. The server creates the `AppointmentResourceRequirement`, increments the appointment version, and writes a `FIELD_UPDATED` history event.
7. The board refreshes live appointments, schedule readiness, and resource planning.

## Enterprise Controls

- Authentication is required.
- Location schedule access is required.
- Manager or appointment-owner authority is required.
- Only draft or pending-approval appointments can receive requirements from this action.
- Expected appointment version is required.
- Stale versions return conflict.
- The requested requirement must match the approved category-based recommendation.
- The matching resource type must be configured and active.
- Existing requirements are returned idempotently instead of duplicated.
- The write records a reasoned appointment history event.

## API Shape

```http
POST /api/appointments/:id/resource-requirements
```

Request body:

```json
{
  "requirementCode": "SERVICE_BAY",
  "expectedAppointmentVersion": 3,
  "reasonCode": "RESOURCE_REQUIREMENT_ADDED",
  "reasonNotes": "Attached recommended Service bay requirement from Appointment Board resource planning.",
  "correlationId": "resource-requirement-correlation-id"
}
```

Successful create response:

```json
{
  "requirement": {
    "id": "requirement-id",
    "appointmentId": "appointment-id",
    "resourceTypeId": "resource-type-service-bay",
    "requirementCode": "SERVICE_BAY",
    "requiredCapacity": 1,
    "isMandatory": true,
    "assignmentTiming": "AT_BOOKING",
    "hardBlockIfUnfulfilled": true,
    "created": true,
    "appointmentVersion": 4
  }
}
```

## Not Yet Claimed

Partially addressed after this slice:

- EAPT-029F lets the UI propose a specific active resource candidate as a non-capacity-consuming `PROPOSED` reservation.

Still pending:

- checking live resource availability for the appointment time window
- holding or committing a reservation
- release/change requirement flows
- manager warning override capture
- including reservation candidates in the final schedule command
