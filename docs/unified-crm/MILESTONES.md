# Unified CRM Console Implementation Milestones

**Document:** Unified CRM Console Implementation Milestones
**Roadmap:** [`IMPLEMENTATION_ROADMAP.md`](IMPLEMENTATION_ROADMAP.md)
**Status:** Planned execution contract; no listed slice is implemented by this document

---

## 1. Execution Contract

Milestones are sequential dependency gates. Within a milestone, agents may work concurrently only when their file ownership and contracts do not overlap. One integration owner accepts the combined evidence.

Every applicable slice follows:

```text
migration -> repository -> service -> policy -> validation -> route/read model
-> UI -> activity/audit -> focused tests -> browser proof -> docs
```

A layer may be marked not applicable only with a written reason. No slice is complete because a screen renders, a schema exists, or unit tests pass in isolation.

Each slice handoff must state:

- stable ID, branch, dependency, files/contracts owned, and files explicitly excluded;
- accepted behavior and required negative/failure states;
- commands and evidence run against the exact commit;
- feature flag and rollback/recovery behavior;
- unresolved risks and documentation updated.

## 2. Status Legend

| Status | Meaning |
| --- | --- |
| `PLANNED` | Desired behavior only; implementation is not claimed. |
| `CONTRACTED` | Dependencies, contracts, ownership, and acceptance evidence are approved. |
| `IN_PROGRESS` | Active incomplete implementation exists. |
| `IMPLEMENTED_UNVERIFIED` | Code exists, but required checks, review, or evidence are incomplete. |
| `VERIFIED` | Required automated and manual evidence exists on the exact baseline. |
| `PILOT` | Verified capability is enabled only for an approved internal cohort. |
| `RELEASED` | Explicit release approval exists for the stated cohort. |
| `HELD` | A named decision, dependency, authority, risk, or failed gate prevents progress or rollout. |
| `DEFERRED` | Outside the internal MVP. |

Unless a row or acceptance ledger below says otherwise, slices begin as `PLANNED`.

### 2.1 Accepted foundation decisions

| ID | Decision state | What is accepted | What is not yet claimed |
| --- | --- | --- | --- |
| UCRM-000 | `CONTRACTED` | Product identity, `/crm`, personas, navigation, independent-console/shared-platform boundary, reconciled internal MVP scope, exclusions, and UX-first review posture | Route, UI, domain behavior, or release |
| UCRM-001 | `CONTRACTED` | Current evidence baseline, canonical source ownership, additive lead bridge, and no-duplicate-truth rule | Fresh implementation-start census or adapter behavior |
| UCRM-002 | `CONTRACTED` | Canonical domain relationships, ownership, invariants, command/lifecycle rules, concurrency, archive, and dedupe boundaries | Schema, migrations, repositories, or commands |
| UCRM-003 | `CONTRACTED` | Modular-monolith boundary, `/crm` module shape, service/read/event contracts, integration posture, and accepted ADRs | Application route, runtime services, projections, or jobs |
| UCRM-004 | `CONTRACTED` | Threat model, classification, role/field defaults, isolation, consent, audit, retention/export baseline, and incident rules | Implemented controls, scans, or security evidence |
| UCRM-005 | `CONTRACTED` | Test pyramid, critical journeys, evidence format, severity, accessibility, performance, recovery, and release gates | Test implementation or passing evidence |
| UCRM-006 | `CONTRACTED` | Usability, pilot completion, data-integrity, defect, availability, RTO, and RPO targets in the roadmap | Measured SLO attainment or operational monitoring |
| UCRM-007 | `CONTRACTED` | Agent roles, coordinator, file/contract ownership, handoffs, independent review, conflict escalation, and evidence discipline | Future packet assignments or completed implementation reviews |
| UCRM-008 | `CONTRACTED` | Pilot cohort shape/duration, separate access/read/write/risky-command controls, disable/re-enable authority, fallback period, and rollback triggers | Feature-control implementation, named users, rehearsal, or rollout |
| UCRM-009 | `CONTRACTED` | Requirements, decisions, risks, milestones, tests, and evidence-state vocabulary are cross-linked on the accepted baseline | Future implementation evidence |

`CONTRACTED` means the business decision can guide dependent work. It does not convert a documentation row into `VERIFIED` evidence.

## 3. Milestone UCRM-0 — Foundation and Authority Gate

**Target:** Days 1–3
**Depends on:** Clean shared baseline
**Feature posture:** No CRM workflow enabled

