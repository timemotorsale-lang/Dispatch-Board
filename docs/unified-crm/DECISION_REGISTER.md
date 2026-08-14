# Unified CRM Decision Register

**Document ID:** `UCRM-GOV-001`
**Version:** 1.1 approved foundation-policy baseline
**Status:** Foundation decisions accepted; deferred operational values remain release-gated
**Date:** 2026-08-14

**Approval authority:** The user is the Product Owner and business-escalation authority for this baseline. Technical, security/privacy, data/domain, quality, and release/operations responsibilities are roles; no human identity is inferred by this document.

## 1. Decision states

- `PROPOSED` — recommended but not yet binding.
- `ACCEPTED` — binding until superseded through this register.
- `DEFERRED` — intentionally postponed; current scope must not depend on it.
- `REJECTED` — considered and explicitly not selected.
- `SUPERSEDED` — replaced by a linked later decision.

## 2. Binding foundation decisions

| ID | State | Decision | Consequence |
| --- | --- | --- | --- |
| `UCRM-ADR-001` | ACCEPTED | Unified CRM is an independent console inside the existing modular monolith, not a new deployment. | Reuse shared deployment, authentication, database, and platform services. |
| `UCRM-ADR-002` | ACCEPTED | `/crm` is the primary route; existing consoles remain until separately approved migration gates pass. | Navigation cutover is feature-flagged, evidence-based, and reversible. |
| `UCRM-ADR-003` | ACCEPTED | Customers owns customer identity/contact/consent; Inventory owns vehicle truth; Appointments owns schedule; Tasks owns work; Activity remains evidence. | CRM uses owning-domain commands and source-labeled projections rather than shadow records. |
| `UCRM-ADR-004` | ACCEPTED | Unified CRM owns opportunity, commercial, quote, CRM conversation-envelope, forecast, and CRM configuration facts. | CRM receives a clear commercial boundary without taking operational authority. |
| `UCRM-ADR-005` | ACCEPTED | Commands and purpose-built read models are the module contract; UI cards never own state. | Visible state and actions must trace to server contracts. |
| `UCRM-ADR-006` | ACCEPTED | Cross-domain effects use owning services and durable outbox patterns; direct cross-domain table mutation is prohibited. | Handoffs are idempotent, observable, and reconcilable. |
| `UCRM-ADR-007` | ACCEPTED | Existing customer/lead structures evolve additively; consolidation requires an explicit migration and compatibility plan. | Agents cannot silently reinterpret or replace existing lifecycle data. |
| `UCRM-ADR-008` | ACCEPTED | Presented scenarios and issued quotes are immutable versions. | Corrections create new versions and retain commercial history. |
| `UCRM-ADR-009` | ACCEPTED | Native domain bridges precede required third-party integrations. | The internal MVP remains useful without external providers. |
| `UCRM-ADR-010` | ACCEPTED | AI is optional, permission-aware, source-grounded, and cannot execute consequential commands without authorized confirmation. | Core CRM stays deterministic and available without AI. |
| `UCRM-ADR-011` | ACCEPTED | Organization is the present isolation boundary; a future multi-organization tenant model requires a dedicated ADR and migration. | All current records, jobs, projections, exports, caches, and integrations remain organization-scoped. |
| `UCRM-ADR-012` | ACCEPTED | Activity, domain events, audit, outbox, and decision records remain distinct evidence types. | One evidence stream cannot impersonate another. |
| `UCRM-ADR-013` | ACCEPTED | Configuration and custom metadata are versioned governed artifacts, not arbitrary runtime mutation. | Draft, validation, publish, rollback, permission, and limits are required. |
| `UCRM-ADR-014` | ACCEPTED | Transactional and analytical workloads separate when measured performance requires it, without changing system-of-record authority. | Reporting scale cannot weaken transaction correctness. |
| `UCRM-ADR-015` | ACCEPTED | Production-facing sample data and unmarked simulated results are prohibited. | Demo data belongs only in labeled sandboxes and fixtures. |
| `UCRM-ADR-016` | ACCEPTED | Agent work is contract-first, vertically sliced, file-owned, independently reviewed, and evidence-gated. | Parallel work cannot bypass dependencies or silently change shared contracts. |
| `UCRM-ADR-017` | ACCEPTED | Every active opportunity requires an owner, stage, next action, and due time. | Commands reject violations and queues expose inherited data gaps. |
| `UCRM-ADR-018` | ACCEPTED | Opportunity stages are evidence-based, command-driven, and history-backed. | Drag/drop invokes the same validated command as every other interface. |
| `UCRM-ADR-019` | ACCEPTED | Authorization intersects capability, organization, location, ownership/team, record, field, state, purpose, and separation-of-duties rules. | A role name or hidden UI control never grants authority. |
| `UCRM-ADR-020` | ACCEPTED | External integrations degrade visibly and never silently overwrite authoritative records. | Connector health, provenance, conflict, retry, replay, reconciliation, and kill switches are first-class. |

