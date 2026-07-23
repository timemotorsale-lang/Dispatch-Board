# Time Motor Sales Dispatch Board Roadmap

**Last updated:** 2026-07-10
**Roadmap status:** Dispatch Board foundation implemented; Enterprise Appointment E1 in progress; Enterprise Tasks and Customers Module directions refined
**Primary goal:** Preserve and harden the working Dispatch Board while delivering approved Appointment, Tasks, and Customers module paths through reviewable vertical slices.

> **Enterprise optimization program:** The cross-console governing rules and adoption sequence live in [`docs/enterprise-optimization/README.md`](enterprise-optimization/README.md) and its [`implementation roadmap`](enterprise-optimization/IMPLEMENTATION_ROADMAP.md). This program begins with shared vocabulary, evidence, deterministic recommendations, simulation, and shadow-mode validation. It does not authorize universal scoring weights or autonomous decisions; those require separate policy approval and measured validation.

> **Enterprise Appointment Program:** The Appointment Command Center has an approved Enterprise Release 1.0 planning package in [`docs/appointments/README.md`](appointments/README.md). That package supersedes MVP-level appointment assumptions in this roadmap for the Appointment feature only. It remains planned work until its implementation milestones are completed.

> **Projects Module planning package:** The Projects Hub and Project Workspace roadmap now has a dedicated module guide in [`docs/projects/PROJECTS_MODULE_GUIDE.md`](projects/PROJECTS_MODULE_GUIDE.md). Use that document for project-module scope, boundaries, milestone IDs, and implementation guardrails so Projects work does not drift into a full Dispatch Board rewrite.

> **Enterprise Tasks Module planning package:** The integrated Tasks-module boundary, tier strategy, and milestone plan now live in [`docs/ENTERPRISE_TASKS_MODULE.md`](ENTERPRISE_TASKS_MODULE.md). Use that document when planning `/tasks`, task-console, queue, review, and commercial-readiness work so Tasks stays inside the parent Dispatch Board architecture.

> **Customers Console planning package:** The Customers architecture, MVP rollout roadmap, and Codex-sized milestones now live in [`docs/customers/README.md`](customers/README.md). Use that package for `/customers`, Customer 360, customer memory, lead follow-up, case/SLA, relationship bridges, manager intelligence, governance, and rollout work.

> **Staff Execution and Handoff planning package:** DB-ACCOUNTABILITY-059 architecture and its six feature-flagged implementation milestones live in [`docs/STAFF_EXECUTION_HANDOFF_ENGINE.md`](STAFF_EXECUTION_HANDOFF_ENGINE.md) and [`docs/STAFF_EXECUTION_HANDOFF_ROADMAP.md`](STAFF_EXECUTION_HANDOFF_ROADMAP.md). Use these documents for daily role checklists, Start Day, completion evidence, available-work matching, end-of-day handoff, carryover, and Team Execution Health.

> **CCC Enterprise Workflow Launcher planning package:** The official launcher architecture, enterprise workflow-family catalog, and gated milestone sequence live in [`docs/CCC_ENTERPRISE_WORKFLOW_LAUNCHER_SOURCE_OF_TRUTH.md`](CCC_ENTERPRISE_WORKFLOW_LAUNCHER_SOURCE_OF_TRUTH.md). Use it for Start Workflow, Cards/List presentation, search, context, registry, permissions, drafts, receipts, and cross-console workflow onboarding. Catalog presence is not proof of implementation.

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

The original Phase 1 checklist below records the Dispatch Board build plan. The dated implementation truth is maintained in [`docs/CURRENT_IMPLEMENTATION_STATUS.md`](CURRENT_IMPLEMENTATION_STATUS.md).

Current execution order:

1. **Complete Enterprise Appointment E1 architecture and domain contracts.**
2. **Implement organization, location, appointment, resource, configuration, permission, audit, and migration foundations.**
3. **Build scheduling and capacity services before calendar polish.**
4. **Add lifecycle, task orchestration, automation, and event-backed history.**
5. **Build command-center, creation, administration, owner, and responsive workflows.**
6. **Complete notifications, analytics, hardening, pilot, and production rollout through E10.**

The Enterprise Tasks Module roadmap below is the parallel planning package for evolving the existing task foundation without turning Tasks into a separate product.

