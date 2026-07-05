# Enterprise Appointment Architecture Decisions

**Work package:** EAPT-002  
**Status:** Accepted implementation baseline  
**Decision date:** 2026-07-05  
**Scope:** Enterprise Appointment Release 1.0 inside the existing Dispatch Board

## ADR-APT-001 — Extend the Existing Modular Application

### Context

The repository already has a working Next.js application, PostgreSQL/Prisma persistence, session authentication, server-side policies, service and repository layers, task workflows, activity events, and automated tests.

### Decision

Implement the Appointment Command Center inside the existing deployable application.

Use the established boundaries:

```text
src/app                 Routes and page composition
src/features            Appointment interface and client behavior
src/server/validation   Input and command validation
src/server/policies     Appointment authorization
src/server/services     Scheduling and appointment workflows
src/server/repositories Persistence and query access
prisma                  Schema and migrations
src/tests               Unit, integration, and end-to-end evidence
```

Do not introduce a separate microservice, second database, external workflow engine, or external scheduling dependency for Release 1.0.

### Consequences

- Appointment work reuses current authentication, users, roles, tasks, settings, and interface shell.
- Domain modules remain explicit so they can be extracted later only if measured scale or operational ownership requires it.
- Cross-domain writes require deliberate service transactions rather than direct component-level persistence.

## ADR-APT-002 — Keep Appointment and Task as Separate Aggregates

### Context

An appointment coordinates time, attendance, resources, and outcome. A task represents work. Either can exist without the other, and both have independent state.

### Decision

Model `Appointment` and `Task` separately and connect them through an explicit many-to-many `AppointmentTaskLink`.

Supported link types:

- Preparation
- During appointment
- Dependency
- Approval
- Follow-up

The link stores origin, rule/template reference when applicable, creation metadata, and relationship type.

### Consequences

- Completing an appointment never silently completes a task.
- Cancelling an appointment never deletes a task.
- Task rescheduling effects follow the linked blueprint policy.
- Any task can create a linked appointment without changing the task aggregate into a calendar record.

## ADR-APT-003 — Introduce Organization and Location Boundaries Now

### Context

The initial operation is Time Motor Sales in Minneapolis, but Enterprise Release 1.0 requires durable location, timezone, operating-hours, closure, resource, reporting, and permission boundaries.

### Decision

Add organization and location concepts in the first Appointment schema slice.

Initial configuration:

```text
Organization: Time Motor Sales
Location: Time Motor Sales — Minneapolis
Timezone: America/Chicago, pending business confirmation
Administrator: active General Manager role holder
```

Appointment, resource, template activation, schedule policy, and reporting queries carry an organization/location boundary.

### Consequences

- The current single location works without hard-coding a Minneapolis-only model.
- Cross-location authorization and query filtering are testable before a second location exists.
- Exact address, operating hours, and closures remain configuration, not schema assumptions.

## ADR-APT-004 — Use Requirements, Resources, and Reservations

### Context

Enterprise patterns distinguish what an appointment requires from the concrete resource booking. Some work needs a named vehicle or staff member; other work can reserve a pool or capacity and assign a specific resource later.

### Decision

Represent:

- `AppointmentResourceRequirement`: required resource type, quantity/capacity, characteristics, and mandatory/optional behavior.
- `AppointmentResourceReservation`: committed named resource or pool capacity for a time window.
- `SchedulableResource`: staff, vehicle, service bay, room, equipment, pool, or configured resource type.
- `ResourceAvailability`: work windows, absences, outages, and effective capacity.

Reservations are subordinate to the appointment but protected by database constraints and transaction-level conflict evaluation.

### Consequences

- Availability search and scheduling commitment share the same rule inputs.
- Named exclusive resources and capacity pools use one conceptual model.
- Resource assignment can occur at booking time or later when the template permits pool reservation.

## ADR-APT-005 — Store Unambiguous Time and Materialize Recurring Occurrences