## 3. Product and operating decisions

| ID | Required decision | Default recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| `UCRM-DEC-001` | Confirm product name, route, and navigation label | Dispatch Board Unified CRM Console; `/crm`; CRM | Product Owner | ACCEPTED |
| `UCRM-DEC-002` | Confirm initial role categories and record scope | Seller: assigned/own; lead coordinator: assigned lead queue; manager: team; customer care: assigned relationship/service without financial fields; finance liaison: assigned handoffs; administrator: configuration without implicit record access; executive: approved read-only insights | Product Owner / Operations Owner | ACCEPTED |
| `UCRM-DEC-003` | Confirm exact opportunity stages and evidence requirements | Use a short evidence-based lead-to-won/lost lifecycle; exact names and evidence remain gated before `UCRM-030–033` | Sales Domain Owner | DEFERRED |
| `UCRM-DEC-004` | Confirm quote/pricing/discount authority baseline | CRM may draft; until exact thresholds are approved, only authorized sales management may approve presentation or commercial exceptions; no self-approval | Product Owner / Sales Domain Owner | ACCEPTED |
| `UCRM-DEC-005` | Confirm customer contact and consent policy | Server-enforced purpose, channel, consent, suppression, opt-out, and audit immediately before any production send | Product Owner / Security and Privacy Owner | ACCEPTED |
| `UCRM-DEC-006` | Confirm data migration source and pilot dataset policy | Synthetic fixtures first; each bounded real-data pilot dataset requires separate Data Owner approval | Data Owner | ACCEPTED |
| `UCRM-DEC-007` | Confirm retention, deletion, legal-hold, and export authority baseline | Inherit approved source-domain policy; legal hold blocks disposition; no automated CRM disposal or broad/restricted export until exact policy is approved | Security and Privacy Owner / Data Owner | ACCEPTED |
| `UCRM-DEC-008` | Confirm first external integration, if any | No external dependency in core pilot; provider selection and activation require a later provider-specific decision | Product Owner / Architecture Owner | ACCEPTED |
| `UCRM-DEC-009` | Confirm release service targets | Accepted targets: 99.5% availability during configured operating hours for pilot, 99.9% after internal release, RTO 2 hours, RPO 15 minutes, approved UX/performance budgets, no S0/S1, and zero unauthorized disclosure, lost/duplicate consequential write, or missing material audit | Product Owner / Operations Owner / Architecture Owner | ACCEPTED |
| `UCRM-DEC-010` | Confirm old console migration and retirement criteria | Feature-flagged route parity, pilot acceptance, rollback rehearsal, then separately approved navigation cutover | Product Owner / Operations Owner | ACCEPTED |
| `UCRM-DEC-011` | Confirm sensitive-field visibility baseline | Mask contact data in lists/search; grant detail by assigned purpose; restrict gross/margin, finance, restricted notes, integration payload, audit/security, and AI trace fields through explicit capabilities; administration grants no implicit record access | Product Owner / Security and Privacy Owner / Data Owner | ACCEPTED |
| `UCRM-DEC-012` | Confirm rollout, pause, and rollback authority | Product Owner approves enablement; Operations/Release executes it; Security may immediately disable for exposure; Operations/Release may disable for integrity/availability; rollback preserves evidence and existing-console fallback | Product Owner / Operations Owner / Security and Privacy Owner | ACCEPTED |
| `UCRM-DEC-013` | Confirm exact pricing, discount, amount, and cumulative approval thresholds | No numeric threshold is implied by the accepted baseline; dependent quote-presentation/approval activation remains held | Product Owner / Sales Domain Owner | DEFERRED |
| `UCRM-DEC-014` | Confirm exact retention periods, disposition schedule, and export volume thresholds | No duration or volume is implied; real-data disposition and broad/restricted export remain held | Product Owner / Security and Privacy Owner / Data Owner | DEFERRED |
| `UCRM-DEC-015` | Confirm named pilot users and exact rollout cohort | Role categories are accepted; no person is enrolled or granted access by this document | Product Owner / Operations Owner | DEFERRED |

