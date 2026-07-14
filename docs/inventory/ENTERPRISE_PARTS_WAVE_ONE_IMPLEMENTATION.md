# Wave 1 — Complete Enterprise Parts Operations

**Milestones:** 5E–5G (`VEH-081` through `VEH-083`)  
**Implemented:** 2026-07-14  
**Deployment status:** Source-controlled implementation complete; migration not deployed by this change.

## 5E — Cycle counts and controlled adjustments

- Adds full, cycle, and spot-count aggregates with an immutable balance snapshot and ledger cutoff.
- Supports blind counts and accountable counter assignment.
- `OBSERVE` mode reconciles ledger movements between cutoff and physical observation before calculating variance.
- `FREEZE` mode blocks new stock-ledger movements at the location until the count posts or is cancelled.
- Every line records physical quantity, expected quantity at observation, variance value, evidence, counter, reason, and time.
- Nonzero variance requires approval by a user other than the counter.
- Posting creates an immutable `ADJUST` ledger entry per approved nonzero variance; zero-variance counts do not manufacture ledger movements.
- Adjustments that would conflict with allocated or damaged stock are rejected.

## 5F — Replenishment and obsolescence recommendations

- Adds effective-dated part/location policies with ABC class, lead time, review period, service target, safety stock, optional reorder point, optional EOQ, optional maximum stock, ordering cost, holding rate, and obsolescence threshold.
- Generates immutable recommendation runs from policy versions, balance versions, issue-ledger evidence, and a governed analysis window.
- Calculates average daily demand, demand variability, derived XYZ class, reorder point, EOQ, inventory position, days since last issue, confidence, recommended quantity, and estimated cost.
- Detects source-location surplus and changes a reorder signal to a transfer-review signal when appropriate.
- Produces reorder, transfer-review, obsolescence-review, or no-action outcomes with reason codes and source evidence.
- Recommendations are advisory only. A user may acknowledge or dismiss them with an audited reason; they never create a PO, transfer, or adjustment automatically.

## 5G — Completed parts counter and receiving workspace

- Adds `/vehicles/parts-counter` as the live counter and inventory-control workspace.
- Resolves scanner/keyboard-wedge input through governed GTIN, UPC, OEM, internal, or vendor aliases to the canonical part master.
- Shows on-hand, allocated, available, and ordered stock by location.
- Exposes controlled reservation issue, unused return, purchase-order receipt, discrepancy resolution, cycle-count execution, policy versioning, and recommendation review.
- Links to the existing demand/reservation and sourcing/purchasing/recovery workspaces rather than duplicating their aggregates.

## Enterprise controls

- `PARTS_VIEW` and `PARTS_MANAGE` remain server-enforced.
- Parts Operations rollout gates remain authoritative.
- Every mutation uses the established idempotency, optimistic-version, serializable transaction, audit, domain-event, and transactional-outbox foundation.
- Database constraints enforce count timelines, variance arithmetic, independent approval, active-count uniqueness, active-policy uniqueness, recommendation/decision coherence, and normalized barcode aliases.
- Immutable triggers protect count history and recommendation-run evidence.
- A database freeze trigger protects every ledger insertion path, including older receipt/reservation services.

## Deliberate boundaries

- Barcode hardware drivers, mobile camera scanning, label printers, and vendor catalog integrations are not included. The workspace is compatible with scanners that enter codes as keyboard input.
- Recommendations do not self-purchase, self-transfer, or self-dispose inventory.
- Forecast backtesting, automatic policy tuning, and multi-echelon optimization remain later analytics capabilities.
- Migration deployment, data backfill, live pilot activation, and physical-count reconciliation are operational release steps and were not performed here.
