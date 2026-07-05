# Appointment Event, Audit, and Correlation Contract

**Work package:** EAPT-008  
**Status:** Implemented foundation  
**Effective date:** 2026-07-05

## Purpose

Appointment history events are the durable, appointment-scoped record of what happened, who or what caused it, why it happened, and how it relates to other work.

The existing Dispatch Board `ActivityEvent` remains board-day/task-feed oriented. Enterprise appointments require history that survives outside a single daily board and supports future automation, notification, reporting, audit, replay, and integration contracts.

## Event Scope

Every appointment history event has:

- Appointment ID
- Event type
- Actor type
- Optional actor user
- Message
- Correlation ID
- Metadata object
- Occurrence timestamp

Events may also include:

- Task ID
- Appointment-task link ID
- Reason code and notes
- Causation ID
- Automation rule code and version
- Prior and new values
- Notification intent

## Actor Types

| Actor type | Meaning |
| --- | --- |
| `HUMAN` | A signed-in user performed the action |
| `SYSTEM` | The application recorded an internal/system event |
| `AUTOMATION` | A configured automation rule evaluated or acted |
| `IMPORT` | A future import/integration process created the event |

Human events require an actor user. Automation events require rule code and rule version.

## Event Families

| Family | Event examples |
| --- | --- |
| Creation and scheduling | `CREATED`, `DRAFT_UPDATED`, `APPROVED`, `SCHEDULED`, `RESCHEDULED`, `CANCELLED` |
| Confirmation and attendance | `CONFIRMED`, `DECLINED`, `CHECKED_IN`, `NO_SHOW_RECORDED` |
| Execution and outcome | `STARTED`, `WAITING`, `FINISHED`, `COMPLETED`, `OUTCOME_RECORDED` |
| Field and ownership changes | `OWNER_CHANGED`, `FIELD_UPDATED` |
| Conflict and warning handling | `WARNING_OVERRIDDEN`, `CONFLICT_DETECTED` |
| Task linkage | `TASK_LINKED`, `TASK_UNLINKED` |
| Automation | `AUTOMATION_EVALUATED`, `AUTOMATION_FAILED` |
| Internal notification | `NOTIFICATION_QUEUED` |
| Bulk operations | `BULK_ACTION_PREVIEWED`, `BULK_ACTION_APPLIED` |
| Notes | `NOTE_ADDED` |

## Required Reasons

The foundation requires structured reason code and notes for:

- `RESCHEDULED`
- `CANCELLED`
- `DECLINED`
- `NO_SHOW_RECORDED`
- `WAITING`
- `WARNING_OVERRIDDEN`
- `BULK_ACTION_APPLIED`

Additional command-specific services may require reasons for more events.

## Prior/New Value Rules

The foundation requires prior and new JSON objects for:

- `RESCHEDULED`
- `OWNER_CHANGED`
- `FIELD_UPDATED`
- `WARNING_OVERRIDDEN`

These values are for audit and reconciliation. Sensitive values must be redacted or represented as safe summaries before writing history.

## Correlation Rules

Every event requires a correlation ID. The correlation ID groups events that belong to one user action, automation execution, retry, replay, bulk operation, or future integration command.

`causationId` may point to the event, rule execution, command, or imported message that directly caused the new event.

## Internal Notification Contract

`NOTIFICATION_QUEUED` events require a `notificationIntent` object. This preserves the fact that the system intended to notify someone before the full notification delivery system exists.

Future notification services will convert this intent into read-state, retry, suppression, and delivery records.

## Implemented Evidence

- `AppointmentEventActorType` enum
- `AppointmentHistoryEventType` enum
- `AppointmentHistoryEvent` table
- Appointment, task, appointment-task-link, and actor-user references
- Correlation and automation indexes
- SQL safeguards for message, correlation, human actor, and automation version requirements
- Server-side event normalization and validation
- Unit and schema tests

## Next Boundary

EAPT-009 defines idempotency, transaction, retry, and stale-write boundaries. Later E3 command services will write these history events transactionally with appointment mutations, task links, resource reservations, and automation execution results.
