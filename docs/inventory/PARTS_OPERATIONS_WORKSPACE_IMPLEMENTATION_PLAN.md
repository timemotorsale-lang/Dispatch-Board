# Parts Operations Workspace — Implementation Plan

**Product:** Time Motor Sales Dispatch Board  
**Module:** Inventory Console → Shop & Recon → Parts Operations  
**Version:** 0.1 planning baseline  
**Date:** 2026-07-17  
**Status:** Documentation and planning only; no application implementation is authorized by this document  
**Planning branch:** `codex/parts-operations-implementation-plan`  
**Approved UX source:** [`PARTS_OPERATIONS_WORKSPACE_UI_SOURCE_OF_TRUTH.md`](PARTS_OPERATIONS_WORKSPACE_UI_SOURCE_OF_TRUTH.md)

## 1. Purpose

This plan converts the approved Parts Operations workspace into reviewable delivery slices without changing its approved visual or workflow contract. It establishes what must be designed, validated, and accepted before implementation begins.

The workspace remains a deeper operational surface opened from **Shop & Recon → Open Parts Operations**. It does not become an additional Inventory Console global-navigation tab.

## 2. Planning guardrails

- The approved image, nine operational milestones, nine local destinations, role boundaries, and human-approval controls remain binding.
- Existing repository capabilities may be reused only after their live contracts, permissions, states, and data quality are verified.
- A repository-complete capability is not described as deployed, integrated, or production-ready without corresponding environment evidence.
- Recommendations remain advisory. They cannot autonomously create or approve a purchase order, substitution, transfer, adjustment, issue, installation, reconciliation, or write-off.
- Quantity and custody changes require server-authoritative validation, immutable evidence, idempotency, concurrency protection, and auditable reversals.
- Barcode entry accelerates input but never substitutes for staff confirmation of part, quantity, location, and action.

## 3. Phase-one outcome

Authorized staff can move a part from demand through reconciliation in one coherent workspace while always seeing:

- current milestone, owner, age, priority, location, and next action;
- job and vehicle context, fitment evidence, availability, alternatives, ETA, and uncertainty;
- approvals, separation-of-duties, limits, and stop conditions before a consequential action;
- quantities by on-hand, allocated, available, ordered, backordered, damaged, and in-transit state;
- custody, receiving, discrepancy, recovery, and reversal history;
- freshness, degraded integrations, unresolved exceptions, and downstream readiness effects.

## 4. Delivery sequence

The identifiers below retain the approved `PART-UI-01` through `PART-UI-12` contract. Each slice must be independently reviewable and must not imply that a later slice is available.

| Wave | Approved slice | Planning deliverable | Exit condition before implementation |
| --- | --- | --- | --- |
| A — Entry and orientation | PART-UI-01 | Route ownership, entry/return context, shell, local tabs, URL state, filters, saved views, empty/loading/unauthorized/error states | Navigation map and responsive wireframes approved; no eighth global tab |
| A — Operational overview | PART-UI-02 | KPI definitions, drill-throughs, freshness rules, milestone projection, work queue, reviews, approvals, and exceptions | Every displayed count has an authoritative source, filter scope, freshness rule, and reconciliation test |
| B — Need and allocation | PART-UI-03 | Demand intake/review, job linkage, fitment, reservation, release, priority, shortage, and conflict recovery | Demand and availability state machines, permissions, commands, events, and concurrency behavior approved |
| B — Source decision | PART-UI-04 | Requisition, vendor/transfer comparison, substitutes, policy checks, recommendation explanation, and decision evidence | Comparison contract exposes price, ETA, reliability, warranty, returns, freshness, confidence, and rejected alternatives |
| C — Purchase control | PART-UI-05 | Draft, submit, approve/reject, issue, acknowledge, revise, cancel, and close PO journeys | Exact approval amount/version, separation-of-duties, idempotency, and vendor failure states approved |
| C — Physical receipt | PART-UI-06 | Scan/manual receiving, inspection, partial receipt, discrepancy, cost variance, bin/put-away, and resolution | Wrong, damaged, short, over, duplicate, and stale receipt paths have owners and safe recovery behavior |
| D — Stock truth | PART-UI-07 | Part master, balances, bins, ordered/backordered/damaged views, ledger drill-through, and reversals | Projection-to-ledger reconciliation and negative-stock prevention are proven in the acceptance design |
| D — Job custody | PART-UI-08 | Reserve, release, issue, install, unused return, correction, and job-readiness impact | Custody transitions and reversal linkage are approved; over-allocation and unauthorized moves are rejected |
| E — Network movement | PART-UI-09 | Cross-location request, approval, ship, receive, discrepancy, cost, SLA, and cancel paths | Source/destination authority, paired movements, in-transit custody, and concurrent receipt behavior approved |
| E — Value recovery | PART-UI-10 | Core, warranty, vendor return, shipment, acknowledgement, credit, dispute, deadline, and write-off | Expected/actual credit, evidence, deadline ownership, and financial handoff boundaries are approved |
| F — Control and advice | PART-UI-11 | Count planning, freeze/observe, variance approval, adjustment, replenishment, and obsolescence advice | Independent approval is explicit for nonzero variance; advice remains non-executing and explainable |
| F — Enterprise readiness | PART-UI-12 | Accessibility, performance, observability, support, vendor-adapter, barcode, release, pilot, and rollback evidence | Honest capability labels, manual fallback, release gates, training, runbook, and pilot decision are approved |

