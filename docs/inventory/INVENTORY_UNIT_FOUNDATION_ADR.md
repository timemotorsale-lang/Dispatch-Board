# ADR — InventoryUnit Foundation and Ownership Boundary

**Decision:** Accepted  
**Date:** 2026-07-14  
**Milestone:** 3A / VEH-030

## Context

`Vehicle` identifies a physical vehicle across customer, appointment, shop, and inventory contexts. It cannot also represent a dealership-controlled commercial inventory cycle: the same vehicle can be customer-owned, traded, consigned, sold, serviced, and later reacquired without changing physical identity.

## Decision

Create `InventoryUnit` as a separate, organization-scoped aggregate linked to one canonical `Vehicle`. An inventory unit starts only at the financial acquisition boundary and represents one dealership-controlled retail, wholesale, consignment, or approved-disposition cycle.

An open unit requires:

- an active canonical vehicle that is not merged into another identity
- an effective `DEALERSHIP_OWNED`, `TRADE_IN`, or `CONSIGNMENT` vehicle relationship at financial acquisition time
- a unique organization inventory number
- exactly one accountable owner and organization location
- financial acquisition time, current lifecycle stage, stage start, target, next action, operating state, and optimistic version
- one immutable state event for every accepted version

Only one open inventory unit may exist for a vehicle within an organization. A later reacquisition creates a new unit after the prior cycle is closed; it does not reuse or rewrite the historical unit.

## Foundation boundary

Milestone 3A creates units at `PURCHASED_OR_TRADE_IN`. It permits accountable control updates—owner, location, target, next action, and `ACTIVE`/`WAITING`/`BLOCKED` operating state—but does not expose lifecycle advancement. Transportation, receipt, inspection, recon, title, merchandising, frontline, reservation, sale, delivery, disposition, appraisal, purchase limits, or cost commands require their later evidence-bearing slices.

This prevents an early generic “change stage” endpoint from bypassing future authorization and readiness gates.

## State history and command adoption

`InventoryUnitStateEvent` is append-only and database-protected against update or deletion. Each version retains prior/current lifecycle and operating state, owner, location, target, next action, reason, actor, source, correlation ID, and occurrence time.

Creation and control updates adopt the Milestone 1 transaction contract: domain mutation, aggregate version, command ledger, domain event, immutable audit event, state event, and outbox record commit atomically. Retries are idempotent and stale versions return conflict.

## Migration and rollout

The migration does not synthesize inventory units from existing vehicles because vehicle existence, stock text, or appointment usage is not proof of financial acquisition or dealership control. Existing data remains unchanged. Operators must establish canonical ownership relationships and create/import units with attributable acquisition evidence in a later approved workflow.

The `RETAIL_INVENTORY` rollout flag is seeded `OFF` for each existing organization. Schema deployment therefore cannot activate mutation behavior accidentally. After writes begin, roll forward is required because removing the unit and state ledgers would discard authoritative history.
