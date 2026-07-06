# Appointment Command Center Remaining Work Dashboard

**Program:** Enterprise Appointment Command Center  
**Target:** Enterprise Release 1.0  
**Dashboard date:** 2026-07-06  
**Source documents:** `IMPLEMENTATION_ROADMAP.md`, `CURRENT_IMPLEMENTATION_STATUS.md`, and implemented appointment contract files  
**Purpose:** Show, in one place, how much roadmap work is complete and what remains before Release 1.0.

## Executive snapshot

The Appointment Board is no longer just a visual mockup. It now has a live command foundation, server-side permissions, scheduling previews, seeded schedulable staff resources, resource workflows, staff conflict handling, unscheduled draft scheduling, past-time schedule protection, outcome capture, follow-up automation, linked-task display/navigation, task-detail create-appointment flow, Appointment Board handoff, and appointment history in the Activity Feed.

However, Enterprise Release 1.0 is not complete. The remaining work is mostly the enterprise finish: full command-center views, administration/settings, task-to-appointment automation runtime, notification center, analytics/reporting, production hardening, browser/accessibility evidence, and rollout.

## Overall milestone status

| Milestone | Roadmap scope | Current status | Practical meaning |
| --- | --- | --- | --- |
| E0 | Product direction | Approved | Business direction is approved. |
| E1 | Architecture and domain foundation | Mostly complete / gate-ready, with EAPT-006 still partially open | Core appointment model, policy, audit, migration, and Minneapolis baseline exist. Template administration is not fully database-backed yet. |
| E2 | Scheduling, availability, recurrence, capacity | Mostly complete / gate-ready | Authoritative scheduling services, resource/staff availability, hard conflict, warning, waitlist, bulk, and quality gates exist as service foundations. |
| E3 | Lifecycle, task orchestration, audit, automation | In progress | Live command execution, appointment board workflows, resource workflows, staff conflict controls, outcomes, linked-task read/display/navigation, task-detail draft appointment creation, board handoff, appointment activity-feed visibility, and follow-up automation are implemented. Automation-admin, failure/retry/replay, and final lifecycle coverage items remain. |
| E4 | Appointment Command Center operating views | In progress but not gate-complete | The mockup-aligned board and detail rail exist, but full day/week/month/agenda/resource/location views, exception queues, saved views, and browser/accessibility evidence remain. |
| E5 | Creation and administration | In progress / partial | Appointment Settings plus Catalog + Automation admin foundations now exist for manager-only location profile, phone, hours, status, closures, resource status/capacity/conflict policy, resource outages/capacity reductions, resource summaries, purpose templates, outcome/follow-up/reason catalogs, automation rule hooks, and simulation previews. Persistent editors, version activation, recurring/special-hours calendars, automation activation/pause/retire, and import/export remain. |
| E6 | Owner, staff, and responsive workflows | Not started | Dedicated My Appointments, mobile workflows, participant read-only experience, responsive handoff, stale/offline safeguards, and real-device testing remain. |
| E7 | Internal notifications and future integration contracts | Not started | Notification preferences, notification center, internal appointment notifications, failure handling, and stable future SMS/email/calendar/CRM/DMS contracts remain. |
| E8 | Analytics and operational controls | Not started | KPI dictionary, reporting read models, reports, exports, audit, reconciliation, and reporting performance/privacy tests remain. |
| E9 | Enterprise hardening and release qualification | Not started | Security review, WCAG audit, load/soak testing, observability, backup/restore, rollback drills, end-to-end traceability, and release signoff remain. |
| E10 | Pilot and production rollout | Not started | Pilot, production configuration, training, launch, measurement, go/no-go, and stabilization remain. |

## Roadmap completion by work package

This is an approximate planning view. A roadmap package is only marked complete when the implementation/status documents show clear evidence. Some packages have partial implementation even when their formal gate is not complete.

| Milestone | Packages | Complete | In progress / partial | Not started | Gate status |
| --- | ---: | ---: | ---: | ---: | --- |
| E1 | 12 | 11 | 1 | 0 | Ready for approval after EAPT-006 admin gap is accepted or completed |
| E2 | 13 | 13 | 0 | 0 | Ready for review |
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
- Appointment Settings V2 controls for location closure create/edit/delete, holiday/planned/emergency closure windows, resource status/capacity/conflict policy updates, and resource outage/capacity-reduction windows
- Appointment Board header and create/schedule defaults now read from the admin location foundation with safe Lake Street fallbacks
- Appointment Catalog + Automation admin workspace at `/settings/appointments/catalog` for manager-only purpose template review, outcome/follow-up/reason catalog visibility, automation rule hook visibility, and safe automation simulation before activation

