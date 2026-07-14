# Repair-order Core Implementation Evidence

Milestone 4A implements `VEH-050` and `VEH-051` as a vertical slice.

## Delivered

- `ServiceVisit`, `RepairOrder`, and immutable `RepairOrderStateEvent` persistence with origin, source, tenant, ownership, timeline, consent, and state constraints.
- One appointment to one service visit, with the linked primary customer and vehicle treated as authoritative.
- Walk-in customer repair and dealership inventory-recon intake.
- Active, waiting, and blocked intake coordination with owner, location, target, next action, reason, optimistic version, and history.
- Atomic M1 command ledger, aggregate version, audit event, domain event, outbox, aggregate, visit, and state-event transaction.
- `REPAIR_ORDER_VIEW` and `REPAIR_ORDER_MANAGE` capabilities plus an independently deployable `SHOP_OPERATIONS` rollout flag seeded `OFF`.
- Protected list/create/options/detail/update APIs and the `/vehicles/repair-orders` workspace.

## Enforced non-claims

Milestone 4A does not implement DVI, diagnosis, estimates, approvals, repair jobs, labor, parts, dispatch, QC, invoicing, financial posting, closing, or reopening. The database and service reject advancing the aggregate beyond intake. Those capabilities remain assigned to `VEH-052` and later cards.

## Verification

Run database client generation, lint, unit and acceptance tests, and a production build. The migration is checked into source control but is not deployed by implementation work.
