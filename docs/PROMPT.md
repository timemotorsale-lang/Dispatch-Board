# Task

DB-053 Add unit tests for core services

# Goal

Expand unit test coverage for the Dispatch Board core server services so service-level regressions are caught before broader workflow, API, or browser-level tests run.

This is a test-only reliability task. Do not add new user-facing behavior.

# Context

Read these files first:

- `docs/AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- Existing test setup and test utilities
- Existing service, policy, validation, and repository files under `src/server`
- Existing unit tests under `src/tests/unit` or the current project test directory

Relevant roadmap intent:

- DB-053 belongs to v0.6.0 Reliability and release readiness.
- Scope: expand unit coverage for policies, generation helpers, and recommendation rules.
- Acceptance: service-level regressions are caught before full workflow tests run.

Core behavior to protect:

- Daily board generation helper logic
- Duplicate-prevention helper behavior
- Manual-task preservation assumptions
- Generation summary/failure helper behavior, if implemented
- Assignment recommendation priority order
- Recommendation reason codes and explanation text
- Manager/staff policy helpers
- Status transition rules
- Approval-required completion rules
- Blocked status requiring blocker reason

# Current behavior

The app already has core services and workflow tests from earlier roadmap items. Some service behavior may already be covered by integration or workflow tests, but DB-053 should add focused unit tests that are faster, narrower, and easier to diagnose.

# Desired behavior

Add focused unit tests for the most important core service units without rewriting the services.

Prioritize tests around:

1. Policy helpers
   - Manager permissions are allowed for manager-only actions.
   - Staff users are denied manager-only actions.
   - Staff users can act on their own assigned tasks where allowed.
   - Staff users cannot mutate another staff member’s task.
   - Permission failures are explicit and consistent with existing project patterns.

2. Status and validation helpers
   - Moving to `Blocked` requires a meaningful blocker reason.
   - Non-blocked status changes do not require blocker reasons.
   - Approval-required tasks cannot be directly completed by staff.
   - Approval-required tasks can move to `Ready for Review`.
   - Managers can complete approval-required tasks when the task is ready for review.
   - No-op or invalid transitions behave according to existing service rules.

3. Generation helpers
   - Custom duties are preferred when a user has direct duties.
   - Role defaults are used when a user has no custom duties.
   - Duplicate generated tasks are skipped.
   - Manual tasks are not overwritten, deleted, or treated as generated duplicates.
   - Generation helper summaries count created/skipped/failure outcomes correctly where those helpers exist.

4. Recommendation rules
   - Direct user duty match wins before role match.
   - Role match wins before template owner or workflow-area fallback.
   - Template owner fallback works when duty/role match is absent.
   - Workflow-area fallback works when higher-priority matches are absent.
   - No clear match returns manager-review-needed output.
   - Recommendation output includes the expected reason code and readable explanation.

# Constraints

- Keep this task test-focused.
- Do not change production behavior unless a new test exposes a clear bug directly related to DB-053.
- If a production fix is needed, keep it minimal and explain the root cause.
- Do not refactor broad service architecture.
- Do not rename public APIs, routes, schema fields, or service exports unless absolutely necessary.
- Do not add new dependencies unless the existing test stack cannot reasonably support the needed tests.
- Prefer existing test utilities, factories, fixtures, and mocks.
- If useful, add small local test helpers/factories inside the test directory.
- Keep tests deterministic; avoid real time, real network, or unnecessary database dependence.
- Unit tests should mock repositories or use in-memory fixtures where practical.
- Do not create brittle tests that depend on incidental wording, except where reason codes or user-facing explanation text are part of the expected contract.
- Preserve all existing tests.

# Implementation guidance

Work in this order:

1. Inspect the current test framework and existing test file naming conventions.
2. Identify the core service/policy/helper modules that already exist.
3. Create a short plan listing the specific unit test files to add or expand.
4. Add focused tests in the existing style.
5. Prefer table-driven tests where they make status transitions or recommendation ordering clearer.
6. Run the relevant unit tests.
7. Run the full test suite if practical.
8. Run typecheck/lint if available.

Suggested test file targets, adjusted to match the actual repo structure:

- `src/tests/unit/policies.test.ts`
- `src/tests/unit/task-status-service.test.ts`
- `src/tests/unit/generation-service.test.ts`
- `src/tests/unit/recommendation-service.test.ts`

Only use these exact filenames if they match the project’s existing conventions. Otherwise follow the existing naming pattern.

# Edge cases to include

Include at least several of these where applicable to the implemented code:

- Empty duties list
- User with multiple roles
- Inactive user ignored by generation/recommendation inputs if that rule exists
- Missing template owner
- Multiple eligible recommendation candidates
- Existing generated task for same board/date/template/user
- Existing manual task for same user/date/title
- Blank blocker reason
- Whitespace-only blocker reason
- Staff attempting manager-only approval
- Manager approving task not ready for review, if the current rules reject that case

# Done when

- DB-053 has meaningful unit coverage for core services, not only superficial import tests.
- Policy, generation helper, status transition, and recommendation behavior are covered where those modules exist.
- Existing tests still pass.
- New tests fail for realistic regressions in service behavior.
- No unrelated UI, API, schema, or styling changes are included.
- Any production-code changes are minimal, directly justified by failing tests, and explained.
- The final Codex summary includes:
  - Files added or changed
  - Test cases added
  - Any bugs discovered
  - Any production fixes made, if any
  - Commands run and results
  - Anything not verified