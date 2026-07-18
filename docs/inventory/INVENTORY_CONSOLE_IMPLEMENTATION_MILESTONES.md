# Inventory Console Implementation Milestones

**Product:** Time Motor Sales Dispatch Board  
**Program:** Enterprise Inventory Console  
**Version:** 1.0 planning baseline  
**Date:** 2026-07-18  
**Status:** Planned execution backlog; no implementation is authorized  
**Roadmap:** [`INVENTORY_CONSOLE_IMPLEMENTATION_ROADMAP.md`](INVENTORY_CONSOLE_IMPLEMENTATION_ROADMAP.md)  
**Architecture:** [`INVENTORY_CONSOLE_IMPLEMENTATION_ARCHITECTURE.md`](INVENTORY_CONSOLE_IMPLEMENTATION_ARCHITECTURE.md)

## 1. Delivery contract

Every card is a reviewable vertical slice and includes, where applicable:

- approved outcome, actors, workflow states, stop/alternate/reversal paths, and out-of-scope boundary;
- backward-compatible schema/migration and rollback/roll-forward plan;
- domain invariant, tenant/location/role/field/amount authority, and separation of duties;
- idempotent command, optimistic concurrency, immutable evidence, audit, domain event, and outbox;
- versioned read/projection with scope, cutoff, freshness, lag, quality, exclusions, reconciliation, pagination, and drill-through;
- live UI with loading, empty, partial, stale, insufficient, unavailable, denied, conflict, failure, lag, retry, and recovery states;
- task/review/approval, notification/escalation, document/evidence, search, export, and integration effects;
- unit, domain, repository, integration, browser, accessibility, performance, security, recovery, and reconciliation evidence proportional to risk;
- rollout, observability, support/runbook, training, pilot, pause, rollback, and outcome measurement.

Status remains `PLANNED` until a separately approved implementation branch delivers and verifies the slice.

## 2. M0 — Program authorization and traceability

| ID | Slice | Acceptance |
| --- | --- | --- |
| IC-000 | Approve program charter and no-code-to-code gate | Scope, owners, pilot, systems, thresholds, release authority, pause/rollback, and change control are signed |
| IC-001 | Freeze approved UX/source hierarchy | Seven destinations, landing pages, Control Tower entry, Wholesale, Parts, Reviews/Approvals, launcher, and images are versioned |
| IC-002 | Complete workflow/action traceability | Every visible value/action maps to record, command, permission, task/approval, event, projection, and integration effect |
| IC-003 | Approve domain and source-authority map | Vehicle, InventoryUnit, Shop, Parts, Wholesale, work governance, evidence, reporting, and external authority have one owner |
| IC-004 | Approve KPI/target and data-quality baseline | Formulas, windows, units, targets, grades, freshness, drill-through, and restatement rules are approved |
| IC-005 | Approve acceptance fixtures and pilot cases | Representative happy, conflict, failure, reversal, outage, reconciliation, accessibility, and rollback cases are fixed |

**Exit gate:** Named business, product, architecture, security, data, finance/title, integration, support, and pilot owners authorize M1 planning-to-code transition.

### R0 readiness evidence — 2026-07-18

The documentation-only R0 implementation package is indexed in [`r0-readiness/README.md`](r0-readiness/README.md). It records the source freeze, traceability, internal domain authority, KPI/quality requirements, acceptance case suite, and all unresolved human decisions. IC-000 through IC-005 remain incomplete until their named signatures and blocking decisions are supplied; this evidence does not authorize M1 application code.

## 3. M1 — Shared enterprise foundation conformance

| ID | Slice | Acceptance |
| --- | --- | --- |
| IC-010 | Verify canonical Vehicle and InventoryUnit boundaries | Duplicate, reacquisition, relationship, external identity, odometer, location/custody, and open-cycle invariants pass |
| IC-011 | Verify capability and authority framework | Tenant/location/role/ownership/field/amount/delegation/four-eyes/anti-splitting checks fail closed |
| IC-012 | Verify command contract | Idempotent replay, request-hash conflict, optimistic version, atomic mutation/audit/event/outbox, and response envelope pass |
| IC-013 | Verify work governance | Tasks, blockers, reviews, approvals, claims, escalation, deduplication, expiry, and reopening behave consistently |
| IC-014 | Verify evidence/document service | Upload security, checksum, lineage, access, retention/legal hold, correction/quarantine, and evidence linking pass |
| IC-015 | Verify policy and rollout framework | Effective versions, preview/simulation, approval, pilot, enable/pause/rollback, inheritance, and audit pass |
| IC-016 | Verify event/outbox/projection foundations | Ordered idempotent consumption, checkpoint, lag, retry/dead letter, replay, rebuild, and reconciliation pass |
| IC-017 | Verify backup/restore and migration harness | Dry run, error report, lineage, restore, replay, rollback/roll-forward, and reconciliation totals pass |

