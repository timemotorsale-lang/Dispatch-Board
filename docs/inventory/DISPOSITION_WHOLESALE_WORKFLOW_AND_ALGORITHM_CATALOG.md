# Disposition & Wholesale Workflow and Algorithm Catalog

**Product:** Time Motor Sales Dispatch Board  
**Module:** Inventory Console → Inventory Lifecycle → Disposition & Wholesale  
**Version:** 0.1 Phase 2 planning baseline  
**Date:** 2026-07-17  
**Status:** Documentation and product review only; no implementation is authorized by this catalog  
**Planning branch:** `codex/disposition-wholesale-implementation-plan-phase-2`  
**Approved UX source:** [`DISPOSITION_WHOLESALE_WORKSPACE_UI_SOURCE_OF_TRUTH.md`](DISPOSITION_WHOLESALE_WORKSPACE_UI_SOURCE_OF_TRUTH.md)  
**Phase 1 plan:** [`DISPOSITION_WHOLESALE_WORKSPACE_IMPLEMENTATION_PLAN.md`](DISPOSITION_WHOLESALE_WORKSPACE_IMPLEMENTATION_PLAN.md)  
**Enterprise algorithm baseline:** [`INVENTORY_OPTIMIZATION_ALGORITHMS.md`](INVENTORY_OPTIMIZATION_ALGORITHMS.md)

## 1. Purpose and boundary

This catalog defines the workflow and decision contracts behind the approved Disposition & Wholesale workspace. It connects staff actions, authoritative records, tasks, approvals, events, external acknowledgements, recommendations, exceptions, and reconciliation without changing the approved navigation or visual design.

The catalog separates three kinds of logic:

1. **Hard controls** enforce identity, ownership, lifecycle, location/custody, title/release, compliance, evidence, financial, permission, and policy rules. A score cannot override them.
2. **Workflow orchestration** moves versioned records through explicit, attributable states and creates the next task, approval, event, handoff, or exception.
3. **Advisory algorithms** rank or recommend already-eligible choices. Authorized staff retain every consequential decision.

No recommendation may autonomously reprice a vehicle, set a reserve, activate a channel, publish a listing, accept or counter an offer, transfer or release custody, complete a sale, write down value, post a financial handoff, or declare settlement.

## 2. Shared contract for every workflow

Every Wholesale workflow must define and expose:

- organization, location, actor, role/capability, delegated authority, amount limit, and correlation identity;
- trigger, entry criteria, current state/version, valid commands, next state, exit criteria, expiry, cancellation, reopen, and reversal/unwind path;
- canonical Vehicle and InventoryUnit, plus linked appraisal, proposal, activation, offer, transfer/sale, title/release, handoff, and settlement records where applicable;
- required evidence, source, effective/retrieval time, freshness, confidence, validation, stop conditions, warnings, and recoverable conflicts;
- exact amount and currency in integer cents, fees, expected/actual distinction, policy version, approval version, separation of duties, rejection, and resubmission behavior;
- idempotency key, request identity, optimistic version, immutable versions, audit and domain-event evidence;
- task owner, SLA/due time, escalation owner, notification rule, exception reason, and closure verification;
- connector/manual execution mode, external reference, acknowledgement, retry/replay, reconciliation, degraded state, and honest capability label;
- completion summary containing command ID, resulting state/version, affected records, tasks/approvals, events, acknowledgement status, and unresolved exceptions.

Submission is not completion. A request to publish, sell, transfer, release, hand off, or settle remains pending until the required authoritative evidence exists.

## 3. Phase-one workflow catalog

### WF-DWH-01 — Identify and govern disposition candidates

**Trigger:** An approved age/exposure policy, lifecycle condition, manager referral, location strategy, or advisory recommendation makes a vehicle eligible for disposition review.

**Primary states:** `IDENTIFIED → PENDING_REVIEW → ACCEPTED → APPRAISAL_REQUIRED`; alternate states `DISMISSED`, `DEFERRED`, `EXCEPTION`, `REOPENED`, `CANCELLED`.

