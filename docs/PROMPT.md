# Task

<<<<<<< HEAD
DB-056 — Finalize README, setup docs, and release checklist

# Goal

Finalize the project documentation so another developer can clone the Time Motor Sales Dispatch Board repository, understand what the app does, configure the environment, run it locally, run tests/checks, and follow a clear MVP release checklist.

This is primarily a documentation and release-readiness task. Do not change product behavior unless you discover that a documented command is wrong and requires a very small supporting fix.
=======
DB-049 Add review and visibility tests

# Goal

Add automated test coverage for the v0.5.0 review, recommendation, override, and activity visibility workflows so regressions are caught before the MVP moves into reliability and release-readiness work.

This is primarily a test-only task. Do not redesign UI, change schemas, or add new product features unless a small fix is directly required because the existing intended behavior from DB-041 through DB-048 is broken.
>>>>>>> main

# Context

Read these first:

- `docs/AGENTS.md`
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
<<<<<<< HEAD
- `docs/PRODUCT_SPEC.md`
- `docs/MVP_SCOPE.md`
- Existing `README.md`, if present
- Existing `docs/SETUP.md`, if present
- `package.json`
- Prisma config/schema and seed files
- Test config files
- Any existing env example files

Follow the project rules in `docs/AGENTS.md`: keep changes scoped, do not rewrite unrelated files, do not invent completed features, and update docs when setup, architecture, workflow, or commands change. :contentReference[oaicite:1]{index=1}
=======
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
>>>>>>> main

# Required test coverage

<<<<<<< HEAD
The app has reached the end of the MVP reliability/release-readiness roadmap. The remaining work is to make the repo understandable and repeatable for a new developer or reviewer.
=======
Add focused tests at the appropriate level based on the current project structure. Prefer unit tests for pure service logic and integration tests for API/server action behavior.

## 1. Activity event creation tests

Cover that important review and visibility actions create durable `ActivityEvent` records.
>>>>>>> main

Test at least these cases where the implementation supports them:

<<<<<<< HEAD
The repo should include clear, accurate docs for:

1. What the Time Motor Sales Dispatch Board is.
2. MVP scope and core workflows.
3. Local setup.
4. Environment variables.
5. Database setup, migration, and seed steps.
6. How to run the app.
7. How to run lint/typecheck/tests/e2e checks.
8. How to troubleshoot common local setup issues.
9. What is included in the MVP release.
10. What is intentionally deferred after MVP.
11. A practical release checklist for verifying the app before calling the MVP ready.

The release section should align with the guide’s release expectations: build scripts, deployment guide, environment variable docs, and release checklist. :contentReference[oaicite:2]{index=2}

# Files to create or update

Update or create only the docs needed for DB-056, such as:

- `README.md`
- `docs/SETUP.md`
- `docs/RELEASE_CHECKLIST.md` or `docs/RELEASE.md`
- `.env.example`, only if missing or outdated
- Optional: `docs/TROUBLESHOOTING.md` if the setup docs would become too long

Do not create unnecessary docs.

# Documentation requirements

## README.md should include

- Project name and short summary.
- Who the app is for: manager and staff users.
- Core MVP workflows:
  - Daily dispatch board
  - Staff task updates
  - Blocker reasons
  - Manager review
  - Assignment recommendations
  - Activity feed
- Tech stack actually used in the repo.
- Quick start commands.
- Links to deeper docs:
  - `docs/SETUP.md`
  - `docs/ARCHITECTURE.md`
  - `docs/ROADMAP.md`
  - Release checklist doc
- Current MVP status.
- Clear note that this is an internal operational tool, not a DealerCenter/CRM/accounting replacement.

Use the product docs as the source of truth: the app is a responsive internal web app for assigning, recommending, tracking, and managing daily dealership duties. :contentReference[oaicite:3]{index=3}

## docs/SETUP.md should include

- Prerequisites:
  - Node version
  - Package manager used by the repo
  - PostgreSQL requirement
  - Browser requirement if e2e tests exist
