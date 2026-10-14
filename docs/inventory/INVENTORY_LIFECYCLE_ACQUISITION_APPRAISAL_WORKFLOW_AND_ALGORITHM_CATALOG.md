# Inventory Lifecycle Acquisition & Appraisal Workflow and Algorithm Catalog

**Product:** Time Motor Sales Dispatch Board  
**Module:** Inventory Console → Inventory Lifecycle → Acquisition & Appraisal  
**Version:** 0.1 planning baseline  
**Date:** 2026-07-18  
**Status:** Documentation and product review only; no implementation is authorized by this catalog  
**Planning branch:** `codex/inventory-lifecycle-acquisition-appraisal-plan`  
**Inventory Lifecycle plan:** [`INVENTORY_LIFECYCLE_WORKSPACE_IMPLEMENTATION_PLAN.md`](INVENTORY_LIFECYCLE_WORKSPACE_IMPLEMENTATION_PLAN.md)  
**InventoryUnit boundary:** [`INVENTORY_UNIT_FOUNDATION_ADR.md`](INVENTORY_UNIT_FOUNDATION_ADR.md)  
**Downstream acquisition/transport catalog:** [`frontline-workflow/ACQUISITION_TRANSPORT_DECISION_CATALOG.md`](frontline-workflow/ACQUISITION_TRANSPORT_DECISION_CATALOG.md)  
**Workflow Launcher contract:** [`INVENTORY_CONSOLE_WORKFLOW_LAUNCHER_UX_CONTRACT.md`](INVENTORY_CONSOLE_WORKFLOW_LAUNCHER_UX_CONTRACT.md)  
**Enterprise algorithm baseline:** [`INVENTORY_OPTIMIZATION_ALGORITHMS.md`](INVENTORY_OPTIMIZATION_ALGORITHMS.md)

## 1. Purpose and boundary

This catalog defines the missing pre-acquisition decision layer between a vehicle opportunity and an authoritative dealership-controlled InventoryUnit.

It covers:

- opportunity/referral intake;
- canonical identity and evidence qualification;
- acquisition appraisal and immutable versions;
- comparable selection, valuation range, confidence, and risk;
- maximum all-in cost and maximum-bid recommendation;
- purchase/trade/consignment approval and accepted commitment;
- financial-acquisition confirmation and InventoryUnit creation;
- cancellation, correction, reversal, exception, and reconciliation;
- controlled handoff into the existing Acquisition & Transportation catalog.

It does not receive a vehicle, record physical custody, perform inspection or recon, post accounting entries, process payment, replace an auction/DMS/title provider, or authorize application code.

## 2. Critical boundary distinctions

| Concept | Meaning | Must not be confused with |
| --- | --- | --- |
| Opportunity | A vehicle that may be evaluated | Owned inventory or an approved purchase |
| Acquisition appraisal | Evidence-backed acquisition valuation before commitment | Wholesale/disposition appraisal of already-controlled inventory |
| Recommendation | Advisory pursue/watch/decline, valuation, or maximum-bid output | Approval or purchase authority |
| Purchase limit | Highest approved amount under an exact proposal and policy version | Actual accepted price or payment |
| Purchase/trade/consignment commitment | Authorized and accepted commercial/control boundary | Physical receipt or accounting posting |
| Financial acquisition | Evidence that creates dealership control and permits one InventoryUnit cycle | Staff assertion, listing import, bid draft, or vehicle existence |
| InventoryUnit | One organization-controlled commercial inventory cycle linked to one Vehicle | Physical vehicle identity or an opportunity record |
| Transport handoff | Approved downstream work after acquisition is authoritative | Receipt, custody, inspection, or frontline readiness |

An opportunity can close without ever creating an InventoryUnit. A canonical Vehicle may exist without dealership ownership. Only an approved and evidenced financial/control boundary can create the inventory cycle.

## 3. Shared workflow contract

Every acquisition/appraisal workflow must define and expose:

