# Task

Implement DB-035 — Enforce blocker-reason validation

# Goal

Require a blocker reason whenever a task is moved to `Blocked`.

The server must reject any status transition to `Blocked` when the request does not include a meaningful blocker reason. This validation must apply regardless of whether the request comes from the staff status update endpoint, a manager update path, a server action, or any shared task mutation service.

# Context

Read these files first:

- `docs/AGENTS.md`

- `docs/ROADMAP.md`

- `docs/ARCHITECTURE.md`

- `docs/PRODUCT_SPEC.md`

- `docs/MVP_SCOPE.md`

- Relevant task/status API, service, validation, repository, and policy files

Relevant product rules:

- Staff may update their own assigned tasks.

- Staff may mark tasks as `Blocked`, but a blocker reason is required.

- `Blocked` tasks need immediate manager visibility later through the board and activity feed.

- Server-side business rules are the source of truth.

- UI controls may help guide the user, but the server must enforce the rule.

- DB-035 acceptance criteria: the server rejects blocked transitions that do not include a reason.

# Current behavior

DB-034 should already have introduced a staff status update endpoint or server mutation for updating task status.

The current implementation may allow a task to move to `Blocked` without a blocker reason, or may only enforce the rule in the UI.

# Desired behavior

When a task status is changed to `Blocked`:

1. The request must include a blocker reason.

2. The blocker reason must be a non-empty string after trimming whitespace.

3. The blocker reason should be persisted on the task.

4. The server should return a clear validation error if the reason is missing or blank.

5. Existing permission rules must still apply.

6. Existing allowed status transition rules must still apply.

7. Updating a task to any status other than `Blocked` should not require a blocker reason.

8. Do not remove an existing blocker reason unless the current codebase already has a deliberate rule for clearing it.

# Implementation guidance

Inspect the current task status update flow before editing.

Prefer placing the validation in the shared server-side status update path, not only inside a route handler. The goal is to prevent bypasses if more than one endpoint or server action can change task status.

Suggested approach:

1. Find the existing status update endpoint or server action from DB-034.

2. Find any shared task validation or domain validation module.

3. Add or update validation so `status === "Blocked"` requires a trimmed blocker reason.

4. Ensure the validated blocker reason is saved with the task.

5. Return a consistent validation error response, following the project’s existing API error pattern.

6. Add regression tests for missing, blank, and valid blocker reasons.

7. If the UI already has status controls for `Blocked`, make only the minimal change needed to send the blocker reason and display the validation error clearly.

8. Do not build the full activity feed yet unless it already exists and the current status update service already emits events.

# Constraints

- Keep the change minimal and focused on DB-035.

- Do not implement DB-036 approval-required status rules.

- Do not implement DB-038/DB-039 task comments.

- Do not implement DB-041/DB-044 activity feed work unless existing code already has event helpers that must be preserved.

- Do not add new dependencies unless absolutely necessary.

- Do not rewrite unrelated task, board, auth, or UI code.

- Preserve existing status update behavior for non-Blocked statuses.

- Preserve staff self-update permission rules from DB-034.

- Keep validation server-side.

- Follow existing project patterns for validation, errors, repositories, and tests.

# Edge cases to cover

- Status update to `Blocked` with no blocker reason is rejected.

- Status update to `Blocked` with `""` is rejected.

- Status update to `Blocked` with only spaces is rejected.

- Status update to `Blocked` with a valid reason succeeds.

- A staff user still cannot update another staff member’s task.

- A non-Blocked status update does not require blocker reason.

- Existing tests for task creation, board read, and staff status updates still pass.

# Tests

Add or update tests in the most appropriate existing test location.

Prioritize integration tests around the status update endpoint or server action.

Recommended test cases:

1. `PATCH/POST status update -> Blocked` without reason returns validation error.

2. `PATCH/POST status update -> Blocked` with blank reason returns validation error.

3. `PATCH/POST status update -> Blocked` with valid reason succeeds and persists `blockerReason`.

4. Updating to `In Progress`, `Waiting on Parts`, `Waiting on Approval`, `Ready for Review`, or `Completed` does not require blocker reason unless another existing rule requires it.

5. Permission enforcement still prevents staff from updating tasks they do not own.

Run the relevant checks available in the repo, such as:

- `npm test`

- `npm run typecheck`

- `npm run lint`

If any command does not exist or cannot be run, state that clearly in the final summary.

# Done when

- The server rejects `Blocked` transitions without a meaningful blocker reason.

- Valid `Blocked` transitions save the blocker reason.

- Existing staff status update permissions still work.

- Relevant regression tests are added or updated.

- Relevant tests/typecheck/lint pass, or any skipped checks are clearly explained.

- The final response summarizes:

  - Files changed

  - Behavior added

  - Tests run

  - Any remaining risks or follow-up work