# Staff Execution and Handoff Engine Roadmap

**Module:** DB-ACCOUNTABILITY-059  
**Architecture:** `docs/STAFF_EXECUTION_HANDOFF_ENGINE.md`  
**Delivery strategy:** Sequential vertical slices  
**Target:** Supportive day-one execution accountability without surveillance

---

## 1. Rollout Goal

Move Dispatch Board from:

```text
Work can be generated, assigned, updated, and reviewed.
```

to:

```text
Each staff member can see today's responsibilities, execute with clear proof,
request or claim appropriate next work, submit an auto-drafted handoff,
and receive timely manager direction when workflow conditions require it.
```

## 2. Delivery Rules

- Build one milestone at a time in sequence.
- Keep each milestone independently deployable behind feature flags.
- Extend current task and activity services instead of creating parallel workflows.
- Include service, authorization, route, UI, and browser proof in each slice.
- Do not expose a manager control until staff can see and correct the same source data.
- Do not introduce idle timers or productivity scores during MVP.

## 3. Milestone Summary

| Milestone | Outcome | Primary surfaces |
| --- | --- | --- |
| 1. Domain Foundation | Durable staff-day records and generated duty snapshots | Schema, services, feature flags |
| 2. Start Day and Daily Duties | Staff begin with clear responsibilities and blockers | My Day |
| 3. Execution Evidence Gates | Completion means required work and evidence are satisfied | My Day, Task Workspace |
| 4. Available Work Queue | Eligible staff can claim explainable recommended work | My Day, Tasks |
| 5. End-of-Day Handoff | Activity becomes a confirmed daily report and carryover plan | My Day, Activity |
| 6. Team Execution Health | Managers can intervene using explainable workflow conditions | Manager Review |

---

## Milestone 1: Domain Foundation and Rollout Controls

**Suggested branch:** `codex/staff-execution-domain-foundation`

### Objective

Create the durable domain and policy boundaries needed by every later slice without changing day-one staff behavior yet.

### Scope

- Add feature flags for each engine capability.
- Add `StaffDay` and `StaffDayDutyItem` schema models and enums.
- Add repository and service interfaces.
- Generate one staff day per active eligible user and board day.
- Snapshot role and direct duties idempotently.
- Add staff-day activity event types.
- Add read-only staff-day service for My Day.
- Seed representative duties for all day-one roles.

### Key Rules

- Unique staff day per user and board day.
- Regeneration must not duplicate checklist items.
- Role changes after generation do not silently rewrite the historical snapshot.
- Managers may regenerate only through an audited command.
- No start gate is enforced in this milestone.

### Acceptance Criteria

- Board generation can create staff-day plans safely on retry.
- Role and direct duties resolve into deterministic checklist snapshots.
- Staff can read only their own plan; managers can read team plans.
- Feature flags can disable all new behavior without affecting Tasks.
- Migration, seed, service, route, and authorization tests pass.

### Exit Gate

The domain is production-safe and invisible until enabled.

---

## Milestone 2: Start Day and Daily Role Checklist

**Suggested branch:** `codex/staff-execution-start-day`

### Objective

Give every staff member a clear, supportive beginning-of-day work plan inside My Day.

### Scope

- Add the My Day Start Day card.
- Show role responsibilities, assigned work, and carryover priorities.
- Let staff confirm they reviewed priorities.
- Capture either no starting blocker or an explicit blocker category and note.
- Allow daily duty checklist completion.
- Add manager read-only visibility into start status.
- Emit start and duty events.

### UX Contract

The message is:

```text
Review today's responsibilities and identify anything preventing a clean start.
```

It must not say clock in, attendance, late, idle, or productivity score.

### Acceptance Criteria

- Staff can acknowledge their plan in two or fewer actions when no blocker exists.
- A blocker requires useful context and appears to the manager.
- Staff can revisit the plan after acknowledgement.
- Duty completion is preserved across refresh and sessions.
- Mobile and desktop My Day remain usable.
- Browser proof covers start with and without a blocker.

