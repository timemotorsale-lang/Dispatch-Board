# Appointment Participant Staff Warning Override Enforcement Contract

## Implementation Slice

EAPT-029T formalizes participant staff warning override and Schedule Draft enforcement.

## Business Purpose

Once required internal participants are part of staff conflict preview, warning governance must apply to them the same way it applies to the appointment owner. A manager should be able to knowingly accept a participant-level warning with a documented reason, and Schedule Draft must block unresolved participant staff warnings.

## Day-One Enterprise Behavior

- Staff warning override now supports the actionable staff member returned by Staff Conflict Preview:
  - owner staff;
  - required internal participant staff.
- The override records:
  - staff user ID;
  - staff name;
  - staff role (`OWNER` or `PARTICIPANT`);
  - staff role code;
  - staff resource ID/name;
  - warning key;
  - reason code;
  - reason notes;
  - correlation ID.
- A warning override is only allowed when:
  - the appointment is draft or pending approval;
  - the actor is an authorized manager;
  - the staff conflict is warning-level;
  - the appointment version matches.
- Hard blocks remain non-overridable.
- Schedule Draft consumes the aggregate staff conflict preview, so unresolved participant warnings create unresolved schedule warnings just like owner warnings.

## UI Behavior

The Appointment Board staff override copy now uses required-staff language and includes the staff role code where available. For example:

- `Rayana Hassan (OFFICE ADMIN) staff warning was overridden with a documented manager reason.`

## Validation Evidence

- Focused tests:
  - `npm.cmd test -- --run src/tests/unit/appointment-staff-conflict-preview-service.test.ts src/tests/unit/appointment-staff-conflict-preview-route.test.ts src/tests/unit/appointment-command-execution-service.test.ts`
- Static checks:
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`

## Deliberate Non-Claims

This slice does not yet implement:

- staff reassignment controls;
- a dedicated participant-specific override modal;
- reason-code catalog/templates;
- browser workflow evidence;
- denormalized warning marker columns.