### Current validation evidence

Latest full-suite validation:

```text
npm run lint
npm run typecheck
npm test
npm run db:validate

109 test files passed
628 tests passed
```

Focused validation during the Appointment Catalog + Automation Admin block:

```text
npm run typecheck
npm test -- appointment-catalog-automation-admin-service.test.ts appointment-catalog-automation-admin-route.test.ts appointment-catalog-automation-panel.test.tsx
npm run lint
npm run db:validate
npm test

All focused and full-suite runs passed.
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
| EAPT-033 | Task-to-appointment automation runtime | Not started / partial outcome automation exists | High |
| EAPT-034 | Automation rule versioning, simulation, activation, pause, retirement | Not started | High |
| EAPT-035 | Automation review, failure, retry, and replay services | Not started | High |
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
| EAPT-042 | KPI strip with reconciled definitions and drill-down filters | Partial | Medium |
| EAPT-043 | Today queue and Agenda view | Not started | Medium |
| EAPT-044 | Day schedule with staff and resource modes | Partial | High |
| EAPT-045 | Week view | Not started | Medium |
| EAPT-046 | Month view | Not started | Medium |
| EAPT-047 | Staff, vehicle, resource, and location schedule views | Not started | Medium |
| EAPT-048 | Full appointment detail workspace and sticky action region | Partial | High |
| EAPT-049 | History, linked work, conflict, outcome, and follow-up panels | Partial; linked-work navigation and appointment activity feed are implemented | High |
| EAPT-050 | Waitlist, no-show, follow-up, confirmation, automation review, and failure queues | Not started | High |
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
| EAPT-058 | Purpose, template, outcome, and reason administration | Partial; manager-visible purpose templates, outcome/follow-up/reason catalogs, and governance read model exist. Persistent editing, approval, and version activation remain. | High |
| EAPT-059 | Location, hours, closures, resource, capacity, availability administration | Partial; location profile, phone, weekday hours, scheduling status, closure create/edit/delete, resource status/capacity/conflict policy, resource outage/capacity-reduction windows, resource summary, and Appointment Board wiring implemented | High |
| EAPT-060 | Automation rule authoring and simulation | Partial; automation rule hooks and simulation preview exist. Rule authoring and persistent approval remain. | High |
| EAPT-061 | Automation activation, pause, retire, and failure administration | Not started; activation lifecycle remains after simulation foundation. | High |
| EAPT-062 | Configuration import/export with validation and redaction | Not started | Medium |
| EAPT-063 | Creation and administration workflow tests | Not started | High |

Recommended next E5 slices:

1. Add persistent purpose/template/outcome/follow-up/reason editing with draft, approval, and version activation.
2. Add automation rule authoring, approval, activation, pause, retire, failure handling, retry, and replay.
3. Add recurring holiday templates and special-hours calendars.
4. Add deeper resource availability calendars, capacity overrides by day, and resource type editors.
5. Add configuration import/export with validation, redaction, and audit evidence.

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
| EAPT-073 | Internal notification preferences, urgency, read state, retention | Not started | Medium |
| EAPT-074 | Notification creation from appointment and automation events | Not started | Medium |
| EAPT-075 | Notification center and appointment deep links | Not started | Medium |
| EAPT-076 | Notification failure, retry, and suppression controls | Not started | Medium |
| EAPT-077 | Future outbound integration contract | Not started | Medium |
| EAPT-078 | Future inbound command and external identity mapping contract | Not started | Medium |
| EAPT-079 | Contract test harness with fake adapters | Not started | Medium |
| EAPT-080 | Notification, privacy, and integration-contract tests | Not started | Medium |

Note: external SMS, email, external calendar, CRM, and DMS integrations are intentionally deferred beyond Release 1.0. E7 is about internal notifications and stable future integration contracts.

## E8 remaining work

| ID | Remaining work | Status | Priority |
| --- | --- | --- | --- |
| EAPT-081 | KPI dictionary and timezone/reporting definitions | Not started | High |
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