The Customers Console planning package is the parallel path for converting the approved mockup-aligned customer UI into a durable customer operating module. Its first implementation milestone is trusted customer identity, ownership, contact points, validation, and policy enforcement; dashboard analytics and advanced intelligence must not be treated as authoritative before their read models land.

---

# Phase 1 - Dispatch Board MVP

## v0.1.0 - Project foundation

**Goal:** Establish the web app scaffold, database baseline, repository structure, and local development workflow.

**Exit criteria:** The app boots locally, the database connects, migrations run, and the repo has a durable starting structure for feature work.


| ID     | Status | GitHub issue / task card                     | Codex-sized scope                                                                         | Acceptance criteria                                                             |
| ------ | ------ | -------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| DB-001 | [ ]    | Initialize Next.js + TypeScript app          | Create the base app scaffold, package manifest, and initial scripts.                      | The project starts locally and renders a minimal page.                          |
| DB-002 | [ ]    | Create repository and source folder layout   | Add `src/app`, `src/components`, `src/features`, `src/server`, `src/tests`, and `prisma`. | The repo matches the target layout from `ARCHITECTURE.md`.                      |
| DB-003 | [ ]    | Add PostgreSQL and Prisma baseline           | Configure Prisma, database connection env vars, and initial schema wiring.                | Prisma can connect to PostgreSQL from local development.                        |
| DB-004 | [ ]    | Add first migration and seed entrypoints     | Create the initial migration workflow and seed command wiring.                            | A fresh local database can migrate and run seeds without manual DB edits.       |
| DB-005 | [ ]    | Add shared app shell and route groups        | Create the root layout, route groups, and protected-app placeholder shell.                | The app has a stable shell for login and authenticated routes.                  |
| DB-006 | [ ]    | Add baseline lint, typecheck, and test setup | Configure core quality commands and a minimal example test path.                          | Developers can run lint, typecheck, and at least one baseline test command.     |
| DB-007 | [ ]    | Write setup and environment docs             | Add `docs/SETUP.md`, env guidance, and local run steps.                                   | A new developer can set up and launch the project from the documentation alone. |


---

## v0.2.0 - Identity, roles, and permissions

**Goal:** Implement login, user modeling, roles, duties, and server-side permission rules that all later workflows depend on.

**Exit criteria:** Managers and staff can log in, protected routes work, and the server enforces the MVP permission model.


| ID     | Status | GitHub issue / task card             | Codex-sized scope                                                                        | Acceptance criteria                                                               |
| ------ | ------ | ------------------------------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| DB-008 | [ ]    | Add user and session schema          | Create the core user model and session-related persistence needed by the auth approach.  | User records and session support exist in the schema with migrations.             |
| DB-009 | [ ]    | Implement login and logout endpoints | Add auth routes or server actions for sign-in and sign-out.                              | A valid seeded user can log in and log out successfully.                          |
| DB-010 | [ ]    | Build login page and auth form flow  | Create the login UI, submission handling, and user-facing auth errors.                   | Users can sign in from the UI and see clear failure messages for bad credentials. |
| DB-011 | [ ]    | Add session-aware route protection   | Protect authenticated routes and redirect unauthenticated users cleanly.                 | Private app routes are not accessible without an active session.                  |
| DB-012 | [ ]    | Add roles schema and seed data       | Create the core role model and initial role seed records.                                | Day-one roles from the architecture exist in local seed data.                     |
| DB-013 | [ ]    | Add duties and user-role assignments | Model duties, `UserRole`, and `UserDuty`, then seed realistic manager/staff assignments. | Users can have multiple roles and direct duties in the database.                  |
| DB-014 | [ ]    | Implement server-side policy helpers | Add reusable permission checks for manager-only and self-service staff actions.          | Permission rules live server-side and can be reused by APIs and services.         |
| DB-015 | [ ]    | Add auth and permission tests        | Cover login basics, route protection, and core manager/staff permission rules.           | Tests fail if auth or policy behavior regresses.                                  |


---

## v0.3.0 - Daily generation core

**Goal:** Build the data model and services that generate one safe, idempotent board per business day.

**Exit criteria:** A manager can generate a board for a date, generation can be retried without duplicates, and generation runs are recorded clearly.