- organization, location, actor, role/capability, delegated authority, amount limit, and correlation identity;
- source opportunity, canonical or candidate vehicle identity, acquisition type, intended use, and current decision owner;
- trigger, entry criteria, current state/version, valid commands, next state, expiry, cancellation, supersession, correction/reversal, and exit criteria;
- evidence source, retrieval/effective time, freshness, confidence, conflicts, required review, and insufficient-evidence behavior;
- amounts in integer cents and explicit currency, including expected retail, recon, fees, transport, holding, title/merchandising/selling cost, target gross, risk reserve, maximum all-in cost, maximum bid, proposed amount, approved amount, and accepted amount;
- exact proposal, algorithm, comparable-set, appraisal, and policy versions used for a recommendation or approval;
- permission, delegated limit, separation of duties, anti-splitting, conflict-of-interest, approval expiry, rejection, and resubmission;
- idempotency, optimistic version, duplicate prevention, immutable decision/evidence history, audit, events, and outbox/handoff evidence;
- accountable owner, task, due/SLA, escalation, notification, exception, and closure verification;
- external request/acknowledgement, manual/degraded mode, retry/replay, source reconciliation, and honest capability labels.

A score cannot override identity, title/history, safety, legal/compliance, evidence, permission, amount, ownership, or policy rules.

## 4. Workflow catalog

### WF-AA-01 — Register and triage an acquisition opportunity

**Trigger:** An auction/listing lead, trade appraisal request, direct purchase, seller referral, consignment proposal, inter-location opportunity, manager referral, or approved external import requires evaluation.

**Primary states:** `NEW → TRIAGE_REQUIRED → QUALIFIED_FOR_APPRAISAL`; alternate states `WATCH`, `DECLINED`, `DUPLICATE`, `INVALID`, `EXPIRED`, `CANCELLED`, `EXCEPTION`.

**Required controls:** Source/type, source reference and freshness, organization/location intent, known seller/customer/auction reference, preliminary vehicle identity, purpose, owner, due/expiry time, duplicate opportunity and active-InventoryUnit search, consent/privacy where applicable, and import lineage.

**Creates:** Opportunity record/version, owner/research task, duplicate or identity exception, source/correlation evidence, audit and domain events.

**Stops:** Missing source/purpose/owner, prohibited source, duplicate active opportunity requiring resolution, vehicle already controlled by an open InventoryUnit, unverifiable import, unauthorized location, or expired opportunity.

### WF-AA-02 — Verify identity and minimum appraisal evidence

**Trigger:** A qualified opportunity needs a decision-ready vehicle and evidence package.

**Primary states:** `EVIDENCE_REQUIRED → IN_COLLECTION → READY_FOR_APPRAISAL`; alternate states `IDENTITY_CONFLICT`, `ADDITIONAL_INSPECTION_REQUIRED`, `INSUFFICIENT`, `EXPIRED`, `CANCELLED`.

**Required controls:** Canonical Vehicle search/match, VIN or authorized non-VIN exception, configuration/trim, mileage source, condition evidence, title/history evidence and limitations, ownership/seller authority, photos/inspection where available, known damage/recall/safety facts, acquisition source, and evidence freshness/classification.

**Creates:** Evidence package/version, Vehicle match or restricted identity-review reference, inspection/research task, evidence-quality result, exception and audit/domain events.

**Stops:** Identity conflict or suspected duplicate, missing authority to offer/sell/consign, material title/history uncertainty, inadequate condition/mileage evidence, suspected fraud/tampering requiring escalation, or expired evidence.

### WF-AA-03 — Create and submit acquisition appraisal

**Trigger:** Minimum evidence is sufficient to estimate acquisition economics.

**Primary states:** `DRAFT → EVIDENCE_INCOMPLETE → READY_FOR_REVIEW → SUBMITTED → REVIEWED → ACCEPTED_FOR_DECISION`; alternate states `REVISION_REQUIRED`, `REJECTED`, `SUPERSEDED`, `EXPIRED`, `CANCELLED`.

**Required controls:** Exact evidence package, comparable set and exclusions, comparable adjustments, market/location context, expected retail range, recon/transport/title/merchandising/selling/holding cost ranges, target gross, risk reserve, valuation range, confidence, assumptions, author/reviewer, model/policy versions, freshness, and expiry.

**Creates:** Immutable appraisal version, comparable/evidence links, valuation/confidence outputs, review task, decision history, audit and domain events.

**Stops:** `INSUFFICIENT` confidence, stale/unsupported comparable set, unknown material costs, unresolved identity/title/history conflict, inconsistent currency/units, missing author/reviewer, stale version, or prohibited self-review.

### WF-AA-04 — Revise, supersede, expire, or withdraw appraisal

**Trigger:** Material evidence, condition, comparable, cost, policy, amount, or timing changes after an appraisal version exists.