### Exit Gate

Enabled pilot users can start and execute their day without manager setup assistance.

---

## Milestone 3: Task Acceptance and Completion Evidence

**Suggested branch:** `codex/staff-execution-completion-gates`

### Objective

Prevent vague completion while making every requirement visible before staff begin work.

### Scope

- Add task acceptance metadata and action.
- Add a completion-readiness service and endpoint.
- Consolidate current checklist, required update, blocker, waiting, and manager-review rules.
- Display unmet completion requirements in My Day and Task Workspace.
- Route approval-required work to Ready for Review instead of Completed.
- Add evidence configuration placeholders for future documents/photos.
- Preserve manager override with required reason and audit event.

### Completion Evaluation

```text
ready = required checklist complete
     && required update fields valid
     && completion criteria satisfied
     && blocker/waiting conditions resolved
     && configured evidence present
```

### Acceptance Criteria

- Staff can see every unmet requirement before submitting.
- API rejects completion when any required condition is unmet.
- Review-required work cannot bypass manager review.
- Manager override is explicit, reasoned, and visible in activity.
- Existing task workflows remain backward compatible when the flag is disabled.
- Unit and browser tests cover allowed and rejected completion.

### Exit Gate

No enabled task can be closed with ambiguous or incomplete evidence.

---

## Milestone 4: Explainable Available Work Queue

**Suggested branch:** `codex/staff-execution-available-work`

### Objective

Help staff pull appropriate next work when assigned work is complete, blocked, or waiting.

### Scope

- Add deterministic task eligibility and ranking services.
- Add computed available-work read model.
- Persist recommendations that are shown or acted on.
- Add Recommended Next Work to My Day.
- Add explicit Available / Need Direction action.
- Add transactional task claiming.
- Add manager Needs Assignment queue.
- Show recommendation explanations and dismissal reasons.

### MVP Trigger Rules

Show recommendations when:

- Staff explicitly requests next work.
- Staff completes the current task and has no other active assignment.
- All assigned work is blocked or waiting.
- A manager opens the Needs Assignment queue.

Do not use passive 10- or 20-minute inactivity timers.

### Claim Transaction

1. Re-check user and task eligibility.
2. Re-check task assignment and status.
3. Assign the task to the claimant.
4. Mark the recommendation claimed.
5. Expire competing active recommendations.
6. Record assignment and recommendation events.

### Acceptance Criteria

- Ineligible work never appears or cannot be claimed.
- Every recommendation includes a human-readable explanation.
- Concurrent claims result in one owner and a safe conflict response.
- Staff can decline with a non-punitive reason such as lacking context or needing manager direction.
- Managers can see available staff and eligible work without seeing an idle timer.
- Service, concurrency, authorization, and browser tests pass.

### Exit Gate

Enabled teams can pull appropriate work without manager micromanagement or unsafe cross-role assignment.

---

## Milestone 5: Auto-Drafted End-of-Day Handoff and Carryover

**Suggested branch:** `codex/staff-execution-daily-handoff`

### Objective

Turn existing task and activity data into a concise, confirmed operational handoff.

### Scope

- Add `StaffDailyReport` schema and versioning.
- Build report drafts from authoritative daily events.
- Show completed, active, blocked, waiting, overdue, and follow-up work.
- Let staff confirm accuracy and add missing context.
- Capture tomorrow follow-up and unresolved dependencies.
- Submit immutable report snapshots.
- Feed unfinished work into carryover decisions.
- Support manager on-behalf-of submission with a reason.

### Report UX

The report should be mostly generated. Staff should answer only:

```text
Is this accurate?
What happened that is not yet logged?
What requires follow-up tomorrow?
```

### Acceptance Criteria

