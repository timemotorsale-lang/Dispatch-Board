# Task

DB-048 — Add review queue and approval UI

# Goal

Add a manager-facing review queue to the Time Motor Sales Dispatch Board that surfaces tasks in `Ready for Review` and lets managers approve completion or return the task back to `In Progress`.

This should make manager review work visible, fast, and trustworthy without cluttering the board.

# Context

Read these files first:

- `docs/AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/PRODUCT_SPEC.md`
- `docs/MVP_SCOPE.md`
- Existing board/task/activity/recommendation files
- `UI_REFERENCE.png` or the project mockup image under `docs/images` if present

Relevant product rules:

- Tasks that require manager approval must pass through `Ready for Review` before `Completed`.
- Managers can review and complete approval-required tasks.
- Managers can return review-required tasks back to `In Progress`.
- Staff should not be able to complete approval-required tasks directly.
- Important state changes should create `ActivityEvent` records.
- UI should stay clean, responsive, and aligned with the approved board mockup.

# Current behavior

The app already has the board/task workflow, approval-required status rules, activity feed, recommendation logic, recommendation persistence, and manager reassignment/override behavior from prior tasks.

However, managers do not yet have a dedicated review queue UI that clearly shows `Ready for Review` tasks and provides direct approval/reopen actions.

# Desired behavior

Implement a manager-facing review queue surface.

The review queue should:

- Show tasks for the selected board date where `status = Ready for Review`.
- Prioritize tasks that have `requiresManagerApproval = true`.
- Be visible to managers.
- Be hidden, disabled, or read-only for staff based on existing auth/policy patterns.
- Display a clear count of items waiting for review.
- Show each review task with enough context to decide quickly:
  - title
  - assigned staff member
  - due time
  - workflow area
  - current status
  - vehicle/customer reference if present
  - latest useful update/comment if already available in the read model
  - ready-for-review timestamp if available
- Provide two manager actions:
  - Approve / Mark Completed
  - Return to In Progress / Reopen
- After an action succeeds:
  - update the task status in the UI
  - remove the task from the review queue if it is no longer `Ready for Review`
  - refresh or update the board data
  - allow the activity feed to show the resulting event if activity refresh is already implemented
- Show loading, empty, and error states.

# UI placement guidance

Use the existing board layout and the approved mockup direction.

Preferred placement:

- Add the review queue as a manager control surface on the main board page.
- If the app already has a right-side activity rail, place the review queue near manager controls or above/beside the activity feed without making the rail crowded.
- If the app has a task detail drawer/panel, allow approve/reopen actions there too when a manager opens a `Ready for Review` task.
- Keep the queue visually compact: count, cards/rows, primary approve action, secondary reopen action.
- Avoid creating a separate full page unless the existing architecture already points that way.

Visual principles:

- Clean enterprise-level layout.
- Strong scanability.
- Minimal clutter.
- No horizontal overflow.
- Responsive behavior for desktop, tablet, and mobile.
- Mobile may collapse the review queue into a section, drawer, accordion, or tab as long as manager actions remain easy to access.

# Implementation guidance

Before editing, inspect the current codebase and identify:

1. How board data is loaded.
2. How tasks are represented in the frontend read model.
3. Whether `POST /api/tasks/:id/complete` and `POST /api/tasks/:id/reopen` or equivalent server actions already exist.
4. How manager/staff role checks are exposed to the UI.
5. How activity feed refresh currently works.
6. Existing shared UI components that should be reused.

Then implement the smallest clean vertical slice.

Expected implementation shape, adjusted to existing patterns:

- Add or extend a review queue component under the relevant feature folder, likely:
  - `src/features/tasks/`
  - `src/features/board/`
  - or `src/features/review/` if that pattern already exists.
- Reuse existing task card, button, badge, user, status, and loading/error components where possible.
- Use the existing board API/read model if it already includes enough task data.
- If the current board read model does not expose enough fields for the review queue, extend it minimally.
- Do not create duplicate task-fetching logic if board data already contains the tasks.
- Use existing complete/reopen endpoints or server actions.
- If those endpoints do not exist, stop and report what is missing instead of rebuilding DB-036 or broad backend behavior.
- Do not re-implement approval rules in the UI only. The server must remain the source of truth.
- Add optimistic UI only if the current app already uses that pattern. Otherwise use simple pending states.

# Required manager actions

Approve / Mark Completed:

- Only managers can perform this action.
- Only enabled when the task is `Ready for Review`.
- Calls the existing completion path.
- On success, task becomes `Completed`.
- UI reflects the completed state and removes it from the queue.

Return to In Progress / Reopen:

- Only managers can perform this action.
- Only enabled when the task is `Ready for Review`.
- Calls the existing reopen path.
- On success, task becomes `In Progress`.
- UI reflects the reopened state and removes it from the queue.

# Edge cases

Handle these cases gracefully:

- No tasks are currently ready for review.
- Board has not been generated or no board data exists for selected date.
- A task action fails because another user already changed the status.
- A staff user views the board.
- A manager double-clicks an approval action.
- Slow network or pending request.
- The selected board date changes.
- Activity feed exists but does not immediately refresh.

# Constraints

- Keep the change scoped to DB-048.
- Do not redesign the whole board.
- Do not rewrite unrelated components.
- Do not add new dependencies unless absolutely necessary.
- Do not bypass server-side permission checks.
- Do not create fake/dummy data in production-facing UI.
- Preserve existing board, task detail, comments, recommendation, reassignment, and activity behavior.
- Follow existing architecture and naming conventions.
- Keep UI aligned with the approved mockup/reference image.
- Avoid horizontal overflow.
- Support desktop, tablet, and mobile layouts.

# Tests / checks

Add or update tests where appropriate for this task, but do not duplicate the broader DB-049 review and visibility test suite.

At minimum, cover what is practical in the current test setup:

- Review queue renders `Ready for Review` tasks for a manager.
- Empty state appears when there are no review tasks.
- Staff users do not see manager-only approval controls, or controls are disabled/read-only according to existing policy/UI pattern.
- Approve action calls the correct complete endpoint/action.
- Reopen action calls the correct reopen endpoint/action.
- Pending/error states are handled.

Run the relevant commands available in the repo, such as:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- targeted component or integration tests if available

If any command cannot be run, clearly explain why.

# Done when

- Managers can see a clear review queue of `Ready for Review` tasks.
- Managers can approve a review task and mark it completed from the UI.
- Managers can return a review task back to `In Progress` from the UI.
- Staff cannot use manager-only approval controls.
- The queue updates after successful actions.
- Loading, empty, pending, and error states are present.
- UI remains responsive and consistent with the approved Dispatch Board design.
- Existing board/task/activity behavior is preserved.
- Relevant tests/checks pass or any gaps are clearly reported.
- Summarize:
  - files changed
  - behavior added
  - tests/checks run
  - any follow-up work for DB-049