**Required controls:** Canonical Vehicle/InventoryUnit, inventory ownership and lifecycle state, location/custody, title/release and active holds, cost/exposure availability, policy/recommendation version, evidence freshness, reason codes, duplicate active-review prevention, owner, authority, and optimistic version.

**Creates:** Candidate-review record and evidence snapshot, assignment/evidence task, accept/dismiss/defer decision, follow-up or exception task, audit and domain events.

**Stops:** Missing or duplicate identity, no inventory ownership, invalid lifecycle state, unknown location/custody, unresolved title/release facts, missing cost/freshness, active sale/delivery conflict, or unauthorized scope.

### WF-DWH-02 — Create, review, and supersede appraisal

**Trigger:** An accepted candidate requires a current, decision-ready valuation evidence package.

**Primary states:** `DRAFT → EVIDENCE_INCOMPLETE → READY_FOR_REVIEW → SUBMITTED → REVIEWED → APPROVED | REVISION_REQUIRED`; terminal/alternate states `SUPERSEDED`, `EXPIRED`, `REJECTED`, `CANCELLED`.

**Required controls:** Vehicle identity/configuration, mileage and condition evidence, title/history, recon and committed-cost context, comparable eligibility and recency, source lineage, amount/currency, valuation range, assumptions, confidence band, author/reviewer, policy/freshness limits, immutable version, and expiry.

**Creates:** Appraisal version, evidence/comparable links, confidence result, evidence/review/reappraisal task, decision history, audit and domain events.

**Stops:** Insufficient identity/trim/mileage/condition/title evidence, unsupported or stale comparable set, inconsistent currency/amount, unknown material cost, missing author, below-policy confidence, stale version, or self-review where policy bars it.

### WF-DWH-03 — Compare channels and propose price or reserve

**Trigger:** A reviewable appraisal and current inventory facts support disposition alternatives.

**Primary states:** `DRAFT → COMPARING → READY → SUBMITTED → APPROVED | REJECTED | REVISION_REQUIRED | EXPIRED | CANCELLED`.

**Required controls:** Eligible retail, transfer, dealer-network, auction, and other approved channels; appraisal version; expected recovery range; time-to-sale; fees/net; transport; holding exposure; recon/title risk; market/location fit; gross floor; price/reserve; evidence freshness; selected/rejected alternatives; and policy version.

**Creates:** Versioned channel/price proposal, comparison and recommendation snapshot, price/reserve/channel/transfer approval, decision record, audit and domain events.

**Stops:** Unsupported/unavailable channel, missing or stale appraisal/fees/market evidence, gross-floor or policy conflict, unresolved hold/title/release condition, missing authority, material proposal change, or no eligible alternative.

### WF-DWH-04 — Approve consequential proposal

**Trigger:** A complete proposal requires price, reserve, channel, transfer, activation, below-reserve offer, release, sale, write-down, or settlement authority.

**Primary states:** `REQUESTED → PENDING → APPROVED | REJECTED | RETURNED_FOR_REVISION | EXPIRED | CANCELLED`; a materially changed proposal creates a new approval version.

**Required controls:** Exact proposal/evidence/policy version, action, amount/currency, requester, eligible approver, tenant/location scope, delegated limit, separation of duties, required evidence, expiry, decision reason, and optimistic version.

**Creates:** Immutable approval request and decision, approver task/escalation, command eligibility result, audit and domain events.

**Stops:** Self-approval where barred, exceeded or missing limit, stale/revised proposal, expired evidence, unresolved hold/gate, ineligible role/location, missing reason/evidence, or duplicate final decision.

### WF-DWH-05 — Activate listing, auction, network, or transfer channel

**Trigger:** A current approved channel/price/reserve proposal and all channel-readiness gates exist.

**Primary states:** `READY → REQUESTED → PENDING_ACKNOWLEDGEMENT → ACTIVE`; alternate states `REJECTED`, `FAILED_RETRYABLE`, `FAILED_FINAL`, `PAUSED`, `CANCEL_PENDING`, `CANCELLED`, `EXPIRED`.