## 5. Workspace and workflow design package

Before code is authorized, each local destination must have a reviewed package containing the following artifacts.

| Local destination | Required design package |
| --- | --- |
| Overview | KPI catalog links, milestone rules, queue columns, prioritization explanation, review/approval cards, exceptions, saved views, and drill-through map |
| Demand | Intake and job-linked creation paths, fitment evidence, required date, priority, reservation, shortage, substitute, duplicate, cancel, and conflict states |
| Requisitions | Comparison table, recommendation explanation, selected/rejected evidence, submit/revise paths, policy preview, and approval history |
| Purchase Orders | Lifecycle state model, amount/version approval, acknowledgement, partial receipt, change/cancel/close paths, and integration degradation |
| Receiving | Scan/manual patterns, confirmation preview, partial/duplicate receipt, inspection, discrepancy, bin selection, put-away, and correction |
| Inventory | Search, part detail, warehouse/bin balances, ledger history, reservations, availability calculation, damaged stock, and reversal navigation |
| Transfers | Source/destination comparison, authority, shipment custody, receiving, delay, discrepancy, cost, cancellation, and reconciliation |
| Returns & Recovery | Eligibility, deadline, shipment, acknowledgement, expected/actual credit, dispute, write-off, and accounting handoff |
| Counts & Exceptions | Count plan, freeze/observe, blind count policy, variance, independent approval, adjustment, anomaly, replenishment, and obsolescence advice |

Every package must include desktop and constrained-width layouts plus loading, empty, stale, partial, unauthorized, approval-pending, validation-failure, conflict, integration-failure, and recovery states.

## 6. Roles, visibility, and consequential actions

| Role | Default workspace visibility | Typical permitted preparation | Actions requiring separate authority or policy evaluation |
| --- | --- | --- | --- |
| Technician | Assigned-job demand, reservation, issue/return state, fitment, blockers | Request part; acknowledge authorized custody | Purchase, substitution approval, transfer approval, adjustment, write-off |
| Advisor / dispatcher | Job readiness, ETA, promise risk, blockers, escalation | Create demand; request sourcing | Physical-stock mutation or financial approval unless separately granted |
| Parts specialist | Demand, requisitions, PO preparation, receiving, inventory, transfers, returns | Prepare and execute policy-scoped operational commands | Above-limit purchase, restricted substitution/transfer, variance, write-off, policy exception |
| Parts manager | Location supply, vendor decisions, counts, recovery, exceptions | Approve within explicit policy and separation-of-duties | Higher-limit, cross-location, regional, or accounting-controlled decisions |
| Regional inventory manager | Multi-location supply, shared pools, transfer and obsolescence outcomes | Approve explicitly delegated cross-location actions | Unassigned financial/accounting authority or self-approval barred by policy |
| Accounting / auditor | Cost, credit, handoff, discrepancy, and immutable history | Accept or reject assigned handoffs; audit evidence | Invent physical receipt, custody movement, or unsupported quantity adjustment |

UI visibility is explanatory only. The server remains authoritative for organization, location, role, ownership, amount, delegation, policy version, and separation-of-duties decisions.

## 7. Validation, confirmation, and approval contract

### Validation

Validate part and vendor status, unit of measure, fitment evidence, quantity, warehouse/bin, job/demand, availability, reservation, source, cost, ETA, policy version, permission, optimistic version, duplicate command, and integration freshness.

### Confirmation

Before a consequential action, show the exact proposal version, quantities, costs, source/destination or custody movement, affected demand/job, resulting availability, downstream readiness impact, required approval, warnings, and any degraded external dependency.

### Approval

Approvals reference the exact proposal and policy version. Revision of material fields invalidates stale approval. Self-approval is rejected where separation-of-duties applies. Rejection, expiry, cancellation, and resubmission remain visible and attributable.

### Completion evidence

Successful completion returns a command identifier, resulting state/version, affected records, ledger/event references, resulting availability, created tasks/approvals, integration acknowledgement or pending state, and unresolved exceptions.

## 8. Record, task, and event planning matrix

