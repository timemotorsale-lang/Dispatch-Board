# Inventory Lifecycle Workspace — Implementation Plan

**Product:** Time Motor Sales Dispatch Board  
**Module:** Inventory Console → Inventory Lifecycle  
**Version:** 0.1 planning baseline  
**Date:** 2026-07-17  
**Status:** Documentation and planning only; no application implementation is authorized by this document  
**Planning branch:** `codex/inventory-lifecycle-workspace-implementation-plan`  
**Approved UI source:** [`INVENTORY_CONSOLE_LANDING_PAGES_UI_SOURCE_OF_TRUTH.md`](INVENTORY_CONSOLE_LANDING_PAGES_UI_SOURCE_OF_TRUTH.md)  
**Enterprise roadmap:** [`INVENTORY_ENTERPRISE_ROADMAP.md`](INVENTORY_ENTERPRISE_ROADMAP.md)  
**Milestone ledger:** [`INVENTORY_ENTERPRISE_IMPLEMENTATION_MILESTONES.md`](INVENTORY_ENTERPRISE_IMPLEMENTATION_MILESTONES.md)  
**Workflow launcher:** [`INVENTORY_CONSOLE_WORKFLOW_LAUNCHER_UX_CONTRACT.md`](INVENTORY_CONSOLE_WORKFLOW_LAUNCHER_UX_CONTRACT.md)  
**Inventory-to-frontline program:** [`frontline-workflow/README.md`](frontline-workflow/README.md)  
**Wholesale source:** [`DISPOSITION_WHOLESALE_WORKSPACE_UI_SOURCE_OF_TRUTH.md`](DISPOSITION_WHOLESALE_WORKSPACE_UI_SOURCE_OF_TRUTH.md)

## 1. Purpose

This plan consolidates the approved Inventory Lifecycle landing page, Inventory-to-Frontline workflow package, Workflow Launcher, Wholesale workspace, enterprise algorithms, and M3 milestone ledger into one implementation-planning contract.

It fills the two material lifecycle gaps that are not fully covered by the existing nine-slice Inventory-to-Frontline package:

1. **Pre-acquisition decision:** appraisal, maximum-bid/purchase limit, purchase authorization, and the financial-acquisition boundary.
2. **Post-frontline retail completion:** availability, reservation, sale, delivery, cancellation/unwind, and controlled reversal.

The document does not activate behavior, approve dealership policy, claim external integrations, or authorize application code.

## 2. Approved experience boundary

The Inventory Lifecycle navigation item opens the approved landing page and control-tower experience. It must preserve:

- the shared Inventory Console shell, global search, location scope, live-data state, alerts, help, and user controls;
- exactly seven global navigation destinations, with Inventory Lifecycle selected;
- Reviews & Approvals with permission-aware pending counts and direct actions;
- compact filters, interactive KPI strip, lifecycle pipeline, bottleneck visibility, priority work, ownership, blockers, due state, and next action;
- a prominent **Open Disposition & Wholesale** command without adding a global navigation tab;
- advisory recommendations with evidence, rationale, alternatives, freshness, confidence, and human-approval boundaries;
- velocity, stage bottleneck, aging, exposure, disposition, sale/delivery, and reconciliation summaries;
- honest loading, empty, stale, partial, unavailable, denied, conflict, retry, and degraded-integration states.

The landing page is an operational control tower, not a collection of unrelated tabs and not a second system of record.

## 3. Lifecycle scope and topology

```text
OPPORTUNITY / APPRAISAL
  → PURCHASE LIMIT AND AUTHORIZATION
  → FINANCIAL ACQUISITION / INVENTORY UNIT
  → TRANSPORT PLANNING
  → IN TRANSIT
  → RECEIPT AND CUSTODY
  → INSPECTION AND TRIAGE
  → RECON PLAN AND APPROVAL
  → PARTS AND REPAIR EXECUTION
  → QUALITY AND SAFETY VERIFICATION
  → TITLE / DOCUMENT READINESS
  → MERCHANDISING AND PRICE APPROVAL
  → FRONTLINE RELEASE
  → AVAILABLE FOR SALE
  → RESERVED / DEAL PENDING
  → SOLD
  → DELIVERY READY
  → DELIVERED / RECONCILED

Approved alternate route:
  ANY ELIGIBLE REVIEW POINT
    → DISPOSITION REVIEW
    → TRANSFER / WHOLESALE / OTHER AUTHORIZED EXIT
    → SETTLED AND RECONCILED
```