**Required controls:** Exact approved proposal, channel eligibility, listing/auction package, vehicle/title/release status, price/reserve, fees, media/data readiness, duplicate active-channel check, connector/manual mode, idempotency, external identity, acknowledgement semantics, retry/cancel behavior, and correlation.

**Creates:** Activation request/version, external-reference placeholder, acknowledgement/publication evidence, retry/cancel/exception task, audit/domain/outbox events.

**Stops:** Expired/stale approval, incomplete channel package, active hold, unsupported or unavailable connector without approved manual path, duplicate publication, external rejection, uncertain acknowledgement, or material proposal drift.

### WF-DWH-06 — Intake and decide offers or bids

**Trigger:** An active channel returns an offer/bid or authorized staff record a verifiable manual offer.

**Primary states:** `RECEIVED → VERIFIED → UNDER_REVIEW → COUNTERED | ACCEPTED | REJECTED | EXPIRED | WITHDRAWN`; counter response creates an immutable successor version and returns to review.

**Required controls:** Channel/source and external identity, vehicle/activation link, immutable version, amount/currency, fees and net recovery, terms/contingencies, expiry, counter history, duplicate/fraud indicators, reserve/gross-floor variance, title/release readiness, authority, and optimistic version.

**Creates:** Offer/bid version, normalized value comparison, review/counter/approval task, decision evidence, external response request/acknowledgement, audit and domain events.

**Stops:** Unverifiable source/identity, duplicate offer, stale/expired/withdrawn offer, inconsistent terms, unsupported currency, suspected fraud, below-reserve or above-limit decision without approval, stale activation/proposal, or active release hold.

### WF-DWH-07 — Complete sale or transfer and control release

**Trigger:** A current accepted offer or approved transfer exists and completion gates are ready.

**Primary states:** `AUTHORIZED → COMPLETION_PENDING → RELEASE_PENDING → RELEASED → SOLD | TRANSFER_IN_TRANSIT → TRANSFER_RECEIVED → HANDOFF_PENDING → COMPLETED`; alternate states `HOLD`, `REJECTED`, `FAILED`, `UNWIND_PENDING`, `REVERSED`.

**Required controls:** Accepted offer/approved transfer version, buyer/destination identity, payment/reference boundary, title/release, ownership, custody/location, keys/documents, transport and receiving, inventory state transition, downstream handoff, duplicate completion prevention, authority, reversal/unwind policy, and correlation.

**Creates:** Sale/transfer aggregate, inventory lifecycle and custody/location events, title/release evidence, transport/receiving tasks, downstream handoff, reversal/unwind linkage, audit/domain/outbox events.

**Stops:** Missing or rejected payment/reference evidence, title/release/ownership hold, invalid buyer/destination, missing custody or transport/receipt evidence, stale offer/approval, duplicate sale/transfer, downstream rejection, or unsupported destructive reversal.

### WF-DWH-08 — Settle and reconcile expected versus actual outcome

**Trigger:** Sale/transfer completion evidence and a financial/DMS/title handoff package are available.

**Primary states:** `EXPECTED → PACKAGE_READY → SUBMITTED → ACKNOWLEDGED → MATCHED → RECONCILED → CLOSED`; alternate states `REJECTED`, `MISMATCH`, `RESOLUTION_PENDING`, `REOPENED`, `WRITE_DOWN_PENDING`, `FAILED_RETRYABLE`.

**Required controls:** Expected and actual proceeds, fees, credits and net; currency; sale/transfer and release references; external IDs/states; payment/accounting/DMS acknowledgement; materiality tolerance; mismatch reason and owner; correction evidence; reopen/write-down authority; and closure verification.

**Creates:** Reconciliation record/version, external handoff and acknowledgement, mismatch/resolution/approval task, expected/actual variance evidence, close/reopen events, audit/domain/outbox events.

