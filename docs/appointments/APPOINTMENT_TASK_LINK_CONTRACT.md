# Appointment Task Link Contract

**Work package:** EAPT-007  
**Status:** Implemented foundation  
**Effective date:** 2026-07-05

## Purpose

Appointment task links connect appointment work and task work without merging their lifecycles.

An appointment may be created from a task, may create preparation or follow-up tasks, or may reference an existing task for context. The link explains the relationship, but the appointment booking state and task status remain independently controlled.

## Link Types

| Type | Meaning |
| --- | --- |
| `SOURCE` | The task caused or requested the appointment |
| `PREPARATION` | The task prepares for the appointment |
| `DEPENDENCY` | The task is required context or work before the appointment can proceed |
| `DURING_APPOINTMENT` | The task is performed during the appointment |
| `APPROVAL` | The task records approval or review work |
| `FOLLOW_UP` | The task is created or required after the appointment |
| `OUTCOME` | The task records outcome-specific work |
| `REFERENCE` | The task is contextual only |

## Independence Rules

- A linked task does not automatically change appointment booking, confirmation, attendance, or execution state.
- A linked appointment does not automatically change task status.
- Blocking behavior is explicit on the link through `blocksAppointment` and `blocksTask`.
- `REFERENCE` links cannot block either side.
- `SOURCE` links cannot block the source task by default.
- Automation-created links must carry both an automation rule code and a template version.

## Idempotency Boundary

The database prevents duplicate links with the same:

```text
appointmentId + taskId + linkCode
```

Automation layers may add stronger idempotency keys later, but this foundation prevents duplicate visible links for the same relationship code.

## Implemented Evidence

- `AppointmentTaskLinkType` enum in Prisma and application domain constants
- `AppointmentTaskLink` table with appointment, task, creator, type, code, blocking, automation, and version fields
- Unique link identity and operational indexes
- Additive migration `20260705203000_add_appointment_task_links`
- Server-side normalization and validation
- Unit and schema tests

## Next Boundary

EAPT-008 adds audit, activity, correlation, and internal notification event contracts. EAPT-030 through EAPT-033 later use this link foundation for persisted bidirectional read models, task blueprint generation, create-from-task workflows, and automation runtime behavior.
