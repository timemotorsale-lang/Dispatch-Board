# Appointment Command Center Roadmap

**Program:** Enterprise Appointment Command Center  
**Target release:** Enterprise Release 1.0  
**Current roadmap date:** 2026-07-06  
**Product baseline:** E0 approved on 2026-07-05  
**Primary implementation surface:** `/appointments`  
**Visual source of truth:** `docs/IMAGES_CALENDAR.png`  
**Detailed source folder:** `docs/appointments/`

## 1. Executive summary

The Appointment Board has moved beyond a static mockup. It now has a real live-command foundation with appointment creation, scheduling, unscheduled draft handling, staff conflict checks, seeded staff schedulable resources, resource planning, resource proposal/hold/release/replacement workflows, outcome capture, follow-up automation, linked task display and navigation, task-detail create-appointment flow, Appointment Board handoff, activity-feed visibility for appointment history, audit history, version checks, and server-side authorization.

However, the full Enterprise Release 1.0 roadmap is not complete yet. The remaining work is mostly enterprise completion work: richer linked-work actions, automation administration, full command-center views, admin settings, notifications, analytics, accessibility, security, production hardening, and rollout.

## 2. Current status at a glance

| Area | Status | Plain-English meaning |
| --- | --- | --- |
| Product direction | Approved | The product purpose and enterprise scope are approved. |
| Appointment foundation | Strongly implemented | Core model, commands, permissions, audit, scheduling services, and resource/staff foundations exist. |
| Appointment Board UI | In progress with substantial live workflow | The visible board exists and many detail-rail workflows are live. |
| Enterprise admin | In progress / partial | Managers now have Appointment Settings, a versioned Catalog + Automation workspace, and an Automation Operations Console for location profile, phone, hours, closures, special-hours calendar preview, resource controls, purpose templates, outcome/follow-up/reason catalogs, code deprecation/reactivation with replacement guidance, rule hooks, simulation, draft/active catalog versions, required change reasons, rule lifecycle, health, failure queue, retry/replay readiness, preview-safe configuration export, import-preview validation, redaction reporting, and audit controls. Recurring holiday templates, deeper runtime execution, notifications, and import apply remain. |
| Task-to-appointment orchestration | In progress with live vertical slice | Follow-up automation, task-detail create-linked-draft workflow, live browser proof, board scheduling handoff, and appointment-to-task navigation exist. Automation-rule authoring/runtime remains. |
| Reporting and analytics | Pending | KPI definitions, reporting models, exports, and reconciliation are not built yet. |
| Notifications | Pending | Internal notifications and future integration contracts remain. |
| Release readiness | Pending | Browser tests, accessibility, security, load, deployment, backup/restore, and pilot evidence remain. |

## 3. Progress dashboard

This is an approximate package-level view from the enterprise roadmap.

| Milestone | Packages | Complete | In progress / partial | Not started | Gate status |
| --- | ---: | ---: | ---: | ---: | --- |
| E0 | Product approval | Complete | 0 | 0 | Approved |
| E1 | 12 | 11 | 1 | 0 | Mostly complete / gate-ready |
| E2 | 13 | 13 | 0 | 0 | Mostly complete / ready for review |
| E3 | 13 | 6 | 2 | 5 | In progress |
| E4 | 14 | 0 | 1 | 13 | In progress, not gate-ready |
| E5 | 11 | 0 | 4 | 7 | In progress, not gate-ready |
| E6 | 9 | 0 | 0 | 9 | Not started |
| E7 | 8 | 0 | 0 | 8 | Not started |
| E8 | 8 | 0 | 0 | 8 | Not started |
| E9 | 16 | 0 | 0 | 16 | Not started |
| E10 | 10 | 0 | 0 | 10 | Not started |

Approximate package-level progress:

- Complete: 30 of 114 roadmap packages
- In progress / partial: 8 of 114 roadmap packages
- Not started: 76 of 114 roadmap packages

Important context: the package count understates the depth of the work already completed in E3/E4 because EAPT-029 has been broken into many smaller implemented slices through EAPT-029AG. The Appointment Board has significantly more live workflow behavior than the simple parent-package count suggests.

## 4. Implemented so far

### 4.1 Product and planning