**Primary states:** `CHANGE_DETECTED → REVISION_REQUIRED → NEW_DRAFT → SUBMITTED`; prior version becomes `SUPERSEDED`; other outcomes are `EXPIRED`, `WITHDRAWN`, or `CANCELLED`.

**Required controls:** Materiality rule, changed fields/evidence, prior version, reason, actor, effective time, dependent recommendation/approval invalidation, notification, and immutable lineage.

**Creates:** Successor appraisal version, invalidation events, revised tasks/approvals, audit and domain events.

**Stops:** In-place mutation of submitted evidence, retained approval against a materially changed version, missing change reason, or attempt to erase prior decision history.

### WF-AA-05 — Produce maximum-cost and bid proposal

**Trigger:** An accepted appraisal version is eligible for acquisition decision support.

**Primary states:** `ELIGIBLE → CALCULATED → REVIEW_REQUIRED → PROPOSAL_READY`; alternate states `INSUFFICIENT_EVIDENCE`, `POLICY_BLOCKED`, `STALE`, `EXPIRED`, `CANCELLED`.

**Required controls:** Appraisal and algorithm versions, expected retail range, target gross, recon/fees/transport/holding/title/merchandising/selling costs, risk reserve, confidence, source/type-specific adjustments, maximum all-in cost, maximum bid or trade allowance boundary, assumptions, sensitivity, policy limits, and expiry.

**Creates:** Versioned recommendation/proposal, calculation explanation, alternatives/sensitivity, approval-preparation task, audit and recommendation events.

**Stops:** Insufficient/stale appraisal, unresolved hard risk, missing cost component required by policy, invalid currency/amount, calculation failure, or recommendation above a hard policy ceiling.

### WF-AA-06 — Request and decide acquisition authorization

**Trigger:** A purchase/trade/consignment proposal requires authority before commitment.

**Primary states:** `DRAFT → REQUESTED → PENDING → APPROVED | REJECTED | RETURNED_FOR_REVISION | EXPIRED | CANCELLED`.

**Required controls:** Exact opportunity/appraisal/proposal/policy versions, acquisition type, proposed amount/currency, approved maximum, expected economics/range, risks, seller/source, intended location/use, requester, eligible approver, delegated limit, cumulative exposure, anti-splitting, separation of duties, conflict-of-interest declaration, expiry, and decision reason.

**Creates:** Immutable approval request/decision, approver/escalation task, authorization token/reference for the exact proposal, audit and domain events.

**Stops:** Self-approval where barred, amount above authority, split proposals, stale/revised evidence, expired opportunity/appraisal/offer, unresolved identity/title/safety/compliance issue, missing conflict disclosure, or duplicate final decision.

### WF-AA-07 — Record bid/offer negotiation and accepted commitment

**Trigger:** Authorized staff place or receive a bid, counter, purchase offer, trade allowance, or consignment agreement within the approved boundary.

**Primary states:** `AUTHORIZED → OFFER_PREPARED → SUBMITTED → COUNTER_RECEIVED | ACCEPTED | REJECTED | EXPIRED | WITHDRAWN`; a counter creates an immutable successor version and returns to review/approval when required.

**Required controls:** Exact approval reference, source/seller/buyer identity, amount/currency, fees/terms/contingencies, expiry, bid/offer/counter version, accepted evidence, external acknowledgement, maximum limit, variance/reapproval rule, idempotency, and correlation.

**Creates:** Immutable bid/offer/counter versions, external request/response evidence, variance or reapproval task, acceptance/decline decision, audit/domain/outbox events.

**Stops:** Amount or material terms outside approval, expired/stale authorization, unverifiable counterparty, duplicate bid/commitment, connector ambiguity, missing acceptance evidence, or unsupported manual completion claim.

### WF-AA-08 — Confirm financial acquisition and create InventoryUnit

**Trigger:** An authorized purchase, accepted trade, effective consignment, or approved control transfer has accepted evidence and satisfies the financial/control boundary.

**Primary states:** `COMMITMENT_ACCEPTED → ACQUISITION_VALIDATION → INVENTORY_UNIT_PENDING → INVENTORY_UNIT_CREATED → HANDOFF_READY`; alternate states `RECONCILIATION_REQUIRED`, `DUPLICATE`, `CANCELLED_BEFORE_CONTROL`, `REVERSAL_REVIEW`, `EXCEPTION`.

