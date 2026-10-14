# Unified CRM Console Architecture

**Document ID:** `UCRM-ARCH-001`
**Version:** 1.0 planning baseline
**Date:** 2026-08-14
**Status:** Target architecture; documentation only; no implementation authorization or completion claim
**Product name:** Dispatch Board Unified CRM Console
**Primary route:** `/crm`
**Parent system:** Time Motor Sales Dispatch Board

---

## 1. Purpose

Unified CRM is an independent operating console inside Dispatch Board. It gives sellers, managers, customer-service staff, and authorized operators one simple place to understand a relationship, decide what needs attention, and complete the next permitted action.

It is independent in navigation, workflows, read models, and product experience. It is **not** a separate deployment, database, identity system, or competing source of customer, vehicle, appointment, task, or activity truth.

The product loop is:

```text
See priority -> understand context -> take an authorized action
             -> capture evidence -> establish the next step
```

The architecture exists to let many implementation agents work concurrently without inventing competing records, permissions, status meanings, or integration behavior.

## 2. Evidence boundary

This document separates repository evidence from target behavior.

### 2.1 Existing repository evidence as of 2026-08-14

The repository currently evidences:

- one Next.js modular monolith and PostgreSQL/Prisma data store;
- shared `User`, `Role`, `Organization`, `Location`, session, and location-access foundations;
- canonical `Customer`, `CustomerContactPoint`, `CustomerInteraction`, `CustomerNote`, `CustomerVehicle`, `CustomerDocumentRequirement`, and `CustomerLead` records;
- canonical `Vehicle`, `Appointment`, `Task`, and `ActivityEvent` records and durable customer links in several of those domains;
- enterprise command-ledger, aggregate-version, domain-event, audit-event, and outbox models;
- customer read and lead services, Customer 360 foundations, and some audited Sales commands;
- `/customers` and `/sales` product surfaces with materially different levels of backend completion.

Existing Customers and Sales documentation also records important gaps. In particular, some Sales surfaces remain prototype- or sample-driven, and broad opportunity, pipeline, quote, forecast, communications, and CRM-console workflows are not proven merely because UI components or planning documents exist.

### 2.2 Target behavior defined here

The following are targets until implemented and verified:

- the `/crm` route and its independent console shell;
- the Unified CRM bounded contexts and CRM-owned commercial aggregates;
- consolidated CRM Home, Work, Customers, Pipeline, Conversations, Quotes, and Insights read models;
- complete command, event, permission, audit, integration, and reliability contracts described below;
- tenant-grade isolation, field-level security, governed custom metadata, and AI assistance;
- production readiness or replacement of existing `/customers` or `/sales` experiences.

Documentation, schemas, mockups, seeded data, and isolated tests are not production proof. Each milestone must update the implementation-status evidence separately.

## 3. Architectural position

### UCRM-ARC-001 — Independent console in the modular monolith

Unified CRM remains a module in the existing application and database.

```text
Dispatch Board modular monolith
  Shared platform
    Authentication, users, roles, organizations, locations
    Command, policy, audit, event, outbox, search, feature flags
  Authoritative operational domains
    Customers, Inventory/Vehicles, Appointments, Tasks, Activity
  Unified CRM Console (/crm)
    CRM engagement shell and CRM-owned commercial workflows
    Permission-filtered cross-domain read models
    Explicit commands routed to authoritative owners
```

There is one authenticated product session and one canonical identity for each shared record. The console may cache or project data, but it may not create shadow customer, vehicle, appointment, task, or activity masters.

### UCRM-ARC-002 — Console independence without data duplication

`/crm` owns its navigation and work experience. Existing routes remain available until a reviewed migration proves functional coverage, authorization parity, data integrity, accessibility, performance, and recovery. Retirement or redirection of `/customers` or `/sales` requires a separate decision and rollout plan.

## 4. Architecture principles

| ID | Principle | Required consequence |
| --- | --- | --- |
| `UCRM-PRN-001` | One record, one authority | Every mutable fact has one owning domain and one governed command path. |
| `UCRM-PRN-002` | Server decides | Validation, authorization, consent, lifecycle, and approval rules execute server-side. |
| `UCRM-PRN-003` | Commands change; read models explain | UI cards never become independent state owners. |
| `UCRM-PRN-004` | Simple surface, explicit depth | Common actions stay obvious; advanced detail is progressively disclosed. |
| `UCRM-PRN-005` | Evidence accompanies change | Material commands create correlated domain, activity, audit, and outbox evidence as applicable. |
| `UCRM-PRN-006` | Deterministic core | Core workflows continue when optional AI or external providers are unavailable. |
| `UCRM-PRN-007` | Safe retries | Create, transition, communication, import, and integration commands are idempotent. |
| `UCRM-PRN-008` | Deny by default | Organization, location, record, field, action, and purpose are positively authorized. |
| `UCRM-PRN-009` | Additive evolution | Shared schemas and contracts evolve compatibly; broad rewrites require an ADR. |
| `UCRM-PRN-010` | Observable degradation | Stale, partial, delayed, denied, and unavailable states are visible and never fabricated as current. |

