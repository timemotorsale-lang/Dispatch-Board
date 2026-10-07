# Time Motor Sales Dispatch Board - Architecture

**Document:** Architecture  
**Version:** v0.2.0 living baseline
**Last updated:** 2026-08-14
**Status:** Dispatch Board implemented; Enterprise Appointment E1 in progress; Enterprise Tasks, Customers, Sales, Diagnostics, and Unified CRM Console directions refined
**Source documents:** `docs/PRODUCT_SPEC.md`, `docs/MVP_SCOPE.md`, `docs/CURRENT_IMPLEMENTATION_STATUS.md`, `docs/ENTERPRISE_TASKS_MODULE.md`, `docs/SCHEDULER_VERIFICATION_CONTRACT.md`, `docs/appointments/`, `docs/customers/`, `docs/sales-console/`, `docs/The Guide To Vibe Coding.md`

**Tasks Console UI source of truth:** [`docs/TASKS_CONSOLE_UI_SOURCE_OF_TRUTH.md`](TASKS_CONSOLE_UI_SOURCE_OF_TRUTH.md)

**CCC brand source of truth:** [`docs/TIME_MOTOR_SALES_LOGO_SOURCE_OF_TRUTH.md`](TIME_MOTOR_SALES_LOGO_SOURCE_OF_TRUTH.md)

**CCC Enterprise Workflow Launcher source of truth:** [`docs/CCC_ENTERPRISE_WORKFLOW_LAUNCHER_SOURCE_OF_TRUTH.md`](CCC_ENTERPRISE_WORKFLOW_LAUNCHER_SOURCE_OF_TRUTH.md)

---

> **Time & Attendance Program:** The product boundary, modular-monolith architecture, official Minnesota/federal source register, exact-time rule baseline, deterministic calculations, workflows, permissions, testing, and gated implementation roadmap live in [`docs/time-attendance/README.md`](time-attendance/README.md). The executable foundation is source-linked and fail-closed; persistence, APIs, UI, payroll handoff, legal/payroll signoff, and production rollout remain later milestones.

> **Enterprise optimization architecture:** The governing Constitution, common work model, algorithm specifications, validation rules, automation controls, and phased adoption path live in [`docs/enterprise-optimization/README.md`](enterprise-optimization/README.md). The [`Enterprise Optimization Constitution`](ENTERPRISE_OPTIMIZATION_CONSTITUTION.md) applies to optimization, recommendation, escalation, and automation across the Command Control Center and every operational console. Domain specifications may strengthen these rules but may not weaken their safety, compliance, authorization, evidence, explainability, or audit requirements. This package is an architecture baseline; it does not by itself activate application behavior.

> **Enterprise Data Movement planning package:** The governed import, export, migration, recurring-exchange, artifact, mapping, approval, and reconciliation plan lives in [`docs/data-movement/README.md`](data-movement/README.md). It builds on the existing command, audit, outbox, integration-exchange, credential-reference, webhook, and conflict foundations; it does not activate data movement or authorize direct production-table loading.

> **Projects Module planning package:** The dedicated Projects Module boundary, architecture shape, milestone plan, and Codex guidance live in [`docs/projects/PROJECTS_MODULE_GUIDE.md`](projects/PROJECTS_MODULE_GUIDE.md). That guide defines the Projects feature as a module inside the parent Dispatch Board, not a separate app rewrite.

> **Enterprise Tasks Module planning package:** The task-module boundary, tier strategy, workflow rules, and milestone IDs live in [`docs/ENTERPRISE_TASKS_MODULE.md`](ENTERPRISE_TASKS_MODULE.md). That guide defines Tasks as an integrated Dispatch Board module, not a separate product or deployment.

> **CCC Enterprise Workflow Launcher planning package:** The cross-console launcher experience, registry contract, workflow-family catalog, authority and recovery boundaries, and staged rollout gates live in [`docs/CCC_ENTERPRISE_WORKFLOW_LAUNCHER_SOURCE_OF_TRUTH.md`](CCC_ENTERPRISE_WORKFLOW_LAUNCHER_SOURCE_OF_TRUTH.md). It is a planning baseline and does not make catalog entries implemented or launchable.

