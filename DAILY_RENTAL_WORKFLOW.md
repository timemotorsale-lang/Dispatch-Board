# Daily rental workflow refinement

Branch: `codex/enterprise-general-refinement`. Base: `e7124bd272da8c2fc2cd2a5711eeb098f0a90eca`.

## Review

Open `/crm-next/deals`, choose Daily Rental and Continue on an existing deal. The checkout tool is on `/crm-next/deals/start?draftId=<actual-draft-id>`. Deal number 1063 is a display number, not a draft UUID. No customer record was changed during implementation.

The Daily Rental checkout & return panel now appears above the deal summary on every workspace tab. It automatically loads the saved rental status and provides four explicit steps: Customer & vehicle, Rental terms & dates, Signed agreement & insurance, and Activate Rental. The old generic Working Deals selector is replaced for this pathway, and Completion is labeled Checkout & Return. Activation opens the next required form: first confirming checkout dates if no reservation exists, then the handover checklist. Each submit button names its result. Active rentals offer Record return and Extend due-back time. The recorded lifecycle remains separate from the generic draft's storage status.

Save the canonical customer and vehicle, load the assignment, and reserve pickup and due-back times. Finalize the exact linked agreement in Sales Documents. Select Activate Rental and enter the actual checkout time, mileage, fuel, condition, recipient, keys and evidence references. Verify the physical handover and insurance through the expected return. The server independently checks accepted signed agreement and insurance documents, customer, VIN, permissions, booking version and conflicting custody.

Actual custody records distinguish Delivered from Rental Active. Vehicle selection shows Out on Rental until actual return. A return task and an audited continuity event are created transactionally. Repeating an identical request recovers its original result. Return completes the linked task; extensions reschedule it and cannot exceed the recorded insurance coverage. Final return paperwork cannot close an actively checked-out booking.

Deals compute Rental Active, Rental Due Soon (24 hours), Rental Overdue and Rental Returned from actual bookings. Visible dashboard pages refresh every minute. Existing task due-date handling remains available when the dashboard is closed. This change does not introduce email/SMS notifications or a separate continuously running monitoring service.

Checkout inputs use the operator's displayed browser timezone, send explicit UTC instants, and preserve the IANA timezone in checkout evidence. Task board dates follow the application's existing America/Chicago business calendar.

## Migration and staging deployment

1. Use a separate staging database, document store, authentication configuration and organization configuration. Do not copy production credentials into the preview checkout.
2. Install locked dependencies with `npm ci`; set the staging `DATABASE_URL`; run `npm run db:generate`.
3. Before migration, check for duplicate CHECKED_OUT bookings grouped by organizationId and vehicleId, and duplicate RESERVED/CHECKED_OUT bookings grouped by organizationId and contextId. Reconcile conflicts from physical custody records. Never automatically cancel or rewrite historical bookings.
4. Review and apply `20261104190000_rental_custody_guards` using `npm run db:migrate:deploy` against staging only. Unique indexes fail on legacy conflicts instead of discarding data. For large tables plan an appropriate maintenance window for index creation.
5. Run `npm run typecheck`, targeted rental/continuity/dashboard tests, then `npm run build`. `next build --webpack` is supported for dependency-junction environments where Turbopack cannot resolve packages outside its root.
6. Start the staging preview and verify activation, denied roles, two simultaneous handovers, unchanged retries, return, extension, due alerts and packet closing with synthetic data. Test task creation failure rolls back custody using PostgreSQL.
7. Request explicit deployment approval after staging review. No production migration, activation, ledger update, commit, push or deployment was performed by this task.

Existing finalized documents alone never activate a legacy rental. A legacy rental without shared identities or verified coverage needs staff reconciliation. The migration adds constraints only; it does not backfill handover facts or financial entries.

## Verification limits

Activation no longer requires a separate reservation submission: an unreserved Daily Rental uses an ACTIVATE command to create the booking and complete validated handover, custody, follow-up and audit writes in one transaction. Checkout dates, fuel and mileage are prefilled from saved terms without marking handover facts verified. Opening or refreshing checkout does not save or reset terms. Clean saved drafts do not need another draft save before a custody action. Actual handover, signed paperwork, coverage and vehicle availability checks remain required, and failures retain entered checkout values. Insurance and handover evidence are included in retry fingerprints.

The Details drawer includes a Rental tab with lifecycle progress, the next operational action, actual checkout/due-back/return dates, coverage exceptions, checkout and return evidence, linked follow-ups and the rental audit trail. Return and extension links open the original draft's checkout controls. Rental document review omits generic funding/delivery badges; generic manager milestone overrides are hidden for rentals. Existing financial records remain unchanged. Resume uses the persisted deal pathway as authoritative, and the picker explicitly explains that selecting a saved deal does not load it until Resume is clicked.

The production webpack build, TypeScript, focused lint and targeted unit/service-mock tests were run locally. Database concurrency/rollback and migration execution require a separately configured staging PostgreSQL database; they were not exercised against live data. Browser-based authenticated visual review is still required before release. Inventory availability in the shared deal selector is derived from the booking and existing custody events; this patch does not add a new inventory lifecycle enum or change financial ownership.
