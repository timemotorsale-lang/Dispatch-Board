# Time Motor Sales Dispatch Board Roadmap

**Last updated:** 2026-06-16  
**Roadmap status:** Documentation-first planning stage  
**Primary goal:** Ship a responsive internal web app that generates a daily dispatch board, lets managers control assignments, and lets staff update their own work quickly.

---

## How to use this roadmap

This file is meant to be both a product roadmap and a GitHub issue/task-card source of truth.

Each task should be small enough for Codex to complete without rewriting large parts of the app. When creating GitHub issues from this file:

1. Create one issue per row in the task tables.
2. Keep each issue scoped to one workflow slice, validation rule, UI surface, or test pass.
3. Require Codex to read `AGENTS.md`, `README.md`, `ARCHITECTURE.md`, `ROADMAP.md`, and the relevant feature files before editing.
4. Ask Codex to make a plan before implementation when the issue touches schema, service, API, and UI together.
5. Require tests or a written reason why tests were not practical.
6. Avoid combining unrelated auth, generation, board UI, settings, and styling work in one issue.

---

## Status legend

- `[x]` Complete or complete enough for the current MVP baseline
- `[~]` Partially complete; needs focused follow-up work
- `[ ]` Not started
- `[blocked]` Blocked by an earlier issue or missing decision
- `[future]` Post-MVP backlog

---

## Recommended current execution order

This repository does not have the app scaffold yet, so the most practical build order is:

1. **Stand up the app foundation** so the repo can boot locally with a database connection and predictable dev workflow.
2. **Add auth, roles, duties, and policy checks** so later workflows have a real permission model.
3. **Build daily generation end to end** so the product's central workflow exists before board polish.
4. **Add the board, task detail, and staff update flows** so the system becomes usable by real people.
5. **Add activity, recommendations, and review controls** so managers can trust and oversee the workflow.
6. **Harden responsiveness, tests, and setup docs** so the MVP is stable enough for real daily use.

---

# Phase 1 - Dispatch Board MVP

## v0.1.0 - Project foundation

**Goal:** Establish the web app scaffold, database baseline, repository structure, and local development workflow.

**Exit criteria:** The app boots locally, the database connects, migrations run, and the repo has a durable starting structure for feature work.


| ID      | Status | GitHub issue / task card                     | Codex-sized scope                                                                 | Acceptance criteria                                                                    |
| ------- | ------ | -------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| DB-001  | [ ]    | Initialize Next.js + TypeScript app          | Create the base app scaffold, package manifest, and initial scripts.              | The project starts locally and renders a minimal page.                                 |
| DB-002  | [ ]    | Create repository and source folder layout   | Add `src/app`, `src/components`, `src/features`, `src/server`, `src/tests`, and `prisma`. | The repo matches the target layout from `ARCHITECTURE.md`.                             |
| DB-003  | [ ]    | Add PostgreSQL and Prisma baseline           | Configure Prisma, database connection env vars, and initial schema wiring.        | Prisma can connect to PostgreSQL from local development.                               |
| DB-004  | [ ]    | Add first migration and seed entrypoints     | Create the initial migration workflow and seed command wiring.                    | A fresh local database can migrate and run seeds without manual DB edits.              |
| DB-005  | [ ]    | Add shared app shell and route groups        | Create the root layout, route groups, and protected-app placeholder shell.        | The app has a stable shell for login and authenticated routes.                         |
| DB-006  | [ ]    | Add baseline lint, typecheck, and test setup | Configure core quality commands and a minimal example test path.                  | Developers can run lint, typecheck, and at least one baseline test command.            |
| DB-007  | [ ]    | Write setup and environment docs             | Add `docs/SETUP.md`, env guidance, and local run steps.                           | A new developer can set up and launch the project from the documentation alone.        |


---

## v0.2.0 - Identity, roles, and permissions

**Goal:** Implement login, user modeling, roles, duties, and server-side permission rules that all later workflows depend on.