**Exit gate:** Foundation conformance suite passes across at least one InventoryUnit, RepairOrder, Parts, and approval command.

### R1 conformance evidence — 2026-07-18

A read-only repository assessment is recorded in [`r1-foundation-conformance/README.md`](r1-foundation-conformance/README.md). The existing foundations passed 62 targeted tests and schema validation, but IC-010 through IC-017 remain partial and application-code mutation remains blocked by the unresolved R0 authorization gate.

## 4. M2 — Shared console shell and Home

| ID | Slice | Acceptance |
| --- | --- | --- |
| IC-020 | Implement shared shell and seven destinations | Approved desktop/tablet/mobile navigation, selected state, global controls, and no tab-wall regression pass |
| IC-021 | Implement permitted location/scope contract | Single/multi-location scope, time zone, capability, field restriction, rollout, and unauthorized scope behavior pass |
| IC-022 | Implement universal search and context links | Authorized identifiers, stable results, Vehicle 360 links, restricted fields, and return context pass |
| IC-023 | Implement filters and saved views | URL state, permission intersection, sharing/versioning, invalid/retired filter recovery, and defaults pass |
| IC-024 | Implement Workflow Launcher | Role/state-aware catalog, purpose-built forms, validation, previews, approvals, receipts, and recovery pass |
| IC-025 | Implement Home projections and KPIs | Counts, attention, flow health, throughput, integration health, freshness, and drill-through reconcile |
| IC-026 | Implement Home priority work | My Work/Team/Exceptions, hard tiers, ownership, due/escalation, next action, and deduplication pass |
| IC-027 | Implement contextual Reviews & Approvals | Permission counts, exact versions, direct actions, separation of duties, and global queue links pass |
| IC-028 | Implement Event Log and honest-state UX | Audit/integration history plus loading/empty/partial/stale/denied/failure/lag/recovery states pass |

**Exit gate:** Home contains no representative data and routes every authorized staff journey correctly.

### R2 conformance evidence — 2026-07-18

A read-only shell/Home assessment is recorded in [`r2-shell-home/README.md`](r2-shell-home/README.md). Existing navigation, search, review, event, KPI, saved-view, and Control Tower foundations passed 59 targeted tests, but IC-020 through IC-028 remain partial or unimplemented. The current `/vehicles` route still exposes the older detailed Control Tower and representative values, while R2 code mutation remains blocked by unresolved R0 and R1 gates.

## 5. M3 — Inventory Lifecycle and Control Tower

| ID | Slice | Acceptance |
| --- | --- | --- |
| IC-030 | Implement lifecycle scope/summary projection | Active, primary stage, terminal/alternate, blocked/unowned/stale, costs, reviews/approvals, and exclusions reconcile |
| IC-031 | Implement lifecycle stage and clock projection | Counts, entry/exit, median/p90, active/waiting/idle, targets, breaches, exposure, owners, and drill-through reconcile |
| IC-032 | Implement cross-lane dependency projection | Inventory Recon, Shop/Parts readiness, QC handoff, ETA/confidence, and customer-repair separation pass |
| IC-033 | Implement priority work and exception projections | Hard tiers, reason codes, next action, owner/SLA, value/customer impact, correction, verification, and reopen pass |
| IC-034 | Implement review/approval/recommendation projections | Exact versions, explanation, alternatives, confidence, expiry, decision/outcome, and authority pass |
| IC-035 | Implement capital and aging projection | Actual/estimate distinction, currency, component exposure, clocks, policy bands, confidence, and reconciliation pass |
| IC-036 | Implement selected-asset projection | Vehicle/unit, lifecycle, Shop/Parts, costs, blockers, tasks, approvals, audit, valid commands, and field restrictions pass |
| IC-037 | Implement data/integration health projection | Source/projection lag, conflicts, dead letters, affected panels, manual path, owner, and recovery pass |
| IC-038 | Implement Inventory Lifecycle landing page | Approved image, filters, KPIs, pipeline, work, Reviews/Approvals, summaries, Wholesale action, and honest states pass |
| IC-039 | Implement Open Control Tower transition | Context preservation, breadcrumb, deep contextual entry, selected rail/drawer, and Back to Inventory Lifecycle pass |

