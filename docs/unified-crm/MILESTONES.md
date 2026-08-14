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

All slices below begin as `PLANNED`.

## 3. Milestone UCRM-0 — Foundation and Authority Gate

**Target:** Days 1–3
**Depends on:** Clean shared baseline
**Feature posture:** No CRM workflow enabled

| ID | Agent-sized deliverable | Acceptance evidence |
| --- | --- | --- |
| UCRM-000 | Product boundary and vocabulary | CRM purpose, personas, navigation, glossary, internal MVP, exclusions, and “independent console/shared platform” rule are accepted. |
| UCRM-001 | Current-state and source-ownership map | Existing Customers/Sales/shared capabilities are classified as durable, sample, adapter, planned, or deprecated; canonical owner and reuse decision are named per record. |
| UCRM-002 | Domain and data contract | Customer/contact/opportunity/activity/task/quote/dispatch relationships, identifiers, invariants, lifecycle states, concurrency, archive, and dedupe boundaries are versioned. |
| UCRM-003 | Application architecture | Module boundaries, repositories, services, policies, validation, routes, read models, events, search/report projections, jobs, and dependency rules are accepted. |
| UCRM-004 | Security and privacy foundation | Threat model, data classification, organization isolation, RBAC/capabilities, field visibility, secrets, audit, retention, export, and incident requirements are approved. |
| UCRM-005 | Testing and evidence strategy | Test pyramid, fixtures, permission matrix, browser personas, accessibility, performance, migration, recovery, and release evidence formats are accepted. |
| UCRM-006 | SLO and success criteria | Page/search latency, projection freshness, availability, recovery objectives, adoption measures, and pilot thresholds have named owners and approved values. |
| UCRM-007 | Agent execution model | Roles, decision owners, file/contract ownership, handoff template, dependency queue, review rules, conflict escalation, and integration cadence are established. |
| UCRM-008 | Feature-control and rollback contract | Console/workspace/command flags, cohort selection, kill switches, downgrade behavior, data preservation, and rollback authority are accepted. |
| UCRM-009 | Foundation traceability gate | Requirements-to-milestone map, ADR register, risk register, evidence index, and current-status update distinguish plans from implementation. |

**Exit gate:** UCRM-000–009 are accepted on one baseline. Unresolved canonical ownership, lifecycle, permission, or rollback decisions place dependent work in `HELD` status.

## 4. Milestone UCRM-1 — Independent Console and Customer Truth

**Target:** Week 1
**Depends on:** UCRM-0

| ID | Agent-sized vertical slice | Acceptance evidence |
| --- | --- | --- |
| UCRM-010 | CRM console entry and route shell | Authenticated `/crm` entry, role-safe navigation, unavailable/flag-off fallback, responsive shell, focused route tests, browser entry proof, and rollback to existing consoles. |
| UCRM-011 | CRM capability policy baseline | Server capabilities for CRM access, customer view, sensitive-field view, mutation, export, and administration pass role and cross-organization denial tests. |
| UCRM-012 | Canonical customer/contact adapter | Repository/read service uses approved shared customer/contact authority, masks fields by policy, exposes freshness/source, and adds no duplicate truth. |
| UCRM-013 | Customer list read model and UI | Paginated/filterable list covers loading, empty, error, stale, restricted, desktop/mobile, keyboard, tests, browser proof, and docs. |
| UCRM-014 | Customer 360 overview | Routed CRM customer view shows permitted identity, contacts, owner, relationships, freshness, and safe not-found/merged/archived outcomes. |
| UCRM-015 | Customer/contact controlled edit | If approved by UCRM-001, additive model work and transaction-safe create/update enforce validation, policy, optimistic concurrency, activity/audit, tests, browser proof, flag, and rollback. |
| UCRM-016 | Duplicate candidate warning | Deterministic normalized matching advises without automatic merge; explanations, false-positive continuation, policy-safe data, tests, and audit are proven. |
| UCRM-017 | Safe customer/contact import foundation | Quarantined synthetic/approved file input supports mapping and field-class preview, formula neutralization, organization binding, validation, duplicate candidates, dry run, bounded idempotent commit, per-row receipts, audit, reconciliation, correction/rollback guidance, tests, and browser proof. |

**Exit gate:** An authorized user enters `/crm`, finds a durable customer, opens Customer 360, and performs only approved edits or bounded imports. Existing `/customers` behavior remains available and no sample identity is presented as live.

## 5. Milestone UCRM-2 — Customer Memory and Daily Execution

**Target:** Week 2
**Depends on:** UCRM-1

