# Appointment Lifecycle and Conflict Matrix

**Status:** Planned policy for Enterprise Release 1.0  
**Purpose:** Define valid state transitions, documentation requirements, conflict outcomes, and operational protections

## 1. State Dimensions

Appointment state is represented across independent dimensions.

### 1.1 Booking State

| State | Meaning |
| --- | --- |
| `DRAFT` | Incomplete or under review; not committed to capacity |
| `PENDING_APPROVAL` | Complete enough to review but not yet approved for scheduling |
| `SCHEDULED` | Approved and committed to time and capacity |
| `CANCELLED` | Intentionally terminated with a recorded reason |
| `COMPLETED` | Operationally concluded with a valid outcome |

### 1.2 Confirmation State

| State | Meaning |
| --- | --- |
| `NOT_REQUIRED` | Template does not require confirmation |
| `NOT_SENT` | Confirmation is required but no request has been delivered or recorded |
| `PENDING` | Confirmation request is outstanding |
| `CONFIRMED` | Required party confirmed |
| `DECLINED` | Required party declined; disposition is required |

Because external communications are deferred, `PENDING`, `CONFIRMED`, and `DECLINED` can be recorded manually or by future integration events.

### 1.3 Attendance State

| State | Meaning |
| --- | --- |
| `EXPECTED` | Appointment has not checked in and is not a no-show |
| `CHECKED_IN` | Required attendee has arrived or remote meeting attendance has begun |
| `NO_SHOW` | Required attendee failed to attend under the approved grace-period rule |

### 1.4 Execution State

| State | Meaning |
| --- | --- |
| `NOT_STARTED` | Work has not begun |
| `IN_PROGRESS` | Appointment activity is actively occurring |
| `WAITING` | Appointment is paused and a reason is recorded |
| `FINISHED` | Appointment work is finished and ready for outcome completion |

## 2. Booking Transition Matrix

| From | Action | To | Allowed actor | Preconditions | Required documentation |
| --- | --- | --- | --- | --- | --- |
| None | Create incomplete | `DRAFT` | Manager, permitted owner, automation | Purpose or source context exists | Creation source |
| None | Create complete | `SCHEDULED` | Manager or permitted owner | All required fields; no hard conflict | Creation source |
| None | Automation create complete | `SCHEDULED` | System automation | Active rule; deterministic owner/time/resources; no hard conflict | Rule, version, trigger, correlation |
| None | Automation create incomplete | `DRAFT` | System automation | Active rule; unresolved required input | Missing facts and review reason |
| `DRAFT` | Submit for approval | `PENDING_APPROVAL` | Manager or owner | Required review fields complete | Submission event |
| `DRAFT` | Schedule | `SCHEDULED` | Manager or owner | All required facts; conflicts evaluated | Scheduling event |
| `PENDING_APPROVAL` | Approve | `SCHEDULED` | Manager | All required facts; conflicts reevaluated | Approval event |
| `PENDING_APPROVAL` | Return | `DRAFT` | Manager | Return reason | Reason and requested correction |
| `SCHEDULED` | Reschedule | `SCHEDULED` | Manager or owner | New slot valid; conflicts reevaluated | Structured reason; prior/new slot |
| `SCHEDULED` | Cancel | `CANCELLED` | Manager or owner | Cancellation policy satisfied | Structured reason and notes when required |
| `SCHEDULED` | Complete | `COMPLETED` | Manager or owner | Execution finished or approved exception; outcome complete | Outcome, reason, follow-up disposition |
| `CANCELLED` | Reinstate | `SCHEDULED` | Manager | Slot and resources reevaluated | Reinstate reason |
| `COMPLETED` | Correct outcome | `COMPLETED` | Manager | Correction policy satisfied | Prior/new outcome and correction reason |
| `COMPLETED` | Reopen | `SCHEDULED` | Manager | Exceptional correction only; capacity reevaluated | Reopen reason |