**Required controls:** Canonical Vehicle, acquisition type/source/reference, accepted amount/currency and effective time, ownership/trade/consignment relationship, organization and location, unique inventory number, one accountable owner, intended disposition, stage target/next action, no other open InventoryUnit, idempotency, and required audit/event evidence.

**Creates:** One InventoryUnit and initial immutable state event, effective vehicle relationship, acquisition/appraisal/approval/commitment references, command/audit/domain/outbox/activity evidence, and downstream handoff task.

**Stops:** No authoritative accepted boundary, conflicting identity/ownership, existing open InventoryUnit, duplicate inventory number, inactive/unauthorized organization/location/owner, future/invalid effective time, missing source evidence, or failed atomic command.

### WF-AA-09 — Cancel, correct, reverse, or reconcile acquisition

**Trigger:** An opportunity/offer is cancelled, accepted evidence is corrected, an acquisition is disputed or reversed, a duplicate/conflict is found, or external/internal states disagree.

**Primary states:** `REVIEW_REQUIRED → RESOLUTION_PROPOSED → APPROVED_IF_REQUIRED → CANCELLED | CORRECTED | REVERSED | RECONCILED → VERIFIED → CLOSED`; alternate states `ESCALATED`, `REOPENED`.

**Required controls:** Current control/custody/payment/title state, source records and versions, reason, timing relative to acquisition/control/transport/receipt, compensating action, affected InventoryUnit/relationship/tasks, authority, external acknowledgement, accounting/title handoff, and closure verification.

**Creates:** Cancellation or linked corrective/reversal evidence, relationship/InventoryUnit state event where allowed, exception/reconciliation tasks, downstream cancellation notice, audit/domain/outbox events.

**Stops:** Destructive history change, cancellation after control where reversal is required, unreturned custody or unresolved title/payment state, missing authority, unsupported deletion of InventoryUnit, unbalanced external state, or unverified closure.

### WF-AA-10 — Handoff to acquisition validation and transport

**Trigger:** InventoryUnit creation succeeds with an approved retail, wholesale, transfer, return, or undecided intent.

**Primary states:** `HANDOFF_READY → ROUTED → ACCEPTED_BY_DOWNSTREAM`; alternate states `HANDOFF_REJECTED`, `PENDING_EVIDENCE`, `DUPLICATE_LINKED`, `EXCEPTION`.

**Required controls:** InventoryUnit/Vehicle, authoritative acquisition event, type/source/effective time/amount, identity confidence, owner, current/intended location, intended disposition, release/transport facts, blockers/holds, correlation, and downstream workflow idempotency.

**Creates:** Existing Acquisition & Transportation trigger or approved Wholesale/transfer/return route, accountable downstream task, handoff acknowledgement/rejection, audit and domain events.

**Stops:** Missing acquisition evidence, downstream duplicate/conflict, unknown owner/location/intent, unresolved identity/ownership issue, or unsupported route.

## 5. Advisory algorithm contract

Every acquisition/appraisal algorithm must have a versioned specification containing:

- objective, eligible population, exclusions, hard constraints, authoritative inputs and sources;
- units/currency, time window, retrieval/effective time, freshness, missing-data behavior, method/weights, and policy/model version;
- output value/range, confidence/uncertainty, reason codes, assumptions, sensitivity, alternatives, and expiry;
- permission and policy overlay, human decision point, allowed follow-up actions, prohibited autonomous actions, and override reason;
- baseline/backtest, quality thresholds, sparse-data behavior, monitoring, drift review, degraded mode, and kill switch;
- recommendation/decision/outcome linkage for accepted, rejected, overridden, expired, actual cost, turn, gross, and data quality.

Missing critical evidence produces `INSUFFICIENT_EVIDENCE`, not a favorable inferred score. A recommendation never grants approval or creates a commitment.

## 6. Acquisition and appraisal algorithm catalog

### ALG-AA-01 — Opportunity eligibility and triage

**Purpose:** Determine whether an opportunity is valid for research, appraisal, watch, decline, or duplicate review.

**Hard constraints:** Source legitimacy, organization/location scope, known purpose, minimum identity, no prohibited source, duplicate/open-InventoryUnit check, privacy/consent boundary, and unexpired opportunity.

**Outputs:** `APPRAISE`, `RESEARCH`, `WATCH`, `DECLINE_REVIEW`, `DUPLICATE_REVIEW`, or `INELIGIBLE`; reasons, missing evidence, owner, due/expiry, freshness, and confidence. It does not approve acquisition.