## 5. Bounded contexts and authority

### 5.1 Authority map

| Context | Authoritative facts | CRM use |
| --- | --- | --- |
| Identity & Access | users, roles, sessions, organizations, locations, grants | Authenticate and filter every command/read model. CRM does not maintain alternate users or roles. |
| Customers | customer identity, merge state, contact points, preferences/consent, notes, relationship facts | Display Customer 360 and invoke Customer-owned commands. |
| Inventory & Vehicles | canonical vehicle identity, availability, custody, readiness, inventory economics owned there | Project permitted vehicle context and request owning-domain actions. |
| Appointments | scheduling, participants, attendance, resource reservation, appointment outcomes | Show CRM schedule lens and invoke Appointment commands. |
| Tasks | executable work, assignment, due time, blockers, review, completion | Show CRM work queues and invoke Task commands. |
| Activity | operational feed entries | Contribute correlated safe activity evidence; do not treat it as the full audit ledger. |
| Unified CRM | opportunities, commercial participants, pipeline stages, next actions, deal scenarios, quotes, approvals, forecasts, CRM conversation envelopes, CRM saved views | Own commercial engagement and orchestration without overwriting source-domain truth. |
| Reporting | governed metric definitions and analytical projections | Read from authoritative facts/events; never write operational lifecycle state. |
| Integrations | source-qualified external identity, sync state, delivery/retry/reconciliation evidence | Translate provider contracts; never make provider payloads canonical by default. |

### 5.2 CRM subcontexts

- **CRM Engagement:** Home, Work, follow-ups, saved views, relationship context.
- **Opportunity Management:** intake, ownership, stage, evidence, next action, close/reopen.
- **Commercial Workspace:** scenarios, quotes, approvals, acceptance evidence, handoffs.
- **Conversations:** channel-neutral interaction envelopes, drafts, templates, delivery status, consent checks, and provider correlation.
- **Forecasting & Insights:** versioned human submissions, deterministic projections, exceptions, and drill-down.
- **CRM Configuration:** pipelines, stages, reason codes, layouts, custom metadata, playbooks, templates, and feature rollout.

Configuration is versioned product behavior, not arbitrary UI state. Publishing configuration requires validation, authorization, audit, and rollback.

## 6. Canonical entity catalog

### 6.1 Shared entities reused as authority

| Stable concept | Existing evidence | CRM rule |
| --- | --- | --- |
| `UCRM-ENT-CUSTOMER` | `Customer` and related contact/interaction/note records exist | Reuse ID and merge state; never copy into a CRM customer master. |
| `UCRM-ENT-VEHICLE` | `Vehicle` and vehicle relationships exist | Reuse canonical ID and permission-filtered readiness projection. |
| `UCRM-ENT-APPOINTMENT` | `Appointment` with participant/task/history foundations exists | Scheduling changes go through Appointment services. |
| `UCRM-ENT-TASK` | `Task` with customer/vehicle links and workflow rules exists | CRM creates or updates work only through Task services. |
| `UCRM-ENT-ACTIVITY` | `ActivityEvent` and domain-specific histories exist | CRM timeline composes safe evidence; it does not rewrite history. |
| `UCRM-ENT-ACTOR` | shared `User`, role, organization, and location foundations exist | All ownership and attribution use shared identities. |

### 6.2 CRM-owned target entities

Names are logical contracts; final Prisma names require a reviewed data-model milestone.