| ID     | Status | GitHub issue / task card                      | Codex-sized scope                                                                                          | Acceptance criteria                                                                    |
| ------ | ------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| DB-016 | [x]    | Add app settings schema and storage           | Create the settings model for daily generation time, timezone, and business days.                          | Generation settings are stored in the database and available to server code.           |
| DB-017 | [x]    | Add settings API and manager edit flow        | Expose settings read/update behavior with manager-only protection.                                         | Managers can view and update generation settings safely.                               |
| DB-018 | [x]    | Add task template schema                      | Create the task template model and migration with required workflow fields.                                | Templates can represent role-based and duty-based daily work.                          |
| DB-019 | [ ]    | Add task template CRUD                        | Build server-side create/list/update flows for task templates.                                             | Managers can manage active task templates without direct database edits.               |
| DB-020 | [ ]    | Add board, task, and generation-run schema    | Create `BoardDay`, `Task`, and `GenerationRun` models with core relations.                                 | The schema can represent one board per date, generated tasks, and generation attempts. |
| DB-021 | [ ]    | Add task constraints and indexes              | Implement unique board date, duplicate-prevention constraints, and key indexes.                            | The database protects against duplicate generated tasks and supports common queries.   |
| DB-022 | [ ]    | Build generation input loading logic          | Load active users, custom duties, role defaults, and active templates for a date.                          | The service can determine what work should be considered during generation.            |
| DB-023 | [ ]    | Build idempotent task creation flow           | Create only missing generated tasks while preserving manual tasks and retry safety.                        | Re-running generation for the same date does not duplicate generated tasks.            |
| DB-024 | [ ]    | Record generation runs and failure outcomes   | Persist started/completed/failed generation runs with summaries and error messages.                        | Managers can inspect whether a generation attempt succeeded or failed.                 |
| DB-025 | [x]    | Add manual generation trigger and UI feedback | Expose manager-only generation controls and success/failure status in the app.                             | A manager can trigger generation from the UI and see the result clearly.               |
| DB-026 | [ ]    | Add scheduled generation entrypoint           | Create the cron or scheduled entrypoint that calls the same idempotent generation flow.                    | Scheduled generation uses the same safe logic as manual generation.                    |
| DB-027 | [ ]    | Add generation service tests                  | Cover custom duties, role defaults, duplicate prevention, manual-task preservation, and failure recording. | Tests fail if the core generation workflow regresses.                                  |


---

## v0.4.0 - Board and task workflow

**Goal:** Make the dispatch board usable for managers and staff during the normal workday.

**Exit criteria:** Managers can see the board and create work, staff can see and update their own tasks, and required validation rules are enforced.


| ID      | Status | GitHub issue / task card                  | Codex-sized scope                                                                                            | Acceptance criteria                                                                     |
| ------- | ------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| DB-028* | [ ]    | Add board read API                        | Build board endpoints for today's board and date-based board retrieval.                                      | The app can request board data for today or a specific date.                            |
| DB-029* | [ ]    | Build initial board page                  | Create the main board screen using real board data.                                                          | A manager or staff user can open the board and see generated tasks.                     |
| DB-030  | [ ]    | Add board grouping and filtering controls | Support grouping by assigned user, status, and workflow area.                                                | The board can switch between the planned grouping modes without losing task visibility. |
| DB-031* | [ ]    | Add manual task creation API              | Implement task creation with due-time and assignment validation.                                             | Manual tasks cannot be created without the required fields.                             |
| DB-032* | [ ]    | Add manual task creation UI               | Build manager-facing task creation controls on the board or task surface.                                    | Managers can create manual tasks from the app without direct API calls.                 |
| DB-033* | [ ]    | Add task detail endpoint and read model   | Expose a single-task detail read path with all fields needed by task detail UI.                              | The app can load an individual task view reliably.                                      |
| DB-034* | [ ]    | Add staff status update endpoint          | Let staff update their own assigned task status through validated server actions.                            | Staff can update only their own tasks and only through allowed transitions.             |
| DB-035  | [ ]    | Enforce blocker-reason validation         | Require a blocker reason whenever a task moves to `Blocked`.                                                 | The server rejects blocked transitions that do not include a reason.                    |
| DB-036  | [ ]    | Enforce approval-required status rules    | Implement `Ready for Review` and approval-only completion rules.                                             | Approval-required tasks cannot be directly completed by staff.                          |
| DB-037  | [ ]    | Build staff-focused task view             | Create a streamlined "my tasks" experience optimized for daily staff updates.                                | Staff can quickly find, open, and update their own tasks.                               |
| DB-038* | [ ]    | Add task comments API                     | Implement comment creation and retrieval for task updates.                                                   | Task comments persist and are attached to the correct task and author.                  |
| DB-039* | [ ]    | Add task comments UI                      | Surface task comments in the task detail view with basic author and timestamp context.                       | Staff and managers can read and add task comments from the app.                         |
| DB-040  | [ ]    | Add board and task workflow tests         | Cover task creation, due-time validation, self-update rules, blocker rules, and review-required transitions. | The main board and task workflow is protected by automated tests.                       |