| ID | Agent-sized deliverable | Acceptance evidence |
| --- | --- | --- |
| UCRM-000 | Product boundary and vocabulary — `CONTRACTED` | Accepted charter records CRM purpose, personas, navigation, glossary, reconciled internal MVP, exclusions, UX review posture, and “independent console/shared platform” rule. |
| UCRM-001 | Current-state and source-ownership map — `CONTRACTED` | Existing Customers/Sales/shared capabilities are classified as durable, sample, adapter, planned, or deprecated; canonical owner and reuse decision are accepted per record. |
| UCRM-002 | Domain and data contract — `CONTRACTED` | Customer/contact/opportunity/activity/task/quote/dispatch relationships, identifiers, invariants, lifecycle states, concurrency, archive, and dedupe boundaries are accepted. |
| UCRM-003 | Application architecture — `CONTRACTED` | Module boundaries, repositories, services, policies, validation, routes, read models, events, search/report projections, jobs, and dependency rules are accepted. |
| UCRM-004 | Security and privacy foundation — `CONTRACTED` | Threat model, data classification, organization isolation, capabilities, field visibility, secrets, audit, retention/export baseline, and incident requirements are approved. |
| UCRM-005 | Testing and evidence strategy — `CONTRACTED` | Test pyramid, fixtures, permission matrix, browser personas, accessibility, performance, migration, recovery, and release evidence formats are accepted. |
| UCRM-006 | SLO and success criteria — `CONTRACTED` | Roadmap records accepted usability, completion, integrity, availability (99.5% pilot/99.9% release), RTO (2 hours), RPO (15 minutes), and defect targets; operating calendar/metric owners are assigned before pilot and attainment is proven later. |
| UCRM-007 | Agent execution model — `CONTRACTED` | Roles, decision owners, file/contract ownership, handoff template, dependency queue, review rules, conflict escalation, and integration cadence are established. |
| UCRM-008 | Feature-control and rollback contract — `CONTRACTED` | Accepted 5–8 person/five-business-day pilot, separate access/read/write/risky-command controls, 30-day fallback, disable/re-enable authority, data-preserving rollback, and mandatory hold triggers are recorded; implementation and rehearsal remain later evidence. |
| UCRM-009 | Foundation traceability gate — `CONTRACTED` | Requirements-to-milestone map, ADR register, risk register, evidence index, and current-status update distinguish plans from implementation. |

**First implementation UX checkpoint:** UCRM-UXR-0 experience direction was accepted by the Product Owner on 2026-08-14. The accepted direction covers console navigation, role entry, “Here’s what needs attention” Home hierarchy, one review search, safe source-only New actions, a dominant next-action queue with in-place context, Today/Attention support, progressive disclosure, and accessible responsive behavior. This direction decision is recorded in `UCRM_010_011_IMPLEMENTATION_EVIDENCE.md`; it is not implementation verification.

**Exit gate:** UCRM-000–009 are `CONTRACTED` on the accepted foundation baseline. Exact stages, monetary thresholds, retention/export thresholds, named pilot users, and provider decisions remain deferred and hold only their dependent milestones. UCRM-UXR-0 direction is accepted, but cannot be used as implementation evidence or as merge, pilot, production, real-data, or write approval.

## 4. Milestone UCRM-1 — Independent Console and Customer Truth

**Target:** Week 1
**Depends on:** UCRM-0

| ID | Agent-sized vertical slice | Acceptance evidence |
| --- | --- | --- |
| UCRM-010 | CRM console entry and route shell — `VERIFIED` | Authenticated `/crm` entry, role-safe navigation, unavailable/flag-off fallback, responsive shell, focused route tests, browser entry proof, and rollback to existing consoles are recorded in `UCRM_010_011_IMPLEMENTATION_EVIDENCE.md`; integration remains pending. |
| UCRM-011 | CRM capability policy baseline — `VERIFIED` | Server capabilities for CRM access, customer view, sensitive-field view, mutation, export, and administration pass role/page denial tests. 2026-08-26 opt-in PostgreSQL proof closes the customer-read cross-organization isolation baseline introduced by UCRM-012+. |
| UCRM-012 | Canonical customer/contact adapter — `IMPLEMENTED_UNVERIFIED` | Implementation baseline `04bce384` reads the shared Customer authority with server-derived organization/owner scope, unconditional list masking, source/freshness, and no duplicate truth. 2026-08-26 isolated PostgreSQL proof passed; Product Owner UCRM-UXR-1 and final browser acceptance remain pending. |
| UCRM-013 | Customer list read model and UI — `IMPLEMENTED_UNVERIFIED` | Real paginated/filterable list, reachable loading, empty/error/restricted/recovery states, desktop/mobile layouts, initial authenticated browser proof, and isolated PostgreSQL proof exist. Product Owner UCRM-UXR-1, a data-bearing walkthrough, and final denied/OFF proof remain pending. |
| UCRM-014 | Customer 360 overview and source lenses — `IMPLEMENTED_UNVERIFIED` | The routed read-only view, masked contact boundary, permission-filtered relationships/source lenses, safe lifecycle outcomes, deep-route rollback controls, loading/recovery states, denied-persona mobile evidence, and isolated PostgreSQL proof exist. Product Owner UCRM-UXR-1 and a permitted data-bearing browser walkthrough remain pending. |
| UCRM-015 | Customer/contact controlled edit — `IMPLEMENTED_UNVERIFIED` | A bounded CRM edit command now supports approved customer/contact fields with mutation policy, one active organization scope, optimistic versioning, idempotency replay, serializable persistence, audit/domain/outbox evidence, tests, and rollback via command mode. Browser and isolated PostgreSQL proof remain pending. |
| UCRM-016 | Duplicate candidate warning — `IMPLEMENTED_UNVERIFIED` | A warning-only duplicate-candidate API now advises on normalized email, phone, and display-name matches with masked contact data, explanations, owner/organization scoping, tests, and no automatic merge. Browser and isolated PostgreSQL proof remain pending. |
| UCRM-017 | Reusable/self-service customer import — `DEFERRED` | No internal-MVP implementation is authorized. The pilot uses the bounded administrator-assisted load/rehearsal in UCRM-060. |