### Context

The Minneapolis location observes daylight-saving changes. Recurring series, local operating hours, closures, and exact appointment instants must remain correct.

### Decision

- Store committed start and end instants as timezone-aware database timestamps.
- Store the scheduling timezone used to interpret local intent.
- Store location operating hours as local-time rules associated with an IANA timezone.
- Model a recurring series separately from appointment occurrences.
- Materialize occurrences through a bounded scheduling horizon.
- Preserve completed and cancelled historical occurrences when future recurrence changes.

### Consequences

- Daylight-saving behavior is explicit and testable.
- Each occurrence has independent reservations, state, history, and exceptions.
- Series changes support this occurrence, this-and-future, and entire-series scopes.

## ADR-APT-006 — Use Independent State Dimensions and Timestamped Facts

### Context

One status cannot accurately express booking, confirmation, attendance, and execution without invalid combinations and brittle transitions.

### Decision

Use separate enums:

```text
Booking:      DRAFT | PENDING_APPROVAL | SCHEDULED | CANCELLED | COMPLETED
Confirmation: NOT_REQUIRED | NOT_SENT | PENDING | CONFIRMED | DECLINED
Attendance:   EXPECTED | CHECKED_IN | NO_SHOW
Execution:    NOT_STARTED | IN_PROGRESS | WAITING | FINISHED
```

Store relevant timestamps such as confirmed, checked-in, started, finished, cancelled, and completed times. Enforce cross-dimension invariants in the appointment lifecycle service.

Rescheduling is a history event with prior/new scheduling facts, not a durable status.

### Consequences

- Reporting can distinguish attendance, execution, and final outcome.
- Invalid combinations are rejected server-side.
- New confirmation delivery integrations can be added without changing booking state.

## ADR-APT-007 — Require Optimistic Concurrency and Idempotent Commands

### Context

Managers, owners, automation, and bulk operations can act concurrently. Silent last-write-wins behavior could lose changes or overbook resources.

### Decision

- Add an appointment version used by every mutation.
- Reject stale commands with a conflict response containing safe current-state information.
- Require idempotency identity for create, reschedule, recurrence, automation, and bulk commands.
- Protect appointment, reservation, task-link, history, and outbox writes in one database transaction.
- Use database constraints or locking appropriate to prevent exclusive-resource overcommit.

### Consequences

- Clients must reload and reconcile stale edits.
- Retried commands return the existing result rather than creating duplicates.
- Resource conflict correctness does not depend on client-side calendar state.

## ADR-APT-008 — Separate Operational History, Activity Projection, and Outbox

### Context

The existing `ActivityEvent` model supports the Board feed and is tied to a `BoardDay`. Enterprise appointments require durable history outside a single BoardDay and future integration events that must be delivered reliably.

### Decision

Use three related responsibilities:

1. **Appointment history:** append-only, appointment-scoped facts containing actor/system identity, prior/new values where applicable, reason, source, rule/template version, and correlation ID.
2. **Activity feed projection:** user-facing events compatible with the existing activity experience and linked to an appointment when applicable.
3. **Transactional outbox:** integration-ready internal events written in the same transaction as the domain change and delivered asynchronously.

The existing activity schema will evolve through a compatibility migration rather than being replaced abruptly.

### Consequences

- Audit history is not constrained by board date.
- Activity messages can remain concise and redacted.
- Future SMS, email, calendar, CRM, and DMS adapters consume stable outbox contracts without owning appointment truth.

## ADR-APT-009 — Use Versioned Data-Driven Templates and Rules

### Context

Appointment purposes, task blueprints, outcomes, availability methods, and automation vary by workflow and must be configurable without code. Arbitrary executable scripts would weaken safety, testing, and auditability.

### Decision