Cancellation, rejection, deferment, hold, suspension, rework, return to prior stage, unwind, reversal, and exception paths must remain explicit and attributable. Display status alone cannot move a vehicle through the lifecycle.

## 4. Source-of-truth boundaries

| Concern | Governing source | Planning rule |
| --- | --- | --- |
| Vehicle identity | Canonical Vehicle registry | Never create a second vehicle identity; stock number is an operating reference |
| Inventory cycle | InventoryUnit | One acquisition/disposition cycle; reacquisition after closure creates a new cycle |
| Acquisition-to-frontline | `INV-ITF` workflow and nine decision catalogs | Reuse approved states, evidence, tasks, gates, approvals, and handoffs |
| Parts and repair | Shop & Recon and Parts Operations contracts | Reference outcomes and readiness; do not duplicate RepairOrder, RepairJob, parts, or QC systems |
| Wholesale exit | Disposition & Wholesale workspace | Deep workspace owns candidate-to-settlement execution; lifecycle landing shows governed summaries and entry context |
| Retail reservation/sale/delivery | InventoryUnit commercial workflow | Requires a dedicated post-frontline contract; must not be inferred from CRM/DMS status alone |
| Tasks and approvals | Enterprise command/task/approval foundations | One accountable work item per record/action/reason unless independent work is required |
| Events and audit | Domain-event and immutable audit foundations | Every consequential command, decision, correction, reversal, and external acknowledgement remains attributable |
| External systems | Approved source-authority/integration matrix | Request is not acknowledgement; manual, sandbox, degraded, pending, rejected, and reconciled states remain explicit |

## 5. Planning streams aligned to M3

The planning streams retain the master `VEH-031` through `VEH-042` identifiers. They specify documentation readiness, not implementation completion.

| Stream | Scope | Existing planning evidence | Remaining planning deliverable |
| --- | --- | --- | --- |
| VEH-031 | Acquisition and appraisal records | Algorithm baseline and acquisition workflow context | Pre-acquisition appraisal states, evidence/comparables, confidence, versions, decision history, expiry, and source authority |
| VEH-032 | Purchase limit and authorization | Maximum-bid algorithm and enterprise financial controls | Exact proposal/amount, limits, four-eyes rules, approval expiry, purchase commitment boundary, rejection, cancellation, and audit contract |
| VEH-033 | Transport, receipt, and intake | Acquisition/transport and receipt/custody decision catalogs | UI/control-tower mapping, launch context, projection fields, SLA/freshness, carrier/manual boundary, and cross-location exception visibility |
| VEH-034 | Inspection and recon-plan handoff | Inspection/triage and recon-planning catalogs | Landing-page stage projection, blocker aggregation, approval counts, readiness roll-up, and no-duplicate-task mapping |
| VEH-035 | Title/document readiness | Title/document decision catalog | Control-tower gate summary, sensitive-field visibility, external dependency state, due/escalation, suspension, and release stop conditions |
| VEH-036 | Merchandising package | Merchandising/pricing decision catalog | Media/content completeness, verified facts, price approval, channel/publication acknowledgement, freshness, and exception projection |
| VEH-037 | Frontline readiness | QC and frontline-release catalogs | Checklist-backed gate projection, failed-gate reasons/owners, availability handoff, suspension/reinstatement, and review/approval interaction |
| VEH-038 | Reservation, sale, delivery, and reversal | Commercial handoff foundations; no complete lifecycle workspace catalog | Dedicated state/command contract for available, reserved, sold, delivery-ready, delivered, cancelled, unwound, and reversed outcomes |
| VEH-039 | Inventory cost and exposure | Algorithm baseline and financial-control matrices | Canonical acquisition/recon/title/merchandising/carrying/committed/incurred/estimated/recovered definitions, sources, confidence, visibility, and reconciliation |
| VEH-040 | Lifecycle SLA and velocity policy | Workflow clocks, escalation matrices, and algorithm baseline | Effective-dated policy contract, calendar/pause behavior, simulation, approval, override, outcome calibration, and landing-page reason codes |
| VEH-041 | Control-tower projection/API | Approved UI, canonical foundations, workflow states | Projection schema, aggregation rules, filters, counts, drill-through keys, freshness/confidence, authorization, pagination, and reconciliation |
| VEH-042 | Live control-tower experience | Approved landing page and interaction contract | Component-to-contract mapping, saved views, selection, commands, reviews/approvals, all non-happy states, accessibility, performance, and release evidence |