**Exit gate:** Fixed and pilot fixtures reconcile all Control Tower aggregates, drill-throughs, clocks, costs, work, and quality grades.

## 6. M4 — Acquisition and Appraisal

| ID | Slice | Acceptance |
| --- | --- | --- |
| IC-040 | Opportunity intake and triage | Source, identity, owner, duplicate/open-unit detection, expiry, privacy, watch/decline/exception pass |
| IC-041 | Evidence and identity qualification | VIN/configuration, mileage, condition, title/history, source/freshness, conflict, and insufficient evidence pass |
| IC-042 | Appraisal/comparable versions | Eligible/excluded comparables, adjustments, valuation range, confidence, review, supersession, and expiry pass |
| IC-043 | Maximum all-in and bid recommendation | Component economics, sensitivity, risk reserve, policy ceiling, confidence, explanation, and non-execution pass |
| IC-044 | Acquisition authority | Exact proposal, integer-cent limits, cumulative exposure, anti-splitting, four-eyes, expiry, revision, and rejection pass |
| IC-045 | Bid/offer/counter and commitment | Immutable versions, terms, external acknowledgement, variance/reapproval, expiry, duplicate, and accepted evidence pass |
| IC-046 | Financial acquisition and InventoryUnit creation | Canonical Vehicle, relationship, unique cycle/number, owner/location, atomic evidence, replay, and no synthetic ownership pass |
| IC-047 | Cancellation/correction/reversal | Before-control cancellation, after-control reversal, title/payment/custody implications, compensation, and verification pass |
| IC-048 | Acquisition-to-transport handoff | Retail/wholesale/transfer/return routing, downstream idempotency, acknowledgement, rejection, and context pass |

**Exit gate:** No opportunity/appraisal/recommendation/import creates inventory or commits above authority.

## 7. M5 — Inventory-to-Frontline

| ID | Slice | Acceptance |
| --- | --- | --- |
| IC-050 | Acquisition validation and transport | Claimed event validation, release/location/destination/method, ETA/cost, hold/recovery, and Receipt handoff pass |
| IC-051 | Receipt and custody | Identity, arrival, keys/items/documents, odometer, condition/damage, custody, exceptions, and Inspection handoff pass |
| IC-052 | Inspection and triage | Template/readiness, findings/evidence, safety/title/diagnostic routes, duplicate prevention, and ownership pass |
| IC-053 | Recon planning and approval | Versioned plan, estimate, jobs/dependencies, amounts, scope change/reapproval, alternate route, and Shop handoff pass |
| IC-054 | Parts and repair execution | Demand/source/receipt/reserve/issue, dispatch/labor/evidence, blockers, job completion, and QC handoff pass |
| IC-055 | Quality and safety verification | Independent applicable checks, road test/evidence, failed-QC rework, operational release, and no averaging pass |
| IC-056 | Title/document readiness | Effective requirements, evidence/custody, external dependencies, holds, due/escalation, and downstream gate pass |
| IC-057 | Merchandising, pricing, and publication | Verified facts/media, content, human price approval, channel acknowledgement, errors, freshness, and handoff pass |
| IC-058 | Frontline release and availability | Whole-package gate, authorization, location/availability, post-release verification, suspension/reinstatement pass |
| IC-059 | End-to-end frontline tabletop | Nine-slice happy/alternate/failure/reversal cases, projections, audit, task burden, and pilot readiness pass |

**Exit gate:** Inventory-to-Frontline approval register and pilot sign-off authorize controlled activation.

## 8. M6 — Retail completion

| ID | Slice | Acceptance |
| --- | --- | --- |
| IC-060 | Available-for-sale state | Frontline authorization, suspension/title/location/price/publication gates, freshness, and CRM/DMS boundary pass |
| IC-061 | Reservation/deal-pending | Customer/deal reference, owner, start/expiry, deposit reference boundary, duplicate/competing demand, and audit pass |
| IC-062 | Extend/release/expire reservation | Authority, promise/customer effects, reason, stale conflict, automatic expiry task/event, and availability restoration pass |
| IC-063 | Sale authorization | Exact vehicle/deal/price reference, title/release, amount/authority, readiness, external state, and separation of duties pass |
| IC-064 | Delivery readiness and hold | Documents/keys/accessories, custody/location, condition/odometer, customer promise, payment reference, and exceptions pass |
| IC-065 | Delivery and custody handoff | Recipient/actor/time/location/evidence, inventory terminal state, external handoff, acknowledgement, and audit pass |
| IC-066 | Cancellation and unwind | Timing, returned custody/condition, title/financial effects, tasks, approval, and valid inventory re-entry route pass |
| IC-067 | Reversal and reconciliation | Linked compensation, no destructive history, DMS/accounting mismatch, replay, verification, reopen, and close pass |
| IC-068 | Retail completion projections | Availability/reservation/sale/delivery/unwind clocks, queues, reviews/approvals, KPIs, and Control Tower integration pass |

