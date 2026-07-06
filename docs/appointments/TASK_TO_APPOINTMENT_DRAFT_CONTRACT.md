# Task-to-Appointment Draft Contract

**Work package:** EAPT-032 initial implementation  
**Status:** Implemented as an initial task-detail workflow  
**Date:** 2026-07-06

## Purpose

Tasks can now initiate a linked appointment when the work requires meeting a customer, staff member, manager, or other participant.

This first implementation creates an unscheduled draft appointment. The draft then moves through the existing Appointment Board scheduling workflow, where readiness, resource, staff, warning, and hard-block checks are enforced before it becomes scheduled.

## Implemented behavior

- The task detail workspace includes a **Create Appointment** rail card.
- A manager or the assigned task owner can create the appointment draft.
- The workflow requires a documented reason before submission.
- The task route posts to `POST /api/tasks/:id/appointments`.
- The service submits the existing audited `CREATE_DRAFT` appointment command.
- The created appointment is sourced as `TASK`.
- The appointment receives a `SOURCE_TASK` appointment-task link.
- The task activity feed records that the draft appointment was created.
- The draft inherits task context into appointment snapshots:
  - source task id and title
  - task status and workflow area
  - assigned user
  - board date
  - customer reference, when available
  - vehicle reference, when available

## Authority rules

- General Manager/delegated manager can create a draft appointment from a task.
- Assigned task owner can create their own draft appointment from the task.
- Unassigned or unrelated staff cannot create a draft appointment from someone else’s task.
- Appointment mutation after creation remains governed by the Appointment manager/owner policy.

## Scheduling rules

This workflow does not schedule the appointment directly.

The resulting draft is intentionally unscheduled so that the existing Appointment Board controls can:

- pick date, time, duration, and resources;
- preview readiness;
- check staff conflicts;
- check resource availability;
- require warning overrides when needed;
- hard-block invalid schedules;
- record final scheduling reason notes.

## Validation evidence

Initial focused coverage:

```text
npm test -- task-appointment-service.test.ts task-detail-workspace.test.tsx appointment-lifecycle-transaction-service.test.ts
npm run typecheck
```

## Remaining work

- Browser workflow coverage for task detail → create draft → Appointment Board scheduling.
- Richer task-link actions from the Appointment Board detail rail.
- Admin-configurable automation rules that can create appointments from task templates or task state changes.
- Multi-location task routing once tasks carry explicit location context.