## 6. Recommended delivery waves

### Wave A — Consolidated control-tower contract

Plan the route, shell, location/permission scope, filters, saved views, KPI definitions, lifecycle projection, stage pipeline, selection, drill-through, work queue, Reviews & Approvals, freshness, and non-happy states.

**Exit condition:** Every count, stage, clock, amount, recommendation, task, approval, and exception maps to an authoritative record and reconciliation rule.

### Wave B — Pre-acquisition decision

Plan appraisal evidence, comparable selection, confidence, maximum bid/purchase limit, purchase approval, acquisition source, transport handoff, and the exact moment an InventoryUnit becomes authoritative.

**Exit condition:** Opportunity/appraisal data cannot be mistaken for owned inventory, and no purchase commitment can occur without exact authority and evidence.

### Wave C — Inventory-to-frontline projection

Map the completed nine-slice workflow package into staff-visible control-tower stages, blockers, owners, clocks, tasks, approvals, evidence readiness, and alternate routes without redefining those workflows.

**Exit condition:** Landing-page status is derived from authoritative workflow evidence and never becomes a second lifecycle state machine.

### Wave D — Post-frontline retail completion

Plan available-for-sale, reservation/deal-pending, reservation expiry/release, sale authorization, delivery readiness, delivery/custody handoff, cancellation, unwind, reversal, and downstream acknowledgement.

**Exit condition:** Retail completion preserves title/release, ownership, custody, inventory state, customer/deal reference, financial handoff, idempotency, approval, and reconciliation controls.

### Wave E — Disposition and Wholesale bridge

Map candidate creation, deep-workspace launch context, milestone summaries, approvals, offers, sale/transfer, settlement, and exceptions from the approved Wholesale contract into Inventory Lifecycle.

**Exit condition:** The landing page summarizes and launches Wholesale work without duplicating its records or claiming activation/settlement without acknowledgement.

### Wave F — Enterprise readiness

Plan external integrations, manual/degraded operation, reconciliation, security, field visibility, accessibility, performance, observability, support, training, pilot, pause, rollback, and outcome measurement.

**Exit condition:** Honest-state labels and enterprise release gates are approved for the intended pilot scope.

## 7. Control-tower information contract

### Filters and scope

- organization and authorized location/multi-location scope;
- inventory type/source, lifecycle stage, owner, blocker, risk, age band, title/release state, frontline state, disposition state, sale/delivery state, and freshness;
- saved-view ownership, sharing, versioning, default policy, invalid-filter recovery, and URL state;
- explicit time zone, business calendar, as-of time, data coverage, and partial-result behavior.

### KPI strip

Every KPI must expose definition/version, numerator/denominator, exclusions, scope, time window, unit/currency, freshness, confidence/data-quality state, target, trend basis, and drill-through population.

Initial KPI families:

- total active inventory and stage population;
- acquisition-to-receipt, receipt-to-frontline, frontline age, deal-pending age, and total inventory age;
- units blocked by safety/QC, title/documents, parts/recon, merchandising/pricing, approval, custody, integration, or customer/deal dependency;
- cost/capital exposure and value at risk;
- frontline-ready, available, reserved, sold/delivery-pending, disposition-candidate, wholesale/transfer, and exception populations;
- stage throughput, target breaches, first-pass readiness, suspension/reinstatement, sale/delivery completion, and reconciliation accuracy.

### Lifecycle pipeline

Each stage shows count, target, median/range age, breached count, exposure, owner coverage, confidence/freshness, and drill-through. Stage entry and exit are projected only from approved evidence events.

### Priority work queue

Each row shows vehicle/InventoryUnit, location, stage, reason, hard-priority tier, age/SLA, blocker/dependency, accountable owner, due/escalation, financial/customer impact, recommendation/evidence state, required approval, and next valid action.

### Reviews and approvals

The panel distinguishes review from approval, references the exact proposal/version, explains authority and separation-of-duties, shows amount/quantity and consequence preview, and exposes approve/reject/return only when server-authorized.

## 8. Pre-acquisition planning contract

### Appraisal

Required planning coverage:

- opportunity/source identity without prematurely creating owned inventory;
- VIN/configuration, mileage, condition, title/history, recon estimate, comparable set, market source, freshness, assumptions, valuation range, confidence, author/reviewer, expiry, and immutable versions;
- `HIGH`, `MEDIUM`, `LOW`, and `INSUFFICIENT` confidence behavior;
- evidence conflict, additional inspection, revision, supersession, rejection, and cancellation;
- separation between appraisal estimate, approved purchase limit, actual purchase commitment, and financial acquisition.

