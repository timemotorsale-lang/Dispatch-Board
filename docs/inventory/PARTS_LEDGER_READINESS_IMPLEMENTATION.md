# Parts Ledger and Repair Readiness Implementation Evidence

Milestone 5A delivers:

- part identity with organization-unique part numbers, unit, category, manufacturer, status, supersession boundary, cost, and version;
- physical/logical stock locations connected to business locations;
- on-hand, allocated, available, ordered, backordered, damaged, average-cost, and version projections;
- immutable, source-idempotent stock ledger facts with explicit reversal linkage;
- receipt, verified adjustment, reversal, repair-order demand, and same-location reservation commands;
- negative-stock, over-allocation, over-demand, duplicate posting, and concurrent reservation controls;
- immutable repair-readiness evaluations with input fingerprints and reason codes;
- `PARTS_VIEW`/`PARTS_MANAGE`, an independently seeded-off `PARTS_OPERATIONS` flag, protected APIs, and `/vehicles/parts`.

Every mutation uses the enterprise command ledger, aggregate version, audit event, domain event, and outbox transaction. The migration is source-controlled but not deployed during implementation.
