# Enterprise Appointment Program

**Program:** Appointment Board / Appointment Command Center  
**Target release:** Enterprise Release 1.0  
**Planning baseline:** E0 approved on 2026-07-05  
**Implementation status:** E1 foundation in progress; EAPT-003 through EAPT-009 foundation slices are implemented, and `/appointments` now has a mockup-aligned preview shell while database-backed template administration, services, APIs, persistence, and live command-center workflows remain planned

## Purpose

This directory is the planning source of truth for the enterprise Appointment Command Center. It turns the approved E0 business direction into specifications, implementation milestones, governance rules, and acceptance scenarios.

The Appointment Command Center is not a standalone calendar. It is the scheduling and coordination layer that connects time, people, customers, vehicles, resources, tasks, outcomes, follow-up, activity history, and reporting.

## Approved Visual Source of Truth

[`docs/IMAGES_CALENDAR.png`](../IMAGES_CALENDAR.png) is the approved Appointment Command Center mockup.

It is authoritative for the intended visual hierarchy and primary composition, including:

- Appointment Board header and controls
- KPI summary strip
- Day calendar with staff/resource columns
- Color-coded appointment cards
- Filters and view controls
- Right-side appointment detail rail
- Linked-task presentation
- Upcoming-appointment section

The approved enterprise product, permission, lifecycle, conflict, automation, and acceptance documents remain authoritative for behavior that cannot be determined from the image.

## Approved E0 Direction

- The Appointment Command Center is an enterprise Release 1.0 capability, not an MVP experiment.
- All planned internal enterprise capabilities are required for day-one launch.
- Any task can create a linked appointment when the work requires meeting someone.
- Explainable automation rules can create appointments automatically.
- Only a manager or the appointment owner can change an appointment.
- Staff, customers, vehicles, service bays, rooms, equipment, locations, and configured resources can participate in scheduling.
- Conflicts must produce a warning or a hard block according to approved policy.
- Appointment automation depends on the source task and its template or rules.
- Appointment information remains governed inside the Dispatch Board.
- External SMS, email, external calendar, CRM, and DMS integrations are deferred until an integration phase.
- Every important action is documented automatically; exceptions and outcomes require a reason.
- Reporting and enterprise security, accessibility, reliability, audit, backup, and rollout controls are required.

## Planning Deliverables

| Document | Purpose |
| --- | --- |
| [ENTERPRISE_PRODUCT_SPEC.md](ENTERPRISE_PRODUCT_SPEC.md) | Product contract, day-one scope, users, capabilities, enterprise requirements, and success measures |
| [E1_CONFIGURATION_BASELINE.md](E1_CONFIGURATION_BASELINE.md) | Known organization, Minneapolis location, General Manager administration, resource baseline, and remaining configuration inputs |
| [INITIAL_TEMPLATE_CATALOG.md](INITIAL_TEMPLATE_CATALOG.md) | Initial enterprise appointment templates adapted from established ServiceNow, Salesforce, and Dynamics scheduling patterns |
| [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) | EAPT-002 decisions for aggregate boundaries, location, resources, time, state, concurrency, events, templates, APIs, data, UI, and migrations |
| [APPOINTMENT_AGGREGATE_CONTRACT.md](APPOINTMENT_AGGREGATE_CONTRACT.md) | Implemented EAPT-004 identity, ownership, state, timing, snapshot, documentation, and concurrency contract |
| [PARTICIPANT_RESOURCE_CONTRACT.md](PARTICIPANT_RESOURCE_CONTRACT.md) | Implemented EAPT-005 participant, customer, vehicle, location-access, privacy, requirement, reservation, pool, and availability contract |
| [APPOINTMENT_TASK_LINK_CONTRACT.md](APPOINTMENT_TASK_LINK_CONTRACT.md) | Implemented EAPT-007 appointment-to-task relationship contract |
| [APPOINTMENT_EVENT_CONTRACT.md](APPOINTMENT_EVENT_CONTRACT.md) | Implemented EAPT-008 appointment event, audit, notification-intent, and correlation contract |
| [COMMAND_IDEMPOTENCY_CONTRACT.md](COMMAND_IDEMPOTENCY_CONTRACT.md) | Implemented EAPT-009 command, optimistic-concurrency, idempotency, transaction, and retry contract |
| [AUTOMATION_RULES_CATALOG.md](AUTOMATION_RULES_CATALOG.md) | Explainable task-to-appointment and appointment-to-task automation model |
| [PERMISSION_MATRIX.md](PERMISSION_MATRIX.md) | Manager, owner, participant, viewer, administrator, and system-action authorization rules |
| [LIFECYCLE_CONFLICT_MATRIX.md](LIFECYCLE_CONFLICT_MATRIX.md) | State transitions, reason requirements, resource constraints, warnings, and hard blocks |
| [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md) | E1 through E10 milestones, dependencies, gates, work packages, and release controls |
| [ACCEPTANCE_SCENARIOS.md](ACCEPTANCE_SCENARIOS.md) | Business, security, reliability, usability, and failure-path scenarios required for signoff |

