# Staff Execution and Handoff Engine Architecture

**Module:** DB-ACCOUNTABILITY-059  
**Product placement:** Dispatch Board, Tasks, My Day, Manager Review, Activity Feed  
**Status:** Approved target architecture  
**Delivery roadmap:** `docs/STAFF_EXECUTION_HANDOFF_ROADMAP.md`

---

## 1. Purpose

The Staff Execution and Handoff Engine closes the operating loop between generated work and completed work:

```text
Role and duty ownership
  -> daily work plan
  -> staff acknowledgement
  -> task execution and evidence
  -> next-work recommendation
  -> end-of-day confirmation
  -> manager intervention and carryover
```

The module helps staff understand what they own, document blockers, prove completion, request more work, and hand unfinished work forward. It helps managers see operational gaps without turning Dispatch Board into an HR, payroll, timekeeping, or disciplinary system.

## 2. Product Principles

1. Support execution rather than monitor presence.
2. Prefer event-based workflow signals over passive timers.
3. Explain every recommendation and health condition.
4. Reuse Tasks, duties, checklists, activity events, and manager review.
5. Generate drafts automatically; require people to confirm only meaningful facts.
6. Preserve staff context when work is blocked or instructions are unclear.
7. Escalate work conditions, not character judgments.

## 3. Non-Goals

The MVP must not implement:

- Payroll, timecards, attendance, wage, or break tracking.
- Keystroke, location, browser, camera, or screen monitoring.
- Hidden inactivity timers.
- Disciplinary records or employee rankings.
- A single numerical productivity score.
- Automatic reassignment across roles without an eligibility rule.
- AI-generated performance judgments.
- Completion based only on elapsed time or task count.

## 4. Existing Foundation To Reuse

| Existing capability | Reuse |
| --- | --- |
| `Role`, `Duty`, `RoleDuty`, `UserDuty` | Resolve standing role and direct responsibilities. |
| `TaskTemplate` | Supply checklist, completion, approval, workflow, and display rules. |
| `BoardDay`, `Task`, `TaskChecklistItem` | Represent daily work, carryover, and execution evidence. |
| `TaskComment`, required update fields | Capture handoff context and proof. |
| `ActivityEvent` | Provide the immutable operational event stream. |
| Task assignment and status services | Enforce ownership and controlled transitions. |
| Concern decomposition engine | Supply linked resolution work. |
| My Tasks / My Day | Host the staff-facing daily execution experience. |
| Manager Review | Host approval and intervention workflows. |

No parallel task system should be created.

## 5. Bounded Contexts

### 5.1 Daily Staff Plan

Creates one staff-day record for each active staff member participating in a board day. It snapshots applicable duties so later role edits do not rewrite historical expectations.

Responsibilities:

- Resolve active roles and direct duties.
- Generate daily checklist items idempotently.
- Record start acknowledgement and declared starting blockers.
- Present assigned tasks and carryover in priority order.
- Record an explicit availability signal when requested by staff.

### 5.2 Task Execution Policy

Extends the current task lifecycle without replacing existing statuses.

```text
Not Started
  -> Accepted
  -> In Progress
  -> Blocked / Waiting / Ready for Review / Completed
```

`Accepted` is an execution acknowledgement, not a second assignment state. It may be represented by acceptance metadata while the task remains `NOT_STARTED` until work begins.

Completion policy evaluates:

- Required checklist items.
- Required update fields.
- Completion criteria.
- Required document or photo evidence when configured.
- Unresolved blocker or waiting conditions.
- Manager approval requirements.

### 5.3 Available Work Matching

Builds an explainable queue of unassigned or claimable tasks. It never invents work solely to keep a person busy.

Eligibility is evaluated before ranking:

- Active board day.
- Claimable task status.
- No active blocker.
- Required role match.
- Required duty or skill match.
- Location access when applicable.
- No prohibited ownership or approval conflict.

Ranking is deterministic:

```text
score = priority weight
      + due-soon weight
      + overdue weight
      + role match
      + duty/skill match
      + workflow-area match
      + dependency-unblock value
      + manager directive boost
      - workload saturation penalty
```

