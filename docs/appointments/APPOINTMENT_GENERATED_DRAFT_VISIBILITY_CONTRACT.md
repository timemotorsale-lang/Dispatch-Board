# Appointment Generated Draft Visibility Contract

**Work package:** EAPT-029Z  
**Status:** Implemented initial read-model and board-selection bridge  
**Surface:** `/appointments`  
**Depends on:** EAPT-029Y follow-up draft appointment automation

## Purpose

When outcome automation creates a follow-up draft appointment, the manager must be able to see and schedule it immediately. A generated draft should not disappear just because it has no scheduled start/end time yet.

## Implemented Behavior

- The appointment read repository now includes unscheduled `DRAFT` and `PENDING_APPROVAL` appointments for the selected location in the board read model.
- Generated follow-up draft appointments created by `COMPLETE` are therefore returned after the board refresh.
- `Save Outcome` refreshes the board without replacing the automation success notice.
- If the command result includes generated follow-up appointment numbers, the board selects the generated draft after refresh.
- The success notice tells the manager which draft appointment was created and selected.

## Guardrails

- Cancelled appointments remain excluded unless `includeCancelled` is explicitly requested.
- Unscheduled completed appointments are not shown by the date-window board query.
- Generated follow-up drafts remain unscheduled and must still pass the normal Schedule Draft workflow before becoming scheduled appointments.

## Evidence

- `src/server/repositories/appointment-read-repository.ts`
- `src/server/services/appointment-read-service.ts`
- `src/features/appointments/appointment-board-shell.tsx`
- `src/tests/unit/appointment-read-service.test.ts`
- `src/tests/unit/appointment-board-shell.test.tsx`

## Still Pending

- Dedicated unscheduled/draft lane instead of placing unscheduled drafts at the default board start time.
- Browser workflow coverage for completing an appointment and scheduling the generated draft.
- Parent/child appointment reporting beyond source snapshot/reference.