**Exit gate:** Happy, competing reservation, delivery hold, external outage, unwind, and reconciliation cases pass.

## 9. M7 — Shop & Recon

| ID | Slice | Acceptance |
| --- | --- | --- |
| IC-070 | RepairOrder core and intake | Customer/inventory origin, appointment/walk-in, identity, concern/promise/consent/keys/transport, and idempotency pass |
| IC-071 | Inspection, diagnosis, estimate, and authorization | DVI, concern-cause-correction, evidence/uncertainty, immutable estimate/change orders, exact approval pass |
| IC-072 | RepairJob, procedures, and readiness | Jobs, dependencies, skills/bay/tools, parts/approval gates, templates, priority, and conflict pass |
| IC-073 | Planning, dispatch, and resource booking | Qualified capacity, schedule/critical ratio, assign/rebook, override reason, continuity, and concurrency pass |
| IC-074 | Technician execution and labor | Acknowledge/start/pause/reason/resume/finish, overlap/correction, evidence, blockers, and mobile accessibility pass |
| IC-075 | Advisor workspace and customer promise | Status, estimates/approvals, communications/consent, promise risk, transportation, and delivery readiness pass |
| IC-076 | QC, rework, release, and comeback | Applicable QC, peer/safety/road test, failed return, release, comeback linkage, responsibility review, and evidence pass |
| IC-077 | Production and coaching metrics | Productivity/efficiency/proficiency/FPY/quality adjustment, exclusions, work class, confidence, and no discipline automation pass |
| IC-078 | Invoice-ready close and reopen | Authorized labor/parts/readiness/release, package/handoff, acknowledgement, mismatch, close, and manager reopen pass |
| IC-079 | Shop & Recon landing/deeper workspaces | Approved pipeline, workload separation, work queues, Reviews/Approvals, parts dependencies, and Control Tower handoff pass |

**Exit gate:** Customer Repair and Inventory Recon end-to-end cases reconcile while remaining distinct.

## 10. M8 — Parts Operations

| ID | Slice | Acceptance |
| --- | --- | --- |
| IC-080 | Part/vendor/warehouse/bin masters and ledger | Identity, interchange/fitment, vendor terms, locations, immutable events, balances, costing, negative-stock and reversal pass |
| IC-081 | Demand, reservation, and allocation | Job/stock need, quantity/date, fitment, duplicate, scarce priority, expiration/release, concurrency, and readiness pass |
| IC-082 | Requisition and source comparison | Vendors/transfers/substitutes, price/ETA/reliability/warranty/returns, freshness, alternatives, decision and approval pass |
| IC-083 | Purchase orders | Draft/approval/issue/ack/change/cancel/partial/full receipt/close, amount/version authority, duplicate and external failure pass |
| IC-084 | Receiving and discrepancy | Scan/manual, source, quantity/condition/cost, duplicate, short/over/wrong/damaged, bin, owner and correction pass |
| IC-085 | Issue/install/unused return and custody | Reservation, technician/job/vehicle, quantity, installation, unused condition/bin, over-allocation, reversal and readiness pass |
| IC-086 | Cross-location transfers | Source protection, approval, pick/ship/custody/receive, paired ledger, delay/discrepancy/cancel, cost and concurrency pass |
| IC-087 | Core/warranty/vendor-return recovery | Eligibility, evidence/packaging, deadline, shipment, acknowledgement, expected/actual credit, dispute/write-off pass |
| IC-088 | Counts, adjustments, replenishment and obsolescence | Plan/freeze/observe/recount, independent variance approval, adjustment, advice/explanation, and non-execution pass |
| IC-089 | Parts Operations workspace and analytics | Nine local destinations, milestones, queues, reviews/approvals, algorithms, KPIs, accessibility, performance and release pass |

**Exit gate:** Quantity, custody, value, PO/receipt, transfer, recovery, count, and job readiness reconcile under load and retry.

## 11. M9 — Disposition & Wholesale