### 3.1 Accepted data-authority interpretation

- Customers remains authoritative for customer identity, contact points, consent, merge, archive, and retention state.
- Existing `CustomerLead` records remain unchanged until a versioned bridge/migration decision is implemented and verified. They are not silently reinterpreted as CRM opportunities.
- Unified CRM owns new opportunity, scenario, quote, CRM conversation-envelope, forecast, and CRM-configuration facts.
- Inventory/Vehicles, Appointments, Tasks, Dispatch/Repair, and Activity retain the authorities assigned by `UCRM-ADR-003`.
- CRM reads source-labeled projections and invokes owning-domain commands; it does not write another domain's tables as a shortcut.

### 3.2 Accepted approval defaults

- A requester cannot approve their own exception where separation of duties applies.
- Approval binds to the exact subject, version, purpose, scope, location, and effective policy and expires according to the later approved policy.
- Until numeric authority is approved, CRM can prepare commercial drafts but cannot infer permission to present price/terms or approve an exception.
- Customer merge requires Customer-domain data-steward authority and an independent authorized approval; no role obtains merge authority by implication.
- Broad or restricted export and material privacy disposition require explicit approval under the later exact policy.

### 3.3 Held dependent work

The accepted foundation authorizes contract and reversible implementation work. It does not release or configure operational values. The following remain held:

- stage-dependent opportunity persistence, transition, and pipeline activation under `UCRM-030–033` that requires exact stage names or exit evidence;
- commercial presentation/approval activation under `UCRM-042–045` that requires exact monetary, discount, amount, or cumulative thresholds;
- real-data automated disposition and broad/restricted export activation, including affected portions of `UCRM-061` and `UCRM-104`, requiring exact durations and volume thresholds;
- pilot enablement, user grants, or cohort rollout under `UCRM-068–069` requiring named people and an approved cohort;
- production release dependent on measured evidence that the accepted service targets in `UCRM-DEC-009` are attained.

## 4. Decision roles

| Role | Authority in this baseline |
| --- | --- |
| Product Owner / business escalation | The user who approved these six policy bundles; approves product scope, business policy, enablement, and escalated tradeoffs. |
| Architecture Owner | Selects technical implementation consistent with accepted ADRs; cannot weaken business or security policy. |
| Security and Privacy Owner | Approves security/privacy control interpretation, may immediately disable affected capability for exposure risk, and cannot silently broaden access. |
| Data Owner / Domain Owner | Approves authoritative field/lifecycle semantics, migration datasets, and domain-specific corrections. |
| Operations/Release Owner | Executes approved rollout and may pause/rollback for integrity or availability under the accepted contract. |
| Quality Owner | Determines whether evidence satisfies gates; cannot grant business authority or waive isolation/security blockers. |

These are responsibility labels, not claims that named people have been assigned.

## 5. Decision change template

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

## 6. Agent rule

An agent encountering an unresolved decision may continue with read-only analysis, contract drafting, fixtures, or reversible scaffolding only when the work does not silently choose the outcome. If the missing choice changes data ownership, permissions, lifecycle meaning, customer communication, pricing authority, or release safety, the agent must stop that slice and record the dependency.
