# Parts Operations Workflow and Algorithm Catalog

**Product:** Time Motor Sales Dispatch Board  
**Module:** Inventory Console → Shop & Recon → Parts Operations  
**Version:** 0.1 Phase 2 planning baseline  
**Date:** 2026-07-17  
**Status:** Documentation and product review only; no implementation is authorized by this catalog  
**Planning branch:** `codex/parts-operations-implementation-plan-phase-2`  
**Approved UX source:** [`PARTS_OPERATIONS_WORKSPACE_UI_SOURCE_OF_TRUTH.md`](PARTS_OPERATIONS_WORKSPACE_UI_SOURCE_OF_TRUTH.md)  
**Phase 1 plan:** [`PARTS_OPERATIONS_WORKSPACE_IMPLEMENTATION_PLAN.md`](PARTS_OPERATIONS_WORKSPACE_IMPLEMENTATION_PLAN.md)  
**Enterprise algorithm baseline:** [`INVENTORY_OPTIMIZATION_ALGORITHMS.md`](INVENTORY_OPTIMIZATION_ALGORITHMS.md)

## 1. Purpose and boundary

This catalog defines the workflow and decision contracts that power the approved Parts Operations workspace. It connects staff actions, authoritative records, tasks, approvals, events, recommendations, and exceptions without changing the approved navigation or visual design.

The catalog distinguishes three kinds of logic:

1. **Hard controls** enforce validity, safety, permission, quantity, custody, financial, and policy rules. They are never bypassed by a score.
2. **Workflow orchestration** moves a record through explicit, attributable states and creates the next task, approval, event, or exception.
3. **Advisory algorithms** rank or recommend eligible choices. Staff retain the consequential decision, and the selected and rejected evidence is recorded.

No recommendation may autonomously purchase, substitute, transfer, reserve scarce stock, adjust quantity, issue/install a part, reconcile a discrepancy, write off value, or change policy.

## 2. Shared contract for every workflow

Every Parts Operations workflow must define and expose:

- organization, location, actor, role/capability, delegated authority, and correlation identity;
- trigger, entry criteria, current state/version, valid commands, next state, exit criteria, and cancellation/reversal path;
- authoritative record and projection, linked vehicle/RepairOrder/RepairJob/demand where applicable;
- required evidence, freshness, validation, stop conditions, warnings, and recoverable conflicts;
- amount/quantity policy, separation-of-duties, approval version, expiry, rejection, and resubmission behavior;
- idempotency key, request identity, optimistic version, immutable audit and domain-event evidence;
- task owner, due/SLA clock, escalation owner, notification rule, and exception resolution;
- external acknowledgement, retry/replay, reconciliation, degraded/manual path, and honest capability label;
- completion summary containing command ID, resulting state/version, affected records, ledger/events, tasks/approvals, and unresolved exceptions.

Deletion is not a normal correction method. Posted quantity and custody movements are corrected by attributable, linked reversals or compensating events.

## 3. Phase-one workflow catalog

### WF-PART-01 — Create and qualify demand

**Trigger:** An authorized RepairJob, inspection/estimate outcome, inventory-recon need, or policy-authorized stock request requires a part.

**Primary states:** `DRAFT → OPEN → QUALIFIED → FULFILLED | CANCELLED`; `OPEN/QUALIFIED → EXCEPTION` when required evidence fails.

**Required controls:** Part identity or unresolved-search evidence, required quantity/date, source purpose, job/vehicle link when applicable, location, fitment evidence, duplicate detection, active-part status, unit of measure, owner, priority basis, and optimistic version.

**Creates:** Demand record/version, fitment/source evidence, sourcing or reservation task, audit event, domain event, and exception task when blocked.

**Stops:** Invalid/inactive part, missing purpose or accountable owner, uncertain fitment without authorized review, duplicate active demand, invalid quantity, stale job/estimate/authorization, or unauthorized location.

### WF-PART-02 — Reserve, release, and reallocate stock

**Trigger:** Qualified demand has eligible available stock or an authorized substitute.

**Primary states:** `ELIGIBLE → PROPOSED → RESERVED → ISSUED | RELEASED | EXPIRED`; `PROPOSED/RESERVED → CONFLICT` when availability or priority changes.

**Required controls:** Exact or approved substitute, usable condition, available quantity, location/transfer feasibility, existing reservations, demand priority, expiry/release policy, concurrency protection, and scarce-allocation authority.

