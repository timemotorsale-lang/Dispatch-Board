# Task

Implement DB-040 — Add board and task workflow tests

# Goal

Add automated tests that protect the main v0.4.0 board and task workflow.

This is a test-focused task. The goal is not to add new user-facing features. The goal is to confirm that the already-implemented board/task APIs, services, validation rules, and permission rules behave correctly and do not regress.

# Context

Read these files first:

- `docs/AGENTS.md`

- `docs/ARCHITECTURE.md`

- `docs/ROADMAP.md`

- `docs/MVP_SCOPE.md`

- `docs/PRODUCT_SPEC.md`

- Existing test setup and test helpers under `src/tests`, `tests`, or the current project equivalent

- Existing board/task API, service, policy, repository, and validation files

- Existing seed/factory/test database helpers, if present

Roadmap item:

`DB-040 — Add board and task workflow tests`

Roadmap scope:

Cover:

- Task creation

- Due-time validation

- Staff self-update rules

- Blocker rules

- Review-required status transitions

Acceptance criteria:

- The main board and task workflow is protected by automated tests.

# Important assumptions to verify before editing

Before writing tests, inspect the current codebase and identify:

1. The active test runner and test command.

2. Where integration/API tests currently live.

3. How test users, sessions, auth context, and database records are created.

4. Whether task mutations are implemented as API routes, route handlers, server actions, or service functions.

5. Whether DB-031 through DB-039 are already implemented and what exact function/route names they use.

If the implementation uses different route names or function names than the docs, follow the implemented code, but keep the behavior aligned with the docs.

# Test coverage to add

Add focused tests for the board/task workflow. Prefer integration tests around API/server entry points where practical, because the MVP rules must be enforced server-side.

## 1. Manual task creation

Test that a manager can create a manual task with valid required fields.

Cover at minimum:

- Title is required.

- Assigned user is required unless the implemented workflow explicitly supports manager-review-needed unassigned tasks.

- Due time is required.

- Created task is attached to the correct board day.

- Created task has the expected source type, such as `manager` or the existing equivalent.

- Optional vehicle/customer reference fields are preserved if the implementation supports them.

## 2. Due-time validation

Test that task creation fails when due time is missing.

Expected behavior:

- The server rejects the request.

- The response/error is clear and consistent with existing validation patterns.

- No invalid task is persisted.

Also test any existing staff-created task path if it is separate from manager-created tasks.

## 3. Staff self-update rules

Test that staff can update only their own assigned tasks.

Cover:

- A staff user can update the status of a task assigned to them.

- A staff user cannot update another staff member’s task.

- A manager can update or manage tasks according to existing manager policy.

- Rejected updates do not mutate the task.

Use the existing policy helpers or API auth helpers rather than bypassing permissions directly.

## 4. Blocker rules

Test blocker validation around the `Blocked` status.

Cover:

- Moving a task to `Blocked` without a blocker reason fails.

- Moving a task to `Blocked` with a blocker reason succeeds.

- The blocker reason is persisted.

- A rejected blocked transition does not change the task status.

Also cover `Waiting on Parts` and `Waiting on Approval` only if the implemented status update rules treat them specially. Do not invent new rules.

## 5. Review-required transitions

Test the manager approval workflow.

Cover:

- A task with `requiresManagerApproval = true` cannot be directly completed by staff.

- Assigned staff can move an approval-required task to `Ready for Review`.

- A manager can complete a task from `Ready for Review`.

- A manager can send a `Ready for Review` task back to `In Progress` if the implemented endpoint/service supports that path.

- A task with `requiresManagerApproval = false` can be completed directly by assigned staff if that is the implemented rule.

# Optional coverage if cheap and already supported

Add only if existing helpers make it straightforward:

- Board read API returns created/updated tasks with the expected status.

- Task detail API reflects blocker reason and review state.

- Task comments are not broken by status updates.

- Existing activity event assertions, but do not make DB-040 depend on DB-041+ if activity persistence is not implemented yet.

# Constraints

- Keep this task focused on tests.

- Do not redesign the test framework.

- Do not add new dependencies unless absolutely necessary. If a dependency is needed, explain why before adding it.

- Do not rewrite board/task production code just to make tests easier.

- If tests expose a real bug in existing production code, make the smallest possible fix and clearly document it in the final summary.

- Preserve existing tests.

- Reuse existing factories, fixtures, auth helpers, Prisma test setup, and request helpers.

- Keep test data realistic but minimal.

- Do not seed or commit real customer, vehicle, staff, password, or dealership-sensitive data.

- Do not modify unrelated UI styling or board layout files.

- Do not move this task into DB-041+ activity feed work or DB-049 review/recommendation visibility tests.

# Suggested implementation approach

1. Inspect the existing test structure and current workflow implementation.

2. Identify the narrowest level that validates server-side behavior:

   - Prefer API/route-handler integration tests if practical.

   - Use service-level tests only where API tests would be too brittle or the current architecture already tests services directly.

3. Add or extend test helpers only when needed.

4. Create clear test cases grouped by workflow:

   - manual task creation

   - validation

   - staff permissions

   - blocker status

   - approval-required status transitions

5. Run the relevant test command.

6. Run typecheck/lint if available and practical.

# Done when

- Tests cover task creation with valid required fields.

- Tests reject task creation without due time.

- Tests prove staff can update their own tasks but not another staff member’s task.

- Tests reject `Blocked` without a blocker reason.

- Tests allow `Blocked` with a blocker reason and persist the reason.

- Tests prove approval-required tasks must pass through `Ready for Review` before staff completion.

- Tests prove managers can complete or reopen review-required tasks according to the implemented rules.

- Existing tests still pass.

- Relevant test/typecheck/lint commands are run, or any command that could not be run is clearly reported.

- The final response summarizes:

  - Files changed

  - Tests added

  - Bugs found and fixed, if any

  - Commands run

  - Any remaining gaps