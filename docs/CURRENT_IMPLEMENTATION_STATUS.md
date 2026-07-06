# Current Implementation Status

**Verified:** 2026-07-05  
**Purpose:** Evidence-based snapshot of the repository before Enterprise Appointment implementation  
**Supersedes:** Stale “pre-implementation” statements in older planning documents

## Quality Baseline

The following commands passed on 2026-07-05:

```text
npm run lint
npm run typecheck
npm test
npm run db:validate
```

Vitest result:

```text
57 test files passed
314 tests passed
```

Prisma client generation updated generated types but could not replace the locked Windows query-engine DLL while the existing development server was running. End-to-end tests, production build, database migration deployment, and production deployment were not rerun during this checkpoint.

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
| Appointment Board visible shell | Implemented as preview UI | `/appointments` now renders the mockup-aligned board surface with KPI cards, staff calendar columns, filters, selectable preview appointments, detail rail, linked tasks, enterprise controls, upcoming appointments, and responsive behavior; live services/APIs remain pending |

## Existing Partial or Placeholder Surfaces

| Surface | Current state |
| --- | --- |
| Appointments | Visible preview shell exists; E1 command intake API boundary exists; scheduling engine, lifecycle execution, persistence workflows, and live command-center services remain pending |
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
- Database-backed versioned appointment-template administration, recurrence persistence/materialization, warning override records, atomic reservation commitment, lifecycle execution services, command-center read services, administration UI, and persisted production Appointment workflows have not yet been implemented.
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