- E0 product direction approved.
- Enterprise Release 1.0 scope defined.
- External SMS, email, external calendar, CRM, and DMS integrations deferred to a later integration program.
- Approved visual source of truth copied to `docs/IMAGES_CALENDAR.png`.
- Enterprise planning documents created under `docs/appointments/`.
- Remaining work dashboard created at `docs/appointments/REMAINING_WORK_DASHBOARD.md`.

### 4.2 Foundation

- Organization, Minneapolis location, timezone, address, phone, and weekday operating-hours foundation.
- Seeded schedulable staff resources and staff operating windows for active Minneapolis users.
- Appointment aggregate foundation.
- Independent lifecycle state dimensions.
- Ownership, versioning, snapshots, audit, and reason models.
- Participant, customer, vehicle, privacy, and resource foundations.
- Appointment-task link foundation.
- Appointment history/audit event foundation.
- Command idempotency and retry foundation.
- Repository/service/API command boundary.
- Migration, rollback, retention, archive, RTO, and RPO planning.

### 4.3 Scheduling engine

- Location time and DST-safe conversion.
- Operating hours and closure handling.
- Staff availability and location eligibility.
- Resource capacity, availability, outages, buffers, and hard/warning conflict policies.
- Appointment duration and buffer rules.
- Recurrence expansion service boundary.
- Server-side hard-conflict evaluation.
- Server-side warning evaluation and warning override model.
- Atomic resource reservation service boundary.
- Availability search service boundary.
- Reschedule impact preview service boundary.
- Bulk reschedule service boundary.
- Waitlist and unscheduled-request service boundary.
- Scheduling engine quality tests.

### 4.4 Live Appointment Board workflows

- Mockup-aligned Appointment Board shell.
- Live appointment read-model binding.
- New appointment draft creation.
- Schedule Draft command bridge.
- Dedicated unscheduled/draft lane.
- Unscheduled draft scheduling form.
- Proposed-time schedule readiness preview.
- Proposed-time staff conflict preview.
- Proposed-time staff warning override.
- Proposed-time resource candidate availability preview.
- Proposed-time resource proposal and hold mutation.
- Staff conflict preview for owner and required participants.
- Owner and participant staff warning override/enforcement.
- Owner reassignment.
- Resource planning preview.
- Resource requirement attachment.
- Resource candidate proposal.
- Resource candidate availability preview.
- Resource candidate hold.
- Held reservation commit during Schedule.
- Held/committed resource release.
- Held and scheduled committed resource replacement.
- Warning-level committed resource replacement acceptance.
- Resource warning override capture.
- Resource warning-before-hold enforcement.
- Persisted resource warning override visibility.
- Explicit resource action reason fields.
- Outcome and follow-up capture.
- Outcome-driven follow-up task automation.
- Outcome-driven follow-up draft appointment automation.
- Generated draft visibility and selection after outcome automation.
- Initial linked-task read model and real linked-task detail rows in the board.
- Direct appointment-to-task navigation from linked task rows.
- Task-detail create linked draft appointment workflow through the audited command ledger.
- Task-detail to Appointment Board handoff after creating a linked draft.
- Live browser proof for task-created draft scheduling through the Appointment Board.
- Server-side and UI-level guard against scheduling/rescheduling into a past start time.
- Appointment history events merged into the Activity Feed with appointment labels, tones, filters, and context.
- Appointment Settings admin foundation at `/settings/appointments` for manager-only location profile, address, phone, operating hours, scheduling status, resource summaries, catalogs, and automation readiness.
- Appointment Settings V2 controls for location closure create/edit/delete, holiday/planned/emergency closure windows, resource status/capacity/conflict policy updates, and resource outage/capacity-reduction windows.
- Appointment Board header and create/schedule payload defaults now read from the admin location foundation with safe Lake Street fallbacks.
- Appointment Catalog + Automation admin workspace at `/settings/appointments/catalog` for manager-only purpose template review, outcome/follow-up/reason catalog visibility, structured code add/rename/remove/deprecate/reactivate controls, replacement-code guidance, deprecated-code warnings, automation rule hook visibility, safe automation simulation, draft saves, validation, activation, and catalog change reasons.
- Appointment Automation Operations Console at `/settings/appointments/automation` for manager-only rule lifecycle, health metrics, failure/review queue foundation, retry/replay controls, and audit-event visibility.
- Versioned appointment catalog editor with durable Prisma schema/migration, active/draft catalog versions, append-only catalog change events, required manager reason capture, draft validation, draft save, and activation.

### 4.5 Current validation evidence

