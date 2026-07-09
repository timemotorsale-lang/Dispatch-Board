# Projects Module Guide

**Document:** Projects Module Guide  
**Last updated:** 2026-07-08  
**Status:** Planning baseline aligned to the current repository  
**Parent product:** Time Motor Sales Dispatch Board

---

## 1. Purpose

This document is the source of truth for the Projects Module inside the Time Motor Sales Dispatch Board.

Use it to:

- keep a clean boundary between the parent Dispatch Board and the Projects Module
- guide architecture, milestones, and implementation order
- define what is real now, what is planned next, and what stays placeholder-only
- give Codex and human contributors a stable prompt and delivery contract

This is not a replacement for the parent product architecture or roadmap. It is a module guide that sits inside them.

---

## 2. Clarified build statement

This guide does not define the full Dispatch Board roadmap.

It defines the Projects Module as one module inside the broader Dispatch Board. The Projects Module depends on shared Dispatch Board foundations such as auth, users, roles, tasks, permissions, board generation, activity events, and manager review. The Projects Module may extend those shared foundations only when necessary to connect tasks and activity to projects.

The goal is to create a day-one usable Projects Hub and Project Workspace with polished foundations for future Standard and Enterprise growth, without accidentally rebuilding the entire Dispatch Board inside the Projects area.

---

## 3. Module boundary

### Parent app: Dispatch Board

The parent app owns the shared operating system:

```text
Auth
Users
Roles
Duties
Permissions
Tasks
Task Templates
BoardDay
Daily Generation
Activity Events
Manager Review
My Work
Settings
Shared App Shell
```

### Child module: Projects

The Projects Module owns the project and workstream experience:

```text
Projects Hub
Project Workspace
Project Overview
Project Board View
Project List View
Project Workflow View
Project Dashboard View
Project Activity View
Project Files Placeholder
Project Settings Placeholder
Project Health Summary
Project-to-Task Linking
```

### Boundary rule

Use this rule in every Projects task:

```text
This task is for the Projects Module inside the Time Motor Sales Dispatch Board.
Do not rebuild the entire Dispatch Board.
Do not replace shared auth, users, roles, duties, tasks, activity, board-generation, or manager-review systems.
Only extend shared foundations where the Projects Module requires project relationships, project filtering, or project-specific presentation.
```

---

## 4. Current repository reality

The current repository already contains a visible Projects feature surface:

- route: [`src/app/(app)/projects/page.tsx`](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/src/app/(app)/projects/page.tsx)
- route: [`src/app/(app)/projects/[projectSlug]/page.tsx`](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/src/app/(app)/projects/[projectSlug]/page.tsx)
- feature: [`src/features/projects/project-definitions.ts`](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/src/features/projects/project-definitions.ts)
- feature: [`src/features/projects/project-data.ts`](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/src/features/projects/project-data.ts)
- feature: [`src/features/projects/project-screen.tsx`](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/src/features/projects/project-screen.tsx)

### What exists today

- `/projects` already renders a Projects hub
- `/projects/[projectSlug]` already renders board, list, workflow, timeline, calendar, dashboard, messages, and files views
- project cards and workspace tabs are already styled and usable
- project grouping currently derives from shared task workflow areas and task text
- project activity currently filters shared activity events by linked task IDs

### What does not exist yet

- real `Project` database records
- `ProjectMember`, `ProjectWorkflow`, or `ProjectWorkflowStage` persistence
- explicit `Task.projectId` relationships
- server-side project policy boundaries
- project-specific services and repositories
- project health persistence or formal read models

### Current state summary

Today, Projects is a UI shell layered on top of the Dispatch Board task system. The next phase should turn that shell into a real module without discarding the shared task and activity foundations that already work.

---

## 5. Product direction from the approved UI concept

The attached concept points to the right product shape for the module:

- a Projects Hub that feels like a command center, not a generic settings page
- a KPI strip that highlights open, overdue, blocked, review, activity, and health signals
- a strong project directory with recognizable project cards
- a project workspace with clear tabs and a management-first overview
- a right-side attention rail for items that need immediate action

That visual direction should guide the module's UX, but implementation must stay honest:

- no fake analytics presented as real
- no placeholder tabs pretending to be finished workflows
- no duplicate task system created inside Projects

---

## 6. Ownership matrix

| Capability | Owner | Projects relationship |
| --- | --- | --- |
| Auth | Parent Dispatch Board | Required dependency |
| Users and roles | Parent Dispatch Board | Projects assigns members and owners |
| Tasks | Parent Dispatch Board | Projects links, filters, groups, and displays tasks |
| Activity events | Parent Dispatch Board | Projects shows project-filtered events |
| Board generation | Parent Dispatch Board | Projects may consume generated work by project |
| Manager review | Parent Dispatch Board | Projects can surface project-specific review queues |
| Project definitions and workspaces | Projects Module | Primary owner |
| Project workflow stages | Projects Module | Primary owner |
| Project health summary | Projects Module | Primary owner |
| Files, calendar, timeline, automations | Future Projects tiers | Placeholder in Basic Plus |