### Maximum bid and purchase authorization

The planning contract must retain expected retail proceeds, target gross, expected recon, fees/transport, holding/title/merchandising/selling costs, risk reserve, approved maximum all-in cost, approved maximum bid, actual commitment, source, amount/currency, policy version, requester, approver, limit, separation of duties, expiry, and override reason.

An algorithm may recommend a limit. Only an authorized command may approve or commit a purchase.

### Financial acquisition boundary

The exact acquisition event must define when ownership/consignment/authorized transfer creates an InventoryUnit, which identifiers and evidence are required, what downstream transport/receipt work is created, how duplicates are prevented, and how cancellation or correction preserves history.

## 9. Post-frontline retail completion contract

This is the largest remaining workflow-design gap.

### Required states

```text
FRONTLINE_AUTHORIZED
  → AVAILABLE_FOR_SALE
  → RESERVED_DEAL_PENDING
  → SALE_AUTHORIZED
  → SOLD
  → DELIVERY_READY
  → DELIVERED
  → RECONCILED
```

Alternate states include `RESERVATION_EXPIRED`, `RESERVATION_RELEASED`, `SALE_CANCELLED`, `DELIVERY_HOLD`, `UNWIND_PENDING`, `UNWOUND`, `REVERSAL_PENDING`, `REVERSED`, `SUSPENDED`, and `EXCEPTION`.

### Required controls

- current frontline authorization and post-release suspension state;
- canonical customer/deal reference without duplicating CRM/DMS identity;
- reservation owner, start/expiry, deposit/payment-reference boundary, competing reservation prevention, release reason, and manager override;
- exact vehicle, price/deal reference, sale authority, title/release, keys/documents, custody/location, mileage/condition at handoff, and delivery evidence;
- accounting/DMS request and acknowledgement, external IDs, failure/retry/replay, mismatch, and reconciliation;
- cancellation/unwind timing, returned custody/condition, financial/title implications, inventory re-entry route, and linked compensating events;
- idempotency, optimistic versions, immutable audit, tasks, approvals, events, and no destructive history changes.

### Required human decisions

- reserve, extend, release, or override competing demand;
- authorize sale and resolve title/release or price/deal mismatch;
- approve delivery readiness and acknowledge custody transfer;
- cancel or unwind and select the valid inventory re-entry route;
- approve restricted reversal, write-down, or exception resolution;
- verify final operational and external reconciliation.

## 10. Advisory algorithm mapping

The existing enterprise algorithm baseline remains authoritative. The lifecycle workspace consumes and explains, rather than duplicates:

| Decision support | Required landing-page output | Human boundary |
| --- | --- | --- |
| Lifecycle delay and expected completion | Stage/total age, target breach, completion range, confidence, owner, blocker, escalation | Cannot change stage, owner, or due date without authorized workflow action |
| Carrying cost and capital exposure | Component exposure, daily/period trajectory, assumptions, confidence, value at risk | Cannot post accounting value or force disposition |
| Appraisal confidence and maximum bid | Evidence quality, valuation/limit range, risks, freshness, approval need | Cannot approve or commit purchase |
| Recon priority and readiness | Eligibility, priority, dependencies, work unlocked, failed gates | Cannot bypass safety, skill, parts, approval, or QC gates |
| Dynamic aging/pricing and disposition score | Hold/improve/review/transfer/wholesale alternatives, rationale, recovery/exposure, confidence | Cannot change price, activate channel, transfer, or dispose |
| Reservation/sale/delivery priority | Promise/deal timing, title/release/custody readiness, conflicts, next action | Cannot reserve, sell, release, deliver, unwind, or reverse |
| Outcome and calibration | Recommendation decision/outcome, cycle time, exposure, gross/recovery, override, data quality | Parameters never self-modify; changes require approved versioned rollout |

## 11. Role and permission visibility