Direct transitions from `DRAFT` or `PENDING_APPROVAL` to `COMPLETED` are prohibited. Deletion of a committed appointment is prohibited; cancellation preserves history.

## 3. Confirmation Transition Matrix

| From | Action | To | Preconditions | Documentation |
| --- | --- | --- | --- | --- |
| `NOT_SENT` | Record request | `PENDING` | Confirmation required | Method and actor |
| `NOT_SENT` or `PENDING` | Confirm | `CONFIRMED` | Appointment scheduled | Confirmation source and timestamp |
| `NOT_SENT` or `PENDING` | Decline | `DECLINED` | Appointment scheduled | Decline reason and disposition |
| `CONFIRMED` | Withdraw confirmation | `DECLINED` | Reason provided | Reason and follow-up disposition |
| `DECLINED` | Reconfirm | `CONFIRMED` | Appointment still scheduled | Source and reason |
| Any | Mark not required | `NOT_REQUIRED` | Template or authorized exception allows | Policy or override reason |

A declined appointment cannot remain operationally unattended. It must be rescheduled, cancelled, or explicitly retained by a manager with a documented reason.

## 4. Attendance Transition Matrix

| From | Action | To | Preconditions | Documentation |
| --- | --- | --- | --- | --- |
| `EXPECTED` | Check in | `CHECKED_IN` | Appointment scheduled; actor authorized | Check-in timestamp and source |
| `EXPECTED` | Mark no-show | `NO_SHOW` | Grace-period rule satisfied or manager exception | Reason and required follow-up disposition |
| `NO_SHOW` | Correct check-in | `CHECKED_IN` | Manager correction | Correction reason |
| `CHECKED_IN` | Reverse check-in | `EXPECTED` | Manager or owner; execution not started | Reversal reason |

No-show requires one of:

- Follow-up task
- Replacement appointment
- Waitlist or callback disposition
- Closed with a documented no-follow-up reason

## 5. Execution Transition Matrix

| From | Action | To | Preconditions | Documentation |
| --- | --- | --- | --- | --- |
| `NOT_STARTED` | Start | `IN_PROGRESS` | Appointment scheduled; attendance policy satisfied; required blockers resolved | Start timestamp |
| `IN_PROGRESS` | Wait | `WAITING` | Waiting reason supplied | Reason and expected next step |
| `WAITING` | Resume | `IN_PROGRESS` | Waiting condition resolved or accepted | Resume event |
| `IN_PROGRESS` | Finish | `FINISHED` | Purpose-specific completion rules satisfied | Finish timestamp |
| `FINISHED` | Reopen execution | `IN_PROGRESS` | Manager or owner; appointment not finally closed or manager correction | Reopen reason |

Templates can require linked preparation tasks or approvals before execution begins or finishes.

## 6. Reason and History Policy

Every mutation creates automatic history. User-entered structured reasons are additionally required for:

- Cancellation
- Rescheduling
- No-show
- Confirmation decline
- Waiting
- Ownership transfer
- Warning override
- Reinstatement
- Reopening
- Outcome correction
- Bulk change
- Automation replay or suppression
- Removal of a required task link

Completion requires an outcome and follow-up disposition even when no exception occurred.

## 7. Conflict Severity Model

| Severity | System behavior | Override |
| --- | --- | --- |
| Information | Explain scheduling context without blocking action | Not needed |
| Warning | Show before commitment; require explicit resolution or manager override | Manager only, with reason |
| Hard block | Refuse commitment and identify the condition to resolve | Not allowed |

Warnings and blocks must be calculated server-side immediately before commitment. A stale client-side conflict check never authorizes the write.

## 8. Hard-Block Matrix

