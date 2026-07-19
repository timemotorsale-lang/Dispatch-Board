# Parts Operations Workspace UI Source of Truth

**Product:** Time Motor Sales Dispatch Board  
**Module:** Inventory Console → Shop & Recon  
**Version:** 1.0 approved baseline  
**Date:** 2026-07-17  
**Status:** Approved visual, workflow, and interaction source of truth; visual-conformance implementation completed 2026-07-19
**Working branch:** `codex/inventory-wholesale-parts-workspaces`

## 1. Approved mockup

![Approved Parts Operations workspace](assets/parts-operations-workspace-source-of-truth.png)

This is the deeper workspace reached through **Open Parts Operations**. It is not an eighth Inventory Console navigation destination.

## 2. Design prompt

> Design an enterprise desktop **Parts Operations** workspace that inherits the approved Inventory Console shell and Shop & Recon visual language. Preserve exactly seven global navigation destinations and show Shop & Recon as selected. Use local tabs for Overview, Demand, Requisitions, Purchase Orders, Receiving, Inventory, Transfers, Returns & Recovery, and Counts & Exceptions. Present compact filters; demand, readiness, waiting, purchase-order, arrival, receiving-exception, and recovery KPIs; a nine-stage milestone pipeline; a parts work queue; contextual reviews and approvals; supply and availability; purchase orders and receiving; transfers and custody; returns and recovery; and a selected-record recommendation explanation. Recommendations must expose fitment evidence, vendor comparison, availability, ETA, alternatives, freshness, and uncertainty, and must remain advisory. Authorized human approval is required for purchase, substitution, transfer, adjustment, issue, installation, reconciliation, write-off, or policy exception. Show immutable custody and quantity controls, prevent negative stock, and clearly distinguish repository-complete capabilities from undeployed migrations, external vendor adapters, and barcode-hardware readiness. Match the approved enterprise visual system. Avoid autonomous purchasing, hidden approval boundaries, an additional global tab, and decorative clutter.

## 3. Workspace information architecture

| Local destination | Primary purpose |
| --- | --- |
| Overview | Attention, readiness, milestones, work, approvals, and exceptions |
| Demand | RepairJob-linked need, required date, priority, fitment, and alternatives |
| Requisitions | Sourcing comparison, requested quantity, reason, and approval readiness |
| Purchase Orders | Draft, approval, issue, acknowledgement, change, cancel, and close |
| Receiving | Scan/manual receipt, inspection, discrepancy, cost, and put-away |
| Inventory | Part master, bins, on-hand, allocated, available, ordered, backordered, and damaged |
| Transfers | Source availability, custody, shipment, receipt, discrepancy, cost, and SLA |
| Returns & Recovery | Core, warranty, vendor return, acknowledgement, credit, dispute, and write-off |
| Counts & Exceptions | Full/cycle/spot counts, variance approval, adjustment, anomaly, and exception ownership |

### Binding overview execution areas

- **Parts Work Queue** preserves the approved **My Work**, **Team**, and **Exceptions** categories and the complete fact sequence: Type, Part # / Description, Repair Order / Job, Vehicle, Required By, Availability, Vendor / ETA, Reservation, Owner, Blocker, and Action.
- **Reviews & Approvals** preserves separate **Reviews** and **Approvals** categories and the approved facts: Item, Owner, Age, Amount, and Action.
- A value that is absent from an authoritative projection is shown as unavailable; the interface must not manufacture an owner, ETA, availability result, or approval fact to make the page appear complete.
- The five supporting panels remain Supply & Availability, Purchase Orders & Receiving, Transfers & Custody, Returns & Recovery, and Recommendation Explanation.

## 4. Operational milestones

These are staff-visible business milestones, not implementation phases.

