# Enterprise Tasks Module

**Document:** Enterprise Tasks Module  
**Last updated:** 2026-07-09  
**Status:** Dispatch Board task foundation implemented; integrated module expansion planned  
**Source documents:** `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/PRODUCT_SPEC.md`, `docs/MVP_SCOPE.md`, `docs/CURRENT_IMPLEMENTATION_STATUS.md`

---

## 1. Positioning

The Enterprise Tasks Module is not a separate product and should not become a separate application by default.

It is the task, routing, execution, review, and audit layer inside the broader **Time Motor Sales Dispatch Board**.

The module must continue to share the parent app's:

- authentication and session model
- users, roles, duties, and permission boundaries
- board-day and daily-generation foundation
- activity feed and event model
- app shell, navigation, and settings surfaces
- reporting and future commercial capability gates

The parent system remains the product:

```text
Time Motor Sales Dispatch Board
```

The integrated module is:

```text
Enterprise Tasks Module
```

Internal short label:

```text
DB-ETM
```

Primary route:

```text
/tasks
```

Primary purpose:

```text
A shared operational ticketing and workflow console inside the Dispatch Board.
```

---

## 2. Relationship To The Parent Board

The parent Dispatch Board remains the operating system for daily dealership work.

```text
Dispatch Board = parent operating system
Enterprise Tasks Module = task execution and workflow layer
Board = daily visual command surface
My Tasks = staff execution surface
Activity Feed = operational intelligence trail
Projects = long-running strategic work
Reports = management insight layer
```

This module complements the existing application surfaces. It does not replace the broader board.

### Current implemented foundation

The current repository already includes live task foundations that belong to this module:

- daily task generation
- manager assignment and review workflows
- task detail workspace
- My Tasks experience
- activity-backed task updates
- checklist, comments, and status update flows
- server-side validation, policy, repository, and service separation

### Current module gap

The `/tasks` landing route is still a light shared entry surface. The broader Enterprise Tasks Module direction is to evolve that route into a task operations console without splitting the app or rewriting the working board and My Tasks flows.

---

## 3. Day-One Standard

Day one should not mean "basic and fragile." The intended standard is:

```text
Basic feature set, enterprise-grade foundation.
```

The day-one operating scope for the module should cover:

- daily board generation
- manual task creation
- assignment and reassignment
- explainable assignment recommendations
- My Tasks execution
- task detail workspace
- status updates with required validation
- blocker and waiting-state capture
- Ready for Review workflow
- comments and activity events
- checklist execution
- manager review
- saved system views and queue entry points
- loading, empty, and error states
- core automated coverage

The module should launch or continue operating with a foundation that is ready for later capability gating, reporting, audit, and tenant-aware growth without forcing all future tiers into the first release.

---

## 4. Commercial Tier Strategy

Commercial framing is useful, but the team should not try to build full Basic, Standard, Professional, and Enterprise depth all at once.

The correct strategy is:

1. Build the enterprise-grade foundation now.
2. Expose a focused day-one feature set now.
3. Unlock broader capabilities by tier later.

### Tier matrix

| Tier | Typical capabilities | Day-one expectation |
| --- | --- | --- |
| Basic | Single organization, users/roles, daily generation, templates, board visibility, My Tasks, manager review, comments, activity feed, basic reporting | Core operating target |
| Standard | Custom saved views, custom workflow groupings, checklist depth, claimable queues, SLA alerts, quick capture, workload summaries, exports | Planned later |
| Professional | Advanced templates, recurring workflows, custom fields, dependencies, approvals, role-based dashboards, multi-location readiness, import/export, API groundwork | Planned later |
| Enterprise | Multi-tenant SaaS, multiple organizations, advanced audit, SSO/SAML later, granular entitlements, admin console, workflow builder, integrations, analytics, retention controls | Planned later |

### Foundations to build early even when features stay gated

- `Organization`
- `Location`
- `Plan`
- `FeatureCapability`
- `OrganizationFeature`
- `RolePermission`
- `AuditLog`
- `SavedView`
- `TaskTemplateVersion`
- `CustomFieldDefinition`
- `IntegrationConnection` placeholder

---

## 5. Module Boundaries

### What belongs inside the Enterprise Tasks Module

- task query, creation, mutation, and detail reads
- assignment, reassignment, and recommendation workflows
- task status rules and review transitions
- checklist, comments, and task activity
- queueing, saved views, manager attention, and claimable-work concepts
- task-centric reporting inputs

### What remains a parent Dispatch Board concern

- authentication and session ownership
- core user, role, duty, and app-shell governance
- shared board-day and generation scheduling infrastructure
- shared activity feed platform
- cross-module navigation and layout
- settings and future commercial entitlement enforcement

