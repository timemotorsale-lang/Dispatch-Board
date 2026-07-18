# R8 Parts Operations Implementation

Status: bounded repository implementation complete; activation pending  
Roadmap release: R8  
Milestone: M8  
Slices: IC-080 through IC-089

## 1. Outcome

R8 establishes `/vehicles/parts-operations` as the permission-aware operating entry for the enterprise Parts lifecycle. The release composes the existing ledger, demand/readiness, sourcing, purchasing, receiving, custody, transfer, recovery, count, and recommendation aggregates rather than creating a parallel Parts state model.

The landing retains its place beneath Shop & Recon and does not add an eighth global Inventory Console destination.

## 2. Enterprise workspace

The approved nine local destinations now have stable URL state:

| Destination | URL state | Governed command surface |
| --- | --- | --- |
| Overview | `/vehicles/parts-operations` | Contextual handoff |
| Demand | `?view=demand` | `/vehicles/parts` |
| Requisitions | `?view=requisitions` | `/vehicles/service-close-parts` |
| Purchase Orders | `?view=purchase-orders` | `/vehicles/service-close-parts` |
| Receiving | `?view=receiving` | `/vehicles/parts-counter` |
| Inventory | `?view=inventory` | `/vehicles/parts-counter` |
| Transfers | `?view=transfers` | `/vehicles/service-close-parts` |
| Returns & Recovery | `?view=returns-recovery` | `/vehicles/service-close-parts` |
| Counts & Exceptions | `?view=counts-exceptions` | `/vehicles/parts-counter` |

Each destination applies its own work-kind projection while retaining working search, location, work-type, and attention filters. Dead controls are not presented as available: saved views and export remain visibly disabled until their governed R10 contracts exist.

The landing exposes a versioned read contract at `GET /api/parts-operations`. It returns only Parts-authorized source data. The broader service-close payload, which also contains repair-order close records, is not sent to a Parts-only landing user.

## 3. Slice conformance

| Slice | Repository implementation |
| --- | --- |
| IC-080 | Active Part, vendor, warehouse/bin/staging/damaged locations, immutable stock ledger, balance projection, average cost, negative-stock prevention, count freeze, and explicit reversal foundations remain authoritative. |
| IC-081 | RepairJob/RepairOrder demand, required quantity/date, reservation, release, duplicate protection, optimistic aggregate version, available-stock enforcement, and readiness evaluation remain authoritative. |
| IC-082 | Effective vendor offers preserve price, availability, ETA, reliability, warranty, returns, and freshness. Requisitions freeze the full eligible comparison before a selected source is recorded. Fitment-evidenced interchange remains governed. |
| IC-083 | Purchase orders support draft, independent approval, issue, acknowledgement, controlled pre-issue revision, cancellation, partial/full receipt, and close. Revision returns an approved order to draft and explicitly invalidates its prior approval. Idempotency and expected aggregate version remain mandatory. |
| IC-084 | Receipt identity, scan/manual source, quantities, damage, cost, bin, immutable ledger movement, short/over/wrong/damaged/cost discrepancy, ownership, and resolution remain authoritative. |
| IC-085 | Reservation-backed issue, install evidence, unused return, technician/job/vehicle context, over-allocation protection, custody events, and downstream readiness remain authoritative. |
| IC-086 | Cross-location transfer protects source balance, requires an independent authorized release actor, records paired shipment/receipt movements and custody, and preserves discrepancy, cancellation, cost, idempotency, and concurrency evidence. |
| IC-087 | Core, warranty, and vendor-return cases preserve eligibility source, deadline, shipment, acknowledgement, expected/actual credit, dispute, and write-off. Write-off requires an authorized actor other than the case creator. |
| IC-088 | Full/cycle/spot count, freeze/observe modes, blind observation, ledger-cutoff reconciliation, independent variance approval, adjustment posting, effective policies, replenishment/transfer/obsolescence advice, evidence, confidence, and non-execution remain authoritative. |
| IC-089 | Nine local destinations, nine business milestones, destination queues, reviews/approvals, KPIs, recommendation explanation, responsive layout, honest capabilities, stable API projection, and deeper-workspace handoffs are implemented. |

## 4. Approval and mutation boundaries

- Purchase approval rejects the purchase-order preparer as approver.
- Transfer release rejects the transfer preparer as releasing actor.
- Recovery write-off rejects the recovery-case creator as write-off actor.
- Nonzero count variance already requires a reviewer other than the counter.
- Purchase-order revision is limited to draft or approved state, is version checked, recalculates the exact amount, returns the order to draft, and invalidates approval.
- Every quantity or custody mutation continues through a server-authorized command with idempotency, optimistic version, serializable transaction, audit event, domain event, outbox message, and immutable ledger/custody evidence as applicable.
- Recommendations remain advisory and cannot create a purchase, transfer, adjustment, or disposal action.

## 5. Capability truth

- Vendor adapters are disabled.
- Barcode hardware is unverified, with manual entry fallback.
- Recommendations are advisory and non-executing.
- Saved views and export are not activated in R8.
- Accounting/DMS posting has no live acknowledgement claim.

## 6. Verification evidence

- TypeScript typecheck: passed.
- Focused Parts gate: 7 test files, 20 tests passed.
- Full lint: passed with zero warnings.
- Prisma schema validation: passed.
- Production build: passed; 145 routes generated, including `/vehicles/parts-operations` and `/api/parts-operations`.
- No new Prisma model or migration was required for this R8 conformance release. Existing Parts migrations remain subject to environment deployment controls.

## 7. Activation boundary

Repository completion does not authorize production activation. The following remain pending:

- configurable purchase, substitution, transfer, variance, policy-exception, and write-off dollar/delegation thresholds;
- pilot location and role assignments plus representative volume evidence;
- live scanner, label-printer, vendor, DMS/accounting, messaging, and supplier acknowledgement adapters;
- real concurrent reservation, receipt, transfer, count, approval, and reversal exercises;
- accessibility review with keyboard/scanner workflows and constrained-width devices;
- production-volume query, queue, ledger-reconciliation, and freshness testing;
- operational training, support/runbook acceptance, monitored pilot, and rollback approval.

Until these gates pass, manual/degraded provider paths remain visible and no recommendation can execute a consequential action.