**Stops:** Submission without acknowledgement, missing external identity, unverified actual amounts, material unexplained mismatch, rejected handoff, unresolved fee/credit/title state, stale approval, or unverified closure.

### WF-DWH-09 — Manage operational exceptions

**Trigger:** Any workflow detects stale, unavailable, duplicate, conflicted, rejected, delayed, unauthorized, fraudulent, held, mismatched, or out-of-balance evidence.

**Primary states:** `OPEN → TRIAGED → ASSIGNED → IN_REVIEW → RESOLUTION_PROPOSED → APPROVED_IF_REQUIRED → RESOLVED → VERIFIED → CLOSED`; alternate states `ESCALATED`, `REOPENED`, `DUPLICATE_LINKED`.

**Required controls:** Source workflow/record/event, severity and reason code, vehicle/customer/financial/operational impact, owner and SLA, evidence, safe retry/replay or compensating command, approval, reconciliation result, and independent closure verification where required.

**Creates:** Exception record, accountable task, escalation/approval, retry/replay/corrective reference, reconciliation evidence, audit and domain events.

**Stops:** Missing owner, unsupported correction, hidden history change, unresolved custody/title/amount/state imbalance, failed replay, stale approval, fraud concern without review, or unverified closure.

## 4. Advisory algorithm contract

Every algorithm must have a versioned specification containing:

- decision objective, eligible population, exclusions, hard constraints, inputs, authoritative sources, and system-of-record boundaries;
- freshness, missing-data behavior, units/currency, time zone/window, calculation/model/policy version, and effective dates;
- deterministic rules or approved method, parameters/weights, outputs, ranges, confidence/uncertainty, reason codes, and alternatives;
- permission/policy overlay, human decision point, allowed follow-up actions, prohibited autonomous actions, and override reason;
- baseline/backtest, quality and calibration thresholds, monitoring, drift/staleness review, failure/degraded behavior, and kill switch;
- recommendation/decision/outcome linkage so accepted, rejected, overridden, expired, and actual results can be measured.

An algorithm ranks only choices that pass hard eligibility. Missing critical evidence produces `INSUFFICIENT_EVIDENCE`, `STALE`, `UNAVAILABLE`, or `POLICY_BLOCKED`, not a favorable inferred score.

## 5. Wholesale algorithm catalog

### ALG-DWH-01 — Candidate eligibility

**Purpose:** Determine whether a governed InventoryUnit may enter disposition review.

**Hard constraints:** Canonical identity, dealership inventory ownership, eligible lifecycle state, known location/custody, title/release/hold visibility, cost/exposure availability, active sale/delivery/transfer conflicts, policy scope, and evidence freshness.

**Outputs:** `ELIGIBLE`, `REVIEW_REQUIRED`, or `INELIGIBLE`; triggering reason, failed gates, source/policy version, freshness, next evidence needed, and review expiry. It does not decide disposition.

### ALG-DWH-02 — Disposition-review priority

**Purpose:** Order eligible candidates for accountable manager review.

**Hard priority tiers:** Safety/title/compliance or custody exposure; active customer/delivery conflict; critical capital or policy breach; lifecycle target breach; routine strategy review.

**Ranking inputs within a tier:** Stage and total age, carrying-cost exposure, downstream revenue impact, blocker severity, ownership/update risk, remaining retail opportunity, wholesale recovery, location fit, and evidence confidence.

**Outputs:** Priority tier/score, top reason codes, accountable role, due/escalation time, affected exposure, recommendation freshness, and next action. Manual reprioritization requires reason.

### ALG-DWH-03 — Carrying-cost and holding-exposure risk

**Purpose:** Make the financial and operational cost of continued holding visible.

**Inputs:** Capital/floorplan basis and rate, insurance, storage, depreciation/market movement, recon commitments, title exposure, merchandising/selling cost, opportunity cost, inventory age, stage age, and approved accounting assumptions.

**Outputs:** Current exposure, daily/period trajectory, expected exposure range at decision horizons, component breakdown, source/assumption version, confidence, missing evidence, and thresholds crossed. Calculated exposure is distinguished from posted accounting fact.

