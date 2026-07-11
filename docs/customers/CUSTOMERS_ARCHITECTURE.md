# Customers Console Architecture

**Document:** Customers Console Architecture
**Version:** 1.0 planning baseline
**Date:** 2026-07-10
**Status:** Approved target architecture; implementation remains milestone-gated
**Primary routes:** `/customers`, `/customers/[customerId]`
**Parent product:** Time Motor Sales Dispatch Board

---

## 1. Purpose

The Customers Console is the customer intelligence and customer operations module inside the Dispatch Board. It is not a separate application, a generic contact database, or a copy of an existing enterprise CRM.

The module combines proven capability patterns into an original dealership workflow:

| Capability pattern | Customers Console interpretation |
| --- | --- |
| Customer 360 | One trusted customer identity with relationship, activity, vehicle, deal, case, appointment, task, and document context. |
| Case and SLA workflow | Explicit ownership, response targets, escalation, resolution reasons, and audit evidence. |
| Unified dealership records | Stable customer, vehicle, deal, and appointment identities connected through app-owned relationships. |
| Lead intelligence | Source, stage, owner, engagement, next action, follow-up due time, and conversion signals. |
| Sales oversight | Structured stages, aging, manager review queues, intervention, and explainable progress signals. |
| Dealership ecosystem | Native links to Tasks, Appointments, Inventory, Documents, Service, Collections, Activity, and reporting. |
| Prioritization and coaching | Explainable queues and recommendations that support staff and managers without replacing judgment. |
| Independent-dealer practicality | Fast entry, title and document follow-up, trade-ins, financing context, and optional BHPH signals. |
| Engagement timeline | Calls, messages, notes, visits, promises, appointments, outcomes, and system events in one chronology. |

The product question is:

> What does this customer need next, who owns it, when is it due, and what operational work must happen?

---

## 2. Current Evidence Baseline

Implemented today:

- `/customers` renders the approved Customer Command Center front-page dashboard.
- The front page supports persistent light and dark appearances.
- The approved Customer 360 profile shell exists as a presentation component for a later detail route.
- The Prisma schema contains a minimum `Customer` record with organization scope, customer number, basic contact fields, status, external identity, duplicate key, merge target, and retention date.
- Appointments can reference a durable customer through `AppointmentParticipant` and retain a customer snapshot.
- Tasks still primarily carry optional customer reference text rather than a durable customer relationship.
- Automated browser coverage protects the Customers landing route and appearance preference.

Not implemented yet:

- The dashboard cards, pipeline, tasks, appointments, leads, and activity are not backed by Customers read services.
- There is no Customer list/search API, create/edit workflow, or `/customers/[customerId]` route.
- There are no durable customer contact points, notes, interactions, tags, lead records, customer cases, document requirements, customer-vehicle relationships, risk flags, or customer saved views.
- There is no Customers-specific permission matrix, audit history, duplicate resolution workflow, or rollout runbook.

Documentation must preserve this distinction. Planned behavior is not implementation evidence.

---

## 3. Architectural Position

### 3.1 Modular monolith

Customers remains inside the existing Next.js application and PostgreSQL database.

```text
Dispatch Board application
  App shell and authentication
  Customers module
  Tasks module
  Appointments module
  Activity module
  Future Inventory, Sales, Service, Documents, and Collections modules
```

Do not create a separate CRM deployment, database, authentication system, or frontend for MVP.

### 3.2 Shared platform, owned domain

Customers shares:

- organization, location, user, role, and session foundations
- app shell and navigation
- activity and audit conventions
- task and appointment bridges
- PostgreSQL, Prisma, validation, testing, and deployment practices

Customers owns:

- customer identity and merge state
- contact points and communication preferences
- customer notes, tags, and interactions
- lead lifecycle and next-action rules
- customer cases and SLA state
- customer document requirements
- customer-to-vehicle relationship meaning
- customer risk signals and customer-specific saved views

Other modules may project customer context, but they must not silently become alternate sources of customer truth.

---

## 4. Target Repository Boundaries

```text
src/
  app/
    (app)/customers/
      page.tsx
      [customerId]/page.tsx
      leads/page.tsx
      cases/page.tsx
      documents/page.tsx
    api/customers/
    api/customer-leads/
    api/customer-cases/
  features/
    customers/
    customer-leads/
    customer-cases/
    customer-documents/
    customer-activity/
    customer-reports/
  server/
    repositories/customer-*.ts
    services/customer-*.ts
    policies/customer-*.ts
    validation/customer-*.ts
  tests/
    unit/customer-*.test.ts
    integration/customer-*.test.ts
    e2e/customer-*.spec.ts
```

Boundary rules:

- Routes compose permission-filtered read models and focused client interactions.
- Repositories own database access and expose no policy decisions.
- Services own customer workflows and transactional effects.
- Policies enforce organization, location, role, ownership, and field visibility.
- Validation normalizes and rejects invalid input before repository mutation.
- UI state is never the source of truth for ownership, SLA, lifecycle, consent, or merge decisions.

---

## 5. Domain Model

### 5.1 Existing model to extend safely

`Customer` remains the stable aggregate identity. Add fields and relationships through additive migrations rather than replacing the existing appointment-compatible model.

Required near-term extensions:

- `ownerUserId`
- `customerType`
- `preferredContactMethod`
- `preferredContactTime`
- `languageCode`
- `address` or structured address fields
- `sourceCode`
- `lastInteractionAt`
- `nextActionAt`
- `archivedAt`

Do not overload the root record with every communication, vehicle, lead, case, or document fact.

### 5.2 MVP entities

| Entity | Responsibility | Important invariants |
| --- | --- | --- |
| `CustomerContactPoint` | Phone, email, address, and channel preference. | One primary contact per type; normalized values; consent and opt-out state retained. |
| `CustomerTag` and link | Operational segmentation. | Organization-scoped catalog; archive instead of destructive reuse. |
| `CustomerNote` | Human-authored internal context. | Author, visibility, timestamp, and edit history preserved. |
| `CustomerInteraction` | Call, email, text, visit, promise, and outcome. | Actor, channel, direction, occurred time, outcome, and next step are explicit. |
| `CustomerActivityEvent` | Append-only customer chronology. | Event-backed; correlation to source workflow; safe display payload. |
| `Lead` | Customer purchase/service intent and follow-up lifecycle. | Active lead requires owner, stage, and next action. |
| `CustomerCase` | Complaint, title issue, document issue, service concern, or other customer problem. | Open case requires owner, priority, SLA state, and next safe action. |
| `DocumentRequirement` | Required customer/deal document and follow-up. | Type, status, owner, due time, and source are explicit. |
| `CustomerVehicle` | Relationship between customer and vehicle. | Relationship type and effective dates are explicit; no ambiguous ownership inference. |
| `CustomerRiskFlag` | Explainable operational risk signal. | Reason, severity, source, opened time, and resolution are retained. |
| `CustomerSavedView` | Durable private or shared customer queue. | Server-backed, permission-scoped, versioned filter definition. |

### 5.3 Enterprise-ready entities prepared, not required on day one

- `Opportunity` or expanded deal projection
- `SlaRule`
- `CustomerEscalation`
- `CustomerAuditEntry`
- `IntegrationIdentity`
- `FeatureEntitlement`
- `CustomerCustomFieldDefinition`
- `CustomerCustomFieldValue`

These boundaries may be designed early but must not delay the MVP vertical slices.

---

## 6. Aggregate And Relationship Rules

### Customer identity

- Every customer belongs to one organization.
- Customer numbers are unique inside an organization.
- Merge is explicit, audited, and irreversible without an authorized recovery workflow.
- A merged customer is not returned as an active search result, but historical references remain valid.
- Duplicate matching produces candidates and reasons; it does not silently merge records.

### Contact and consent

- Search normalization is separate from display formatting.
- Preferred contact is a customer preference, not proof of consent.
- Opt-out or restricted-contact state must be checked by the server before communication commands.
- Sensitive contact fields are projected according to policy; list views receive only what they need.

### Lead lifecycle

- Every active lead has an owner, stage, and dated next action.
- Stage transitions are command-oriented and event-backed.
- Lost or closed leads require a reason.
- A lead can create a task or appointment without duplicating the customer identity.

### Case lifecycle

- Every open case has an owner, priority, status, response target, and resolution target.
- SLA calculation uses organization timezone and configured business hours.
- Escalation is explicit and explainable.
- Resolution requires outcome notes and a resolution code.

### Customer-to-work bridges

- Durable links are preferred over copied display text.
- Tasks may retain a customer snapshot/reference for historical readability, but a customer link becomes authoritative when available.
- Appointments continue to use customer participants and snapshots for schedule history.
- Bridge services own cross-module writes and activity correlation.

---

## 7. Service Architecture

### MVP services

| Service | Responsibility |
| --- | --- |
| `CustomerService` | Create, update, archive, restore where allowed, and read customer records. |
| `CustomerSearchService` | Permission-filtered search across name, normalized phone, email, VIN, stock number, and customer number. |
| `CustomerProfileReadService` | Assemble Customer 360 from customer-owned and cross-module projections. |
| `CustomerDuplicateService` | Generate duplicate candidates, explanations, and controlled merge commands. |
| `CustomerInteractionService` | Record communication, outcome, promise, and next step. |
| `CustomerActivityService` | Append timeline events and project selected events to shared Activity. |
| `CustomerLeadService` | Create, assign, transition, close, and reopen leads. |
| `CustomerCaseService` | Create, route, transition, escalate, and resolve cases. |
| `CustomerDocumentService` | Create and update document requirements and due follow-up. |
| `CustomerVehicleService` | Attach and update customer-vehicle relationship roles. |
| `CustomerTaskBridgeService` | Create or link a Dispatch task with correlation and customer context. |
| `CustomerAppointmentBridgeService` | Create or link an appointment participant without duplicating customer truth. |
| `CustomerRiskService` | Build explainable risk flags and manager queue projections. |
| `CustomerSavedViewService` | Persist, share, authorize, and apply customer queue definitions. |