### ALG-AA-02 — Acquisition opportunity score

**Purpose:** Rank eligible purchase/trade opportunities by market fit, expected return, liquidity, and execution risk.

**Planning factors:** Market demand fit, expected gross quality, expected turn speed, historical store fit, merchandising appeal, data confidence, strategic need, recon risk, title/history risk, and capital-concentration risk.

**Outputs:** Score/band, pursue/inspect/watch/decline recommendation, maximum-bid-evaluation eligibility, top opportunity/risk reasons, confidence, freshness, and expiry. Safety/title/identity/permission rules can make a high-scoring opportunity ineligible.

### ALG-AA-03 — Market and portfolio fit

**Purpose:** Estimate whether a vehicle fits the authorized location’s inventory strategy.

**Inputs:** Historical sales by configuration/mileage/age/price band, local competitive supply, lead/search/appointment intent, days-to-sale and gross, season/location effects, category concentration, available space/capital, and data coverage.

**Outputs:** Fit score/band, demand and scarcity evidence, portfolio concentration impact, expected turn range, sparse-data warning, confidence, and alternatives. It cannot create a universal strategy or override approved portfolio policy.

### ALG-AA-04 — Comparable eligibility and weighting

**Purpose:** Build a defensible comparable set for acquisition valuation.

**Hard constraints:** Verifiable source, compatible vehicle/configuration, known transaction/listing type, valid currency/geography/time, acceptable recency, non-duplicate identity, and policy-allowed adjustment basis.

**Inputs:** Configuration, mileage, condition, geography, transaction/listing status, recency, seller/channel, days on market, price changes, and source reliability.

**Outputs:** Included/excluded comparables, weights, adjustments, source/recency, coverage gaps, sensitivity, and set confidence. Staff can challenge inclusion/exclusion with reason; changes create a new appraisal version.

### ALG-AA-05 — Appraisal evidence confidence

**Purpose:** Determine whether evidence is sufficient for an acquisition decision.

**Inputs:** VIN/configuration certainty, mileage verification, condition evidence, comparable quantity/quality/recency, title/history evidence, recon estimate quality, market freshness, source diversity, and unresolved conflicts.

**Outputs:** `HIGH`, `MEDIUM`, `LOW`, or `INSUFFICIENT`; missing/weak evidence, uncertainty drivers, allowed decision use, review/expiry time, and additional evidence needed. `INSUFFICIENT` blocks maximum-bid recommendation.

### ALG-AA-06 — Acquisition valuation range

**Purpose:** Estimate evidence-backed expected retail proceeds and acquisition value as ranges.

**Eligibility:** Appraisal evidence at or above approved confidence, supported comparable set, known material condition/title/recon facts, valid currency, and current time window.

**Inputs:** Weighted comparables, market/portfolio fit, configuration/mileage/condition adjustments, merchandising and price-band position, location/season, expected turn, selling friction, and uncertainty.

**Outputs:** Low/base/high expected retail and acquisition-value ranges, assumptions, comparable influence, sensitivity, confidence, freshness, and expiry. It does not set a bid or approve a purchase.

### ALG-AA-07 — Recon, title, and execution-cost risk

**Purpose:** Estimate pre-acquisition cost range and uncertainty without treating incomplete inspection as fact.

**Inputs:** Observed condition, inspection depth, known damage/history/title issues, standard labor/parts, similar historical outcomes, quotes, transport needs, merchandising/selling requirements, missing evidence, and variance history.

**Outputs:** Low/base/high cost range by component, risk reserve drivers, missing-inspection warning, confidence, likely approval sensitivity, and recommended additional evidence. It cannot authorize work or hide uncertainty.

### ALG-AA-08 — Expected turn and holding exposure

**Purpose:** Estimate time-to-sale and the cost of holding an acquired vehicle.

**Inputs:** Market/portfolio fit, historical turn by cohort/location, competitive supply, price band, seasonality, recon/title/merchandising duration, business calendar, capital/floorplan, insurance/storage, market movement, and uncertainty.

**Outputs:** Turn-time range, completion dependencies, holding-cost range/trajectory, confidence, assumptions, and sensitivity. Estimates remain distinct from posted accounting facts.

### ALG-AA-09 — Maximum all-in cost and maximum bid

**Purpose:** Recommend the highest supported commitment consistent with target return and risk policy.

**Planning calculation:**