| ID | Agent-sized vertical slice | Acceptance evidence |
| --- | --- | --- |
| UCRM-020 | Unified permitted activity timeline | Repository/read model merges approved source events with stable correlation, pagination, filtering, masking, freshness, empty/error states, tests, and browser proof. |
| UCRM-021 | Manual contact outcome | Log-call/message/meeting/visit command validates channel, direction, outcome, occurred time, consent state, policy, idempotency, activity/audit, tests, and refresh proof. |
| UCRM-022 | Notes and visibility | Add-note command supports approved visibility classes, rejects unauthorized restricted notes, audits changes, and proves safe display by role. |
| UCRM-023 | Commitment and next action | Create/complete/reschedule commitment requires owner and due time, handles stale/idempotent updates, writes timeline/audit, and proves overdue and renewal behavior. |
| UCRM-024 | Task bridge | Idempotent CRM-to-Task command preserves customer/context correlation, source authority, policy, failure/retry evidence, UI handoff, tests, and browser proof. |
| UCRM-025 | CRM Home “My Work” v1 | Read model ranks due/overdue owned work deterministically, explains ordering and freshness, supports drill-through, empty/error states, reconciliation tests, and role browser proof. |

**Exit gate:** A staff user can log an outcome, create a dated next action or linked task, reload, and see correlated timeline and audit evidence. No external message is sent.

## 6. Milestone UCRM-3 — Opportunities, Pipeline, and Dispatch Linkage

**Target:** Weeks 3–4
**Depends on:** UCRM-2

| ID | Agent-sized vertical slice | Acceptance evidence |
| --- | --- | --- |
| UCRM-030 | Opportunity persistence and create | Additive migration/repository/service creates an opportunity with customer, lane/type, owner, stage, next action, due time, version, source, policy, validation, event/audit, tests, browser proof, and flag. |
| UCRM-031 | Governed stage transition | Explicit transition command enforces stage evidence, required fields, lost reason, optimistic concurrency, idempotency, authority, activity/audit, negative tests, and UI proof. |
| UCRM-032 | Opportunity detail read model | Permission-filtered detail includes customer context, stage history, next action, activities, related work, source/freshness, safe missing/restricted states, tests, and browser proof. |
| UCRM-033 | Visual pipeline board | Reconciled read model and accessible board/table views support filters and drill-through; drag/drop invokes UCRM-031 and has keyboard/non-drag equivalent plus failure recovery. |
| UCRM-034 | Pipeline work queue | Owned, unassigned, overdue, stalled, and at-risk queues use explainable membership, freshness, pagination, reconciliation tests, and manager/staff policy proof. |
| UCRM-035 | Opportunity activity and task linkage | Opportunity interactions, commitments, and Task links retain stable customer/opportunity correlation and preserve source history on archive/close. |
| UCRM-036 | Appointment bridge | Idempotent opportunity-to-Appointment draft/link uses shared authority, validates customer/time/permissions, handles retry/conflict, audits outcome, and proves both consoles remain consistent. |
| UCRM-037 | Job/dispatch bridge | Approved opportunity command creates or links operational work without duplicating job truth; policy, idempotency, partial-failure recovery, correlation, audit, tests, and cross-console browser proof pass. |
| UCRM-038 | Customer 360 opportunity lens | Customer record shows authorized open/history opportunities and linked dispatch work with counts reconciled to source records. |
| UCRM-039 | End-to-end core slice gate | Seeded workflow proves customer -> opportunity -> stage -> task/appointment -> dispatch link -> timeline/audit under manager and staff roles, with flag-off rollback proof. |

**Exit gate:** UCRM-039 passes on one commit. Every active opportunity has owner, stage, and dated next action. Pipeline counts reconcile and dispatch remains the operational authority.

## 7. Milestone UCRM-4 — Quotes and Commercial Governance

**Target:** Week 5
**Depends on:** UCRM-3

| ID | Agent-sized vertical slice | Acceptance evidence |
| --- | --- | --- |
| UCRM-040 | Quote and line-item persistence | Additive versioned models preserve currency, price source, terms, creator, opportunity/customer correlation, draft/presented state, and migration rollback compatibility. |
| UCRM-041 | Draft quote workflow | Create/update draft service enforces policy, validation, optimistic concurrency, calculations, idempotency, audit, focused tests, UI states, and browser proof. |
| UCRM-042 | Quote presentation/version lock | Present command creates an immutable version/snapshot; later edits create a new version, never rewrite presented evidence; tests and audit prove history. |
| UCRM-043 | Commercial approval request | Threshold/policy-controlled request, approve, return, and deny commands require authority and reason; notification is internal, decisions are audited, and retry is safe. |
| UCRM-044 | Opportunity quote lens | Detail and Customer 360 show authorized quote history, current version, approval state, blockers, and source evidence without exposing restricted margin fields. |
| UCRM-045 | Quote-to-operational handoff boundary | Accepted quote may prepare approved handoff data but cannot silently mark sold, delivered, invoiced, or dispatch-complete; policy and audit tests prove boundaries. |

