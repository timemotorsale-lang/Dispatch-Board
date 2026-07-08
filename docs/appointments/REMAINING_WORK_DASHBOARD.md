# Appointment Command Center Remaining Work Dashboard

**Program:** Enterprise Appointment Command Center  
**Target:** Enterprise Release 1.0  
**Dashboard date:** 2026-07-07  
**Source documents:** `IMPLEMENTATION_ROADMAP.md`, `CURRENT_IMPLEMENTATION_STATUS.md`, and implemented appointment contract files  
**Purpose:** Show, in one place, how much roadmap work is complete and what remains before Release 1.0.

## Executive snapshot

The Appointment Board is no longer just a visual mockup. It now has a live command foundation, server-side permissions, scheduling previews, seeded schedulable staff resources, resource workflows, staff conflict handling, unscheduled draft scheduling, past-time schedule protection, outcome capture, follow-up automation, linked-task display/navigation, task-detail create-appointment flow, Appointment Board handoff, and appointment history in the Activity Feed.

However, Enterprise Release 1.0 is not complete. The remaining work is mostly the enterprise finish: expanded command-center views, administration/settings completion, task-to-appointment automation runtime, durable notification center/runtime, durable analytics/reporting models, production hardening, browser/accessibility evidence, and rollout.

## Overall milestone status

| Milestone | Roadmap scope | Current status | Practical meaning |
| --- | --- | --- | --- |
| E0 | Product direction | Approved | Business direction is approved. |
| E1 | Architecture and domain foundation | Mostly complete / gate-ready, with EAPT-006 still partially open | Core appointment model, policy, audit, migration, and Minneapolis baseline exist. Template administration is not fully database-backed yet. |
| E2 | Scheduling, availability, recurrence, capacity | Mostly complete / gate-ready | Authoritative scheduling services, resource/staff availability, hard conflict, warning, waitlist, bulk, and quality gates exist as service foundations. |
| E3 | Lifecycle, task orchestration, audit, automation | In progress | Live command execution, appointment board workflows, resource workflows, staff conflict controls, outcomes, linked-task read/display/navigation, task-detail draft appointment creation, board handoff, appointment activity-feed visibility, and follow-up automation are implemented. Automation-admin, failure/retry/replay, and final lifecycle coverage items remain. |
| E4 | Appointment Command Center operating views | In progress but not gate-complete | The mockup-aligned board and detail rail exist, and the command center now includes exception queues, resolution workbench, saved views, watched subscriptions, notification digests, enterprise ops queues for confirmation/recovery/automation, reporting/exports, executive review, resource/location/vehicle operating views, schedule analytics presets, lane-pressure summaries, reconciliation queue workflows, and working day/week/month/agenda surfaces with board-lens switching. Browser evidence and accessibility evidence remain. |
| E5 | Creation and administration | In progress / partial | Appointment Settings, a versioned Catalog + Automation admin workspace, and an Automation Operations Console now exist for manager-only location profile, phone, hours, status, closures, recurring-template-to-closure apply flow, special-hours calendar preview, recurring template readiness, resource availability summaries, resource-specific operating calendars with day-level hours/capacity override windows, reason-required removal controls, overlap/runtime review, precedence guidance, next-effective-window preview, bulk multi-day apply/replace controls, capacity override readiness and quick drafts, resource type create/edit/deactivate controls, resource controls, purpose templates, outcome/follow-up/reason catalogs, code deprecation/reactivation with replacement guidance, rule hooks, simulation, draft/active catalog versions, required change reasons, rule lifecycle, health, failure queue, retry/replay readiness, preview-safe configuration export, import-preview validation, redaction reporting, and audit controls. Recurring series automation, notifications, and import apply remain. |
| E6 | Owner, staff, and responsive workflows | Not started | Dedicated My Appointments, mobile workflows, participant read-only experience, responsive handoff, stale/offline safeguards, and real-device testing remain. |
| E7 | Internal notifications and future integration contracts | In progress / partial | Internal notification digest rules, delivery preferences, preview/send workflow, runtime acknowledgment/delivery queue, browser-persisted runtime continuity, runtime checkpointing, manager inbox, urgency/retention/deep-link policy controls, event-to-notification fanout coverage, notification contract definitions, suppression/deduped source governance visibility, policy-update audit/runtime traces, read-state handling, carry-forward handoff packaging, acceptance trail, runtime delivery ledger history, and digest history exist inside the command center. Durable notification center, broader failure handling, and stable future SMS/email/calendar/CRM/DMS contracts remain. |
| E8 | Analytics and operational controls | In progress / partial | Command-center reporting exports, executive scorecards, trend watch, KPI drilldowns, digest-health analytics, leadership brief/export generation, visible schedule analytics/reconciliation snapshots, KPI dictionary definitions, and reporting read-model grouping by category/owner/location exist. Durable reporting read models at broader enterprise scale, enterprise reconciliation, and reporting performance/privacy tests remain. |
| E9 | Enterprise hardening and release qualification | Not started | Security review, WCAG audit, load/soak testing, observability, backup/restore, rollback drills, end-to-end traceability, and release signoff remain. |
| E10 | Pilot and production rollout | Not started | Pilot, production configuration, training, launch, measurement, go/no-go, and stabilization remain. |

