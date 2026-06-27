# Task

Implement DB-055 — Add end-to-end tests for daily workflow

# Goal

Add browser-level end-to-end coverage for the main Time Motor Sales Dispatch Board daily workflow.

The tests should prove that the MVP can be used in a real daily flow:

1. Manager logs in.
2. Manager opens today’s board.
3. Manager triggers or verifies daily board generation.
4. Generated tasks appear without duplicates.
5. Staff logs in and updates their own task.
6. Staff adds a comment/update.
7. Staff marks a task as Blocked with a blocker reason.
8. Manager sees the blocked task and related activity.
9. Staff moves an approval-required task to Ready for Review.
10. Manager approves or completes the review-required task.
11. Today’s Activity Feed shows the important workflow events.

# Classification

Test-only work.

This task should primarily add end-to-end tests and test setup. Do not redesign UI, change business rules, or refactor production workflows unless a tiny testability change is required.

# Read first

Read these files before editing:

- `docs/AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/MVP_SCOPE.md`
- `docs/PRODUCT_SPEC.md`
- `docs/SETUP.md` if it exists
- `README.md`
- `package.json`
- Existing test files under `src/tests/`
- Existing auth, board, generation, task, review, and activity files

Also inspect the existing app routes and test setup before choosing where to place the E2E tests.

# Current behavior

The project should already have unit and integration coverage for core services, API validation, permissions, generation, status transitions, review, and visibility from earlier tasks.

However, the main daily workflow is not yet protected by browser-level tests that exercise the app like a real manager or staff member.

# Desired behavior

Add end-to-end tests that run against the app in a browser and cover the main daily workflow.

Prefer the existing browser test framework if one already exists.

If no E2E framework exists, add the smallest practical Playwright setup as a dev dependency and explain why it is needed.

# Scope

## In scope

- E2E test configuration if missing.
- A deterministic E2E test database/setup/reset approach.
- Test helpers for logging in as manager and staff.
- Test helpers for navigating to today’s board, triggering generation, finding task cards, updating status, adding comments, and checking the activity feed.
- Browser-level tests for the daily workflow.
- Minimal accessibility labels or `data-testid` attributes only where selectors would otherwise be brittle.
- Package scripts such as `test:e2e` if missing.
- Setup documentation updates for running E2E tests.

## Out of scope

- Do not redesign UI.
- Do not change the visual layout except for harmless testability/accessibility attributes.
- Do not rewrite auth, task, board, generation, review, or activity services.
- Do not replace existing test frameworks.
- Do not add third-party integrations.
- Do not hide or weaken real failures just to make tests pass.
- Do not make broad production fixes in this test-only issue.

# Implementation guidance

## 1. Inspect first

Before editing, identify:

- Existing test framework and scripts.
- Existing seed/test data strategy.
- Existing seeded manager and staff credentials.
- Existing routes for login, board, task detail, staff task view, review queue, generation, and activity feed.
- Existing stable selectors or accessible labels.
- Any current E2E or integration test helpers that can be reused.

Then implement the smallest test setup that fits the current repository.

## 2. Test framework

Use the existing E2E framework if present.

If no browser-level test framework exists, use Playwright with minimal configuration:

- Add `@playwright/test` as a dev dependency.
- Add `playwright.config.ts`.
- Configure the app base URL from environment variables when possible.
- Configure `webServer` to start the local dev or production preview server if the repo has a reliable command.
- Keep browser matrix minimal at first, likely Chromium only, unless the repo already supports more.

Add scripts such as:

```json
{
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}