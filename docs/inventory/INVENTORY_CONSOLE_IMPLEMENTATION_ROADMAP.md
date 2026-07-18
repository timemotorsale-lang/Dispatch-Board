# Inventory Console Implementation Roadmap

**Product:** Time Motor Sales Dispatch Board  
**Program:** Enterprise Inventory Console  
**Version:** 1.0 planning baseline  
**Date:** 2026-07-18  
**Status:** Documentation only; implementation is not authorized by this roadmap  
**Architecture:** [`INVENTORY_CONSOLE_IMPLEMENTATION_ARCHITECTURE.md`](INVENTORY_CONSOLE_IMPLEMENTATION_ARCHITECTURE.md)  
**Milestones:** [`INVENTORY_CONSOLE_IMPLEMENTATION_MILESTONES.md`](INVENTORY_CONSOLE_IMPLEMENTATION_MILESTONES.md)  
**Program index:** [`INVENTORY_CONSOLE_IMPLEMENTATION_PROGRAM.md`](INVENTORY_CONSOLE_IMPLEMENTATION_PROGRAM.md)

## 1. Program outcome

Deliver one enterprise Inventory Console that lets authorized staff understand and operate the complete vehicle and parts lifecycle—from acquisition opportunity through receipt, recon, frontline, reservation, sale/delivery, transfer/wholesale, parts reconciliation, and external handoff—without duplicating records or hiding authority boundaries.

The program must improve staff flow while protecting identity, ownership, custody, safety, title, financial authority, customer commitments, auditability, data quality, and recoverability.

## 2. Approved product topology

The global Inventory Console retains exactly seven destinations:

1. Home
2. Inventory Lifecycle
3. Shop & Recon
4. Reviews
5. Approvals
6. Reports
7. Administration

Contextual deeper workspaces:

- Inventory Lifecycle → **Open Control Tower**
- Inventory Lifecycle → **Open Disposition & Wholesale**
- Shop & Recon → **Open Parts Operations**
- Any authorized context → **+ Start Workflow**
- Any governed context → Vehicle/Repair/Parts workbench, Review/Approval detail, or Event Log

No implementation may reintroduce a horizontal wall of global or module tabs that conflicts with the approved landing pages.

## 3. Scope

### Included

- Shared Inventory Console shell, search, location scope, saved views, filters, alerts, event log, and role-aware commands.
- Home, Inventory Lifecycle, Shop & Recon, Reviews, Approvals, Reports, and Administration landing experiences.
- Inventory Lifecycle Control Tower and authoritative projections.
- Acquisition opportunity, appraisal, comparable evidence, purchase limit, approval, acquisition, and transport handoff.
- Inventory-to-Frontline workflow: transport, receipt/custody, inspection/triage, recon planning, parts/repair, QC, title/documents, merchandising/pricing, and frontline release.
- Retail completion: availability, reservation, sale, delivery, cancellation/unwind, reversal, and reconciliation.
- Shop & Recon: RepairOrder, RepairJob, estimates/approvals, dispatch, technician/advisor execution, labor, QC, release, comeback, and close.
- Parts Operations: demand, reservations, requisitions, purchase orders, receiving, inventory/ledger, issue/install/return, transfers, recovery, counts, and advisory optimization.
- Disposition & Wholesale: candidates, appraisals, channels/listings, offers/bids, transfer/sale, settlement, exceptions, and advisory optimization.
- Tasks, blockers, reviews, approvals, event/audit history, documents/media, Vehicle 360, reporting, exports, administration, and policy controls.
- DMS/accounting, VIN/history/title, market/listing, auction/wholesale, parts-vendor, transport, messaging/payment-reference, and partner integration boundaries.
- Accessibility, security, privacy, observability, reconciliation, pilot, rollback, support, and multi-location scale.

### Excluded unless separately approved

- General ledger, payment processing, tax calculation, payroll, card data, or legal/title-system replacement.
- Autonomous purchase, pricing, scheduling, assignment, approval, sale, disposition, inventory adjustment, or write-off.
- Silent migration from ambiguous legacy facts into authoritative inventory ownership, custody, financial, or completion states.
- Provider-specific integration claims without a verified adapter and acknowledgement contract.

## 4. Execution principles