| Milestone | Entry | Required outcome | Stop conditions |
| --- | --- | --- | --- |
| 1. Demand | RepairJob or authorized stock need identifies a part | Normalized demand with quantity, fitment, required date, source, and owner | Missing job/source, invalid part, uncertain fitment, or duplicate demand |
| 2. Requisition | Demand cannot be fulfilled directly from available stock | Alternatives and vendor/transfer options compared | Missing quote, ETA, return terms, warranty, or authority |
| 3. Approval | Purchase, substitution, transfer, or exception exceeds policy | Authorized approval references the exact proposal version | Separation-of-duties, limit, evidence, or stale proposal failure |
| 4. Ordered | Approved purchase is issued | Vendor acknowledgement or explicit pending/failure state recorded | Connector unavailable, rejection, change conflict, or cancellation |
| 5. In Transit | Shipment or transfer leaves source custody | Trackable ETA, custody, and delay ownership exist | Missing acknowledgement, shipment identity, or custody evidence |
| 6. Received | Physical quantity arrives | Quantity, condition, cost, source, discrepancy, and bin decision recorded | Wrong, damaged, short, over, or cost-variance exception |
| 7. Reserved | Available part is allocated to authorized demand | Reservation prevents double allocation and exposes readiness | Insufficient availability, conflicting priority, hold, or fitment concern |
| 8. Issued / Installed | Part moves to technician/job/vehicle custody | Issue and installation evidence reconcile to authorized demand | Negative stock, over-allocation, missing job, or unauthorized custody move |
| 9. Reconciled | Job, stock, PO, return, transfer, or count reaches closure | Quantities, custody, costs, credits, discrepancies, and external handoff agree | Unresolved variance, missing receipt/credit, or downstream rejection |

## 5. Phase-one implementation slices

Each slice must be independently demonstrable and preserve tenant, location, authority, audit, idempotency, immutable ledger, and honest-state controls.

| Slice | Deliverable | Capability position | Acceptance boundary |
| --- | --- | --- | --- |
| PART-UI-01 | Route, shell, local tabs, filters, saved views, and return context | Approved shell and live parts-counter foundations exist | **Open Parts Operations** lands here without adding global navigation |
| PART-UI-02 | Overview projections and KPI drill-through | Parts balances, demand, PO, receipt, transfer, recovery, count, and recommendation data exist | Every count reconciles to authoritative records and states freshness |
| PART-UI-03 | Demand and reservation queue | RepairJob demand and reservation are implemented | Scarce allocation is authorized, explainable, and cannot double reserve |
| PART-UI-04 | Requisition and sourcing comparison | Part/vendor masters, offers, fitment, substitutes, ETA, and return terms are implemented | Selected source and rejected alternatives retain evidence and reason |
| PART-UI-05 | Purchase-order workflow | Controlled PO aggregate and approvals are implemented | Draft through close transitions enforce authority, version, amount, and state |
| PART-UI-06 | Receiving and discrepancy workspace | Partial/full receiving, damage/wrong/short/cost discrepancy, and bin capture are implemented | No receipt silently changes quantity; exceptions have owner and resolution |
| PART-UI-07 | Inventory, bin, and ledger drill-through | Immutable stock ledger and balance projections are implemented | On-hand, allocated, available, ordered, backordered, and damaged reconcile |
| PART-UI-08 | Issue, install, unused return, and custody | Controlled custody and installation evidence are implemented | Negative and over-allocated stock are rejected; reversals remain linked |
| PART-UI-09 | Cross-location transfer workflow | Shipment, receipt, discrepancy, cost, and custody are implemented | Source and destination ledger movements reconcile under concurrency |
| PART-UI-10 | Core, warranty, and vendor-return recovery | Eligibility through credit/dispute/write-off is implemented | Deadline, expected/actual credit, evidence, and authority stay visible |
| PART-UI-11 | Counts, adjustments, replenishment, and obsolescence advice | Count controls and advisory recommendations are repository-complete | Independent approval is required for nonzero variance; advice never creates a PO, transfer, or adjustment |
| PART-UI-12 | Vendor integration, barcode, release evidence, accessibility, and performance | Vendor-specific adapter is M9 work; barcode-ready UI exists but hardware integration is operational work | Manual/degraded paths are labeled; connector acknowledgement and enterprise release gates are required for live claims |