**UX checkpoint UCRM-UXR-1:** The owner interacts live with customer search/list and Customer 360 at desktop/mobile sizes before the UI contract is locked. Milestone exit then requires the same accepted journey over real permission-filtered read models, including source/freshness, restricted, empty, error, and recovery states.

**Exit gate:** An authorized user enters `/crm`, finds a durable customer, opens Customer 360, and performs only approved edits. Existing `/customers` behavior remains available and no sample identity is presented as live.

## 5. Milestone UCRM-2 — Customer Memory and Daily Execution

**Target:** Week 2
**Depends on:** UCRM-1

| ID | Agent-sized vertical slice | Acceptance evidence |
| --- | --- | --- |
| UCRM-020 | Unified permitted activity timeline — `IMPLEMENTED_UNVERIFIED` | Customer 360 now exposes a read-only unified relationship timeline that merges permitted source events with stable correlation keys, pagination, masking, freshness, empty/error states, and focused tests. Authenticated browser proof and isolated PostgreSQL proof remain pending. |
| UCRM-021 | Manual contact outcome — `IMPLEMENTED_UNVERIFIED` | Customer 360 now records manual relationship touchpoints through a governed interaction command with channel/direction/outcome/occurred-time/consent validation, idempotency, activity/audit evidence, and focused tests. Authenticated browser proof and isolated PostgreSQL proof remain pending. |
| UCRM-022 | Notes and visibility — `IMPLEMENTED_UNVERIFIED` | Customer 360 now records internal/restricted notes through a governed note command with visibility authorization, idempotency, audit evidence, safe role display, and focused tests. Authenticated browser proof and isolated PostgreSQL proof remain pending. |
| UCRM-023 | Commitment and next action — `IMPLEMENTED_UNVERIFIED` | Customer 360 now supports guarded create/complete/reschedule next-action continuity with typed overdue/today/scheduled states, fail-closed replay, focused service/route/repository coverage, and honest unavailable behavior. Authenticated browser proof and isolated PostgreSQL proof remain pending. |
| UCRM-024 | Task bridge — `IMPLEMENTED_UNVERIFIED` | Customer 360 now supports a protected idempotent CRM-to-Task bridge that creates a real follow-up task through the existing governed Task workflow, returns the authoritative task route, and falls back honestly when the bridge is off. Authenticated browser proof and isolated PostgreSQL proof remain pending before verification or merge. |
| UCRM-025 | CRM Home “My Work” v1 — `IMPLEMENTED_UNVERIFIED` | CRM Home and Work now use a real persisted read-only queue across Appointments, Leads, Cases, and CRM next actions with deterministic ranking, freshness, drill-through, safe Customer 360 continuity, same-day Today behavior, empty/error states, and focused ranking/filter-integrity coverage. Task rows remain intentionally withheld until tenant-safe Task authority is proven. Authenticated browser proof and isolated PostgreSQL reconciliation proof remain pending. |

**UX checkpoint UCRM-UXR-2:** Before exit, representative staff review My Work, manual outcome capture, timeline, note, commitment, and Task handoff live. Accepted time/click flow is then proven against the full vertical slice; local-only UI state cannot pass.

**Exit gate:** A staff user can log an outcome, create a dated next action or linked task, reload, and see correlated timeline and audit evidence. No external message is sent.

## 6. Milestone UCRM-3 — Opportunities, Pipeline, and Dispatch Linkage

**Target:** Weeks 3–4
**Depends on:** UCRM-2

