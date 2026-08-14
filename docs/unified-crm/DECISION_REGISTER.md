# Unified CRM Decision Register

**Document ID:** `UCRM-GOV-001`
**Version:** 1.0 planning baseline
**Status:** Proposed decisions require foundation-gate approval unless marked Accepted
**Date:** 2026-08-14

## 1. Decision states

- `PROPOSED` — recommended but not yet binding.
- `ACCEPTED` — binding until superseded through this register.
- `DEFERRED` — intentionally postponed; current scope must not depend on it.
- `REJECTED` — considered and explicitly not selected.
- `SUPERSEDED` — replaced by a linked later decision.

## 2. Binding and proposed decisions

| ID | State | Decision | Consequence |
| --- | --- | --- | --- |
| `UCRM-ADR-001` | PROPOSED | Unified CRM is an independent console inside the existing modular monolith, not a new deployment. | Reuse shared deployment, authentication, database, and platform services. |
| `UCRM-ADR-002` | PROPOSED | `/crm` is the primary route; existing consoles remain until separately approved migration gates pass. | Navigation cutover is feature-flagged, evidence-based, and reversible. |
| `UCRM-ADR-003` | PROPOSED | Customers owns customer identity/contact/consent; Inventory owns vehicle truth; Appointments owns schedule; Tasks owns work; Activity remains evidence. | CRM uses owning-domain commands and source-labeled projections rather than shadow records. |
| `UCRM-ADR-004` | PROPOSED | Unified CRM owns opportunity, commercial, quote, CRM conversation-envelope, forecast, and CRM configuration facts. | CRM receives a clear commercial boundary without taking operational authority. |
| `UCRM-ADR-005` | PROPOSED | Commands and purpose-built read models are the module contract; UI cards never own state. | Visible state and actions must trace to server contracts. |
| `UCRM-ADR-006` | PROPOSED | Cross-domain effects use owning services and durable outbox patterns; direct cross-domain table mutation is prohibited. | Handoffs are idempotent, observable, and reconcilable. |
| `UCRM-ADR-007` | PROPOSED | Existing customer/lead structures evolve additively; consolidation requires an explicit migration and compatibility plan. | Agents cannot silently reinterpret or replace existing lifecycle data. |
| `UCRM-ADR-008` | PROPOSED | Presented scenarios and issued quotes are immutable versions. | Corrections create new versions and retain commercial history. |
| `UCRM-ADR-009` | PROPOSED | Native domain bridges precede required third-party integrations. | The internal MVP remains useful without external providers. |
| `UCRM-ADR-010` | PROPOSED | AI is optional, permission-aware, source-grounded, and cannot execute consequential commands without authorized confirmation. | Core CRM stays deterministic and available without AI. |
| `UCRM-ADR-011` | PROPOSED | Organization is the present isolation boundary; a future multi-organization tenant model requires a dedicated ADR and migration. | All current records, jobs, projections, exports, caches, and integrations remain organization-scoped. |
| `UCRM-ADR-012` | PROPOSED | Activity, domain events, audit, outbox, and decision records remain distinct evidence types. | One evidence stream cannot impersonate another. |
| `UCRM-ADR-013` | PROPOSED | Configuration and custom metadata are versioned governed artifacts, not arbitrary runtime mutation. | Draft, validation, publish, rollback, permission, and limits are required. |
| `UCRM-ADR-014` | PROPOSED | Transactional and analytical workloads separate when measured performance requires it, without changing system-of-record authority. | Reporting scale cannot weaken transaction correctness. |
| `UCRM-ADR-015` | PROPOSED | Production-facing sample data and unmarked simulated results are prohibited. | Demo data belongs only in labeled sandboxes and fixtures. |
| `UCRM-ADR-016` | PROPOSED | Agent work is contract-first, vertically sliced, file-owned, independently reviewed, and evidence-gated. | Parallel work cannot bypass dependencies or silently change shared contracts. |
| `UCRM-ADR-017` | PROPOSED | Every active opportunity requires an owner, stage, next action, and due time. | Commands reject violations and queues expose inherited data gaps. |
| `UCRM-ADR-018` | PROPOSED | Opportunity stages are evidence-based, command-driven, and history-backed. | Drag/drop invokes the same validated command as every other interface. |
| `UCRM-ADR-019` | PROPOSED | Authorization intersects capability, organization, location, ownership/team, record, field, state, purpose, and separation-of-duties rules. | A role name or hidden UI control never grants authority. |
| `UCRM-ADR-020` | PROPOSED | External integrations degrade visibly and never silently overwrite authoritative records. | Connector health, provenance, conflict, retry, replay, reconciliation, and kill switches are first-class. |

## 3. Decisions required before `UCRM-010`

| ID | Required decision | Default recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| `UCRM-DEC-001` | Confirm product name, route, and navigation label | Dispatch Board Unified CRM Console; `/crm`; CRM | Product owner | OPEN |
| `UCRM-DEC-002` | Confirm initial pilot roles and named pilot users | Salesperson, lead coordinator, sales manager, service/customer care, administrator | Product owner / operations | OPEN |
| `UCRM-DEC-003` | Confirm initial opportunity stages and evidence requirements | Use a short evidence-based lead-to-won/lost lifecycle; approve exact names in milestone `UCRM-020` | Sales leadership | OPEN |
| `UCRM-DEC-004` | Confirm quote/pricing/discount authority | CRM drafts; authorized source/manager approves consequential commercial values | Owner / sales manager | OPEN |
| `UCRM-DEC-005` | Confirm customer contact and consent policy | Server-enforced channel preference, opt-out, purpose, and audit rules before production sending | Owner / privacy delegate | OPEN |
| `UCRM-DEC-006` | Confirm data migration source and pilot dataset | Synthetic fixtures first; approved bounded real-data pilot later | Data owner | OPEN |
| `UCRM-DEC-007` | Confirm retention, deletion, legal-hold, and export authority | Document by data class before pilot | Privacy/security owner | OPEN |
| `UCRM-DEC-008` | Confirm first external integration, if any | No external dependency in core pilot; evaluate Microsoft or Google after core release | Product / architecture | OPEN |
| `UCRM-DEC-009` | Confirm release service targets | Internal target SLOs and recovery objectives established before production gate | Operations / architecture | OPEN |
| `UCRM-DEC-010` | Confirm old console migration and retirement criteria | Feature-flagged route parity, pilot acceptance, rollback rehearsal, then navigation cutover | Product / operations | OPEN |

## 4. Decision change template

```text
Decision ID:
Title:
State:
Date:
Owner:
Reviewers:
Context:
Decision:
Alternatives considered:
Security/privacy impact:
Data/migration impact:
In-flight agent/branch impact:
Testing and evidence impact:
Rollback/supersession path:
Affected documents and milestones:
```

## 5. Agent rule

An agent encountering an unresolved decision may continue with read-only analysis, contract drafting, fixtures, or reversible scaffolding only when the work does not silently choose the outcome. If the missing choice changes data ownership, permissions, lifecycle meaning, customer communication, pricing authority, or release safety, the agent must stop that slice and record the dependency.
