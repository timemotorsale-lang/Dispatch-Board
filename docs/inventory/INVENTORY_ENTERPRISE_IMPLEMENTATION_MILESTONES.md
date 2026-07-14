# Vehicle Operations Enterprise Implementation Milestones

**Version:** 1.0  
**Date:** 2026-07-13  
**Status legend:** `[x]` evidenced in repository, `[~]` partial foundation, `[ ]` planned  
**Roadmap:** [`INVENTORY_ENTERPRISE_ROADMAP.md`](INVENTORY_ENTERPRISE_ROADMAP.md)  
**Architecture:** [`INVENTORY_ENTERPRISE_ARCHITECTURE.md`](INVENTORY_ENTERPRISE_ARCHITECTURE.md)
**Governance baseline:** [`governance/README.md`](governance/README.md)

## Delivery contract

Every implementation card must be a reviewable vertical slice and include, where applicable:

- schema and migration with backward/rollback strategy
- domain invariant and server-side permission
- command/service and repository transaction
- stable API contract and idempotency/concurrency behavior
- audit, domain event, activity/task side effects, and observability
- live UI with loading, empty, stale, partial, unauthorized, conflict, failure, and recovery states
- unit, repository, integration, browser, accessibility, and performance coverage proportional to risk
- documentation and evidence that planned behavior is not reported as implemented early

## M0 — Program and algorithm baseline

| ID | Status | Slice | Acceptance |
| --- | --- | --- | --- |
| VEH-000 | [x] | Define retail, shop, and parts lifecycle boundaries | Source-of-truth algorithms distinguish customer repair, inventory recon, and retail inventory. |
| VEH-001 | [x] | Implement deterministic decision foundation | Versioned lifecycle, vehicle, shop, parts, KPI, command, and safety helpers have automated tests. |
| VEH-002 | [x] | Create Inventory Control Tower prototype | `/vehicles` exposes the approved visual direction while remaining clearly non-durable prototype data. |
| VEH-003 | [x] | Approve enterprise architecture and roadmap | Architecture, roadmap, and milestone backlog exist and distinguish current from target behavior. |
| VEH-004 | [x] | [Create domain glossary and RACI](governance/VEHICLE_OPERATIONS_GLOSSARY_RACI.md) | Every stage, amount, clock, status, owner, approval, and source of truth has one approved definition and accountable business owner. |
| VEH-005 | [x] | [Approve KPI catalog v1](governance/VEHICLE_OPERATIONS_KPI_CATALOG.md) | KPI formulas, exclusions, time zones, units, reporting windows, owners, and drill-through sources are versioned. |
| VEH-006 | [x] | [Create threat model and data classification](governance/VEHICLE_OPERATIONS_THREAT_MODEL.md) | Vehicle, customer, financial, document, credential, audit, and integration risks have mitigations and owners. |
| VEH-007 | [x] | [Approve SLO, backup, retention, and incident policies](governance/VEHICLE_OPERATIONS_RELIABILITY_POLICY.md) | Availability, latency, freshness, recovery, retention, paging, and incident targets are testable. |

## M1 — Enterprise command and tenancy foundation

Implementation evidence: [`VEHICLE_OPERATIONS_COMMAND_FOUNDATION.md`](VEHICLE_OPERATIONS_COMMAND_FOUNDATION.md)

| ID | Status | Slice | Acceptance |
| --- | --- | --- | --- |
| VEH-010 | [x] | Consolidate organization and location tenancy | Existing foundations are extended so every new vehicle-domain record has enforced organization/location scope. |
| VEH-011 | [x] | Add vehicle capability policy registry | Read and mutation capabilities are server-enforced by role, location, ownership, amount, and delegated authority. |
| VEH-012 | [x] | Add command ledger and idempotency contract | Retried commands return the original outcome and conflicting payloads are rejected. |
| VEH-013 | [x] | Add optimistic concurrency | Mutations reject stale aggregate versions with a recoverable conflict response and UI. |
| VEH-014 | [x] | Add domain-event and immutable audit foundation | Aggregate, event, audit, and activity/outbox writes commit atomically with one correlation ID. |
| VEH-015 | [x] | Add transactional outbox and worker | Published side effects are retry-safe, observable, replayable, and cannot be lost after an accepted command. |
| VEH-016 | [x] | Add feature rollout controls | Vehicle features support off, shadow, pilot-location, percentage, general, and rollback states. |
| VEH-017 | [x] | Add operational health projection | Managers/operators can see command, job, projection, and integration health without accessing secrets. |