| ID | Target aggregate/entity | Core invariant |
| --- | --- | --- |
| `UCRM-ENT-OPPORTUNITY` | `CrmOpportunity` | Every active opportunity has organization, customer, owner, pipeline, stage, version, next action, due time, and source. |
| `UCRM-ENT-PARTICIPANT` | `CrmOpportunityParticipant` | Role, relationship, authority, and effective period are explicit. |
| `UCRM-ENT-INTEREST` | `CrmOpportunityInterest` | Interest is distinguishable from suitability, availability, reservation, and commitment. |
| `UCRM-ENT-SCENARIO` | `CrmDealScenario` | A presented scenario is immutable; revision creates a new version. |
| `UCRM-ENT-QUOTE` | `CrmQuote` | Quote identifies scenario, expiry, approvals, presenter, channel, and response state. |
| `UCRM-ENT-APPROVAL` | `CrmApprovalRequest` | Exact subject/version, policy, decision, reason, actor, and expiry are retained. |
| `UCRM-ENT-CONVERSATION` | `CrmConversation` and message/delivery records | Provider delivery, CRM draft, and human-authored interaction evidence remain distinguishable. |
| `UCRM-ENT-FORECAST` | `CrmForecastSubmission` | Seller judgment, manager judgment, deterministic projection, and optional prediction are separately labeled and versioned. |
| `UCRM-ENT-CONFIG` | pipeline, stage, reason, template, layout, and custom-field definitions | Published versions are immutable and effective-dated; values remain organization-scoped. |
| `UCRM-ENT-INTEGRATION` | external identity and sync cursor/state | External identifiers are qualified by provider, connection, object type, and organization. |

Existing `CustomerLead` may seed or bridge an opportunity workflow, but consolidation or replacement requires explicit migration semantics. No agent may silently reinterpret its stages as the target opportunity lifecycle.

## 7. Cross-context relationship rules

- All shared references use durable IDs; copied names, phone numbers, VINs, and labels are display snapshots only.
- A CRM aggregate stores the minimum foreign context required to enforce its own invariant and links to the authoritative source for the rest.
- Cross-domain commands call the owning service or publish an approved outbox request; they do not update another domain's tables directly.
- A source record deletion, merge, archive, or restriction must propagate a safe projection state without erasing historical CRM evidence.
- Customer merge is Customer-owned. CRM references are re-pointed or resolved through a governed migration while preserving original identifiers in audit evidence.
- Vehicle availability and readiness are observations with timestamps; a CRM quote or opportunity does not reserve or sell a vehicle by implication.
- Completing a CRM task does not automatically advance an opportunity unless an explicit, validated CRM command establishes the required evidence.

## 8. Command architecture

### 8.1 Command contract

Every material command carries:

- command name and schema version;
- organization and location context where applicable;
- authenticated actor or governed system identity;
- subject type, subject ID, and expected aggregate version;
- idempotency key and request hash for retryable commands;
- correlation and causation IDs;
- requested action, validated payload, and attributable reason where required;
- source surface and client timestamp as non-authoritative metadata.

The owning service performs, in order:

1. authentication and active-session checks;
2. organization/location, capability, record, field, purpose, and separation-of-duties checks;
3. schema and domain validation;
4. consent, state, evidence, approval, freshness, and optimistic-concurrency checks;
5. one atomic write of aggregate state and required ledger/audit/event/outbox evidence;
6. an explicit receipt or typed failure with recovery guidance.

### 8.2 Initial command catalog

| ID | Command | Owner |
| --- | --- | --- |
| `UCRM-CMD-001` | `CreateCrmOpportunity` | Unified CRM |
| `UCRM-CMD-002` | `AssignCrmOpportunity` | Unified CRM |
| `UCRM-CMD-003` | `SetCrmNextAction` | Unified CRM |
| `UCRM-CMD-004` | `TransitionCrmOpportunity` | Unified CRM |
| `UCRM-CMD-005` | `CloseCrmOpportunity` | Unified CRM |
| `UCRM-CMD-006` | `ReopenCrmOpportunity` | Unified CRM |
| `UCRM-CMD-007` | `CreateCrmDealScenario` | Unified CRM |
| `UCRM-CMD-008` | `IssueCrmQuote` | Unified CRM |
| `UCRM-CMD-009` | `RecordCrmQuoteResponse` | Unified CRM |
| `UCRM-CMD-010` | `RequestCrmApproval` | Unified CRM |
| `UCRM-CMD-011` | `DecideCrmApproval` | Unified CRM |
| `UCRM-CMD-012` | `DraftCrmCommunication` | Unified CRM |
| `UCRM-CMD-013` | `SendCrmCommunication` | Unified CRM plus provider adapter |
| `UCRM-CMD-014` | `SubmitCrmForecast` | Unified CRM |
| `UCRM-CMD-015` | `PublishCrmConfiguration` | Unified CRM configuration |
| `UCRM-CMD-016` | `CreateCustomerFromCrm` | Customers through an owning-domain adapter |
| `UCRM-CMD-017` | `ScheduleAppointmentFromCrm` | Appointments through an owning-domain adapter |
| `UCRM-CMD-018` | `CreateTaskFromCrm` | Tasks through an owning-domain adapter |

