# Appointment Automation and Rules Catalog

**Status:** Planned for Enterprise Release 1.0  
**Approved direction:** Tasks can create appointments manually or automatically; behavior depends on task and rule configuration  
**Safety posture:** Deterministic, explainable, idempotent, reviewable, and reversible where operationally possible

## 1. Automation Goals

Automation should:

- Reduce missed meetings, handoffs, follow-ups, and preparation work.
- Convert task requirements into visible scheduling work.
- Convert appointment requirements into linked operational tasks.
- Escalate incomplete, conflicting, or failed scheduling attempts.
- Preserve manager control.

Automation must not:

- Guess an owner, time, location, customer, vehicle, or exclusive resource.
- Override a warning or hard block.
- Create duplicate appointments or tasks when retried.
- Hide why an appointment or task was created.
- Remove or complete human-owned work silently.
- Change historical rule results after a rule is revised.

## 2. Rule Anatomy

Every automation rule contains:

| Field | Purpose |
| --- | --- |
| Rule ID | Stable identity |
| Name and description | Human-readable intent |
| Version | Immutable version used for each execution |
| Scope | Organization, location, workflow area, purpose, or template boundary |
| Trigger | Event that starts evaluation |
| Conditions | Facts that must match |
| Action | Proposed or automatic result |
| Required inputs | Facts required to execute safely |
| Missing-input behavior | Draft, review queue, suppress, or fail |
| Conflict behavior | Always evaluate; never bypass |
| Idempotency strategy | Prevent duplicate effect |
| Owner-selection policy | Deterministic owner or review |
| Effective dates | Activation window |
| Priority | Ordering where rules overlap |
| Stop behavior | Continue or stop after match |
| Audit level | Events and snapshots to retain |
| Status | Draft, testing, active, paused, retired |

## 3. Supported Trigger Families

### 3.1 Task Triggers

- Task created
- Task assigned or reassigned
- Task due date set or changed
- Task status changed
- Task blocked
- Task moved to review
- Task completed
- Task outcome or update field recorded
- Task template instantiated
- Task checklist condition satisfied
- Task overdue threshold reached

### 3.2 Appointment Triggers

- Appointment created
- Appointment scheduled
- Appointment approved
- Appointment rescheduled
- Appointment confirmed or declined
- Customer checked in
- Appointment started
- Appointment waiting
- Appointment finished
- Appointment completed
- Appointment cancelled
- Appointment marked no-show
- Appointment outcome recorded
- Conflict detected
- Preparation task becomes at risk

### 3.3 Time and Calendar Triggers

- Configurable time before appointment
- Appointment start reached
- Grace period exceeded
- Configurable time after outcome
- Location opening or closing boundary
- Holiday or closure added
- Resource outage added
- Recurring review schedule

External delivery triggers are deferred until the relevant integration exists.

## 4. Supported Conditions

Rules can evaluate approved, indexed facts such as:

- Task template, type, source, workflow area, status, priority, or outcome
- Appointment purpose, template, state, outcome, owner, or location
- Required-meeting indicator
- Customer or vehicle reference presence
- Assigned role, duty, or user
- Due date or relative time
- Required resource type
- Linked-task status
- Location and business hours
- Confirmation and attendance state
- Existing linked appointment
- Prior matching automation result
- Manager-review requirement

Rules must not depend on free-form text interpretation unless a separately approved, explainable classification feature is introduced.

## 5. Supported Actions

- Create draft appointment
- Create scheduled appointment when every required input is deterministic
- Submit appointment for manager approval
- Update a rule-owned draft appointment
- Create preparation task
- Create during-appointment task
- Create approval task
- Create follow-up task
- Link existing task and appointment
- Place item in automation-review queue
- Add internal notification
- Escalate to manager queue
- Mark automation as suppressed with reason
- Reevaluate appointment readiness

Destructive deletion and silent task completion are not supported automation actions.

## 6. Task-to-Appointment Decision Model

When a task requires meeting someone:

```text
Task event
  -> Load source task and template snapshot
  -> Find active scoped rule
  -> Confirm no prior idempotent result
  -> Resolve purpose
  -> Resolve owner
  -> Resolve date, start, duration, and location
  -> Resolve required participants and resources
  -> Validate permission-safe references
  -> Evaluate conflicts
  -> If complete and conflict-free: create scheduled appointment
  -> If incomplete or warning requires review: create draft/review item
  -> If hard conflict: create review/failure item
  -> Link source task
  -> Record rule version, explanation, and activity
```