### Integration contract

The module must integrate cleanly with:

- Dashboard
- Board
- My Tasks
- Activity Feed
- Staff / Duties
- Settings
- Reports
- Projects when project work links to tasks

No module rule should require a separate deployment, a second auth system, or a second source of truth for staff, dates, or permissions unless a later documented constraint makes that unavoidable.

---

## 6. Frontend Architecture

### Planned destination

The long-term module destination is a task operations console at `/tasks` that sits inside the existing app shell.

Visual source of truth for that console:

- [`docs/TASKS_UI_SOURCE_OF_TRUTH.md`](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/TASKS_UI_SOURCE_OF_TRUTH.md)
- [`docs/images/TASKS_UI_SOURCE_OF_TRUTH.png`](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/images/TASKS_UI_SOURCE_OF_TRUTH.png)

```text
Dispatch Board app shell
  -> /board
  -> /my-tasks
  -> /tasks
  -> /activity
  -> /projects
  -> /settings
```

### `/tasks` console shape

```text
/tasks
  -> command bar
  -> KPI strip
  -> saved-view / queue rail
  -> list view or board view workspace
  -> right-side detail rail
  -> activity drawer or linked activity panel
```

### Core screen elements

- command bar for create, date, search, filters, saved views, and export hooks
- KPI strip for counts, review items, blocked work, overdue work, and unassigned work
- system views such as Manager Attention, My Tasks, Team Tasks, Unassigned, Blocked, Waiting, Ready for Review, and Overdue
- main workspace with dense list and board modes
- right-side detail rail for details, comments, activity, subtasks, and history

### Current implemented UI baseline

Today the task experience is distributed across live surfaces:

- `/board` for daily board operations
- `/my-tasks` for staff execution
- `/tasks/[id]` for task workspace detail
- `/tasks` as a shared entry route that can expand into the future console

That is acceptable as an implementation baseline as long as planning and future work treat these surfaces as one integrated module rather than unrelated features.

---

## 7. Backend Architecture

The backend should preserve the current Dispatch Board architecture rule: keep business logic server-side and separate services, repositories, policies, and validation from UI code.

### Service layers

```text
task query service
task mutation service
task routing service
assignment recommendation service
status transition service
manager attention service
claimable queue service
activity event service
reporting service
entitlement service
```

### Shared platform dependencies

```text
auth/session
users
roles
duties
board-day
app settings
feature entitlements
```

### Durable rules

- task rules remain enforced server-side
- recommendation logic remains explainable and overridable
- generation remains idempotent and safe to retry
- important state changes remain event-backed
- sensitive mutations should gain durable audit coverage as the module matures

---

## 8. Data Model Direction

### Required current foundation

The working task foundation already depends on models such as:

- `User`
- `Role`
- `Duty`
- `TaskTemplate`
- `BoardDay`
- `Task`
- `TaskComment`
- `ActivityEvent`
- `AppSetting`
- `GenerationRun`

### Enterprise-ready additions

These models should be treated as the next-scale foundation for the module:

- `Organization`
- `Location`
- `Plan`
- `FeatureCapability`
- `OrganizationFeature`
- `TaskQueue`
- `SavedView`
- `TaskChecklistItem`
- `TaskAssignmentHistory`
- `TaskStatusHistory`
- `TaskSlaRule`
- `TaskEscalation`
- `AuditLog`
- `CustomFieldDefinition`
- `CustomFieldValue`
- `TaskTemplateVersion`
- `ReportSnapshot`

### Important task fields to preserve or add over time

- `taskNumber`
- `organizationId`
- `locationId`
- `boardDayId`
- `title`
- `description`
- `priority`
- `status`
- `assignedUserId`
- `recommendedUserId`
- `claimableRoleId`
- `claimableDutyId`
- `workflowArea`
- `dueAt`
- `startedAt`
- `readyForReviewAt`
- `completedAt`
- `reopenedAt`
- `lastUpdatedAt`
- `vehicleReference`
- `customerReference`
- `sourceType`
- `sourceTemplateId`
- `sourceDutyId`
- `requiresManagerApproval`
- `blockerReason`
- `waitingReason`
- `nextStep`
- `nextActionOwnerId`
- `etaAt`
- `slaState`
- `riskLevel`
- `managerAttentionReason`
- `createdByUserId`
- `createdAt`
- `updatedAt`

### Tenant-readiness rule

If commercial expansion remains a real possibility, tenant-aware keys such as `organizationId` and `locationId` should be added to major task-domain records early instead of after the module becomes deeply coupled to single-organization assumptions.