| ID | Agent-sized vertical slice | Acceptance evidence |
| --- | --- | --- |
| UCRM-030 | Opportunity persistence, create, and source-lead bridge — `IMPLEMENTED_UNVERIFIED` | Approved lifecycle, additive persistence, durable `NEW_INQUIRY` create command, customer/source-lead validation, idempotent command ledger, stage history, domain event, audit, outbox, focused tests, and isolated PostgreSQL proof exist. Authenticated browser proof and final Product Owner UXR-3 review remain pending. |
| UCRM-031 | Governed stage transition — `IMPLEMENTED_UNVERIFIED` | Explicit transition command, approved stage graph, active/won/lost evidence rules, optimistic concurrency, idempotency, authority, stage history, domain event, audit, outbox, live transition UI, focused tests, and isolated PostgreSQL proof exist. Authenticated browser proof, board drag/drop reuse, and final Product Owner UXR-3 review remain pending. |
| UCRM-032 | Opportunity detail read model — `IMPLEMENTED_UNVERIFIED` | Permission-filtered detail includes customer context, lifecycle stage/version, allowed next moves, next action/due state, recent stage history, related same-customer opportunities, source/freshness, safe missing/restricted states, focused tests, and isolated PostgreSQL proof. Activity stream, related work bridges, browser proof, and final Product Owner UXR-3 review remain pending. |
| UCRM-033 | Visual pipeline board — `IMPLEMENTED_UNVERIFIED` | Reconciled pipeline read model groups persisted opportunities into approved lifecycle columns, shows stage/version/next-action/due context, preserves list/table alternative, and links each moveable card into the UCRM-031 transition command. Drag/drop gesture, browser proof, and final Product Owner UXR-3 review remain pending. |
| UCRM-034 | Pipeline work queue — `IMPLEMENTED_UNVERIFIED` | Opportunity queue shows owned, unassigned, overdue, stalled, waiting, and at-risk segments with explainable membership, freshness observation, permission-safe live entries, transition-command links, focused tests, and isolated PostgreSQL proof. Pagination, browser proof, and final Product Owner UXR-3 review remain pending. |
| UCRM-035 | Opportunity activity and task linkage — `IMPLEMENTED_UNVERIFIED` | Opportunity detail now exposes governed task activity, creates linked Dispatch tasks through an idempotent opportunity task bridge command, preserves opportunity/task/customer correlation, writes durable link/ledger/audit/outbox records, and includes focused unit plus isolated PostgreSQL proof. Existing task close/archive outcome sync, browser proof, and final Product Owner UXR-3 review remain pending. |
| UCRM-036 | Appointment bridge — `IMPLEMENTED_UNVERIFIED` | Opportunity detail now exposes governed appointment activity, creates linked draft appointments through the existing appointment command engine, records durable opportunity/appointment bridge links, preserves optimistic versioning and idempotent replay, writes CRM ledger/audit/outbox records, and includes focused unit plus isolated PostgreSQL proof. Existing appointment-link-to-existing-record, browser proof, and final Product Owner UXR-3 review remain pending. |
| UCRM-037 | Job/dispatch bridge — `IMPLEMENTED_UNVERIFIED` | Approved opportunity command links existing repair orders or repair jobs without duplicating Dispatch truth; policy, idempotency, target-version checks, correlation, audit/outbox, detail readback, UI link form, focused tests, and isolated PostgreSQL proof exist. Browser proof and final Product Owner UXR-3 review remain pending. |
| UCRM-038 | Customer 360 opportunity lens — `IMPLEMENTED_UNVERIFIED` | Customer 360 now shows authorized persisted opportunity history with stage, linked Dispatch count, and repair-order/job summaries reconciled from opportunity dispatch bridge records. Focused unit tests and isolated PostgreSQL proof exist. Browser proof and final Product Owner UXR-3 review remain pending. |
| UCRM-039 | End-to-end core slice gate — `IMPLEMENTED_UNVERIFIED` | Isolated PostgreSQL gate proves customer -> opportunity -> stage -> task -> appointment -> dispatch link -> opportunity detail -> Customer 360 -> ledger/audit/domain/outbox under manager and owner-scoped sales personas, including feature-off failure behavior. Browser proof and final Product Owner UXR-3 review remain pending. |

**UX checkpoint UCRM-UXR-3:** Seller and manager interact with opportunity detail, board/table movement, keyboard alternative, errors, and dispatch handoff before composition is locked and again against the implemented server-authoritative workflow.

**Exit gate:** UCRM-039 passes on one commit. Every active opportunity has owner, stage, and dated next action. Pipeline counts reconcile and dispatch remains the operational authority.

## 7. Milestone UCRM-4 — Quotes and Commercial Governance

**Target:** Week 5
**Depends on:** UCRM-3