Generic `UpdateRecord` and unrestricted bulk mutation endpoints are prohibited. Bulk operations require preview, per-record authorization, idempotency, partial-failure receipts, and recovery.

## 9. Read-model architecture

Read models are purpose-built, permission-filtered projections. They include `generatedAt`, source freshness, partial-data warnings, and available actions. They never infer authorization from what a client already displays.

| ID | Read model | Purpose |
| --- | --- | --- |
| `UCRM-RM-001` | CRM Home | meetings, priorities, replies, risk changes, approvals, and recommended next actions for the active role |
| `UCRM-RM-002` | CRM Work | owned/team follow-ups, tasks, promises, blocked work, due/SLA state, and executable actions |
| `UCRM-RM-003` | Customer 360 | relationship summary, contacts, participants, timeline, opportunities, quotes, appointments, tasks, vehicles, service/dispatch history, and restrictions |
| `UCRM-RM-004` | Pipeline | board/table/forecast projections over one governed opportunity set |
| `UCRM-RM-005` | Opportunity Workspace | stage evidence, next action, participants, interests, conversations, commercial history, blockers, and source links |
| `UCRM-RM-006` | Conversations | threads, drafts, delivery state, consent/restriction state, and follow-up context |
| `UCRM-RM-007` | Quote Workspace | scenario versions, approvals, issue/expiry/response state, and immutable history |
| `UCRM-RM-008` | Manager Control Tower | recoverable exceptions, stale pipeline, SLA risk, approval load, forecast changes, and drill-down evidence |
| `UCRM-RM-009` | Global Search | permission-filtered customers, contacts, opportunities, vehicles, appointments, tasks, and quotes with safe snippets |
| `UCRM-RM-010` | CRM Administration | versioned configuration, validation, rollout, usage, and rollback readiness |

Queries must be bounded, indexed, paginated, and resistant to inference through counts, timing, snippets, or error differences. Analytical workloads should move to dedicated projections before they threaten transactional performance.

## 10. Event and evidence architecture

### 10.1 Evidence types remain distinct

- **Domain event:** a business fact emitted by the owning aggregate.
- **Activity event:** safe human-readable operational chronology.
- **Audit event:** immutable accountability evidence for security and material change.
- **Outbox message:** durable delivery intent to another context or provider.
- **Decision record:** inputs, version, reasons, confidence, outcome, and override for automated recommendations.

One event type does not substitute for the others.

### 10.2 CRM event namespace

Target event names use versioned schemas and the `crm.` namespace:

- `crm.opportunity.created.v1`
- `crm.opportunity.assigned.v1`
- `crm.opportunity.stage_changed.v1`
- `crm.opportunity.next_action_set.v1`
- `crm.opportunity.closed.v1`
- `crm.opportunity.reopened.v1`
- `crm.scenario.created.v1`
- `crm.quote.issued.v1`
- `crm.quote.responded.v1`
- `crm.approval.requested.v1`
- `crm.approval.decided.v1`
- `crm.communication.delivery_requested.v1`
- `crm.communication.delivery_updated.v1`
- `crm.forecast.submitted.v1`
- `crm.configuration.published.v1`
- `crm.decision.evaluated.v1`
- `crm.decision.overridden.v1`

Events include organization, location where applicable, actor/system identity, aggregate/version, correlation/causation, occurred time, safe metadata, and policy/algorithm version when applicable. Sensitive payloads do not belong in general activity or outbox metadata.

## 11. Transaction, consistency, and concurrency

- A CRM aggregate mutation and its command receipt, audit, domain event, and required outbox entry commit atomically.
- Cross-context effects are eventually consistent through owning services and outbox delivery unless an existing in-process service transaction safely preserves both domains' invariants.
- Read models expose freshness and pending-effect state; the UI does not claim provider or downstream completion from local acceptance.
- Optimistic concurrency protects aggregate versions. Conflicts return current version and a safe refresh/reapply path.
- Consumers are idempotent by event/message ID and maintain replay checkpoints.
- Projection rebuilds are resumable and do not mutate authoritative facts.
- Time-based workflows use organization timezone and effective-dated business calendars.

## 12. Integration architecture

### UCRM-ARC-INT-001 — Adapter boundary

