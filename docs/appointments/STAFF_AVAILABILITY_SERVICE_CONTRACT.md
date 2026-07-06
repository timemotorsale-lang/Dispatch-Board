# Staff Availability and Location Eligibility Service Contract

**Work package:** EAPT-015  
**Status:** Implemented foundation  
**Scope:** Staff availability, staff-resource matching, location access, ownership eligibility, participation eligibility, and manager eligibility

## Purpose

The staff availability service determines whether a staff member can be scheduled for a proposed appointment window at a location.

It combines:

- `UserLocationAccess` eligibility from EAPT-005
- Staff schedulable-resource capacity from EAPT-014
- Location-local date handling from EAPT-013

This service does not yet select the best staff member or search across all staff. It evaluates one staff candidate in a reusable, scheduling-safe way.

## Implemented Capabilities

The service evaluates:

- Staff user active/inactive state
- Presence of a location access grant
- Access grant ownership by the same staff user
- Access grant matching the requested location
- Effective-dated location access
- Schedule-view permission
- Participation permission
- Appointment ownership permission
- Appointment management permission
- Matching staff schedulable resource
- Staff resource location match
- Staff resource active/effective status
- Staff operating windows
- Staff absences, outages, maintenance, and capacity reductions
- Staff held/committed appointment reservations
- Warning-only staff availability conflicts

## Role-Specific Eligibility

| Requested staff role | Required location grant |
| --- | --- |
| `PARTICIPANT` | `canViewSchedule` and `canParticipate` |
| `OWNER` | `canViewSchedule`, `canParticipate`, and `canOwnAppointments` |
| `MANAGER` | `canViewSchedule` and `canManageAppointments` |

The service evaluates scheduling eligibility, not live appointment mutation authority. Mutation authority remains enforced through the appointment command and policy boundaries.

## Staff Resource Requirement

A staff member is schedulable only when a matching staff resource exists:

- Resource kind is `STAFF`
- Resource user ID matches the staff user
- Resource location matches the requested location
- Resource availability evaluation passes or returns warning context

This prevents a user with location access from being scheduled without an explicit staff scheduling resource.

## Severity Rules

Location eligibility failures are hard blocks.

Examples:

- Inactive staff user
- Missing access grant
- Expired access grant
- Missing ownership eligibility for owner scheduling
- Missing staff resource
- Staff resource belongs to a different location or user

Availability failures from the staff resource follow the resource conflict policy. Staff defaults to warning behavior, so overlapping staff reservations or absences surface as warning-only unless the configured resource policy is stricter.

## Current Limits

This slice does not yet:

- Search across all eligible staff
- Rank staff by skills, workload, or priority
- Evaluate role/duty/skill tags
- Evaluate staff-specific recurring work schedules separate from resource windows
- Produce final appointment conflicts across location, resources, staff, tasks, templates, and recurrence

Those are handled in later E2 and E3 slices.

## Acceptance Evidence

Focused tests cover:

- Eligible owner with available staff capacity
- Participant eligibility without ownership eligibility
- Owner and manager grant requirements
- Inactive staff rejection
- Missing and expired location access rejection
- Missing, wrong-location, and wrong-user staff resources
- Staff reservation warning behavior
- Staff absence warning behavior
- Outside-working-window behavior through the resource evaluator