**Exit criteria:** Managers and staff can log in, protected routes work, and the server enforces the MVP permission model.


| ID      | Status | GitHub issue / task card                     | Codex-sized scope                                                                 | Acceptance criteria                                                                    |
| ------- | ------ | -------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| DB-008  | [ ]    | Add user and session schema                  | Create the core user model and session-related persistence needed by the auth approach. | User records and session support exist in the schema with migrations.                  |
| DB-009  | [ ]    | Implement login and logout endpoints         | Add auth routes or server actions for sign-in and sign-out.                       | A valid seeded user can log in and log out successfully.                               |
| DB-010  | [ ]    | Build login page and auth form flow          | Create the login UI, submission handling, and user-facing auth errors.            | Users can sign in from the UI and see clear failure messages for bad credentials.      |
| DB-011  | [ ]    | Add session-aware route protection           | Protect authenticated routes and redirect unauthenticated users cleanly.          | Private app routes are not accessible without an active session.                       |
| DB-012  | [ ]    | Add roles schema and seed data               | Create the core role model and initial role seed records.                         | Day-one roles from the architecture exist in local seed data.                          |
| DB-013  | [ ]    | Add duties and user-role assignments         | Model duties, `UserRole`, and `UserDuty`, then seed realistic manager/staff assignments. | Users can have multiple roles and direct duties in the database.                       |
| DB-014  | [ ]    | Implement server-side policy helpers         | Add reusable permission checks for manager-only and self-service staff actions.   | Permission rules live server-side and can be reused by APIs and services.              |
| DB-015  | [ ]    | Add auth and permission tests                | Cover login basics, route protection, and core manager/staff permission rules.    | Tests fail if auth or policy behavior regresses.                                       |


---

## v0.3.0 - Daily generation core

**Goal:** Build the data model and services that generate one safe, idempotent board per business day.

**Exit criteria:** A manager can generate a board for a date, generation can be retried without duplicates, and generation runs are recorded clearly.


| ID      | Status | GitHub issue / task card                        | Codex-sized scope                                                                   | Acceptance criteria                                                                    |
| ------- | ------ | ----------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| DB-016  | [x]    | Add app settings schema and storage             | Create the settings model for daily generation time, timezone, and business days.   | Generation settings are stored in the database and available to server code.           |
| DB-017  | [x]    | Add settings API and manager edit flow          | Expose settings read/update behavior with manager-only protection.                   | Managers can view and update generation settings safely.                               |
| DB-018  | [x]    | Add task template schema                        | Create the task template model and migration with required workflow fields.          | Templates can represent role-based and duty-based daily work.                          |
| DB-019  | [ ]    | Add task template CRUD                          | Build server-side create/list/update flows for task templates.                       | Managers can manage active task templates without direct database edits.               |
| DB-020  | [ ]    | Add board, task, and generation-run schema      | Create `BoardDay`, `Task`, and `GenerationRun` models with core relations.           | The schema can represent one board per date, generated tasks, and generation attempts. |
| DB-021  | [ ]    | Add task constraints and indexes                | Implement unique board date, duplicate-prevention constraints, and key indexes.      | The database protects against duplicate generated tasks and supports common queries.    |
| DB-022  | [ ]    | Build generation input loading logic            | Load active users, custom duties, role defaults, and active templates for a date.    | The service can determine what work should be considered during generation.            |
| DB-023  | [ ]    | Build idempotent task creation flow             | Create only missing generated tasks while preserving manual tasks and retry safety.   | Re-running generation for the same date does not duplicate generated tasks.            |
| DB-024  | [ ]    | Record generation runs and failure outcomes     | Persist started/completed/failed generation runs with summaries and error messages.   | Managers can inspect whether a generation attempt succeeded or failed.                 |
| DB-025  | [x]    | Add manual generation trigger and UI feedback   | Expose manager-only generation controls and success/failure status in the app.        | A manager can trigger generation from the UI and see the result clearly.               |
| DB-026  | [ ]    | Add scheduled generation entrypoint             | Create the cron or scheduled entrypoint that calls the same idempotent generation flow. | Scheduled generation uses the same safe logic as manual generation.                    |
| DB-027  | [ ]    | Add generation service tests                    | Cover custom duties, role defaults, duplicate prevention, manual-task preservation, and failure recording. | Tests fail if the core generation workflow regresses.                                  |