## M2 — Canonical vehicle registry

Implementation evidence: [`VEHICLE_REGISTRY_IMPLEMENTATION.md`](VEHICLE_REGISTRY_IMPLEMENTATION.md) · ADR/migration map: [`VEHICLE_REGISTRY_ADR_MIGRATION_MAP.md`](VEHICLE_REGISTRY_ADR_MIGRATION_MAP.md)

| ID | Status | Slice | Acceptance |
| --- | --- | --- | --- |
| VEH-020 | [x] | Approve Vehicle ADR and migration map | Existing Vehicle, CustomerVehicle, appointment snapshots, and task references have one no-loss migration plan. |
| VEH-021 | [x] | Add canonical vehicle identity | VIN normalization, raw value, stock identity, non-VIN exception, and organization uniqueness are enforced. |
| VEH-022 | [x] | Add vehicle ownership and usage relationships | Customer, dealership, trade, consignment, sold, and historical relationships are effective-dated and auditable. |
| VEH-023 | [x] | Add external identity map | Every external vehicle ID retains system, authority, mapping version, sync time, and conflict state. |
| VEH-024 | [x] | Add odometer observation ledger | Readings are append-only; implausible sequence and correction workflows create visible exceptions. |
| VEH-025 | [x] | Add vehicle custody and location events | Current location is projected from attributable moves, check-in/out, transport, bay, lot, and delivery events. |
| VEH-026 | [x] | Add vehicle duplicate-review workflow | Potential duplicates are blocked from silent merge and managers can resolve with retained lineage. |
| VEH-027 | [x] | Add vehicle registry APIs and search | VIN, partial VIN, stock, plate, year/make/model, customer, and external ID searches are tenant-safe and paginated. |
| VEH-028 | [x] | Add vehicle identity UI and import preview | Users can create, inspect, validate, import, reconcile, and correct identities without raw database access. |

## M3 — Retail inventory lifecycle

### M3A — Inventory unit foundation

Implementation evidence: [`INVENTORY_UNIT_FOUNDATION_IMPLEMENTATION.md`](INVENTORY_UNIT_FOUNDATION_IMPLEMENTATION.md) · ADR: [`INVENTORY_UNIT_FOUNDATION_ADR.md`](INVENTORY_UNIT_FOUNDATION_ADR.md)

| ID | Status | Slice | Acceptance |
| --- | --- | --- | --- |
| VEH-030 | [x] | Add InventoryUnit aggregate | Dealership-owned inventory has financial acquisition time, lifecycle stage, version, owner, location, target, and state history. |
| VEH-031 | [ ] | Add acquisition and appraisal records | Condition, comparables, evidence, confidence, estimate, and decision history are retained independently of recommendation output. |
| VEH-032 | [ ] | Add purchase-limit and authorization command | Maximum bid is reproducible; purchases above authority or without required evidence are rejected and audited. |
| VEH-033 | [ ] | Add transport, receipt, and intake commands | Custody, damage, keys, documents, source, arrival, and intake exceptions are captured at receipt. |
| VEH-034 | [ ] | Add inspection and recon-plan handoff | Inspection findings create a versioned recon plan and linked inventory-recon RepairOrder without duplicating tasks. |
| VEH-035 | [ ] | Add title/document readiness | Required documents, statuses, owners, evidence, external dependencies, and stop rules gate frontline/delivery. |
| VEH-036 | [ ] | Add merchandising package | Photos, video, description, option verification, listing destinations, publish evidence, and freshness are tracked. |
| VEH-037 | [ ] | Add frontline readiness command | Critical evidence gates cannot be averaged away; failed gates return exact reasons and owners. |
| VEH-038 | [ ] | Add reservation, sale, delivery, and reversal commands | Deal-pending, sale, unwind, delivery, and disposition changes are controlled, attributable, and accounting-integration ready. |
| VEH-039 | [ ] | Add inventory costs and exposure | Acquisition, recon, title, merchandising, carrying, committed, incurred, estimated, and recovered values retain source and confidence. |
| VEH-040 | [ ] | Add lifecycle SLA and velocity policies | Stage targets and 72/30/45 defaults are configurable, effective-dated, simulated, approved, and manager-overridable. |
| VEH-041 | [ ] | Add inventory control-tower projection/API | Live totals, stages, clocks, exceptions, aging, confidence, and value-at-risk reconcile to source records. |
| VEH-042 | [ ] | Connect live control-tower UI | Prototype values are removed; selection, filters, saved views, commands, and honest failure/stale states use live APIs. |