**Creates:** Reservation/version, allocation decision evidence, readiness update, ledger reservation/release event, conflict or approval task, audit and domain events.

**Stops:** Negative availability, double reservation, held/damaged/quarantined stock, incompatible substitute, missing demand, expired authorization, stale proposal, or unauthorized priority override.

### WF-PART-03 — Compare sources and submit requisition

**Trigger:** Demand cannot be fulfilled safely from eligible available stock.

**Primary states:** `DRAFT → COMPARING → READY → SUBMITTED → APPROVED | REJECTED | REVISION_REQUIRED | EXPIRED | CANCELLED`.

**Required controls:** Eligible vendors/locations, fitment and substitution evidence, availability, quantity, total landed cost, ETA range, reliability, warranty, returns, transfer feasibility, quote freshness, policy version, selected source, rejected alternatives, and decision reason.

**Creates:** Versioned requisition and comparison snapshot, recommendation/decision record, purchase/substitution/transfer approval, sourcing task, audit and domain events.

**Stops:** No eligible source, stale/missing quote, uncertain fitment, missing return/warranty terms where required, prohibited vendor, policy conflict, authority failure, or materially changed proposal.

### WF-PART-04 — Control purchase order lifecycle

**Trigger:** An approved purchase requisition is ready to become a vendor commitment.

**Primary states:** `DRAFT → PENDING_APPROVAL → APPROVED → ISSUED → ACKNOWLEDGED → PARTIALLY_RECEIVED → RECEIVED → CLOSED`; alternate states `REJECTED`, `CHANGE_PENDING`, `CANCEL_PENDING`, `CANCELLED`, `VENDOR_EXCEPTION`.

**Required controls:** Exact approved requisition/version, vendor and terms, line quantities/costs, taxes/fees boundary, total amount, limit and separation-of-duties policy, expected dates, delivery location, duplicate commitment prevention, vendor acknowledgement, safe cancellation, and remaining/open quantity.

**Creates:** PO aggregate and immutable versions, approval, acknowledgement/change/cancel tasks, external handoff record, audit/domain/outbox events, and receiving expectations.

**Stops:** Missing/stale approval, changed amount/quantity/source, duplicate PO, inactive vendor, expired quote, invalid location, connector failure without approved manual path, vendor rejection, or receipt already preventing cancellation.

### WF-PART-05 — Receive, inspect, and put away

**Trigger:** Physical stock arrives against a PO, transfer, authorized return, or approved manual receipt source.

**Primary states:** `EXPECTED → ARRIVED → IN_INSPECTION → PARTIALLY_ACCEPTED | ACCEPTED | DISCREPANCY → PUT_AWAY → RECONCILED`; correction uses a linked reversal, never silent editing.

**Required controls:** Source and shipment identity, duplicate receipt check, part/quantity/condition/cost, packing evidence, ordered/open quantity, unit of measure, destination location/bin, serial/lot where applicable, inspection result, discrepancy ownership, and staff confirmation after scan.

**Creates:** Receipt and lines, accepted quantity ledger entries, balance projection update, bin/put-away task, discrepancy case, demand/readiness update, audit and domain events.

**Stops:** Unknown source, wrong part, damaged/quarantined condition, short/over quantity, cost variance, invalid bin, duplicate receipt, stale PO/transfer, or missing authority for an exception.

### WF-PART-06 — Issue, install, return unused, and reverse custody

**Trigger:** Reserved or otherwise authorized stock is physically handed to a technician/job/vehicle or returned unused.

**Primary states:** `RESERVED → READY_TO_ISSUE → ISSUED → INSTALLED | UNUSED_RETURNED → RECONCILED`; corrections create `REVERSAL_PENDING → REVERSED`.

**Required controls:** Demand/job/vehicle, reservation, part/quantity/condition, source bin, receiving person/custodian, authorization and fitment, availability, issue/install evidence, unused-return condition/bin, and reversal reason/reference.

**Creates:** Custody and ledger events, installation or unused-return evidence, job readiness/status update, reconciliation task where quantities differ, audit and domain events.

**Stops:** Negative or over-allocated stock, wrong custodian/job/part, missing authorization, uncertain fitment, held stock, duplicate issue/install, invalid return condition/bin, or unlinked reversal.

### WF-PART-07 — Transfer between locations

**Trigger:** Eligible stock at one location can satisfy authorized demand or stocking need at another location.

