# Tasks Operations Console MVP Rollout Audit

**Document:** Tasks Operations Console MVP Rollout Audit  
**Date:** 2026-07-09  
**Scope:** Whole Tasks Operations Console and adjacent task workflow surfaces versus MVP rollout readiness  
**Primary route:** `/tasks`  
**Related surfaces:** `/board`, `/my-tasks`, `/tasks/[id]`, `/manager-review`, `/activity`  
**Status:** Current branch audit for implementation sequencing
**Roadmap:** `docs/TASKS_MVP_ROLLOUT_ROADMAP.md`

---

## 1. Executive Verdict

The Tasks Operations Console is now a credible day-one manager command center, but the whole Tasks module is not yet fully rollout-complete against the original MVP promise.

Current practical rating:

```text
Manager console readiness: 80-85%
Task workflow backend readiness: 85-90%
Staff execution readiness: 75-80%
Full MVP rollout readiness: 78-82%
```

Recommended rollout decision:

```text
Continue building sequentially on top of the current Tasks console branch family.
Do not merge as a full MVP rollout yet unless the PR is explicitly scoped as "manager console foundation."
Close staff-created tasks, durable smoke coverage, and final workflow feedback before calling the Tasks MVP rollout complete.
```

The biggest risk is not the core task engine. The engine is strong. The remaining risk is that several MVP promises are distributed across multiple screens, while the `/tasks` console is now becoming the expected operational source of truth.

---

## 2. MVP Expectation Being Audited

The MVP scope expects the Tasks system to support:

- daily board generation
- manager-created tasks
- staff-created tasks
- assignment and reassignment
- explainable recommendations
- full board visibility
- staff self-service task updates
- required blocker reasons
- Ready for Review and manager approval
- comments, checklist, and activity history
- visible blocked, waiting, overdue, and review queues
- real activity feed
- repeatable validation coverage

For rollout, the target is:

```text
Basic feature set, enterprise-grade foundation, no fragile prototype behavior.
```

---

## 3. What Is Ready

### Manager command center

The `/tasks` route now has the expected command-center shape:

- compact top command bar
- search, saved views, filters, export, generation, and create controls
- KPI strip
- internal task sidebar
- dense list view with 8-row page sizing
- board-lane mode
- right-side task detail rail
- details, comments, and activity tabs
- quick status, reassignment, comments, checklist, and task-detail handoff
- visible queue cards
- no desktop page scroll at the tested `1280x720` viewport

### Backend workflow rules

The task services enforce important MVP rules server-side:

- authenticated task reads
- manager-gated assignment and reassignment
- manager-gated manual task creation
- assigned-user status updates
- blocked status requires blocker reason
- approval-required tasks must move through Ready for Review before Completed
- checklist and required-update-field enforcement for review/completion states
- task comments and checklist changes emit activity where supported
- task creation and status changes emit activity events
- appointment automation can be triggered from task events

### Adjacent task surfaces

The module already has live companion surfaces:

- `/board` for daily board operations
- `/my-tasks` for staff execution
- `/tasks/[id]` for deep task workspace work
- `/manager-review` for review/approval actions
- `/activity` for operational history

This is a solid MVP architecture pattern as long as `/tasks` is treated as the manager console, not the only task screen.

---

## 4. Rollout Findings

### P0 - Full MVP rollout gap: staff-created tasks are not closed

The MVP scope says staff can create their own tasks. The current `POST /api/tasks` path is manager-only through the assignment-management policy. The new `/tasks` quick-create flow is also manager-only.

Rollout impact:

```text
Manager day-one use is acceptable.
Full MVP rollout is not complete until staff can create their own assigned tasks from an appropriate surface.
```

Recommended fix:

- Add a staff self-create path from `/my-tasks` or a lightweight task detail/create route.
- Default assignment to the current user for non-managers.
- Preserve manager-only fields such as arbitrary assignee selection and manager approval override.
- Keep due time required.
- Emit activity on staff-created tasks.

### P0 - Full MVP rollout gap: repeatable console browser coverage is missing

There are strong task service, route, integration, My Tasks, manager review, and task detail tests. The new `/tasks` console interactions do not yet appear to have dedicated automated browser or component coverage.

Rollout impact:

```text
The current console can regress visually or interaction-wise without a failing test.
```

Recommended fix:

- Add a focused Tasks console smoke suite.
- Cover load, search, queue filter, tab switch, task selection, quick-create open, status save validation, and right-rail visibility.
- Add a desktop density assertion for no page scroll at a standard viewport where practical.

### P1 - Day-one trust gap: quick-create user source is board-derived

The console quick-create owner list is derived from users already present on the current board/tasks. That is usable when the board is populated, but weak if a manager needs to create the first task, assign someone not already on the board, or fix an incomplete generation day.

Rollout impact:

```text
Quick-create works for normal generated days but is not a complete task creation source of truth.
```

Recommended fix:

- Pass an active-user assignment list into `/tasks`, similar to the board create workflow.
- Keep inactive users excluded.
- Preserve selected-task owner as the default when available.

### P1 - Day-one trust gap: saved views are local, not operational

Saved views currently behave like browser-local preferences. That is acceptable for a lightweight UI convenience, but not a durable operations feature.

Rollout impact:

```text
Managers may think saved views are durable team views when they are actually local browser state.
```

Recommended fix:

- Label current saved views as local views if keeping for MVP.
- Defer server-backed saved views to the next tier, or add a simple `SavedView` persistence slice before rollout.

### P1 - Day-one workflow gap: right rail is powerful but crowded