```text
Expected Retail Proceeds
− Target Gross
− Expected Recon Cost
− Acquisition and Transport Fees
− Expected Holding Cost
− Title, Merchandising, and Selling Costs
− Risk Reserve
= Recommended Maximum All-In Cost

Recommended Maximum Bid
= Recommended Maximum All-In Cost
− Buyer Fees
− Transport
− Other Known Acquisition Costs
```

**Outputs:** Maximum all-in and bid ranges, component breakdown, appraisal/confidence and policy versions, sensitivity, risk reserve, hard ceilings, approval requirement, freshness, and expiry. Only an authorized person may approve or commit.

### ALG-AA-10 — Capital concentration and portfolio risk

**Purpose:** Expose whether the proposed acquisition creates excessive concentration or capacity pressure.

**Inputs:** Capital by location/category/price band, open commitments, current inventory age/exposure, category concentration, turn uncertainty, space/capacity, approved limits, and strategic need.

**Outputs:** Concentration band, incremental exposure, breached/approaching policy thresholds, affected cohorts, alternatives, confidence, and higher-approval need. It does not reject or approve a proposal by score alone.

### ALG-AA-11 — Source, counterparty, and transaction risk

**Purpose:** Surface acquisition-channel and counterparty risks requiring verification.

**Inputs:** Approved source status, identity/authority, history/reliability, title/ownership evidence, payment/fee/term structure, dispute/cancellation history, fraud indicators, data conflicts, and external verification status.

**Outputs:** `STANDARD`, `ENHANCED_REVIEW`, `HOLD`, or `INELIGIBLE`; risk reasons, missing verification, owner, required approval, and expiry. It must present factual indicators without unsupported accusation.

### ALG-AA-12 — Recommendation outcome and calibration

**Purpose:** Measure whether acquisition recommendations improve turn, gross, cost accuracy, and capital use.

**Retained evidence:** Recommendation/version, decision, override reason, approved and accepted amounts, actual fees/recon/holding/title/merchandising/selling cost, time to frontline/sale, gross, unwind/disposition outcome, and decision-time data quality.

**Outputs:** Performance versus approved baseline by source/location/cohort, forecast error, override outcomes, calibration/drift/data-quality alerts, and versioned change proposal. Parameters never self-modify; changes require analysis, approval, testing, and monitored rollout.

## 7. Roles, visibility, and authority

| Role | Default visibility | Typical preparation | Consequential authority requiring policy |
| --- | --- | --- | --- |
| Inventory buyer/specialist | Assigned opportunities, evidence, appraisals, comparables, recommendations | Research, prepare appraisal/proposal, submit authorized bid/offer | Purchase/trade/consignment approval, above-limit bid, exception, accepted commitment |
| Appraiser | Assigned evidence, condition, comparables, cost and valuation context | Create/revise appraisal and confidence evidence | Cannot self-approve restricted purchase; independent review where policy requires |
| Inventory/used-vehicle manager | Location opportunities, portfolio, approvals, exceptions | Approve within explicit amount, source, location, and separation-of-duties policy | Above-limit, cross-location, strategic exception, conflicted self-approval |
| Regional/general manager | Multi-location capital/concentration, higher-limit approvals, exceptions | Approve explicitly delegated higher-limit or policy-exception decisions | Undelegated accounting/title/legal authority |
| Accounting/title staff | Source, ownership/title, amounts, accepted commitment, handoff/reconciliation | Verify and accept/reject assigned commercial/title handoffs | Cannot invent appraisal, purchase approval, physical receipt, or custody |
| Auditor/executive | Governed aggregates and evidence drill-through | Review/export within field policy | No operating mutation solely from audit/reporting role |

The server remains authoritative for tenant, location, role/capability, field visibility, amount, delegation, policy version, anti-splitting, conflict of interest, and separation of duties.

## 8. UI and workflow mapping

