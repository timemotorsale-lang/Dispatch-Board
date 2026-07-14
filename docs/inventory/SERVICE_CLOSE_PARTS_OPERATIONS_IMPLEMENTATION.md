# Milestones 4H–5D — Service Financial Close and Enterprise Parts Operations

**Implemented:** 2026-07-14  
**Status:** Repository implementation complete; migration is source-controlled and not deployed by this change.

## Delivered slices

### 4H — Service financial close

- Builds a versioned invoice-ready package from authorized repair jobs, installed-part custody, and labor/QC evidence.
- Records handoff states (`READY`, `SUBMITTED`, `ACCEPTED`, `REJECTED`) without pretending to be a payment processor or accounting ledger.
- Requires current delivery readiness, release authorization, a mismatch-free invoice package, verified keys, recipient, odometer, and handoff evidence before close.
- Writes the RepairOrder state event, close/reopen evidence, enterprise command, audit event, domain event, and outbox message atomically.
- Reopen is an explicit manager-reasoned command that returns the order to `HANDOFF`; it never deletes prior close evidence.

### 5B — Vendor masters and sourcing

- Adds vendor commercial terms and reliability basis points.
- Adds effective-dated vendor offers with price, availability, ETA, warranty, and return terms.
- Adds fitment-evidenced substitute/supersession relationships.
- Creates requisitions from open repair demand, captures the eligible-offer comparison, and records the selected offer.

### 5C — Purchase orders and receiving

- Controls PO lifecycle from draft through approval, issue, acknowledgement, partial/full receipt, close, or safe cancellation.
- Posts accepted receipt quantities into the existing immutable parts ledger and balance projection.
- Detects short, over, damaged, wrong-part, and cost-variance discrepancies and requires attributed resolution.
- Keeps packing source and receipt evidence immutable.

### 5D — Custody, transfer, and recovery

- Issues reserved parts without allowing negative or over-allocated stock, records installation evidence, and returns unused quantities.
- Ships and receives location transfers through paired ledger movements and custody evidence.
- Tracks core, warranty, and vendor-return recovery from eligibility through shipment, acknowledgement, credit, dispute, or write-off.
- Preserves expected and actual recoverable credit separately.

## Enterprise controls

- Server-enforced `REPAIR_ORDER_*` and `PARTS_*` capabilities.
- Existing feature-rollout gates for Shop Operations and Parts Operations.
- Idempotency-key replay, request-hash conflict detection, optimistic aggregate versions, serializable transactions, audit events, domain events, and transactional outbox messages.
- Database checks for nonnegative amounts, valid JSON evidence, approval coherence, close evidence, transfer location integrity, discrepancy resolution, and recovery credit/dispute rules.
- Immutable database triggers for closure events, vendor offers, interchange evidence, receipts, and custody events.

## Live surfaces

- Workspace: `/vehicles/service-close-parts`
- API: `GET|POST /api/service-close-parts`
- Existing balance/readiness workspace remains at `/vehicles/parts`.

## Deliberately deferred

- Payment capture, refunds, general ledger posting, tax calculation, payroll, and vendor-specific DMS/accounting adapters.
- Cycle-count planning and approval, replenishment/obsolescence recommendations, and barcode hardware integration (`VEH-081` through `VEH-083`).
- Separation-of-duties and configurable dollar-limit policy administration beyond the current capability framework.

These are separate enterprise slices. The invoice-ready package and credit records are integration-ready operational evidence, not accounting-system-of-record claims.