---

## v0.5.0 - Review, recommendations, and visibility

**Goal:** Add event-backed visibility and manager oversight so the dispatch board is trustworthy as a team coordination tool.

**Exit criteria:** Important changes create activity events, managers can see what changed, and recommendation plus review flows work as designed.


| ID     | Status | GitHub issue / task card                       | Codex-sized scope                                                                              | Acceptance criteria                                                  |
| ------ | ------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| DB-041 | [ ]    | Add activity event schema and persistence      | Create the activity event model and persistence helpers.                                       | The database can store system and user-generated board events.       |
| DB-042 | [ ]    | Emit events for generation and task lifecycle  | Write activity events during generation, assignment, status, due-time, and comment operations. | Important workflow changes create durable activity events.           |
| DB-043 | [ ]    | Add activity feed API                          | Expose date-based activity feed retrieval for the board.                                       | The app can load activity events for a selected board date.          |
| DB-044 | [ ]    | Build activity feed UI                         | Create the activity feed surface with clear actor, event, and time context.                    | Users can see what changed today and who changed it.                 |
| DB-045 | [ ]    | Implement recommendation matching rules        | Add direct-duty, role, template, and workflow-area recommendation order.                       | The service returns the expected recommended user and reason path.   |
| DB-046 | [x]    | Persist recommendation reason codes and text   | Store explanation data alongside recommendation output for later UI display.                   | Recommendation results include a human-readable explanation.         |
| DB-047 | [x]    | Add manager reassignment and override endpoint | Let managers accept or override recommendations and reassign tasks safely.                     | Managers can change assignments without bypassing server-side rules. |
| DB-048 | [x]    | Add review queue and approval UI               | Surface `Ready for Review` tasks and allow managers to approve or reopen them.                 | Managers can complete or return review-required tasks from the UI.   |
| DB-049 | [ ]    | Add review and visibility tests                | Cover event creation, recommendation order, override flow, and manager approval behavior.      | Review and visibility workflows are protected by automated tests.    |


---

## v0.6.0 - Reliability and release readiness

**Goal:** Harden the MVP for regular daily use on desktop, tablet, and mobile while finishing the docs needed for repeatable development.

**Exit criteria:** Core workflows are reliable across common screen sizes, key failures are visible, and another developer can set up and contribute with minimal handholding.


| ID     | Status | GitHub issue / task card                           | Codex-sized scope                                                                 | Acceptance criteria                                                                    |
| ------ | ------ | -------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| DB-050 | [ ]    | Improve mobile staff task experience               | Refine the mobile task view for fast reading, status changes, and comments.       | Staff can update tasks comfortably from a phone-sized viewport.                        |
| DB-051 | [ ]    | Improve tablet and desktop board layout            | Tighten board spacing, grouping controls, and feed visibility for larger screens. | The board remains usable and readable on tablet and desktop layouts.                   |
| DB-052 | [ ]    | Add loading, empty, and error states               | Cover core board, task, generation, and activity surfaces with honest UI states.  | Users can tell when the app is loading, empty, or failing instead of seeing broken UI. |
| DB-053 | [ ]    | Add unit tests for core services                   | Expand unit coverage for policies, generation helpers, and recommendation rules.  | Service-level regressions are caught before full workflow tests run.                   |
| DB-054 | [ ]    | Add integration tests for API and validation       | Cover route-level auth, validation, and common mutation failures.                 | API behavior stays consistent under expected failure cases.                            |
| DB-055 | [x]    | Add end-to-end tests for daily workflow            | Test login, generation, task updates, blockers, review, and activity visibility.  | The main daily workflow passes in browser-level testing.                               |
| DB-056 | [ ]    | Finalize README, setup docs, and release checklist | Finish project docs, local commands, environment guidance, and MVP release steps. | Another developer can set up, run, test, and understand the app from the docs.         |


---

## v0.6.1 - Production scheduler verification

**Goal:** Make automatic daily board generation observable, diagnosable, and manager-operable in production so the team can prove whether autonomous generation is healthy without guessing.

