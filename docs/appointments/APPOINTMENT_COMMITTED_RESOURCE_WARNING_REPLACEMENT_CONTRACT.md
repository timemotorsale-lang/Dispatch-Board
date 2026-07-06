# Appointment Committed Resource Warning Replacement Contract

## Implementation Slice

EAPT-029U adds warning-level committed resource replacement with documented manager acceptance.

## Business Purpose

Scheduled appointments sometimes need a committed resource swap even when the replacement resource has a warning-level capacity issue. Enterprise behavior should not silently block every warning, but it also must not treat warnings as invisible. A manager/owner replacement action with explicit reason notes now creates the audit trail for accepting the warning during the committed swap.

## Day-One Enterprise Behavior

- Clean scheduled committed replacements continue to proceed as `READY`.
- Warning-level scheduled committed replacements can proceed when:
  - the appointment is already scheduled;
  - the existing reservation is `COMMITTED`;
  - the replacement resource evaluates to warning-only, not hard-blocked;
  - the acting user can mutate the appointment;
  - explicit reason code and reason notes are supplied;
  - the expected appointment version matches.
- Hard-block replacement conflicts remain rejected.
- Draft held replacement still does not use this warning-acceptance path; draft replacement remains a proposed-candidate workflow.

## Audit and Response Behavior

The replacement result now includes:

- `availabilityStatus`: `READY` or `WARNING`;
- `warningReasons`: the warning explanations returned by resource availability.

The history event records:

- replacement availability status;
- warning reasons;
- `warningOverrideAccepted: true` when a warning-level committed replacement proceeds;
- released prior reservation status;
- replacement reservation status;
- reason code, reason notes, and correlation ID.

## UI Behavior

When a scheduled committed replacement succeeds with warning-level availability, the Appointment Board success notice explicitly says the manager warning was accepted and shows the warning reason text.

## Validation Evidence

- Focused tests:
  - `npm.cmd test -- --run src/tests/unit/appointment-resource-planning-service.test.ts src/tests/unit/appointment-resource-reservation-replace-route.test.ts`
- Static checks:
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`

## Deliberate Non-Claims

This slice does not yet implement:

- a dedicated replacement-warning modal;
- replacement-specific reason-code catalog/templates;
- browser workflow evidence;
- denormalized warning marker columns.