1. **One canonical identity:** Vehicle identifies the physical vehicle; InventoryUnit identifies one dealership-controlled commercial cycle.
2. **Commands change state:** UI labels, task completion, comments, projections, and recommendations never mutate domain state by themselves.
3. **Evidence before consequence:** Safety, title, custody, financial, customer, and policy evidence gates consequential actions.
4. **Human authority:** Recommendations explain and rank; authorized people decide and approve.
5. **Vertical slices:** Each implementation slice includes data, invariants, permissions, command/read contract, UI, audit/events, tests, observability, and rollback.
6. **Honest capability:** Planned, partial, stale, manual, sandbox, pending, rejected, and reconciled states remain explicit.
7. **No duplicate work systems:** Shared tasks, approvals, events, documents, and integrations are reused across domains.
8. **Progressive rollout:** Schema or code deployment cannot activate behavior; feature policy and pilot gates control exposure.
9. **Reconcile everything material:** Counts, stages, quantities, custody, amounts, acknowledgements, and KPI drill-throughs reconcile to authoritative evidence.
10. **No destructive history:** Corrections use supersession, reversal, or compensating events.

## 5. Release train

### R0 — Planning authorization and source alignment

**Outcome:** One approved implementation boundary and decision record.

- Freeze approved landing pages, deeper workspace images, navigation, role boundaries, workflow catalogs, and algorithm advisory limits.
- Resolve remaining dealership decisions, pilot scope, systems, thresholds, roles, evidence, authority, and rollback owners.
- Approve the roadmap, architecture, milestones, acceptance fixtures, and change-control process.
- Create traceability from every UI action to workflow, record, command, permission, task, approval, event, and integration effect.

**Exit:** Named product, operations, finance/title, security, data, integration, support, and pilot owners sign the no-code-to-code authorization gate.

### R1 — Shared enterprise foundation verification

**Outcome:** Reusable identity, tenancy, command, audit, work, evidence, and rollout foundations are proven for the Inventory Console.

- Verify canonical Vehicle and InventoryUnit boundaries.
- Verify organization/location tenancy, capabilities, delegated authority, separation of duties, integer-cent amounts, idempotency, optimistic concurrency, audit, domain events, and outbox.
- Verify shared tasks, blockers, reviews, approvals, documents/media, saved views, search, event log, policy/version, and rollout controls.
- Define migration, compatibility, archival, restore, replay, and recovery expectations.

**Exit:** A foundation conformance suite passes representative cross-domain commands and permission isolation.

### R2 — Shared console shell and Home

**Outcome:** Staff reach the correct enterprise landing experience and can start or navigate work safely.

- Implement seven approved global destinations and responsive shell.
- Implement universal search, permitted location scope, live-data indicator, alerts, help, user controls, saved views, filters, event log, and **+ Start Workflow**.
- Connect Home KPIs, attention breakdown, priority work, Reviews & Approvals, flow health, throughput, and integration health to governed projections.
- Preserve explicit routes to Inventory Lifecycle, Shop & Recon, Wholesale, Parts, Reviews, and Approvals.

**Exit:** No representative data remains; every value/action has authoritative or honestly unavailable behavior.

### R3 — Inventory Lifecycle projections and Control Tower

**Outcome:** Inventory Lifecycle becomes a live operational overview with deeper analysis.

- Implement scope/capability, lifecycle summary, stage, dependency, priority work, exception, review, approval, recommendation, capital/aging, selected-asset, and data-health projections.
- Implement KPI envelopes, clocks, targets, filters, saved views, drill-through, breadcrumb, **Open Control Tower**, and context-preserving return.
- Reconcile stage totals, clocks, costs, tasks, reviews/approvals, exceptions, and KPI populations.
- Preserve default landing-page composition and deeper cross-lane Control Tower without restoring cluttered tabs.

**Exit:** Fixed fixtures and pilot data reconcile by hand; stale/partial/lag/failure states are demonstrated.

### R4 — Acquisition and Appraisal

**Outcome:** Staff can evaluate and authorize acquisitions without confusing opportunities with owned inventory.

- Opportunity intake, identity/evidence qualification, appraisal/comparables, immutable versions, confidence, valuation, maximum all-in/bid, authority, bid/offer/counter, accepted commitment, financial acquisition, InventoryUnit creation, correction/reversal, and transport handoff.
- Advisory acquisition, market fit, comparable, valuation, cost/turn, capital, counterparty, and outcome algorithms.
- Integrate **Add / Acquire Vehicle** only after authoritative approval and acquisition evidence.

