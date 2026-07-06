# Enterprise Appointment Program

**Program:** Appointment Board / Appointment Command Center  
**Target release:** Enterprise Release 1.0  
**Planning baseline:** E0 approved on 2026-07-05  
**Implementation status:** E3 command foundation has started; EAPT-003 through EAPT-029N foundation slices are implemented, `/appointments` now has a mockup-aligned board with live read-model binding, draft creation, draft scheduling, initial schedule-readiness warning/block preview, resource-planning preview, resource requirement attachment, resource candidate proposal, proposed-candidate availability preview, resource candidate hold, Schedule command held-reservation commit, resource reservation release controls, held-reservation replacement, resource warning override capture, warning-before-hold enforcement, and persisted warning-override visibility, and final outcome workflows remain planned

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
| [APPOINTMENT_COMMAND_BOUNDARY.md](APPOINTMENT_COMMAND_BOUNDARY.md) | Implemented EAPT-010 repository, service, validation, policy, and API command boundary |
| [PRODUCTION_OPERATIONS_BASELINE.md](PRODUCTION_OPERATIONS_BASELINE.md) | Implemented EAPT-011 production-volume, retention, archive, RTO, RPO, index, and signoff baseline |
| [MIGRATION_SEED_ROLLBACK_STRATEGY.md](MIGRATION_SEED_ROLLBACK_STRATEGY.md) | Implemented EAPT-012 migration, seed, rollback, roll-forward, Prisma generation, and compatibility strategy |
| [E1_FOUNDATION_GATE_REVIEW.md](E1_FOUNDATION_GATE_REVIEW.md) | E1 gate package with evidence, carry-forward risks, non-claims, approval owners, and E2 handoff |
| [LOCATION_TIME_SERVICE_CONTRACT.md](LOCATION_TIME_SERVICE_CONTRACT.md) | Implemented EAPT-013 location time, operating-hours, closures, timezone, and DST service contract |
| [RESOURCE_AVAILABILITY_SERVICE_CONTRACT.md](RESOURCE_AVAILABILITY_SERVICE_CONTRACT.md) | Implemented EAPT-014 resource capacity, operating-window, reservation, outage, and severity service contract |
| [STAFF_AVAILABILITY_SERVICE_CONTRACT.md](STAFF_AVAILABILITY_SERVICE_CONTRACT.md) | Implemented EAPT-015 staff availability, location eligibility, owner/participant/manager grant, and staff-resource matching contract |
| [APPOINTMENT_DURATION_BUFFER_CONTRACT.md](APPOINTMENT_DURATION_BUFFER_CONTRACT.md) | Implemented EAPT-016 duration, preparation buffer, cleanup buffer, override, and time-footprint contract |
| [RECURRENCE_OCCURRENCE_CONTRACT.md](RECURRENCE_OCCURRENCE_CONTRACT.md) | Implemented EAPT-017 recurrence definition, occurrence exception, expansion horizon, DST, and edit-scope contract |
| [HARD_CONFLICT_EVALUATION_CONTRACT.md](HARD_CONFLICT_EVALUATION_CONTRACT.md) | Implemented EAPT-018 server-side hard-conflict evaluation contract |
| [WARNING_OVERRIDE_CONTRACT.md](WARNING_OVERRIDE_CONTRACT.md) | Implemented EAPT-019 server-side warning evaluation and manager override contract |
| [RESOURCE_RESERVATION_COMMIT_CONTRACT.md](RESOURCE_RESERVATION_COMMIT_CONTRACT.md) | Implemented EAPT-020 protected resource reservation commit and release contract |
| [AVAILABILITY_SEARCH_CONTRACT.md](AVAILABILITY_SEARCH_CONTRACT.md) | Implemented EAPT-021 availability search contract for people and resources |
| [RESCHEDULE_IMPACT_PREVIEW_CONTRACT.md](RESCHEDULE_IMPACT_PREVIEW_CONTRACT.md) | Implemented EAPT-022 reschedule and recurrence-change impact preview contract |
| [BULK_RESCHEDULE_CONTRACT.md](BULK_RESCHEDULE_CONTRACT.md) | Implemented EAPT-023 bulk-reschedule dry-run and controlled-execution contract |
| [WAITLIST_UNSCHEDULED_REQUEST_CONTRACT.md](WAITLIST_UNSCHEDULED_REQUEST_CONTRACT.md) | Implemented EAPT-024 waitlist and unscheduled-request contract |
| [SCHEDULING_ENGINE_QUALITY_GATE.md](SCHEDULING_ENGINE_QUALITY_GATE.md) | Implemented EAPT-025 scheduling engine load, concurrency, failure, and E2 quality-gate coverage |
| [E2_SCHEDULING_GATE_REVIEW.md](E2_SCHEDULING_GATE_REVIEW.md) | E2 gate package with scheduling evidence, carry-forward risks, non-claims, approval owners, and E3 handoff |
| [APPOINTMENT_READ_MODEL_CONTRACT.md](APPOINTMENT_READ_MODEL_CONTRACT.md) | Implemented EAPT-026 appointment read model and permission-filtered query contract |
| [APPOINTMENT_READ_ROUTE_AND_BOARD_BINDING_CONTRACT.md](APPOINTMENT_READ_ROUTE_AND_BOARD_BINDING_CONTRACT.md) | Implemented EAPT-026 read API and Appointment Board client-hydration contract |
| [APPOINTMENT_CREATE_DRAFT_UI_CONTRACT.md](APPOINTMENT_CREATE_DRAFT_UI_CONTRACT.md) | Implemented EAPT-029A New Appointment modal to `CREATE_DRAFT` command bridge |
| [APPOINTMENT_SCHEDULE_DRAFT_UI_CONTRACT.md](APPOINTMENT_SCHEDULE_DRAFT_UI_CONTRACT.md) | Implemented EAPT-029B detail-rail Schedule Draft to `SCHEDULE` command bridge |
| [APPOINTMENT_SCHEDULE_READINESS_PREVIEW_CONTRACT.md](APPOINTMENT_SCHEDULE_READINESS_PREVIEW_CONTRACT.md) | Implemented EAPT-029C server-backed Schedule Readiness warning/block preview |
| [APPOINTMENT_RESOURCE_PLANNING_PREVIEW_CONTRACT.md](APPOINTMENT_RESOURCE_PLANNING_PREVIEW_CONTRACT.md) | Implemented EAPT-029D server-backed Resource Planning preview |
| [APPOINTMENT_RESOURCE_REQUIREMENT_ATTACHMENT_CONTRACT.md](APPOINTMENT_RESOURCE_REQUIREMENT_ATTACHMENT_CONTRACT.md) | Implemented EAPT-029E Resource Planning requirement attachment write boundary |
| [APPOINTMENT_RESOURCE_CANDIDATE_PROPOSAL_CONTRACT.md](APPOINTMENT_RESOURCE_CANDIDATE_PROPOSAL_CONTRACT.md) | Implemented EAPT-029F proposed resource candidate selection boundary |
| [APPOINTMENT_RESOURCE_CANDIDATE_AVAILABILITY_CONTRACT.md](APPOINTMENT_RESOURCE_CANDIDATE_AVAILABILITY_CONTRACT.md) | Implemented EAPT-029G proposed-candidate availability preview |
| [APPOINTMENT_RESOURCE_CANDIDATE_HOLD_CONTRACT.md](APPOINTMENT_RESOURCE_CANDIDATE_HOLD_CONTRACT.md) | Implemented EAPT-029H proposed-to-held resource reservation workflow |
| [APPOINTMENT_HELD_RESERVATION_SCHEDULE_COMMIT_CONTRACT.md](APPOINTMENT_HELD_RESERVATION_SCHEDULE_COMMIT_CONTRACT.md) | Implemented EAPT-029I Schedule command held-reservation commit bridge |
| [APPOINTMENT_RESOURCE_RESERVATION_RELEASE_CONTRACT.md](APPOINTMENT_RESOURCE_RESERVATION_RELEASE_CONTRACT.md) | Implemented EAPT-029J held/committed resource reservation release control |
| [APPOINTMENT_RESOURCE_RESERVATION_REPLACEMENT_CONTRACT.md](APPOINTMENT_RESOURCE_RESERVATION_REPLACEMENT_CONTRACT.md) | Implemented EAPT-029K held-reservation replacement workflow |
| [APPOINTMENT_RESOURCE_WARNING_OVERRIDE_CONTRACT.md](APPOINTMENT_RESOURCE_WARNING_OVERRIDE_CONTRACT.md) | Implemented EAPT-029L board-visible resource warning override capture |
| [APPOINTMENT_RESOURCE_WARNING_HOLD_ENFORCEMENT_CONTRACT.md](APPOINTMENT_RESOURCE_WARNING_HOLD_ENFORCEMENT_CONTRACT.md) | Implemented EAPT-029M warning-before-hold enforcement |
| [APPOINTMENT_RESOURCE_WARNING_OVERRIDE_VISIBILITY_CONTRACT.md](APPOINTMENT_RESOURCE_WARNING_OVERRIDE_VISIBILITY_CONTRACT.md) | Implemented EAPT-029N persisted warning-override visibility in candidate availability |
| [LIFECYCLE_COMMAND_EXECUTION_CONTRACT.md](LIFECYCLE_COMMAND_EXECUTION_CONTRACT.md) | Implemented EAPT-027 lifecycle command execution planning contract |
| [LIFECYCLE_TRANSACTION_EXECUTION_CONTRACT.md](LIFECYCLE_TRANSACTION_EXECUTION_CONTRACT.md) | Implemented EAPT-027 atomic transaction execution boundary contract |
| [LIFECYCLE_COMMAND_ROUTE_EXECUTION_CONTRACT.md](LIFECYCLE_COMMAND_ROUTE_EXECUTION_CONTRACT.md) | Implemented EAPT-027 command route execution orchestration contract |
| [CONFIRMATION_ATTENDANCE_EXECUTION_COMMAND_CONTRACT.md](CONFIRMATION_ATTENDANCE_EXECUTION_COMMAND_CONTRACT.md) | Implemented EAPT-028 confirmation, attendance, no-show, and execution-state command contract |
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
| EAPT-010 — Repository, service, validation, policy, and API boundaries | Complete | `APPOINTMENT_COMMAND_BOUNDARY.md`, command request validation, repository contract, service boundary, API command intake route, manager/owner authorization, duplicate idempotency handling, stale-version conflict recording, and tests |
| EAPT-011 — Production-volume assumptions, retention, indexing, archive, RTO, and RPO inputs | Complete | `PRODUCTION_OPERATIONS_BASELINE.md`, operational baseline constants, named owner areas, volume targets, retention/archive rules, RTO/RPO targets, performance gates, query-family coverage, change-control rules, and tests |
| EAPT-012 — Migration, seed, rollback, and compatibility strategy | Complete | `MIGRATION_SEED_ROLLBACK_STRATEGY.md`, migration-readiness constants, expand-and-contract rules, fresh install and production upgrade commands, production seed boundaries, rollback/roll-forward procedure, recovery reconciliation targets, Prisma generation guidance, and tests |
| E1 foundation gate review | Ready for approval | `E1_FOUNDATION_GATE_REVIEW.md`, gate-review constants, evidence map, carry-forward risks, non-claims, approval owner list, E2 handoff, and tests |
| EAPT-013 — Location time, operating-hours, closures, and timezone services | Complete | `LOCATION_TIME_SERVICE_CONTRACT.md`, location-time service, local date/minute conversion, effective operating-window resolution, closure overlap detection, schedule-candidate evaluation, DST boundary handling, and tests |
| EAPT-014 — Resource types, resources, capacity, availability, and outage services | Complete | `RESOURCE_AVAILABILITY_SERVICE_CONTRACT.md`, resource availability service, effective resource windows, capacity overrides, reservation consumption, outage and capacity-reduction rules, severity handling, and tests |
| EAPT-015 — Staff availability and location eligibility | Complete | `STAFF_AVAILABILITY_SERVICE_CONTRACT.md`, staff availability service, location access eligibility, owner/participant/manager grant checks, staff-resource matching, staff reservation/absence availability, warning/hard-block handling, and tests |
| Appointment Board preview shell | Complete with initial live binding and command bridge | `/appointments` renders the approved mockup composition with preview fallback data, loads the appointment read API for persisted records, maps live records into calendar cards and owner columns when available, includes Check In / No Show controls that call the live command API when persisted appointment IDs and versions are available, lets the New Appointment modal create persisted draft appointments, lets live drafts move to scheduled status through the command boundary, shows server-backed Schedule Readiness and Resource Planning for live records, can attach recommended resource requirements, can propose resource candidates, displays proposed-candidate availability, can hold available proposed candidates, commits held reservations during Schedule Draft, can release held/committed reservations, can replace held reservations with a new proposed candidate, can record manager resource warning overrides, requires warning override history before holding warning-level candidates, and shows persisted warning override status after refresh |
| EAPT-016 — Appointment duration, preparation, and cleanup buffer rules | Complete | `APPOINTMENT_DURATION_BUFFER_CONTRACT.md`, duration rule service, appointment/resource time-footprint calculation, documented override reasons, manager-approval flagging, start-interval enforcement, and focused tests |
| EAPT-017 — Recurrence definitions, occurrence exceptions, and expansion horizon | Complete | `RECURRENCE_OCCURRENCE_CONTRACT.md`, recurrence service, daily/weekly/monthly expansion, DST-safe local-time behavior, skipped/rescheduled exceptions, bounded horizons, series-edit impact previews, and focused tests |
| EAPT-018 — Server-side hard-conflict evaluation | Complete | `HARD_CONFLICT_EVALUATION_CONTRACT.md`, hard-conflict service, template/context/time/location/resource/staff/recurrence blocking, reserved-resource window use, and focused tests |
| EAPT-019 — Server-side warning evaluation and manager override records | Complete | `WARNING_OVERRIDE_CONTRACT.md`, warning service, warning-only staff/resource extraction, duration override warnings, manager-only override validation, reason-code/note requirements, audit-shaped override records, and focused tests |
| EAPT-020 — Atomic resource reservation and release behavior | Complete | `RESOURCE_RESERVATION_COMMIT_CONTRACT.md`, transaction/lock service boundary, deterministic resource lock ordering, inside-lock availability recheck, no-partial-create behavior, held/committed capacity protection, warning commit policy, reasoned release, and focused tests |
| EAPT-021 — Availability search for people and resources | Complete | `AVAILABILITY_SEARCH_CONTRACT.md`, availability search service, bounded local-date windows, location-window candidate generation, hard-conflict and warning reconciliation, clean availability filtering, blocked diagnostics, and focused tests |
| EAPT-022 — Rescheduling and recurrence-change impact preview | Complete | `RESCHEDULE_IMPACT_PREVIEW_CONTRACT.md`, reschedule impact service, prior/new time preview, reservation release/recreate impact, hard-block and warning reconciliation, recurrence scope preview, preserved occurrence handling, and focused tests |
| EAPT-023 — Bulk-rescheduling dry run and controlled execution | Complete | `BULK_RESCHEDULE_CONTRACT.md`, bulk dry-run classification, all-or-nothing and partial execution policies, required reasons, operation preview tokens, retry/idempotency behavior, skipped-item reporting, and focused tests |
| EAPT-024 — Waitlist and unscheduled-request domain services | Complete | `WAITLIST_UNSCHEDULED_REQUEST_CONTRACT.md`, unscheduled request service, context readiness checks, permission-safe capture, availability-based candidate ranking, no-silent-scheduling guarantees, promotion planning, and focused tests |
| EAPT-025 — Scheduling engine load, concurrency, and failure tests | Complete | `SCHEDULING_ENGINE_QUALITY_GATE.md`, approved baseline coverage, peak-hour availability search test, exclusive-resource concurrency test, transaction-failure no-partial-state test, 500-item bulk dry-run test, and focused tests |
| E2 scheduling foundation gate | Ready for review | `E2_SCHEDULING_GATE_REVIEW.md`, gate-review constants, evidence map, carry-forward risks, non-claims, approval owner list, E3 handoff, and tests; database-backed adapters, live APIs, and UI workflows remain later milestones |
| EAPT-026 — Appointment read model and permission-filtered queries | Complete with initial board binding | `APPOINTMENT_READ_MODEL_CONTRACT.md`, `APPOINTMENT_READ_ROUTE_AND_BOARD_BINDING_CONTRACT.md`, appointment read repository, permission-filtered read service, appointment read API route, manager/owner/participant/viewer relationship projection, customer and vehicle masking, cancelled/window filtering, client-side board hydration, preview fallback behavior, and focused tests |
| EAPT-027 — Create, approve, edit, ownership, cancel, and reschedule commands | Complete backend boundary | `LIFECYCLE_COMMAND_EXECUTION_CONTRACT.md`, `LIFECYCLE_TRANSACTION_EXECUTION_CONTRACT.md`, `LIFECYCLE_COMMAND_ROUTE_EXECUTION_CONTRACT.md`, additive approve/edit command migration, lifecycle command planner, atomic transaction executor boundary, concrete Prisma transaction repository, command route orchestration, create draft, approve, edit, schedule, reschedule, cancel, and transfer-owner effects, hard-conflict/warning rejection, reason/follow-up requirements, reservation/task/history/command-result execution, rollback tests, and focused tests; UI wiring remains pending |
| EAPT-028 — Confirmation, attendance, no-show, and execution-state commands | Complete backend boundary with initial UI bridge | `CONFIRMATION_ATTENDANCE_EXECUTION_COMMAND_CONTRACT.md`, lifecycle command planner support for confirm, decline, check-in, no-show, start, wait, and finish, manager/owner authorization, stale-version protection, scheduled-appointment state guards, reason/follow-up requirements, optional no-show reservation release, history effects, route execution support through the EAPT-027 transaction path, focused tests, and a detail-rail Check In / No Show command bridge; live read-model data binding and final completion/outcome capture remain pending |
| EAPT-029A — New Appointment draft creation UI | Complete initial UI bridge | `APPOINTMENT_CREATE_DRAFT_UI_CONTRACT.md`, controlled New Appointment modal fields, documented creation reason, Minneapolis local date/time conversion, generated appointment number and idempotency key, `CREATE_DRAFT` command submission, signed-in owner default, and live board refresh after successful creation; staff-directory assignment, scheduling approval, resource reservation, recurrence, automation selection, and final outcome capture remain pending |
| EAPT-029B — Schedule Draft detail-rail action | Complete initial UI bridge | `APPOINTMENT_SCHEDULE_DRAFT_UI_CONTRACT.md`, Schedule Draft button for persisted draft records, disabled Check In / No Show on drafts, `SCHEDULE` command submission with appointment ID, expected version, saved start/end, scheduling timezone, command-ledger execution, and live board refresh after success; live conflict/warning preview, resource reservation selection, recurrence scheduling, and warning override UI remain pending |
| EAPT-029C — Schedule Readiness warning/block preview | Complete initial server-backed preview | `APPOINTMENT_SCHEDULE_READINESS_PREVIEW_CONTRACT.md`, schedule-readiness service, `GET /api/appointments/:id/schedule-readiness`, manager/owner authorization, location schedule visibility enforcement, hard blocks for non-draft state, missing owner, and invalid time, warnings for missing customer, vehicle, and resource context, detail-rail readiness display, hard-block client guard, and focused tests; full resource candidate selection, reservation conflict preview, recurrence scheduling, and warning override UI remain pending |
| EAPT-029D — Resource Planning preview | Complete initial server-backed preview | `APPOINTMENT_RESOURCE_PLANNING_PREVIEW_CONTRACT.md`, resource-planning service, `GET /api/appointments/:id/resource-planning`, category-based enterprise requirement recommendations, configured resource-type checks, active candidate counts, selected requirement detection, explicit configuration-needed state, detail-rail Resource Planning display, and focused tests; create/update requirements, candidate selection, live availability evaluation, and reservation commitment remain pending |
| EAPT-029E — Resource requirement attachment | Complete initial write boundary | `APPOINTMENT_RESOURCE_REQUIREMENT_ATTACHMENT_CONTRACT.md`, `POST /api/appointments/:id/resource-requirements`, expected-version guard, draft-state guard, manager/owner authorization, recommendation eligibility validation, configured resource-type validation, idempotent duplicate handling, appointment version increment, `FIELD_UPDATED` appointment history event, detail-rail Attach Requirement action, refresh of schedule readiness/resource planning, and focused tests; resource candidate selection, live availability evaluation, reservation hold/commit/release, and schedule payload reservation candidates remain pending |
| EAPT-029F — Resource candidate proposal | Complete initial proposed-selection boundary | `APPOINTMENT_RESOURCE_CANDIDATE_PROPOSAL_CONTRACT.md`, `POST /api/appointments/:id/resource-requirements/:requirementId/candidate-proposals`, candidate dropdown/action in the detail rail, active matching resource validation, expected-version guard, draft-state guard, manager/owner authorization, prior proposed candidate cancellation, `PROPOSED` reservation creation, appointment version increment, `FIELD_UPDATED` appointment history event, refresh of schedule readiness/resource planning, and focused tests; committed reservation workflow, warning override capture, and final schedule reservation candidates remain pending |
| EAPT-029G — Proposed candidate availability preview | Complete initial availability preview | `APPOINTMENT_RESOURCE_CANDIDATE_AVAILABILITY_CONTRACT.md`, `GET /api/appointments/:id/resource-candidate-availability`, proposed candidate evaluation through the resource availability service, server-side operating-window/unavailability/reservation checks, READY/WARNING/BLOCKED result display in Resource Planning, authorization checks, and focused tests; committed reservation workflow, warning override capture, staff conflict preview, and final schedule reservation candidates remain pending |
| EAPT-029H — Resource candidate hold | Complete initial proposed-to-held workflow | `APPOINTMENT_RESOURCE_CANDIDATE_HOLD_CONTRACT.md`, `POST /api/appointments/:id/resource-reservations/:reservationId/hold`, Hold Candidate action in the detail rail, immediate server-side availability recheck, expected-version guard, draft-state guard, manager/owner authorization, `PROPOSED` to `HELD` reservation update, appointment version increment, `FIELD_UPDATED` appointment history event, refresh of schedule readiness/resource planning/live board state, and focused tests; warning override capture, release/change controls, and final browser workflow coverage remain pending |
| EAPT-029I — Schedule held reservation commit | Complete initial Schedule command bridge | `APPOINTMENT_HELD_RESERVATION_SCHEDULE_COMMIT_CONTRACT.md`, server-side held-reservation candidate collection in the command execution service, transaction repository support for `HELD` to `COMMITTED` updates, duplicate committed-row prevention, Schedule command reservation effects, command-result committed reservation counts, and focused tests; warning override capture, replacement/change workflow, staff conflict preview, browser workflow coverage, and production concurrency evidence remain pending |
| EAPT-029J — Resource reservation release control | Complete initial release workflow | `APPOINTMENT_RESOURCE_RESERVATION_RELEASE_CONTRACT.md`, `POST /api/appointments/:id/resource-reservations/:reservationId/release`, Resource Planning visibility for live appointments, Release Reservation action for `HELD` and `COMMITTED` reservations, expected-version guard, active appointment-state guard, manager/owner authorization, `HELD`/`COMMITTED` to `RELEASED` reservation update, appointment version increment, `FIELD_UPDATED` appointment history event, and focused tests; explicit release-reason modal, warning override capture, staff conflict preview, browser workflow coverage, and production evidence remain pending |
| EAPT-029K — Held reservation replacement | Complete initial replacement workflow | `APPOINTMENT_RESOURCE_RESERVATION_REPLACEMENT_CONTRACT.md`, `POST /api/appointments/:id/resource-reservations/:reservationId/replace`, Replace Reservation action for draft `HELD` reservations, replacement resource validation, expected-version guard, manager/owner authorization, same-resource rejection, one-transaction release/cancel/create behavior, appointment version increment, `FIELD_UPDATED` appointment history event, and focused tests; committed scheduled resource replacement, automatic replacement hold after warning review, explicit replacement-reason modal, staff conflict preview, and browser workflow coverage remain pending |
| EAPT-029L — Resource warning override capture | Complete initial warning override workflow | `APPOINTMENT_RESOURCE_WARNING_OVERRIDE_CONTRACT.md`, `POST /api/appointments/:id/resource-reservations/:reservationId/warning-override`, Override Warning action for warning-level proposed resource candidates, manager-only authorization, expected-version guard, hard-block refusal, resource availability recheck, `WARNING_OVERRIDDEN` appointment history event, appointment version increment, and focused tests; explicit warning-reason modal, staff warning overrides, hold/schedule enforcement linkage, and browser workflow coverage remain pending |
| EAPT-029M — Resource warning hold enforcement | Complete initial warning-before-hold enforcement | `APPOINTMENT_RESOURCE_WARNING_HOLD_ENFORCEMENT_CONTRACT.md`, warning-level proposed resource candidates now require matching `WARNING_OVERRIDDEN` history before `POST /api/appointments/:id/resource-reservations/:reservationId/hold` can change them to `HELD`, while hard blocks remain rejected and ready candidates remain unaffected; persisted override summaries, legacy held warning schedule enforcement, staff warning overrides, and browser workflow coverage remain pending |
| EAPT-029N — Resource warning override visibility | Complete initial persisted visibility workflow | `APPOINTMENT_RESOURCE_WARNING_OVERRIDE_VISIBILITY_CONTRACT.md`, `GET /api/appointments/:id/resource-candidate-availability` now returns `warningOverrideRequired`, `warningOverrideSatisfied`, `warningKey`, and override-aware `canProceedToHold` per proposal, and the board renders persisted `Warning Overridden` status after refresh; denormalized reservation markers, legacy held warning schedule enforcement, staff warning visibility, and browser workflow coverage remain pending |

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