| ID | Agent-sized vertical slice | Acceptance evidence |
| --- | --- | --- |
| UCRM-040 | Quote and line-item persistence — `IMPLEMENTED_UNVERIFIED` | Additive versioned models now preserve currency, price source, terms, creator, opportunity/customer correlation, draft/presented state, and migration rollback compatibility behind a held review surface. Focused service and migrated runtime proof passed; authenticated browser proof and downstream governed draft/presentation proof remain pending. |
| UCRM-041 | Draft quote workflow — `IMPLEMENTED_UNVERIFIED` | Create/update draft service, version-aware/idempotent save, audit evidence, focused tests, runtime create/replay/revise proof, and live `/crm/quotes` draft workspace states are now in source. Authenticated browser proof, broader regression proof, and UX checkpoint remain required before verification or merge. |
| UCRM-042 | Quote presentation/version lock — `HELD` | Immutable version review and a fail-closed held presentation boundary are now in source, but live presentation activation remains held until the deferred commercial authority thresholds and later approval slices are proven. |
| UCRM-043 | Commercial approval request — `IMPLEMENTED_UNVERIFIED` | Quote-version-bound approval requests, approve/return/deny decisions, separation-of-duties, idempotent replay, policy snapshots, internal outbox notification, and audit evidence are now in source without inferring numeric thresholds or enabling presentation. Browser and broader regression proof remain pending. |
| UCRM-044 | Opportunity quote lens — `IMPLEMENTED_UNVERIFIED` | Detail and Customer 360 now show authorized quote history, current version, latest internal approval state, safe source links, and requested amount/discount context without exposing restricted margin fields or enabling presentation. Browser and broader regression proof remain pending. |
| UCRM-045 | Quote-to-operational handoff boundary — `IMPLEMENTED_UNVERIFIED` | Approved quote handoff context can now be prepared behind a read-only boundary that explicitly blocks sold, delivered, invoice, and dispatch-complete side effects. Focused unit, runtime, lint, and type-filter proof passed; browser, route unit, and broader regression proof remain pending. |

**UX checkpoint UCRM-UXR-4:** Seller and manager review quote drafting, version identity, approval boundaries, denial, stale state, and recovery live; acceptance cannot precede operational proof of the immutable/versioned contract.

**Exit gate:** A permitted user can draft, revise, present, and route a quote for approval. Immutable versions, restricted fields, denial paths, and safe disablement are proven.

## 8. Milestone UCRM-5 — Search, Dashboards, and Manager Control

**Target:** Week 6
**Depends on:** UCRM-3 and UCRM-4

| ID | Agent-sized vertical slice | Acceptance evidence |
| --- | --- | --- |
| UCRM-050 | Global CRM search — `IMPLEMENTED_UNVERIFIED` | Policy-filtered global search now covers customer, contact, opportunity, quote, task, appointment, vehicle, and dispatch identifiers behind a read-only scoped API with deterministic grouping and no restricted owner-scope existence leaks. Focused unit, route, runtime, lint, and type-filter proof are being collected; browser and broader regression proof remain pending. |
| UCRM-051 | Search interaction UI — `IMPLEMENTED_UNVERIFIED` | CRM shell now has a live global search combobox with grouped linked results, loading/empty/unavailable states, keyboard Escape/Arrow/Enter handling, and preserved source-specific work filtering. Authenticated browser, latency, stale-state, and broader regression proof remain pending. |
| UCRM-052 | CRM Home operational dashboard — `IMPLEMENTED_UNVERIFIED` | CRM Home now renders a read-only operational dashboard for owned/team work, overdue follow-up, pipeline, quotes, and dispatch handoffs with scoped counts, drill-through links, and freshness. Runtime database and authenticated browser proof remain pending. |
| UCRM-053 | Manager exception queues — `IMPLEMENTED_UNVERIFIED` | Read-only manager exception queue API now covers unassigned, stalled, overdue, approval, and dispatch-handoff records with explainable membership, summary counts, source links, and offset pagination. Runtime database, UI, authorized action, and browser proof remain pending. |
| UCRM-054 | Forecast baseline and history — `IMPLEMENTED_UNVERIFIED` | Deterministic opportunity-stage baseline forecasts and append-only seller/manager judgment snapshots are now modeled separately with required reasons, idempotent submit, version checks, and read/submit APIs. UI, browser, and broader regression proof remain pending. |
| UCRM-055 | Saved views — `IMPLEMENTED_UNVERIFIED` | Private/shared CRM saved views are now server-backed, schema-versioned, policy-checked, recover from invalid stored fields, and expose list/create/delete APIs. UI, authenticated browser, and broader regression proof remain pending. |
| UCRM-056 | Dashboard reconciliation gate — `IMPLEMENTED_UNVERIFIED` | A manager-only reconciliation API now maps CRM dashboard metrics to scoped sample records with freshness, drill-through, field masking, performance, and manager-workflow checks. Authenticated browser and full UX review remain pending. |