| Surface | Workflows | Algorithms | Staff-visible outputs |
| --- | --- | --- | --- |
| Workflow Launcher — Add/Acquire Vehicle | WF-AA-08, 10 after approved upstream decision | ALG-AA-09 references only | Exact acquisition/approval references, boundary validation, InventoryUnit creation, downstream handoff |
| Inventory Lifecycle Overview | Summaries from WF-AA-01 through 10 | ALG-AA-02, 03, 08, 10, 12 | Opportunity/appraisal/approval counts, capital exposure, exceptions, freshness, decisions and outcomes |
| Priority work queue | Tasks/exceptions from all workflows | ALG-AA-01, 02, 05, 10, 11 | Tier, reason, owner, due/expiry, evidence gap, amount/exposure, next action, approval |
| Reviews & Approvals | WF-AA-03, 05, 06, 07, 09 | ALG-AA-05, 06, 07, 08, 09, 10, 11 | Exact proposal/version, evidence, valuation/cost/bid ranges, risks, sensitivity, authority and consequence preview |
| Vehicle/Opportunity detail | Full workflow history | All applicable algorithms | Source, evidence, comparables, appraisal versions, recommendation explanation, approvals, offers, acquisition and handoff lineage |
| Acquisition & Transport handoff | WF-AA-10 | No new scoring required | InventoryUnit, acquisition evidence, identity, owner, location/intent, blockers, accepted downstream state |

No new global Inventory Console destination is required. If an Acquisition & Appraisal deep workspace is later proposed, it requires separate product approval and must remain under Inventory Lifecycle.

## 9. Review, confirmation, approval, and completion behavior

### Review

Before a consequential action, show the exact vehicle/opportunity, source, acquisition type, appraisal/comparable/proposal/policy versions, amount/currency, expected retail/gross/cost/turn ranges, maximum all-in/bid, confidence, sensitivity, title/history/condition risks, portfolio impact, external dependency, and alternatives.

### Confirmation

The confirmation distinguishes:

- save draft or evidence;
- submit appraisal;
- request approval;
- place/submit a bid or offer under existing authority;
- accept/record commitment;
- confirm financial acquisition and create InventoryUnit;
- cancel, correct, reverse, reconcile, or route to exception.

Labels must never imply approval, purchase, payment, ownership, receipt, or custody before the corresponding evidence exists.

### Approval

Approval references the exact proposal and maximum amount. Material changes to vehicle, source, amount, fees, terms, condition, title/history, costs, confidence, intended location/use, or policy invalidate stale approval according to the approved materiality rules.

### Completion evidence

Completion returns command ID, resulting state/version, opportunity/appraisal/proposal/approval/offer references, accepted amount/currency, InventoryUnit/Vehicle IDs when created, tasks/exceptions, audit/domain events, external acknowledgement state, and downstream handoff result.

## 10. Record, task, approval, and event summary

| Action | Authoritative records | Typical work / approval | Required evidence events |
| --- | --- | --- | --- |
| Register opportunity | Opportunity/source/version and candidate identity | Research, identity, duplicate review | Registered, qualified, watched, declined, expired, cancelled |
| Complete evidence | Evidence package and Vehicle match/reconciliation | Inspection/research, identity/title/history review | Added, verified, conflicted, superseded, expired |
| Submit appraisal | Immutable appraisal/comparable/version and confidence | Review, revision, additional evidence | Drafted, submitted, reviewed, accepted/rejected, superseded, expired |
| Propose maximum bid | Recommendation/proposal/version and explanation | Preparation, sensitivity/risk review | Generated, acknowledged, revised, expired, dismissed |
| Decide approval | Immutable request and decision | Amount/four-eyes/source/exception approval | Requested, approved/rejected, returned, expired, cancelled |
| Submit/decide offer | Bid/offer/counter versions and external evidence | Variance/reapproval, counterparty review | Submitted, countered, accepted, rejected, expired, withdrawn |
| Create InventoryUnit | Acquisition record, relationship, InventoryUnit and state event | Duplicate/ownership/location exception | Acquisition confirmed, unit created/rejected/replayed, relationship effective |
| Cancel/correct/reverse | Linked cancellation/correction/reversal and reconciliation | Manager/accounting/title approval, recovery | Requested, approved/rejected, corrected, reversed, reconciled, verified |
| Handoff downstream | Handoff and downstream workflow reference | Transport/disposition/return decision | Routed, accepted/rejected, duplicate linked, exception opened |

## 11. Dependencies and honest capability labels