### ALG-DWH-04 — Appraisal evidence quality and confidence

**Purpose:** Determine whether appraisal evidence supports a disposition decision.

**Inputs:** VIN/configuration certainty, mileage verification, condition and photo/inspection evidence, title/history, recon estimate and variance, comparable quantity/quality/recency, market-data freshness, source diversity, and unexplained conflicts.

**Outputs:** `HIGH`, `MEDIUM`, `LOW`, or `INSUFFICIENT`; missing/weak evidence, comparable-set quality, uncertainty drivers, expiry/review time, and allowed decision use. `INSUFFICIENT` blocks price/reserve and valuation claims under policy.

### ALG-DWH-05 — Valuation and recovery range

**Purpose:** Estimate an evidence-backed recovery range rather than a falsely precise amount.

**Eligibility:** Current appraisal evidence above the approved confidence threshold, supported comparable/channel evidence, known material condition/recon/title facts, and valid currency/time window.

**Inputs:** Comparable transactions/listings with adjustments, condition/mileage/configuration, current market position, historical store/location performance, recon/title/selling costs, channel fees, transport, expected time, and uncertainty reserve.

**Outputs:** Low/base/high recovery range by eligible channel, assumptions, comparable influence, confidence, freshness, sensitivity drivers, and insufficient-evidence warnings. It does not set price or reserve.

### ALG-DWH-06 — Retail-versus-transfer-versus-wholesale comparison

**Purpose:** Compare continued retail holding with transfer, dealer network, auction, wholesale, or another approved exit.

**Hard constraints:** Channel eligibility, title/release/ownership/custody, transfer source/destination protection, approved partners, legal/policy restrictions, required evidence, and feasible time horizon.

**Planning comparison:** Expected net recovery and probability, time-to-completion, holding cost, fees/transport, remaining retail gross, customer-intent strength, location fit, recon/title risk, capital/space opportunity cost, and uncertainty.

**Outputs:** Ranked alternatives, expected net ranges, time ranges, risks, source-location impact, confidence, assumptions, rejected reasons, and decision expiry. Authorized review is always required.

### ALG-DWH-07 — Channel selection recommendation

**Purpose:** Recommend the best eligible execution channel for the approved disposition strategy.

**Inputs:** Eligible channel reach and buyer fit, expected recovery/net, historical sale probability and time, fees, reserve mechanics, transport, operational effort, reliability, dispute/fraud risk, data/publication readiness, and connector availability.

**Outputs:** Ranked channels, component factors, expected net/time ranges, readiness gaps, external dependency status, confidence, and alternatives. It cannot activate a channel.

### ALG-DWH-08 — Price and reserve recommendation

**Purpose:** Recommend a reviewable price or reserve consistent with evidence, channel, gross floor, exposure, and strategy.

**Hard constraints:** Approved appraisal/version, minimum evidence confidence, channel eligibility, gross-floor/write-down policy, title/release readiness, amount authority, and current market/fee data.

**Inputs:** Valuation range, channel mechanics, expected fees/net, market position, lead/VDP/appointment and offer history, comparable movement, carrying cost, seasonality, merchandising completeness, target time, and approved policy parameters.

**Outputs:** Recommended price/reserve range, expected net and time, sensitivity, confidence, rationale, alternatives, warnings, approval requirement, and expiry. It never publishes or changes price autonomously.

### ALG-DWH-09 — Offer/bid normalization and net-value comparison

**Purpose:** Convert valid offers and bids into comparable economic and operational terms.

**Hard constraints:** Verified source/identity, active vehicle/channel, valid currency, unexpired immutable offer version, known mandatory terms/contingencies, and duplicate/fraud screening.

**Inputs:** Gross amount, buyer/auction/channel fees, transport, credits/charges, timing, payment/release conditions, contingencies, reserve variance, counter history, reliability, and settlement risk.