**Exit criteria:** The app stores durable evidence for scheduled generation attempts, managers can see what happened and what to do next, and the repository contains a repeatable production verification workflow for scheduler wiring and secrets.

### Milestone M1 - Scheduler Evidence Foundation

**Purpose:** Make every scheduled attempt leave trustworthy evidence.

| ID             | Status | GitHub issue / task card                            | Codex-sized scope                                                                                   | Acceptance criteria                                                                                   |
| -------------- | ------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| PROD-SCHED-001 | [x]    | Define scheduler verification contract              | Document the durable states and payload shape for scheduled generation evidence and skip/fail paths. | Scheduled attempts have an approved contract for `received`, `unauthorized`, `skipped`, `started`, `succeeded`, and `failed`. |
| PROD-SCHED-002 | [x]    | Persist cron request evidence                       | Record every cron hit with timestamp, trigger source, and authorization outcome.                    | Each scheduled route hit leaves durable evidence even when generation does not proceed.               |
| PROD-SCHED-003 | [x]    | Persist scheduled skip reasons                      | Store explicit skip reasons such as non-business-day, before-generation-time, already-generated, or config-missing. | Scheduled skips are queryable and distinguishable without reading logs.                              |
| PROD-SCHED-004 | [x]    | Persist sanitized failure diagnostics               | Save safe failure details for scheduled generation without leaking secrets or protected runtime data. | Failed scheduled runs store a manager-safe error reason and preserve retryability.                    |
| PROD-SCHED-005 | [x]    | Add scheduler health read model                     | Build a server read model that summarizes latest scheduled run, latest manual run, last success, last failure, and today's board state. | One server-side read can power a manager health panel without reconstructing state in the UI.         |

### Milestone M2 - Manager Visibility and Operations

**Purpose:** Let a manager answer "did it run, what happened, and what should I do next?" from inside the app.

| ID             | Status | GitHub issue / task card                            | Codex-sized scope                                                                                   | Acceptance criteria                                                                                   |
| -------------- | ------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| PROD-SCHED-006 | [x]    | Add manager generation health panel                | Expose the scheduler health read model in a manager-only board or settings surface.                 | Managers can see today's board status, latest scheduled run, latest manual run, and last success/failure. |
| PROD-SCHED-007 | [x]    | Add generation guidance states                      | Show clear next-step guidance for unauthorized, skipped, failed, running, and never-fired states.  | The UI explains what happened and what the manager should check or do next.                          |
| PROD-SCHED-008 | [x]    | Link retry actions to visible run evidence          | Keep manual retry idempotent and tie retry outcomes back to the visible generation health surface.  | A manager can retry safely and see the retry reflected in the health panel immediately after refresh. |
| PROD-SCHED-009 | [x]    | Surface repeated unauthorized cron attempts         | Highlight suspicious or misconfigured unauthorized scheduler hits in the manager-visible health surface. | Unauthorized scheduler traffic is visible as a config/security signal rather than silent failure.     |

### Milestone M3 - Deployment Readiness and Verification

**Purpose:** Give the team an operator-ready production verification workflow.

| ID             | Status | GitHub issue / task card                            | Codex-sized scope                                                                                   | Acceptance criteria                                                                                   |
| -------------- | ------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| PROD-SCHED-010 | [x]    | Add production scheduler readiness checks           | Report whether required scheduler prerequisites are present, especially `CRON_SECRET` and schedule settings. | The app can distinguish likely configuration gaps from application failures.                         |
| PROD-SCHED-011 | [x]    | Write scheduler deployment verification runbook     | Add a repo-owned runbook for validating scheduler wiring, secret headers, expected behavior, and first-run checks. | Another operator can follow the docs to validate scheduler setup without tribal knowledge.           |
| PROD-SCHED-012 | [x]    | Upgrade release checklist with scheduler proof gate | Expand release readiness steps to require first successful scheduled evidence and troubleshooting checks. | The release checklist contains explicit production scheduler validation gates instead of vague reminders. |

### Milestone M4 - Production Prove-Out

**Purpose:** Close the loop with tests and a real production validation process.