| Condition | Applies to | Required resolution |
| --- | --- | --- |
| Location is closed | Scheduled appointment | Choose open slot or approved closure exception configured in advance |
| Exclusive resource already committed beyond capacity | Vehicle, bay, room, equipment | Choose another slot or resource |
| Required resource unavailable or out of service | Configured mandatory resource | Restore availability or replace resource |
| Owner lacks location access | Owner | Select authorized owner |
| End is not after start | Appointment | Correct time |
| Required purpose field missing | Purpose-specific template | Supply field |
| Required customer or vehicle context missing | Template-controlled purpose | Supply context |
| Recurrence creates an invalid occurrence and policy requires all occurrences valid | Recurring series | Edit series or exception |
| Appointment is based on inactive purpose or template version not valid for new bookings | New booking | Select active configuration |
| Concurrent edit changed the appointment after it was loaded | Any mutation | Reload and reconcile |
| Duplicate idempotency or automation key already committed | Automated or retried operation | Return existing result instead of creating another |
| User lacks permission | Any protected action | Obtain proper authority; never override |

## 9. Warning Matrix

| Condition | Default handling | Manager override reason required |
| --- | --- | --- |
| Staff member has overlapping non-exclusive commitment | Warn | Yes |
| Preparation or cleanup buffer overlaps | Warn | Yes |
| Vehicle readiness task incomplete | Warn and surface task | Yes |
| Required preparation task is at risk but not template-blocking | Warn | Yes |
| Customer has another nearby appointment | Warn | Yes |
| Appointment is outside preferred purpose hours but within open hours | Warn | Yes |
| Expected duration exceeds configured norm | Warn | Yes |
| Resource utilization exceeds warning threshold but not capacity | Warn | Yes |
| Confirmation remains pending near start time | Warn | No scheduling override; operational acknowledgement recorded |
| Owner workload exceeds configured threshold | Warn | Yes |
| Recurrence contains warning-only occurrences | Preview all affected dates | One series-level reason plus affected occurrences |

## 10. Conflict Evaluation Order

Before scheduling, rescheduling, approving, reinstating, or changing resources:

1. Authenticate actor.
2. Authorize action and location.
3. Validate required fields and time.
4. Validate purpose and template.
5. Resolve timezone and recurrence.
6. Lock or protect relevant appointment version.
7. Evaluate location availability.
8. Evaluate exclusive-resource capacity.
9. Evaluate owner and participant availability.
10. Evaluate buffers and linked-task readiness.
11. Return hard blocks and warnings.
12. Require manager reason for selected warning overrides.
13. Commit appointment, resource reservations, and history atomically.
14. Emit internal activity and automation events.

## 11. Bulk and Recurring Operations

Bulk changes and recurring series require:

- Dry-run preview
- Count of affected appointments and occurrences
- Per-record permission evaluation
- Conflict summary
- Explicit handling choice for warning or failed records
- One operation identifier
- User-entered reason
- Atomicity policy displayed before confirmation
- Result summary with succeeded, skipped, and failed records
- Safe retry without duplicate changes

Series edits distinguish:

- This occurrence
- This and future occurrences
- Entire series

Historical completed or cancelled occurrences are never silently rewritten by a future-series edit.

## 12. Concurrency and Stale Data

- Every mutable appointment exposes a version or equivalent concurrency token.
- Mutations based on an outdated version fail with a reload-and-compare response.
- The interface preserves the user’s unsaved input where safe.
- Bulk actions and automation use the same protection.
- Conflict checks and resource reservations occur in the same protected operation.
- Last-write-wins behavior is prohibited for appointment mutations.

## 13. Lifecycle Acceptance Gate

The lifecycle and conflict model passes only when:

- Every valid transition succeeds for authorized actors.
- Every invalid transition fails without partial state.
- Required reasons cannot be bypassed.
- Hard conflicts cannot be overridden.
- Warning overrides are manager-only and auditable.
- Recurrence and bulk changes expose all affected records before commitment.
- Concurrent updates cannot silently overwrite one another.
- Appointment, resource reservation, history, and event results remain consistent.