> **Customers Console planning package:** The customer-domain boundary, architecture decisions, rollout roadmap, and milestone IDs live in [`docs/customers/README.md`](customers/README.md). That package defines Customers as the customer intelligence and customer operations layer inside the Dispatch Board, not a separate CRM deployment or a copy of another product.

> **Enterprise Sales Console planning package:** The sales-domain boundary, dealership selling operating model, lead-to-delivery workflows, deterministic decision algorithms, phased roadmap, implementation milestones, and traceability matrix live in [`docs/sales-console/README.md`](sales-console/README.md). Sales is the commercial decision and execution layer over authoritative Customers, Inventory, Appointments, Tasks, and Documents records. This package is documentation only and does not authorize production code, customer communication, pricing, finance decisions, or rollout.

> **Unified CRM Console foundation:** The governing product charter, current evidence baseline, architecture, security/privacy model, roadmap, vertical milestones, multi-agent operating model, testing strategy, decision register, and traceability matrix live in [`docs/unified-crm/README.md`](unified-crm/README.md). Unified CRM is an independent `/crm` console inside the shared Dispatch Board modular monolith. It must reuse authoritative Customers, Inventory, Appointments, Tasks, Repair/Jobs, Documents, Activity, and identity foundations rather than creating competing records. This package is planning authority only; implementation and rollout require their named evidence gates.

> **Growth Console foundation:** The combined marketing and advertising command-center architecture, workflows, algorithms, automations, roadmap, milestones, and traceability matrix live in [`docs/growth-console/README.md`](growth-console/README.md). Growth is the campaign planning, audience review, message/ad approval, automation, and results layer over CRM, Inventory, Sales, Service, Appointments, and Tasks. It is not a second CRM, ad platform, invoice system, or autonomous send/spend engine. The first `/growth` implementation is frontend-review only until product approval and backend controls are added.

> **Enterprise Vehicle Console foundation:** The Inventory / Vehicle Operations strengthening package lives in [`docs/inventory/enterprise-vehicle-console/README.md`](inventory/enterprise-vehicle-console/README.md). It defines the product boundary, architecture posture, simple staff workflows, business logic, and milestone plan for strengthening the existing Inventory / Vehicles section into a DealerCenter-inspired, Reynolds-disciplined operating console. It is documentation only and does not authorize a separate DMS, external sync, production rollout, or provider-specific integration.

> **Manager Review Command Center planning package:** The approved UI/UX source of truth, review-domain boundary, deterministic Manager Attention Engine, rollout roadmap, and implementation milestone IDs live in [`docs/manager-review/README.md`](manager-review/README.md). That package defines Manager Review as the decision, quality-control, and intervention layer inside the Dispatch Board, not a separate task system or employee performance-review product.

> **Enterprise Diagnostics Console planning package:** The independent diagnostic-domain boundary, evidence/reasoning architecture, algorithm and consistency specifications, ontology/knowledge graph, integrated diagnostic lab suite, mastery/verification controls, phased roadmap, and implementation milestone IDs live in [`docs/diagnostics/README.md`](diagnostics/README.md). Diagnostics is a first-class console inside Dispatch Board, not part of Inventory, not a separate deployment, and not a parallel vehicle or repair-order system. This package is planned architecture and does not by itself activate diagnostic behavior.

> **Claims Workspace planning package:** The insurance-claim execution workspace boundary, architecture, progressive UX model, workflow catalog, and staged implementation milestones live in [`docs/claims-workspace/README.md`](claims-workspace/README.md). Claims Workspace is anchored under Service / Repair Operations with visibility from Customer 360, Vehicle 360, Repair Order, and the central Document Library. It is a planning baseline only and does not by itself activate claim intake, carrier communication, repair-order creation, payments, or document mutation.

---

## 1. Purpose

This document describes the implemented technical foundation and durable architecture rules for the Time Motor Sales Dispatch Board.

The current application is a responsive internal web app that generates a daily team dispatch board from staff roles, duties, and task templates. The manager can review and adjust assignments, staff can update their own tasks, and the whole team can see the state of the day through the board and activity feed.

Implemented and planned behavior must remain distinguishable. The dated baseline is recorded in `docs/CURRENT_IMPLEMENTATION_STATUS.md`; approved Enterprise Appointment decisions are recorded in `docs/appointments/ARCHITECTURE_DECISIONS.md`. Update this document whenever implementation meaningfully changes.

---

## 2. Architecture Principles