**UX checkpoint UCRM-UXR-5:** Managers review global search, dashboard drill-through, forecasts, exception queues, freshness, and unavailable states live; the exit review uses reconciled records rather than presentation constants.

**Exit gate:** Users can find records and act from reconciled daily/manager views. Every metric and priority can explain its records, rule, and freshness.

## 9. Milestone UCRM-6 — Hardening and Controlled Pilot

**Target:** Weeks 7–8
**Depends on:** UCRM-1 through UCRM-5

| ID | Agent-sized deliverable | Acceptance evidence |
| --- | --- | --- |
| UCRM-060 | Migration and administrator-assisted pilot data load rehearsal — `IMPLEMENTED_UNVERIFIED` | A dry-run administrator rehearsal API now handles bounded pilot rows with validation, mapping, duplicate review, provenance, checksums/counts, per-record outcomes, backup/restore timing estimates, and no live CRM writes. Approved source-file rehearsal and browser proof remain pending. |
| UCRM-061 | Security verification — `IMPLEMENTED_UNVERIFIED` | A manager-only security verification API now records pass evidence for isolation/RBAC/masking/IDOR/input controls and named holds for CSRF/session, export, logs/secrets, dependency scan, and abuse/rate-limit proof. Release-candidate security evidence remains pending. |
| UCRM-062 | Reliability and concurrency — `IMPLEMENTED_UNVERIFIED` | A manager-only reliability verification API now records pass evidence for stale writes and idempotency reuse, with named holds for transaction failure, retries, projection lag, unavailable dependencies, job leases, and recovery rehearsal. Release-candidate fault proof remains pending. |
| UCRM-063 | Accessibility and responsive gate — `IMPLEMENTED_UNVERIFIED` | A manager-only WCAG 2.2 AA verification API now records pass evidence for keyboard/focus/error behavior and named UX holds for screen-reader, contrast, zoom, desktop/mobile, and light/dark proof. Authenticated release-candidate UX review remains pending. |
| UCRM-064 | Performance and observability — `IMPLEMENTED_UNVERIFIED` | A manager-only performance/observability API now records SLO targets plus pass evidence for query budgets, freshness/lag timestamps, and correlation, with named holds for representative data volume, page/search latency, logs, and alerts. Release-candidate performance proof remains pending. |
| UCRM-065 | Full automated regression — `HELD` | A manager-only full-regression API records passed focused schema/lint/unit/integration/policy evidence and named holds for production build, CRM browser suite, and impacted Dispatch Board regression. Current source typecheck passes, but release-candidate proof remains required. |
| UCRM-066 | Pilot operations package — `IMPLEMENTED_UNVERIFIED` | A manager-only pilot operations API and runbook now cover cohort, flags, training, support owner, known limits, monitoring, incident/escalation, privacy, backup, and rollback. Formal owner acceptance remains pending. |
| UCRM-067 | Rollback rehearsal — `IMPLEMENTED_UNVERIFIED` | A manager-only rollback rehearsal API and runbook now cover kill switches, prior-release recovery, in-flight write handling, retained evidence, existing Customers/Sales fallback, restore timing, and decision logging. Release-candidate rehearsal remains pending. |
| UCRM-068 | Pilot execution — `IMPLEMENTED_UNVERIFIED` | A manager-only pilot execution API now defines representative internal manager/staff workflows, reporting requirements, measures, and internal-pilot-only scope. Actual participant outcomes remain pending. |
| UCRM-069 | Pilot go/no-go — `IMPLEMENTED_UNVERIFIED` | A manager-only pilot go/no-go API now records product, operations, security, and engineering decisions as `HELD` with exact blockers and no enabled scope. Final owner decisions remain pending. |

**UX checkpoint UCRM-UXR-6:** The named pilot cohort completes the integrated manager/staff journeys live on the same release candidate used for security, reliability, accessibility, performance, and rollback gates. Findings are recorded in UCRM-068/069.

**Exit gate:** UCRM-069 contains an explicit decision. Absence of evidence means `HELD`, not provisional approval.

## 10. Milestone UCRM-7 — Internal Production Release

**Target:** Weeks 9–10 contingency
**Depends on:** Approved UCRM-069

