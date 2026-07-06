# Appointment Outcome Follow-Up Automation Contract

**Work package:** EAPT-029X  
**Status:** Implemented initial transaction-backed automation  
**Trigger:** `COMPLETE` appointment command  
**Automation rule:** `APPOINTMENT_OUTCOME_FOLLOW_UP_TASK` version 1

## Purpose

When an appointment is completed with a follow-up disposition that requires action, the system must not rely on memory or manual re-entry. It should create a governed internal task and link it back to the completed appointment in the same command transaction.

## Implemented Behavior

The `COMPLETE` lifecycle planner now evaluates the final follow-up disposition:

- `NO_FOLLOW_UP_REQUIRED` creates no task.
- `TASK_CREATED` creates no additional task because the user has indicated a task already exists.
- `CALLBACK_REQUIRED` creates a callback task.
- `FOLLOW_UP_APPOINTMENT_REQUIRED` creates a task to schedule the next appointment.
- `MANAGER_REVIEW_REQUIRED` creates a manager-review task.

The generated task:

- is assigned to the appointment owner;
- falls back to the completing user when the appointment has no owner;
- is due the next business day;
- carries the appointment customer and vehicle references when supplied by the board;
- is linked to the appointment with link type `FOLLOW_UP`;
- records automation metadata through the task template snapshot;
- is created in the same transaction as appointment completion, task link creation, appointment history, and command completion.

## Transaction Rule

The follow-up task is not created as a separate best-effort side effect.

If task creation, task linking, appointment history, reservation release, appointment update, or command completion fails, the lifecycle transaction rolls back together.

## Audit and Result Snapshot

When automation creates a task, the appointment command plan includes:

- `COMPLETED` history
- `OUTCOME_RECORDED` history
- `TASK_LINKED` history
- `automatedTaskCount` in the command result snapshot
- `createdTaskCount` in the execution result snapshot
- `createdTaskLinkCount` in the execution result snapshot

## Evidence

- `src/server/appointments/appointment-lifecycle-command-service.ts`
- `src/server/appointments/appointment-lifecycle-transaction-service.ts`
- `src/server/repositories/appointment-lifecycle-transaction-repository.ts`
- `src/features/appointments/appointment-board-shell.tsx`
- `src/tests/unit/appointment-lifecycle-command-service.test.ts`
- `src/tests/unit/appointment-lifecycle-transaction-service.test.ts`
- `src/tests/unit/appointment-lifecycle-transaction-repository.test.ts`

## Still Pending

- Admin-editable automation templates.
- Configurable due-time and owner-routing rules.
- Browser workflow coverage for the complete → generated task path.
- Browser workflow coverage for generated follow-up tasks.
- Activity-feed event emission for generated follow-up tasks.
