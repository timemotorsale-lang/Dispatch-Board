# Appointment Resource Planning Preview Contract

**Work package:** EAPT-029D  
**Status:** Implemented as initial server-backed resource planning preview  
**Verified:** 2026-07-06

## Purpose

This contract defines the first visible resource-planning layer in the Appointment Board detail rail.

The board now asks the server what resource requirements are recommended for a persisted draft appointment and whether matching active resources are configured at the appointment location. This is a read-only planning slice. It does not yet create a requirement, reserve a resource, or schedule against resource capacity.

## User Flow

From `/appointments`:

1. User selects a persisted draft appointment.
2. The detail rail calls `GET /api/appointments/:id/resource-planning`.
3. The server verifies authentication, schedule visibility, and manager/owner change authority.
4. The server infers the appointment category from the purpose snapshot or title.
5. The server returns recommended resource requirements, matching resource type configuration, selected requirement state, and active candidate counts.
6. The detail rail displays **Resource Planning** below **Schedule Readiness**.

## Current Recommendation Mapping

| Appointment category | Requirement | Resource type | Policy |
| --- | --- | --- | --- |
| Sales / Test Drive | Test-drive vehicle | `VEHICLE` | Mandatory, hard-block if unfulfilled |
| Service / Repair | Service bay | `SERVICE_BAY` | Mandatory, hard-block if unfulfilled |
| Vehicle Delivery | Delivery vehicle | `VEHICLE` | Mandatory, hard-block if unfulfilled |
| Customer Issue | Customer meeting staff | `STAFF` | Mandatory, warning/manager-controlled if unfulfilled |
| Documentation / DMV | Documentation room or desk | `ROOM` | Mandatory, hard-block if unfulfilled |
| Collections / Payment | Payment review room or desk | `ROOM` | Mandatory, warning/manager-controlled if unfulfilled |
| Inventory / Vendor | Inventory vehicle | `VEHICLE` | Mandatory, hard-block if unfulfilled |
| Marketing / Listing | Media equipment | `EQUIPMENT` | Optional |
| Other / General | Location capacity | `LOCATION` | Mandatory, warning/manager-controlled if unfulfilled |

## Enterprise Controls

- Authentication is required.
- Location schedule access is required.
- Manager or appointment-owner authority is required.
- The preview uses persisted appointment data.
- Missing resource configuration is reported explicitly.
- No resource is silently assumed available.
- No reservation is committed by this slice.

## API Shape

```http
GET /api/appointments/:id/resource-planning
```

Successful response:

```json
{
  "resourcePlanning": {
    "appointmentId": "appointment-id",
    "appointmentNumber": "APT-20001",
    "category": "service",
    "status": "CONFIGURATION_NEEDED",
    "canManageResourcesForAppointment": true,
    "recommendations": [
      {
        "requirementCode": "SERVICE_BAY",
        "label": "Service bay",
        "resourceTypeCode": "SERVICE_BAY",
        "resourceTypeName": "Service Bay",
        "status": "CONFIGURATION_NEEDED",
        "activeCandidateCount": 0,
        "message": "Service Bay exists, but no active resources are configured for this location."
      }
    ]
  }
}
```

## Not Yet Claimed

Still pending:

- create/update appointment resource requirements from the UI
- active resource candidate selection
- live resource availability evaluation for the selected time window
- reservation hold/commit/release UI
- warning override capture
- integration with the final `SCHEDULE` payload as reservation candidates
