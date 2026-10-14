# ADR — Parts ledger, costing, and repair readiness

**Status:** Approved for Milestone 5A

## Decision

`PartStockLedgerEntry` is the immutable quantity and cost fact. `PartStockBalance` is a rebuildable projection by part and stock location. No API may edit on-hand, allocated, available, damaged, ordered, backordered, or average cost directly.

On-hand cannot be negative. Allocation cannot be negative or exceed usable on-hand. Available quantity always equals on-hand minus allocated minus damaged. A reservation must point to an active repair demand, use the same part and business location as the repair order, fit remaining demand, and fit current available stock. Serializable command transactions prevent concurrent double allocation.

Receipts establish or increase stock and update moving weighted-average cost. Negative adjustments require verified available quantity and an attributable reason. Corrections reverse a specific unreversed ledger entry and retain both facts. A reversal never deletes or rewrites history. Counts, issues, installations, returns, transfers, and damage movements will use the same ledger contract in later slices.

`RepairPartDemand` belongs to the repair order until the governed RepairJob aggregate exists. `repairJobReference` is a migration-safe promotion boundary, not a substitute aggregate. `RepairReadinessEvaluation` is immutable evidence. Readiness is true only when at least one active demand exists and every required quantity is fully reserved. Missing demand and incomplete reservation produce distinct reason codes.

## Financial boundary

The ledger retains quantity, unit cost, source document, actor, reason, time, reversal, and correlation evidence. It does not post payables, general-ledger journals, inventory valuation adjustments, or vendor invoices in 5A. Accounting/DMS handoff will consume idempotent outbox events through an adapter and return acknowledgement/reconciliation evidence. Vendor schemas do not become internal domain models.

## Deferred scope

Interchange and vendor masters, purchasing, receiving discrepancies, issue/install/unused return, transfers, core and warranty recovery, vendor returns, cycle counts, replenishment, obsolescence execution, and full RepairJob demand are later cards. Their event vocabulary is reserved, but 5A does not expose premature commands.