Every recommendation returns a score breakdown such as:

```text
Recommended because it is high priority, due within two hours,
matches Marketing duties, and blocks a vehicle listing.
```

### 5.4 End-of-Day Handoff

Builds a draft from persisted activity rather than asking staff to recreate the day manually.

Draft inputs:

- Completed, active, blocked, waiting, and overdue tasks.
- Checklist progress.
- Comments and required updates.
- Customer, vehicle, appointment, and concern references.
- Claimed work and declined recommendations.
- Items requiring tomorrow follow-up.

Staff confirm accuracy, add missing context, and submit. Submitted reports are immutable snapshots; amendments create a new version or audited amendment.

### 5.5 Team Execution Health

Produces manager-facing conditions, not employee grades.

Supported conditions:

- Ready for work.
- Start acknowledgement pending.
- Active work in progress.
- All assigned work waiting or blocked.
- Available and needs assignment.
- Recommendation available.
- Work overdue or stale.
- Ready for manager review.
- End-of-day report pending or submitted.
- Carryover requires ownership.

## 6. Proposed Data Model

Names are provisional until the schema milestone is implemented.

### `StaffDay`

One record per user, board day, and organization/location scope.

```text
id
boardDayId
userId
status                  PLANNED | READY | ACTIVE | AVAILABLE | HANDOFF_PENDING | CLOSED
startAcknowledgedAt
startingBlockerCode
startingBlockerNote
availabilityDeclaredAt
availabilityReasonCode
closedAt
createdAt
updatedAt
unique(boardDayId, userId)
```

### `StaffDayDutyItem`

Snapshot of a role or directly assigned duty.

```text
id
staffDayId
sourceDutyId
sourceRoleId
label
description
required
sortOrder
completed
completedAt
completionNote
```

### `TaskAcceptance`

Auditable acknowledgement of ownership. Use a separate model only if acceptance history is required; otherwise add accepted metadata to `Task`.

```text
id
taskId
userId
acceptedAt
releasedAt
releaseReasonCode
```

### `WorkRecommendation`

Persist only recommendations that are shown or acted on. The candidate list itself may remain computed.

```text
id
staffDayId
taskId
rank
score
scoreBreakdownJson
status                  SHOWN | CLAIMED | DISMISSED | EXPIRED
dismissalReasonCode
createdAt
actedAt
```

### `StaffDailyReport`

```text
id
staffDayId
version
status                  DRAFT | SUBMITTED | AMENDED
summarySnapshotJson
staffAddendum
tomorrowFollowUp
submittedAt
submittedByUserId
createdAt
updatedAt
unique(staffDayId, version)
```

### Computed Read Models

Do not persist an opaque productivity score. Build these from authoritative records:

- `MyDayReadModel`
- `AvailableWorkReadModel`
- `StaffDailyReportDraftReadModel`
- `TeamExecutionHealthReadModel`

## 7. State Transitions

### Staff Day

```text
PLANNED -> READY -> ACTIVE
ACTIVE -> AVAILABLE
AVAILABLE -> ACTIVE
ACTIVE | AVAILABLE -> HANDOFF_PENDING -> CLOSED
```

Rules:

- Staff may declare availability; the system may infer a suggestion but must label it as inferred.
- Blocked or waiting work does not imply staff fault.
- Closing requires an end-of-day report when location policy enables it.
- Managers may close on behalf of absent staff with an audited reason.

### Work Recommendation

```text
SHOWN -> CLAIMED
SHOWN -> DISMISSED
SHOWN -> EXPIRED
```

Claiming must be transactional: verify eligibility and assignment state, assign the task, expire competing recommendations, and create activity events in one transaction.

## 8. Services

```text
staff-day-generation-service
staff-day-command-service
task-execution-policy-service
available-work-matching-service
work-claim-service
daily-report-draft-service
daily-report-command-service
team-execution-health-service
```

Service rules:

- Routes authenticate and normalize only.
- Services enforce policy and orchestration.
- Repositories own persistence.
- Read models do not mutate state.
- Commands accept idempotency keys where retries are plausible.

## 9. API Surface