- Install steps.
- Environment setup:
  - Copy `.env.example` to `.env`
  - Explain each required variable
  - Never include real secrets
- Database setup:
  - Create local database
  - Run Prisma migration command
  - Run seed command if available
- How to start the dev server.
- Local app URL.
- Default seeded users, only if safe and already present in seed data.
- How to reset local database safely.
- Common troubleshooting:
  - Database connection fails
  - Prisma client not generated
  - Port already in use
  - Tests fail because DB is not migrated
  - E2E browser dependencies missing

## Release checklist doc should include

Create a practical checklist for MVP release verification.

Include sections for:

### 1. Environment readiness

- Required env vars are documented.
- `.env.example` is complete.
- No secrets are committed.
- Local and production database URLs are separated.
- Build environment is clear.

### 2. Database readiness

- Migrations run cleanly.
- Seed data runs safely.
- No real customer data is seeded.
- Prisma client generation works.

### 3. App checks

- App boots locally.
- Login/logout works.
- Manager can open the board.
- Staff can open their task view.
- Manual generation works.
- No obvious loading, empty, or error state gaps in core views.

### 4. Core MVP workflow verification

- Daily board generation does not duplicate tasks.
- Manager can create a task.
- Staff can update their own task.
- Staff cannot update another user’s task.
- Blocked status requires blocker reason.
- Approval-required tasks go through Ready for Review.
- Manager can approve or reopen review tasks.
- Activity feed shows key workflow events.
- Recommendation explanations appear where applicable.

### 5. Test and quality commands

Document the actual commands from `package.json`, such as:

- install
- dev
- build
- lint
- typecheck
- unit tests
- integration tests
- e2e tests

Use the real command names from the repo. Do not invent commands.

### 6. Manual QA checklist

Include browser/viewport checks:

- Mobile staff task experience
- Tablet board layout
- Desktop board/activity feed layout
- Loading states
- Empty states
- Error states
- No horizontal overflow

### 7. Known limitations / deferred scope

List only true deferred MVP items from the product docs and roadmap, including:

- No native mobile app
- No DealerCenter/DMS integration
- No Asana integration
- No Google Workspace integration
- No SMS/email notifications
- No advanced AI/capacity scoring
- No full CRM/accounting/repair-order replacement

The MVP intentionally focuses on the daily dispatch board and broad inventory, advertising, marketing, and sales workflows. :contentReference[oaicite:4]{index=4}

# Constraints

- Keep the change minimal and documentation-focused.
- Do not refactor app code.
- Do not add dependencies.
- Do not rewrite architecture or roadmap direction.
- Do not claim planned features are complete unless the current code supports them.
- Do not include real dealership customer data, real passwords, or secrets.
- Use the actual current repo commands from `package.json`.
- If a command cannot be verified, document that carefully instead of pretending.
- Keep docs practical and readable for a developer setting up the app for the first time.

# Implementation guidance

1. Inspect the repo structure and identify current docs, scripts, env vars, Prisma setup, and test commands.
2. Compare the existing docs against the DB-056 acceptance criteria.
3. Update `README.md` first so it gives a clear high-level project overview.
4. Update or create `docs/SETUP.md` with exact local setup instructions.
5. Create or update a release checklist document.
6. Update `.env.example` only if needed.
7. Review the docs for accuracy against the actual codebase.
8. Run relevant non-destructive checks if possible.

# Done when

- `README.md` clearly explains the app, MVP workflow, tech stack, and quick start.
- `docs/SETUP.md` lets a new developer set up, run, migrate, seed, and test the project.
- A release checklist exists and covers environment, database, core workflow, tests, manual QA, and known limitations.
- Environment variables are documented without exposing secrets.
- Commands match the actual repo scripts.
- Deferred features are clearly marked as deferred, not completed.
- No unrelated code changes are made.
- Relevant checks are run, or any skipped checks are clearly explained.
- Summarize:
  - Files changed
  - Docs added or updated
  - Commands verified
  - Checks run
  - Remaining release risks, if any
=======
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
>>>>>>> main