## Roadmap completion by work package

This is an approximate planning view. A roadmap package is only marked complete when the implementation/status documents show clear evidence. Some packages have partial implementation even when their formal gate is not complete.

| Milestone | Packages | Complete | In progress / partial | Not started | Gate status |
| --- | ---: | ---: | ---: | ---: | --- |
| E1 | 12 | 11 | 1 | 0 | Ready for approval after EAPT-006 admin gap is accepted or completed |
| E2 | 13 | 13 | 0 | 0 | Ready for review |
| E3 | 13 | 6 | 2 | 5 | In progress |
| E4 | 14 | 0 | 9 | 5 | In progress, not gate-ready |
| E5 | 11 | 0 | 4 | 7 | In progress, not gate-ready |
| E6 | 9 | 0 | 0 | 9 | Not started |
| E7 | 8 | 0 | 1 | 7 | In progress / partial |
| E8 | 8 | 0 | 1 | 7 | In progress / partial |
| E9 | 16 | 0 | 0 | 16 | Not started |
| E10 | 10 | 0 | 0 | 10 | Not started |

Approximate package-level progress:

- Complete: 30 of 114 roadmap packages
- In progress / partial: 16 of 114 roadmap packages
- Not started: 68 of 114 roadmap packages

Important context: this count understates the depth of E3 because EAPT-029 has been implemented as many smaller vertical slices through EAPT-029AG. The Appointment Board has more real workflow implementation than the simple parent package count shows.

## Completed or substantially implemented

### Foundation and scheduling

- Organization/location foundation, including Minneapolis baseline
- Appointment aggregate, lifecycle dimensions, ownership, versioning, snapshots, and audit model
- Participants, customer/vehicle snapshots, location access, resource requirements, reservations, and privacy projections
- Command idempotency, optimistic concurrency foundation, transaction boundary, and API command intake
- Location time, business hours, timezone, DST behavior, and closure handling
- Staff/resource availability services
- Seeded staff schedulable resources and staff resource operating windows for active Minneapolis users
- Hard conflict and warning evaluation
- Warning override model
- Resource reservation commit/release service boundaries
- Availability search service boundary
- Reschedule impact, bulk reschedule, waitlist/unscheduled request service boundaries
- Scheduling engine quality coverage

### Live Appointment Board workflows

