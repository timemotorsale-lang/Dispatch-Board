# Task

Implement DB-040 — Add board and task workflow tests

# Goal

Add automated tests that protect the v0.4.0 board and task workflow after DB-028 through DB-039.

This is a test-focused task. The goal is not to redesign the UI or add new product features. The goal is to lock in the existing board/task behavior so regressions are caught early.

# Required context

Read these first:

- `docs/AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/PRODUCT_SPEC.md`
- `docs/MVP_SCOPE.md`
- Existing test setup and test helpers
- Existing task, board, auth, policy, validation, API, and UI files related to DB-028 through DB-039

Relevant roadmap item:

- `DB-040 — Add board and task workflow tests`
- Scope: cover task creation, due-time validation, self-update rules, blocker rules, and review-required transitions.
- Acceptance: the main board and task workflow is protected by automated tests.

# Classification

Test-only work.

Reason: DB-040 should primarily add or improve tests around already-built board and task workflows. Only make small production-code changes if they are necessary testability fixes or if an existing behavior is clearly wrong according to the implemented DB-031 through DB-039 rules.

# Current behavior

The board and task workflow has been implemented across the v0.4.0 tasks:

- Board read API and board page
- Grouping/filtering controls
- Manual task creation API and UI
- Task detail endpoint/read model
- Staff status update endpoint
- Blocker-reason validation
- Approval-required status rules
- Staff-focused task view
- Task comments API and UI

However, the full board/task workflow needs stronger automated test protection.

# Desired behavior

Add tests that verify the core workflow rules:

## Manual task creation

Cover at least:

1. Manager can create a valid manual task with required fields.
2. Task creation requires a title.
3. Task creation requires a due time.
4. Task creation requires an assigned user unless the existing implementation explicitly supports manager-review-needed/unassigned tasks.
5. Staff-created tasks, if supported, are assigned to the creating staff user unless manager behavior explicitly changes assignment.
6. Created tasks appear in the board or task read model using the existing API/read path.

## Due-time validation

Cover at least:

1. Creating a task without `dueAt` or due time fails.
2. Creating a task with malformed due time fails if validation exists.
3. Valid due time persists and is returned by the task/board read model.

## Self-update and permission rules

Cover at least:

1. Staff can update the status of their own assigned task.
2. Staff cannot update another staff member’s assigned task.
3. Staff cannot reassign another user’s task.
4. Manager can update/reassign tasks according to existing manager permissions.
5. Unauthorized or unauthenticated requests are rejected if the project has route/session test helpers.

## Blocker rules

Cover at least:

1. Staff can move their own task to `Blocked` when a blocker reason is provided.
2. Moving a task to `Blocked` without a blocker reason fails.
3. The blocker reason persists and is returned by the task/board read model.
4. Existing status remains unchanged after a failed blocked transition.

## Review-required transitions

Cover at least:

1. A task with `requiresManagerApproval = true` cannot be directly completed by staff.
2. Staff can move a review-required task to `Ready for Review`.
3. Manager can complete a review-required task from `Ready for Review`.
4. Manager can send a `Ready for Review` task back to `In Progress` if that behavior exists.
5. A task with `requiresManagerApproval = false` can be completed directly by the assigned staff member if that is the implemented rule.

## Comments workflow, if existing test helpers make it practical

Because DB-038 and DB-039 were completed before DB-040, include at least one smoke/regression test that verifies:

1. Staff or manager can add a comment to a task they are allowed to access.
2. Comments are returned with the correct task and author context.

Do not expand this into a full activity feed test suite. Event-backed visibility belongs more heavily to DB-041 through DB-049 unless the current implementation already emits events from these actions.

# Test level guidance

Prefer the smallest reliable test layer for each behavior.

Use the project’s existing test stack and patterns. Do not introduce a new test framework unless the current setup cannot cover the required behavior.

Suggested split:

## Unit tests

Use unit tests for pure service, policy, or validation functions, especially:

- status transition validation
- blocker reason validation
- approval-required transition rules
- permission/policy helpers

## Integration tests

Use integration tests for API/server action behavior, especially:

- manual task creation
- due-time validation
- staff self-update rules
- staff cannot mutate another staff member’s task
- blocker validation
- review-required completion flow
- task comments persistence if implemented

## E2E/browser tests

Only add browser-level tests if the project already has a working E2E setup.

If E2E is available, add one high-value smoke test:

- Manager logs in, opens today’s board, creates a manual task, sees it on the board.
- Staff logs in, opens “my tasks” or task detail, updates own task status.
- Staff attempts a blocked status without reason and sees a validation error.
- Staff submits blocker reason successfully or moves review-required task to `Ready for Review`.

Keep browser tests minimal and resilient. Prefer accessible labels/roles over brittle class selectors. Add `data-testid` only when necessary, and keep those additions small.

# Seed/test data requirements

Use existing factories, seed helpers, or test database setup if available.

Create or reuse test fixtures for:

- one manager user
- at least two staff users
- one board day
- one staff-assigned task
- one task assigned to another staff user
- one review-required task
- one non-review-required task

Do not use real customer data, real vehicle data, real passwords, or production-like secrets.

# Constraints

- Keep this task focused on tests.
- Do not redesign the UI.
- Do not change visual layout to match `UI_REFERENCE.png`; this task is not UI polish.
- Do not add new product features.
- Do not rewrite task, board, auth, or validation architecture.
- Do not introduce new dependencies unless absolutely necessary; explain why first.
- Follow existing test patterns, naming conventions, fixtures, and helper utilities.
- Keep business-rule assertions server-side where possible.
- Avoid snapshot tests for complex UI unless the project already uses them intentionally.
- Do not make broad production-code changes to satisfy tests. If implementation appears missing or contradictory, stop and report the gap before changing behavior.
- If a small production-code fix is required because the existing behavior violates DB-031 through DB-039 acceptance criteria, keep the fix minimal and add a regression test.

# Implementation guidance

Before editing:

1. Inspect existing tests and test commands in `package.json`.
2. Identify whether the project uses Vitest, Jest, Playwright, React Testing Library, or another stack.
3. Identify existing test database/reset helpers.
4. Identify the implemented API/server action names for:
   - task creation
   - task status update
   - task detail/read model
   - board read API
   - task comments
5. Identify existing auth/session test helpers for manager and staff users.
6. Write a brief implementation plan before making changes.

Then implement tests in the appropriate locations, likely under:

- `src/tests/unit`
- `src/tests/integration`
- `src/tests/e2e`

or the actual existing test folders if the repository differs.

# Suggested test names

Use names close to these, adjusted to existing conventions:

- `creates a manual task with required fields`
- `rejects manual task creation without a due time`
- `rejects manual task creation without a title`
- `allows staff to update their own assigned task status`
- `rejects staff status updates for another staff member task`
- `requires blocker reason when moving a task to Blocked`
- `preserves previous status after failed blocked transition`
- `moves review-required staff work to Ready for Review before completion`
- `rejects staff direct completion for review-required tasks`
- `allows manager to complete a Ready for Review task`
- `allows assigned staff to complete non-review-required tasks`
- `adds and reads task comments with author context`

# Done when

- Tests cover DB-040’s required workflow areas:
  - task creation
  - due-time validation
  - self-update rules
  - blocker rules
  - review-required transitions
- Relevant tests pass locally.
- Lint/typecheck pass if available.
- Existing tests still pass.
- No unrelated files are changed.
- Any production-code changes are minimal, justified, and directly related to making the tested behavior correct.
- The final summary includes:
  - files changed
  - tests added
  - commands run
  - whether any checks failed or could not be run
  - any behavior gaps found but not changed