**Primary states:** `REQUESTED → PROPOSED → PENDING_APPROVAL → APPROVED → PICKED → SHIPPED → RECEIVED → RECONCILED`; alternate states `REJECTED`, `DELAYED`, `DISCREPANCY`, `CANCELLED`.

**Required controls:** Source and destination, source reservations/safety stock/scheduled demand, quantity/condition, transfer cost and ETA, authority, custody at shipment/receipt, paired ledger movements, cancellation boundary, and concurrent source/destination versions.

**Creates:** Transfer aggregate, approval, pick/ship/receive tasks, paired custody and ledger evidence, SLA/delay/discrepancy tasks, readiness update, audit and domain events.

**Stops:** Source stockout risk, committed inventory, invalid location pair, unauthorized cross-location action, stale availability, missing custody evidence, over/short/damaged receipt, or unbalanced paired movement.

### WF-PART-08 — Recover core, warranty, and vendor-return value

**Trigger:** A part becomes eligible for core credit, warranty recovery, vendor return, dispute, or policy-authorized write-off review.

**Primary states:** `ELIGIBLE → OPEN → READY_TO_SHIP → SHIPPED → VENDOR_ACKNOWLEDGED → CREDIT_PENDING → CREDIT_RECEIVED → RECONCILED`; alternate states `DISPUTED`, `EXPIRED`, `WRITE_OFF_PENDING`, `WRITTEN_OFF`, `CANCELLED`.

**Required controls:** Eligibility, source transaction, part/quantity/condition, documentation/packaging, deadline, expected credit, owner, shipment/custody, vendor acknowledgement, actual credit, dispute evidence, accounting handoff, amount limit, and write-off separation-of-duties.

**Creates:** Recovery case, shipment and acknowledgement evidence, deadline/credit/dispute tasks, approval where required, financial handoff record, audit/domain/outbox events.

**Stops:** Missing source/eligibility, expired deadline without exception, missing custody or vendor evidence, mismatched credit, unresolved dispute, stale approval, or unauthorized write-off.

### WF-PART-09 — Count, approve variance, and adjust

**Trigger:** Scheduled risk-based plan, manager spot count, anomaly, audit request, or workflow discrepancy requires physical verification.

**Primary states:** `PLANNED → ASSIGNED → IN_PROGRESS → OBSERVED → VARIANCE_REVIEW → APPROVED | REJECTED → POSTED → CLOSED`; `NO_VARIANCE` may proceed from observation to close.

**Required controls:** Snapshot/freeze policy, count scope, blind-count policy, assigned counter, observation evidence, recount rule, expected versus observed quantity, reason code, independent approval for nonzero variance, amount/quantity thresholds, and adjustment/reversal linkage.

**Creates:** Count plan/snapshot/observations, variance and approval tasks, adjustment ledger entry after approval, anomaly/corrective action, audit and domain events.

**Stops:** Changed scope without restart, missing observation evidence, counter self-approval where barred, unexplained variance, stale snapshot, concurrent unhandled movement, or unauthorized adjustment.

### WF-PART-10 — Manage operational exceptions and reconciliation

**Trigger:** Any workflow detects invalid, stale, missing, duplicate, delayed, rejected, mismatched, unauthorized, or out-of-balance evidence.

**Primary states:** `OPEN → TRIAGED → ASSIGNED → IN_REVIEW → RESOLUTION_PROPOSED → APPROVED_IF_REQUIRED → RESOLVED → VERIFIED → CLOSED`; alternate states `ESCALATED`, `REOPENED`, `DUPLICATE_LINKED`.

**Required controls:** Source workflow/record/event, severity and reason code, operational/financial/customer impact, owner and SLA, evidence, safe retry/replay or compensating action, approval, reconciliation check, and closure verification.

**Creates:** Exception record, accountable task, escalation/approval, corrective command reference, reconciliation evidence, audit and domain events.

**Stops:** Missing owner, unsupported correction, destructive history change, unresolved quantity/custody/credit imbalance, failed replay, stale approval, or unverified closure.

## 4. Advisory algorithm contract

Every algorithm must have a versioned specification containing:

- decision objective, eligible population, exclusions, hard constraints, inputs and authoritative sources;
- data freshness, missing-data behavior, units, time zone/window, calculation version, and effective dates;
- deterministic rules or model method, weights/parameters, output range, confidence/uncertainty, reason codes, and alternatives;
- policy and permission overlay, human decision point, allowed actions, prohibited autonomous actions, and override reason;
- backtest/baseline, quality thresholds, bias and failure review where applicable, monitoring, drift/staleness rules, and kill switch;
- recommendation/decision/outcome linkage so acceptance, rejection, override, expiry, and operational result can be measured.

A score ranks only choices that have already passed hard eligibility. Missing critical data produces `INSUFFICIENT_EVIDENCE` or a conservative fallback; it must not be converted silently into a favorable score.

## 5. Phase-one operational algorithms

### ALG-PART-01 — Work queue and exception priority

**Purpose:** Order actionable work without hiding hard commitments or safety constraints.

**Hard priority tiers:** Safety/quality stop; customer or vehicle delivery blocker; active repair blocker; custody/quantity/financial reconciliation; deadline or SLA breach; routine replenishment/control.

**Ranking inputs within a tier:** Promise risk, repair critical ratio, elapsed/remaining SLA, affected jobs/vehicles, recoverable value or exposure, downstream work unlocked, alternative availability, confidence, and manager-approved exception.

**Outputs:** Priority tier and score, top reason codes, accountable role, due/escalation time, affected records, recommended next action, freshness, and confidence. Manual reprioritization requires reason and does not remove the original score.

### ALG-PART-02 — Fitment and substitute eligibility

**Purpose:** Determine which exact, superseded, or substitute parts may enter comparison.

**Hard constraints:** Vehicle identity/configuration, part status, effective-dated interchange, documented fitment source, quantity/unit, safety or warranty restriction, and policy-required human review.

**Outputs:** `ELIGIBLE`, `REVIEW_REQUIRED`, or `INELIGIBLE`; evidence source/date, match basis, uncertainty, restrictions, and rejected alternatives. This algorithm does not authorize substitution.

### ALG-PART-03 — Reservation and scarce-stock allocation

**Purpose:** Recommend allocation without double commitment.

**Hard constraints:** Approved fitment/substitute, usable condition, quantity, location/transfer feasibility, existing commitments, safety/quality hold, and active authorized demand.

**Ranking inputs:** Safety/customer commitment, repair critical ratio, downstream readiness/revenue release, reservation age, promise deadline, alternative sources, transfer feasibility, and approved exception.

**Outputs:** Proposed allocation, competing demands, reason codes, expiration/release time, displaced-risk warning, freshness, and confidence. Scarce-stock allocation remains staff-authorized according to policy.

### ALG-PART-04 — Source and vendor recommendation

**Purpose:** Recommend the best eligible fulfillment source, not merely the lowest price.

**Eligibility:** Approved vendor/location, available quantity, valid fitment, acceptable terms, current quote, allowed geography/location, no policy/conflict-of-interest failure, and feasible delivery.

**Planning factors:** Availability, delivery reliability, total landed cost, correct-part accuracy, fill rate, return convenience, warranty performance, payment terms, historical service quality, transfer cost/risk, and urgency-specific weights.

**Outputs:** Ranked vendor/transfer alternatives, component scores, landed cost, ETA range, reliability, terms, freshness, confidence, and rejected reasons. Staff select and explain; purchase/transfer approval remains separate.

### ALG-PART-05 — ETA and repair-delay risk

**Purpose:** Estimate whether a part will arrive in time to protect an active repair or promise.

**Inputs:** Promised ETA, acknowledgement/shipment state, carrier evidence, vendor reliability, order/backorder age, substitute and transfer availability, repair critical ratio, remaining work, business calendar, and customer/vehicle commitment.

**Outputs:** Arrival range, on-time confidence, risk level, affected jobs/vehicles, uncertainty drivers, escalation time, and alternate-source recommendation. Never display a single falsely precise arrival time when evidence supports a range.

### ALG-PART-06 — Transfer-versus-purchase recommendation

**Purpose:** Recommend transfer when it offers the better authorized operational outcome.

**Hard constraints:** Protect source reservations, safety stock, scheduled demand, condition, location authority, shipment feasibility, and custody requirements.

**Planning comparison:** Avoided purchase and delay cost minus transfer cost, source stockout risk, transfer-time risk, and receiving burden.

**Outputs:** Transfer/purchase alternatives, source impact, cost and ETA ranges, risk/confidence, affected demand, and reasons. It cannot create or approve a transfer or PO.

### ALG-PART-07 — Receiving and put-away priority