**Outputs:** Normalized net value/range, term differences, expiry, confidence, risk flags, comparable rank, and non-comparable reason. It does not accept or counter an offer.

### ALG-DWH-10 — Accept, counter, reject, or wait recommendation

**Purpose:** Support an authorized decision on a verified offer without hiding policy or uncertainty.

**Hard constraints:** Offer validity, title/release and inventory availability, reserve/gross-floor policy, amount authority, separation of duties, buyer/source verification, and completion feasibility.

**Inputs:** Normalized net, valuation/recovery range, alternative offers/channels, remaining retail opportunity, expected time and exposure, offer expiry, buyer/channel reliability, counter probability, and uncertainty.

**Outputs:** `ACCEPT_REVIEW`, `COUNTER_REVIEW`, `REJECT_REVIEW`, `WAIT`, or `INSUFFICIENT_EVIDENCE`; proposed counter range when allowed, reasons, alternatives, risk, confidence, approval needed, and decision expiry. Staff decide and record rationale.

### ALG-DWH-11 — Expected recovery and time-to-completion

**Purpose:** Estimate outcome range and timing from current channel state through sale/transfer and settlement.

**Inputs:** Channel and offer state, historical conversion/time, buyer/partner reliability, title/release readiness, transport, business calendar, payment/handoff timing, exception history, fees/credits, integration status, and remaining dependencies.

**Outputs:** Recovery and completion-date ranges, confidence, critical dependencies, probability bands, escalation time, and expected exposure until completion. A range is required where evidence does not support a precise value or date.

### ALG-DWH-12 — Activation, offer, release, and settlement exception priority

**Purpose:** Order Wholesale exceptions by safety, customer, custody/title, financial, deadline, and operational impact.

**Hard tiers:** Compliance/title/release or fraud hold; custody/ownership conflict; payment or material settlement mismatch; accepted-offer/transfer deadline; activation/offer expiry; connector/reconciliation failure; routine data quality.

**Ranking inputs:** Severity, amount/value at risk, deadline/SLA, affected vehicle/channel/buyer, downstream blockage, retryability, missing owner, evidence confidence, and recurrence.

**Outputs:** Tier/score, reason codes, owner, due/escalation time, affected records/value, recommended verification/resolution, freshness, and confidence. It never resolves an exception automatically.

### ALG-DWH-13 — Settlement mismatch and reconciliation risk

**Purpose:** Detect and prioritize differences between authorized, expected, externally acknowledged, and actual outcomes.

**Inputs:** Accepted offer/transfer, expected and actual proceeds, fees and credits, payment/reference, title/release, custody/inventory state, external IDs/states, DMS/accounting acknowledgement, timing, tolerance policy, and duplicate/missing records.

**Outputs:** `MATCHED`, `WITHIN_TOLERANCE`, `MATERIAL_MISMATCH`, `MISSING_EVIDENCE`, or `CONFLICT`; component differences, amount/value at risk, likely source, owner, verification steps, confidence, and reopen/write-down approval need. It does not post corrections.

### ALG-DWH-14 — Recommendation outcome and calibration

**Purpose:** Determine whether Wholesale recommendations improve recovery, cycle time, exposure, and reconciliation quality.

**Retained evidence:** Recommendation/version, accepted/rejected/overridden/expired state, override reason, actual actor/action/time, price/reserve/channel, offer outcome, gross/net recovery, fees, days to completion, exposure, exception/reconciliation result, and decision-time data quality.

**Outputs:** Performance versus approved baseline by location/channel/cohort, calibration gaps, drift/data-quality alerts, and versioned change proposal. Weights and thresholds never self-modify in production; changes require analysis, approval, testing, and monitored rollout.

## 6. UI, workflow, and algorithm mapping