---

## 7. Target routes and surfaces

### Day-one routes

```text
/projects
/projects/[projectId]
/projects/[projectId]/overview
/projects/[projectId]/board
/projects/[projectId]/list
/projects/[projectId]/workflow
/projects/[projectId]/dashboard
/projects/[projectId]/activity
```

### Placeholder-first routes

```text
/projects/[projectId]/timeline
/projects/[projectId]/calendar
/projects/[projectId]/files
/projects/[projectId]/settings
```

### Day-one UI responsibilities

```text
Projects hub header
Search shell
Filter shell
KPI strip
Project cards
Project layout configuration
Project workspace header
Workspace tabs
Project overview
Project board
Project list
Project workflow shell
Project activity feed
Project dashboard shell
```

---

## 8. Architecture shape

The Projects Module should follow the repository conventions already established in the parent app.

### Recommended layout

```text
src/app/(app)/projects/
  page.tsx
  [projectId]/
    page.tsx
    overview/page.tsx
    board/page.tsx
    list/page.tsx
    workflow/page.tsx
    dashboard/page.tsx
    activity/page.tsx
    timeline/page.tsx
    calendar/page.tsx
    files/page.tsx
    settings/page.tsx

src/features/projects/
  components/
  hooks/
  project-screen.tsx
  project-definitions.ts
  project-data.ts
  project-types.ts

src/server/services/projects/
  project-service.ts
  project-workspace-service.ts
  project-health-service.ts
  project-workflow-service.ts

src/server/repositories/projects/
  project-repository.ts
  project-workflow-repository.ts

src/server/policies/
  project-policy.ts

src/server/validation/
  project-validation.ts
```

### Architecture rules

- `src/app` owns route composition and auth-protected entry points
- `src/features/projects` owns project-facing UI components and local presentation logic
- `src/server/services/projects` owns module workflows and read models
- `src/server/repositories/projects` owns project persistence
- `src/server/policies/project-policy.ts` owns project permissions
- the shared task and activity services remain the source of truth for shared workflow state

---

## 9. Data ownership

### New module-owned models

```text
Project
ProjectMember
ProjectWorkflow
ProjectWorkflowStage
```

### Shared models to extend carefully

```text
Task.projectId
Task.workflowStageId
Task.projectSortOrder
ActivityEvent.projectId
TaskTemplate.projectId optional
```

### Placeholder-only or future models

```text
ProjectSavedView
ProjectHealthSnapshot
ProjectDashboardConfig
ProjectFile
ProjectCalendarEvent
ProjectTimelineItem
```

### Key rule

Projects should extend shared task and activity models. It should not fork or duplicate them.

---

## 10. Seed project set

Use the following day-one project set unless product direction changes:

```text
Inventory Management
Service / Repair Shop
Advertising & Marketing
Sales
Documentation / Compliance
Administration / Office
Collections
Customer Issues
Rentals / Loaners
Management Review
```

These match the operating shape shown in the concept and the dealership workflows already reflected elsewhere in the product.

---

## 11. Delivery tiers

### Basic Plus: build now

```text
Projects route and hub
Project workspace shell
Project overview, board, list, workflow, dashboard, and activity views
Project model foundation
Project membership
Project workflow stages
Project-to-task linking
Project-filtered activity
Project health badge
Permissions
Loading, empty, and error states
Seeded project records
```

### Standard: plan next

```text
Saved views
Deeper dashboard summaries
Files integration
Calendar awareness
Timeline summaries
Editable workflow configuration
```

### Enterprise: placeholder only until explicitly activated

```text
Automation rules
Escalation and SLA controls
Executive intelligence
Advanced dashboards
Integrations panel
Advanced audit controls
```

---

## 12. Milestone roadmap

## PROJ-0 - Module truth and documentation

### PROJ-BP-000 - Establish Projects module planning baseline

Goal:
Create and adopt this module guide so Projects work has a clean boundary.

Done when:

- this guide exists in the repo
- contributors use `PROJ-` task naming
- parent-vs-module ownership is explicit

## PROJ-1 - Convert the shell into a real module foundation

### PROJ-BP-001 - Add core project persistence

Build:

```text
Project
ProjectMember
ProjectWorkflow
ProjectWorkflowStage
```

Done when:

- projects are real database records
- each project has owner, status, and workflow definition
- seed data creates the day-one projects

### PROJ-BP-002 - Link shared tasks to projects

Build:

```text
Task.projectId
Task.workflowStageId
Task.projectSortOrder
ActivityEvent.projectId
```

Done when:

- tasks can belong to a real project
- activity can be filtered by explicit `projectId`
- existing task status rules still work unchanged

### PROJ-BP-003 - Add project policies

Build:

```text
canViewProject
canManageProject
canCreateProjectTask
canMoveProjectTask
canEditProjectSettings
```

Done when:

- project visibility and mutations are enforced server-side
- managers can manage all projects
- project owners can manage assigned projects
- staff can only mutate the work they are already allowed to change

## PROJ-2 - Make the hub data-real

### PROJ-BP-004 - Rebuild the Projects hub from project records

Done when:

- `/projects` loads from project records, not only task heuristics
- KPI cards use real linked data
- empty and error states are honest

### PROJ-BP-005 - Add layout modes

Build:

```text
Enterprise command-center layout
Simple dark list layout
```

Done when:

- the preferred visual direction is preserved
- layout switching or layout configuration is ready for growth

### PROJ-BP-006 - Add attention rail and health strip

Done when:

- open, due-today, overdue, blocked, review, activity, and health signals are visible
- values come from real shared data
- nothing is faked to look more complete than it is

## PROJ-3 - Make the workspace operational

### PROJ-BP-007 - Build the project workspace shell on real project data

Done when:

- every project opens from persistence
- workspace tabs route cleanly
- breadcrumb, owner, counts, and health show correctly

### PROJ-BP-008 - Build the overview tab

Done when:

- managers can understand project status at a glance
- the view summarizes work without duplicating the parent dashboard

### PROJ-BP-009 - Build the board tab from explicit workflow stages

Done when:

- tasks are grouped by persisted workflow stage
- stage movement uses shared task services and project rules
- blocker, review, and approval rules are preserved

### PROJ-BP-010 - Build the list tab

Done when:

- managers can audit work fast
- staff can find project-specific work quickly
- the list does not replace the global My Work queue

### PROJ-BP-011 - Build the activity tab from explicit project links

Done when:

- activity is filtered by project relationship, not just inference
- key actions create durable project-visible events

## PROJ-4 - Add disciplined placeholders for future tiers

### PROJ-BP-012 - Add workflow shell and editing boundary

Done when:

- project workflow stages are visible
- future editing capabilities are clearly marked as later-tier features

### PROJ-BP-013 - Add a useful but honest dashboard shell

Done when:

- the dashboard gives real operational value
- advanced BI stays placeholder-only

### PROJ-BP-014 - Add polished placeholder tabs

Targets:

```text
Timeline
Calendar
Files
Advanced settings
Automations
Integrations
```

Done when:

- each placeholder is clearly labeled
- placeholder surfaces do not act like completed features

## PROJ-5 - Health, tests, and release readiness

### PROJ-BP-015 - Add project health calculation

Done when:

- health is derived from linked task data
- green, yellow, and red states are explainable
- the UI shows why a project is healthy or at risk

### PROJ-BP-016 - Add project test coverage

Cover:

```text
project loading
permissions
task linking
stage grouping
list filtering
activity filtering
health calculation
placeholder visibility
```

### PROJ-BP-017 - Update parent docs after real milestones land

Done when:

- `docs/ARCHITECTURE.md` reflects the module accurately
- `docs/ROADMAP.md` points to the live Projects milestone state
- completed work is separated from planned work

---

## 13. Recommended immediate execution order

1. Keep the current UI shell and do not throw it away.
2. Add project persistence and explicit task relationships.
3. Replace heuristic project grouping with database-backed project reads.
4. Add project policy, health, and activity filtering.
5. Tighten the hub and workspace UX around the approved command-center direction.
6. Add placeholder discipline, then add tests and documentation updates.

This approach protects the working parent product while steadily making Projects real.

---

## 14. Naming convention

Use these prefixes:

```text
DB-001     Parent Dispatch Board
PROJ-BP-001  Projects Basic Plus
PROJ-STD-001 Projects Standard
PROJ-ENT-001 Projects Enterprise
```

This avoids mixing parent-app and module work in one queue.

---

## 15. Codex task header

Use this header for every Projects task:

```text
# Task: PROJ-BP-___ - [Task Name]

This task is for the Projects Module inside the broader Time Motor Sales Dispatch Board.

Important module boundary:
- Do not rebuild the entire Dispatch Board.
- Do not replace shared auth, users, roles, tasks, BoardDay, ActivityEvent, or daily generation systems.
- Extend shared systems only where the Projects Module requires a project relationship.
- Enterprise features should be added as shells or placeholders unless the task explicitly activates them.
- Preserve existing Dispatch Board architecture and behavior.
```

---

## 16. Definition of done for Projects work

A Projects task is not done until:

- the scope stays inside the module boundary
- shared task and activity behavior still passes
- loading, empty, and error states are present where needed
- placeholder behavior is clearly marked
- server-side permissions are enforced
- docs are updated when architecture or workflow meaning changes
- tests run, or a clear reason is recorded when they do not

---

## 17. Document maintenance rule

Update this guide whenever one of these becomes true:

- the Projects Module gains real persistence
- project ownership or route structure changes
- a placeholder surface becomes a live workflow
- a new tier boundary is approved
- the parent Dispatch Board architecture changes in a way that affects Projects

This guide should remain a living implementation map, not a one-time planning note.
