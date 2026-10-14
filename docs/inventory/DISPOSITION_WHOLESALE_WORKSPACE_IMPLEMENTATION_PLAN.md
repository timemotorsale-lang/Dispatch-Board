# Disposition & Wholesale Workspace — Implementation Plan

**Product:** Time Motor Sales Dispatch Board  
**Module:** Inventory Console → Inventory Lifecycle → Disposition & Wholesale  
**Version:** 0.1 planning baseline  
**Date:** 2026-07-17  
**Status:** Documentation and planning only; no application implementation is authorized by this document  
**Planning branch:** `codex/disposition-wholesale-implementation-plan`  
**Approved UX source:** [`DISPOSITION_WHOLESALE_WORKSPACE_UI_SOURCE_OF_TRUTH.md`](DISPOSITION_WHOLESALE_WORKSPACE_UI_SOURCE_OF_TRUTH.md)  
**Enterprise algorithm baseline:** [`INVENTORY_OPTIMIZATION_ALGORITHMS.md`](INVENTORY_OPTIMIZATION_ALGORITHMS.md)
**Phase 2 workflow and algorithm catalog:** [`DISPOSITION_WHOLESALE_WORKFLOW_AND_ALGORITHM_CATALOG.md`](DISPOSITION_WHOLESALE_WORKFLOW_AND_ALGORITHM_CATALOG.md)

## 1. Purpose

This plan converts the approved Disposition & Wholesale workspace into reviewable delivery slices without changing its approved visual, navigation, workflow, or human-approval contract. It defines what must be designed, validated, and accepted before implementation begins.

The workspace remains a deeper operational surface opened from **Inventory Lifecycle → Open Disposition & Wholesale**. It does not become an additional Inventory Console global-navigation destination.

## 2. Planning guardrails

- The approved image, seven local destinations, eight operational milestones, role boundaries, and approval controls remain binding.
- Existing repository capabilities may be reused only after their live records, permissions, states, data quality, and integration behavior are verified.
- Repository-complete logic is not described as deployed, externally connected, or production-ready without environment evidence.
- Recommendations remain advisory. They cannot autonomously change price or reserve, activate a channel, transfer or release a vehicle, accept an offer, complete a sale, write down value, or claim settlement.
- Every consequential decision references an exact proposal, evidence snapshot, policy version, amount, actor, and authorization outcome.
- External requests are not completion evidence. Listing publication, auction activation, payment, title/release, DMS/accounting handoff, and settlement require authoritative acknowledgement or an explicit pending/failure state.
- Holds, title/release gates, ownership, location, custody, identity, and separation-of-duties rules outrank every score or recommendation.
- Financial amounts use integer cents, explicit currency, source, effective time, expected/actual distinction, and reconciliation status.

## 3. Phase-one outcome

Authorized staff can move a governed vehicle from disposition review through settlement and reconciliation while always seeing:

- candidate reason, lifecycle state, age, exposure, owner, location, title/release readiness, and freshness;
- appraisal evidence, comparables, assumptions, valuation range, confidence, and version history;
- retail, transfer, dealer-network, auction, or other approved channel alternatives with fees, timing, risk, and expected recovery;
- proposed price/reserve, approval need, policy version, dollar-limit and separation-of-duties behavior;
- listing or channel activation acknowledgement, offer/bid versions, expiry, counter history, and decision evidence;
- custody, release, transport, inventory-state, title, payment/reference, and downstream handoff gates;
- expected versus actual proceeds, fees, credits, external IDs, mismatches, owners, and reconciliation status;
- stale, partial, unavailable, denied, conflicted, rejected, retryable, and manual/degraded states without false completion claims.

## 4. Delivery sequence

The identifiers below retain the approved `DWH-01` through `DWH-12` contract. Each slice must be independently reviewable and must not imply that a later slice or external integration is available.