| Workspace destination | Primary workflows | Primary algorithms | Staff-visible outputs |
| --- | --- | --- | --- |
| Overview | WF-DWH-01 through WF-DWH-09 summaries | ALG-DWH-02, 03, 11, 12, 13 | Milestones, prioritized work, exposure/recovery, approvals, exceptions, freshness, and recommendation explanations |
| Candidates | WF-DWH-01 | ALG-DWH-01, 02, 03 | Eligibility, reason codes, priority, age/exposure, failed gates, owner, due time, and review action |
| Appraisals | WF-DWH-02 | ALG-DWH-04, 05 | Evidence quality, valuation range, confidence, comparables, missing evidence, versions, and expiry |
| Channels & Listings | WF-DWH-03, 04, 05 | ALG-DWH-06, 07, 08, 11 | Channel alternatives, price/reserve, fees/net, recovery/time ranges, approval, readiness, and acknowledgement |
| Offers & Bids | WF-DWH-06 | ALG-DWH-09, 10, 11 | Normalized net, terms, expiry, comparison, accept/counter/reject support, confidence, and approval need |
| Settlements | WF-DWH-07, 08 | ALG-DWH-11, 13 | Release/custody/handoff state, expected/actual amounts, acknowledgements, mismatches, owner, and reconciliation |
| Exceptions | WF-DWH-09 and exceptions from all workflows | ALG-DWH-12, 13, 14 | Severity, value at risk, failed evidence, owner/SLA, retry/replay, corrective path, verification, and recurrence |

No workflow or algorithm requires a new global or local navigation destination.

## 7. Tasks, approvals, and notification behavior

- Create a task only when accountable human work exists; status display alone does not justify a duplicate task.
- One open task represents the same vehicle, record, action, owner, and reason unless policy explicitly requires independent work.
- Task priority inherits hard safety, title/release, custody, fraud, financial, customer, and deadline tiers before advisory scores.
- Approval tasks reference the exact proposal/evidence/policy version, amount/currency, intended action, requester, approver eligibility, due/expiry time, and effects of approval.
- Notifications follow role, ownership, severity, SLA, channel/offer expiry, and escalation policy. They supplement the workspace and never become authoritative state.
- Completion, rejection, return for revision, expiry, cancellation, reassignment, escalation, reopening, reversal, and verification remain attributable and visible.

## 8. Recommendation presentation contract

Each recommendation shown in the UI must answer:

1. What is recommended, for which vehicle, and for how long is it valid?
2. Why is the vehicle or alternative eligible?
3. Which hard gates and policies were applied?
4. Which alternatives were compared or rejected, and why?
5. Which facts, sources, time windows, and freshness support the recommendation?
6. What price/reserve, fees/net, recovery, exposure, timing, custody/title, or settlement effect is expected?
7. What uncertainty, sensitivity, or missing evidence remains?
8. Which role may decide, what approval follows, and what will be recorded?
9. What external acknowledgement is required before activation or completion can be claimed?
10. How will the decision and actual outcome be measured?

The UI must distinguish `RECOMMENDED`, `REVIEW_REQUIRED`, `INSUFFICIENT_EVIDENCE`, `STALE`, `UNAVAILABLE`, `POLICY_BLOCKED`, `APPROVAL_REQUIRED`, and `ACKNOWLEDGEMENT_PENDING` states.

## 9. Records, tasks, approvals, and event summary

| Workflow action | Authoritative records | Typical tasks / approvals | Required evidence events |
| --- | --- | --- | --- |
| Start candidate review | Candidate review and policy/evidence snapshot linked to InventoryUnit | Evidence, owner review, defer follow-up | Identified, accepted, dismissed, deferred, reopened, assigned |
| Submit appraisal | Immutable appraisal version and evidence/comparables | Evidence completion, review, reappraisal | Drafted, submitted, reviewed, superseded, expired |
| Propose channel/price | Versioned alternatives, price/reserve and recommendation decision | Price/reserve, channel, transfer, exception approval | Proposed, submitted, approved/rejected, revised, expired |
| Activate channel | Activation version, external/manual evidence and acknowledgement | Activation, retry/cancel, publication exception | Requested, acknowledged, active/published, rejected, failed, cancelled |
| Review offer/bid | Immutable offer versions, normalized comparison and decision | Counter, below-reserve/above-limit, fraud review, acceptance | Received, verified, countered, accepted, rejected, expired, withdrawn |
| Complete sale/transfer | Sale/transfer, inventory/custody/location, release/title, transport/receiving and handoff | Release/title, transport/receipt, rejection, unwind/reversal | Authorized, released, sold/transferred, received, handed off, reversed |
| Reconcile settlement | Expected/actual values, external references/states and mismatch resolution | Acknowledgement, mismatch, write-down, reopen | Submitted, acknowledged, rejected, mismatched, reconciled, reopened, closed |
| Resolve exception | Source-linked exception, evidence and corrective references | Triage, escalation, approval, retry/replay, verification | Opened, assigned, escalated, resolved, verified, reopened |