| ID             | Status | GitHub issue / task card                            | Codex-sized scope                                                                                   | Acceptance criteria                                                                                   |
| -------------- | ------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| PROD-SCHED-013 | [x]    | Add scheduler verification test coverage            | Cover authorized, unauthorized, skipped, success, and failed scheduled flows plus the health read model. | Automated tests fail if scheduler evidence, health reporting, or retry visibility regress.           |
| PROD-SCHED-014 | [x]    | Execute first live scheduler validation checklist   | Use the new health panel, docs, and release checklist to verify the first real autonomous production run. | The repo is ready for a real operator to prove that a live scheduled board generation fired successfully in production.          |

### Recommended execution order inside v0.6.1

1. `PROD-SCHED-001` through `PROD-SCHED-005`
2. `PROD-SCHED-006` through `PROD-SCHED-009`
3. `PROD-SCHED-010` through `PROD-SCHED-012`
4. `PROD-SCHED-013`
5. `PROD-SCHED-014`

### Architecture notes for v0.6.1

- Keep the scheduler verification workflow inside the existing Dispatch Board app. Do not create a separate scheduler service at this stage.
- The scheduled route remains the single production entrypoint for autonomous generation; manual generation remains the manager retry path.
- Scheduled and manual runs must continue to use the same shared generation engine so retry behavior stays consistent and idempotent.
- Treat scheduler-attempt evidence as a first-class operational record, not as UI-derived inference.
- Sanitize failure details so manager visibility improves without exposing secrets, connection strings, or protected runtime information.
- Manager-facing health surfaces must answer three questions quickly: `did it fire`, `what happened`, and `what should I do next`.
- Prefer additive slices that touch schema, service, read model, UI, tests, and docs in small reviewable increments rather than one broad rewrite.


---

## Enterprise Tasks Module roadmap

Status markers in this section describe Enterprise Tasks Module evolution specifically. They do not mean the broader task foundation is missing; many core task capabilities already exist elsewhere in the app.

### Phase 0 - Module framing and documentation

| ID | Status | GitHub issue / task card | Codex-sized scope | Acceptance criteria |
| --- | --- | --- | --- | --- |
| DB-ETM-000 | [x] | Register Tasks as Dispatch Board submodule | Update top-level docs so Tasks is framed as an integrated module inside Dispatch Board, not a separate product. | `ARCHITECTURE.md` and `ROADMAP.md` describe Tasks as a submodule inside the parent app. |
| DB-ETM-001 | [x] | Write Enterprise Tasks Module spec | Create `docs/ENTERPRISE_TASKS_MODULE.md` with module purpose, boundaries, workflows, data direction, and release criteria. | The repository has one source-of-truth planning doc for the integrated task module. |
| DB-ETM-002 | [x] | Add commercial tier matrix | Document Basic, Standard, Professional, and Enterprise capability framing without claiming all tiers are implemented. | Tier strategy is documented and clearly separated from day-one required scope. |
| DB-ETM-003 | [x] | Define module integration contract | Clarify how Tasks connects to Board, My Tasks, Activity Feed, Settings, Reports, and Projects. | Task-module boundaries are documented without implying a second app boundary. |

### Phase 1 - Commercial-ready foundation

| ID | Status | GitHub issue / task card | Codex-sized scope | Acceptance criteria |
| --- | --- | --- | --- | --- |
| DB-ETM-010 | [~] | Add organization and location task foundation | Extend the task domain toward tenant-aware organization/location ownership without breaking single-organization operation. | The task domain can grow beyond a single seeded organization without a deep rewrite. |
| DB-ETM-011 | [ ] | Add feature capability and plan foundation | Introduce a central entitlement model for tier-aware feature checks. | Task features can be checked through a shared entitlement service. |
| DB-ETM-012 | [~] | Expand task permission policy model | Preserve current manager/staff rules and add room for eligible-staff, admin, and future org-admin capabilities. | Every task mutation has explicit server-side policy coverage. |
| DB-ETM-013 | [ ] | Add durable task audit log foundation | Add audit persistence for sensitive task-domain actions beyond activity-feed visibility. | Assignment overrides, approvals, and sensitive setting changes can be audited durably. |

### Phase 2 - Enterprise task data model