**Purpose:** Sequence arrivals and put-away work that most safely unlocks operations.

**Hard tiers:** Safety repair; customer/vehicle delivery blocker; active reserved demand; overdue RepairOrder; discrepancy/custody risk; routine stock.

**Inputs:** Arrival state, active reservation, promise/critical ratio, quantity/condition uncertainty, receiving age, bin readiness, staff/equipment needs, and downstream work unlocked.

**Outputs:** Queue position, reason codes, recommended inspection/bin action, accountable role, due time, and blocked evidence. Stock is not available until identity, quantity, condition, and location are confirmed.

### ALG-PART-08 — Recovery priority

**Purpose:** Prevent loss of core, warranty, and return credits.

**Inputs:** Eligibility, expected credit, deadline proximity, condition/evidence completeness, packaging/shipment state, owner, vendor acknowledgement, dispute age, and actual-credit mismatch.

**Outputs:** Priority, value at risk, days to deadline, missing evidence, owner/escalation, recommended next action, and confidence. Write-off remains a separately approved workflow command.

## 6. Phase-later control and optimization algorithms

These contracts should be approved during planning, but their workspace rollout may follow the operational workflows above.

### ALG-PART-09 — ABC-XYZ classification

Classifies financial importance using annual consumption value and demand predictability using variability. Outputs class, input period, thresholds, confidence/data sufficiency, reason codes, and recommended control policy. Class drives review/count policy but does not itself change stock or approvals.

### ALG-PART-10 — Demand forecast

Produces a part/substitute-group, service-category, vehicle-population, location, and period demand range using recent usage, seasonality/trend, scheduled repair demand, appointment/inspection signals, supersession, and sparse-demand methods. Outputs baseline, range, confidence, horizon, freshness, and influential factors.

### ALG-PART-11 — Safety stock, reorder point, and order quantity

Uses demand/lead-time distributions, service-level policy, open orders, reservations, substitutes, transfers, pack/minimum order, capacity, expiration, carrying/order cost, and cash/policy limits. Outputs reorder trigger, recommended quantity/range, assumptions, constraint adjustments, alternatives, and confidence. It never creates a PO.

### ALG-PART-12 — Cycle-count risk

Ranks count candidates using ABC class, movement velocity, discrepancy/shrinkage history, impossible balance signals, recent receipts/transfers/returns, shared handling/bin accessibility, and time since verified count. Outputs queue, reason codes, expected effort, scope, and recommended count type. It does not adjust inventory.

### ALG-PART-13 — Obsolescence and dead-stock recommendation

Evaluates shelf age, last issue, forecast, supersession, return eligibility, vehicle population, on-hand quantity, carrying cost, transfer/wholesale demand, and recovery value. Outputs retain, reduce reorder, transfer, vendor return, bundle, wholesale, or write-down/disposal review alternatives with value ranges, reasons, confidence, and policy requirements.

### ALG-PART-14 — Shrinkage and inventory anomaly detection

Identifies facts requiring verification, including impossible balances, repeated discrepancies, unusual reversals, receipt/issue/custody mismatch, unexpected velocity change, duplicate identities, stale in-transit stock, and repeated bin corrections. Outputs anomaly type, evidence, severity, affected records, verification step, and owner. It must avoid unsupported accusation and cannot adjust stock automatically.

## 7. UI, workflow, and algorithm mapping

| Workspace destination | Primary workflows | Primary algorithms | Staff-visible outputs |
| --- | --- | --- | --- |
| Overview | WF-PART-01 through WF-PART-10 summaries | ALG-PART-01, 05, 07, 08, 12, 14 | Milestones, prioritized work, approvals, exceptions, SLA risk, freshness, and recommendation explanations |
| Demand | WF-PART-01, 02 | ALG-PART-02, 03, 05 | Fitment, availability, allocation proposal, competing demand, readiness and promise risk |
| Requisitions | WF-PART-03 | ALG-PART-02, 04, 05, 06 | Eligible alternatives, vendor/transfer comparison, landed cost, ETA, confidence, and approval need |
| Purchase Orders | WF-PART-04 | ALG-PART-01, 05 | Approval/acknowledgement state, late-order risk, affected demand, and next action |
| Receiving | WF-PART-05 | ALG-PART-07, 14 | Arrival priority, inspection/put-away action, discrepancies, blocked usability, and owner |
| Inventory | WF-PART-02, 06, 09, 10 | ALG-PART-03, 09, 10, 11, 14 | Stock truth, reservation, ledger/custody evidence, stocking advice, anomaly and confidence |
| Transfers | WF-PART-07 | ALG-PART-05, 06 | Source impact, transfer/purchase comparison, ETA/cost risk, custody and reconciliation |
| Returns & Recovery | WF-PART-08 | ALG-PART-01, 08, 13 | Deadlines, value at risk, evidence gaps, recovery alternatives, credit/dispute state |
| Counts & Exceptions | WF-PART-09, 10 | ALG-PART-01, 09, 11, 12, 13, 14 | Count queue, variance approval, anomalies, replenishment/obsolescence advice, and resolution evidence |

