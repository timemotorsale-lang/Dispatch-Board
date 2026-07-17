# Disposition & Wholesale Workspace UI Source of Truth

**Product:** Time Motor Sales Dispatch Board  
**Module:** Inventory Console → Inventory Lifecycle  
**Version:** 1.0 approved baseline  
**Date:** 2026-07-17  
**Status:** Approved visual, workflow, and interaction source of truth; implementation not yet started  
**Working branch:** `codex/inventory-wholesale-parts-workspaces`

## 1. Approved mockup

![Approved Disposition & Wholesale workspace](assets/disposition-wholesale-workspace-source-of-truth.png)

This is the deeper workspace reached through **Open Disposition & Wholesale**. It is not an eighth Inventory Console navigation destination.

## 2. Design prompt

> Design an enterprise desktop **Disposition & Wholesale** workspace that inherits the approved Inventory Console shell and Inventory Lifecycle visual language. Preserve exactly seven global navigation destinations and show Inventory Lifecycle as selected. Use local tabs for Overview, Candidates, Appraisals, Channels & Listings, Offers & Bids, Settlements, and Exceptions. Present compact filters; disposition, exposure, recovery, listing, offer, approval, and settlement KPIs; an eight-stage milestone pipeline; a recommendation workbench; contextual reviews and approvals; channel performance; offers and bids; settlement and reconciliation; and a selected-record decision explanation. Recommendations must expose evidence freshness, rationale, alternatives, confidence or uncertainty, and must remain advisory. Authorized human approval is required before price, channel activation, transfer, release, sale, write-down, or financial handoff. Clearly distinguish live authoritative data, unavailable integrations, stale data, and illustrative projections. Match the approved white, navy, royal-blue, green, amber, red, and restrained-purple enterprise visual system. Avoid autonomous-action language, marketing decoration, an additional global tab, and hidden approval boundaries.

## 3. Workspace information architecture

| Local destination | Primary purpose |
| --- | --- |
| Overview | Attention, milestone health, recommendations, approvals, and exceptions |
| Candidates | Governed population of vehicles eligible for disposition review |
| Appraisals | Evidence, comparables, valuation versions, confidence, and decisions |
| Channels & Listings | Channel comparison, reserve/price proposal, activation, and publication state |
| Offers & Bids | Offer intake, bid comparison, expiry, counter, acceptance, and rejection |
| Settlements | Sale/transfer completion, release gates, credits, and financial handoff |
| Exceptions | Stale evidence, integration failures, holds, mismatches, and reconciliation work |

## 4. Operational milestones

These are staff-visible business milestones, not implementation phases.

| Milestone | Entry | Required outcome | Stop conditions |
| --- | --- | --- | --- |
| 1. Candidate Review | Age, exposure, policy, manual referral, or recommendation creates review eligibility | Authorized owner accepts, dismisses, or defers review with reason | Missing identity, ownership, location, title, cost, or freshness |
| 2. Appraisal | Candidate accepted for evaluation | Versioned appraisal with evidence, comparables, confidence, and decision history | Required evidence absent or stale beyond policy |
| 3. Channel & Pricing | Appraisal is reviewable | Retail, dealer network, auction, or transfer alternatives compared; price/reserve proposed | Unsupported channel, missing fees, authority, or gross-floor conflict |
| 4. Approval | Consequential proposal is complete | Authorized approver accepts, rejects, or returns for revision | Separation-of-duties, dollar-limit, evidence, or title/release gate failure |
| 5. Activated | Approval and required channel readiness exist | Listing, auction, dealer-network offer, or transfer is explicitly activated | Connector unavailable, publication error, expired approval, or hold |
| 6. Offers & Bids | Active channel returns or staff records an offer | Offer is reviewed, countered, accepted, rejected, or allowed to expire | Reserve variance, authority, identity, fraud, or stale-offer exception |
| 7. Sold / Transferred | Accepted offer or approved transfer exists | Custody, inventory state, title/release, and downstream handoff are recorded | Payment/reference, release, title, transport, or receiving hold |
| 8. Settled & Reconciled | Sale or transfer completion evidence exists | Expected and actual amounts, fees, credits, IDs, and states reconcile | Missing accounting/DMS acknowledgement or material mismatch |

## 5. Phase-one implementation slices

Each slice must be independently demonstrable and must preserve tenant, location, role, audit, idempotency, and honest-state controls.

