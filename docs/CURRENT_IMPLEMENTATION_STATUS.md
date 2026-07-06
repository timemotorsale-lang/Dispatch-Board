# Current Implementation Status

**Verified:** 2026-07-06  
**Purpose:** Evidence-based snapshot of the repository before Enterprise Appointment implementation  
**Supersedes:** Stale “pre-implementation” statements in older planning documents

## Quality Baseline

The following commands passed on 2026-07-06:

```text
npm run lint
npm run typecheck
npm test
npm run db:validate
```

Vitest result:

```text
102 test files passed
562 tests passed
```

End-to-end tests, production build, database migration deployment, and production deployment were not rerun during this checkpoint.

## Implemented Foundation

| Area | Status | Evidence |
| --- | --- | --- |
| Next.js application scaffold | Implemented | App Router source, package scripts, shared layout, protected route group |
| PostgreSQL and Prisma | Implemented | Schema, Prisma client wiring, migrations, and seed entrypoint |
| Authentication | Implemented | Login, logout, current-user route, sessions, and protected routes |
| Users, roles, and duties | Implemented | Schema, APIs, services, policies, settings UI, and tests |
| App settings | Implemented | Timezone, business days, generation time, manager API/UI, and tests |
| Task templates | Partially implemented | Schema, API, service, validation, seed data, tests, and prototype UI exist; production template administration remains incomplete |
| Daily board generation | Implemented | Input loading, idempotent task generation, run tracking, manual trigger, scheduled route, and tests |
| Board read and UI | Implemented | Date/today APIs, grouping, filtering, responsive board, manual task creation, and tests |
| Task detail and execution | Implemented | Detail read, metadata, status, assignment, checklist, comments, activity, and responsive workflows |
| My Tasks | Implemented | Staff-focused queue, guided updates, responsive layout, and tests |
| Manager review | Implemented | Protected review workspace, assignment, approve/reopen actions, and tests |
| Activity feed | Implemented | Durable activity records, API, board panel, full activity page, and tests |
| Assignment recommendations | Implemented | Recommendation rules, explanations, manager override, and tests |
| Automated tests | Implemented | Unit, integration, and browser workflow coverage |
| Setup and release documentation | Implemented but evolving | README, setup guide, architecture, roadmap, and release checklist |
| Production deployment readiness | Not verified in this baseline | Deployment configuration exists; release checklist still requires production evidence |
| Appointment organization/location foundation | Implemented | Additive Prisma schema and migration, configured Minneapolis address/telephone/weekday hours, draft activation state, validation, General Manager policy, and focused tests |
| Appointment aggregate foundation | Implemented | Independent lifecycle states, ownership, timing, version, snapshots, exception documentation, SQL safeguards, authorization policies, and focused tests |
| Appointment participant/resource foundation | Implemented | Location access, minimum customer and vehicle identities, participant and vehicle snapshots, resource types, requirements, reservations, pools, availability windows, privacy projections, SQL safeguards, and focused tests |
| Appointment template catalog foundation | Implemented | EAPT-006 initial purpose template catalog, versioned purpose snapshot helper, template validation, outcome/reason/follow-up controls, automation defaults, and focused tests |
| Appointment-task link foundation | Implemented | EAPT-007 link types, additive schema/migration, duplicate-prevention key, explicit blocking flags, automation version fields, validation, contract documentation, and focused tests |
| Appointment audit/event foundation | Implemented | EAPT-008 appointment-scoped history events, actor and event catalogs, correlation IDs, reason and prior/new value rules, notification intent contract, additive schema/migration, validation, contract documentation, and focused tests |
| Appointment command/idempotency foundation | Implemented | EAPT-009 command ledger, command/status catalogs, organization-scoped idempotency key, request hash, optimistic version fields, retry state, result/error snapshots, additive schema/migration, validation, stale-version helper, contract documentation, and focused tests |
| Appointment command boundary | Implemented | EAPT-010 command request validation, repository contract, service boundary, API command intake route, manager/owner authorization, duplicate idempotency handling, stale-version conflict recording, boundary documentation, and focused tests |
| Appointment operations baseline | Implemented | EAPT-011 production volume, retention, archive, RTO, RPO, performance, query-coverage, and signoff-owner baseline is documented in `docs/appointments/PRODUCTION_OPERATIONS_BASELINE.md` with protected constants and focused tests |
| Appointment migration readiness | Implemented | EAPT-012 migration, seed, rollback, roll-forward, Prisma generation, production seed boundary, compatibility, and recovery reconciliation strategy is documented in `docs/appointments/MIGRATION_SEED_ROLLBACK_STRATEGY.md` with protected constants and focused tests |
| Appointment E1 gate review | Ready for approval | `docs/appointments/E1_FOUNDATION_GATE_REVIEW.md` packages E1 evidence, carry-forward risks, non-claims, approval owners, and E2 handoff with protected constants and focused tests |
| Appointment location-time service | Implemented | EAPT-013 location-local date/minute conversion, effective operating-window resolution, closure overlap detection, schedule-candidate evaluation, daylight-saving handling, service contract, and focused tests |
| Appointment resource availability service | Implemented | EAPT-014 resource availability service evaluates effective windows, capacity overrides, held/committed reservations, buffers, outages, capacity reductions, warning/hard-block severity, service contract, and focused tests |
| Appointment staff availability service | Implemented | EAPT-015 staff availability service evaluates active staff, location access grants, owner/participant/manager eligibility, staff-resource matching, staff reservations/absence availability, warning/hard-block severity, service contract, and focused tests |
| Appointment duration and buffer rules | Implemented | EAPT-016 duration rule service resolves template defaults, documented overrides, manager-approval requirements, location start intervals, appointment windows, and reserved resource footprints with focused tests |
| Appointment recurrence service | Implemented as service boundary | EAPT-017 recurrence service expands daily, weekly, and monthly series, preserves local time across daylight-saving changes, applies reasoned skipped/rescheduled occurrence exceptions, bounds expansion horizons, and previews safe series-edit scopes |
| Appointment hard-conflict service | Implemented as service boundary | EAPT-018 hard-conflict service evaluates inactive templates, missing context, invalid time, location closure/hours, mandatory resource hard blocks, owner/staff authorization, warning-only exclusions, and recurring occurrence hard failures with focused tests |
| Appointment warning override service | Implemented as service boundary | EAPT-019 warning service extracts warning-only staff/resource issues, surfaces duration override approvals, validates manager-only warning overrides with reason code and notes, produces audit-shaped override records, and keeps hard blocks non-overridable |
| Appointment reservation commit service | Implemented as service boundary | EAPT-020 resource reservation service locks resource IDs deterministically, re-checks current availability inside the protected boundary, prevents exclusive overbooking, avoids partial creates, supports held/committed capacity consumption, and releases reservations with documented reasons |
| Appointment availability search service | Implemented as service boundary | EAPT-021 availability search service generates bounded local-date candidates from location windows, evaluates slots through hard-conflict and warning rules, separates available/warning/blocked results, and keeps search behavior aligned with commit-time checks |
| Appointment reschedule impact service | Implemented as service boundary | EAPT-022 reschedule preview service reports prior/new times, proposed resource windows, reservation release/recreate impacts, hard conflicts, warnings, recurrence scope effects, blocked/warning occurrence keys, and preserved completed/cancelled occurrences |
| Appointment bulk reschedule service | Implemented as service boundary | EAPT-023 bulk service classifies dry-run targets, supports all-or-nothing and partial execution policies, requires reasoned execution, records skipped/succeeded/failed summaries, and enforces operation ID plus preview-token retry safety |
| Appointment waitlist and unscheduled-request service | Implemented as service boundary | EAPT-024 waitlist service captures unscheduled demand without scheduling, tracks missing context, requires schedule access, ranks availability candidates, and prepares explicit promotion plans that still require appointment commands |
| Appointment scheduling engine quality gate | Implemented as automated coverage | EAPT-025 quality tests cover approved baseline values, peak-hour availability search under p95 target, exclusive-resource concurrency protection, transaction-failure no-partial-state behavior, and 500-item bulk dry-run capacity |
| Appointment E2 scheduling foundation gate review | Ready for review | `docs/appointments/E2_SCHEDULING_GATE_REVIEW.md` packages EAPT-013 through EAPT-025 evidence, carry-forward risks, non-claims, approval owners, and E3 handoff with protected constants and focused tests |
| Appointment read model and permission-filtered queries | Implemented as service boundary | EAPT-026 read service enforces location schedule access, projects manager/owner/participant/location-viewer visibility, masks customer and vehicle fields by policy, filters cancelled/out-of-window appointments, and is documented in `docs/appointments/APPOINTMENT_READ_MODEL_CONTRACT.md` with focused tests |
| Appointment read API and board binding | Implemented as API/UI boundary | EAPT-026 read binding adds `GET /api/appointments`, defaults to the approved Minneapolis location/day window, uses the timezone-safe location-time service, hydrates `/appointments` from persisted read-model rows when available, preserves preview fallback when no persisted appointments exist, and is documented in `docs/appointments/APPOINTMENT_READ_ROUTE_AND_BOARD_BINDING_CONTRACT.md` |
| Appointment lifecycle command execution planning | Implemented as service boundary | EAPT-027 adds approve/edit command values and produces atomic effect plans for create draft, approve, edit, schedule, reschedule, cancel, and transfer-owner commands, including authorization, stale-version protection, hard-conflict/warning rejection, reservation release/commit effects, task-link effects, history effects, and command-result snapshots |
| Appointment lifecycle transaction execution boundary | Implemented as service boundary | EAPT-027 transaction executor applies executable lifecycle plans as one protected unit across appointment, reservation, task-link, history, and command-result effects, records rejected plans as failed commands without side effects, proves rollback behavior when later transaction steps fail, and includes a concrete Prisma transaction repository for appointment, reservation, task-link, history, and command-ledger persistence |
| Appointment lifecycle command route execution | Implemented as backend boundary | EAPT-027 command route orchestration submits supported lifecycle commands through the ledger boundary, skips duplicates/conflicts, builds lifecycle plans, executes through the transaction executor and Prisma adapter, and returns execution results in the API response |
| Appointment confirmation, attendance, and execution commands | Implemented as backend boundary | EAPT-028 extends lifecycle command execution to confirm, decline, check in, record no-show, start, wait, and finish appointments with manager/owner authorization, stale-version protection, scheduled-state guards, required reason/follow-up documentation where applicable, optional no-show reservation release, history effects, route execution support, and focused tests |
| Appointment draft creation UI | Implemented as initial UI command bridge | EAPT-029A New Appointment modal submits `CREATE_DRAFT` through the live command route with category, title, customer snapshot, vehicle snapshot, Minneapolis date/time, duration, documented reason, generated appointment number, generated idempotency key, signed-in owner default, and live board refresh after success |
| Appointment draft scheduling UI | Implemented as initial UI command bridge | EAPT-029B detail rail exposes Schedule Draft for persisted draft appointments, disables Check In and No Show while an appointment is still draft, submits `SCHEDULE` with appointment ID, expected version, saved start/end, and scheduling timezone, and refreshes from the live read model after success |
| Appointment schedule readiness preview | Implemented as initial API/UI boundary | EAPT-029C adds a server-backed readiness preview for persisted draft appointments, exposes `GET /api/appointments/:id/schedule-readiness`, enforces schedule visibility plus manager/owner authority, reports hard blocks and warnings, renders Schedule Readiness in the detail rail, and stops Schedule Draft when hard blocks exist |
| Appointment resource planning preview | Implemented as initial API/UI boundary | EAPT-029D adds a server-backed resource-planning preview for persisted draft appointments, exposes `GET /api/appointments/:id/resource-planning`, infers enterprise resource requirements from appointment category, checks configured resource types and active location resources, detects selected requirements, renders Resource Planning in the detail rail, and reports configuration gaps explicitly |
| Appointment resource requirement attachment | Implemented as initial write boundary | EAPT-029E adds `POST /api/appointments/:id/resource-requirements`, attaches server-recommended requirements to persisted draft appointments, enforces expected version, manager/owner authority, recommendation eligibility, and configured resource type, increments appointment version, writes `FIELD_UPDATED` history, and exposes Attach Requirement in the detail rail |
| Appointment resource candidate proposal | Implemented as initial proposed-selection boundary | EAPT-029F adds `POST /api/appointments/:id/resource-requirements/:requirementId/candidate-proposals`, validates active matching resources, creates non-capacity-consuming `PROPOSED` reservations, cancels prior proposed candidates for the same requirement, increments appointment version, writes `FIELD_UPDATED` history, and exposes candidate dropdown plus Propose Candidate in the detail rail |
| Appointment proposed candidate availability preview | Implemented as initial API/UI boundary | EAPT-029G adds `GET /api/appointments/:id/resource-candidate-availability`, evaluates persisted `PROPOSED` reservations through the resource availability service, reports READY/WARNING/BLOCKED, keeps proposed reservations non-capacity-consuming, and displays availability in the Resource Planning detail rail |
| Appointment resource candidate hold | Implemented as initial write boundary | EAPT-029H adds `POST /api/appointments/:id/resource-reservations/:reservationId/hold`, re-checks availability before writing capacity-consuming state, changes `PROPOSED` reservations to `HELD`, enforces expected version and manager/owner authority, increments appointment version, writes `FIELD_UPDATED` history, and exposes Hold Candidate in the detail rail |
| Appointment held reservation schedule commit | Implemented as initial command execution bridge | EAPT-029I loads appointment-held reservations server-side during `SCHEDULE`, passes them into lifecycle reservation effects, updates existing `HELD` reservation rows to `COMMITTED` instead of creating duplicate committed rows, and records committed reservation counts in command execution results |
| Appointment resource reservation release control | Implemented as initial API/UI boundary | EAPT-029J adds `POST /api/appointments/:id/resource-reservations/:reservationId/release`, releases `HELD` and `COMMITTED` reservations from active appointments, enforces expected version, manager/owner authority, reason code/notes, appointment version increment, `FIELD_UPDATED` history, and exposes Release Reservation in the Resource Planning detail rail |
| Appointment held reservation replacement workflow | Implemented as initial API/UI boundary | EAPT-029K adds `POST /api/appointments/:id/resource-reservations/:reservationId/replace`, replaces draft `HELD` reservations with a different active resource candidate, releases the old hold, cancels prior proposals, creates a replacement `PROPOSED` reservation, increments appointment version, writes `FIELD_UPDATED` history, and exposes Replace Reservation in the Resource Planning detail rail |
| Appointment resource warning override capture | Implemented as initial API/UI boundary | EAPT-029L adds `POST /api/appointments/:id/resource-reservations/:reservationId/warning-override`, records manager-only `WARNING_OVERRIDDEN` history for warning-level proposed resource candidates, rejects hard blocks, enforces expected version and reason documentation, rechecks availability server-side, and exposes Override Warning in the Resource Planning detail rail |
| Appointment resource warning hold enforcement | Implemented as initial service/API boundary | EAPT-029M requires a matching `WARNING_OVERRIDDEN` appointment history event before a warning-level `PROPOSED` resource candidate can become `HELD`, keeps hard blocks non-overridable, leaves ready candidates unaffected, maps missing override attempts to a user-correctable hold error, and is covered by focused service and route tests |
| Appointment resource warning override visibility | Implemented as initial API/UI boundary | EAPT-029N extends proposed-candidate availability with persisted warning override fields, returns override-aware `canProceedToHold`, looks up matching `WARNING_OVERRIDDEN` history by warning key, and lets the board render `Warning Overridden` after refresh |
| Appointment resource action reason fields | Implemented as initial UI boundary | EAPT-029O adds board-visible reason fields for warning override, held/committed release, and held replacement, requires those notes before submission, combines user-entered explanation with operational context, and clears the specific reason field after success |
| Appointment staff conflict preview | Implemented as initial API/UI boundary | EAPT-029P adds `GET /api/appointments/:id/staff-conflicts`, evaluates owner-staff eligibility and availability through the staff availability service, surfaces ready/warning/blocked results in the detail rail, and keeps participant-staff expansion pending |
| Appointment staff warning override and schedule enforcement | Implemented as initial API/UI/command boundary | EAPT-029Q adds `POST /api/appointments/:id/staff-conflicts/override`, records manager-only `WARNING_OVERRIDDEN` history for owner-staff warning conflicts, shows persisted staff override status in Staff Conflict Preview, and injects unresolved owner-staff warnings into Schedule Draft command execution |
| Appointment scheduled committed resource replacement | Implemented as initial API/UI boundary | EAPT-029R extends `POST /api/appointments/:id/resource-reservations/:reservationId/replace` so scheduled appointments can replace `COMMITTED` reservations with a cleanly available committed resource in one transaction, exposes replacement controls for persisted live appointments, preserves draft held replacement behavior, and records reasoned `FIELD_UPDATED` history |
| Appointment participant staff conflict preview | Implemented as initial API/UI/command boundary | EAPT-029S extends `GET /api/appointments/:id/staff-conflicts` so required internal-user appointment participants are evaluated alongside the owner, returns aggregate and per-staff checks, renders every staff check in the detail rail, and lets Schedule Draft consume the aggregate staff result |
| Appointment participant staff warning override enforcement | Implemented as initial API/UI/command boundary | EAPT-029T extends staff warning override governance to required internal participants, records role-aware warning override history, shows participant override satisfaction in Staff Conflict Preview, and makes Schedule Draft reject unresolved participant staff warnings |
| Appointment Board visible shell | Implemented as preview UI with live binding and command bridge | `/appointments` now renders the mockup-aligned board surface with KPI cards, staff calendar columns, filters, selectable appointments, detail rail, linked tasks, enterprise controls, upcoming appointments, responsive behavior, live read-model hydration when persisted records exist, preview fallback when none exist, Check In / No Show controls wired to the live command API when persisted appointment record IDs and versions are available, draft creation, draft scheduling, schedule-readiness preview, owner and participant staff conflict preview, owner/participant staff warning override/enforcement, resource-planning preview, recommended resource requirement attachment, proposed resource candidate selection, proposed-candidate availability preview, resource candidate hold, Schedule command held-reservation commit, held/committed reservation release, held-reservation replacement, scheduled committed reservation replacement, resource warning override capture, warning-before-hold enforcement, persisted warning override visibility, and explicit resource action reason fields; browser workflows and production evidence remain pending |