- Mockup-aligned Appointment Board shell
- Live read-model binding
- New appointment draft creation
- Schedule Draft command bridge
- Dedicated unscheduled/draft lane
- Unscheduled draft scheduling form
- Proposed-time schedule readiness preview
- Proposed-time staff conflict preview
- Proposed-time staff warning override
- Proposed-time resource candidate availability preview
- Proposed-time resource proposal and hold mutation
- Resource planning preview
- Resource requirement attachment
- Resource candidate proposal
- Resource candidate availability preview
- Resource candidate hold
- Held reservation commit during Schedule
- Held/committed resource release
- Held and scheduled committed resource replacement
- Warning-level committed resource replacement acceptance
- Resource warning override capture
- Resource warning-before-hold enforcement
- Persisted warning override visibility
- Explicit resource action reason fields
- Owner reassignment command bridge
- Outcome and follow-up capture
- Outcome-driven follow-up task automation
- Outcome-driven follow-up draft appointment automation
- Generated draft visibility and selection after outcome automation
- Linked task read-model/detail-rail display
- Appointment-to-task navigation from linked task rows
- Task-detail create linked draft appointment workflow
- Task-detail success handoff back to the Appointment Board
- Live browser proof for task-created draft creation and board scheduling
- Server/UI guard against scheduling or rescheduling into a past start time
- Appointment history events merged into the Activity Feed with appointment labels, tones, filters, and context
- Appointment Settings admin foundation at `/settings/appointments` for manager-only location profile, address, phone, operating hours, scheduling status, resource summaries, catalogs, and automation readiness
- Appointment Settings V2 controls for location closure create/edit/delete, recurring-template-to-closure apply flow, holiday/planned/emergency closure windows, resource status/capacity/conflict policy updates, governed resource type creation, resource type default name/capacity/conflict/status updates, resource type deactivation instead of hard delete, resource-specific operating calendars with day-level hours/capacity override windows, reason-required removal controls, overlap/runtime review, precedence guidance, next-effective-window preview, bulk multi-day apply/replace controls, resource outage/capacity-reduction windows, special-hours calendar preview, recurring closure template readiness, resource availability summaries, capacity override readiness and quick drafts, and resource type editor readiness
- Appointment Board header and create/schedule defaults now read from the admin location foundation with safe Lake Street fallbacks
- Appointment Catalog + Automation admin workspace at `/settings/appointments/catalog` for manager-only purpose template review, outcome/follow-up/reason catalog visibility, structured code add/rename/remove/deprecate/reactivate controls, replacement-code guidance, deprecated-code warnings, automation rule hook visibility, safe automation simulation, draft saves, validation, activation, and catalog change reasons
- Appointment Automation Operations Console at `/settings/appointments/automation` for manager-only rule lifecycle, health metrics, failure/review queue foundation, retry/replay controls, and audit-event visibility
- Versioned appointment catalog editor with durable Prisma schema/migration, active/draft catalog versions, append-only catalog change events, required manager reason capture, draft validation, draft save, and activation

### Current validation evidence

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

Not yet rerun or not yet complete:

- End-to-end Playwright workflow execution on this workstation. The task-to-appointment e2e spec exists, but local Playwright Chromium is not installed.
- Production build evidence
- Production deployment evidence
- Accessibility audit
- Security/privacy review evidence
- Load/soak production-readiness evidence

## Remaining work by milestone

## E1 remaining work

| ID | Remaining work | Status | Priority |
| --- | --- | --- | --- |
| EAPT-006 | Finish database-backed purpose/template/outcome/reason administration instead of relying only on initial catalog/helpers | In progress | High |

Recommended next E1 decision:

- Decide whether E1 can be formally gate-approved with EAPT-006 administration carried into E5, or whether database-backed template administration must be completed before E1 approval.

## E2 remaining work

E2 service foundations are complete and ready for review. The remaining E2 work is mostly gate review and later UI integration.

| Area | Remaining work | Status | Priority |
| --- | --- | --- | --- |
| Gate review | Review and approve `E2_SCHEDULING_GATE_REVIEW.md` | Pending review | High |
| UI integration carry-forward | Expose availability search, waitlist, reschedule, recurrence, and bulk behavior through operating interfaces | Deferred to E4/E5 | High |
| Production proof | Reconfirm performance/concurrency under production-like conditions | Deferred to E9 | High |