## M4 — Shop and repair orders

Service-close implementation evidence: [`SERVICE_CLOSE_PARTS_OPERATIONS_IMPLEMENTATION.md`](SERVICE_CLOSE_PARTS_OPERATIONS_IMPLEMENTATION.md)

| ID | Status | Slice | Acceptance |
| --- | --- | --- | --- |
| VEH-050 | [x] | Approve RepairOrder aggregate ADR | RepairOrder, jobs, inspections, approvals, labor, parts, totals, close/reopen, and DMS boundary are explicit. |
| VEH-051 | [x] | Add appointment/walk-in service intake | Appointments convert idempotently; customer, vehicle, concern, promise, consent, keys, transport, and intake evidence persist. |
| VEH-052 | [x] | Add Digital Vehicle Inspection | Versioned templates capture pass/advisory/fail, measurements, notes, photos/video, author, and timestamps. |
| VEH-053 | [x] | Add concern-cause-correction and diagnostic flow | Diagnosis retains symptoms, tests, evidence, technician, uncertainty, recommendation, and change history. |
| VEH-054 | [x] | Add estimate and change-order versions | Labor, parts, fees, tax boundary, options, expiry, presentation, and revisions are immutable after presentation. |
| VEH-055 | [x] | Add authorization workflow | Accepted, declined, deferred, partial, expired, and revoked approvals reference the exact presented estimate version. |
| VEH-056 | [x] | Add RepairJob and readiness gates | Each job retains work type, labor guide, skill/certification, bay/tool, parts, authorization, priority, and dependencies. |
| VEH-057 | [x] | Add work templates and service procedures | Reusable tasks, inspections, safety steps, evidence, standard time, and QC rules are versioned and effective-dated. |
| VEH-058 | [x] | Add labor time ledger | Start, pause, reason, resume, finish, correction, overlap, present hours, and approved non-productive time are attributable. |
| VEH-059 | [x] | Add shop lane and priority projection | Fast-track eligibility, diagnostic/heavy route, schedule pressure, customer promise, safety, readiness, and explanation are live. |
| VEH-060 | [x] | Add technician/bay/resource requirements | Required skills, certifications, bay, tools, equipment, availability, location, and duration are separate from bookings. |
| VEH-061 | [x] | Add shop dispatch board | Dispatchers can filter qualified work, book/rebook, current/next stage, inspect conflicts, and record override reasons. |
| VEH-062 | [x] | Add technician execution workspace | Mobile users see current/next work, history, instructions, clocks, parts, evidence, blockers, and QC handoff with minimal taps. |
| VEH-063 | [x] | Add advisor service workspace | Advisors manage status, promises, estimates, approvals, customer contact, exceptions, and delivery readiness. |
| VEH-064 | [x] | Add QC and release gate | Applicable completion, safety, peer verification, road test, evidence, and failed-QC return paths are enforced. |
| VEH-065 | [x] | Add comeback and follow-up linkage | A comeback references original job/correction, reason review, warranty responsibility, cost, and outcome without punitive automation. |
| VEH-066 | [x] | Add shop production projections | Productivity, efficiency, proficiency, first-pass yield, quality-adjusted proficiency, idle causes, and confidence reconcile. |
| VEH-067 | [x] | Add invoice-ready service close and controlled reopen | Authorized jobs, installed-part custody, labor evidence, delivery readiness, release authorization, handoff evidence, close, and manager-reasoned reopen reconcile through audited commands. |