No algorithm requires a new global or local navigation tab.

## 8. Tasks, approvals, and notification behavior

- Create a task only when accountable human work exists; do not duplicate a workflow record merely to display status.
- One open task should represent the same record, action, owner, and reason unless policy explicitly requires independent work.
- Task priority inherits the hard tier and reason codes; a score alone cannot downgrade a safety, custody, quantity, financial, or promise breach.
- Approval tasks reference the exact proposal/version, amount/quantity, policy, evidence, requester, approver eligibility, due/expiry time, and effects of approval.
- Notifications follow role, ownership, severity, SLA, and escalation policy. They supplement the workspace queue and never become the authoritative state.
- Completion, rejection, expiry, cancellation, reassignment, escalation, and reopening remain attributable and visible.

## 9. Recommendation presentation contract

Each recommendation shown in the UI must answer:

1. What is recommended?
2. Why is it eligible and preferred?
3. What hard constraints were applied?
4. Which alternatives were compared and rejected, and why?
5. What source records, time window, and freshness support it?
6. What cost, ETA, quantity, readiness, customer, source-location, or recovery effect is expected?
7. What uncertainty or missing evidence remains?
8. Which role may decide, what approval follows, and what will be recorded?
9. When does the recommendation expire or require recalculation?

The UI must distinguish `RECOMMENDED`, `REVIEW_REQUIRED`, `INSUFFICIENT_EVIDENCE`, `STALE`, `UNAVAILABLE`, and `POLICY_BLOCKED` states.

## 10. Phase 2 approval decisions

Before this catalog becomes an approved implementation contract, product and operations must confirm:

- exact workflow state names, cancellation/reversal boundaries, exception reasons, task ownership, and SLA/escalation rules;
- scarce-stock allocation order and when a manager-approved override is allowed;
- fitment/substitution evidence standards and which substitutions require independent approval;
- vendor/source score factors, approved weight versions, emergency-order variant, and quote-freshness limits;
- purchase, transfer, variance, and write-off thresholds plus separation-of-duties rules;
- source-location protection policy for transfers and the definition of safety stock/scheduled demand;
- receiving tolerances for short, over, cost variance, damage, wrong part, and duplicate receipt;
- count freeze/concurrent-movement/recount rules and independent variance approval;
- recovery deadlines, value-at-risk escalation thresholds, accounting acknowledgement, and write-off authority;
- algorithm baselines, confidence thresholds, insufficient-evidence behavior, outcome metrics, review cadence, and kill-switch owners.

## 11. Phase 2 acceptance checklist

- [ ] Parts staff validate each workflow against representative customer repair, inventory recon, stock replenishment, transfer, and recovery scenarios.
- [ ] Product approves workflow triggers, states, commands, stop conditions, reversals, tasks, approvals, events, and exception ownership.
- [ ] Security/governance approves role, location, amount, delegation, and separation-of-duties boundaries.
- [ ] Data/domain owners approve authoritative records, invariants, projection reconciliation, freshness, retention, and audit evidence.
- [ ] Each algorithm has approved hard constraints, sources, versioned parameters, outputs, explanation, uncertainty, human boundary, fallback, and measurement.
- [ ] Design confirms every state and recommendation can be represented within the approved local destinations and responsive patterns.
- [ ] Integration owners confirm acknowledgement, degraded/manual, retry/replay, reconciliation, and capability-label behavior.
- [ ] No planned capability is represented as deployed or externally integrated without evidence.

## 12. Change control

This catalog elaborates the approved Parts Operations source of truth; it does not replace it. Material changes to navigation, milestones, role boundaries, approval guardrails, quantity/custody controls, or the advisory-only boundary require explicit product approval and versioned updates to the approved source document and image.
