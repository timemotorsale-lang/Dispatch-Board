# Appointment Outcome and Follow-Up UI Contract

**Work package:** EAPT-029W  
**Status:** Implemented initial UI command bridge  
**Surface:** `/appointments` detail rail  
**Command path:** `COMPLETE` through `/api/appointments/commands`

## Purpose

The Appointment Board must let the manager or appointment owner close a real appointment from the visible detail rail without bypassing enterprise lifecycle controls.

This contract converts the mockup-aligned Outcome and Next Step / Follow-Up area from preview-only controls into a governed workflow:

1. Check In the customer or appointment participant.
2. Start Work when the appointment actually begins.
3. Finish Work when execution is complete.
4. Save Outcome with final outcome, follow-up disposition, next-step notes when required, and an audit reason.

## Implemented Behavior

- The board carries live lifecycle fields from the appointment read model:
  - booking status
  - attendance status
  - execution status
  - outcome code and notes
  - follow-up disposition code and notes
- The detail rail exposes live `Start Work` and `Finish Work` buttons for persisted appointments.
- The detail rail exposes controlled fields for:
  - outcome
  - follow-up disposition
  - outcome notes
  - next step / follow-up notes
  - completion reason
- `Save Outcome` submits `COMPLETE` through the appointment command route with:
  - appointment ID
  - expected appointment version
  - generated idempotency key
  - generated correlation ID
  - outcome payload
  - follow-up payload
  - reason code `OUTCOME_RECORDED`
  - documented reason notes
- The board refreshes from the live read model after every operational command so the visible state stays aligned with persisted state.

## Guardrails

- Preview appointments cannot save outcomes because they do not have persisted record IDs and versions.
- Draft appointments cannot save outcomes.
- No-show appointments are excluded from `COMPLETE` and must remain on the no-show follow-up workflow.
- `Save Outcome` is blocked until execution status is `FINISHED`.
- A documented completion reason is required.
- Follow-up notes are required when the follow-up disposition is anything other than `NO_FOLLOW_UP_REQUIRED`.
- The backend lifecycle planner blocks `COMPLETE` before finish and after no-show.
- Completion writes both `COMPLETED` and `OUTCOME_RECORDED` history effects.

## Evidence

- `src/server/appointments/appointment-lifecycle-command-service.ts`
- `src/server/repositories/appointment-read-repository.ts`
- `src/server/services/appointment-read-service.ts`
- `src/features/appointments/appointment-board-shell.tsx`
- `src/tests/unit/appointment-lifecycle-command-service.test.ts`
- `src/tests/unit/appointment-read-service.test.ts`

## Still Pending

- Dedicated reason-code catalog/templates.
- Final completion browser workflow coverage.
- Task automation triggered from outcome/follow-up disposition.
- Follow-up task or appointment creation from the saved disposition.
- Production operational evidence.
