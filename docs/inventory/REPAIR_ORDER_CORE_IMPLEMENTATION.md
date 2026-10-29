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

## Graceful administrative closure follow-up

The workbench Close RO action accepts a closure reason and ends remaining job assignments within the same serializable RO transaction. It pauses running labor clocks with an audited PAUSE event, releases active dispatch assignments and unused part reservations through the stock ledger, and ends open part demands. QC-passed jobs, recorded labor, consumed parts, procurement records and inspection evidence remain unchanged. Administrative no-further-work closure retains the existing CANCELLED stage/CLOSED operating-state semantics; it does not certify repair completion, QC or delivery readiness.

Issued invoices continue through native invoice/handoff closeout. Open outside-vendor records and inconsistent stock balances return an explicit reason and a scoped link to the relevant record. Closure requests preserve their original request key, version and time for retry, including task synchronization after a successful RO close. Existing location capability and rollout checks remain enforced. No schema migration is needed.
