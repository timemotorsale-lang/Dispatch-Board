# Wave 4 — Customer Lifecycle, Warranty, Commercial Handoffs, and Policy Administration

Wave 4 implements milestones 7A–8A as source-controlled application and database changes. The migration is intentionally not deployed and the `CUSTOMER_LIFECYCLE` rollout flag is seeded `OFF`.

## Delivered controls

- Customer 360 reuses canonical customer, vehicle, appointment, interaction, and repair-order records. Vehicle 360 now surfaces governed warranty and customer-lifecycle history.
- Service promises version arrival/completion windows, transportation state, breach, recovery, fulfillment, and ownership.
- Communication preferences are channel- and purpose-specific, effective-dated, revocable, source-attributed, and enforce quiet times before estimate delivery.
- Estimate delivery binds a customer to one exact estimate version. Tokens are random, SHA-256 hashed at rest, scoped, expiring, and displayed once. Decisions validate every line and create the existing repair authorization record plus decision evidence.
- Customer status is an explicit published projection. Portal reads cannot fall back to internal notes.
- Warranty records link vehicle, coverage evidence, eligibility, repair order, labor/part keys, authorization, submitted/approved/paid/recovered amounts, decision, and lifecycle state.
- Invoice reconciliation compares returned external totals with the source invoice package and records discrepancies before close.
- Sales, F&I, title, and delivery handoffs retain readiness, agreed-price references, dependencies, evidence, external references, ownership, and reconciliation state. Delivery reconciliation marks the canonical vehicle sold.
- Portal grants are customer or partner scoped, least-privilege, expiring, revocable, hashed at rest, and access-audited. Only `PORTAL_APPROVED` internal evidence metadata can appear as a portal document.
- Material policy versions move through draft, simulation, independent approval, pilot/activation, outcome capture, supersession, and rollback. Authors cannot approve their own policy.

## Surfaces

- Operator workspace: `/vehicles/customer-lifecycle`
- Internal API: `GET|POST /api/customer-lifecycle`
- Customer/partner portal: `/portal/vehicle/{one-time-token}`
- Exact estimate experience: `/portal/estimate/{one-time-token}`
- Scoped portal API: `GET /api/vehicle-portal/{token}` and `POST /api/vehicle-portal/{token}/approvals/{approvalId}`

## Enterprise boundaries

All internal mutations use capability checks, the `CUSTOMER_LIFECYCLE` rollout gate, idempotency, optimistic aggregate versions, audit records, domain events, and outbox messages. Portal operations use scoped grants and immutable access evidence; they never expose enterprise audit, internal notes, raw VINs, costs outside the exact presented estimate, or restricted evidence.

Provider-specific messaging, DMS/accounting, warranty-provider, title, funding, and payment integrations remain Milestone 9 adapter work. `BOUNDARY_PENDING` delivery evidence makes that boundary explicit rather than implying a production provider acknowledgement.

## Activation gate

Before a pilot, deploy the migration in an approved environment, configure explicit portal/policy capabilities, validate public-route abuse controls and TLS, connect approved delivery/provider adapters, run tenant-isolation and authorization tests, and enable `CUSTOMER_LIFECYCLE` for a named pilot location or user cohort only.