- Draft totals reconcile to tasks and activity events.
- Staff additions do not overwrite source events.
- Submitted reports remain stable when tasks later change.
- Carryover retains owner, blocker, and next-step context.
- Managers can identify missing handoffs without labeling staff performance.
- Browser proof covers draft, correction, submission, and next-day carryover.

### Exit Gate

The next board day can start with named, contextualized carryover rather than verbal memory.

---

## Milestone 6: Team Execution Health and MVP Rollout Gate

**Suggested branch:** `codex/staff-execution-manager-health`

### Objective

Give managers one explainable operational view of ownership, blockers, review needs, available capacity, reports, and carryover.

### Scope

- Add Team Execution Health read service and Manager Review panel.
- Add filters for Needs Assignment, Blocked/Waiting, Ready for Review, Report Pending, and Carryover.
- Show staff-visible source facts and recommended manager actions.
- Add manager interventions with required reasons.
- Add feature-flag rollout by location or role.
- Add release telemetry and operational runbook.
- Complete accessibility, responsive, authorization, and browser gates.

### Health Conditions

Use labels such as:

```text
Ready
Active
Needs Assignment
Blocked
Waiting
Ready for Review
Handoff Pending
Closed
```

Do not display employee rankings, league tables, or opaque scores.

### Acceptance Criteria

- Every condition links to the exact tasks, duties, or report facts producing it.
- Staff can see the same source facts in My Day.
- Manager actions create audited activity events.
- No API exposes team data to unauthorized staff.
- Feature flags support pilot, rollback, and gradual expansion.
- Full typecheck, lint, unit/integration, migration, and browser suites pass.
- Pilot runbook covers start day, blocked work, next work, end report, manager review, and carryover.

### Exit Gate

The engine is ready for a controlled day-one pilot with one location and selected roles.

---

## 4. Cross-Milestone Test Strategy

### Unit

- Duty resolution and snapshot generation.
- Completion-readiness policy.
- Eligibility and recommendation score breakdown.
- Daily report reconciliation.
- Execution-health condition derivation.

### Integration

- Idempotent generation.
- Transactional claiming and concurrent conflicts.
- Authorization boundaries.
- Activity event emission.
- Report snapshot versioning.
- Carryover ownership preservation.

### Browser

- Staff start day.
- Staff records a starting blocker.
- Staff accepts and completes eligible work.
- Completion is rejected with missing evidence.
- Staff requests and claims next work.
- Staff submits end-of-day report.
- Manager resolves blocked/review/assignment conditions.
- Next board displays contextualized carryover.

## 5. Rollout Sequence

```text
Development flags off
  -> manager/staff seed validation
  -> internal pilot for one role
  -> one-location pilot
  -> all day-one roles at pilot location
  -> broader rollout after operational review
```

Each expansion requires:

- No unresolved P0 workflow defects.
- Authorization tests passing.
- Explainability review for recommendations and health conditions.
- Staff feedback confirming expectations and blockers are understandable.
- Manager feedback confirming the panel reduces assignment and handoff gaps.

## 6. Deferred Until After MVP

- Passive idle detection.
- Numerical responsibility or productivity scores.
- AI-generated performance interpretation.
- Cross-role auto-assignment without staff confirmation.
- Effort-based capacity forecasting.
- Coaching trends or comparative analytics.
- HR, payroll, attendance, or disciplinary integrations.

## 7. Definition of MVP Ready

The module is MVP-ready when:

1. Staff can start the day with clear role duties and priorities.
2. Completion rules prevent unsupported closure.
3. Eligible staff can request and claim explainable next work.
4. End-of-day reports are generated from real activity and confirmed by staff.
5. Managers can see and resolve execution conditions without surveillance signals.
6. Unfinished work carries forward with owner, blocker, and next step.
7. Every action is authorized, auditable, idempotent where required, and protected by automated tests.

The controlled pilot procedure and rollback contract are maintained in `docs/STAFF_EXECUTION_PILOT_RUNBOOK.md`.