## 10. Phase 2 approval decisions

Before this catalog becomes an approved implementation contract, product, Wholesale operations, finance/title, and governance must confirm:

- candidate eligibility reasons, age/exposure thresholds, priority tiers, dismissal/defer/reopen rules, owner, and SLA/escalation policy;
- appraisal evidence standards, comparable eligibility/adjustments, source diversity, freshness, confidence bands, expiry, reviewer independence, and insufficient-evidence behavior;
- channel eligibility, fee/net definitions, transfer protection, time/recovery methods, approved partners, unavailable-channel behavior, and first pilot channels;
- gross floor, price/reserve range, override, write-down, amount limits, and separation-of-duties policy;
- activation package, manual/sandbox/live labels, external acknowledgement, duplicate prevention, retry/cancel, and reconciliation semantics;
- offer/bid source verification, normalization, terms/contingencies, duplicate/fraud indicators, expiry/counter rules, below-reserve approval, and response acknowledgement;
- sale/transfer, title/release, custody, payment/reference, transport/receiving, downstream handoff, reversal/unwind, and completion gates;
- expected/actual settlement fields, materiality tolerances, mismatch reason/owner, write-down, reopen, verification, and closure policy;
- algorithm baselines, approved weights/parameters, confidence and insufficient-evidence thresholds, output expiry, monitoring, review cadence, and kill-switch owners;
- outcome targets for recovery, gross/net variance, time to review/appraisal/activation/offer/completion/settlement, holding exposure, exception rate, and reconciliation accuracy.

## 11. Phase 2 acceptance checklist

- [ ] Wholesale staff validate each workflow against representative aged-retail, dealer-network, auction, inter-location transfer, manual offer, failed activation, title hold, unwind, and settlement-mismatch scenarios.
- [ ] Product approves triggers, states, commands, stop conditions, expiry, cancellation, reopen/reversal, tasks, approvals, events, acknowledgements, and exception ownership.
- [ ] Security/governance approves role, location, field visibility, delegated amount limits, overrides, exports, and separation-of-duties boundaries.
- [ ] Data/domain owners approve authoritative records, lifecycle/custody/title invariants, immutable versions, amounts/currency, freshness, retention, and audit evidence.
- [ ] Finance/title approves gross/net, fees/credits, payment/reference, title/release, write-down, expected/actual, mismatch, settlement, reopen, and closure semantics.
- [ ] Each algorithm has approved eligibility, hard constraints, sources, versioned method/parameters, outputs, explanation, uncertainty, human boundary, fallback, monitoring, and outcome measurement.
- [ ] Design confirms every state and recommendation fits the approved seven local destinations and responsive patterns.
- [ ] Integration owners confirm external identities, acknowledgements, manual/degraded behavior, retry/replay, reconciliation, and honest capability labels.
- [ ] No planned capability is represented as deployed, published, sold, released, posted, or settled without evidence.

## 12. Change control

This catalog elaborates the approved Disposition & Wholesale source of truth; it does not replace it. Material changes to navigation, milestones, role boundaries, approval guardrails, identity/ownership/custody/title/financial controls, external acknowledgement semantics, or the advisory-only boundary require explicit product approval and versioned updates to the approved source document and image.