- Store versioned appointment templates and automation rules as validated data.
- Use a finite catalog of supported triggers, conditions, owner-selection strategies, availability methods, and actions.
- Do not permit administrator-authored arbitrary code or SQL.
- Require simulation evidence before activation.
- Retain the exact template and rule version for every generated result.

### Consequences

- Automation remains deterministic and explainable.
- New supported rule operators require reviewed application changes.
- Template changes do not rewrite historical appointments.

## ADR-APT-010 — Use Command-Oriented Mutations and Query Read Models

### Context

Generic record patching makes lifecycle, permissions, reasons, conflicts, and audit behavior difficult to enforce consistently.

### Decision

Expose explicit application commands for meaningful transitions, including:

- Create draft
- Submit/approve/return
- Schedule/reschedule
- Confirm/decline
- Check in/no-show
- Start/wait/resume/finish
- Complete/cancel/reinstate
- Transfer ownership
- Resolve/override warning
- Link/unlink task

Use purpose-built read models for Day, Week, Month, Agenda, My Appointments, resource schedules, queues, detail, audit, and reporting.

### Consequences

- Every command has focused validation, policy, transaction, history, and tests.
- Query performance can evolve independently from mutation rules.
- APIs do not expose unrestricted direct row updates.

## ADR-APT-011 — Store Minimum Internal Customer and Vehicle Records Plus Snapshots

### Context

Release 1.0 must retain appointment information inside the Dispatch Board without depending on CRM or DMS integration. The product must not accidentally become an unrestricted CRM or expose sensitive information through schedule surfaces.

### Decision

- Introduce minimum internal customer and vehicle reference records required for appointment operations.
- Store an operational snapshot on the appointment so historical context does not change silently.
- Classify fields as operational, limited, restricted, or audit.
- Keep payment credentials and unrelated sensitive records outside appointment storage.
- Reserve optional external identity fields for future adapters.

### Consequences

- Appointments remain functional without external systems.
- Search and display must enforce field-level permission and masking.
- Future synchronization reconciles stable identities rather than replacing appointment history.

## ADR-APT-012 — Build Server-Rendered Entry Views with Focused Client Interactions

### Context

The existing application uses Next.js server composition with focused interactive React features. Appointment calendar views require selection, filtering, optimistic user feedback, and live refresh without moving business rules into the browser.

### Decision

- Load initial permission-filtered read models on the server.
- Use client components for date/view changes, filters, selection, dialogs, and command submission.
- Keep availability, conflicts, lifecycle, permissions, and template resolution on the server.
- Use bounded refresh or the existing live-refresh pattern first.
- Add streaming only if measured operational need justifies it.

### Consequences

- Initial views remain permission-safe and resilient.
- Client state never becomes scheduling authority.
- The implementation follows current repository conventions.

## ADR-APT-013 — Use Additive Migrations and Compatibility Slices

### Context

The current Dispatch Board is operationally coherent and must not be destabilized by a large Appointment schema rewrite.

### Decision

- Introduce Appointment schema in additive migrations.
- Keep new relations nullable only where staged compatibility requires it, then tighten constraints in a later verified migration.
- Seed non-sensitive Minneapolis configuration and template definitions through explicit versioned seed logic.
- Backfill or transform existing data only through reviewed, retry-safe migration steps.
- Preserve a rollback or roll-forward procedure for every production migration.

### Consequences

- E1 implementation is split into reviewable schema and service slices.
- Existing tasks and activity records remain valid throughout migration.
- Constraint tightening waits for evidence that all records satisfy the invariant.

## EAPT-002 Decision Gate

These decisions are accepted as the implementation baseline because they:

- Preserve the existing working architecture.
- Implement the approved E0 business boundaries.
- Support the Minneapolis baseline without hard-coding a single-location future.
- Enforce manager/owner authority, conflicts, audit, and automation safety.
- Keep external integrations deferred but technically supportable.
- Provide a safe path into EAPT-003 through EAPT-012.

Any implementation that requires a conflicting architecture must update this record and obtain review before proceeding.