## E3 remaining work

E3 is the active implementation area.

| ID | Remaining work | Status | Priority |
| --- | --- | --- | --- |
| EAPT-029 | Finish outcome/reason/correction/follow-up workflow coverage beyond current slices | In progress | High |
| EAPT-030 | Appointment-task link persistence, read models, and handoff navigation | Complete initial live slice; linked-task read/detail and appointment-to-task navigation implemented | High |
| EAPT-031 | Appointment-template task blueprint generation | Not started | High |
| EAPT-032 | Create appointment from any task workflow | Complete initial task-detail workflow with live browser proof; automated e2e execution awaits local Playwright browser install | High |
| EAPT-033 | Task-to-appointment automation runtime | Partial implementation exists; outcome-driven runtime records now persist and replay safely, broader task-trigger automation remains | High |
| EAPT-034 | Automation rule versioning, simulation, activation, pause, retirement | Not started | High |
| EAPT-035 | Automation review, failure, retry, and replay services | Partial implementation exists; manager retry/replay/resolve/skip controls and duplicate-safe follow-up replays are live, broader failure classes and background processing remain | High |
| EAPT-036 | Activity history for appointment and automation events | Complete initial Activity Feed merge for appointment history; automation failure/replay visibility remains | Medium |
| EAPT-037 | Optimistic concurrency on every appointment mutation | Partial implementation exists; full audit still pending | High |
| EAPT-038 | Lifecycle, permission, orchestration, audit, and automation test suite | Partial unit coverage exists; critical scenario suite remains | High |

Recommended next E3 slices:

1. Enable local Playwright browser installation and run the authored task detail to linked draft to Appointment Board schedule e2e test.
2. Automation failure/retry/replay visibility.
3. Availability-assisted scheduling recommendations for unscheduled drafts.
4. Automation rule authoring/simulation/activation controls.
5. Template-driven task blueprint generation.

## E4 remaining work

The Appointment Board shell exists, but the formal command-center milestone is not complete.

| ID | Remaining work | Status | Priority |
| --- | --- | --- | --- |
| EAPT-039 | Approve final information architecture and responsive interaction spec | Partial | High |
| EAPT-040 | Route shell, access control, navigation, global error boundaries | Partial | High |
| EAPT-041 | Date, location, resource, search, filter, saved-view controls | Partial | High |
| EAPT-042 | KPI strip with reconciled definitions and drill-down filters | Partial; KPI dictionary definitions and drilldown-ready reporting actions now exist alongside the visible metric strip. | Medium |
| EAPT-043 | Today queue and Agenda view | Not started | Medium |
| EAPT-044 | Day schedule with staff and resource modes | Partial | High |
| EAPT-045 | Week view | Not started | Medium |
| EAPT-046 | Month view | Not started | Medium |
| EAPT-047 | Staff, vehicle, resource, and location schedule views | Partial; staff/location/resource board-lens switching exists, resource/location/vehicle operating views are live in the command center, and schedule analytics now surfaces lane pressure with a reconciliation queue. Durable persisted analytics and deeper reconciliation remain. | Medium |
| EAPT-048 | Full appointment detail workspace and sticky action region | Partial | High |
| EAPT-049 | History, linked work, conflict, outcome, and follow-up panels | Partial; linked-work navigation and appointment activity feed are implemented | High |
| EAPT-050 | Waitlist, no-show, follow-up, confirmation, automation review, and failure queues | Partial; confirmation-gap, waitlist/recovery, automation-review, and automation-failure queues now exist in the board command center. Durable persistence, richer assignment ownership, and cross-surface workflow routing remain. | High |
| EAPT-051 | Loading, empty, stale, partial-failure, and error states | Partial | Medium |
| EAPT-052 | Component, integration, accessibility, visual-regression, and browser tests | Not started | High |

Recommended next E4 slices:

1. Browser test for create draft → propose/hold resource → schedule draft → start/finish/outcome.
2. History/activity panel in the detail rail.
3. Linked work panel backed by appointment-task read model.
4. Exception queues: follow-up, no-show, unscheduled drafts, automation failures.
5. Week/month/agenda view expansion after core day workflow is reliable.

## E5 remaining work

This is one of the largest remaining enterprise areas.

| ID | Remaining work | Status | Priority |
| --- | --- | --- | --- |
| EAPT-053 | Purpose-first appointment creation workflow | Partial | High |
| EAPT-054 | Participant, customer, vehicle, location, and resource selection | Not started | High |
| EAPT-055 | Recurrence and occurrence-exception controls | Not started | Medium |
| EAPT-056 | Conflict resolution and manager override experience | Partial | High |
| EAPT-057 | Bulk rescheduling and closure-impact workspace | Not started | Medium |
| EAPT-058 | Purpose, template, outcome, and reason administration | Partial; manager-visible purpose templates, outcome/follow-up/reason catalogs, structured outcome/follow-up/reason add/rename/remove/deprecate/reactivate editors, replacement guidance, deprecated-code validation warnings and new-configuration guards, live appointment-count usage analytics, highest-risk code ranking, code reference counts, manager-ready code impact reports, purpose usage impact, code labels/descriptions in catalog snapshots, durable catalog version table, draft editing, validation, required reason capture, approval review workflow, activation approval gate, change events, purpose usage/reference warnings, purpose create, duplicate, deprecate, reactivate, and draft-only delete protection exist. Deeper usage trend analytics and exportable impact report files remain. | High |
| EAPT-059 | Location, hours, closures, resource, capacity, availability administration | Partial; location profile, phone, weekday hours, scheduling status, closure create/edit/delete, recurring-template-to-closure apply flow, special-hours calendar preview, recurring closure template readiness, resource availability summaries, resource-specific operating calendars with persisted day-level hours/capacity override windows, reason-required removal controls, overlap/runtime review, precedence guidance, next-effective-window preview, bulk multi-day apply/replace controls, capacity override readiness and quick drafts, resource type create/edit/deactivate controls, resource-impact day summaries, resource status/capacity/conflict policy, resource outage/capacity-reduction windows, resource summary, and Appointment Board wiring implemented. Recurring series automation remains. | High |
| EAPT-060 | Automation rule authoring and simulation | Partial; rule draft authoring, validation, catalog-derived hook candidates, and simulation-backed draft creation exist. Deeper condition/action builders remain. | High |
| EAPT-061 | Automation activation, pause, retire, and failure administration | Partial; rule activation, pause, retire, health dashboard, failure queue foundation, retry/replay/resolve/skip API contracts, and audit events exist. Runtime execution worker and seeded live failures remain. | High |
| EAPT-062 | Configuration import/export with validation and redaction | Partial; preview-safe configuration export, portable redaction markers, export manifest, import-preview validation, manager-only routes, UI review workspace, and focused service/route/UI tests exist. Destructive import apply, rollback, approval, activation, and audit-event persistence remain. | Medium |
| EAPT-063 | Creation and administration workflow tests | Not started | High |

Recommended next E5 slices:

1. Add full purpose/template create, duplicate, deprecate, and usage-aware delete workflows.
2. Add deeper automation condition/action builders and runtime execution worker.
3. Add recurring series automation and deeper special-hours recurrence controls.
4. Add recurring series automation for resource-specific operating windows.
5. Add import apply controls with diff confirmation, rollback, approval, activation, and audit evidence.

## E6 remaining work