| Dependency | Planning position | Required UI behavior until verified live |
| --- | --- | --- |
| Appraisal and purchase-limit domain | Master milestone ledger identifies `VEH-031` and `VEH-032` as planned | Planned/manual/illustrative; no production appraisal, limit, or approval claim |
| Market, VIN/history, title and comparable sources | Provider/source/authority, licensing, coverage and freshness require approved integration contracts | Source/time/coverage visible; unavailable or manual evidence labeled honestly |
| Auction, seller, trade and consignment channels | Terms, identities, acknowledgements and failure behavior vary | Draft/request/pending/accepted/rejected/expired; never infer accepted commitment |
| DMS/accounting/payment | External systems remain authoritative only by explicit contract | Handoff pending/accepted/rejected/mismatched; never “posted” or “paid” from request alone |
| InventoryUnit foundation | Accepted ADR and foundation exist; acquisition boundary must remain evidence-bearing and rollout-gated | Unit created only after authoritative acquisition; no synthetic migration from Vehicle existence |
| Acquisition & Transportation catalog | Begins after authoritative acquisition and remains dealership-approval gated | Handoff pending/accepted/rejected; do not claim transport, receipt, custody or inspection complete |
| Recommendation algorithms | Enterprise planning baseline exists; live inputs, calibration and outcome proof remain to be verified | Advisory with version, evidence, freshness, confidence, sensitivity, alternatives and non-executing status |

## 12. Planning decisions required

- Approve opportunity sources/types, minimum intake evidence, duplicate behavior, expiry, privacy/consent, owner and SLA/escalation.
- Approve canonical identity match thresholds, physical verification, non-VIN exceptions, title/history source use, restricted fields, and fraud/tampering escalation language.
- Approve appraisal evidence, condition/inspection depth, comparable eligibility/adjustments, freshness, source diversity, valuation method, confidence bands, expiry, author/reviewer independence, and supersession.
- Approve target gross, recon/transport/fees/holding/title/merchandising/selling cost definitions, risk reserve, maximum all-in/bid formulas, sensitivity, hard ceilings, and sparse-data behavior.
- Approve roles, location/source authority, delegated integer-cent limits, anti-splitting, conflict-of-interest, separation of duties, emergency containment, approval expiry, and material reapproval triggers.
- Approve purchase, trade, consignment and transfer commitment evidence, external acknowledgement, counter/variance rules, cancellation/withdrawal, accepted terms, and manual/degraded behavior.
- Approve the exact financial-acquisition event, vehicle relationship, InventoryUnit creation data, inventory-number ownership, intended-disposition routing, and duplicate/replay behavior.
- Approve cancellation-before-control versus reversal-after-control, custody/title/payment/accounting implications, compensating events, InventoryUnit closure/re-entry, and verification.
- Approve algorithm baselines, weights/parameters, confidence thresholds, output expiry, backtests, monitoring, drift review, kill-switch owners, and outcome targets.
- Select the first acquisition pilot cohort, location, source/channel, systems, volume, training, manual/shadow operation, pause, rollback, and expansion gates.

## 13. Acceptance checklist

- [ ] Acquisition, appraisal, finance/title, inventory, security, integration and dealership policy owners approve the boundary distinctions.
- [ ] Representative auction purchase, trade, direct purchase, consignment, duplicate, low-confidence, counter, above-limit, cancellation, reversal and external-failure scenarios pass tabletop review.
- [ ] Every workflow has approved triggers, states, commands, evidence, stop conditions, tasks, approvals, expiry, cancellation, correction/reversal, events and handoffs.
- [ ] Every algorithm has approved eligibility, hard constraints, sources, versioned method/parameters, outputs, explanation, sensitivity, uncertainty, human boundary, fallback, monitoring and outcomes.
- [ ] Amount/currency, maximum-limit, cumulative exposure, anti-splitting, delegated authority and separation-of-duties contracts are approved.
- [ ] No opportunity, appraisal, bid, import or staff assertion can create an InventoryUnit without authoritative acquisition evidence.
- [ ] No recommendation can approve, submit or accept a commitment autonomously.
- [ ] External request, acknowledgement, failure, retry/replay and reconciliation states are explicit.
- [ ] The downstream handoff reuses the Acquisition & Transportation catalog without duplicating its workflow or claiming receipt/custody.
- [ ] All capabilities retain honest planned/manual/sandbox/live labels and no code activation is authorized by this catalog.

## 14. Change control

This catalog elaborates the approved Inventory Lifecycle plan and InventoryUnit boundary; it does not replace them. Material changes to vehicle identity, opportunity/inventory separation, appraisal evidence, maximum-bid economics, financial authority, acquisition commitment, InventoryUnit creation, cancellation/reversal, transport handoff, role boundaries, or advisory-only behavior require explicit product and dealership approval plus versioned updates to the governing documents.