**Exit:** No appraisal, recommendation, import, or staff assertion can create owned inventory or exceed authority.

### R5 — Inventory-to-Frontline

**Outcome:** Every acquired retail unit moves through evidence-backed preparation with one accountable owner and visible exceptions.

Deliver nine approved slices:

1. Acquisition validation and transport
2. Receipt and custody
3. Inspection and triage
4. Recon planning and approval
5. Parts and repair execution
6. Quality and safety verification
7. Title/document readiness
8. Merchandising, pricing, and channel publication
9. Frontline release, availability, suspension, and reinstatement

**Exit:** Full tabletop cases pass; no critical gate is averaged away; stage projection matches authoritative evidence.

### R6 — Retail completion

**Outcome:** Frontline vehicles move safely through availability, deal reservation, sale, delivery, unwind, and reconciliation.

- Available-for-sale, reservation, extension/expiry/release, competing-demand conflict, sale authorization, delivery readiness, title/release, custody handoff, delivered state, downstream acknowledgement, cancellation/unwind, reversal, inventory re-entry, and reconciliation.
- Preserve CRM/DMS/customer/deal identity boundaries and payment-reference-only handling.
- Connect sale/delivery clocks, priorities, reviews, approvals, and exceptions to Inventory Lifecycle.

**Exit:** Sale/delivery completion cannot be claimed without operational and required external evidence; unwind restores a valid governed state.

### R7 — Shop & Recon

**Outcome:** Customer Repair and Inventory Recon share enterprise foundations but remain visibly and operationally distinct.

- Appointment/walk-in intake, RepairOrder/RepairJob, inspection/diagnosis, estimate/change orders, authorization, readiness, planning, dispatch, technician/advisor workspaces, labor, resources, parts dependencies, QC/rework, release, comeback, production metrics, invoice-ready close, and controlled reopen.
- Implement Shop & Recon landing page, production pipeline, priority work, Reviews & Approvals, and deeper workbenches.
- Ensure successful inventory recon hands back to the correct Inventory Lifecycle stage.

**Exit:** Representative customer and inventory-recon cases pass without cross-ownership or lifecycle contamination.

### R8 — Parts Operations

**Outcome:** Parts demand, supply, custody, quantity, procurement, and recovery reconcile end to end.

- Demand/reservation, fitment/substitutes, requisitions/source comparison, purchase orders, receiving/discrepancies, bin/ledger inventory, issue/install/unused return, transfers, cores/warranty/vendor returns, counts/adjustments, replenishment/obsolescence advice, and exception resolution.
- Implement the approved nine local destinations within the deeper Parts workspace.
- Connect Shop readiness and Inventory Recon dependencies without duplicate reservations or negative stock.

**Exit:** Quantity, custody, PO/receipt, transfer, recovery, count, and job allocation fixtures reconcile under retries and concurrency.

### R9 — Disposition & Wholesale

**Outcome:** Eligible inventory exits through governed appraisal, channel, offer, sale/transfer, and settlement decisions.

- Candidate review, disposition appraisal, channel/price/reserve comparison, approvals, activation acknowledgement, offers/bids, counter/accept/reject, title/release/custody, sale/transfer, settlement, mismatch, reconciliation, and exceptions.
- Implement seven approved local destinations and eight business milestones.
- Keep channel, valuation, price/reserve, offer, recovery, and settlement algorithms advisory.

**Exit:** No channel is shown active and no unit sold/transferred/settled without required acknowledgement and reconciliation evidence.

### R10 — Cross-console work, reporting, and administration

**Outcome:** Managers operate the full console without domain-specific governance gaps.

- Enterprise Reviews and Approvals queues, task/blocker ownership, event/audit explorer, governed reports/exports, KPI scorecards, saved views, policy administration, role/capability administration, feature rollout, retention/legal hold, background operations, and support tooling.
- Ensure every dashboard value includes definition, scope, period, freshness, confidence, and drill-through.

**Exit:** Cross-domain permission, separation-of-duties, export, audit, retention, and policy-change cases pass.

### R11 — Integration ecosystem and reconciliation

**Outcome:** Priority external workflows round-trip safely with source authority and failure recovery.

