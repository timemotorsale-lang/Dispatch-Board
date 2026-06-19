# Task

DB-036 — Enforce approval-required status rules

# Goal

Implement the server-side task status rules for tasks where `requiresManagerApproval = true`.

Approval-required tasks must pass through `Ready for Review` before they can become `Completed`, and staff must not be able to directly complete approval-required tasks.

# Context

Read these first:

- `docs/AGENTS.md`

- `docs/ARCHITECTURE.md`

- `docs/ROADMAP.md`

- `docs/MVP_SCOPE.md`

- Existing task status update endpoint/service from DB-034

- Existing blocker validation implementation from DB-035

- Existing task policy, validation, repository, and test files

Relevant product rules:

- Staff can update their own assigned tasks through allowed transitions.

- Staff cannot update other staff members’ tasks.

- `Blocked` still requires a blocker reason.

- Tasks with `requiresManagerApproval = true` must move to `Ready for Review` before `Completed`.

- Tasks with `requiresManagerApproval = false` may be completed directly by the assigned staff member.

- Managers can complete approval-required tasks only after the task is already `Ready for Review`.

- Managers can send a `Ready for Review` task back to `In Progress`.

- Keep all enforcement server-side. UI may hide unavailable options, but the API/service must be the source of truth.

# Current behavior

The status update flow exists, and DB-035 should already reject `Blocked` transitions without a blocker reason.

The approval-required completion flow is not fully enforced yet. A staff user may still be able to move an approval-required task directly to `Completed`, or the code may not consistently require `Ready for Review` first.

# Desired behavior

Implement these rules in the existing status update service/API:

## For approval-required tasks

When `task.requiresManagerApproval === true`:

1. Assigned staff may move the task to `Ready for Review`.

2. Assigned staff may not move the task directly to `Completed`.

3. Manager may move the task from `Ready for Review` to `Completed`.

4. Manager may move the task from `Ready for Review` back to `In Progress`.

5. Manager should not skip the review gate by moving an approval-required task directly from `Not Started`, `In Progress`, `Blocked`, `Waiting on Parts`, or `Waiting on Approval` to `Completed`.

6. When moved to `Ready for Review`, set `readyForReviewAt` if the field exists.

7. When manager completes the task, set `completedAt` and `reviewedByUserId` if those fields exist.

8. When sent back to `In Progress`, clear completion fields if needed and follow existing timestamp conventions.

## For non-approval-required tasks

When `task.requiresManagerApproval === false`:

1. Assigned staff may move their own task directly to `Completed`.

2. Completion should set `completedAt` if that is already part of the task model/service pattern.

3. Existing manager behavior should remain valid unless it conflicts with current server-side policies.

# Implementation guidance

- Reuse the existing status update endpoint/service instead of creating a parallel workflow.

- Prefer a centralized status-transition validator/helper if one already exists.

- If validation is currently inline in the route/server action, move only the minimum necessary logic into a small helper if that improves clarity.

- Use the existing status enum/constants rather than duplicating status strings.

- Return errors using the project’s existing API/error conventions.

- Keep DB-035 behavior intact: `Blocked` must still require a blocker reason.

- Do not build the DB-048 review queue UI in this task.

- Do not implement the full activity feed schema if DB-041 is not already implemented. If activity logging helpers already exist, preserve/use the existing pattern for status changes without expanding the scope.

- Do not redesign the board UI. If the existing UI exposes invalid status options, make the smallest possible adjustment to hide/disable invalid options or surface the server error clearly.

# Expected transition examples

These should pass:

- Staff assigned to an approval-required task moves it from `In Progress` to `Ready for Review`.

- Manager moves an approval-required task from `Ready for Review` to `Completed`.

- Manager moves an approval-required task from `Ready for Review` back to `In Progress`.

- Staff assigned to a non-approval-required task moves it from `In Progress` to `Completed`.

These should fail:

- Staff assigned to an approval-required task moves it directly to `Completed`.

- Staff tries to complete another staff member’s task.

- Manager tries to complete an approval-required task before it is `Ready for Review`.

- Any user moves a task to `Blocked` without a blocker reason.

# Tests

Add or update focused tests for the status update service/API.

Cover at least:

1. Staff cannot directly complete an approval-required task.

2. Staff can move an approval-required task to `Ready for Review`.

3. Manager can complete an approval-required task from `Ready for Review`.

4. Manager cannot complete an approval-required task before `Ready for Review`.

5. Manager can send a `Ready for Review` task back to `In Progress`.

6. Staff can directly complete a non-approval-required task assigned to them.

7. Existing self-update permission rule still prevents staff from updating someone else’s task.

8. Existing blocker-reason validation still works with approval-required and non-approval-required tasks.

# Constraints

- Keep the change minimal and reviewable.

- Follow existing architecture and naming patterns.

- Keep permission checks and business rules server-side.

- Do not add new dependencies unless absolutely necessary.

- Do not rewrite unrelated task, board, auth, or UI code.

- Do not implement DB-037, DB-040, DB-041, DB-048, or DB-049.

- Preserve existing tests and update only those affected by this behavior.

- If schema fields like `readyForReviewAt`, `completedAt`, or `reviewedByUserId` do not exist yet, inspect the current schema and use the closest existing fields. Do not create a broad migration unless the current model cannot represent the rule.

# Done when

- Approval-required tasks cannot be directly completed by staff.

- Approval-required tasks must pass through `Ready for Review` before `Completed`.

- Managers can complete approval-required tasks only from `Ready for Review`.

- Non-approval-required tasks can still be completed directly by assigned staff.

- Existing blocker-reason validation still works.

- Existing staff self-update restrictions still work.

- Relevant tests pass.

- Typecheck/lint pass if available.

- Summarize files changed, behavior added, and tests run.