Latest full-suite validation:

```text
npm run lint
npm run typecheck
npm test
npm run db:validate

115 test files passed
667 tests passed
```

Focused validation during the Appointment Automation Operations Console block:

```text
npm run typecheck
npm test -- appointment-catalog-automation-admin-service.test.ts appointment-catalog-automation-admin-route.test.ts appointment-catalog-automation-panel.test.tsx
npm run lint
npm run db:validate
npm test

Focused appointment-catalog service, route, UI, type, lint, schema, and full-suite validation passed.
```

Not yet complete:

- Playwright end-to-end suite execution in this workstation. The task-to-appointment e2e spec exists, but local Playwright Chromium is not installed.
- Production build evidence.
- Production deployment evidence.
- Accessibility audit.
- Security/privacy review evidence.
- Load/soak production-readiness evidence.

## 5. Milestone roadmap

## E0 — Product direction

**Goal:** Approve the enterprise product direction and day-one scope.

**Status:** Complete.

Approved direction:

- Appointment Command Center is enterprise Release 1.0 work, not an MVP-only experiment.
- All planned internal enterprise capabilities are day-one scope.
- Any task can create a linked appointment when work requires meeting someone.
- Explainable automation rules may create appointments automatically.
- Only a manager or the appointment owner can change an appointment.
- Staff, customers, vehicles, service bays, rooms, equipment, locations, and configured resources can participate in scheduling.
- Conflicts must warn or block according to policy.
- Appointment information remains governed inside Dispatch Board.
- External communications/integrations are deferred.
- Every important action is documented.
- Reporting, enterprise security, accessibility, reliability, audit, backup, and rollout controls are required.

## E1 — Enterprise architecture and domain foundation

**Goal:** Establish durable organization, location, appointment, resource, policy, audit, migration, and contract foundations.

**Current status:** Mostly complete / gate-ready, with one partial item.

| ID | Work package | Status |
| --- | --- | --- |
| EAPT-001 | Reconcile product, architecture, roadmap, and implementation status | Complete |
| EAPT-002 | Record architecture decisions | Complete |
| EAPT-003 | Organization, Minneapolis location, timezone, hours, closure, holiday model | Complete |
| EAPT-004 | Appointment aggregate and independent state dimensions | Complete |
| EAPT-005 | Participants, customers, vehicles, generalized resources | Complete |
| EAPT-006 | Purpose, template, outcome, reason, versioning model | In progress / partial |
| EAPT-007 | Appointment-task relationship and link types | Complete |
| EAPT-008 | Audit, activity, correlation, notification event contracts | Complete |
| EAPT-009 | Concurrency, idempotency, transaction, retry boundaries | Complete |
| EAPT-010 | Repository, service, validation, policy, API boundaries | Complete |
| EAPT-011 | Production-volume, retention, indexing, archive, RTO/RPO | Complete |
| EAPT-012 | Migration, seed, rollback, compatibility strategy | Complete |

Remaining E1 decision:

- Decide whether database-backed template/outcome/reason administration must be finished before E1 gate approval, or whether it formally moves into E5 administration work.

## E2 — Scheduling, availability, recurrence, and capacity engine

**Goal:** Build the authoritative scheduling engine for valid times, people, resources, recurrence, warnings, and hard blocks.

**Current status:** Mostly complete / ready for review.

| ID | Work package | Status |
| --- | --- | --- |
| EAPT-013 | Location time, operating hours, closures, timezone services | Complete |
| EAPT-014 | Resource capacity, availability, outage services | Complete |
| EAPT-015 | Staff availability and location eligibility | Complete |
| EAPT-016 | Duration, preparation, cleanup buffer rules | Complete |
| EAPT-017 | Recurrence definitions and occurrence exceptions | Complete as service boundary |
| EAPT-018 | Server-side hard-conflict evaluation | Complete |
| EAPT-019 | Warning evaluation and manager override records | Complete |
| EAPT-020 | Atomic resource reservation and release behavior | Complete |
| EAPT-021 | Availability search for people and resources | Complete as service boundary |
| EAPT-022 | Rescheduling and recurrence-change impact preview | Complete |
| EAPT-023 | Bulk-rescheduling dry run and controlled execution | Complete as service boundary |
| EAPT-024 | Waitlist and unscheduled-request domain services | Complete as service boundary |
| EAPT-025 | Scheduling load, concurrency, and failure tests | Complete |