## M5 — Parts and procurement

Enterprise parts implementation evidence: [`SERVICE_CLOSE_PARTS_OPERATIONS_IMPLEMENTATION.md`](SERVICE_CLOSE_PARTS_OPERATIONS_IMPLEMENTATION.md)

Wave 1 completion evidence: [`ENTERPRISE_PARTS_WAVE_ONE_IMPLEMENTATION.md`](ENTERPRISE_PARTS_WAVE_ONE_IMPLEMENTATION.md)

| ID | Status | Slice | Acceptance |
| --- | --- | --- | --- |
| VEH-070 | [x] | Approve parts ledger and costing ADR | Quantity, availability, costing, financial handoff, reversal, count, and negative-stock rules are explicit. |
| VEH-071 | [x] | Add part, interchange, and vendor masters | Manufacturer/part numbers, supersession, substitutes, units, category, fitment evidence, vendors, and status are normalized. |
| VEH-072 | [x] | Add warehouses, bins, and stock balances | Physical/logical locations and current on-hand, allocated, available, ordered, backordered, and damaged projections exist. |
| VEH-073 | [x] | Add immutable parts stock ledger | Receipt, transfer, reserve, release, issue, install, return, adjust, and count events balance and reverse explicitly. |
| VEH-074 | [x] | Add RepairJob demand and reservation | Demand links to job and source; scarce allocation is authorized, explainable, and prevents double reservation. |
| VEH-075 | [x] | Add requisition and vendor comparison | Required date, alternatives, price, ETA, reliability, warranty, return terms, and manager selection are retained. |
| VEH-076 | [x] | Add purchase-order aggregate | Draft, approval, issue, acknowledgement, change, cancellation, partial/full receipt, and close are state-controlled. |
| VEH-077 | [x] | Add receiving and discrepancy workflow | Scan/manual receipt captures packing source, quantity, damage, wrong part, cost variance, bin, and exception ownership. |
| VEH-078 | [x] | Add issue, installation, and unused return | Part custody moves to technician/job/vehicle and unused quantities return through controlled ledger events. |
| VEH-079 | [x] | Add transfer workflow | Source availability, destination demand, custody, shipment, receipt, discrepancy, cost, and SLA reconcile across locations. |
| VEH-080 | [x] | Add core, warranty, and vendor return recovery | Eligibility, deadline, shipment, acknowledgement, expected/actual credit, dispute, and write-off approval are tracked. |
| VEH-081 | [x] | Add cycle counts and adjustments | Risk-based count plans freeze/observe affected stock; variances require reason and authority before adjustment. |
| VEH-082 | [x] | Add replenishment and obsolescence recommendations | ABC-XYZ, safety stock, reorder, EOQ, dead stock, substitution, and forecast confidence run in advisory mode. |
| VEH-083 | [x] | Add parts counter/receiving workspaces | Search, demand, PO, receive, reserve, issue, return, count, exception, and barcode-ready flows use live data. |

## M6 — Vehicle 360, documents, and knowledge

| ID | Status | Slice | Acceptance |
| --- | --- | --- | --- |
| VEH-090 | [x] | Add governed document/media service | Upload metadata, checksum, malware result, content type, retention, access, and evidence link are enforced. |
| VEH-091 | [x] | Add Vehicle 360 summary and timeline | Identity, owner, location, stage, work, risk, next action, milestones, and correlated events load from projections. |
| VEH-092 | [x] | Add Vehicle 360 operational tabs | Inventory, service, parts, appointments, documents, warranty, communications, costs, decisions, and audit are permission-aware. |
| VEH-093 | [x] | Add relationship graph | Customer, inventory, RO, jobs, parts, appointments, tasks, documents, claims, and external identities are navigable. |
| VEH-094 | [x] | Add global operational search | Vehicle, VIN, stock, customer, RO, job, appointment, part, PO, and document metadata search is fast and tenant-safe. |
| VEH-095 | [x] | Add procedures and knowledge links | Work types can surface approved procedures, bulletins, safety notes, and revision history without making external content authoritative. |
| VEH-096 | [x] | Add controlled exports and print views | Export/print respects field permissions, reason, watermarking where required, and audit evidence. |