| Principle | Architectural choice |
| --- | --- |
| Daily workflow first | Build the daily dispatch board before deeper dealership systems. |
| Manager remains in control | Recommendations explain who should handle a task, but the manager can override them. |
| Low-friction staff updates | Status changes, blocker reasons, and comments should be quick from mobile or desktop. |
| Visibility over complexity | Show work, blockers, review needs, and activity before adding advanced scoring. |
| Simple, explainable automation | Daily generation and recommendations should be deterministic and easy to inspect. |
| No required third-party integrations in MVP | Vehicle/customer references stay as text fields until integrations are justified. |
| Small vertical slices | Build database, service, API, UI, and tests one workflow at a time. |

---

## 3. Recommended Stack

The MVP should use a single web application architecture unless implementation constraints later justify a split frontend/backend.

| Layer | Recommended choice | Notes |
| --- | --- | --- |
| Web framework | Next.js with React and TypeScript | Supports responsive UI, API routes/server actions, and future PWA work. |
| Styling | Tailwind CSS or project-local CSS modules | Choose one during scaffold and keep it consistent. |
| Database | PostgreSQL | Durable relational fit for users, roles, duties, tasks, events, and generation runs. |
| ORM | Prisma | Clear migrations, type-safe data access, and easy seed data. |
| Auth | App-owned email/password auth or Auth.js | Staff login is required; keep authorization rules server-side. |
| Background scheduling | Platform cron plus manual trigger | Daily generation should run automatically and be manually retryable. |
| Live updates | Short polling first, optional Server-Sent Events later | MVP must show real app events; transport can stay simple initially. |
| Testing | Unit, integration, and browser-level workflow tests | Focus on generation, permissions, status transitions, and board visibility. |

### Stack Decision Notes

- Do not build a native mobile app in the MVP.
- Do not require DealerCenter, Asana, CRM, SMS, email, or Google Workspace integrations in v0.1.0.
- Keep the app PWA-ready, but do not treat PWA install support as an MVP blocker unless the team explicitly promotes it.

---

## 4. High-Level System

```text
Browser
  - Manager dashboard
  - Staff task view
  - Full team board
  - Activity feed
        |
        v
Web App / App Server
  - Auth and authorization
  - Task and board APIs
  - Daily generation service
  - Assignment recommendation service
  - Activity logging service
        |
        v
PostgreSQL
  - Users, roles, duties
  - Task templates
  - Daily boards and tasks
  - Comments and activity events
  - Settings and generation runs
        ^
        |
Scheduler
  - Runs daily board generation at configured time
  - Can be retried manually by manager
```

The first implementation should prefer a single deployable app. If the app later grows into multiple services, preserve the same service boundaries: auth, board generation, recommendations, tasks, comments, and activity logging.

---

## 5. Product Modules

The Dispatch Board should continue to behave like one parent operating system with integrated modules rather than loosely related mini-apps.

```text
Dispatch Board app shell
  - Dashboard
  - Board
  - Enterprise Tasks Module
  - My Tasks
  - Activity Feed
  - Projects
  - Settings
  - Reports
```

### Enterprise Tasks Module boundary

The Enterprise Tasks Module is the task, routing, execution, review, and audit layer inside the parent Dispatch Board.

Important boundary rules:

- Do not split Tasks into a separate app by default.
- Keep task workflows on the shared auth, user, role, duty, board-day, activity, and settings foundations.
- Treat `/board`, `/my-tasks`, `/tasks`, and `/tasks/:id` as surfaces of one integrated task domain.
- Let `/tasks` evolve into a broader operations console without rewriting the working board and staff flows.
- Build enterprise-grade foundations early, but do not force all future commercial tiers into the first release.

### Current implementation baseline for Tasks

The task domain is already implemented across board, My Tasks, task detail, manager review, activity, validation, and generation flows. What remains planned is the broader `/tasks` command-center expansion, deeper queue and saved-view behavior, richer manager-attention workflows, and later commercial-scale foundations described in `docs/ENTERPRISE_TASKS_MODULE.md`.

---

## 6. Target Repository Structure