| Workflow | Authoritative records | Tasks / approvals | Required event evidence |
| --- | --- | --- | --- |
| Demand and reserve | RepairJob demand, fitment/source evidence, reservation | Source, substitute, shortage, priority, or exception task | Created, changed, reserved, released, cancelled, conflicted |
| Requisition and source | Versioned comparison, vendor/transfer offers, recommendation decision | Purchase, substitution, transfer, or policy approval | Submitted, approved, rejected, revised, expired |
| Purchase order | PO header/lines, approval, issue and acknowledgement versions | Approval, acknowledgement, change, cancellation, late-order task | Drafted, approved, issued, acknowledged, changed, cancelled, closed |
| Receiving | Receipt, line observations, discrepancy, bin decision, ledger entry | Damage, wrong/short/over, cost, put-away, or resolution task | Partially/fully received, discrepancy opened/resolved, correction linked |
| Inventory and custody | Balance projection, immutable ledger, reservation, issue/install/return evidence | Readiness, blocker, unused return, correction task | Reserved, released, issued, installed, returned, reversed |
| Transfer | Transfer aggregate, source/destination ledger and custody evidence | Approval, ship, receive, delay, discrepancy task | Approved, shipped, received, reconciled, cancelled |
| Recovery | Core/warranty/vendor-return case, shipment, credit/dispute evidence | Deadline, acknowledgement, credit, dispute, write-off approval | Eligible, shipped, acknowledged, credited, disputed, written off |
| Count and advice | Count snapshot/observation, variance approval, adjustment, advisory recommendation | Count assignment, independent approval, anomaly/review task | Started, observed, approved/rejected, posted/cancelled; recommendation acknowledged/dismissed/expired |

## 9. Dependencies and honest capability labels

| Dependency | Planning position | UI label until verified live |
| --- | --- | --- |
| Existing M5 parts domain and APIs | Repository evidence exists; contract mapping and end-to-end verification are still required for this workspace | Available only where verified against live API and permission behavior |
| Vendor-specific ordering and return adapter | Planned under integration-platform work | Manual or integration pending; never show vendor acknowledgement without evidence |
| Barcode hardware and device management | UI may be barcode-ready; operational hardware path requires separate readiness | Manual entry available / scanner unavailable or unverified |
| Accounting / DMS handoff | Operational package and states may exist; external system remains authoritative only by explicit contract | Handoff pending, accepted, rejected, or unavailable—never “posted” without acknowledgement |
| Recommendation services | Advisory foundations exist; freshness, confidence, backtest, and outcome contracts must be mapped | Recommendation with evidence, freshness, confidence, and non-executing status |

## 10. Review and approval gates

1. **Product and operations:** Parts staff validate task order, terminology, exception ownership, and time-to-complete for representative journeys.
2. **Design:** Information architecture, interaction specifications, responsive behavior, accessibility, and all non-happy states are approved against the source-of-truth image.
3. **Domain and data:** Records, state machines, invariants, ledger/projection reconciliation, migration position, retention, and audit evidence are approved.
4. **Security and governance:** Capability matrix, location scope, amount limits, delegated authority, separation-of-duties, sensitive fields, and exports are approved.
5. **Integration:** System authority, field direction, acknowledgements, retry/replay, failure, freshness, reconciliation, and manual fallback are documented.
6. **Quality and operations:** Acceptance scenarios, accessibility/performance targets, observability, support ownership, training, pilot, rollback, and release evidence are approved.

Implementation may begin only after Waves A–F have enough approved detail for their intended release sequence and no unresolved decision can materially alter the shared shell, data contract, permission model, or workflow state model.

## 11. Definition of ready for each implementation slice

A slice is ready only when it has:

- an approved user outcome, actors, entry/exit states, stop conditions, and out-of-scope statement;
- linked wireframes and interaction specifications for happy, empty, stale, unauthorized, conflict, failure, and recovery states;
- mapped authoritative records, commands, validations, approvals, tasks, events, audit, and integration effects;
- permission and location rules plus separation-of-duties and amount-limit behavior;
- idempotency, concurrency, reversal, and reconciliation expectations;
- measurable acceptance scenarios, accessibility and performance targets, observability, and support ownership;
- an honest capability label and no unresolved dependency that would force the UI to misrepresent system behavior.

## 12. Planning decisions still required

- Confirm phase-one pilot locations, roles, volumes, scanners, printers, and vendor/accounting systems.
- Confirm which local destinations launch in the first pilot versus remain permission-hidden or labeled planned.
- Approve purchase, substitution, transfer, variance, and write-off thresholds plus separation-of-duties rules.
- Approve saved-view defaults, queue prioritization, SLA clocks, escalation ownership, and notification channels.
- Select the first vendor-adapter workflow, authoritative acknowledgements, reconciliation owner, and manual fallback.
- Approve operational definitions and targets for fill rate, demand readiness, receiving exceptions, PO lateness, recovery leakage, count accuracy, and recommendation outcomes.

## 13. Change control

This plan may add implementation detail but cannot silently change the approved UX source of truth. Any material change to navigation, milestones, local destinations, role boundaries, consequential actions, approval guardrails, quantity/custody controls, or capability labeling requires explicit product approval and a versioned update to the approved source document and image.