## M7 — Customer, warranty, and commercial handoffs

| ID | Status | Slice | Acceptance |
| --- | --- | --- | --- |
| VEH-100 | [x] | Connect customer 360 and vehicle history | Existing customer records surface canonical vehicle, appointment, promise, case, and service history without duplicates. |
| VEH-101 | [x] | Add service promise and transportation flow | Arrival/completion windows, loaner/ride/wait needs, updates, breach, and recovery actions are explicit. |
| VEH-102 | [x] | Add consent and communication preferences | Channel, purpose, source, effective time, revocation, and quiet-time rules gate outbound communication. |
| VEH-103 | [x] | Add estimate approval experience | Authorized customers receive the exact version, approve/decline items, and generate delivery/failure evidence. |
| VEH-104 | [x] | Add service status timeline | Customer-safe milestones exclude internal-only notes and show current promise, delays, action needed, and contacts. |
| VEH-105 | [x] | Add warranty coverage and claim foundation | Coverage, eligibility, authorization, evidence, labor/parts, claim, decision, payment, and recovery are linked. |
| VEH-106 | [x] | Add invoice-ready service handoff | The internal source-linked package, submit/accept/reject states, controlled close, and returned-total reconciliation are implemented; vendor-specific adapters remain integration-platform work. |
| VEH-107 | [x] | Add sales/F&I/title/delivery handoffs | Vehicle readiness, agreed price reference, documents, sold status, funding/title dependencies, and delivery commands reconcile. |
| VEH-108 | [x] | Add customer/partner portal pilot | Least-privilege users can view approved vehicle/service data, appointments, approvals, documents, and status. |

## M8 — Enterprise administration and resilience

| ID | Status | Slice | Acceptance |
| --- | --- | --- | --- |
| VEH-110 | [x] | Add policy administration console | Version, preview, simulation, four-eyes approval, effective date, pilot, outcome, and rollback exist for material policies. |
| VEH-111 | [ ] | Add separation-of-duties and dollar limits | Purchase, adjustment, price, disposition, refund, warranty, and export rules cannot be self-approved when policy forbids it. |
| VEH-112 | [ ] | Add retention, legal hold, and privacy operations | Authorized operators can retain, hold, export, and dispose according to policy without deleting required audit evidence. |
| VEH-113 | [ ] | Add audit explorer | Authorized users filter by actor, vehicle, command, field, time, location, correlation, and source with export controls. |
| VEH-114 | [ ] | Add background-operations console | Jobs, retries, poison messages, dead letters, projection lag, replay, and operator actions are visible and audited. |
| VEH-115 | [ ] | Add backup/restore and disaster-recovery gate | Restore produces reconciled vehicle, ledger, command, event, audit, and projection totals within approved RPO/RTO. |
| VEH-116 | [ ] | Add security validation gate | Threat-model tests, dependency scanning, secret scanning, authorization matrix, tenant isolation, upload, and abuse cases pass. |
| VEH-117 | [ ] | Add accessibility and performance gate | Critical journeys meet approved WCAG, device, latency, concurrency, pagination, and load targets. |
| VEH-118 | [ ] | Add production pilot and rollback runbook | One location can enable, observe, stop, roll back, reconcile, and resume each program release safely. |

## M9 — Integration platform