### 6.1 Manual Creation from Any Task

Every task detail workspace can offer `Schedule Appointment` when the user is a manager or permitted prospective owner.

The creation experience can prefill:

- Appointment purpose
- Owner
- Customer reference
- Vehicle reference
- Workflow area
- Location
- Duration
- Source task
- Proposed participants and resources

Prefill is transparent and editable before scheduling. Hard conflicts prevent commitment.

### 6.2 Automatic Creation

Automatic scheduling is allowed only if the rule resolves all required facts without guessing. Otherwise:

- Create a draft appointment when enough context exists to preserve useful work.
- Create a manager-review item when ownership, purpose, or authorization is unresolved.
- Record a failed automation when the rule or referenced configuration is invalid.

## 7. Appointment-to-Task Decision Model

Appointment templates define linked task blueprints with relationship type:

- `PREPARATION`
- `DURING_APPOINTMENT`
- `DEPENDENCY`
- `APPROVAL`
- `FOLLOW_UP`

Each blueprint defines:

- Task title and description
- Workflow area
- Owner-selection rule
- Due-time rule relative to appointment
- Required update fields
- Checklist
- Completion or approval requirement
- Blocking or warning effect
- Creation timing
- Cancellation or rescheduling behavior

Task creation preserves a snapshot of the blueprint version.

## 8. Initial Enterprise Rule Catalog

These are baseline rule families. Exact active rules are configured during E1 and verified in E4.

### AR-001 — Task Requires Meeting

**Trigger:** Task created or updated with `requiresMeeting = true`  
**Action:** Create the linked purpose-specific appointment when configured; otherwise use `APT-TASK-MEETING`  
**Owner:** Task assignee when eligible; otherwise manager review  
**Schedule:** Explicit task-provided meeting time only  
**Deduplication:** One active appointment per task and rule version unless repeatable is configured

### AR-002 — Test Drive Preparation

**Trigger:** Test Drive appointment scheduled  
**Template:** `APT-TEST-DRIVE`  
**Action:** Create or link vehicle-readiness and customer-confirmation tasks  
**Due:** Configurable interval before start  
**Conflict impact:** Missing vehicle or unavailable vehicle is a hard block; incomplete readiness can warn or block by template

### AR-003 — Vehicle Delivery Preparation

**Trigger:** Vehicle Delivery appointment scheduled  
**Template:** `APT-VEHICLE-DELIVERY`  
**Action:** Create or link detailing, fuel, paperwork, payment, and final-inspection tasks  
**Completion policy:** Required delivery-preparation work must be complete or manager exception recorded

### AR-004 — Service Intake

**Trigger:** Service and Repair appointment scheduled  
**Template:** `APT-SERVICE-INTAKE`  
**Action:** Create complaint-confirmation and intake/inspection tasks  
**Required context:** Customer, vehicle, complaint summary, owner, location

### AR-005 — Appointment No-Show

**Trigger:** Attendance changes to `NO_SHOW`  
**Action:** Require disposition; create follow-up task or replacement draft appointment according to selected reason  
**Safety:** Never create both replacement and close-without-follow-up unless explicitly selected

### AR-006 — Declined Confirmation

**Trigger:** Confirmation changes to `DECLINED`  
**Action:** Place appointment in disposition queue  
**Required resolution:** Cancel, reschedule, or manager-retained scheduled state with reason

### AR-007 — Completed Appointment Follow-Up

**Trigger:** Appointment completed with an outcome requiring follow-up  
**Action:** Create linked follow-up task with due time and owner  
**Deduplication:** Appointment, outcome version, and rule version

### AR-008 — Task Completion Creates Handoff Appointment

**Trigger:** Configured task template completes  
**Condition:** Completion outcome requires meeting or handoff  
**Action:** Create scheduled appointment only when time and owner were captured; otherwise create draft

### AR-009 — Preparation At Risk

**Trigger:** Required preparation task reaches configured risk threshold  
**Action:** Add appointment warning and internal notification; escalate when blocking threshold is reached