Email, calendar, phone, SMS, web lead, DMS, accounting, e-signature, and enrichment providers connect through narrow adapters. Provider SDK types and credentials do not leak into domain services.

Required adapter behavior:

- source-qualified external identities and authority maps;
- inbound signature/authentication validation, replay protection, schema validation, and quarantine;
- idempotent inbound upsert or command translation;
- outbox-backed outbound delivery with retry class, backoff, dead-letter state, and reconciliation;
- cursor/checkpoint history, freshness, last success, last error, and operator-safe recovery;
- rate-limit and circuit-breaker handling;
- sandbox/test connections and contract tests;
- explicit conflict behavior; no silent last-write-wins;
- data minimization and provider-specific retention/deletion behavior.

Native Customers, Inventory, Appointments, Tasks, and Activity bridges precede required external integrations.

## 13. Search and reporting

Global search is a projection, not an alternate database of truth. Index documents contain the minimum safe fields and an authority stamp. Authorization is re-evaluated when results are returned and again when a record opens.

Operational dashboards use governed definitions with drill-down to included records. Every metric declares owner, grain, timezone, filters, refresh/freshness, exclusions, and version. Forecast submissions and projections remain distinguishable. Exports apply the same row/field policies as interactive reads and generate audit evidence.

## 14. Reliability and operations

Target service objectives must be quantified during the release milestone. The architecture requires:

- health signals for database, projection lag, command failures, outbox backlog, dead letters, integration freshness, and scheduled work;
- bounded timeouts, retry budgets, circuit breakers, and bulkheads around external providers;
- idempotent jobs with lease/fencing protection;
- degraded read-only operation where safe, with visible stale/unavailable labels;
- no loss of accepted commands after a success receipt;
- feature flags by organization, location, role/cohort, and capability;
- kill switches for communications, integrations, automation, AI, and controlled writes without deleting evidence;
- tested backup, point-in-time recovery where supported, restore verification, and documented recovery objectives;
- accessible error, empty, denied, conflict, stale, offline, and retry states;
- performance budgets for initial shell, search, list, record open, command acknowledgement, and background projections.

## 15. Extensibility and configuration

Enterprise flexibility must not undermine authority or usability.

- Custom fields are typed, namespaced, organization-scoped, versioned, classifiable, searchable only when approved, and subject to field policies and retention.
- Custom objects are deferred until governance, relationship cardinality, indexing, API, export, deletion, and permission semantics are proven.
- Pipelines, stages, required evidence, reason codes, views, templates, and layouts use draft/validate/publish/rollback lifecycles.
- Extensions subscribe to versioned events or call versioned commands; direct table writes are prohibited.
- Webhooks are signed, scoped, rate-limited, replay-safe, observable, and revocable.
- Plugin or automation actions declare required capability, data access, side effects, idempotency, timeout, and recovery behavior.
- Configuration limits prevent unbounded fields, filters, formulas, automations, and recursive triggers.

## 16. AI and automation guardrails

AI is an optional assistant over permission-filtered data. Core CRM operations remain deterministic.

Allowed initial uses include summarization, meeting preparation, extraction into a review form, draft generation, semantic retrieval, and explainable next-action candidates.

The system must not let AI autonomously:

- send customer communications;
- merge customers or resolve duplicate identity;
- change prices, terms, approvals, stage, ownership, consent, or retention;
- reserve or sell inventory;
- make credit, eligibility, protected-class, legal, or employment decisions;
- create authoritative facts from unsupported inference.

Every AI output identifies sources, freshness, model/prompt/policy version as appropriate, uncertainty, and whether it is suggestion or fact. Retrieval and tool execution apply the user's server-side permissions. Prompt injection and untrusted document content cannot grant tools or expand data access. Consequential actions require a preview, explicit authorized confirmation, deterministic revalidation, and normal command/audit processing.

## 17. Target repository boundaries

Final paths may evolve through an ADR, but agents should default to:

```text
src/
  app/
    (app)/crm/
    api/crm/
  features/
    unified-crm/
      home/
      work/
      customers/
      pipeline/
      conversations/
      quotes/
      insights/
      administration/
  server/
    unified-crm/
      domain/
      repositories/
      services/
      policies/
      validation/
      projections/
      integrations/
  tests/
    unit/unified-crm/
    integration/unified-crm/
    e2e/unified-crm/
```

Route handlers translate HTTP concerns and invoke services. Repositories own persistence, services own workflows, policies own authorization, validation owns input contracts, and projections own read-model composition. UI components contain no authoritative lifecycle or permission decisions.