Remaining E2 work:

- Review and approve the E2 gate package.
- Connect service boundaries to more complete UI workflows in E4/E5.
- Reconfirm production-like performance later during E9.

## E3 — Lifecycle, task orchestration, audit, and automation

**Goal:** Deliver complete appointment operation from draft through outcome and follow-up, safely connected to tasks.

**Current status:** In progress.

| ID | Work package | Status |
| --- | --- | --- |
| EAPT-026 | Appointment read model and permission-filtered queries | Complete |
| EAPT-027 | Create, approve, edit, ownership, cancel, reschedule commands | Mostly complete as backend command foundation |
| EAPT-028 | Confirmation, attendance, execution, completion commands | Complete initial backend boundary |
| EAPT-029 | Outcomes, reasons, corrections, follow-up dispositions | In progress; many board slices complete through EAPT-029AG |
| EAPT-030 | Appointment-task link persistence, read models, and handoff navigation | Complete initial live slice; linked-task read/detail and appointment-to-task navigation implemented |
| EAPT-031 | Appointment-template task blueprint generation | Not started |
| EAPT-032 | Create appointment from any task workflow | Complete initial task-detail workflow with live browser proof; automated e2e execution awaits local Playwright browser install |
| EAPT-033 | Task-to-appointment automation runtime | Not started / partial outcome automation exists |
| EAPT-034 | Rule versioning, simulation, activation, pause, retirement | Not started |
| EAPT-035 | Automation review, failure, retry, replay services | Not started |
| EAPT-036 | Activity history for appointment and automation events | Complete initial Activity Feed merge for appointment history; automation failure/replay visibility remains |
| EAPT-037 | Optimistic concurrency on every mutation | Partial / implemented on many paths |
| EAPT-038 | Lifecycle, permission, orchestration, audit, automation tests | Partial |

Current E3 next steps:

1. Enable local Playwright browser installation and run the authored task detail to linked draft to Appointment Board schedule e2e test.
2. Automation failure/retry/replay visibility.
3. Availability-assisted scheduling recommendations for unscheduled drafts.
4. Automation rule authoring/simulation/activation controls.
5. Template-driven task blueprint generation.

Superseded prior E3 next steps:

1. Browser workflow coverage for task detail → create linked draft → schedule from the Appointment Board.
2. Activity-feed emission for generated tasks and generated appointments.
3. Complete linked-work actions beyond the initial read-only detail panel.
4. Automation failure/retry/replay visibility.
5. Availability-assisted scheduling recommendations for unscheduled drafts.

## E4 — Appointment Command Center operating views

**Goal:** Deliver the enterprise manager/owner operating interface.

**Current status:** In progress, not gate-complete.

| ID | Work package | Status |
| --- | --- | --- |
| EAPT-039 | Information architecture and responsive interaction specification | Partial |
| EAPT-040 | Route shell, access control, navigation, global error boundaries | Partial |
| EAPT-041 | Date, location, resource, search, filter, saved-view controls | Partial |
| EAPT-042 | KPI strip with reconciled definitions and drill-down filters | Partial |
| EAPT-043 | Today queue and Agenda view | Not started |
| EAPT-044 | Day schedule with staff and resource modes | Partial |
| EAPT-045 | Week view | Not started |
| EAPT-046 | Month view | Not started |
| EAPT-047 | Staff, vehicle, resource, and location schedule views | Not started |
| EAPT-048 | Appointment detail workspace and sticky action region | Partial |
| EAPT-049 | History, linked work, conflict, outcome, follow-up panels | Partial |
| EAPT-050 | Waitlist, no-show, follow-up, confirmation, automation review, failure queues | Not started |
| EAPT-051 | Loading, empty, stale, partial-failure, error states | Partial |
| EAPT-052 | Component, integration, accessibility, visual regression, browser tests | Not started |

Recommended E4 next steps:

1. Browser test for create draft → propose/hold resource → schedule draft → start/finish/outcome.
2. History/activity panel in the detail rail.
3. Linked work panel backed by appointment-task read model.
4. Exception queues for follow-up, no-show, unscheduled drafts, and automation failures.
5. Week/month/agenda view expansion after the core day workflow is reliable.

## E5 — Creation, template, resource, and policy administration

**Goal:** Let authorized managers/admins configure appointment behavior without code changes.

**Current status:** In progress / partial.

