# Inventory Unit Foundation Implementation Evidence

**Implemented:** 2026-07-14  
**Milestone:** 3A / VEH-030  
**State:** Implemented in repository; migration deployment and rollout activation remain pending

## Delivered

- `InventoryUnit` aggregate with canonical vehicle, organization, financial acquisition time, lifecycle stage/start, operating state, owner, location, target, next action, state reason, version, and close boundary.
- Database-enforced organization inventory-number uniqueness, one-open-unit-per-vehicle rule, tenant-safe vehicle/location foreign keys, timeline/state consistency, and positive versions.
- Immutable `InventoryUnitStateEvent` history with actor, reason, ownership/location snapshots, correlation, and version sequence.
- Server validation for acquisition/target timing, required control fields, documented waiting/blocker states, and rejection of premature closed/later lifecycle commands.
- M1-backed atomic, idempotent creation and control-update transactions with optimistic concurrency, audit, domain event, and outbox evidence.
- Protected, tenant-safe paginated search/detail/options/create/update APIs under `/api/inventory-units`.
- Live `/vehicles/inventory` workspace for eligible-vehicle creation, search, accountable control updates, stale-version recovery, and history inspection.
- `RETAIL_INVENTORY` rollout control seeded `OFF` and new inventory view/manage capabilities.

## Explicit non-claims

VEH-031 through VEH-042 remain planned. This slice does not claim durable appraisal, purchase authorization, transportation/receipt evidence, inspection/recon, title, merchandising, frontline readiness, sale/delivery/disposition, cost exposure, SLA policies, live control-tower projections, or replacement of prototype dashboard values.

The migration was not deployed and no production inventory units were created. Production activation requires migration rehearsal, ownership reconciliation, rollout approval, database-backed integration evidence, alerting/outbox readiness, and pilot signoff.