## 18. Architecture decisions

| ID | Decision |
| --- | --- |
| `UCRM-ADR-001` | Unified CRM is an independent console inside the existing modular monolith, not a new deployment. |
| `UCRM-ADR-002` | `/crm` is the primary route; existing consoles remain until separately approved migration gates pass. |
| `UCRM-ADR-003` | Customers owns customer identity/contact/consent; Inventory owns vehicle truth; Appointments owns schedule; Tasks owns work; Activity remains evidence. |
| `UCRM-ADR-004` | Unified CRM owns opportunity, commercial, quote, CRM conversation-envelope, forecast, and CRM configuration facts. |
| `UCRM-ADR-005` | Commands and purpose-built read models are the module contract; UI cards never own state. |
| `UCRM-ADR-006` | Cross-domain effects use owning services and durable outbox patterns; direct cross-domain table mutation is prohibited. |
| `UCRM-ADR-007` | Existing customer/lead structures evolve additively; consolidation requires an explicit migration and compatibility plan. |
| `UCRM-ADR-008` | Presented scenarios and issued quotes are immutable versions. |
| `UCRM-ADR-009` | Native domain bridges precede required third-party integrations. |
| `UCRM-ADR-010` | AI is optional, permission-aware, source-grounded, and cannot execute consequential commands without authorized confirmation. |
| `UCRM-ADR-011` | Organization is the present isolation boundary; a future multi-organization tenant model requires a dedicated ADR and migration. |
| `UCRM-ADR-012` | Activity, domain events, audit, outbox, and decision records remain distinct evidence types. |
| `UCRM-ADR-013` | Configuration and custom metadata are versioned governed artifacts, not arbitrary runtime mutation. |
| `UCRM-ADR-014` | Transactional and analytical workloads separate when measured performance requires it, without changing system-of-record authority. |
| `UCRM-ADR-015` | Production-facing sample data and unmarked simulated results are prohibited. |
| `UCRM-ADR-016` | Agent work is contract-first, vertically sliced, file-owned, independently reviewed, and evidence-gated. |
| `UCRM-ADR-017` | Every active opportunity requires an owner, stage, next action, and due time. |
| `UCRM-ADR-018` | Opportunity stages are evidence-based, command-driven, and history-backed. |
| `UCRM-ADR-019` | Authorization intersects capability, organization, location, ownership/team, record, field, state, purpose, and separation-of-duties rules. |
| `UCRM-ADR-020` | External integrations degrade visibly and never silently overwrite authoritative records. |

## 19. Architecture acceptance gates

A CRM implementation slice cannot be called complete unless it satisfies all applicable gates:

| Gate | Evidence required |
| --- | --- |
| `UCRM-AG-001` Authority | Each field and mutation identifies one authoritative owner; no shadow masters. |
| `UCRM-AG-002` Contract | Versioned command, validation, error, read-model, and event contracts exist. |
| `UCRM-AG-003` Security | Server-side organization/location/record/field/action tests satisfy `SECURITY_AND_PRIVACY.md`. |
| `UCRM-AG-004` Consistency | Transaction, version-conflict, idempotency, retry, and replay behavior is proven. |
| `UCRM-AG-005` Evidence | Material changes create correlated command, audit, domain/activity, and outbox evidence as applicable. |
| `UCRM-AG-006` UX states | Loading, empty, denied, stale, partial, error, conflict, success, and recovery states are implemented and accessible. |
| `UCRM-AG-007` Reliability | Failure injection and recovery prove provider outage, projection lag, dead letter, and safe retry behavior where applicable. |
| `UCRM-AG-008` Performance | Agreed budgets are measured with representative organization data volumes. |
| `UCRM-AG-009` Compatibility | Existing Customers, Sales, Tasks, Appointments, Inventory, and Activity workflows pass regression checks. |
| `UCRM-AG-010` Status truth | Current implementation status is updated with repository evidence and no target behavior is presented as shipped. |

## 20. Agent execution contract

Before implementing a slice, every agent must state:

1. stable requirement and milestone IDs;
2. authoritative domain and affected aggregates;
3. command, policy, read-model, event, and audit contracts;
4. data classification and field visibility;
5. idempotency, concurrency, failure, and recovery behavior;
6. tests and measurable acceptance evidence;
7. files in scope and dependencies on other agents.

An agent must stop and propose an ADR when work would create a second source of truth, weaken a security boundary, change shared lifecycle semantics, bypass an owning service, introduce a mandatory provider, or contradict an existing accepted decision.
