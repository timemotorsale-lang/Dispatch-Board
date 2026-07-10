# Tasks MVP Rollout Roadmap

**Document:** Tasks MVP Rollout Roadmap  
**Date:** 2026-07-09  
**Scope:** Milestones required to remove the remaining day-one MVP rollout blockers for the Tasks Operations Console  
**Primary route:** `/tasks`  
**Related routes:** `/board`, `/my-tasks`, `/tasks/[id]`, `/manager-review`, `/activity`  
**Status:** Implementation roadmap

---

## 1. Rollout Goal

The goal is to move Tasks from:

```text
Manager console foundation that is close to MVP
```

to:

```text
Day-one Tasks MVP rollout foundation that managers and staff can trust during a real workday
```

This roadmap is intentionally narrow. It addresses the rollout gaps identified in `docs/TASKS_OPERATIONS_CONSOLE_MVP_ROLLOUT_AUDIT.md` and avoids pulling in long-term enterprise features before the day-one workflow is stable.

---

## 2. MVP Blockers To Close

The remaining blockers are:

| Blocker | Why it matters | Priority |
| --- | --- | --- |
| Staff-created tasks are not fully supported | Original MVP says staff can create their own tasks with due time | P0 |
| `/tasks` console lacks repeatable smoke coverage | The new command center can regress without tests | P0 |
| Quick-create owner list is board-derived | Manager create can fail or feel incomplete on empty/unusual board days | P1 |
| Right rail action feedback needs polish | Managers need clear save/error/required-field guidance | P1 |
| Comments/activity states are too plain | Day-one users need to trust the operational history | P1 |
| Durable shared saved views need rollout proof | Saved views are now an MVP promise and must remain server-backed, shared, and tested | P1 |
| Screen boundary labels need consistency | Users need to understand `/tasks`, `/board`, `/my-tasks`, and task workspace handoffs | P2 |

---

## 3. Milestone Plan

### Milestone 1: Protect The Console With Smoke Coverage

**Suggested branch:** `codex/tasks-console-smoke-coverage`
**Implementation status:** Implemented. Static console smoke coverage is implemented, and the Playwright console smoke now runs locally through the system Edge fallback when bundled Chromium is unavailable.

Purpose:

```text
Lock in the compact command-center behavior before more changes are layered on top.
```

Scope:

- Add focused coverage for loading `/tasks`.
- Verify "Task Operations Console" is present.
- Verify the task table renders the expected compact page size.
- Verify the desktop console does not create page-level vertical scroll at the target viewport.
- Verify quick-create opens.
- Verify queue filters change the visible task set.
- Verify row selection updates the right rail.
- Verify details/comments/activity tabs switch.

Exit criteria:

- A repeatable test protects the current console shell.
- The test proves the board remains compact enough for day-one desktop use.
- Existing typecheck/build/lint remain clean.

MVP gap closed:

```text
Repeatable console browser or component smoke coverage.
```

---

### Milestone 2: Make Manager Quick-Create Operationally Complete

**Suggested branch:** `codex/tasks-console-active-user-create`
**Implementation status:** Implemented in working tree. `/tasks` now receives active assignable users, quick-create owner options include active users beyond current board rows, and focused unit coverage protects the merge behavior.

Purpose:

```text
Make Create Task reliable even when the board is empty, incomplete, or missing a user.
```

Scope:

- Pass active assignable users into the `/tasks` page.
- Use active users for the quick-create owner dropdown.
- Keep the selected task owner as the smart default when possible.
- Keep inactive users excluded.
- Preserve manager-only task creation behavior for this milestone.
- Add coverage for owner dropdown source behavior.

Exit criteria:

- Manager can create a task from `/tasks` even when current board tasks do not contain every active user.
- Manager can create the first task for a day after a board lookup/create path exists.
- Quick-create still records activity and refreshes the console.

MVP gap closed:

```text
Manager-created tasks become reliable from the console.
```

---

### Milestone 3: Add Staff Self-Create

**Suggested branch:** `codex/tasks-staff-self-create`
**Implementation status:** Implemented in working tree. Staff can create self-assigned Not Started tasks from `/my-tasks`; the API prevents staff from assigning work to others or creating manager-approval-required tasks; focused service, route, and screen coverage passes.

Purpose:

```text
Close the largest mismatch against the original MVP scope.
```

Scope:

- Add a staff create task path from `/my-tasks` or a lightweight create task surface.
- For non-managers, default `assignedUserId` to the current user.
- Prevent non-managers from assigning tasks to other staff.
- Keep title and due time required.
- Allow optional description, vehicle reference, and customer reference.
- Decide whether staff-created tasks can set manager approval or whether that remains manager-only.
- Emit activity for staff-created tasks.
- Add service, route, and UI coverage.

Exit criteria:

- Staff can create their own task without manager assistance.
- Staff-created tasks appear in My Tasks and the board/task console.
- Non-manager users cannot assign tasks to another user through the API.
- Due time remains required.

MVP gap closed:

```text
Staff-created tasks.
```

---

### Milestone 4: Polish Workflow Feedback And Rail Clarity