## Existing Partial or Placeholder Surfaces

| Surface | Current state |
| --- | --- |
| Appointments | Visible preview shell exists; E1 command intake API boundary exists; E2 scheduling service boundaries exist; EAPT-026 read API and initial board hydration exist; EAPT-027/EAPT-028 lifecycle command execution routes exist for supported backend commands; the detail rail has Schedule Draft, Schedule Readiness, Staff Conflict Preview, Resource Planning, Attach Requirement, Propose Candidate, proposed-candidate availability, Hold Candidate, Release Reservation, Replace Reservation, Override Warning, Override Staff Warning, required reason fields for warning/release/replacement, and safe Check In / No Show command bridges; New Appointment can create persisted draft records; Schedule Draft now commits held reservations server-side; scheduled committed resource reservations can now be replaced with cleanly available committed replacements; warning-level resource candidates now require override history before hold and show persisted override status after refresh; unresolved owner/participant staff warnings now block Schedule Draft until overridden, and participant staff warning overrides are role-aware; warning-level committed replacement override workflow, staff reassignment controls, reason-code catalog/templates, browser workflows, final completion/outcome capture, and production evidence remain pending |
| Customers | Placeholder guidance page; no enterprise customer subsystem |
| Vehicles | Placeholder guidance page; no enterprise vehicle subsystem |
| Reports | Placeholder guidance page; no enterprise reporting subsystem |
| Tasks landing page | Shared placeholder/entry surface; live task detail, My Tasks, board, and manager review exist elsewhere |
| Task-template administration | Production API and service foundation with a prototype interface; not yet a completed production administration workflow |