| Wave | Approved slice | Planning deliverable | Exit condition before implementation |
| --- | --- | --- | --- |
| A — Entry and orientation | DWH-01 | Route ownership, entry/return context, shell, seven local destinations, URL state, filters, saved views, and responsive/non-happy states | Navigation and responsive wireframes approved; no eighth global tab |
| A — Candidate truth | DWH-02 | Candidate definition, governed population, reason codes, aging/exposure inputs, freshness, queue columns, counts, drill-through, and exclusions | Every inclusion/exclusion and count reconciles to authoritative records and policy |
| B — Review control | DWH-03 | Accept, dismiss, defer, reopen, assign, reason/evidence, task, event, version, conflict, and audit behavior | Candidate-review state model, permissions, idempotency, optimistic concurrency, and reversal/reopen behavior approved |
| B — Appraisal evidence | DWH-04 | Evidence intake, comparables, condition, cost/exposure, assumptions, valuation range, confidence, versions, review, and expiry | No production valuation claim without authoritative sources, freshness, decision history, and insufficient-evidence behavior |
| C — Recommendation workbench | DWH-05 | Explainable aging, transfer, pricing-review, and disposition advice with alternatives and outcome tracking | Every recommendation exposes sources, freshness, policy/model version, assumptions, uncertainty, alternatives, and human boundary |
| C — Channel and pricing | DWH-06 | Retail, dealer network, auction, transfer, and approved alternatives; fees, time, recovery, risk, price/reserve proposal, and gross-floor policy | Eligibility, comparison, price/reserve, exception, and approval contracts are approved; no recommendation executes itself |
| D — Approval control | DWH-07 | Price, reserve, channel, transfer, release, sale, and write-down approval journeys | Exact proposal/version, integer-cent limit, four-eyes, expiry, rejection, revision, override, and fail-closed behavior approved |
| D — Activation | DWH-08 | Listing/channel preparation, preview, approval check, request, acknowledgement, publication state, retry, cancel, and manual/sandbox path | Activation is not shown live without connector acknowledgement; duplicate publication and stale approval are safely prevented |
| E — Market response | DWH-09 | Offer/bid intake, source, immutable versions, fees/net, expiry, compare, counter, accept, reject, and below-reserve exception | Offer identity, fraud/duplicate checks, reserve variance, authority, optimistic version, and decision evidence approved |
| E — Completion and custody | DWH-10 | Sale/transfer command, inventory state, title/release, custody, transport, receiving, reversal/unwind, and downstream handoffs | Every mutation is explicit and attributable; required holds/gates fail closed; allowed reversal retains lineage |
| F — Settlement truth | DWH-11 | Expected/actual proceeds, fees, credits, payment/reference, external IDs/states, DMS/accounting acknowledgement, mismatch, reopen, and reconciliation | UI never infers settlement from submission; accepted acknowledgement and discrepancy ownership are visible |
| F — Enterprise readiness | DWH-12 | Exceptions, reports, exports, accessibility, performance, security, observability, support, pilot, rollback, and release evidence | Empty/stale/partial/denied/conflict/retry/outage states and all enterprise gates are approved |

## 5. Workspace design package

Before code is authorized, each local destination must have a reviewed package containing the following artifacts.

| Local destination | Required design package |
| --- | --- |
| Overview | KPI definitions and drill-throughs, milestone rules, prioritized work/recommendations, approvals, exceptions, saved views, freshness, and permission states |
| Candidates | Population and exclusion rules, queue columns, reason codes, age/exposure, ownership/title/release readiness, accept/dismiss/defer, assignment, bulk-action limits, and conflict recovery |
| Appraisals | Evidence/comparables, condition and cost context, valuation range/confidence, assumptions, versions, expiry, review, insufficient evidence, and audit history |
| Channels & Listings | Channel eligibility/comparison, price/reserve proposal, fees/net, approval preview, listing preparation, activation acknowledgement, publication errors, retry/cancel, and degraded/manual operation |
| Offers & Bids | Immutable intake/versioning, source and expiry, amount/fees/net, comparisons, counter, accept/reject, below-reserve approval, duplicate/fraud review, and stale-offer conflict |
| Settlements | Sale/transfer completion, custody, title/release, payment/reference, expected/actual values, external acknowledgement, mismatch ownership, reopen, reconciliation, and reversal/unwind boundaries |
| Exceptions | Stale evidence, holds, connector failures, rejected handoffs, duplicates, conflicts, mismatches, retries/replay, reconciliation, owner/SLA, escalation, verification, and closure |

Every package must include desktop and constrained-width layouts plus loading, empty, stale, partial, unavailable, unauthorized, approval-pending, validation-failure, optimistic-conflict, integration-failure, retry/replay, and recovery states.

## 6. Eight operational milestones

