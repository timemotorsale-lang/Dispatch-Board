# Task

DB-049 Add review and visibility tests

# Goal

Add automated test coverage for the v0.5.0 review, recommendation, override, and activity visibility workflows so regressions are caught before the MVP moves into reliability and release-readiness work.

This is primarily a test-only task. Do not redesign UI, change schemas, or add new product features unless a small fix is directly required because the existing intended behavior from DB-041 through DB-048 is broken.

# Context

Read these first:

- `docs/AGENTS.md`
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- `docs/MVP_SCOPE.md`
- Existing test setup and test helpers
- Existing implementation files for:
  - activity events
  - activity feed API/read model
  - recommendation matching
  - recommendation reason persistence
  - manager reassignment / override endpoint
  - review queue / approval workflow
  - task status transitions
  - permission policies

Roadmap context:

- DB-041 added activity event schema and persistence.
- DB-042 emitted events for generation and task lifecycle.
- DB-043 added activity feed API.
- DB-044 added activity feed UI.
- DB-045 implemented recommendation matching rules.
- DB-046 persisted recommendation reason codes and text.
- DB-047 added manager reassignment and override endpoint.
- DB-048 added review queue and approval UI.
- DB-049 must now protect those workflows with automated tests.

# Classification

Test-only work.

Reason: this task should add regression coverage for already implemented review and visibility behavior, not expand the feature set.

# Required test coverage

Add focused tests at the appropriate level based on the current project structure. Prefer unit tests for pure service logic and integration tests for API/server action behavior.

## 1. Activity event creation tests

Cover that important review and visibility actions create durable `ActivityEvent` records.

Test at least these cases where the implementation supports them:

- Task status changes create activity events.
- Moving a task to `Ready for Review` creates an activity event.
- Manager approval/completion creates an activity event.
- Manager reopening or returning a review task to `In Progress` creates an activity event.
- Assignment recommendation creation or persistence creates an activity event if that is part of the implemented behavior.
- Manager assignment override/reassignment creates an activity event.
- Comment/update creation creates an activity event if already implemented from DB-038 through DB-042.
- Activity events are tied to the correct `boardDayId`, `taskId`, actor, event type, and useful metadata/message.

## 2. Recommendation order tests

Cover the recommendation priority order from the project docs:

1. Direct user duty match
2. Role match
3. Task template owner
4. Workflow-area match
5. Manager review needed if no clear match exists

Tests should verify:

- A direct duty match beats a role match.
- A role match beats template owner or workflow-area fallback.
- Template owner is used when duty/role match is unavailable.
- Workflow-area fallback is used only after stronger matches fail.
- No eligible match returns a manager-review-needed result.
- Recommendation output includes the persisted reason code and a short human-readable explanation.

## 3. Manager override / reassignment tests

Cover the manager reassignment and override workflow from DB-047.

Test at least:

- Manager can accept a recommendation and assign the recommended user.
- Manager can override the recommended user with another valid staff member.
- Override persists the assigned user separately from the recommended user/reason when the model supports both.
- Override creates the correct activity event.
- Staff users cannot reassign or override another user’s task.
- Invalid assignee IDs or inactive users are rejected consistently.
- Existing task fields unrelated to assignment are preserved.

## 4. Manager approval behavior tests

Cover the review-required workflow from DB-036 and DB-048.

Test at least:

- Staff cannot directly complete a task that requires manager approval.
- Staff can move their own approval-required task to `Ready for Review`.
- Manager can complete a `Ready for Review` task.
- Manager can return/reopen a `Ready for Review` task to `In Progress`.
- Approval completion records `completedAt` and `reviewedByUserId` where those fields exist.
- Approval/reopen actions create activity events.
- Staff cannot approve someone else’s review-required task.
- A non-review-required task can still be completed through the existing allowed path.

## 5. Activity feed visibility tests

Cover the date-based visibility/read path from DB-043 and DB-044 if the API/read model exists.

Test at least:

- Activity feed returns events for the selected board date.
- Activity feed does not leak events from another board date.
- Events include enough display context for actor, task, event type/message, and timestamp.
- Ordering is deterministic, preferably newest-first if that is the implemented behavior.
- Manager can view the full activity feed.
- Staff can view the full activity feed if current MVP permissions allow full-board transparency.
- Unauthorized users cannot access the feed.

# Constraints

- Keep the change focused on tests and small direct fixes only.
- Do not add broad refactors.
- Do not change the schema unless the current implementation is missing something required by already-completed DB-041 through DB-048; if schema changes appear necessary, stop and explain before implementing.
- Do not introduce new dependencies unless the existing test stack cannot reasonably cover the behavior.
- Reuse existing seed/test factories/helpers instead of creating duplicate setup patterns.
- Keep business-rule assertions server-side. Do not only test UI hiding.
- Preserve existing tests.
- Do not change visual design or layout.
- Do not implement DB-050 or later reliability/polish work.
- If a required behavior is not implemented yet, add a clearly named skipped or pending test only if the project’s test conventions already allow that; otherwise report the gap instead of pretending it is covered.

# Implementation guidance

1. Inspect the current test framework and scripts in `package.json`.
2. Identify existing test helpers, database setup, seed/factory utilities, and auth/session mocking patterns.
3. Add the smallest useful test files, likely under one or more of:
   - `src/tests/unit/`
   - `src/tests/integration/`
   - `src/server/**/__tests__/`
   - existing project-specific test folders
4. Prefer service-level tests for:
   - recommendation priority order
   - activity event logging helpers
   - approval status transition rules
5. Prefer integration tests for:
   - manager override/reassignment endpoint or server action
   - manager approval/reopen endpoint or server action
   - activity feed API/read model
   - permission enforcement
6. Use realistic but minimal fixtures:
   - one manager
   - two or three staff users
   - at least one duty
   - at least one role
   - one board day
   - one approval-required task
   - one non-approval-required task
   - one task with a recommendation
7. Make test names business-readable, for example:
   - `recommends direct duty match before role match`
   - `staff cannot complete approval-required task directly`
   - `manager override creates assignment changed activity event`
   - `activity feed is scoped to selected board date`

# Done when

- Tests cover event creation, recommendation order, override flow, and manager approval behavior.
- Permission-sensitive paths are tested for both allowed and rejected users.
- Activity feed visibility is tested by board date and authorization.
- Relevant existing tests still pass.
- Typecheck and lint pass if available.
- Any small behavior fixes required by the new tests are scoped, explained, and directly related to DB-049.
- No unrelated UI, schema, dependency, or architecture changes are included.
- The final response summarizes:
  - test files added or changed
  - behaviors covered
  - any bugs found and fixed
  - commands run
  - any checks that could not be run and why