| ID | Status | Slice | Acceptance |
| --- | --- | --- | --- |
| VEH-120 | [ ] | Inventory actual external systems | Owners, contracts, credentials, APIs, limits, data fields, authority, volumes, and failure expectations are documented. |
| VEH-121 | [ ] | Add integration registry and source matrix | Each field/workflow has authoritative source, allowed direction, frequency, conflict rule, freshness, and owner. |
| VEH-122 | [ ] | Add adapter SDK and contract harness | Adapters share auth, mapping, inbox/outbox, rate limit, retry, circuit breaker, lineage, metrics, and contract tests. |
| VEH-123 | [ ] | Add reconciliation and conflict console | Missing, duplicate, mismatched, stale, rejected, and out-of-balance records have owners and replay/resolution commands. |
| VEH-124 | [ ] | Deliver first DMS/accounting adapter pilot | The selected workflow round-trips in sandbox/pilot and reconciles IDs, states, amounts, and duplicates. |
| VEH-125 | [ ] | Deliver VIN/history/recall adapter | External facts show provider, retrieval time, freshness, confidence, and failure; they never overwrite user evidence silently. |
| VEH-126 | [ ] | Deliver market/listing adapter | Valuation, comparables, listing publication, errors, and freshness support advice without autonomous price changes. |
| VEH-127 | [ ] | Deliver parts vendor adapter | Availability, quote, order, acknowledgement, shipment, receipt, invoice reference, return, and credit reconcile. |
| VEH-128 | [ ] | Deliver messaging/payment boundaries | Consent-safe message delivery and payment references integrate without storing provider secrets or card data. |
| VEH-129 | [ ] | Publish governed partner API | Scopes, idempotency, pagination, rate limits, webhooks, audit, versioning, sandbox, and deprecation policy are enforced. |

## M10 — Reporting, optimization, and enterprise scale

| ID | Status | Slice | Acceptance |
| --- | --- | --- | --- |
| VEH-130 | [ ] | Add governed daily metric facts | Vehicle, shop, parts, customer, financial exposure, and data-quality snapshots are reproducible and immutable. |
| VEH-131 | [ ] | Add executive and departmental scorecards | Every value shows definition, period, scope, freshness, confidence, target, trend, and drill-through. |
| VEH-132 | [ ] | Add bottleneck and cohort analytics | Users compare stages, locations, vehicle classes, work types, vendors, and periods without changing metric definitions. |
| VEH-133 | [ ] | Add forecast evaluation harness | Training cutoff, baseline, backtest, error, drift, missing data, uncertainty, and approval are recorded before use. |
| VEH-134 | [ ] | Pilot capacity and scheduling recommendations | Shadow results respect hard rules and outperform the approved baseline before manager-preview rollout. |
| VEH-135 | [ ] | Pilot inventory and parts recommendations | Acquisition, aging, transfer, reorder, and disposition advice is explainable, outcome-tracked, and never self-executing. |
| VEH-136 | [ ] | Add responsible AI summary pilot | Summaries cite internal evidence, expose uncertainty, protect sensitive data, are evaluated, and have fallback/kill switch. |
| VEH-137 | [ ] | Add multi-location transfers and shared pools | Cross-location custody, stock, authority, cost, promise, receipt, and reconciliation pass concurrency tests. |
| VEH-138 | [ ] | Add organization hierarchy and policy inheritance | Central defaults and approved local overrides are effective-dated, traceable, and tenant-isolated. |
| VEH-139 | [ ] | Complete enterprise scale and recovery proof | Peak load, archival, long-running jobs, integration outage, region/host failure, restore, and replay meet approved targets. |

## Release gates

No milestone group advances to general availability until all applicable gates pass:

1. **Business:** pilot owner signs off on actual dealership workflow.
2. **Data:** identity, quantity, financial, and status reconciliation passes.
3. **Security:** permission, tenant/location, sensitive-data, and audit tests pass.
4. **Reliability:** failure, retry, replay, restore, rollback, and degraded-state tests pass.
5. **Experience:** desktop/mobile, accessibility, loading/error/conflict, and task-time targets pass.
6. **Operations:** health, alert, runbook, ownership, and support training are ready.
7. **Measurement:** baseline, target, outcome window, and rollback threshold are defined.

## Recommended first execution batch

Do not start by wiring the existing prototype directly to loosely shaped tables. The first safe batch is:

1. `VEH-004` through `VEH-007`
2. `VEH-010` through `VEH-017`
3. `VEH-020` through `VEH-028`
4. Then begin `VEH-030` retail inventory and `VEH-050` shop ADR work in separate small slices

This sequence makes identity, authority, idempotency, audit, and recovery available before the first live inventory command.