| Milestone | Staff decision or action | Evidence that advances the record | Stop or exception boundary |
| --- | --- | --- | --- |
| 1. Candidate Review | Accept, dismiss, or defer governed review | Candidate reason/policy snapshot, identity, ownership, location, age/exposure, owner, actor, reason, and version | Missing identity/InventoryUnit, ownership/location/title/cost/freshness, duplicate review, or authority |
| 2. Appraisal | Submit a reviewable appraisal version | Condition, costs, comparables, sources, assumptions, valuation range, confidence, author, time, and decision history | Required/stale evidence, unsupported comparable, inconsistent amount, or insufficient confidence under policy |
| 3. Channel & Pricing | Propose an eligible channel and price/reserve | Versioned alternatives, fees, recovery range, timing, risk, policy/model version, selected/rejected reasons | Unsupported channel, missing fees/freshness, gross-floor conflict, hold, title/release issue, or authority |
| 4. Approval | Approve, reject, or return exact proposal | Proposal/policy version, amount, requester, eligible approver, separation-of-duties, decision, reason, expiry | Self-approval where barred, dollar limit, stale/revised proposal, missing evidence, or gate failure |
| 5. Activated | Explicitly request and verify channel activation | Approved request plus connector/manual evidence, external ID, acknowledgement, publication state, time, and correlation | Unavailable connector, publication rejection, duplicate, expired approval, hold, or unsupported manual claim |
| 6. Offers & Bids | Review, counter, accept, reject, or expire offer | Immutable offer/version, source identity, amount, fees/net, expiry, decision, actor, authority, and correlation | Duplicate/fraud concern, stale offer, reserve variance, title/release hold, or authority failure |
| 7. Sold / Transferred | Complete authorized sale or transfer | Accepted offer/transfer, custody and inventory-state events, title/release, transport/receiving, reference and downstream handoff | Missing payment/reference, release/title, custody, transport/receipt, downstream acceptance, or active hold |
| 8. Settled & Reconciled | Verify expected and actual completion | Proceeds, fees, credits, IDs, DMS/accounting acknowledgement, mismatch resolution, verifier, and close event | Missing acknowledgement, material mismatch, unresolved credit/fee, rejected handoff, or unbalanced state |

Milestone progress is projected from authoritative evidence. Staff cannot advance a milestone by changing a display-only status.

## 7. Roles, visibility, and consequential authority

| Role | Default workspace visibility | Typical permitted preparation | Actions requiring separate authority or policy evaluation |
| --- | --- | --- | --- |
| Inventory specialist | Assigned candidates, evidence, appraisals, recommendations, listing preparation | Start/prepare review and appraisal; submit proposals; record evidence | Restricted price/reserve, activation, transfer, offer acceptance, release, sale, write-down, settlement |
| Used-vehicle / inventory manager | Location candidate book, channel comparison, approvals, offers, exceptions | Decide within explicit location, amount, and separation-of-duties policy | Above-limit, cross-location, regional, title/accounting-controlled, or self-approval-barred action |
| Regional manager | Multi-location exposure, transfers, policy exceptions, performance | Approve explicitly delegated higher-limit and cross-location decisions | Undelegated accounting/title authority or unsupported policy exception |
| Accounting / title staff | Release, title, payment/reference, settlement, fees, credits, discrepancies | Accept/reject assigned handoffs; verify documentary and financial evidence | Invent operational completion, custody, external acknowledgement, offer, or sale evidence |
| Executive / auditor | Governed aggregates, decision history, exports, reconciliation evidence | Review and export within field/tenant policy | Operating mutation unless a distinct operating role is explicitly granted |

UI visibility explains access but never enforces it alone. The server remains authoritative for tenant, location, role/capability, ownership, amount, delegation, policy version, field visibility, and separation-of-duties.

## 8. Validation, confirmation, and approval contract

### Validation

Validate canonical vehicle and InventoryUnit identity, lifecycle state, ownership, location/custody, title/release/hold state, odometer and condition evidence where relevant, cost basis and exposure, evidence/comparable freshness, channel/vendor status, amount/currency/fees, offer identity/expiry, policy version, permission, delegated limit, separation-of-duties, optimistic version, duplicate command, and integration freshness.

### Confirmation

Before a consequential action, show the exact record and proposal version, amount and currency, expected fees/net/recovery, channel or destination, inventory/custody/title/release effects, downstream handoffs, required approval, warnings, evidence freshness, uncertainty, and degraded external dependencies.