**Exit gate:** A permitted user can draft, revise, present, and route a quote for approval. Immutable versions, restricted fields, denial paths, and safe disablement are proven.

## 8. Milestone UCRM-5 — Search, Dashboards, and Manager Control

**Target:** Week 6
**Depends on:** UCRM-3 and UCRM-4

| ID | Agent-sized vertical slice | Acceptance evidence |
| --- | --- | --- |
| UCRM-050 | Global CRM search | Policy-filtered search covers approved customer, contact, opportunity, quote, task, appointment, vehicle, and dispatch identifiers; relevance is deterministic and no restricted existence leaks. |
| UCRM-051 | Search interaction UI | Keyboard-accessible command/results experience supports grouped results, recent permitted items, loading/empty/error/stale states, record opening, latency evidence, and browser proof. |
| UCRM-052 | CRM Home operational dashboard | Metrics for owned work, overdue follow-up, pipeline, quotes, and dispatch handoffs reconcile to drill-through records and expose freshness/unavailable states. |
| UCRM-053 | Manager exception queues | Unassigned, stalled, overdue, approval, and dispatch-handoff exceptions have explainable membership, authorized actions, pagination, tests, and browser proof. |
| UCRM-054 | Forecast baseline and history | Deterministic category/amount projection remains distinguishable from seller and manager judgment; overrides require reason and append-only history. |
| UCRM-055 | Saved views | Private/shared filters are server-backed, schema-versioned, policy-checked, recover from invalid fields, and prove share/deny paths. |
| UCRM-056 | Dashboard reconciliation gate | Automated reconciliation, freshness/lag, query/performance, field masking, drill-through, accessibility, and manager workflow evidence pass. |

**Exit gate:** Users can find records and act from reconciled daily/manager views. Every metric and priority can explain its records, rule, and freshness.

## 9. Milestone UCRM-6 — Hardening and Controlled Pilot

**Target:** Weeks 7–8
**Depends on:** UCRM-1 through UCRM-5

| ID | Agent-sized deliverable | Acceptance evidence |
| --- | --- | --- |
| UCRM-060 | Migration and data rehearsal | Production-shaped migration/seed rehearsal, backward compatibility, duplicate handling, checksums/counts, backup/restore, and rollback timings are recorded. |
| UCRM-061 | Security verification | Organization isolation, RBAC/capabilities, field masking, IDOR, injection/input, CSRF/session, export, logs, secrets, dependency scan, and abuse/rate-limit evidence pass or have named holds. |
| UCRM-062 | Reliability and concurrency | Stale writes, idempotency reuse, transaction failure, retries, projection lag, unavailable dependencies, job leases, and recovery behavior pass fault-focused tests. |
| UCRM-063 | Accessibility and responsive gate | WCAG 2.2 AA target checks, keyboard/screen-reader workflows, focus/error behavior, contrast, zoom, desktop/mobile, and light/dark proof are recorded. |
| UCRM-064 | Performance and observability | Agreed SLOs, representative data volumes, query budgets, page/search latency, freshness/lag dashboards, structured logs, alerts, and correlation are proven. |
| UCRM-065 | Full automated regression | Schema/generation, typecheck, lint, unit, integration, policy, production build, CRM browser suite, and impacted Dispatch Board regression pass on one commit. |
| UCRM-066 | Pilot operations package | Cohort, flags, training, quick-start, support owner, known limits, monitoring, incident/escalation, privacy, backup, and rollback runbooks are accepted. |
| UCRM-067 | Rollback rehearsal | Console/command kill switches, prior-release recovery, in-flight write handling, retained evidence, and existing Customers/Sales fallback are rehearsed. |
| UCRM-068 | Pilot execution | Named internal cohort completes representative manager/staff workflows; defects, friction, measures, and decisions are recorded without implying broad release. |
| UCRM-069 | Pilot go/no-go | Product, operations, security, and engineering record Approved, Held, or reduced-scope continuation with exact flags and blockers. |

**Exit gate:** UCRM-069 contains an explicit decision. Absence of evidence means `HELD`, not provisional approval.

## 10. Milestone UCRM-7 — Internal Production Release

**Target:** Weeks 9–10 contingency
**Depends on:** Approved UCRM-069