### Service transaction rule

A command that changes customer workflow state must atomically write:

1. domain change
2. customer activity event
3. audit metadata
4. task/appointment bridge record where applicable
5. outbox event only when a future adapter requires it

Partial cross-module outcomes are not acceptable.

---

## 8. Command And Query Boundaries

Use explicit commands instead of unrestricted record patching.

Core commands:

- Create customer
- Update customer identity/contact preference
- Archive customer
- Propose duplicate
- Merge customer
- Assign customer owner
- Record interaction
- Set next action
- Create/transition/close lead
- Create/transition/escalate/resolve case
- Add/complete document requirement
- Link/unlink customer vehicle
- Create linked task
- Create linked appointment
- Open/resolve risk flag
- Create/update/share saved view

Purpose-built read models:

- Customers home dashboard
- Customer search/list
- Customer 360 header and overview
- Customer timeline
- Lead pipeline and follow-up queue
- Case queue and SLA board
- Document requirement queue
- Manager risk queue
- Saved customer views
- Customer reporting summary

Read models must be permission-filtered before they reach client components.

---

## 9. API Direction

Exact route shape may evolve, but the capability boundary should remain explicit.

```text
GET    /api/customers
POST   /api/customers
GET    /api/customers/:id
POST   /api/customers/:id/update
POST   /api/customers/:id/archive
POST   /api/customers/:id/assign-owner
GET    /api/customers/:id/timeline
POST   /api/customers/:id/interactions
GET    /api/customers/search
GET    /api/customers/:id/duplicate-candidates
POST   /api/customers/:id/merge

POST   /api/customer-leads
POST   /api/customer-leads/:id/transition
POST   /api/customer-leads/:id/set-next-action

POST   /api/customer-cases
POST   /api/customer-cases/:id/transition
POST   /api/customer-cases/:id/escalate
POST   /api/customer-cases/:id/resolve

POST   /api/customers/:id/tasks
POST   /api/customers/:id/appointments
```

API rules:

- Validate every command server-side.
- Require optimistic concurrency for meaningful updates.
- Require idempotency identity for create, merge, bridge, and integration-safe commands.
- Return safe conflict details without leaking restricted fields.
- Reject cross-organization identifiers before repository mutation.
- Emit no partial side effects on denied or invalid commands.

---

## 10. Permission And Privacy Architecture

Initial policy capabilities:

- `customer.view.basic`
- `customer.view.contact`
- `customer.view.financial-signals`
- `customer.create`
- `customer.update`
- `customer.assign-owner`
- `customer.record-interaction`
- `customer.manage-lead`
- `customer.manage-case`
- `customer.resolve-case`
- `customer.merge`
- `customer.export`
- `customer.manage-shared-views`

Policy inputs include organization, location access, role, record owner, assigned work, field classification, and command type.

Field classes:

| Class | Examples | Default treatment |
| --- | --- | --- |
| Operational | Display name, customer number, status, owner | Visible to authenticated operational users in scope. |
| Limited | Phone, email, address, communication preference | Visible only when the workflow and policy require it. |
| Restricted | Financial or collections details, sensitive documents | Explicit role/capability required. |
| Audit | Merge history, consent changes, exports, policy overrides | Manager/admin access; append-only. |

Do not store payment credentials, full credit reports, government identifiers, or unrelated sensitive data in Customers MVP.

---

## 11. Event And Audit Architecture

Customer activity and audit are separate responsibilities.

### Customer activity

User-facing chronology such as:

- Customer created or updated
- Call, message, visit, or note recorded
- Lead assigned or stage changed
- Follow-up due or completed
- Appointment scheduled or outcome recorded
- Case opened, escalated, or resolved
- Document requested or received
- Vehicle interest or relationship updated
- Task created or completed

### Audit

Compliance and recovery evidence such as:

- Sensitive field changes
- Owner reassignment
- Consent or opt-out change
- Merge decision
- Case SLA override
- Export action
- Permission override
- Shared saved-view administration

Every event should carry organization, actor/system identity, customer ID, source type, source ID, correlation ID, occurred time, and a safe metadata payload.

---

## 12. Frontend Architecture

### Customers home `/customers`

The approved dashboard mockup is the source of truth for composition:

- search and quick create toolbar
- welcome and dashboard controls
- KPI summary
- sales pipeline, performance, and lead-source panels
- recent leads and top deals
- tasks, appointments, and activity right rail
- quick actions
- persistent light/dark appearance

Dashboard values must move from sample constants to one permission-filtered home read model. The dashboard is not an analytics source of truth by itself.

### Customer 360 `/customers/[customerId]`

- customer identity, owner, status, contact preference, and risk header
- Overview, Timeline, Leads/Deals, Cases, Appointments, Documents, Vehicles, Communications, Collections, and Notes tabs
- quick actions and next-best-action rail
- related task, case, document, vehicle, and appointment context
- field-level loading, empty, error, restricted, and stale states

### UX rules

- Preserve compact desktop scanning without hiding required workflow state.
- Keep light and dark modes structurally identical.
- Every recommendation explains its source and remains manager-overridable.
- Every disabled command explains role, state, missing information, or MVP deferral.
- Mobile prioritizes search, next action, communication logging, and assigned follow-up.
- Do not reproduce another product's navigation, terminology, branding, or visual identity.

---

## 13. Integration Strategy

### Native module bridges first

1. Customers to Tasks
2. Customers to Appointments
3. Customers to Activity
4. Customers to Vehicles
5. Customers to Documents
6. Customers to Sales/Deals
7. Customers to Service and Collections signals

### External adapters later

Future CRM, DMS, messaging, website-lead, and calendar integrations use adapters around stable app-owned contracts.

Rules:

- External systems are sources, not automatic truth owners.
- Store external identity and source attribution separately from customer number.
- Imports are idempotent and produce reconciliation evidence.
- Integration failures are visible, retryable, and do not corrupt local workflow.
- No external integration is required for Customers MVP rollout.

---

## 14. Commercial Tier Preparation

| Tier | Architectural entitlement direction |
| --- | --- |
| Basic | Customer records, search, notes, manual leads/cases, basic timeline. |
| Standard | Customer 360, pipeline, appointments, task bridges, documents, shared saved views, basic reporting. |
| Professional | SLA/escalation, manager risk queues, duplicate resolution, advanced permissions, vehicle graph, collections signals. |
| Enterprise | Multi-location controls, external adapters, custom workflows/fields, API/webhooks, advanced analytics, white-label and tenant administration. |

Feature entitlement must be server-enforced. Tier preparation must not create four separate codebases or delay the day-one internal rollout.

---

## 15. Architecture Decisions

### ADR-CRM-001: Customers is a module, not a separate product deployment

Use the shared Dispatch Board app, auth, database, navigation, and operational modules. Preserve modular boundaries so the capability can be packaged commercially later.

### ADR-CRM-002: Customer is the stable identity aggregate

Leads, cases, interactions, documents, appointments, tasks, and vehicles reference a stable customer ID. Display snapshots support historical readability but do not replace identity.

### ADR-CRM-003: Use command workflows and purpose-built read models

Meaningful lifecycle changes use explicit services with validation, policy, transaction, events, and tests. Frontend cards do not directly patch domain rows.

### ADR-CRM-004: Duplicate detection advises; merge requires authority

Normalization and candidate scoring may recommend duplicates. Only an authorized, audited merge command changes identity relationships.

### ADR-CRM-005: Activity is event-backed

Customer chronology is written by domain services. It is not reconstructed from current rows or maintained only in component state.

### ADR-CRM-006: Recommendations remain explainable and overridable

Lead priority, next-best action, case routing, and risk scoring expose reasons, contributing signals, freshness, and safe manager override.

### ADR-CRM-007: Native bridges precede external integrations

Tasks, Appointments, Activity, Vehicles, and Documents are connected before CRM/DMS or messaging integrations become rollout requirements.

### ADR-CRM-008: Light and dark are one interface

Both appearances use one component hierarchy, behavior model, accessibility contract, and test suite. Theme-specific product forks are prohibited.

### ADR-CRM-009: Use additive migrations and compatibility slices

Extend the appointment-compatible Customer foundation safely. Do not destabilize live Tasks or Appointments through a broad schema rewrite.

### ADR-CRM-010: AI-ready does not mean AI-dependent

Store structured events, outcomes, ownership, timing, source attribution, and reason codes. MVP workflows remain deterministic and usable without an AI service.

---

## 16. Architecture Gate

The architecture is accepted for implementation when every slice:

- remains inside the modular monolith
- identifies the authoritative domain owner
- includes server validation and policy enforcement
- uses additive migrations
- records meaningful activity/audit evidence
- protects organization and field boundaries
- includes loading, empty, error, denied, and stale behavior where applicable
- includes focused unit, integration, and browser proof
- updates the current implementation status without overstating completion

Any conflicting implementation must update this document through a reviewed architecture decision before code proceeds.