## 6. Role and permission visibility

| Role family | Default visibility | Consequential authority |
| --- | --- | --- |
| Technician | Assigned-job demand, reservation, issue/return state, and fitment evidence | May request and acknowledge custody within policy; no purchasing or adjustments |
| Advisor/dispatcher | Job readiness, ETA, blockers, promises, and escalation | May create demand and request sourcing; no inventory mutation unless separately granted |
| Parts specialist | Parts, demand, requisitions, PO preparation, receiving, bins, transfers, and returns | Policy-scoped operating commands; restricted decisions route to approval |
| Parts manager | Location supply, vendor decisions, counts, exceptions, recovery, and approvals | Policy-scoped purchase, substitution, transfer, variance, and write-off approval |
| Regional inventory manager | Multi-location supply, shared pools, transfers, obsolescence, and policy outcomes | Higher-limit and cross-location approvals where explicitly granted |
| Accounting/auditor | Costs, credits, handoffs, discrepancy evidence, and immutable history | Read/accept assigned handoffs; cannot invent physical receipt or custody |

The server remains authoritative. Hidden or disabled controls alone never enforce permission.

## 7. Validation, confirmation, and approval behavior

- Validate part status, fitment, unit of measure, quantity, location/bin, job/demand, availability, reservation, source, cost, ETA, policy version, authority, and optimistic version.
- Prevent negative stock, over-allocation, duplicate receipt, duplicate reservation, invalid location pairing, and unbalanced reversal.
- Preview the exact quantities, costs, custody moves, downstream readiness effect, required approval, and warning state before submission.
- Require independent approval for nonzero count variance and configured approvals for purchases, substitutions, transfers, adjustments, or write-offs.
- Return confirmation with command ID, ledger/event references, resulting availability, created tasks/approvals, and any unresolved discrepancy.
- Barcode scan is an input accelerator, never proof by itself; staff must confirm the resolved part, quantity, location, and action.

## 8. Records, tasks, and events

| Workflow action | Records created or updated | Typical tasks/approvals | Required event evidence |
| --- | --- | --- | --- |
| Create demand | RepairJob-linked demand and fitment/source evidence | Source, reserve, or exception task | Demand created/changed/cancelled with actor and correlation |
| Submit requisition | Versioned alternatives and vendor/transfer comparison | Purchase, substitution, or transfer approval | Submitted, approved, rejected, revised |
| Issue PO | PurchaseOrder and immutable line/version state | Vendor acknowledgement or change task | Issued, acknowledged, changed, cancelled, closed |
| Receive stock | Receipt, discrepancy, bin decision, and stock-ledger entry | Damage, wrong/short/over, or cost-resolution task | Received, partially received, discrepancy opened/resolved |
| Reserve/issue/install/return | Reservation, custody, installation, or reversal ledger event | Readiness/blocker or unused-return task | Reserved, released, issued, installed, returned, reversed |
| Transfer | Transfer aggregate and paired source/destination custody events | Shipment, receipt, delay, or discrepancy task | Approved, shipped, received, reconciled, cancelled |
| Recover core/warranty/vendor return | Recovery case, shipment, acknowledgement, credit/dispute/write-off | Deadline or approval task | Eligible, shipped, acknowledged, credited, disputed, written off |
| Count and adjust | Count snapshot, observations, approval, and adjustment ledger event | Independent variance approval | Started, observed, approved/rejected, posted/cancelled |
| Review recommendation | Advisory recommendation and decision record | Optional follow-up task | Generated, acknowledged, dismissed, expired; never self-executed |

## 9. Change control

The local tabs, nine business milestones, work queue, barcode-ready entry, role boundaries, immutable quantity and custody controls, human-approval guardrails, and labeling of vendor-adapter and deployment dependencies are approved and binding. Any material change requires explicit product approval and a versioned update to this document and its approved image.