### AR-010 — Staff Absence or Resource Outage

**Trigger:** Approved absence, closure, or resource outage overlaps future appointments  
**Action:** Produce affected-appointment review queue and bulk-rescheduling preview  
**Safety:** Never move appointments automatically without an active rule that fully resolves replacement capacity

### AR-011 — Waiting Escalation

**Trigger:** Execution remains `WAITING` beyond configured threshold  
**Action:** Notify owner and manager queue; record escalation  
**Resolution:** Resume, reschedule, complete with outcome, or cancel with reason

### AR-012 — Missing Outcome

**Trigger:** Execution is `FINISHED` but booking is not completed after configured threshold  
**Action:** Notify owner and surface in missing-outcome queue

### AR-013 — Recurrence Expansion

**Trigger:** Recurring series created or modified  
**Action:** Materialize or calculate occurrences according to approved horizon  
**Safety:** Preview conflicts; preserve completed/cancelled historical occurrences

### AR-014 — Waitlist Promotion

**Trigger:** Eligible capacity becomes available  
**Action:** Surface ranked candidates for manager review  
**Safety:** No automatic commitment unless a future active rule has deterministic customer agreement and scheduling authority

### AR-015 — Automation Failure Escalation

**Trigger:** Rule execution fails after safe retries  
**Action:** Add failure queue record and manager notification  
**Details:** Rule, version, source, correlation ID, redacted error, retry count, next action

## 9. Owner-Selection Rules

Recommended deterministic order:

1. Explicit appointment owner supplied by authorized user.
2. Eligible task assignee when the rule declares task-assignee ownership.
3. Purpose-template default owner explicitly configured for the location.
4. Manager review.

Automation must not infer ownership solely from a broad role when multiple eligible users exist unless a separately approved capacity assignment rule deterministically selects and explains the result.

## 10. Due-Time and Rescheduling Rules for Linked Tasks

Each linked task blueprint declares one behavior:

- Fixed interval before appointment
- Fixed interval after appointment
- At appointment start
- At appointment end
- Same business day at configured time
- Explicitly entered

When an appointment is rescheduled:

- Rule-owned incomplete tasks can be proposed for due-time adjustment.
- User-owned or manually changed task due times are not silently overwritten.
- Completed tasks retain their historical completion.
- The owner receives a preview of task changes.
- One correlated history record explains the reschedule and task effects.

When an appointment is cancelled:

- Linked tasks are not deleted.
- Rule-owned incomplete tasks follow configured cancel, retain, or review behavior.
- Manual tasks remain unchanged unless an authorized user acts on them.

## 11. Rule Administration Lifecycle

| State | Behavior |
| --- | --- |
| Draft | Editable; cannot execute |
| Testing | Runs against simulations or shadow evaluation; cannot mutate production records |
| Active | Executes within scope and effective dates |
| Paused | Produces no new effects; history remains |
| Retired | Cannot reactivate without a new version |

Changing trigger, conditions, action, owner selection, or safety behavior creates a new version. Existing appointments and history retain the prior version reference.

## 12. Simulation and Activation

Before activation, a rule must provide:

- Sample matching and non-matching records
- Expected action
- Missing-input behavior
- Conflict behavior
- Duplicate-prevention demonstration
- Permission result
- Estimated affected volume
- Rollback or pause procedure
- Named approver

High-impact rules require preview against production-shaped, non-sensitive data before activation.

## 13. Failure, Retry, and Replay

- Transient failures retry with bounded backoff.
- Validation, authorization, and hard-conflict failures do not retry automatically.
- Every failed execution enters a visible terminal or retrying state.
- Replay requires manager or administrator authority and a reason.
- Replay uses the original idempotency identity unless an explicitly new intended effect is approved.
- Failed actions never leave partial appointment, task-link, reservation, or history state.

## 14. Automation Acceptance Gate

Automation is ready only when:

- Every active rule has simulation evidence and an approver.
- Repeated triggers do not create duplicate effects.
- Missing inputs produce review work instead of guessed values.
- Conflicts and permissions are evaluated in the committed operation.
- Every outcome is explainable from retained rule inputs and version.
- Rules can be paused safely.
- Failure and replay behavior is observable and tested.
- Rule-created appointments and tasks remain traceable in both directions.