| ID | Agent-sized deliverable | Acceptance evidence |
| --- | --- | --- |
| UCRM-070 | Pilot finding closure — `IMPLEMENTED_UNVERIFIED` | A manager-only closure API now tracks pilot findings by owner, status, release impact, and evidence path, holding release-candidate validation until every finding is fixed with regression proof, accepted with owner/date, or removed from enabled scope. |
| UCRM-071 | Release-candidate validation — `IMPLEMENTED_UNVERIFIED` | A manager-only validation API now requires UCRM-060 through UCRM-067 evidence to be rerun or confirmed current against the exact release-candidate commit and production configuration before validation can pass. |
| UCRM-072 | Operational handoff — `IMPLEMENTED_UNVERIFIED` | A manager-only handoff API now tracks owner confirmation for monitoring, support, permissions, flag changes, incident response, data recovery, training, and rollback authority before internal release decision. |
| UCRM-073 | Internal release decision — `IMPLEMENTED_UNVERIFIED` | A manager-only release decision API now records approved cohorts/capabilities, known limitations, evidence commit, migration version, and rollback trigger, while holding release until all prior gates are approved. |
| UCRM-074 | Post-release verification — `IMPLEMENTED_UNVERIFIED` | A manager-only post-release verification API now tracks smoke workflows, reconciliation, alerts, error/latency/freshness, audit delivery, and support intake after controlled enablement, with rollback-required checks identified. |

**Exit gate:** Only UCRM-073 may declare the internal MVP released. UCRM-074 must confirm the release remains healthy or activate rollback/hold criteria.

## 11. Milestone UCRM-8 — External Communications and Integrations

**Status:** Deferred until after internal MVP stability
**Depends on:** UCRM-7 plus provider-specific approval

| ID | Agent-sized vertical slice | Acceptance evidence |
| --- | --- | --- |
| UCRM-080 | Integration platform contract — `IMPLEMENTED_UNVERIFIED` | Credential isolation, tenant mapping, adapter interface, idempotency, delivery/sync state, retries, reconciliation, rate limits, webhooks, audit, and kill switches are accepted. |
| UCRM-081 | Email/calendar provider A — `HELD` | One approved provider completes authorization, least privilege, sync/backfill, consent, dedupe, conflict, revoke, retry, reconciliation, security, browser, and rollback gates. |
| UCRM-082 | Email/calendar provider B — `HELD` | Second provider repeats the full gate; it does not inherit approval from UCRM-081. |
| UCRM-083 | SMS delivery — `HELD` | Approved vendor, consent/opt-out, templates, delivery states, quiet hours, inbound correlation, failure/retry, audit, cost/rate controls, and kill switch pass. |
| UCRM-084 | Telephony/transcription — `HELD` | Calling, recording consent, retention, restricted access, transcription provenance, provider failure, audit, and legal approval pass before activation. |
| UCRM-085 | E-signature — `HELD` | Document authority, signer identity, immutable envelope evidence, webhook reconciliation, expiry/cancel, permissions, and provider rollback pass. |
| UCRM-086 | Accounting/DMS connector — `HELD` | Field ownership, mapping, conflict rules, backfill, incremental sync, reconciliation, sensitive data, failure recovery, and disablement are proven for one named system. |

No adapter is complete at “API connected.” Each is a full vertical slice with external-side-effect proof.

## 12. Milestone UCRM-9 — Enterprise Expansion

**Status:** Deferred; prioritize by adoption and business value
**Depends on:** Stable internal release and approved capability case

| ID | Capability package | Required gate |
| --- | --- | --- |
| UCRM-100 | Fine-grained field/record/territory sharing — `HELD` | Formal access model, scale tests, policy proof, admin UX, audit, recovery, and migration evidence. |
| UCRM-101 | Governed custom fields and layouts — `HELD` | Namespace/type/version rules, validation, indexing, permissions, reporting impact, limits, rollback, and admin preview. |
| UCRM-102 | Workflow and approval designer — `HELD` | Versioning, simulation, authority, limits, loop protection, observability, rollback, and sandbox/publish gates. |
| UCRM-103 | Sandbox and configuration promotion — `HELD` | Isolation, masked data, diff/review, promotion, validation, audit, and rollback. |
| UCRM-104 | Advanced retention, legal hold, and export — `HELD` | Approved policy, field classification, immutable evidence, job simulation, recovery, and legal/security signoff. |
| UCRM-105 | Advanced forecasting and attribution — `HELD` | Explainability, source freshness, historical evaluation, override separation, bias/error review, and deterministic fallback. |
| UCRM-106 | Governed AI assistance — `HELD` | Permission-aware retrieval, citations/provenance, evaluation set, prompt-injection defense, human approval, cost/latency, logging, opt-out, and kill switch. |
| UCRM-107 | Broader lifecycle modules — `HELD` | Renewal, account health, service/case, marketing, or commercial expansion receives its own domain, security, test, pilot, and release milestones. |

## 13. Milestone UCRM-10 — Communication, AI, and Admin Execution Layer

**Status:** Planned; implement sequentially after enterprise readiness gates
**Depends on:** UCRM-080 through UCRM-107 readiness boundaries and Product Owner review