| ID | Status | GitHub issue / task card | Codex-sized scope | Acceptance criteria |
| --- | --- | --- | --- | --- |
| DB-ETM-020 | [~] | Expand task schema for enterprise console fields | Add fields such as task number, next step, waiting context, risk, ETA, and manager-attention reasons where still missing. | Task records support richer console views without UI-only fake data. |
| DB-ETM-021 | [~] | Add queue and saved-view foundation | Build durable models for queue definitions, saved views, ownership, and system defaults. | Manager Attention, Team Tasks, Unassigned, and future custom views become data-driven. |
| DB-ETM-022 | [x] | Keep checklist and subtask foundation durable | Preserve and extend the existing checklist/task-detail execution foundation. | Task detail continues to support checklist-driven execution with durable persistence. |
| DB-ETM-023 | [~] | Add task assignment and status history | Add durable history models where activity feed alone is not enough for enterprise detail. | Users can inspect who changed assignment or status and when. |
| DB-ETM-024 | [~] | Add SLA and escalation foundation | Progress checkpoints, stalled-state calculation, and blocker review/escalation times are durable; manager-wide evaluation and notification rules remain. | Manager Attention can be powered by durable rule data instead of UI-only logic. |

### Phase 3 - Generation, routing, and attention engines

#### Concern resolution engine

| ID | Status | Scope | Acceptance criteria |
| --- | --- | --- | --- |
| DB-AUTOGENERATION-058A | [x] | Deterministic classification, severity, and resolution planning | Title delays produce an explainable seven-step plan; unknown concerns route to manager triage. |
| DB-AUTOGENERATION-058B | [x] | Durable concern, link, priority, checklist, and activity schema | Concern packages retain task and evidence relationships without parent-task hacks. |
| DB-AUTOGENERATION-058C | [x] | Idempotent transactional package generation | Retry-safe commit creates the concern, tasks, checklists, links, and events atomically. |
| DB-AUTOGENERATION-058D | [x] | Execution and closure gates | Dependencies, required evidence, manager review, and closure proof cannot be bypassed. |
| DB-AUTOGENERATION-058E | [x] | Tasks Console intake and package visibility | Managers can preview, generate, and reopen recent concern work from `/tasks`. |
| DB-AUTOGENERATION-059 | [x] | Initial SLA escalation evaluator | Due escalation candidates move to Escalated with durable activity evidence through manager or protected cron execution. |

| ID | Status | GitHub issue / task card | Codex-sized scope | Acceptance criteria |
| --- | --- | --- | --- | --- |
| DB-ETM-030 | [x] | Preserve enterprise-safe daily generation engine | Keep generation idempotent, duplicate-safe, retryable, and event-backed as the module expands. | Daily generation stays safe while later task-console work lands. |
| DB-ETM-031 | [x] | Preserve routing and recommendation engine | Keep assignment recommendation explainable and manager-overridable. | Generated and manual tasks retain clear ownership and recommendation reasoning. |
| DB-ETM-032 | [ ] | Add claimable queue engine | Introduce eligible-staff claim flows for work that should not be directly preassigned. | Staff can claim only eligible work and the action is persisted safely. |
| DB-ETM-033 | [~] | Add manager attention engine | Build a durable backend view for blocked, overdue, review-needed, unowned, and missing-next-step work. | Manager Attention becomes a first-class read model rather than scattered UI slices. |

### Phase 4 - Status, activity, and reporting hardening

| ID | Status | GitHub issue / task card | Codex-sized scope | Acceptance criteria |
| --- | --- | --- | --- | --- |
| DB-ETM-040 | [x] | Preserve centralized status transition rules | Keep status changes validated server-side as the task module grows. | Invalid transitions continue to be rejected centrally. |
| DB-ETM-041 | [~] | Expand blocker and waiting validation | The full workspace captures blocker reason, unblock action, owner, review time, and escalation deadline; dedicated waiting-state contracts remain. | Waiting states collect enough context for reliable manager follow-up. |
| DB-ETM-042 | [x] | Preserve manager review and approval engine | Keep review-required tasks moving through `Ready for Review` and manager approval rules. | Approval-required work cannot bypass the review path. |
| DB-ETM-043 | [x] | Preserve event-backed task activity | Keep important task actions writing durable activity records. | Activity remains tied to real service operations instead of UI inference. |
| DB-ETM-044 | [ ] | Add reporting snapshot foundation | Add daily summary, blocked, overdue, workload, and department snapshot foundations. | Reporting reads can use durable task-domain summary data. |

### Phase 5 - API and console surfaces