| ID | Slice | Acceptance |
| --- | --- | --- |
| IC-090 | Candidate projection and review | Eligibility/reasons, age/exposure, freshness, accept/dismiss/defer/reopen, owner, queue and audit pass |
| IC-091 | Disposition appraisal | Evidence/comparables, valuation range/confidence, versions, review/supersession/expiry, and acquisition-appraisal separation pass |
| IC-092 | Channel/price/reserve comparison | Retail/transfer/network/auction/wholesale eligibility, fees/net/time/risk, gross floor, alternatives and advice pass |
| IC-093 | Consequential approvals | Price/reserve/channel/transfer/activation/offer/release/sale/write-down exact versions and authority pass |
| IC-094 | Activation and publication | Package/readiness, idempotent request, external ID/acknowledgement, duplicate, retry/cancel, manual/sandbox labels pass |
| IC-095 | Offers and bids | Source verification, immutable versions, normalized net/terms, expiry/counter/accept/reject, fraud review and approval pass |
| IC-096 | Sale/transfer and release | Accepted evidence, title/release, custody/location, transport/receipt, inventory state, downstream handoff and unwind pass |
| IC-097 | Settlement and reconciliation | Expected/actual proceeds/fees/credits, external IDs/states, acknowledgement, mismatch, write-down/reopen and close pass |
| IC-098 | Wholesale algorithms and outcomes | Candidate/exposure/appraisal/channel/price/offer/recovery/settlement recommendations, explanations, confidence and calibration pass |
| IC-099 | Disposition & Wholesale workspace | Seven local destinations, eight milestones, queues, exceptions, Reports, accessibility, performance and release pass |

**Exit gate:** Activation, offer, release, sale/transfer, and settlement cannot be overstated; full exception/reconciliation cases pass.

## 12. M10 — Cross-console governance, reporting, and administration

| ID | Slice | Acceptance |
| --- | --- | --- |
| IC-100 | Global Reviews queue | Role/location scope, review types, evidence, owner, age/due/expiry, actions, detail and return context pass |
| IC-101 | Global Approvals queue | Exact proposal/policy/evidence, amount/quantity, four-eyes, limits, decisions, expiry, revision and audit pass |
| IC-102 | Vehicle 360 and relationship graph | Identity, lifecycle cycles, Shop, Parts, customer, documents, costs, decisions, events and field permissions pass |
| IC-103 | Reports and governed KPI facts | Definitions, periods, scope, freshness, quality, targets, drill-through, snapshots, cohorts and restatement pass |
| IC-104 | Controlled exports/print | Field/row permissions, reason, scope/cutoff, watermark, bounded volume and audit pass |
| IC-105 | Policy administration | Version, preview/simulation, four-eyes, effective date, inheritance/override, pilot, outcome and rollback pass |
| IC-106 | Role/capability/authority administration | Assignments, delegation/expiry, limits, separation, field visibility, location scope, and audit pass |
| IC-107 | Audit and event explorer | Actor/subject/domain/correlation/location/time filters, bounded reads, restricted data and immutable evidence pass |
| IC-108 | Background operations and data health | Outbox/inbox/jobs, lag, dead letters, retries/replay, conflicts, incidents, owner and resolution pass |
| IC-109 | Retention, legal hold, privacy, and support | Disposition due, hold/quarantine/deletion evidence, runbooks, training, ownership and support workflows pass |

**Exit gate:** Enterprise governance works consistently across Inventory, Shop, Parts, and Wholesale.

## 13. M11 — Integration ecosystem

| ID | Slice | Acceptance |
| --- | --- | --- |
| IC-110 | Actual-system inventory and source matrix | Owners, authority, fields, IDs, direction, volume, freshness, failure, security and manual fallback approved |
| IC-111 | Integration registry and adapter harness | Auth/secrets, mapping, external IDs, inbox/outbox, idempotency, retry/circuit breaker, lineage, metrics and contract tests pass |
| IC-112 | Reconciliation/conflict console | Missing/duplicate/mismatched/stale/rejected/out-of-balance cases, owner, replay/correction and verification pass |
| IC-113 | DMS/accounting pilot | One operational package round-trips sandbox/pilot and reconciles IDs, states, amounts, duplicates, rejection and outage |
| IC-114 | VIN/history/title pilot | Provider facts expose source/time/coverage/confidence/failure and never overwrite evidence silently |
| IC-115 | Market/listing/auction pilot | Comparable/publication/offer states, errors, freshness, acknowledgement, retry and advisory price boundary pass |
| IC-116 | Parts vendor pilot | Quote/order/ack/shipment/receipt/invoice reference/return/credit round trip reconciles |
| IC-117 | Transport pilot | Request/confirm/pickup/in-transit/delivery/exception states reconcile to internal custody/receipt evidence |
| IC-118 | Messaging/payment-reference boundary | Consent-safe delivery and provider references work without secrets/card data or false payment state |
| IC-119 | Governed partner API | Scopes, idempotency, pagination, rate limits, webhooks, audit, versioning, sandbox and deprecation pass |