| ID | Remaining work | Status | Priority |
| --- | --- | --- | --- |
| EAPT-064 | My Appointments responsive queue | Not started | Medium |
| EAPT-065 | Mobile appointment detail and quick actions | Not started | Medium |
| EAPT-066 | Participant read-only appointment experience | Not started | Medium |
| EAPT-067 | Permission-aware customer and vehicle masking across viewports | Not started | High |
| EAPT-068 | Linked-task handoff between appointment and task workspaces | Initial desktop handoff implemented; dedicated responsive/mobile workflow remains | High |
| EAPT-069 | Mobile internal note, outcome, reason, and follow-up workflows | Not started | Medium |
| EAPT-070 | Offline/stale-connection safeguards without offline mutation | Not started | Medium |
| EAPT-071 | Role-based usability and accessibility sessions | Not started | Medium |
| EAPT-072 | Responsive end-to-end and real-device tests | Not started | High |

## E7 remaining work

| ID | Remaining work | Status | Priority |
| --- | --- | --- | --- |
| EAPT-073 | Internal notification preferences, urgency, read state, retention | Partial; board policy controls now cover urgency, read state, retention posture, and manager review behavior. Durable user-level preferences and retention enforcement remain. | Medium |
| EAPT-074 | Notification creation from appointment and automation events | Partial; digest runtime, handoff events, browser-persisted runtime continuity, delivery checkpointing, and board/automation history now produce visible fanout coverage into manager-facing notifications. Wider automation-source fanout remains. | Medium |
| EAPT-075 | Notification center and appointment deep links | Partial; manager notification inbox now includes deep-link routing into the detail rail, resolution workbench, manager timeline, and handoff package. Dedicated cross-surface notification routes remain. | Medium |
| EAPT-076 | Notification failure, retry, and suppression controls | Partial; failure queues plus retry, re-queue, resolve, audit-friendly manager controls, policy-level suppression windows, notification contract visibility, suppression/dedupe governance review, and policy-update audit/runtime tracing now exist on the board. Stronger suppression enforcement and external delivery durability remain. | Medium |
| EAPT-077 | Future outbound integration contract | Not started | Medium |
| EAPT-078 | Future inbound command and external identity mapping contract | Not started | Medium |
| EAPT-079 | Contract test harness with fake adapters | Not started | Medium |
| EAPT-080 | Notification, privacy, and integration-contract tests | Not started | Medium |

Note: external SMS, email, external calendar, CRM, and DMS integrations are intentionally deferred beyond Release 1.0. E7 is about internal notifications and stable future integration contracts.

## E8 remaining work

| ID | Remaining work | Status | Priority |
| --- | --- | --- | --- |
| EAPT-081 | KPI dictionary and timezone/reporting definitions | Partial; timezone-aware KPI definitions, reporting source labels, and manager drilldown actions now exist in the command center. Broader enterprise reconciliation and durable governance remain. | High |
| EAPT-082 | Reporting read models isolated from mutation paths | Not started | High |
| EAPT-083 | Volume, confirmation, attendance, no-show, cancellation, rescheduling reports | Not started | Medium |
| EAPT-084 | Outcome, conversion, follow-up, and readiness reports | Not started | Medium |
| EAPT-085 | Staff, vehicle, resource, location, and capacity reports | Not started | Medium |
| EAPT-086 | Conflict, override, automation, failure, duplicate-prevention reports | Not started | Medium |
| EAPT-087 | Permission-aware exports and export audit | Not started | Medium |
| EAPT-088 | Reconciliation, privacy, performance, and report-access tests | Not started | High |

## E9 remaining work

| ID | Remaining work | Status | Priority |
| --- | --- | --- | --- |
| EAPT-089 | Requirements traceability matrix | Not started | High |
| EAPT-090 | Threat model and security architecture review | Not started | High |
| EAPT-091 | Authorization, cross-location, privacy, sensitive-data testing | Not started | High |
| EAPT-092 | Dependency, input, session, rate-limit, abuse-path testing | Not started | High |
| EAPT-093 | WCAG 2.2 AA audit and remediation | Not started | High |
| EAPT-094 | Load, concurrency, soak, and volume testing | Not started | High |
| EAPT-095 | Health checks, logs, metrics, traces, alerts | Not started | High |
| EAPT-096 | Dead-letter and replay controls | Not started | Medium |
| EAPT-097 | Backup, restore, retention, archive, deletion validation | Not started | High |
| EAPT-098 | Deployment, feature control, migration, rollback runbooks | Not started | High |
| EAPT-099 | Supported-browser and real-device regression matrix | Not started | High |
| EAPT-100 | Complete critical-workflow end-to-end suite | Not started | High |
| EAPT-101 | Failure-injection and dependency-degradation exercises | Not started | Medium |
| EAPT-102 | Support, incident, escalation, ownership runbooks | Not started | Medium |
| EAPT-103 | Resolve critical/high defects and document accepted lower risks | Not started | High |
| EAPT-104 | Enterprise release-readiness review | Not started | High |

