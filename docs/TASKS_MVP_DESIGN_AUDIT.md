# Tasks MVP Design Audit

**Document:** Tasks MVP Design Audit  
**Date:** 2026-07-09  
**Scope:** `/tasks` design implementation level versus day-one MVP expectation  
**Parent product:** Time Motor Sales Dispatch Board  
**Status:** Current branch audit for roadmap planning

---

## 1. Executive Assessment

The Tasks board is now beyond the old "shared placeholder/entry surface" description. It has become an active task operations console inside the Dispatch Board shell.

Current level:

```text
MVP workflow foundation: Strong
MVP visual console: Partial but close
Day-one manager usability: Usable after focused polish
Enterprise expansion readiness: Early foundation, not complete
```

Recommended conclusion:

```text
Keep building on this branch until the Tasks console reaches a clean MVP design gate.
Do not split it into a separate product.
Do not expand into advanced enterprise features until the day-one console feels stable, compact, and explainable.
```

The most important remaining work is not backend workflow wiring. The biggest remaining gap is **design cohesion and day-one operational polish** around the `/tasks` command-center experience.

---

## 2. MVP Expectation

The day-one MVP expectation from `docs/MVP_SCOPE.md` and `docs/ENTERPRISE_TASKS_MODULE.md` is:

- Daily board generation creates useful team tasks.
- Managers can see the full board, create tasks, reassign work, monitor blockers, and review completion-required work.
- Staff can see their work, update status, add comments, and report blockers.
- Blocked tasks require blocker reasons.
- Approval-required tasks pass through Ready for Review before Completed.
- Comments, checklist progress, and activity history support execution.
- The UI remains responsive and usable without feeling like a fragile prototype.

The Tasks module expectation is:

```text
Basic feature set, enterprise-grade foundation.
```

That means day one does not need advanced reporting, custom workflow builders, deep CRM/DMS integration, or full tenant/plan administration. It does need a polished enough task console that the manager can trust during the workday.

---

## 3. Current Strengths

### Workflow foundation

The task workflow foundation is strong for MVP:

- `/tasks` loads the real board date and selected task from server-side read models.
- Status updates are live through `/api/tasks/:id/status`.
- Blocked tasks require a blocker reason server-side.
- Approval-required tasks cannot skip directly to Completed.
- Reassignment is manager-gated through `/api/tasks/:id/assignment`.
- Comments and checklist endpoints are live.
- Activity events are recorded for important task moves.
- The task detail workspace, My Tasks, Manager Review, Activity Feed, and Board surfaces already exist.

### Design foundation

The `/tasks` screen now includes the major visual pieces required by the approved mockup:

- Top task command bar.
- Search, create, generation, date, saved views, filters, export, and overflow controls.
- Compact task KPI strip.
- Internal task sidebar with Team Work and Department queues.
- Dense table with 8 tasks per page.
- List and board view modes.
- Right-side task detail rail.
- Details, comments, and activity tabs.
- Status, reassignment, comments, checklist, and detail navigation actions.
- Bottom queue/attention cards.
- Compact no-page-scroll behavior at the tested desktop viewport.

### Visual direction

The board is moving toward the intended command-center feel:

- It is dense and manager-first.
- It uses status and priority color.
- It shows task context without forcing navigation away from the board.
- It is starting to match `docs/images/TASKS_UI_SOURCE_OF_TRUTH.png` in hierarchy and layout.

---

## 4. MVP Gap Matrix

| MVP/design area | Current level | Gap to day-one MVP |
| --- | --- | --- |
| Daily board visibility | Strong | Mostly polish only |
| Task list density | Strong | Continue compact QA at common desktop sizes |
| Right-side task rail | Partial to strong | Needs final visual cleanup, clearer hierarchy, and less internal crowding |
| Status workflow | Strong | UI should make required fields and failed saves even clearer |
| Blocker workflow | Strong backend, good UI | Improve blocker reason prominence when status is Blocked |
| Ready for Review | Strong backend | Add clearer manager-review handoff messaging and queue shortcut |
| Comments | Functional | Needs richer empty/success state polish |
| Activity | Functional | Needs more scan-friendly compact timeline presentation |
| Checklist/subtasks | Functional | Needs better "required vs optional" distinction |
| Saved views | Browser-persisted UI | MVP-acceptable, but not durable/server-backed |
| Filters | Functional UI | Needs active-filter chips or clearer selected-filter summary |
| Export | Functional visible-task CSV | MVP-acceptable for day one |
| Create task | Links back to board flow | Needs a true `/tasks` quick-create path later |
| Assignment/reassignment | Strong | Needs better recommendation explanation display in rail |
| Responsive behavior | Implemented | Needs tablet/mobile visual QA after desktop gate |
| Accessibility | Basic | Needs keyboard/focus and screen-reader audit before release |
| Browser evidence | Manual pass exists | Needs repeatable automated smoke/e2e coverage |
| Documentation alignment | Improving | Need update status docs to stop calling `/tasks` only a placeholder |

---

## 5. MVP Readiness Rating

### Current practical rating

```text
Tasks workflow MVP: 80-85%
Tasks visual MVP: 65-75%
Combined day-one Tasks readiness: 75-80%
```