The right rail now supports real actions, but it combines detail facts, status mutation, blocker fields, queued-work context, next step, comments, checklist, activity, and reassignment in a very tight area.

Rollout impact:

```text
Managers can use it, but new users may miss required fields or feel the rail is doing too much.
```

Recommended fix:

- Keep the rail compact but strengthen section boundaries.
- Make the active task action area visually distinct from informational fields.
- Keep only the most common action expanded by default.
- Make failures and required fields impossible to miss.

### P1 - Day-one workflow gap: comments and activity need clearer success/empty states

Comments and activity are functional, but the console-level presentation is still utilitarian.

Rollout impact:

```text
The feature works, but the team may not immediately trust it as the operational history.
```

Recommended fix:

- Improve empty states.
- Add stronger success feedback after comment creation.
- Compact activity timeline entries and make actor/time/status visually scannable.

### P2 - Product clarity gap: `/tasks`, `/board`, and `/tasks/[id]` boundaries need user-facing clarity

The Tasks module is now split across a manager console, board, staff queue, detail workspace, review queue, and activity feed. That is acceptable, but the handoff needs to feel intentional.

Rollout impact:

```text
Users may wonder which screen is the source of truth unless navigation labels and handoff copy are clear.
```

Recommended fix:

- Treat `/tasks` as "Task Operations Console."
- Treat `/board` as "Daily Dispatch Board."
- Treat `/my-tasks` as "My Work."
- Treat `/tasks/[id]` as "Task Workspace."
- Make these labels consistent in docs and UI copy.

### P2 - Enterprise foundation gap: tenant/location/audit saved-view foundations are still future work

The Enterprise Tasks Module guide correctly identifies organization, location, audit, saved view, task queue, SLA, and custom-field foundations as future-ready requirements. They are not required for a single-location MVP, but they matter before commercial expansion.

Rollout impact:

```text
Not a blocker for Time Motor Sales day one, but should not be forgotten if this becomes a reusable product.
```

Recommended fix:

- Keep tenant/location/audit work out of this MVP gate unless a rollout requirement changes.
- Add database-backed saved views before positioning saved views as an enterprise feature.

---

## 5. Readiness Matrix

| Area | Current level | MVP rollout status |
| --- | --- | --- |
| Daily board generation | Strong | Ready with existing scheduler proof caveats |
| Manager task creation | Good | Ready after active-user source improvement |
| Staff task creation | Missing/partial | Needs implementation before full MVP rollout |
| Assignment/reassignment | Strong | Ready |
| Assignment recommendations | Strong | Ready, improve visibility copy over time |
| Status workflow | Strong | Ready |
| Blocker enforcement | Strong | Ready |
| Ready for Review | Strong | Ready, improve handoff messaging |
| Comments | Functional | Usable, polish recommended |
| Checklist/subtasks | Functional | Usable, clarify required vs optional |
| Activity feed | Strong | Ready |
| `/tasks` visual console | Good | Near-ready after browser coverage |
| `/my-tasks` staff queue | Good | Needs staff create path to satisfy full MVP |
| `/tasks/[id]` workspace | Strong | Ready |
| `/manager-review` | Strong | Ready |
| Saved views | Local convenience | Acceptable only if labeled/local |
| Responsive behavior | Good foundation | Needs broader device QA |
| Automated coverage | Strong backend, weak console browser | Needs console smoke coverage |
| Documentation | Improving | Needs this audit linked into rollout planning |

---

## 6. Recommended Sequence From Here

### Step 1: Add console smoke coverage

Purpose:

```text
Protect the design gate we just tightened.
```

Scope:

- Load `/tasks`.
- Confirm Task Operations Console copy.
- Confirm 8 visible rows on desktop fixture data.
- Confirm no page scroll at the target desktop viewport.
- Open quick-create.
- Switch details/comments/activity tabs.
- Apply a queue filter.
- Select a row and confirm the right rail updates.

### Step 2: Fix quick-create assignment source

Purpose:

```text
Make manager task creation reliable on empty or unusual board days.
```

Scope:

- Fetch/pass active users into `/tasks`.
- Use active users for quick-create owner options.
- Keep selected-task owner as a smart default.

### Step 3: Implement staff self-create

Purpose:

```text
Close the largest mismatch against MVP scope.
```

Scope:

- Add staff create from `/my-tasks` or a small create task route.
- Non-manager creates only for self by default.
- Manager can still assign to anyone.
- Due time remains required.
- Activity event is recorded.
- Add route/service tests.

### Step 4: Add workflow feedback polish

Purpose:

```text
Make every live action feel safe and understandable.
```

Scope:

- Stronger success/failure messages.
- Better required-field cues.
- Clearer Blocked and Ready for Review handoff copy.
- More compact comments/activity empty states.

### Step 5: Decide MVP merge boundary

Purpose:

```text
Avoid merging a "full rollout" claim before the full promise is true.
```

Recommended merge label after steps 1-4:

```text
Tasks Operations Console MVP rollout foundation
```

---

## 7. Rollout Verdict

The Tasks Operations Console is close to MVP-ready for manager use. The broader Tasks MVP rollout still needs a short closing sequence.

Best next implementation branch:

```text
codex/tasks-console-rollout-gate
```

Alternative if the next slice should stay very narrow:

```text
codex/tasks-console-smoke-coverage
```

The recommended path is:

```text
Protect the console with smoke coverage -> fix manager quick-create user source -> add staff self-create -> polish workflow feedback -> merge as MVP rollout foundation.
```