| ID | Capability package | Required gate |
| --- | --- | --- |
| UCRM-108 | CRM enterprise/admin readiness hub — `IMPLEMENTED_UNVERIFIED` | A manager-readable hub summarizes available, held, and planned CRM integration/admin gates without enabling held capabilities. |
| UCRM-109 | Provider decision intake — `HELD` | Email, SMS, and phone provider choices are captured with owner, scope, credential, cost, consent, rollback, and evidence requirements. |
| UCRM-110 | Customer communication consent foundation — `HELD` | Consent, suppression, opt-out, quiet hours, purpose, and channel readiness are visible before any send/call action. |
| UCRM-111 | CRM conversation envelope storage — `IMPLEMENTED_UNVERIFIED` | Durable conversation envelopes safely link manual outcomes and future provider events without external sending. |
| UCRM-112 | Email draft surface — `IMPLEMENTED_UNVERIFIED` | Staff can draft review-only customer email content without provider sending or mailbox sync. |
| UCRM-113 | SMS template catalog — `IMPLEMENTED_UNVERIFIED` | Approved text-message templates can be prepared and reviewed without outbound SMS delivery. |
| UCRM-114 | Manual phone-call disposition capture — `IMPLEMENTED_UNVERIFIED` | Staff can log call attempts/outcomes without VoIP or recording activation. |
| UCRM-115 | Customer 360 communication timeline lens — `IMPLEMENTED_UNVERIFIED` | Customer 360 can show permitted communication envelopes and manual outcomes without leaking restricted fields. |
| UCRM-116 | Customer 360 communication action readiness — `IMPLEMENTED_UNVERIFIED` | Customer 360 shows honest email/text/call readiness states and fallback actions. |
| UCRM-117 | Provider health and disabled-state dashboard — `IMPLEMENTED_UNVERIFIED` | Management can inspect provider disabled/held/degraded state, health, and kill-switch posture. |
| UCRM-118 | Integration retry and reconciliation review surface — `IMPLEMENTED_UNVERIFIED` | Management can inspect retry/reconciliation queues without replaying external side effects. |
| UCRM-119 | Quiet hours, rate limits, and cost controls — `IMPLEMENTED_UNVERIFIED` | Communication guardrails are modeled, reviewable, and fail closed. |
| UCRM-120 | AI receptionist requirements and safety contract — `IMPLEMENTED_UNVERIFIED` | AI receptionist behavior is specified with consent, retrieval, escalation, human approval, and no-action defaults. |
| UCRM-121 | AI receptionist simulator — `IMPLEMENTED_UNVERIFIED` | Staff can simulate intake/receptionist scenarios without live calls or texts. |
| UCRM-122 | E-signature/document readiness surface — `IMPLEMENTED_UNVERIFIED` | Management can review document/signature readiness gates without sending envelopes. |
| UCRM-123 | Accounting/DMS mapping preview — `IMPLEMENTED_UNVERIFIED` | Management can preview mappings/conflicts for one future system without sync or writes. |
| UCRM-124 | Custom field/layout admin preview — `IMPLEMENTED_UNVERIFIED` | Admins can preview effective custom layouts without publishing. |
| UCRM-125 | Workflow simulation preview — `IMPLEMENTED_UNVERIFIED` | Admins can simulate workflow rules without live execution. |
| UCRM-126 | Sandbox promotion diff/review screen — `IMPLEMENTED_UNVERIFIED` | Admins can review config promotion diffs without production promotion. |
| UCRM-127 | CRM release-readiness cleanup and regression stabilization — `IMPLEMENTED_UNVERIFIED` | The communication/admin envelope receives regression, accessibility, fallback, rollback, and evidence cleanup before merge review. |

## 14. Slice Definition of Done

A `UCRM-###` slice is `VERIFIED` only when all applicable statements are true:

- dependency and entry gate were satisfied;
- migration is additive/rehearsed or explicitly not applicable;
- repository has organization-safe reads/writes;
- service owns business rules and transactional behavior;
- policy enforces server-side authority and field visibility;
- validation rejects invalid and ambiguous input;
- route/read model exposes only the required contract and honest freshness;
- UI includes accessible loading, empty, error, stale, denied, success, and recovery states;
- applicable live interactive UX checkpoint has an owner decision, and the accepted experience is re-proven over real contracts rather than only a synthetic preview;
- important changes create correlated activity and immutable audit evidence;
- focused success, denial, validation, concurrency, idempotency, and failure tests pass;
- representative browser proof passes for affected roles and viewports;
- flag-off/rollback/recovery behavior is proven;
- docs and implementation status accurately reflect the result;
- diff contains no unrelated work and evidence identifies the commit.

If any applicable item is absent, the slice remains `IN_PROGRESS`, `IMPLEMENTED_UNVERIFIED`, or `HELD`.