### Approval

Approval references the exact proposal, evidence, policy version, amount, and intended command. Material revision invalidates stale approval. Self-approval fails where separation-of-duties applies. Rejection, return for revision, expiry, cancellation, resubmission, delegation, and escalation remain visible and attributable.

### Completion evidence

Successful completion returns the command ID, resulting state/version, affected records, task/approval references, audit/domain-event links, connector or manual evidence status, external acknowledgement/reference where available, and unresolved exceptions. Submission alone never proves publication, sale, release, accounting acceptance, or settlement.

## 9. Record, task, approval, and event planning matrix

| Workflow | Authoritative records | Tasks / approvals | Required event evidence |
| --- | --- | --- | --- |
| Candidate review | InventoryUnit-linked candidate review, policy/evidence snapshot, review version | Evidence, owner review, defer follow-up, exception | Created, accepted, dismissed, deferred, reopened, assigned, conflicted |
| Appraisal | Immutable appraisal version, evidence/comparables, valuation range/confidence, decision history | Evidence completion, review, expiry/reappraisal | Drafted, submitted, reviewed, approved/rejected, superseded, expired |
| Channel/price proposal | Versioned alternatives, selected channel, price/reserve, fees/recovery, recommendation decision | Price/reserve, channel, transfer, policy-exception approval | Proposed, submitted, approved, rejected, revised, expired, cancelled |
| Activation | Listing/auction/network/transfer activation request and external/manual evidence | Activation approval, acknowledgement, retry/cancel, publication exception | Requested, acknowledged, published/active, rejected, failed, retried, cancelled |
| Offer/bid decision | Immutable offer/bid versions, source, amount, fees/net, expiry, counter/decision | Below-reserve, above-limit, fraud/identity, acceptance approval | Received, revised, countered, accepted, rejected, expired, withdrawn |
| Sale/transfer/release | Inventory state, custody/location, release/title, transport/receiving, downstream handoff | Release/title, transport, receipt, rejection, reversal/unwind | Authorized, released, transferred/sold, shipped, received, handed off, reversed |
| Settlement/reconciliation | Expected/actual amounts, fees/credits, payment/reference, external IDs/states, discrepancies | Handoff acknowledgement, mismatch resolution, reopen approval | Submitted, acknowledged, rejected, mismatched, reconciled, reopened, closed |
| Exception management | Source-linked exception, severity/reason, owner/SLA, evidence, corrective references | Triage, escalation, approval, retry/replay, verification | Opened, assigned, escalated, resolution proposed, resolved, verified, reopened |

## 10. Dependencies and honest capability labels

| Dependency | Planning position | Required UI label until verified live |
| --- | --- | --- |
| InventoryUnit, lifecycle, cost/exposure, identity, custody, title/release data | Foundations vary by slice and data authority; contract mapping and live verification are required | Available, partial, stale, unavailable, or source pending—never silently estimated as fact |
| Appraisal/comparable sources | Appraisal record and external sources require authoritative evidence and freshness contracts | Illustrative or manual evidence until verified; never claim live market valuation without source/time |
| Market/listing/auction/dealer-network connectors | Vendor-specific adapters remain integration-platform work | Manual, sandbox, integration pending, request sent, acknowledged, rejected, or unavailable |
| DMS/accounting/payment/title handoffs | External systems remain authoritative only by explicit contract and acknowledgement | Handoff pending/accepted/rejected/mismatched; never “posted,” “paid,” “released,” or “settled” from request alone |
| Recommendation services | Advisory foundations exist; version, freshness, confidence, backtest, and outcome mapping must be verified | Recommendation with evidence, assumptions, alternatives, freshness, confidence, and non-executing status |
| Transport and receiving confirmation | Operational evidence may cross internal and external actors/locations | Scheduled, in transit, received, exception, or unverified; sold/transfer completion remains gated |

## 11. Review and approval gates