---

## v0.4.0 - Board and task workflow

**Goal:** Make the dispatch board usable for managers and staff during the normal workday.

**Exit criteria:** Managers can see the board and create work, staff can see and update their own tasks, and required validation rules are enforced.


| ID      | Status | GitHub issue / task card                        | Codex-sized scope                                                                 | Acceptance criteria                                                                    |
| ------- | ------ | ----------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| DB-028  | [ ]    | Add board read API                              | Build board endpoints for today's board and date-based board retrieval.          | The app can request board data for today or a specific date.                           |
| DB-029  | [ ]    | Build initial board page                        | Create the main board screen using real board data.                              | A manager or staff user can open the board and see generated tasks.                    |
| DB-030  | [ ]    | Add board grouping and filtering controls       | Support grouping by assigned user, status, and workflow area.                    | The board can switch between the planned grouping modes without losing task visibility. |
| DB-031  | [ ]    | Add manual task creation API                    | Implement task creation with due-time and assignment validation.                 | Manual tasks cannot be created without the required fields.                            |
| DB-032  | [ ]    | Add manual task creation UI                     | Build manager-facing task creation controls on the board or task surface.        | Managers can create manual tasks from the app without direct API calls.                |
| DB-033  | [ ]    | Add task detail endpoint and read model         | Expose a single-task detail read path with all fields needed by task detail UI.  | The app can load an individual task view reliably.                                     |
| DB-034  | [ ]    | Add staff status update endpoint                | Let staff update their own assigned task status through validated server actions. | Staff can update only their own tasks and only through allowed transitions.            |
| DB-035  | [ ]    | Enforce blocker-reason validation               | Require a blocker reason whenever a task moves to `Blocked`.                     | The server rejects blocked transitions that do not include a reason.                   |
| DB-036  | [ ]    | Enforce approval-required status rules          | Implement `Ready for Review` and approval-only completion rules.                 | Approval-required tasks cannot be directly completed by staff.                         |
| DB-037  | [ ]    | Build staff-focused task view                   | Create a streamlined "my tasks" experience optimized for daily staff updates.    | Staff can quickly find, open, and update their own tasks.                              |
| DB-038  | [ ]    | Add task comments API                           | Implement comment creation and retrieval for task updates.                       | Task comments persist and are attached to the correct task and author.                 |
| DB-039  | [ ]    | Add task comments UI                            | Surface task comments in the task detail view with basic author and timestamp context. | Staff and managers can read and add task comments from the app.                        |
| DB-040  | [ ]    | Add board and task workflow tests               | Cover task creation, due-time validation, self-update rules, blocker rules, and review-required transitions. | The main board and task workflow is protected by automated tests.                      |


---

## v0.5.0 - Review, recommendations, and visibility

**Goal:** Add event-backed visibility and manager oversight so the dispatch board is trustworthy as a team coordination tool.

**Exit criteria:** Important changes create activity events, managers can see what changed, and recommendation plus review flows work as designed.