| Role | Default lifecycle visibility | Typical preparation | Consequential authority requiring explicit policy |
| --- | --- | --- | --- |
| Inventory specialist | Assigned units, stages, evidence, tasks, recommendations | Prepare intake, evidence, appraisal, transport, merchandising, review requests | Purchase, restricted price, frontline release, reservation override, sale, delivery, reversal, disposition |
| Inventory / used-vehicle manager | Location inventory, priorities, exposure, approvals, exceptions | Decide within explicit location, amount, workflow, and separation-of-duties rules | Above-limit, cross-location, accounting/title-controlled, or self-approval-barred actions |
| Recon / shop / parts staff | Assigned repair and readiness context | Execute authorized work and record evidence | Inventory purchase, pricing, sale, delivery, or disposition unless separately granted |
| Sales / delivery staff | Available/reserved/sold units and assigned delivery readiness | Prepare customer/deal and handoff evidence | Reservation override, sale/release, delivery exception, unwind, or reversal according to policy |
| Title / accounting staff | Title/release, amounts, external handoffs, mismatches, reconciliation | Accept/reject assigned handoffs and verify evidence | Invent acquisition, physical receipt, custody, repair, sale, delivery, or settlement completion |
| Regional / executive / auditor | Governed multi-location aggregates and evidence drill-through | Review, approve where explicitly delegated, export where permitted | No operating mutation solely from reporting/audit role |

The UI explains access but does not enforce it alone. The server remains authoritative for tenant, location, role/capability, ownership, field visibility, amount, delegation, policy version, and separation of duties.

## 12. Records, tasks, approvals, and events

| Lifecycle action | Authoritative records | Typical work / approval | Required evidence events |
| --- | --- | --- | --- |
| Submit appraisal | Opportunity/appraisal version and evidence/comparables | Evidence, review, revision | Drafted, submitted, reviewed, superseded, expired, rejected |
| Authorize purchase | Purchase-limit proposal, approval and commitment reference | Amount/four-eyes approval, acquisition exception | Requested, approved/rejected, committed, cancelled, corrected |
| Acquire and transport | InventoryUnit, acquisition source, transport/custody plan | Pickup, carrier, delay, damage/exception | Acquired, transport planned, picked up, in transit, delayed, arrived |
| Receive through frontline | Existing `INV-ITF` workflow records and nine decision catalogs | Stage tasks, approvals, exceptions, evidence | Approved stage-entry/exit, hold, rework, suspension/reinstatement, frontline authorization |
| Reserve / release | Reservation version and customer/deal reference | Expiry, extension, conflict/override | Reserved, extended, expired, released, overridden, conflicted |
| Sell and deliver | Sale, release, delivery/custody and downstream handoff | Sale/release/delivery approval, hold resolution | Sale authorized, sold, delivery ready/held, delivered, handoff acknowledged/rejected |
| Unwind / reverse | Linked unwind/reversal and inventory re-entry decision | Manager/title/accounting approval, inspection/re-entry task | Requested, approved/rejected, custody returned, unwound/reversed, re-entered |
| Disposition / wholesale | Approved Wholesale records | Review, channel/offer/release/settlement approvals | Candidate through settled/reconciled events from Wholesale contract |
| Resolve exception | Source-linked exception and corrective references | Triage, escalation, retry/replay, approval, verification | Opened, assigned, escalated, resolved, verified, reopened |

## 13. Dependencies and honest capability labels

| Dependency | Planning position | Required UI behavior until verified live |
| --- | --- | --- |
| M3 Inventory Lifecycle records/commands | InventoryUnit foundation exists; master ledger marks `VEH-031`–`VEH-042` planned | Show only verified authoritative fields/states; label planned, partial, unavailable, or illustrative data honestly |
| Inventory-to-frontline package | Catalog-complete but dealership approval and activation are not granted | Planning/proposed policy; do not claim workflow active |
| Wholesale Phase 2 catalog | Separate workstream must merge before final cross-workspace traceability approval | Use approved Wholesale source/Phase 1 contract; mark detailed dependency pending merge |
| DMS/accounting/CRM/title/listing/transport providers | External adapter and source-authority work remains environment/vendor dependent | Manual, sandbox, unavailable, request pending, acknowledged, rejected, mismatched, or reconciled |
| Market/appraisal data | Source, license, coverage, freshness, and confidence must be contracted | Manual/illustrative until verified; never imply live market authority |
| Recommendations and projections | Algorithm foundations exist; live inputs, calibration and reconciliation require verification | Advisory with evidence, freshness, confidence, alternatives, and non-executing status |

## 14. Review and approval gates