**Exit gate:** Only adapter workflows with approved sandbox/pilot reconciliation may be labeled live.

## 14. M12 — Enterprise readiness and pilot

| ID | Slice | Acceptance |
| --- | --- | --- |
| IC-120 | Security/privacy validation | Threat/dependency/secret/access/tenant/upload/export/webhook tests pass with no critical findings |
| IC-121 | Accessibility validation | Approved desktop/tablet/mobile journeys pass keyboard, screen reader, focus, contrast, zoom/reflow and reduced motion |
| IC-122 | Performance/scale validation | Bounded pagination, peak users/volumes/events/views/exports, latency, lag and long-running jobs meet targets |
| IC-123 | Reliability/recovery validation | Retry/replay/outage/circuit breaker, backup/restore, RPO/RTO, DR, reconciliation and rollback meet targets |
| IC-124 | Observability/support readiness | SLOs, metrics/logs/traces, alerts, runbooks, incidents, owners, training, communications and support tools pass |
| IC-125 | Data migration and shadow validation | Dry run, lineage, conflict review, source/target totals, shadow projections, manual comparisons and no synthetic authority pass |
| IC-126 | Limited pilot | Approved location/roles/slices/commands/integrations operate within error, task-time, incident, mismatch and support thresholds |
| IC-127 | Pause/rollback exercise | Feature policy, adapter kill switch, command pause, read continuity, recovery, evidence retention and resume gate pass |
| IC-128 | Outcome review and calibration | Baselines/targets, decision outcomes, data quality, recommendation error, workload and benefit meet approved thresholds |
| IC-129 | Expansion/GA decision | Business, data, security, reliability, experience, operations, measurement and executive sign-off recorded |

## 15. Critical path

```text
M0 → M1 → M2 → M3
              ├→ M4 → M5 → M6
              ├→ M7 → M8
              └→ M9
M4/M5/M6/M7/M8/M9 → M10 → M11 → M12
```

M7 may begin after M1, but its console integration depends on M2/M3 contracts. M8 depends on Shop demand/readiness and parts-ledger conformance. M9 depends on InventoryUnit, title/release, costs, and integration acknowledgement. M11 provider work may run in sandbox after the relevant domain contract stabilizes, but external states cannot define domain completion.

## 16. Release gates

No milestone advances to wider activation until all applicable gates pass:

1. **Product:** Approved journey, terminology, visual source, and change traceability.
2. **Business:** Named owner signs representative operational cases.
3. **Domain/data:** Invariants, amounts/quantities/custody, projections, drill-throughs, and reconciliation pass.
4. **Security/governance:** Tenant/location/role/field/amount, privacy, audit, retention, and separation-of-duties pass.
5. **Integration:** Authority, acknowledgement, retry/replay, failure, reconciliation, and fallback pass.
6. **Experience:** Responsive, accessibility, task-time, non-happy states, and honest capability labels pass.
7. **Reliability:** Performance, lag, observability, backup/restore, outage, rollback, and support pass.
8. **Measurement:** Baseline, target, outcome window, error/mismatch/incident thresholds, and rollback trigger are approved.

## 17. Recommended first implementation batch

After explicit code authorization, start with:

1. IC-010 through IC-017 foundation conformance.
2. IC-020 through IC-024 shell, scope, search, saved views, and launcher.
3. IC-030 through IC-037 read-only lifecycle projections using fixed fixtures.
4. IC-038 and IC-039 Inventory Lifecycle landing and Control Tower reads.
5. Only then activate one bounded command slice, selected from IC-040 acquisition intake or IC-050 acquisition/transport, under manual-start pilot policy.

Do not begin by wiring approved mockups directly to loosely shaped tables or enabling generic “change stage” commands.

## 18. Change control

Milestone status, scope, dependency, or acceptance changes require evidence and coordinated roadmap/architecture updates. Near-complete UI, deployed schema, or passing happy-path tests do not satisfy a milestone without its authority, failure, reconciliation, accessibility, observability, and rollout evidence.
