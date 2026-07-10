# Appointment Schedule Commit Gate

**Branch:** `codex/appointment-schedule-commit-gate`  
**Status:** Implemented as day-one schedule commit proof.  
**Scope:** Eligible draft-to-scheduled command execution, schedule-readiness enforcement, hard-block rejection, staff-warning override enforcement, and browser proof from the Appointment Board.

## Gate Promise

This gate proves that scheduling is not just a visual affordance in the Appointment Console. A live unscheduled draft can become a scheduled appointment only through the audited `SCHEDULE` command path.

The command path must:

- require `startsAt` and `endsAt`;
- enforce expected appointment version and idempotency;
- evaluate schedule readiness and staff conflict preview before execution;
- reject hard conflicts;
- reject unresolved staff warnings;
- allow scheduling when warning override state is already satisfied;
- write appointment status/window, command completion, history, reservation commits, and schedule-time automation effects together.

## Automated Evidence

- `appointment-command-execution-service.test.ts` publishes `appointmentScheduleCommitGate`, proves successful schedule execution, proves hard-block/unresolved-warning rejection, proves warning-overridden scheduling proceeds, and proves duplicate/stale commands do not execute.
- `appointment-lifecycle-command-service.test.ts` proves lifecycle planning rejects hard conflicts, unresolved warnings, and past schedule times before transaction execution.
- `daily-workflow.spec.ts` now creates a task-originated unscheduled draft, opens it on `/appointments`, submits **Schedule This Draft**, and verifies the API read model shows the appointment as `SCHEDULED` with start/end times and the original linked task.

## MVP Interpretation

This closes the schedule commit reliability gap for day-one MVP. It does not claim full scheduling optimization, drag-and-drop rescheduling, bulk rescheduling, or every resource warning branch in-browser. Those remain deeper scheduling workflow slices.
