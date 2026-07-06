# Appointment Owner Reassignment UI Contract

**Work package:** EAPT-029V  
**Status:** Implemented initial UI command bridge  
**Date:** 2026-07-06

## Scope

EAPT-029V adds a board-visible control for transferring the accountable owner of a persisted live appointment.

The control is intentionally limited to appointment ownership reassignment. It does not replace the future enterprise staff directory, staff administration, or full appointment participant reassignment workflow.

## Implemented Behavior

- The Appointment Board detail rail shows an **Owner Reassignment** section for persisted live appointments.
- The current accountable owner and live record version are displayed before any change is submitted.
- Candidate owners are derived from live board appointment owners and staff returned by the staff-conflict preview, avoiding mockup-only staff IDs in live command payloads.
- A new accountable owner must be selected.
- A written reassignment reason is required before submission.
- Submission uses the existing `TRANSFER_OWNER` lifecycle command through `/api/appointments/commands`.
- The command payload includes:
  - appointment id
  - expected appointment version
  - generated idempotency/correlation id
  - new `ownerUserId`
  - `APPOINTMENT_OWNER_TRANSFERRED` reason code
  - contextual reason notes that include the prior owner, new owner, and user-entered reason
- On success, the board refreshes from the live read model and the detail rail refresh key advances.
- Server-side authorization remains authoritative: only an authorized manager can transfer appointment ownership.

## Guardrails

- Preview-only appointments cannot submit owner reassignment.
- The current owner cannot be reselected as the target owner.
- Empty reassignment reasons are blocked client-side and still protected server-side by lifecycle reason requirements.
- Mockup staff members are not sent as transfer targets unless they are also represented by live appointment/staff-conflict data.
- Stale appointment versions are protected by the existing command boundary.

## Evidence

- UI implementation: `src/features/appointments/appointment-board-shell.tsx`
- Styling: `src/app/globals.css`
- Existing backend command planner: `src/server/appointments/appointment-lifecycle-command-service.ts`
- Existing command route orchestration: `src/server/services/appointment-command-execution-service.ts`

## Verification

```text
npm run lint
npm test -- src/tests/unit/appointment-lifecycle-command-service.test.ts
```

## Deferred Work

- Full staff directory / admin settings workflow for maintaining staff, roles, eligibility, business hours, and appointment-owner permissions.
- Dedicated owner-transfer modal with reason-code templates.
- Participant reassignment controls.
- Browser workflow coverage against a seeded live appointment with multiple eligible owner candidates.
- Production-like audit export review for ownership transfer events.