| ID | Work package | Status |
| --- | --- | --- |
| EAPT-053 | Purpose-first appointment creation workflow | Partial |
| EAPT-054 | Participant, customer, vehicle, location, resource selection | Not started |
| EAPT-055 | Recurrence and occurrence-exception controls | Not started |
| EAPT-056 | Conflict resolution and manager override experience | Partial |
| EAPT-057 | Bulk rescheduling and closure-impact workspace | Not started |
| EAPT-058 | Purpose, template, outcome, reason administration | Partial; manager-visible purpose templates, outcome/follow-up/reason catalogs, structured outcome/follow-up/reason add/rename/remove/deprecate/reactivate editors, replacement guidance, deprecated-code validation warnings and new-configuration guards, live appointment-count usage analytics, highest-risk code ranking, code reference counts, manager-ready code impact reports, purpose usage impact, code labels/descriptions in catalog snapshots, durable catalog version table, draft editing, validation, required reason capture, approval review workflow, activation approval gate, change events, purpose usage/reference warnings, purpose create, duplicate, deprecate, reactivate, and draft-only delete protection exist. Deeper usage trend analytics and exportable impact report files remain. |
| EAPT-059 | Location, hours, closures, resource, capacity, availability administration | Partial; location profile, phone, weekday hours, scheduling status, closure create/edit/delete, special-hours calendar preview, resource-impact day summaries, resource status/capacity/conflict policy, resource outage/capacity-reduction windows, resource summary, and board wiring implemented. Recurring holiday templates, deeper per-resource calendars, and capacity overrides by day remain. |
| EAPT-060 | Automation rule authoring and simulation | Partial; rule draft authoring, validation, catalog-derived hook candidates, and simulation-backed draft creation exist. Deeper condition/action builders remain. |
| EAPT-061 | Automation activation, pause, retire, failure administration | Partial; rule activation, pause, retire, health dashboard, failure queue foundation, retry/replay/resolve/skip API contracts, and audit events exist. Runtime execution worker and seeded live failures remain. |
| EAPT-062 | Configuration import/export with validation and redaction | Partial; preview-safe configuration export, portable redaction markers, export manifest, import-preview validation, manager-only routes, UI review workspace, and focused service/route/UI tests exist. Destructive import apply, rollback, approval, activation, and audit-event persistence remain. |
| EAPT-063 | Creation and administration workflow tests | Not started |

Recommended E5 next steps:

1. Add full purpose/template create, duplicate, deprecate, and usage-aware delete workflows.
2. Add deeper automation condition/action builders and runtime execution worker.
3. Add recurring holiday templates and deeper special-hours recurrence controls.
4. Add deeper resource availability calendars, capacity overrides by day, and resource type editors.
5. Add import apply controls with diff confirmation, rollback, approval, activation, and audit evidence.

## E6 — Owner, staff, and responsive workflows

**Goal:** Make appointment operation fast and safe across desktop, tablet, and mobile experiences.

**Current status:** Mostly not started; initial desktop task/appointment handoff exists.

| ID | Work package | Status |
| --- | --- | --- |
| EAPT-064 | My Appointments responsive queue | Not started |
| EAPT-065 | Mobile appointment detail and quick actions | Not started |
| EAPT-066 | Participant read-only appointment experience | Not started |
| EAPT-067 | Customer and vehicle masking across viewports | Not started |
| EAPT-068 | Linked-task handoff between appointment and task workspaces | Initial desktop handoff implemented; dedicated responsive/mobile workflow remains |
| EAPT-069 | Mobile note, outcome, reason, follow-up workflows | Not started |
| EAPT-070 | Offline/stale-connection safeguards without offline mutation | Not started |
| EAPT-071 | Role-based usability and accessibility sessions | Not started |
| EAPT-072 | Responsive end-to-end and real-device tests | Not started |

## E7 — Internal notifications and future integration contracts

**Goal:** Deliver internal operational notifications and stable future integration contracts without depending on external providers for Release 1.0.

**Current status:** Not started.

| ID | Work package | Status |
| --- | --- | --- |
| EAPT-073 | Notification preferences, urgency, read state, retention | Not started |
| EAPT-074 | Notification creation from appointment and automation events | Not started |
| EAPT-075 | Notification center and appointment deep links | Not started |
| EAPT-076 | Notification failure, retry, suppression controls | Not started |
| EAPT-077 | Versioned outbound event contract | Not started |
| EAPT-078 | Versioned inbound command and external identity mapping contract | Not started |
| EAPT-079 | Contract test harness with fake adapters | Not started |
| EAPT-080 | Notification, privacy, integration-contract tests | Not started |