## Authority and Change Control

These documents describe approved product intent and planned architecture. They do not prove that a capability has been implemented.

Changes to any of the following require a recorded product decision before implementation:

- Day-one scope
- Ownership or permission boundaries
- Lifecycle or conflict policy
- Required documentation and audit behavior
- Internal data-governance rules
- Automation safety rules
- Enterprise quality targets
- Integration deferrals

Implementation tickets may clarify technical details but may not weaken these rules without approval.

## Implementation Progress

| Work package | Status | Evidence |
| --- | --- | --- |
| EAPT-001 — Reconcile current project baseline | Complete | `docs/CURRENT_IMPLEMENTATION_STATUS.md` and corrected top-level status guidance |
| EAPT-002 — Record Appointment architecture decisions | Complete | `ARCHITECTURE_DECISIONS.md` |
| EAPT-003 — Organization, location, timezone, hours, closures, and holidays | Complete | Additive schema/migration, configured draft Minneapolis seed, weekday operating windows, validation, General Manager configuration policy, and tests |
| EAPT-004 — Appointment aggregate and independent state dimensions | Complete | `APPOINTMENT_AGGREGATE_CONTRACT.md`, additive schema/migration, lifecycle validation, manager/owner policies, and tests |
| EAPT-005 — Participants, customers, vehicles, and schedulable resources | Complete | `PARTICIPANT_RESOURCE_CONTRACT.md`, additive schema/migration, location authorization, privacy projections, resource catalog, validation, and tests |
| EAPT-006 — Purpose, template, outcome, reason, and versioning foundation | In progress | Initial enterprise template catalog, versioned purpose snapshot helper, template validation, automation defaults, and tests are implemented; database-backed administration remains pending |
| EAPT-007 — Appointment-task many-to-many relationship and link types | Complete | `APPOINTMENT_TASK_LINK_CONTRACT.md`, additive schema/migration, explicit link types, blocking flags, automation version fields, duplicate-prevention key, validation, and tests |
| EAPT-008 — Audit, activity, correlation, and internal notification event contracts | Complete | `APPOINTMENT_EVENT_CONTRACT.md`, appointment history event schema/migration, actor/event catalogs, reason rules, prior/new value rules, notification intent, correlation IDs, validation, and tests |
| EAPT-009 — Concurrency, idempotency, transaction, and retry boundaries | Complete | `COMMAND_IDEMPOTENCY_CONTRACT.md`, command ledger schema/migration, command/status catalogs, idempotency uniqueness, request hash, version checks, retry state, result/error snapshots, validation, and tests |
| Appointment Board preview shell | Complete | `/appointments` renders the approved mockup composition with preview data, responsive day calendar, metrics, filters, selectable detail rail, linked-task presentation, enterprise controls, and upcoming appointments |
| EAPT-010 — Repository, service, validation, policy, and API boundaries | Next | Define command service and repository contracts that use the E1 foundation safely |

## Recommended Review Order

1. Enterprise Product Specification
2. E1 Configuration Baseline
3. Initial Template Catalog
4. Architecture Decisions
5. Permission Matrix
6. Lifecycle and Conflict Matrix
7. Automation Rules Catalog
8. Acceptance Scenarios
9. Implementation Roadmap

## Program-Level Definition of Done

Enterprise Release 1.0 is ready only when:

- Every E1 through E10 milestone gate has passed.
- All required acceptance scenarios pass in a production-like environment.
- No critical or high-severity defects remain open.
- Security, privacy, accessibility, performance, backup, recovery, and operational-readiness reviews pass.
- Permission enforcement is verified server-side.
- Appointment history and exception reasons are complete and exportable for audit.
- The pilot succeeds and the business owner approves production rollout.
- Training, support, rollback, and stabilization plans are ready.