1. **Product and inventory operations:** Approve lifecycle terminology, stages, ownership, task order, entry/exit/alternate routes, queues, reviews, and representative task times.
2. **Acquisition and finance:** Approve appraisal, maximum bid, purchase authority, financial-acquisition boundary, amounts, exposure, corrections, and handoffs.
3. **Frontline workflow owners:** Confirm control-tower mapping reuses all nine catalogs without redefining states, tasks, evidence, approvals, or exceptions.
4. **Sales and delivery:** Approve reservation, sale, delivery, cancellation/unwind, custody, customer/deal references, promises, and re-entry paths.
5. **Title, accounting, and compliance:** Approve ownership, title/release, payment/reference, external acknowledgement, reconciliation, reversal, retention, and sensitive-field boundaries.
6. **Security and governance:** Approve capability/field matrix, tenant/location scope, delegated amount limits, separation of duties, overrides, exports, and audit evidence.
7. **Design and accessibility:** Approve component contracts, responsive behavior, keyboard/screen-reader operation, direct Review/Approve behavior, and all non-happy states.
8. **Integration and operations:** Approve source authority, acknowledgements, freshness, retry/replay, reconciliation, degraded/manual paths, observability, support, training, pilot, pause, rollback, and release gates.

## 15. Definition of ready

Each planned slice is ready for implementation only when it has:

- an approved user outcome, actors, trigger, entry/exit states, stop conditions, alternate routes, cancellation/reversal, and out-of-scope boundary;
- wireframes and interaction specifications for happy, empty, stale, partial, unavailable, unauthorized, conflict, failure, retry/replay, and recovery states;
- authoritative records, commands, validations, tasks, approvals, events, audit, external acknowledgements, and reconciliation mapped;
- permission, location, field, amount, delegated-authority, and separation-of-duties rules;
- idempotency, concurrency, immutable version/evidence, correction, reversal, and duplicate-prevention behavior;
- KPI/projection definitions, freshness, confidence, drill-through, pagination, and reconciliation expectations;
- measurable acceptance, accessibility/performance targets, observability, support ownership, pilot evidence, and rollback thresholds;
- honest capability labels and no unresolved dependency that would require the UI to misstate acquisition, readiness, availability, sale, delivery, disposition, or reconciliation.

## 16. Planning decisions still required

- Confirm pilot locations, inventory sources/types, channels, roles, systems, volumes, calendars, thresholds, and rollout boundary.
- Approve pre-acquisition appraisal sources/evidence, confidence, comparable policy, expiry, maximum-bid inputs, purchase limits, four-eyes rules, and financial-acquisition event.
- Resolve and sign the proposed decisions in the Inventory-to-Frontline approval package; catalog completeness does not equal dealership authorization.
- Approve lifecycle stage targets, pause reasons, escalation, owner coverage, age/velocity bands, disposition-review timing, and outcome calibration.
- Approve post-frontline availability, reservation, expiry/extension, competing-demand, sale, release, delivery, custody, cancellation/unwind, reversal, and re-entry policy.
- Approve cost/exposure definitions, amount visibility, accounting boundaries, source/confidence, and reconciliation tolerances.
- Approve KPI catalog mappings, saved-view defaults, queue priority tiers, review/approval panel behavior, bulk-action limits, and notification rules.
- Merge and cross-review the Wholesale Phase 2 catalog before finalizing the lifecycle-to-wholesale traceability matrix.
- Select external adapter pilots and document authoritative fields, acknowledgements, retry/replay, reconciliation, manual fallback, support owner, and capability labels.
- Approve acceptance scenarios, training, shadow/manual pilot, production activation, pause, rollback, expansion gates, and final decision owners.

## 17. Recommended next planning artifact

After this plan is reviewed, the next documentation-only artifact should be:

`docs/inventory/INVENTORY_LIFECYCLE_RETAIL_COMPLETION_WORKFLOW_AND_ALGORITHM_CATALOG.md`

It should focus on the genuinely missing post-frontline contract—availability, reservation, sale, delivery, cancellation/unwind, reversal, reconciliation, and their decision-support algorithms—while referencing rather than duplicating the existing nine Inventory-to-Frontline catalogs and the Wholesale catalog.

Recommended branch:

`codex/inventory-lifecycle-retail-completion-plan`

## 18. Change control

This plan consolidates approved sources; it does not silently amend them. Material changes to global navigation, approved landing-page structure, lifecycle stages, the nine Inventory-to-Frontline catalogs, role boundaries, approval guardrails, identity/ownership/custody/title/financial controls, post-frontline commercial boundaries, Wholesale boundaries, or advisory-only behavior require explicit product approval and versioned updates to the governing source documents and images.