| ID | Status | GitHub issue / task card | Codex-sized scope | Acceptance criteria |
| --- | --- | --- | --- | --- |
| DB-ETM-050 | [~] | Expand task query API for console use | Build richer filters, search, saved-view support, and pagination for task-console use. | `/tasks` can load dense views without client-only hacks. |
| DB-ETM-051 | [x] | Preserve task mutation API coverage | Keep create, update, status, assignment, checklist, comment, complete, and reopen flows durable. | Core task mutations remain validated, permission-checked, and event-backed. |
| DB-ETM-052 | [ ] | Add queue and saved-view APIs | Expose durable queue and saved-view endpoints for the broader task console. | System and user views are loadable through reusable APIs. |
| DB-ETM-053 | [~] | Expand manager attention and review APIs | Consolidate manager attention, review queue, approve, return, and override flows under stable task-module reads/actions. | Manager controls operate through explicit task-module endpoints. |
| DB-ETM-054 | [ ] | Add task reporting APIs | Expose blocked, overdue, workload, and summary reads from durable server projections. | Console, dashboard, and future reports can share task summary APIs. |

### Phase 6 - `/tasks` command-center expansion

| ID | Status | GitHub issue / task card | Codex-sized scope | Acceptance criteria |
| --- | --- | --- | --- | --- |
| DB-ETM-060 | [ ] | Evolve `/tasks` from entry page into console shell | Replace the current light landing page with a real task operations shell inside the app. | `/tasks` becomes a working command-center surface instead of a handoff page. |
| DB-ETM-061 | [ ] | Add command bar and KPI strip | Add create, date, search, filters, saved views, export hooks, and status summary cards. | The console opens with scan-friendly controls and summary data. |
| DB-ETM-062 | [ ] | Add queue rail and system views | Add Manager Attention, Team Tasks, Unassigned, Blocked, Waiting, and Review views with counts. | Users can move between task queues without leaving the module. |
| DB-ETM-063 | [~] | Connect detail rail and existing task workspace flows | Reuse the live task-detail foundations inside a console-friendly selection model. | Users can inspect or act on work without breaking existing task-detail depth. |
| DB-ETM-064 | [~] | Carry forward loading, empty, and error states | Preserve honest states as the console replaces the current entry route. | No blank or misleading production state appears during the console transition. |

### Phase 7 - Staff, manager, and scale follow-through

| ID | Status | GitHub issue / task card | Codex-sized scope | Acceptance criteria |
| --- | --- | --- | --- | --- |
| DB-ETM-070 | [x] | Preserve staff My Tasks workflow | Keep the current My Tasks experience fast, responsive, and safe while the broader console grows. | Staff can continue daily execution without routing everything through `/tasks`. |
| DB-ETM-071 | [x] | Preserve manager review workflow | Keep manager review and reopen flows working while queue and attention surfaces expand. | Review-required work remains operational during module evolution. |
| DB-ETM-072 | [ ] | Add claimable-work workflow | Introduce claimable queues and eligible-staff claim actions. | Staff can claim allowed work and managers can still see ownership clearly. |
| DB-ETM-073 | [ ] | Add quick-capture workflow | Add a fast operational task-capture flow for managers and later eligible staff. | New work can be captured quickly without breaking validation or activity rules. |
| DB-ETM-074 | [ ] | Add entitlement-aware scale layer | Wire feature gates, admin configuration, and later custom-field placeholders into the task module. | Later-tier features can be unlocked safely without rewriting core task flows. |
| DB-ETM-075 | [x] | Preserve task-domain automated coverage | Keep unit, integration, and browser coverage aligned with task behavior as the module changes. | Task-domain regressions are caught before task-console growth ships. |

### Recommended Enterprise Tasks Module execution order

1. `DB-ETM-000` through `DB-ETM-003`
2. `DB-ETM-010` through `DB-ETM-013`
3. `DB-ETM-020` through `DB-ETM-024`
4. `DB-ETM-030` through `DB-ETM-044`
5. `DB-ETM-050` through `DB-ETM-054`
6. `DB-ETM-060` through `DB-ETM-075`

### Architecture notes for Enterprise Tasks Module work

- Keep Tasks inside the existing Dispatch Board app shell and deployable boundary.
- Reuse the live board, My Tasks, manager review, task detail, and activity foundations instead of replacing them.
- Build enterprise-grade data and permission foundations early, but defer future-tier exposure until the day-one workflow stays fast and reliable.
- Prefer small vertical slices that touch schema, service, API, UI, tests, and docs together when a feature truly spans those layers.
- Do not describe planned task-console or commercial-scale features as already implemented.

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