This is close enough to continue refining in place. It is not yet clean enough to call the `/tasks` console design gate complete.

### Why not higher

The remaining issues are mostly user-experience trust issues:

- The command rail can still feel cramped when required fields appear.
- Some controls are live but do not yet communicate their state as clearly as a day-one manager tool should.
- The board and task-detail workspace overlap conceptually; the handoff between quick actions and full detail still needs polish.
- Saved views are useful but currently local/browser-persisted rather than durable operational preferences.
- The UI has had manual browser verification, but not enough repeatable e2e coverage for the new console interactions.

---

## 6. Recommended Design Implementation Roadmap

### Step 1: Finish visual MVP gate

Target: the screen feels like a finished day-one command center.

Tasks:

- Finalize right rail density and hierarchy.
- Make required update fields more compact and clearer.
- Improve rail empty/loading/error states.
- Ensure status, priority, due time, owner, and department values never create unexpected row/card height.
- Validate at 1280x720, 1366x768, 1440x900, and one tablet breakpoint.
- Keep 8 visible task rows unless a tested breakpoint requires 6.

Exit criteria:

- Manager can open `/tasks` and understand the whole board without vertical page scrolling on common desktop.
- The right rail supports quick action without feeling like a second full page.
- Visual result remains aligned with `TASKS_UI_SOURCE_OF_TRUTH.png`.

### Step 2: Clarify live workflow feedback

Target: every live action feels safe.

Tasks:

- Strengthen success/error messages for status, reassignment, comments, and checklist actions.
- Make Blocked status visually require blocker reason before submit.
- Make Ready for Review explain what manager action comes next.
- Add clearer disabled/loading states for forms.
- Add active selected-filter summary near the stage toolbar.

Exit criteria:

- A manager or staff member always knows what changed, what failed, and what to do next.

### Step 3: Close day-one task creation gap

Target: `/tasks` should not send users elsewhere for the most common task creation flow.

Tasks:

- Add a compact Create Task modal or side-panel from the `/tasks` command bar.
- Keep full task workspace available for deep editing.
- Support title, assigned user, due time, status, priority/source defaults, vehicle/customer reference, and manager approval flag.

Exit criteria:

- A manager can create a one-off task from `/tasks` without leaving the console.

### Step 4: Improve recommendation and review visibility

Target: the manager understands why work is assigned and what needs review.

Tasks:

- Surface assignment recommendation explanation in the right rail.
- Add a compact review-required marker in table rows or rail.
- Make Ready for Review queue card and sidebar filter feel first-class.
- Improve manager review handoff from `/tasks` to `/manager-review`.

Exit criteria:

- The console explains the "why" behind assignment and review queues, not just the current status.

### Step 5: Add repeatable browser smoke coverage

Target: protect the new console from regression.

Tasks:

- Add e2e/smoke coverage for loading `/tasks`, filtering queues, selecting a task, switching tabs, opening menus, and checking no desktop page scroll.
- Add workflow smoke for status update validation using safe test data.
- Add visual-density assertions where practical.

Exit criteria:

- The design gate can be preserved without relying only on manual screenshots.

### Step 6: Update roadmap/status docs

Target: documentation matches reality.

Tasks:

- Update `docs/CURRENT_IMPLEMENTATION_STATUS.md` so `/tasks` is no longer described as only a placeholder.
- Link this audit from `docs/ENTERPRISE_TASKS_MODULE.md`.
- Add a short milestone table for the Tasks console MVP design gate.

Exit criteria:

- Future work starts from the current truth instead of stale status language.

---

## 7. Should We Merge Now?

Recommendation:

```text
Not yet, if the goal is to merge a clean Tasks MVP design gate.
Yes, soon, if we define this branch as an incremental UI/workflow-actions branch.
```

Best sequence:

1. Finish the rail and compactness polish.
2. Add one quick-create or workflow-feedback improvement if small.
3. Add or update smoke coverage.
4. Commit this branch.
5. Open a PR as "Tasks console MVP design/workflow foundation."
6. Continue advanced features on a follow-up branch.

---

## 8. Day-One MVP Boundary

Include for day one:

- Daily task board console.
- Create task.
- Search/filter/saved view basics.
- Dense list view.
- Simple board view.
- Right rail quick actions.
- Status/reassign/comment/checklist.
- Review and blocker visibility.
- CSV export.
- Manual browser proof and basic automated coverage.

Defer after day one:

- Server-backed saved views.
- Custom workflow builders.
- Full task SLA engine.
- Advanced task analytics.
- Durable audit log beyond current activity events.
- Multi-organization/multi-location task administration.
- External integrations.
- Advanced role-based dashboards.
- Full custom field administration.

---

## 9. Audit Verdict

The Tasks board is on the right track and is close to MVP design readiness. The backend foundation is ahead of the visual design polish. The next work should stay narrow and sequential:

```text
Polish the current command center -> close quick-create/workflow feedback gaps -> add browser proof -> update docs -> merge.
```

This keeps the module honest, useful, and aligned with the approved source-of-truth mockup without overbuilding enterprise features before the day-one workflow is fully trusted.