| ID      | Status | GitHub issue / task card                          | Codex-sized scope                                                                 | Acceptance criteria                                                                    |
| ------- | ------ | ------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| DB-041  | [ ]    | Add activity event schema and persistence         | Create the activity event model and persistence helpers.                          | The database can store system and user-generated board events.                         |
| DB-042  | [ ]    | Emit events for generation and task lifecycle     | Write activity events during generation, assignment, status, due-time, and comment operations. | Important workflow changes create durable activity events.                             |
| DB-043  | [ ]    | Add activity feed API                             | Expose date-based activity feed retrieval for the board.                          | The app can load activity events for a selected board date.                            |
| DB-044  | [ ]    | Build activity feed UI                            | Create the activity feed surface with clear actor, event, and time context.       | Users can see what changed today and who changed it.                                   |
| DB-045  | [ ]    | Implement recommendation matching rules           | Add direct-duty, role, template, and workflow-area recommendation order.          | The service returns the expected recommended user and reason path.                     |
| DB-046  | [ ]    | Persist recommendation reason codes and text      | Store explanation data alongside recommendation output for later UI display.       | Recommendation results include a human-readable explanation.                           |
| DB-047  | [ ]    | Add manager reassignment and override endpoint    | Let managers accept or override recommendations and reassign tasks safely.         | Managers can change assignments without bypassing server-side rules.                   |
| DB-048  | [ ]    | Add review queue and approval UI                  | Surface `Ready for Review` tasks and allow managers to approve or reopen them.     | Managers can complete or return review-required tasks from the UI.                     |
| DB-049  | [ ]    | Add review and visibility tests                   | Cover event creation, recommendation order, override flow, and manager approval behavior. | Review and visibility workflows are protected by automated tests.                      |


---

## v0.6.0 - Reliability and release readiness

**Goal:** Harden the MVP for regular daily use on desktop, tablet, and mobile while finishing the docs needed for repeatable development.

**Exit criteria:** Core workflows are reliable across common screen sizes, key failures are visible, and another developer can set up and contribute with minimal handholding.


| ID      | Status | GitHub issue / task card                       | Codex-sized scope                                                                 | Acceptance criteria                                                                    |
| ------- | ------ | ---------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| DB-050  | [ ]    | Improve mobile staff task experience           | Refine the mobile task view for fast reading, status changes, and comments.       | Staff can update tasks comfortably from a phone-sized viewport.                        |
| DB-051  | [ ]    | Improve tablet and desktop board layout        | Tighten board spacing, grouping controls, and feed visibility for larger screens. | The board remains usable and readable on tablet and desktop layouts.                   |
| DB-052  | [ ]    | Add loading, empty, and error states           | Cover core board, task, generation, and activity surfaces with honest UI states.  | Users can tell when the app is loading, empty, or failing instead of seeing broken UI. |
| DB-053  | [ ]    | Add unit tests for core services               | Expand unit coverage for policies, generation helpers, and recommendation rules.  | Service-level regressions are caught before full workflow tests run.                   |
| DB-054  | [ ]    | Add integration tests for API and validation   | Cover route-level auth, validation, and common mutation failures.                 | API behavior stays consistent under expected failure cases.                            |
| DB-055  | [ ]    | Add end-to-end tests for daily workflow        | Test login, generation, task updates, blockers, review, and activity visibility.  | The main daily workflow passes in browser-level testing.                               |
| DB-056  | [ ]    | Finalize README, setup docs, and release checklist | Finish project docs, local commands, environment guidance, and MVP release steps. | Another developer can set up, run, test, and understand the app from the docs.        |


---

## Post-MVP backlog

These items are intentionally out of scope until the MVP works reliably:

- `[future]` DealerCenter or other DMS integrations
- `[future]` CRM or lead-source integrations
- `[future]` Google Workspace integrations
- `[future]` Email or SMS notifications
- `[future]` Advanced capacity balancing or AI-only assignment
- `[future]` Advanced reporting and analytics
- `[future]` Deeper collections workflow specialization
- `[future]` Deep compliance or documentation subsystems
- `[future]` Native mobile app

---

## Definition of done for any issue

An issue is not done until:

- The implementation is scoped to the issue and avoids broad rewrites.
- Relevant tests, typechecks, and linting are run, or skipped with a clear reason.
- UI states include loading, empty, and error behavior where applicable.
- Server-side changes include tests for important behavior and edge cases.
- Docs are updated when setup, architecture, commands, or workflow behavior changes.
- No placeholder or dummy behavior remains in a production-facing flow unless it is clearly marked.
- The change can be reviewed as a small, understandable diff.