---

## 9. API Surface Direction

The current task APIs already support important workflow slices. The planned module surface should continue to grow inside the same application API namespace.

### Core task APIs

- `GET /api/tasks`
- `POST /api/tasks`
- `GET /api/tasks/:id`
- `PATCH /api/tasks/:id`
- `PATCH /api/tasks/:id/status`
- `POST /api/tasks/:id/assign`
- `POST /api/tasks/:id/comments`
- `POST /api/tasks/:id/checklist`
- `POST /api/tasks/:id/complete`
- `POST /api/tasks/:id/reopen`

### Board and activity APIs

- `GET /api/board/today`
- `GET /api/board/:date`
- `POST /api/board/generate`
- `GET /api/activity?date=YYYY-MM-DD`

### Planned module-growth APIs

- queue and saved-view reads
- manager attention and review queue endpoints
- claimable-work endpoints
- reporting summary endpoints
- future entitlement-checked advanced filters and exports

Route names can evolve, but the API direction should stay inside the shared Dispatch Board service boundary.

---

## 10. Permissions

### Manager

Managers should be able to:

- view all task surfaces
- create, assign, reassign, approve, reopen, and override
- trigger generation and review exceptions
- inspect activity and later audit history

### Staff

Staff should be able to:

- view the broader board as allowed by the product
- work primarily from My Tasks and task-detail surfaces
- update their own assigned tasks
- add comments and execution details
- move tasks through allowed transitions

### Future permission expansion

The module should leave room for:

- eligible-staff claim permissions
- admin and org-admin capabilities
- feature-gated workflow actions
- more granular queue, export, and reporting permissions

### Non-negotiable rule

All task mutations must pass server-side policy checks. UI visibility is not sufficient security.

---

## 11. Status Workflow Rules

The core status set remains:

- `Not Started`
- `In Progress`
- `Blocked`
- `Waiting on Parts`
- `Waiting on Approval`
- `Ready for Review`
- `Completed`

### Durable transition expectations

- `Blocked` requires a blocker reason
- waiting states should collect the right waiting context and next-step information as that capability matures
- review-required tasks must pass through `Ready for Review`
- staff may update only their own eligible tasks
- managers may reassign, approve, reopen, and override
- every important state change should emit an `ActivityEvent`
- sensitive changes should eventually emit both activity and audit evidence

---

## 12. Activity And Audit Rules

The activity feed remains the real operational trail for day-to-day visibility.

Task-domain events should continue to cover:

- board generation
- task creation
- assignment and reassignment
- recommendation outcomes and overrides when applicable
- status changes
- blocker and waiting-state updates
- review and completion
- comments and checklist progress

As the module grows commercially, add durable audit coverage for sensitive actions such as:

- reassignment overrides
- completion and approval overrides
- settings changes that affect task behavior
- entitlement and permission changes

---

## 13. Manager And Staff Workflows

### Manager workflow

The manager should be able to:

1. generate or verify the day
2. review assignment quality and queue health
3. inspect blocked, overdue, or review-required work
4. reassign or approve where needed
5. use activity history to understand what changed

### Staff workflow

The staff user should be able to:

1. open My Tasks quickly on desktop or mobile
2. see current work and due times
3. update status with low friction
4. record blockers, waiting context, comments, and checklist progress
5. hand work into review or completion cleanly

The module should keep both workflows aligned to the same task truth and activity history.

---

## 14. Testing Strategy

Protect the module with automated coverage around the rules that affect daily operations:

- generation idempotency
- recommendation ordering and explanations
- assignment and reassignment permissions
- status transition validation
- blocker and review-required rules
- checklist and comments persistence
- activity event creation
- manager review workflows
- task detail and My Tasks execution flows

As the `/tasks` console expands, add focused tests for:

- saved views and queue behavior
- list and board view state persistence
- manager attention calculations
- claimable-work controls
- entitlement-aware feature visibility

---

## 15. Release Criteria

The module should be considered release-ready for a slice only when:

- the scope stays inside the existing Dispatch Board app boundary
- planned work is not described as already implemented
- server-side validation and policy rules are in place
- relevant task, board, and activity workflows are tested or explicitly called out as unverified
- loading, empty, and error states are honest
- docs remain synchronized with the current implementation baseline

---

## 16. Delivery Rule For Codex

When planning or implementing Enterprise Tasks Module work:

1. treat it as an integrated Dispatch Board module
2. preserve the working board, My Tasks, task detail, and activity foundations
3. expand in small vertical slices
4. build enterprise-grade foundations early
5. defer future-tier exposure until the day-one workflow stays fast and reliable
