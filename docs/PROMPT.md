# Task

DB-037 — Build staff-focused task view

# Goal

Create a streamlined staff-focused “My Tasks” experience for the Time Motor Sales Dispatch Board so a logged-in staff member can quickly find, open, and update their own assigned tasks during the workday.

This task should make the app more usable for staff without expanding scope into comments, activity feed, recommendations, or manager review UI.

# Context

Read these first:

- `docs/AGENTS.md`

- `docs/ROADMAP.md`

- `docs/ARCHITECTURE.md`

- `docs/PRODUCT_SPEC.md`

- `docs/MVP_SCOPE.md`

- Existing auth/session files

- Existing board/task API or server action files

- Existing board UI files from DB-028 through DB-036

- Existing task detail/status update files

- `UI_REFERENCE.png` for layout, spacing, left navigation, enterprise-level visual direction, and the “My Tasks” navigation concept

Roadmap context:

- This is in `v0.4.0 - Board and task workflow`.

- Earlier tasks should already provide:

  - Board read API

  - Initial board page

  - Board grouping/filtering controls

  - Manual task creation API/UI

  - Task detail endpoint/read model

  - Staff status update endpoint

  - Blocker-reason validation

  - Approval-required status rules

Staff-facing product intent:

- Staff should be able to log in, see their assigned work, update status, mark blockers with a reason, and complete eligible tasks.

- Staff can see the full board elsewhere, but this view should be optimized around their own assigned tasks.

- Mobile should prioritize “my tasks,” quick status changes, blocker updates, and task detail access.

# Current behavior

The app has or should have the main board and task update foundations, but staff do not yet have a dedicated, simplified “My Tasks” surface.

Staff likely need to use the full board to find their own work, which is inefficient on mobile and creates clutter.

# Desired behavior

Implement a dedicated staff-focused task view.

Preferred route:

- Use the existing app routing conventions.

- If a sidebar/nav route already exists for “My Tasks,” wire it to this screen.

- If not, create a route such as `/my-tasks` or the closest route that matches the current app structure.

- Do not break the main Dispatch Board route.

The “My Tasks” view should:

1. Load the current authenticated user.

2. Load today’s board data using the existing board/task read path where practical.

3. Show only tasks assigned to the current user by default.

4. Provide a simple way to open the full Dispatch Board.

5. Display tasks in a mobile-friendly card/list format rather than forcing a dense table on small screens.

6. Support desktop and tablet layouts while keeping the page simpler than the main board.

7. Include clear loading, empty, and error states.

Each task item/card should show the most important information:

- Task title

- Current status

- Due time or time left

- Workflow area/stage

- Vehicle/customer reference when present

- Requires manager approval badge when applicable

- Blocker reason when status is `Blocked`

- Simple next action button when obvious, such as:

  - Start

  - Update

  - Resolve blocker

  - Ready for Review

  - Complete

  - Open

Add practical staff filters/chips:

- All

- Open

- Due soon

- Blocked / Waiting

- Ready for Review

- Completed

Keep filters simple. Do not build saved views or advanced search in this task.

Status update behavior:

- Staff should be able to update their own assigned tasks through the existing status update endpoint/server action.

- Use the existing server-side validation from DB-034 through DB-036.

- If a staff member marks a task as `Blocked`, require blocker reason input before submitting.

- If a task requires manager approval, do not allow staff to directly complete it from the UI. The UI should route them to `Ready for Review` instead.

- If the server rejects a transition, show a clear error message and keep the task visible.

- Do not weaken server-side permission rules in the UI.

Task opening behavior:

- Each task should open the existing task detail route or task detail surface from DB-033.

- Do not create a separate duplicate task detail system.

- Reuse existing task detail components if they exist.

# Visual guidance from mockup

Use `UI_REFERENCE.png` as the visual direction, but keep this task functional-first.

Important guidance:

- The left sidebar should include “My Tasks” as a first-class navigation item.

- The staff view should feel like a simplified version of the main board, not a separate app.

- Preserve the clean enterprise look: clear spacing, crisp cards, readable badges, and obvious next actions.

- Avoid clutter. Staff should not need to scan the full manager dashboard to know what to do next.

- On mobile, prioritize task cards, status actions, due time, and blocker controls.

- Avoid horizontal overflow.

Do not over-polish beyond what is needed for a usable staff workflow. Visual refinement can continue in later polish tasks.

# Implementation guidance

Before coding, inspect the current implementation and briefly identify:

1. Existing route structure.

2. Existing auth/session helper.

3. Existing board/task fetch path.

4. Existing status update action/API.

5. Existing shared UI components that should be reused.

6. Any missing pieces that block this task.

Then implement the smallest useful vertical slice.

Suggested approach:

1. Add a `My Tasks` route/page using the existing app shell.

2. Reuse existing board/task data loading instead of creating a new API unless the current code clearly needs a small dedicated helper.

3. Filter tasks by `assignedUserId === currentUser.id`.

4. Add staff-focused task list/card components under the existing feature/component structure.

5. Add quick status update controls that call the existing status update endpoint/action.

6. Add blocker reason input flow for blocked status.

7. Respect approval-required rules in the UI, but rely on the server as the source of truth.

8. Add loading, empty, and error states.

9. Wire the sidebar/nav “My Tasks” item to this route.

10. Add or update tests where the current test setup supports it.

# Constraints

- Keep the change minimal and reviewable.

- Do not add new dependencies unless absolutely necessary.

- Do not change database schema for this task.

- Do not implement task comments API or task comments UI; those belong to DB-038 and DB-039.

- Do not implement activity feed changes; those belong to v0.5.0 tasks.

- Do not implement manager review queue UI; that belongs to DB-048.

- Do not rewrite the main board page unless a tiny shared-component extraction is clearly justified.

- Do not add fake/mock production data.

- Preserve existing behavior for managers and the main board.

- Keep permission enforcement server-side.

- Avoid horizontal overflow and dense desktop-only table assumptions.

- If a larger refactor seems necessary, stop and explain it before making that refactor.

# Acceptance criteria

The task is complete when:

- A logged-in staff member can open “My Tasks.”

- The view shows today’s tasks assigned to that staff member by default.

- Tasks show status, due time, workflow area, and vehicle/customer references when available.

- Staff can quickly open a task detail view from the list.

- Staff can update allowed statuses from this view.

- Blocked status requires a blocker reason before submit.

- Approval-required tasks cannot be directly completed by staff from the UI.

- Non-approval-required tasks can be completed by staff when allowed by the server.

- Server rejection errors are displayed clearly.

- Empty state is useful when the staff member has no assigned tasks.

- Loading and error states are handled.

- The page works on desktop, tablet, and phone-sized screens.

- Existing board behavior still works.

# Tests / checks

Run the relevant commands available in the repo, such as:

- `npm run lint`

- `npm run typecheck`

- `npm test`

- Any existing component, integration, or e2e tests related to board/task/status behavior

Add tests where practical for:

- Staff sees only their own assigned tasks in My Tasks.

- Staff can trigger an allowed status update.

- Blocked requires blocker reason.

- Approval-required task shows Ready for Review instead of direct Complete.

- Empty state renders when no tasks are assigned.

If any test/check cannot be run, clearly state why.

# Done when

- The staff-focused task view works with real app data.

- The implementation is scoped to DB-037.

- No unrelated files are changed.

- Existing task and board behavior is preserved.

- Relevant tests/checks pass or skipped checks are explained.

- Any necessary docs or navigation notes are updated.

- The final Codex summary includes:

  - Files changed

  - Behavior added

  - Tests/checks run

  - Known limitations or follow-up work