Note: external SMS, email, Google Calendar, Outlook, CRM, DMS, and public booking remain deferred to a post-release integration program.

## E8 — Analytics, reports, reconciliation, and operational controls

**Goal:** Provide reconciled reporting and drill-down without weakening privacy or live scheduling.

**Current status:** Not started.

| ID | Work package | Status |
| --- | --- | --- |
| EAPT-081 | KPI dictionary and timezone/reporting definitions | Not started |
| EAPT-082 | Reporting read models isolated from mutation paths | Not started |
| EAPT-083 | Volume, confirmation, attendance, no-show, cancellation, rescheduling reports | Not started |
| EAPT-084 | Outcome, conversion, follow-up, readiness reports | Not started |
| EAPT-085 | Staff, vehicle, resource, location, capacity reports | Not started |
| EAPT-086 | Conflict, override, automation, failure, duplicate-prevention reports | Not started |
| EAPT-087 | Permission-aware exports and export audit | Not started |
| EAPT-088 | Reconciliation, privacy, performance, report-access tests | Not started |

## E9 — Enterprise hardening and release qualification

**Goal:** Prove the product is secure, accessible, reliable, observable, recoverable, and supportable.

**Current status:** Not started.

| ID | Work package | Status |
| --- | --- | --- |
| EAPT-089 | Requirements traceability matrix | Not started |
| EAPT-090 | Threat model and security architecture review | Not started |
| EAPT-091 | Authorization, cross-location, privacy, sensitive-data testing | Not started |
| EAPT-092 | Dependency, input, session, rate-limit, abuse-path testing | Not started |
| EAPT-093 | WCAG 2.2 AA audit and remediation | Not started |
| EAPT-094 | Load, concurrency, soak, volume testing | Not started |
| EAPT-095 | Health checks, logs, metrics, traces, alerts | Not started |
| EAPT-096 | Background-work dead-letter and replay controls | Not started |
| EAPT-097 | Backup, restore, retention, archive, deletion validation | Not started |
| EAPT-098 | Deployment, feature control, migration, rollback runbooks | Not started |
| EAPT-099 | Supported-browser and real-device regression matrix | Not started |
| EAPT-100 | Complete critical-workflow end-to-end suite | Not started |
| EAPT-101 | Failure-injection and dependency-degradation exercises | Not started |
| EAPT-102 | Support, incident, escalation, ownership runbooks | Not started |
| EAPT-103 | Resolve critical/high defects and document accepted lower risks | Not started |
| EAPT-104 | Enterprise release-readiness review | Not started |

## E10 — Pilot, migration, training, production rollout, and stabilization

**Goal:** Launch through a controlled, measurable rollout.

**Current status:** Not started.

| ID | Work package | Status |
| --- | --- | --- |
| EAPT-105 | Select pilot location, users, purposes, success criteria | Not started |
| EAPT-106 | Prepare production configuration | Not started |
| EAPT-107 | Migration or opening-balance appointment plan | Not started |
| EAPT-108 | Role-based training and operating procedures | Not started |
| EAPT-109 | Production-readiness rehearsal | Not started |
| EAPT-110 | Controlled pilot launch | Not started |
| EAPT-111 | Measure pilot workflow, quality, adoption, conflicts, overrides, automation | Not started |
| EAPT-112 | Resolve pilot findings and repeat qualification where affected | Not started |
| EAPT-113 | Executive go/no-go review and production rollout | Not started |
| EAPT-114 | Stabilization period and transition to normal operations | Not started |

## 6. Recommended next implementation sequence

The best next sequence is to finish the active E3/E4 bridge before jumping into broad reporting or rollout.

Current recommended sequence:

| Order | Recommended focus | Why it matters |
| ---: | --- | --- |
| 1 | Run authored Playwright e2e after installing local browser binaries | The task-created draft flow was proven manually in the live browser, but the automated e2e cannot run until local Playwright Chromium is installed. |
| 2 | Admin settings for location, hours, resources, reasons, outcomes, and templates | This lets managers update operational information without code changes. |
| 3 | Automation rule administration and failure/retry/replay | Needed before automatic appointment creation can be considered enterprise-safe. |
| 4 | Availability-assisted scheduling recommendations for unscheduled drafts | Helps managers choose valid times/resources faster instead of manually testing slots. |
| 5 | Exception queues | Follow-ups, unscheduled drafts, no-shows, confirmation gaps, and automation failures need clear ownership. |
| 6 | Browser workflow coverage for the current board | Expand beyond the authored task-created-draft e2e to cover resource hold, schedule, start/finish, and outcome workflows. |
| 7 | Reporting and KPI dictionary | Needed before enterprise review and owner confidence in metrics. |
| 8 | Security, accessibility, performance, backup, and release hardening | Needed before pilot/release. |
| 9 | Internal notifications | Needed for operational visibility beyond the board and activity feed. |
| 10 | Pilot and rollout | Final release stage after E1-E9 gates pass. |

Superseded prior recommended sequence:

| Order | Recommended focus | Why it matters |
| ---: | --- | --- |
| 1 | Browser workflow for task-created draft appointment scheduling | The initial task-detail create workflow exists; the next proof is task detail → linked draft → Appointment Board scheduling. |
| 2 | Activity-feed emission for appointment automation | Generated tasks and generated draft appointments need visible operational history. |
| 3 | Complete linked work actions beyond read-only display | The board now shows live linked work; the next step is task creation/linking actions and handoff behavior. |
| 4 | Browser workflow coverage for the current board | We need end-to-end proof that the visible board works, not just unit-level confidence. |
| 5 | Admin settings for location, hours, resources, reasons, outcomes, and templates | This lets managers update operational information without code changes. |
| 6 | Automation rule administration and failure/retry/replay | Needed before automatic appointment creation can be considered enterprise-safe. |
| 7 | Exception queues | Follow-ups, unscheduled drafts, no-shows, confirmation gaps, and automation failures need clear ownership. |
| 8 | Reporting and KPI dictionary | Needed before enterprise review and owner confidence in metrics. |
| 9 | Security, accessibility, performance, backup, and release hardening | Needed before pilot/release. |
| 10 | Pilot and rollout | Final release stage after E1–E9 gates pass. |

## 7. Major release blockers

These are the biggest blockers before this can be called Enterprise Release 1.0:

1. Full administration is not complete.
2. Full Appointment Command Center views are not complete.
3. Create appointment from any task needs browser evidence and automation-rule triggers beyond the initial task-detail workflow.
4. Task-to-appointment automation runtime/admin is not complete.
5. Browser/end-to-end workflow evidence is missing.
6. Accessibility evidence is missing.
7. Reporting/KPI reconciliation is missing.
8. Internal notifications are missing.
9. Production hardening evidence is missing.
10. Pilot/rollout has not started.

## 8. Release 1.0 definition of done

Enterprise Release 1.0 is complete only when:

- E1 through E10 gates pass.
- All critical acceptance scenarios pass in a production-like environment.
- The command center supports the approved day-one views and workflows.
- Manual and automated appointment creation from tasks is safe and traceable.
- Appointment-to-task orchestration is complete.
- Permissions, conflicts, audit, reasons, outcomes, reporting, recurrence, bulk actions, waitlists, configuration, and responsive workflows operate as specified.
- External communications remain clearly represented as deferred integrations without breaking internal workflows.
- Product, security, workflow, accessibility, data, quality, and operations approvals are recorded.

## 9. Source documents

Detailed supporting documents live here:

- `docs/CURRENT_IMPLEMENTATION_STATUS.md`
- `docs/appointments/README.md`
- `docs/appointments/IMPLEMENTATION_ROADMAP.md`
- `docs/appointments/REMAINING_WORK_DASHBOARD.md`
- `docs/appointments/ENTERPRISE_PRODUCT_SPEC.md`
- `docs/appointments/ACCEPTANCE_SCENARIOS.md`
- `docs/appointments/PERMISSION_MATRIX.md`
- `docs/appointments/LIFECYCLE_CONFLICT_MATRIX.md`
- `docs/appointments/AUTOMATION_RULES_CATALOG.md`

## 10. Bottom line

The project has a strong appointment foundation and a meaningful live Appointment Board. We are past the mockup-only stage.

The remaining roadmap is the enterprise completion layer: task linkage, admin controls, full views, exception queues, automation governance, browser evidence, accessibility, reporting, security, production readiness, and rollout.
