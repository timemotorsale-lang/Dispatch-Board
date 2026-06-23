# Task

DB-054 Add integration tests for API and validation

# Goal

Add integration tests that exercise API/server-action behavior at the route or request boundary, focusing on authentication, authorization, validation, and common mutation failure cases.

This task should harden the existing API behavior without changing production behavior unless a test reveals a clear bug that must be fixed minimally.

# Context

Read these first:

- `docs/AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/PRODUCT_SPEC.md`
- `docs/MVP_SCOPE.md`
- Existing integration test setup under `src/tests/integration` if present
- Existing API route/server-action files under `src/app/api`, `src/server`, and related feature folders
- Existing unit tests from DB-053, especially policy, task status, generation, and recommendation tests

Relevant roadmap item:

- `DB-054 Add integration tests for API and validation`
- Scope: cover route-level auth, validation, and common mutation failures.
- Acceptance: API behavior stays consistent under expected failure cases.

Relevant architecture expectations:

- Validate all API input server-side.
- Require due time for created tasks.
- Require blocker reason when moving a task to `Blocked`.
- Return permission errors consistently.
- Staff can update their own assigned tasks but cannot mutate another staff member’s task.
- Only managers can reassign tasks, override recommendations, and complete approval-required tasks.
- Important task changes should create activity events.

# Current behavior

The project already has unit-level coverage for core services from DB-053.

However, unit tests alone do not prove that the actual API/request boundaries enforce the same rules. DB-054 should verify that callers cannot bypass validation or permissions by hitting the API layer directly.

# Desired behavior

Add focused integration tests for the existing API/server-action boundaries. Prefer testing through the same request helpers, route handlers, or server action entrypoints that the app uses in production.

Cover the most important failure and success paths that prove API behavior is stable:

1. Auth / route-level access
   - Unauthenticated requests to protected mutation endpoints are rejected.
   - Staff requests to manager-only endpoints are rejected.
   - Manager requests to manager-only endpoints succeed when input is valid.

2. Manual task creation validation
   - Creating a manual task with valid required fields succeeds.
   - Creating a manual task without a due time is rejected.
   - Creating a manual task without a title is rejected.
   - Staff-created tasks cannot assign work to someone else unless existing production rules explicitly allow it.

3. Status update validation
   - Staff can update their own assigned task through the API.
   - Staff cannot update another staff member’s task.
   - Moving a task to `Blocked` without a meaningful blocker reason is rejected.
   - Moving a task to `Blocked` with a meaningful blocker reason succeeds.
   - Approval-required tasks cannot be completed directly by staff.
   - Approval-required tasks can move to `Ready for Review` through the expected path.

4. Manager review and assignment mutations
   - Manager can reassign a task or override a recommendation through the API.
   - Staff cannot reassign tasks or override recommendations.
   - Manager can complete a review-required task from `Ready for Review`.
   - Invalid review transitions return a clear error.

5. Comments and activity, if the endpoints already exist
   - Adding a valid task comment persists the comment.
   - Empty or blank comments are rejected.
   - Successful mutations that are expected to emit activity events actually create activity records.
   - Failed validation/permission requests should not create activity events.

6. Board/generation/activity read endpoints, if practical with existing helpers
   - Board read endpoint rejects unauthenticated access if protected by the app.
   - Activity feed endpoint validates date input if date filtering exists.
   - Manual generation endpoint requires manager permission.

# Constraints

- Keep this as a test-focused task.
- Do not redesign API routes, auth, services, validation, policies, or database schema.
- Do not rewrite existing unit tests from DB-053.
- Do not add new dependencies unless the current test setup cannot reasonably exercise route handlers; explain the need before adding anything.
- Prefer existing test utilities, factories, seeded users, Prisma test setup, and helper patterns.
- Keep test data isolated and deterministic.
- Clean up test data between tests using the project’s existing pattern.
- Use stable dates and explicit test users so tests do not depend on the current day unless the existing helper requires it.
- Assert response status/error shape consistently with existing API conventions.
- Avoid brittle assertions on full response payloads when only status/error behavior matters.
- Do not weaken validation or permission checks just to make tests pass.
- If a production bug is discovered, make the smallest possible fix and add the regression test that proves it.

# Implementation guidance

Before editing, inspect the current test infrastructure and answer these questions in your own plan:

1. What integration test pattern already exists?
2. Are API routes tested through `Request`/route handlers, server actions, or service wrappers?
3. How are authenticated manager and staff users simulated?
4. How is the test database seeded or reset?
5. Which endpoints already exist and which ones should not be tested yet because they are not implemented?

Then implement the smallest useful integration suite.

Suggested file locations, adjusted to match the actual repo:

- `src/tests/integration/auth-api.test.ts`
- `src/tests/integration/tasks-api.test.ts`
- `src/tests/integration/task-status-api.test.ts`
- `src/tests/integration/manager-actions-api.test.ts`
- `src/tests/integration/activity-api.test.ts`

Use fewer files if the existing project style prefers one integration file per workflow.

Prefer these test groups:

## Task creation API

- rejects unauthenticated create task request
- allows manager to create task with title, assignment, due time, and workflow area
- rejects missing title
- rejects missing due time
- rejects staff-created task assigned to another user, if that is currently prohibited by production rules

## Task status API

- rejects unauthenticated status update
- allows staff to update own task to `In Progress`
- rejects staff updating another user’s task
- rejects `Blocked` without blocker reason
- accepts `Blocked` with blocker reason
- rejects staff direct completion of approval-required task
- accepts `Ready for Review` for approval-required task

## Manager actions API

- rejects staff reassignment/override request
- allows manager reassignment/override request
- allows manager completion of `Ready for Review` approval-required task
- rejects invalid manager transition if applicable

## Comments/activity API

- rejects blank comment
- persists valid comment
- creates activity event for successful comment or status change
- does not create activity event when validation fails

# Done when

- DB-054 integration tests are added under the existing test structure.
- Tests exercise API/request boundaries, not just isolated service functions.
- Tests cover route-level auth, validation failures, permission failures, and important successful mutations.
- Existing DB-053 unit tests still pass.
- The relevant integration test command passes.
- Typecheck and lint pass if available.
- No unrelated production behavior is changed.
- Any necessary minimal production fix is explained clearly.
- Summarize:
  - Files changed
  - Integration scenarios added
  - Production fixes, if any
  - Commands run
  - Any endpoints intentionally skipped because they are not implemented yet