| ID | Agent-sized deliverable | Acceptance evidence |
| --- | --- | --- |
| UCRM-070 | Pilot finding closure | Every pilot finding is fixed with regression proof, accepted with owner/date, or removed from enabled scope. |
| UCRM-071 | Release-candidate validation | Full UCRM-060–067 evidence is rerun or confirmed valid against the exact release candidate and production configuration. |
| UCRM-072 | Operational handoff | Owners confirm monitoring, support, permissions, flag changes, incident response, data recovery, training, and rollback authority. |
| UCRM-073 | Internal release decision | Signed go/no-go records enabled cohorts/capabilities, known limitations, evidence commit, migration version, and rollback trigger. |
| UCRM-074 | Post-release verification | Smoke workflows, reconciliation, alerts, error/latency/freshness, audit delivery, and support intake are checked after controlled enablement. |

**Exit gate:** Only UCRM-073 may declare the internal MVP released. UCRM-074 must confirm the release remains healthy or activate rollback/hold criteria.

## 11. Milestone UCRM-8 — External Communications and Integrations

**Status:** Deferred until after internal MVP stability
**Depends on:** UCRM-7 plus provider-specific approval

| ID | Agent-sized vertical slice | Acceptance evidence |
| --- | --- | --- |
| UCRM-080 | Integration platform contract | Credential isolation, tenant mapping, adapter interface, idempotency, delivery/sync state, retries, reconciliation, rate limits, webhooks, audit, and kill switches are accepted. |
| UCRM-081 | Email/calendar provider A | One approved provider completes authorization, least privilege, sync/backfill, consent, dedupe, conflict, revoke, retry, reconciliation, security, browser, and rollback gates. |
| UCRM-082 | Email/calendar provider B | Second provider repeats the full gate; it does not inherit approval from UCRM-081. |
| UCRM-083 | SMS delivery | Approved vendor, consent/opt-out, templates, delivery states, quiet hours, inbound correlation, failure/retry, audit, cost/rate controls, and kill switch pass. |
| UCRM-084 | Telephony/transcription | Calling, recording consent, retention, restricted access, transcription provenance, provider failure, audit, and legal approval pass before activation. |
| UCRM-085 | E-signature | Document authority, signer identity, immutable envelope evidence, webhook reconciliation, expiry/cancel, permissions, and provider rollback pass. |
| UCRM-086 | Accounting/DMS connector | Field ownership, mapping, conflict rules, backfill, incremental sync, reconciliation, sensitive data, failure recovery, and disablement are proven for one named system. |

No adapter is complete at “API connected.” Each is a full vertical slice with external-side-effect proof.

## 12. Milestone UCRM-9 — Enterprise Expansion

**Status:** Deferred; prioritize by adoption and business value
**Depends on:** Stable internal release and approved capability case

| ID | Capability package | Required gate |
| --- | --- | --- |
| UCRM-100 | Fine-grained field/record/territory sharing | Formal access model, scale tests, policy proof, admin UX, audit, recovery, and migration evidence. |
| UCRM-101 | Governed custom fields and layouts | Namespace/type/version rules, validation, indexing, permissions, reporting impact, limits, rollback, and admin preview. |
| UCRM-102 | Workflow and approval designer | Versioning, simulation, authority, limits, loop protection, observability, rollback, and sandbox/publish gates. |
| UCRM-103 | Sandbox and configuration promotion | Isolation, masked data, diff/review, promotion, validation, audit, and rollback. |
| UCRM-104 | Advanced retention, legal hold, and export | Approved policy, field classification, immutable evidence, job simulation, recovery, and legal/security signoff. |
| UCRM-105 | Advanced forecasting and attribution | Explainability, source freshness, historical evaluation, override separation, bias/error review, and deterministic fallback. |
| UCRM-106 | Governed AI assistance | Permission-aware retrieval, citations/provenance, evaluation set, prompt-injection defense, human approval, cost/latency, logging, opt-out, and kill switch. |
| UCRM-107 | Broader lifecycle modules | Renewal, account health, service/case, marketing, or commercial expansion receives its own domain, security, test, pilot, and release milestones. |

## 13. Slice Definition of Done

A `UCRM-###` slice is `VERIFIED` only when all applicable statements are true:

- dependency and entry gate were satisfied;
- migration is additive/rehearsed or explicitly not applicable;
- repository has organization-safe reads/writes;
- service owns business rules and transactional behavior;
- policy enforces server-side authority and field visibility;
- validation rejects invalid and ambiguous input;
- route/read model exposes only the required contract and honest freshness;
- UI includes accessible loading, empty, error, stale, denied, success, and recovery states;
- important changes create correlated activity and immutable audit evidence;
- focused success, denial, validation, concurrency, idempotency, and failure tests pass;
- representative browser proof passes for affected roles and viewports;
- flag-off/rollback/recovery behavior is proven;
- docs and implementation status accurately reflect the result;
- diff contains no unrelated work and evidence identifies the commit.

If any applicable item is absent, the slice remains `IN_PROGRESS`, `IMPLEMENTED_UNVERIFIED`, or `HELD`.