| Slice | Deliverable | Capability position | Acceptance boundary |
| --- | --- | --- | --- |
| DWH-01 | Route, shell, local tabs, filters, saved views, and return context | UI composition over approved console shell | **Open Disposition & Wholesale** lands here without adding global navigation |
| DWH-02 | Candidate projection and queue | Aging, exposure, tasks, approvals, and disposition advice exist; full lifecycle data remains source-dependent | Counts reconcile to authoritative population; every inclusion has a reason |
| DWH-03 | Candidate review command | Shared command, task, approval, and audit foundations exist | Accept, dismiss, and defer require authority and emit attributable events |
| DWH-04 | Appraisal evidence and version history | Inventory appraisal record remains an incomplete M3 slice | No production valuation claim until source, comparables, evidence, and decision history are authoritative |
| DWH-05 | Explainable recommendation workbench | Aging, transfer, pricing-review, and disposition advice exists in advisory form | Rationale, source freshness, assumptions, alternatives, confidence, policy version, and outcome tracking are visible |
| DWH-06 | Channel and reserve-price comparison | Decision logic is available; live market/listing adapter remains M9 work | Comparison identifies source and freshness; no recommendation executes itself |
| DWH-07 | Approval gates | Enterprise role, dollar-limit, four-eyes, and audit controls exist | Price, reserve, channel, transfer, release, sale, and write-down commands fail closed without authority |
| DWH-08 | Listing/channel activation | External market/listing adapter remains planned | Manual or sandbox path is labeled; live activation requires idempotent connector acknowledgement |
| DWH-09 | Offer and bid review | Workspace and command contract are new | Immutable offer versions retain source, amount, fees, expiry, action, actor, and correlation |
| DWH-10 | Sale, transfer, release, and reversal | Inventory state and transfer foundations exist; downstream handoffs require authoritative integrations | Every mutation is explicit, reversible where policy allows, and blocked by required gates |
| DWH-11 | Settlement and reconciliation | Integration registry, DMS/accounting adapter, and reconciliation console remain M9 work | UI never claims settlement from a request alone; accepted acknowledgement and mismatch ownership are visible |
| DWH-12 | Exceptions, reporting, accessibility, performance, and release evidence | Governance and reporting foundations exist | Empty, stale, partial, denied, conflict, retry, and outage states pass enterprise release gates |

## 6. Role and permission visibility

| Role family | Default visibility | Consequential authority |
| --- | --- | --- |
| Inventory specialist | Assigned candidates, evidence, appraisals, and recommendations | May prepare and submit; cannot self-approve restricted decisions |
| Used-vehicle or inventory manager | Location candidate book, channel comparison, approvals, exceptions | Policy-scoped price, reserve, activation, transfer, and disposition decisions |
| Regional manager | Multi-location exposure, transfers, policy exceptions, performance | Higher-limit and cross-location approvals where policy grants authority |
| Accounting/title staff | Release, settlement, title, fee, credit, and reconciliation evidence | May accept assigned handoffs; cannot invent operational completion |
| Executive/auditor | Governed aggregate performance and evidence drill-through | Read/export only unless separately granted an operating role |

The server remains authoritative. Hidden or disabled controls alone never enforce permission.

## 7. Validation, confirmation, and approval behavior

- Validate identity, lifecycle state, ownership, location, title/release state, cost basis, evidence freshness, policy version, authority, and optimistic version before accepting a command.
- Preview the exact effect, affected record, amount, channel, required approvals, and warnings before submission.
- Require reason and supporting evidence for overrides, rejection, dismissal, write-down, reversal, and exception resolution.
- Use separation of duties and configured integer-cent limits for financial or inventory mutations.
- Return a confirmation with command ID, resulting status, created tasks/approvals, and event-history link.
- Conflict, duplicate, stale-version, unavailable-source, and connector-timeout outcomes must be explicit and safely retryable.

## 8. Records, tasks, and events

| Workflow action | Records created or updated | Typical tasks/approvals | Required event evidence |
| --- | --- | --- | --- |
| Start candidate review | Candidate review linked to InventoryUnit and policy/evidence snapshot | Evidence collection or owner review | Review started, source, reason codes, actor, correlation |
| Submit appraisal | Immutable appraisal version and comparables/evidence links | Appraisal review when policy requires | Version submitted, confidence, sources, decision |
| Propose channel/price | Versioned recommendation and alternative comparison | Reserve/price, channel, or transfer approval | Recommendation created, model/policy version, freshness |
| Activate channel | Activation request and external-reference placeholder | Channel activation approval | Requested, acknowledged, rejected, retry, correlation |
| Review offer/bid | Immutable offer/bid and decision | Above-limit or below-reserve approval | Received, countered, accepted, rejected, expired |
| Complete sale/transfer | Inventory state/custody transition and release evidence | Release/title/transport exception tasks | Command accepted, state changed, reversal linkage |
| Reconcile settlement | Expected/actual reconciliation and discrepancy | Assigned mismatch resolution | Submitted, accepted, rejected, reconciled, reopened |

## 9. Change control

The local tabs, eight business milestones, recommendation workbench, role boundaries, approval guardrails, and distinction between currently supported decision support and integration-dependent execution are approved and binding. Any material change requires explicit product approval and a versioned update to this document and its approved image.
