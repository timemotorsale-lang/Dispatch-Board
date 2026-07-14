# ADR — Repair-order aggregate and integration boundary

**Status:** Approved for Milestone 4A  
**Scope:** `VEH-050` and the aggregate boundary needed by `VEH-051`

## Decision

`ServiceVisit` is the immutable intake episode. It records the authoritative customer or inventory context, canonical vehicle, arrival, concern, promise, consent, keys, transportation, source snapshot, and intake actor. `RepairOrder` is the operational shop coordination aggregate. It owns its number, source, current stage, operating state, accountable owner/location, target, next action, blocker reason, version, and state history.

Customer repair and inventory recon are separate origins. A customer repair requires an active customer and cannot reference an inventory unit. Inventory recon requires one open inventory unit and cannot masquerade as customer-pay work. Both point to the same canonical `Vehicle`.

Appointment conversion uses the appointment's one primary vehicle and one primary customer. `ServiceVisit.appointmentId` is unique, making conversion one-to-one even under retries. Walk-ins require explicit active customer and vehicle selection. Inventory recon derives its vehicle and location from the open inventory unit.

## Future child boundaries

- `RepairJob` will be the authorized unit of repair work and dispatch.
- `Inspection`/DVI will be versioned evidence, not mutable repair-order fields.
- Diagnosis will retain observations, tests, evidence, and recommendations.
- Estimates will be immutable versions. Approvals will bind to the exact version, scope, amount, channel, and actor.
- Labor entries will be append-only time evidence; corrections will reverse and replace rather than overwrite.
- Parts demand and consumption will integrate through the governed parts ledger, not direct stock edits.
- Totals will be calculated projections over authorized jobs, labor, parts, fees, taxes, discounts, and reversals.
- Close and reopen will be explicit commands with prerequisites, authority, reason, audit, and compensating state—not direct status edits.

These child aggregates and commands are not implemented by Milestone 4A. The database permits their future stage vocabulary but constrains current repair orders to `INTAKE` and active/waiting/blocked operation.

## DMS and accounting boundary

This system is the operational source of truth for service intake and execution evidence. A DMS or accounting platform remains the financial posting and statutory-record boundary until a later approved integration slice. External identifiers are stored only as system-code/reference mappings. Vendor payloads are translated at an adapter boundary and cannot become the internal domain schema. Imports, exports, posting acknowledgements, failures, retries, and reconciliation will use idempotent commands and outbox/inbox evidence. Milestone 4A performs no financial posting and makes no claim of DMS synchronization.

## Consequences

All repair-order mutations use the enterprise command transaction, optimistic version checks, explicit capabilities, rollout controls, audit events, domain events, outbox messages, and immutable state events. Intake evidence cannot be updated or deleted. Corrections require a later governed correction command.