Proposed MVP endpoints:

```text
GET  /api/my-day?date=YYYY-MM-DD
POST /api/my-day/start
PATCH /api/my-day/duties/:itemId
POST /api/my-day/availability
GET  /api/my-day/recommendations
POST /api/my-day/recommendations/:id/claim
POST /api/my-day/recommendations/:id/dismiss
GET  /api/my-day/end-report
POST /api/my-day/end-report/submit

POST /api/tasks/:id/accept
GET  /api/tasks/:id/completion-readiness

GET  /api/manager/team-execution?date=YYYY-MM-DD
POST /api/manager/staff-days/:id/close
```

## 10. Events

Add explicit event types using the existing activity infrastructure:

```text
staff_day.generated
staff_day.started
staff_day.start_blocker_recorded
staff_day.availability_declared
staff_day.closed
duty_item.completed
task.accepted
work.recommendation_shown
work.recommendation_claimed
work.recommendation_dismissed
daily_report.draft_generated
daily_report.submitted
daily_report.amended
manager.execution_intervention_recorded
```

Do not emit repetitive activity events from background polling.

## 11. Authorization

Staff may:

- Read and update their own staff day.
- Complete their own duty checklist items.
- Accept assigned tasks.
- View and claim tasks for which they are eligible.
- Submit their own end-of-day report.

Managers may:

- Read team execution health.
- Configure role duty templates and policies.
- Assign or reassign work.
- Override task completion or staff-day closure with a reason.
- Review reports and carryover.

All authorization must be enforced in services, not only hidden in the UI.

## 12. Jobs and Timing

The scheduler may:

- Generate staff-day plans after a board day is created.
- Refresh recommendation candidates after task assignment/status events.
- Generate end-of-day report drafts at a configured local time.
- Carry unfinished work into the next board-generation decision.

The scheduler must not:

- Poll keyboard or browser activity.
- Declare an employee idle based only on time.
- Generate duplicate staff-day or report records.

## 13. UI Placement

### My Day

- Start Day card.
- Role responsibility checklist.
- Top priorities and carryover.
- Current task and completion readiness.
- Recommended next work.
- Explicit Available / Need Direction action.
- End-of-day report drawer.

### Task Workspace

- Accepted-by and accepted-at metadata.
- Completion-readiness explanation.
- Required evidence and review state.

### Manager Review

- Team Execution Health panel.
- Needs Assignment queue.
- Blocked or waiting queue.
- Ready for Review queue.
- End-of-day and carryover queue.

### Activity Feed

- Staff-day, recommendation claim, report, and intervention events.

## 14. Privacy and Fairness Guardrails

1. Show staff the same execution signals managers see about them.
2. Provide the reason behind every warning or recommendation.
3. Allow staff to correct missing context through a note or blocker reason.
4. Never infer attitude, effort, intent, or character.
5. Do not compare raw task counts across different roles.
6. Treat waiting on customers, parts, vendors, or managers as workflow conditions.
7. Retain only operational records required for work continuity and audit.
8. Require manager reasons for overrides and on-behalf-of submissions.

## 15. Feature Flags

```text
staffExecution.enabled
staffExecution.startDayGateEnabled
staffExecution.taskAcceptanceEnabled
staffExecution.availableWorkEnabled
staffExecution.endOfDayReportEnabled
staffExecution.managerHealthEnabled
```

Flags enable role- or location-scoped rollout and safe rollback without deleting data.

## 16. MVP Success Measures

Measure system usefulness, not employee worth:

- Percentage of work with a clear owner.
- Percentage of blocked work with actionable context.
- Median time from Ready for Review to manager decision.
- Number of unassigned priority tasks surfaced through recommendations.
- End-of-day report confirmation rate.
- Carryover items with a named owner and next step.
- Reduction in tasks closed without required evidence.

## 17. Deferred Enhancements

- AI-assisted ambiguous work matching after deterministic matching is proven.
- Capacity forecasting based on validated effort estimates.
- Cross-location staffing suggestions.
- Team coaching trends with explicit governance.
- Document/photo upload integration for completion evidence.
- Notification channels beyond in-app alerts.