## Enterprise Appointment Boundary

The approved Enterprise Appointment Release 1.0 program is documented in `docs/appointments/`.

At this baseline:

- E0 product direction is approved.
- E1 configuration baseline and initial template catalog exist.
- EAPT-001 repository reconciliation is complete with this document and linked status updates.
- EAPT-002 architecture decisions are accepted.
- EAPT-003 organization/location foundation is implemented.
- EAPT-004 Appointment aggregate foundation is implemented.
- EAPT-005 participant, customer, vehicle, location-access, privacy, and resource foundation is implemented.
- E2 scheduling foundation service boundaries EAPT-013 through EAPT-025 are implemented and ready for review; concrete database adapters, live APIs, and UI workflows remain pending.
- EAPT-026 appointment read model, permission-filtered query foundation, read API route, and initial Appointment Board hydration are implemented.
- EAPT-027 lifecycle command execution planning, transaction execution boundaries, approve/edit command expansion, concrete Prisma transaction adapter, and lifecycle command route orchestration are implemented as backend boundaries.
- EAPT-028 confirmation, attendance, no-show, and execution-state command planning and route execution are implemented as backend boundaries.
- EAPT-029A initial New Appointment draft creation is implemented as a UI command bridge.
- EAPT-029B initial Schedule Draft action is implemented as a UI command bridge.
- EAPT-029C initial Schedule Readiness warning/block preview is implemented as a server-backed API/UI boundary.
- EAPT-029D initial Resource Planning preview is implemented as a server-backed API/UI boundary.
- EAPT-029E initial Resource Planning requirement attachment is implemented as a guarded write boundary.
- EAPT-029F initial Resource Planning candidate proposal is implemented as a guarded write boundary.
- EAPT-029G initial proposed resource candidate availability preview is implemented as a server-backed API/UI boundary.
- EAPT-029H initial proposed-to-held resource reservation workflow is implemented as a guarded write boundary.
- EAPT-029I initial Schedule command held-reservation commit bridge is implemented.
- EAPT-029J initial held/committed resource reservation release control is implemented.
- EAPT-029K initial held-reservation replacement workflow is implemented.
- EAPT-029L initial resource warning override capture is implemented.
- EAPT-029M initial warning-before-hold enforcement is implemented.
- EAPT-029N initial persisted warning override visibility is implemented.
- EAPT-029O initial explicit resource action reason fields are implemented.
- EAPT-029P initial owner-staff conflict preview is implemented.
- EAPT-029Q initial owner-staff warning override and Schedule Draft enforcement is implemented.
- EAPT-029R initial scheduled committed resource replacement is implemented.
- EAPT-029S initial participant staff conflict preview is implemented.
- EAPT-029T initial participant staff warning override enforcement is implemented.
- Database-backed versioned appointment-template administration, recurrence persistence/materialization, availability-search API/UI, waitlist persistence/queues, reschedule/bulk execution persistence, warning-level committed replacement override workflow, staff reassignment controls, reason-code catalog/templates, final completion/outcome capture, full command-center UI wiring, administration UI, browser workflow tests, and persisted production Appointment workflows have not yet been implemented.
- The existing `/appointments` route now contains the mockup-aligned preview shell and is the intended UI boundary for the next live-service slices.

## Current Execution Order

1. Complete and accept Appointment architecture decisions.
2. Finalize E1 domain contracts and currently available configuration.
3. Implement the E1 schema, policy, validation, audit, and migration foundation in reviewable slices.
4. Continue through E2–E10 using the Appointment implementation roadmap and milestone gates.

## Baseline Change Rule

Update this snapshot whenever:

- A major legacy Dispatch Board capability changes status.
- An Enterprise Appointment milestone passes.
- Production deployment or release evidence changes.
- A placeholder surface becomes a live production workflow.