```text
Dispatch Board/
  docs/
    PRODUCT_SPEC.md
    MVP_SCOPE.md
    ARCHITECTURE.md
    ROADMAP.md
    SETUP.md
  prisma/
    schema.prisma
    migrations/
    seed.ts
  src/
    app/
      login/
      board/
      tasks/
      settings/
      api/
    components/
      layout/
      ui/
    features/
      activity/
      assignments/
      auth/
      board/
      duties/
      tasks/
      users/
    server/
      auth/
      db/
      policies/
      repositories/
      services/
      validation/
    tests/
      unit/
      integration/
      e2e/
  package.json
  README.md
```

### Structure Rules

- `src/app` owns routes and page composition.
- `src/features` owns user-facing feature components and feature-specific client logic.
- `src/server/services` owns business workflows such as daily board generation and assignment recommendation.
- `src/server/repositories` owns database reads/writes.
- `src/server/policies` owns permission checks.
- `src/server/validation` owns request and domain validation.
- Do not put business rules only in UI components. Server-side rules are the source of truth.

---

## 7. Core Domain Model

### User

Represents a staff member or manager.

Key fields:

- `id`
- `name`
- `email`
- `passwordHash` or auth provider identifier
- `isActive`
- `createdAt`
- `updatedAt`

Relationships:

- Many roles through `UserRole`
- Many custom duties through `UserDuty`
- Many assigned tasks
- Many created tasks

### Role

Represents a job role or responsibility area.

Initial roles:

- General Manager
- Inventory Manager
- Mechanic
- Salesperson
- Office Manager
- Marketing/Advertisement Manager
- Collections

Users can have multiple roles.

### Duty

Represents a responsibility that can generate tasks.

Examples:

- Review inventory status
- Check vehicles ready for photos
- Follow up with assigned leads
- Update repair status

Duties may be assigned directly to a user or used as role defaults.

### TaskTemplate

Defines reusable daily task generation rules.

Key fields:

- `id`
- `title`
- `description`
- `workflowArea`
- `defaultDueTime`
- `requiresManagerApproval`
- `roleId` optional
- `dutyId` optional
- `isActive`

Templates are the source for generated daily tasks.

### BoardDay

Represents a single business day's board.

Key fields:

- `id`
- `date`
- `generationStatus`
- `generatedAt`
- `generatedBy` optional

There should be one board per business date.

### Task

Represents a generated or manually created work item.

Required fields:

- `id`
- `boardDayId`
- `title`
- `description`
- `assignedUserId`
- `recommendedUserId` optional
- `recommendationReasonCode` optional
- `recommendationReasonText` optional
- `recommendationReviewNeeded` optional
- `status`
- `dueAt`
- `createdByUserId`
- `createdAt`
- `updatedAt`
- `requiresManagerApproval`

Optional text references:

- `vehicleReference`
- `customerReference`

Source fields:

- `sourceType`: `template`, `manager`, or `staff`
- `sourceTemplateId` optional
- `sourceDutyId` optional
- `workflowArea`

Blocking and review fields:

- `blockerReason`
- `readyForReviewAt`
- `completedAt`
- `reviewedByUserId`

### TaskComment

Represents a staff or manager update on a task.

Key fields:

- `id`
- `taskId`
- `authorUserId`
- `body`
- `createdAt`

### ActivityEvent

Represents the real activity feed.

Key fields:

- `id`
- `boardDayId`
- `actorUserId` optional for system events
- `taskId` optional
- `eventType`
- `message`
- `metadata` JSON
- `createdAt`

Activity events should be written by services when important state changes happen. The feed should not be assembled from UI-only state.

### AppSetting

Stores configurable app settings.

Initial settings:

- `dailyGenerationTime`
- `timezone`
- `businessDays`

Saturday should use the same board rules as weekdays. Sunday behavior can be configured later; for MVP planning, treat Monday through Saturday as business days unless the manager configures otherwise.

### GenerationRun

Tracks each automatic or manual board generation attempt.

Key fields:

- `id`
- `boardDate`
- `startedAt`
- `finishedAt`
- `status`
- `triggeredBy`: `scheduled` or `manual`
- `triggeredByUserId` optional
- `summary` JSON
- `errorMessage` optional

---

## 8. Important Constraints and Indexes

The database should protect the workflow from duplicate daily generation.

Recommended constraints:

- Unique active user emails.
- Unique role names.
- Unique board date.
- Unique generated task per `boardDayId`, `sourceTemplateId`, and `assignedUserId` when `sourceTemplateId` is present.
- `dueAt` required for every task.
- `blockerReason` required when status is `Blocked`.
- `assignedUserId` required for every task unless the task is explicitly marked as needing manager review before assignment.