1. **Product and wholesale operations:** Validate terminology, task sequence, candidate policy, channels, offer decisions, release/settlement responsibilities, exception ownership, and representative cycle times.
2. **Design:** Approve information architecture, interaction specifications, responsive behavior, accessibility, recommendation explanations, and every non-happy state against the approved image.
3. **Domain and data:** Approve authoritative records, state machines, lifecycle/custody/title invariants, amounts, appraisal/offer immutability, reconciliation, retention, and audit evidence.
4. **Security and governance:** Approve capability and field matrix, tenant/location scope, delegated dollar limits, separation-of-duties, overrides, exports, and sensitive-data handling.
5. **Integration:** Document system authority, field direction, external IDs, acknowledgements, freshness, retry/replay, rate/failure behavior, reconciliation, and manual fallback.
6. **Finance and title:** Approve cost/exposure, fee/net, payment/reference, title/release, expected/actual, write-down, settlement, mismatch, and reopen boundaries.
7. **Quality and operations:** Approve acceptance scenarios, accessibility/performance targets, observability, support ownership, training, pilot, rollback, and release evidence.

Implementation may begin only when the intended release waves have enough approved detail and no unresolved decision can materially alter the shared shell, authoritative data contract, permission model, financial boundary, or workflow state model.

## 12. Definition of ready for each implementation slice

A slice is ready only when it has:

- an approved user outcome, actors, trigger, entry/exit states, stop conditions, cancellation/reversal behavior, and out-of-scope statement;
- linked wireframes and interaction specifications for happy, empty, stale, partial, unavailable, unauthorized, conflict, failure, retry, and recovery states;
- mapped authoritative records, commands, validations, approvals, tasks, events, audit evidence, and integration effects;
- permission, location, delegated-limit, field-visibility, and separation-of-duties rules;
- idempotency, concurrency, immutable-version, external-acknowledgement, reversal, and reconciliation expectations;
- measurable acceptance scenarios, accessibility/performance targets, observability, support ownership, and release evidence;
- an honest capability label and no unresolved dependency that would require the UI to misrepresent recommendation, activation, sale, release, or settlement state.

## 13. Phase 1 planning decisions still required

- Confirm pilot locations, vehicle population, roles, disposition channels, auction/dealer-network partners, transport process, title/accounting/DMS systems, and expected volumes.
- Approve candidate reasons and thresholds for age, exposure, policy, manual referral, recommendation, dismissal, deferment, and reopening.
- Approve appraisal evidence, comparable eligibility, freshness limits, valuation confidence requirements, review/expiry rules, and manual appraisal boundaries.
- Approve channel eligibility, fee and net-recovery definitions, gross floor, price/reserve rules, transfer protection, and unavailable-channel behavior.
- Approve price, reserve, activation, transfer, below-reserve offer, release, sale, write-down, and settlement thresholds plus separation-of-duties.
- Approve listing/activation evidence, offer/bid source verification, counter/expiry rules, duplicate/fraud review, and external acknowledgement semantics.
- Approve title/release, payment/reference, custody, transport, receiving, reversal/unwind, and downstream handoff gates.
- Approve expected/actual settlement definitions, material mismatch tolerances, reconciliation owner, reopen authority, and closure verification.
- Approve KPI definitions and targets for candidate aging, exposure, recovery, time to appraisal/activation/offer/sale/settlement, channel performance, exception rate, and reconciliation accuracy.
- Select the first external adapter pilot and document the authoritative acknowledgement, retry/replay, reconciliation, support owner, and manual fallback.

## 14. Recommended Phase 2 catalog

After Phase 1 review and approval, a separate documentation branch should create `DISPOSITION_WHOLESALE_WORKFLOW_AND_ALGORITHM_CATALOG.md`. It should define detailed state/command contracts and advisory algorithms for:

- candidate eligibility and disposition-review priority;
- holding exposure, aging risk, and next-review timing;
- appraisal evidence quality, valuation range, and confidence;
- retail-versus-transfer-versus-wholesale/channel comparison;
- price and reserve recommendation with gross-floor and policy controls;
- offer/bid normalization, expiry, net-value comparison, and decision support;
- activation, sale/transfer, title/release, custody, and settlement exception priority;
- settlement mismatch and reconciliation risk.

The recommended Phase 2 branch is `codex/disposition-wholesale-implementation-plan-phase-2`.

## 15. Change control

This plan adds implementation detail but cannot silently change the approved Disposition & Wholesale UX source of truth. Any material change to navigation, milestones, local destinations, role boundaries, consequential actions, approval guardrails, inventory/custody/title/financial controls, or capability labeling requires explicit product approval and a versioned update to the approved source document and image.