- Approve integration registry/source matrix and adapter contracts.
- Pilot DMS/accounting, VIN/history/title, market/listing/auction, parts vendor, transport, messaging/payment-reference, and partner API integrations in risk order.
- Implement external identities, acknowledgement states, inbox/outbox, idempotency, mapping, lineage, rate limits, retry/circuit breaker, dead letters, replay, conflict, and reconciliation.
- Preserve manual/degraded paths and never overwrite human evidence silently.

**Exit:** Each activated adapter passes sandbox, duplicate/retry, outage, replay, mismatch, reconciliation, security, and rollback evidence.

### R12 — Enterprise readiness, pilot, and scale

**Outcome:** The complete Inventory Console is supportable, measurable, reversible, and ready for controlled expansion.

- Accessibility, responsive journeys, performance/load, security/privacy, backup/restore, disaster recovery, observability, support, training, runbooks, incident response, data migration/reconciliation, and release evidence.
- Shadow/manual validation, limited-role/location pilot, monitored expansion, pause/rollback, and multi-location policy inheritance.
- Calibrate targets and advisory algorithms from governed outcomes; never self-modify weights in production.

**Exit:** Business, data, security, reliability, experience, operations, measurement, and executive go/no-go gates pass.

## 6. Dependency sequence

```text
R0 Approval
  → R1 Foundations
  → R2 Shared Shell/Home
  → R3 Lifecycle Projections/Control Tower
      → R4 Acquisition & Appraisal
      → R5 Inventory-to-Frontline
      → R6 Retail Completion
      → R9 Wholesale
  → R7 Shop & Recon
      → R8 Parts Operations
  → R10 Cross-console governance/reporting
  → R11 External integrations
  → R12 Pilot and scale
```

R7 and R4 may begin after R1 in separate bounded teams, but their landing-page integration waits for R2/R3 contracts. R8 depends on Shop demand/readiness and shared ledger controls. R9 depends on InventoryUnit, title/release, cost/exposure, and external acknowledgement contracts. R11 adapter pilots may begin in sandbox after their domain contract is stable but cannot define domain state.

## 7. Rollout strategy

1. Documentation and decision approval.
2. Contract fixtures and read-only projections.
3. Internal/demo environment with synthetic governed fixtures.
4. Shadow reads against pilot data.
5. Manual-start commands for trained roles.
6. One location and narrow workflow slice.
7. Monitored expansion by role, location, and command.
8. General availability only after outcome and rollback gates.

Feature policy controls reads, commands, integrations, algorithms, and exports separately. Deployment never equals activation.

## 8. Program success measures

- Time to identify and own critical work.
- Acquisition-to-receipt, receipt-to-frontline, frontline-to-sale, and sold-to-delivery time.
- Stage target attainment and unexplained idle time.
- First-pass inspection/recon/QC readiness.
- Parts fill, stockout, receiving accuracy, quantity/custody reconciliation, and credit recovery.
- Aged capital exposure, turn, realized gross/day, and disposition recovery.
- Reservation, sale/delivery, wholesale, and settlement reconciliation accuracy.
- Review/approval response, override reasons, outcome coverage, and recommendation error.
- Required-field completeness, freshness, conflicts, duplicates, projection lag, and integration success.
- Staff task time, accessibility completion, support volume, incident rate, restore/replay success, and pilot rollback readiness.

## 9. Program stop conditions

Pause the affected slice or rollout when:

- identity, tenant/location, ownership, custody, quantity, title/release, amount, or audit reconciliation fails;
- a command bypasses authority, approval, separation of duties, idempotency, or optimistic concurrency;
- a projection or UI represents planned, stale, partial, requested, or externally unacknowledged state as complete;
- safety/compliance or customer-delivery hard rules can be hidden by a score;
- negative stock, duplicate InventoryUnits/reservations/commitments, or destructive history changes are possible;
- accessibility, performance, security, privacy, backup/restore, observability, or support gates fail;
- pilot outcomes exceed approved error, mismatch, incident, workload, or rollback thresholds.

## 10. Change control

Roadmap changes that alter approved navigation, domain boundaries, milestone order, authority, source-of-truth ownership, external-system responsibility, pilot scope, or release gates require versioned product and architecture approval. A schedule change does not authorize scope expansion or reduced controls.