## E10 remaining work

| ID | Remaining work | Status | Priority |
| --- | --- | --- | --- |
| EAPT-105 | Select pilot location, users, purposes, and success criteria | Not started | High |
| EAPT-106 | Prepare production configuration | Not started | High |
| EAPT-107 | Migration or opening-balance appointment plan | Not started | Medium |
| EAPT-108 | Role-based training and operating procedures | Not started | Medium |
| EAPT-109 | Production-readiness rehearsal | Not started | High |
| EAPT-110 | Controlled pilot launch | Not started | High |
| EAPT-111 | Measure pilot workflow, quality, adoption, conflicts, overrides, automation | Not started | High |
| EAPT-112 | Resolve pilot findings and repeat qualification where affected | Not started | High |
| EAPT-113 | Executive go/no-go review and production rollout | Not started | High |
| EAPT-114 | Stabilization period and transition to normal operations | Not started | High |

## Recommended next implementation sequence

The best next sequence is to finish the active E3/E4 bridge before jumping into broad reporting or rollout work.

| Order | Recommended next focus | Why it matters |
| ---: | --- | --- |
| 1 | Run authored Playwright e2e after installing local browser binaries | The task-created draft flow was proven manually in the live browser, but the automated e2e cannot run until local Playwright Chromium is installed. |
| 2 | Admin settings for location/hours/resources/reasons/templates | This addresses the earlier concern that managers should be able to update operational information without code. |
| 3 | Automation rule administration and failure/retry/replay | Needed before automatic appointment creation can be considered enterprise-safe. |
| 4 | Availability-assisted scheduling recommendations for unscheduled drafts | Helps managers choose valid times/resources faster instead of manually testing slots. |
| 5 | Exception queues | Follow-ups, unscheduled drafts, no-shows, confirmation gaps, and automation failures need clear ownership. |
| 6 | Browser workflow coverage for current board | Expand beyond the authored task-created-draft e2e to cover resource hold, schedule, start/finish, and outcome workflows. |
| 7 | Reporting/KPI dictionary | Needed before enterprise review and owner confidence in metrics. |
| 8 | Security/accessibility/performance hardening | Needed before pilot/release. |
| 9 | Internal notifications | Needed for operational visibility beyond the board and activity feed. |
| 10 | Pilot and rollout | Final release stage after E1-E9 gates pass. |

## Release blockers

These are the biggest blockers before this can be called Enterprise Release 1.0:

1. Administration is not complete.
2. Full Appointment Command Center views are not complete.
3. Create appointment from any task still needs automated e2e execution and automation-rule triggers beyond the initial task-detail workflow.
4. Task-to-appointment automation runtime/admin is not complete.
5. Broad browser/end-to-end workflow evidence is missing; one manual task-to-appointment proof exists and one e2e spec is authored but blocked by missing local browser binaries.
6. Accessibility evidence is missing.
7. Reporting/KPI reconciliation is missing.
8. Internal notifications are missing.
9. Production hardening evidence is missing.
10. Pilot/rollout has not started.

## Current bottom line

The project has a strong appointment foundation and a meaningful live Appointment Board. We are past the “mockup only” stage.

But the product is not enterprise-release-complete yet. The next phase should focus on administration, automation rule safety, exception queues, broader browser evidence, accessibility/security hardening, and reporting.
