# Appointment Scheduled Resource Replacement Contract

## Implementation Slice

EAPT-029R implements the first controlled replacement workflow for already scheduled appointments that have committed resource reservations.

## Business Purpose

Managers and appointment owners need a safe way to swap a committed resource after an appointment is scheduled without silently dropping capacity protection. Examples include a service bay becoming unavailable, a delivery vehicle being reassigned, or a customer-facing resource needing a same-day substitution.

## Day-One Enterprise Behavior

- Draft appointments with a `HELD` reservation keep the existing replacement flow:
  - release the held reservation;
  - cancel prior proposed candidates for the same requirement;
  - create a replacement `PROPOSED` reservation;
  - require the manager/owner to review and hold the new proposal.
- Scheduled appointments with a `COMMITTED` reservation now support a controlled committed swap:
  - release the old committed reservation;
  - create the replacement reservation as `COMMITTED`;
  - keep capacity protected throughout the scheduled appointment workflow.
- Replacement requires:
  - persisted appointment ID and expected version;
  - manager/owner mutation authority;
  - active location access;
  - same organization, location, and resource type;
  - a different replacement resource;
  - a valid appointment time window;
  - explicit reason code and reason notes.
- The replacement resource is checked through resource availability before the write.
- Warning-level or blocked replacement resources are not silently accepted in this slice. The manager must choose a cleanly available resource or use a later warning-override replacement workflow.
- All writes happen in one protected transaction:
  - appointment version increment;
  - old reservation marked `RELEASED`;
  - same-requirement proposed candidates marked `CANCELLED`;
  - replacement reservation created;
  - appointment history event written.

## UI Behavior

The Appointment Board Resource Planning section is visible for persisted live appointments, including scheduled/confirmed appointments. `HELD` and `COMMITTED` reservations expose:

- replacement reason field;
- selectable replacement resource candidate dropdown;
- Replace Reservation action.

After success:

- draft held replacement tells the user the new resource was proposed;
- scheduled committed replacement tells the user the new resource is committed.

## Audit Behavior

The history event records:

- released reservation ID;
- released resource ID, code, and name;
- released prior status (`HELD` or `COMMITTED`);
- replacement resource ID, code, and name;
- replacement status (`PROPOSED` or `COMMITTED`);
- reason code;
- reason notes;
- correlation ID;
- expected appointment version.

## Validation Evidence

- Focused tests:
  - `npm.cmd test -- --run src/tests/unit/appointment-resource-planning-service.test.ts src/tests/unit/appointment-resource-reservation-replace-route.test.ts`
- Static checks:
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`

## Deliberate Non-Claims

This slice does not yet implement:

- warning-level committed replacement override workflow;
- replacement-specific reason-code picker/catalog;
- production browser workflow evidence;
- participant-resource replacement workflows beyond the selected requirement model.
