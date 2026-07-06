# Appointment Participant Staff Conflict Preview Contract

## Implementation Slice

EAPT-029S extends Staff Conflict Preview from accountable owner-only evaluation to required internal staff participants.

## Business Purpose

Appointments often depend on more than one employee. A service advisor may own the appointment while an office/admin participant, salesperson, manager, or delivery staff member still needs to attend. Enterprise scheduling must reveal those participant conflicts before schedule commitment so the board does not create an appointment that only works for the owner.

## Day-One Enterprise Behavior

- `GET /api/appointments/:id/staff-conflicts` now evaluates:
  - the accountable appointment owner;
  - internal-user appointment participants where `attendanceRequired = true`.
- Customer and external participants are not treated as staff scheduling resources in this slice.
- Duplicate staff users are evaluated once, with owner taking precedence over participant display.
- Each staff member is checked through the existing staff availability service:
  - location eligibility;
  - participant/owner authority at the location;
  - active staff resource matching;
  - staff resource operating windows;
  - staff unavailability;
  - overlapping held/committed reservations.
- The response keeps the existing aggregate fields for compatibility:
  - `status`;
  - `canProceedWithStaff`;
  - `warningOverrideRequired`;
  - `warningOverrideSatisfied`;
  - `warningKey`;
  - `staff`;
  - `reasons`.
- The response now also includes:
  - `staffMembers`;
  - enriched per-staff `checks`.

## Aggregation Rules

- Any blocked staff member makes the aggregate status `BLOCKED`.
- If there are no blocks but one or more staff warnings, the aggregate status is `WARNING`.
- If every required staff member is cleanly available, the aggregate status is `READY`.
- `canProceedWithStaff` is true only when:
  - all staff are ready; or
  - all warning-level staff conflicts have matching persisted warning overrides.
- The top-level `staff` field points to the most actionable person:
  - first blocked staff member;
  - otherwise first unresolved warning staff member;
  - otherwise first warning staff member;
  - otherwise owner/first staff member.

## UI Behavior

The Appointment Board Staff Conflict Preview section now renders:

- an aggregate summary row;
- one row for each required staff check.

This gives managers the source of the conflict without hiding participant-level issues behind the owner summary.

## Schedule Enforcement

Schedule Draft continues to consume the aggregate staff conflict result. Because the aggregate now includes participant staff, unresolved participant staff hard blocks and warning conflicts are included in schedule-time rejection/warning behavior.

## Validation Evidence

- Focused tests:
  - `npm.cmd test -- --run src/tests/unit/appointment-staff-conflict-preview-service.test.ts src/tests/unit/appointment-staff-conflict-preview-route.test.ts src/tests/unit/appointment-command-execution-service.test.ts`
- Static checks:
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`

## Deliberate Non-Claims

This slice does not yet implement:

- staff reassignment controls;
- participant-specific override UI copy/modal;
- reason-code catalog/templates;
- browser workflow evidence;
- denormalized staff warning markers.