**Suggested branch:** `codex/tasks-workflow-feedback-polish`
**Implementation status:** Implemented in working tree. Status/reassign/comment success copy is clearer, Blocked status marks blocker reason as required, and comment/activity empty states now explain what evidence belongs there.

Purpose:

```text
Make every live action feel safe, clear, and manager-ready.
```

Scope:

- Improve status update success and error feedback.
- Make Blocked reason requirements visually obvious before submit.
- Make Ready for Review handoff copy clearer.
- Clarify required update fields for review/completion.
- Tighten right rail section hierarchy without making it taller.
- Improve comments empty state and post-comment success feedback.
- Improve activity timeline scanability.
- Clarify checklist required versus optional work where available.

Exit criteria:

- A manager can tell what action succeeded, what failed, and what is required next.
- Blocked and Ready for Review workflows are visually obvious.
- Comments and activity feel like trusted operational evidence, not placeholder panels.

MVP gaps closed:

```text
Right rail trust, comments/activity polish, workflow feedback clarity.
```

---

### Milestone 5: Clarify Shared Saved Views And Screen Boundaries

**Suggested branch:** `codex/tasks-rollout-copy-boundaries`
**Implementation status:** Implemented. Console saved views are now durable shared team views backed by `TaskSavedView`, `/my-tasks` copy identifies the My Work queue, and module/status docs now describe `/tasks` as the Task Operations Console foundation instead of a placeholder.

Purpose:

```text
Make the product language honest and easy for day-one users.
```

Scope:

- Treat saved views as shared team views backed by the database.
- Keep create/delete manager-gated and allow authenticated staff to apply shared views.
- Standardize route labels:
  - `/tasks` = Task Operations Console
  - `/board` = Daily Dispatch Board
  - `/my-tasks` = My Work
  - `/tasks/[id]` = Task Workspace
  - `/manager-review` = Manager Review
  - `/activity` = Activity Feed
- Add handoff copy where the console links to the full task workspace or review queue.
- Update docs/status language to match the new boundaries.

Exit criteria:

- Users understand which screen to use for scanning, executing, reviewing, and deep editing.
- Saved views are durable, shared, and protected by service, route, and console smoke coverage.
- Documentation uses the same naming as the UI.

MVP gaps closed:

```text
Product clarity and saved-view honesty.
```

---

### Milestone 6: Final MVP Rollout Gate

**Suggested branch:** `codex/tasks-mvp-rollout-gate`
**Implementation status:** Completed for the current MVP gate. Task-focused unit/integration validation, typecheck, lint, production build, and targeted Playwright `/tasks` console smoke validation pass.

Purpose:

```text
Run the final acceptance pass before calling Tasks day-one MVP ready.
```

Scope:

- Run full task-focused validation.
- Run full typecheck/build.
- Run console smoke/browser validation.
- Validate manager workflow:
  - Open `/tasks`.
  - Generate or verify board.
  - Create task.
  - Reassign task.
  - Block with reason.
  - Move review-required task to Ready for Review.
  - Complete or send back through Manager Review.
- Validate staff workflow:
  - Open `/my-tasks`.
  - Create own task.
  - Update own task status.
  - Add comment.
  - Complete eligible task or submit review-required task.
- Validate activity trail:
  - Task creation appears.
  - Status changes appear.
  - Comments appear.
  - Manager review actions appear.
- Update rollout docs with evidence and known deferments.

Exit criteria:

- Day-one manager and staff workflows pass.
- Remaining gaps are explicitly deferred and not part of MVP scope.
- The branch is ready to open as the Tasks MVP rollout foundation PR.

MVP gap closed:

```text
Final confidence gate for day-one rollout.
```

---

## 4. Recommended Implementation Order

Use this order:

1. `codex/tasks-console-smoke-coverage`
2. `codex/tasks-console-active-user-create`
3. `codex/tasks-staff-self-create`
4. `codex/tasks-workflow-feedback-polish`
5. `codex/tasks-rollout-copy-boundaries`
6. `codex/tasks-mvp-rollout-gate`

If the team wants one larger branch instead, use:

```text
codex/tasks-console-rollout-gate
```

But the safer path is the six smaller branches above.

---

## 5. Day-One MVP Definition Of Done

Tasks can be called day-one MVP rollout ready when:

- Manager can use `/tasks` as the operations console without visual confusion.
- Manager can create, assign, reassign, block, review, and complete task work.
- Staff can create their own tasks and update their own assigned work.
- Blocked tasks require a blocker reason.
- Review-required tasks pass through Ready for Review.
- Comments, checklist, and activity history support real execution.
- `/tasks`, `/my-tasks`, `/tasks/[id]`, `/manager-review`, and `/activity` feel like one connected module.
- Repeatable tests protect the console and workflow rules.
- Remaining enterprise items are documented as deferred, not accidentally implied.

---

## 6. Explicitly Deferred Until After Day One

Do not block the MVP rollout on:

- custom workflow builder
- SLA/escalation engine
- advanced analytics
- tenant/location administration
- external DMS/CRM/Asana integrations
- custom field administration
- enterprise audit-log expansion beyond existing activity events
- advanced workload balancing

These remain valid future work, but they should not slow the first successful Tasks rollout.