Recommended indexes:

- `Task(boardDayId, status)`
- `Task(boardDayId, assignedUserId)`
- `Task(boardDayId, workflowArea)`
- `ActivityEvent(boardDayId, createdAt)`
- `GenerationRun(boardDate, startedAt)`

---

## 9. Task Status Model

MVP statuses:

- `Not Started`
- `In Progress`
- `Blocked`
- `Waiting on Parts`
- `Waiting on Approval`
- `Ready for Review`
- `Completed`

### Status Rules

- Staff can update their own assigned tasks.
- Staff cannot edit or reassign another staff member's task unless a future permission grants it.
- Moving a task to `Blocked` requires a blocker reason.
- Tasks that require manager approval move to `Ready for Review` before `Completed`.
- Tasks that do not require manager approval may be completed directly by the assigned staff member.
- Managers can move review-required tasks from `Ready for Review` to `Completed` or back to `In Progress`.
- Every status change should create an `ActivityEvent`.

---

## 10. Permissions

### Manager

Managers can:

- View the full board.
- Create, edit, assign, and reassign tasks.
- Accept or override recommendations.
- Manage users, roles, duties, and templates.
- Trigger daily board generation manually.
- Configure generation time.
- Review and complete approval-required tasks.
- View the full activity feed.

### Staff

Staff can:

- Log in.
- View the full team board.
- View and update their own tasks.
- Create their own tasks with due times.
- Add comments to their own tasks.
- Mark their own tasks as blocked with a required reason.
- Move eligible tasks to `Ready for Review` or `Completed`.

### Server-Side Policy Rule

All task mutations must pass through server-side permission checks. UI controls can hide unavailable actions, but the server must enforce the rule.

---

## 11. Daily Board Generation

Daily generation is the central MVP workflow.

### Triggering

The board should generate once per business day at the configured time. The manager can also trigger generation manually.

### Generation Flow

```text
Start generation for date
  |
  v
Load active users
  |
  v
For each user:
  - Load custom duties
  - If no custom duties, load role default duties
  - Load active task templates for those duties
  - Recommend assignee using duty/role/template matching
  - Create missing tasks for the board date
  - Skip duplicates already created for same user/date/template
  |
  v
Create activity event: Daily board generated
  |
  v
Record generation run summary
```

### Idempotency

Generation must be safe to retry.

If generation runs twice for the same date, it should not create duplicate generated tasks. Manual tasks should never be deleted or overwritten by generation.

### Failure Handling

- A failed generation should record a `GenerationRun` with `status = failed`.
- The manager should see that generation failed.
- Manual retry should use the same idempotent generation logic.

### Scheduler Verification Contract

Production scheduler verification follows [`docs/SCHEDULER_VERIFICATION_CONTRACT.md`](SCHEDULER_VERIFICATION_CONTRACT.md).

That contract defines:

- scheduler-attempt states `received`, `unauthorized`, `skipped`, `started`, `succeeded`, and `failed`
- explicit skip reason codes instead of free-form skip text
- manager-safe failure evidence
- the separation between scheduled attempts and manual retries

Until the full v0.6.1 scheduler evidence work is implemented, the route and generation service may expose only part of this contract in transient responses. Durable scheduler evidence, health read models, and production verification workflow should align to the contract document rather than inventing separate state meanings.

---

### Concern-to-task resolution generation

Concern generation is event-driven and remains separate from daily board generation. It reuses the task aggregate, assignment recommendations, board days, manager review, status rules, and activity feed while committing a parent `ConcernCase`, linked tasks, required checklist evidence, and events in one idempotent transaction.

The initial engine uses versioned code-owned blueprints and deterministic rules. It does not call AI or external systems. Concern tasks use their due-date board day, preserve a `CONCERN` source, and remain safe from daily-generation replacement. Timed escalation uses a separate protected evaluator and never treats formal escalation as resolved closure.

See [`CONCERN_RESOLUTION_ENGINE.md`](CONCERN_RESOLUTION_ENGINE.md) for routes, safety boundaries, and deferred scope.

## 12. Assignment Recommendation Service

The assignment recommendation service should be simple and explainable.

Recommendation order:

1. Direct user duty match.
2. Role match.
3. Task template owner.
4. Department or workflow area match.
5. Manager review needed if no clear match exists.

Each recommendation should store:

- Recommended user, if found.
- Reason code.
- Short explanation suitable for the UI.
- Whether manager review is needed.

The service should not make high-stakes decisions automatically. Manager override must always be available.

Deferred recommendation features:

- Capacity limits.
- Complex workload balancing.
- Profit-based scoring.
- Sales urgency scoring.
- Aged inventory scoring.
- AI-only final assignment.

---

## 13. Activity Feed

The activity feed should be event-backed from day one.

Required event types:

- Daily board generated
- Task created
- Task assigned
- Assignment recommendation made
- Assignment changed
- Due time changed
- Status changed
- Task marked Blocked
- Blocker reason added
- Task marked Waiting on Parts
- Task marked Waiting on Approval
- Task marked Ready for Review
- Manager approved completion
- Task completed
- Comment/update added

### Feed Behavior

- The feed should default to today's board.
- Newest events should be easy to see.
- Events should include who performed the action when applicable.
- System actions such as daily generation should be clearly labeled.
- The feed can refresh by polling in the MVP. Real-time streaming can be added later if needed.

---

## 14. API Surface

Exact route names can change during implementation, but the MVP should expose these capabilities.

### Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Board

- `GET /api/board/today`
- `GET /api/board/:date`
- `POST /api/board/generate`

### Tasks

- `POST /api/tasks`
- `GET /api/tasks/:id`
- `PATCH /api/tasks/:id`
- `POST /api/tasks/:id/status`
- `POST /api/tasks/:id/comments`
- `POST /api/tasks/:id/assign`
- `POST /api/tasks/:id/complete`
- `POST /api/tasks/:id/reopen`

### Users, Roles, and Duties

- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`
- `GET /api/roles`
- `GET /api/duties`
- `POST /api/duties`
- `PATCH /api/duties/:id`

### Templates and Settings

- `GET /api/task-templates`
- `POST /api/task-templates`
- `PATCH /api/task-templates/:id`
- `GET /api/settings`
- `PATCH /api/settings`

### Activity

- `GET /api/activity?date=YYYY-MM-DD`

### API Rules

- Validate all input server-side.
- Require due time for created tasks.
- Require blocker reason for `Blocked`.
- Return permission errors consistently.
- Log activity events in the same service operation that changes state.

---

## 15. Frontend Architecture

### Primary Views

1. Login
2. Today's Board
3. Task Detail
4. Staff Task View
5. Manager Controls
6. Duties and Templates Settings
7. Activity Feed

### Today's Board

The board should support grouping by:

- Assigned user
- Status
- Workflow area

MVP workflow areas:

- Inventory
- Advertising
- Marketing
- Sales
- Admin
- Collections basic/manual tasks

### Manager Controls

Manager-facing UI should prioritize:

- Creating tasks.
- Accepting or overriding recommendations.
- Reassigning work.
- Reviewing blocked tasks.
- Reviewing `Ready for Review` tasks.
- Triggering generation manually.

### Staff Experience

Staff-facing UI should prioritize:

- Seeing today's assigned tasks quickly.
- Updating status.
- Adding a comment/update.
- Creating their own task.
- Marking a task blocked with a reason.

### Responsive Requirements

- Desktop should show board, filters, and activity feed efficiently.
- Tablet should keep the full board usable.
- Mobile should prioritize "my tasks", quick status updates, task detail, and activity feed access.
- Staff should not need a native mobile app for MVP usage.

---

## 16. Validation and Business Rules

Validation should live close to server service entry points.

Required validation:

- Task title is required.
- Due time is required for every task.
- Assigned user is required unless manager review is explicitly needed.
- Blocker reason is required for `Blocked`.
- Staff-created tasks must be assigned to the creating staff member unless a manager changes assignment.
- Only managers can reassign tasks in the MVP.
- Only managers can complete approval-required tasks.
- Generated tasks must reference their template for duplicate prevention.

---

## 17. Testing Strategy

Build tests around the workflows most likely to break daily operations.

### Unit Tests

- Daily board generation from custom duties.
- Daily board generation from role defaults.
- Duplicate prevention.
- Assignment recommendation priority order.
- Status transition rules.
- Permission policy checks.

### Integration Tests

- Create manual task with due time.
- Reject task creation without due time.
- Reject `Blocked` without blocker reason.
- Staff cannot edit another staff member's task.
- Manager can override recommendation.
- Review-required task moves through `Ready for Review` before `Completed`.
- Activity events are created with task changes.

### End-to-End Tests

- Manager opens app and sees today's generated board.
- Staff logs in, updates own task, and adds a comment.
- Staff marks task blocked and the manager sees it.
- Manager approves a `Ready for Review` task.
- Manual generation retry does not duplicate generated tasks.

---

## 18. Seed Data

Seed data should make local development useful immediately.

Initial seed data:

- One manager user.
- Several staff users across day-one roles.
- Role default duties.
- Task templates for inventory, advertising, marketing, sales, and manager review.
- Configured daily generation time.
- Example board with tasks for local testing, if useful.

Never seed real customer data, real passwords, or sensitive dealership records.

---

## 19. Security and Privacy

The MVP is an internal business tool, but it still handles staff activity and possible customer/vehicle references.

Rules:

- Hash passwords if app-owned auth is used.
- Store only the minimum customer/vehicle text needed for task context.
- Do not store full customer records in the MVP.
- Do not store a full vehicle database in the MVP.
- Protect manager-only actions server-side.
- Avoid committing `.env` files, local databases, credentials, or production exports.

---

## 20. Deferred Architecture

The MVP should leave room for these future additions without building them now:

- Progressive Web App install support.
- DealerCenter or DMS integration.
- Asana import/export or migration.
- Google Workspace integration.
- CRM or lead source integration.
- Inventory/listing feeds.
- Email or SMS notifications.
- Advanced reporting and analytics.
- Staff capacity planning.
- Deep collections workflow.
- Deep documentation workflow.
- Deep compliance workflow.

---

## 21. Development Workflow for Codex

Following `docs/The Guide To Vibe Coding.md`, implementation should happen in small, reviewable tasks.

Recommended order:

1. Project scaffold.
2. Core database schema and migrations.
3. Auth and role model.
4. Duties and task templates.
5. Daily board generation service.
6. Task board API and UI.
7. Staff status updates and blocker validation.
8. Activity feed.
9. Assignment recommendation service.
10. Manager review and overrides.
11. Responsive polish and reliability.

Each implementation task should define:

- Goal.
- Relevant files.
- Constraints.
- Done criteria.
- Tests to run.

After meaningful changes, update this document so it remains a living architecture record rather than a stale plan.

The approved architecture for DB-ACCOUNTABILITY-059 is documented in `docs/STAFF_EXECUTION_HANDOFF_ENGINE.md`, with sequential delivery milestones in `docs/STAFF_EXECUTION_HANDOFF_ROADMAP.md`.

---

## 22. Current Implementation Status

The original architecture was written before implementation. The Dispatch Board foundation is now live in the repository. See `docs/CURRENT_IMPLEMENTATION_STATUS.md` for the dated evidence baseline and `docs/appointments/` for the planned Enterprise Appointment architecture.

| Area | Status |
| --- | --- |
| Web app scaffold | Implemented |
| Database schema | Implemented for current Dispatch Board; Appointment domain planned |
| Auth | Implemented |
| Roles and duties | Implemented |
| Task templates | Schema/API/service implemented; production administration UI partial |
| Daily board generation | Implemented |
| Assignment recommendations | Implemented |
| Task board UI | Implemented |
| Staff status updates | Implemented |
| Manager review workflow | Implemented |
| Activity feed | Implemented |
| Tests | Implemented; current baseline recorded separately |
| Enterprise Appointment Command Center | E1 foundation in progress |
| Deployment | Configuration exists; production readiness not verified in current baseline |

---

## 23. Shared Collaboration Composer

Human-authored comments and operational notes use the shared `RichTextComposer` rather than console-specific text areas. The MVP control supports bold, italic, underline, strike-through, lists, quotations, inline code, safe links, mentions, emoji, keyboard shortcuts, and a formatted preview.

Formatting is persisted as plain-text markup through the existing APIs and rendered with an allowlisted React formatter. The renderer does not inject stored HTML. Mandatory compliance fields, including blocker, completion, scheduling override, and no-show reasons, remain plain-text controls so workflow validation and audit evidence stay predictable.

