# Daily rental workflow refinement

## Rentals and loaners in CRM Next

Open **Deals → Rentals & Loaners**. Use the lifecycle filter to find drafts, reserved vehicles, vehicles out or overdue, returns awaiting review, completed assignments, and cancellations. The row and details drawer open the saved assignment at its next action. Times on these screens use America/Chicago. During the repeated fall hour, select the occurrence shown in the actual evidence.

In **Terms & Payments**, tab out of a complete VIN to decode blank vehicle fields and check the registry. If it is missing, open **Register this VIN** to reuse the number. A registered vehicle without an open inventory unit links to Inventory Intake. Release and return photo slots offer **Take photo** and **Upload photo** and show a filename after the upload is accepted.

- **Prepare Checkout** shows the linked customer, vehicle, terms, and checkout blockers. Reserve in advance when needed. Confirm actual handoff, driver, keys, condition, mileage, and coverage through the due-back time before the vehicle becomes **Rented Out** or **Loaner Active**. Routine checkout records the reason and links accepted documents automatically. Managers enter a dated record and explanation for historical handoff.
- **Record Return** records physical receipt and places the vehicle on hold. Finalize the linked return packet and use **Complete Rental** or **Complete Loaner** to confirm inspection and record the settlement or no-charge reference. Managers can record a settlement exception with a reason. Completion releases rental custody.
- **Cancel** is for work before handoff. Once checkout paperwork is signed and finalized, a manager confirms physical handoff never occurred before cancelling. Existing agreement versions and usage history are retained. For actual handoffs more than 24 hours old, a manager records the dated evidence and original checkout time. Existing documents or scheduled dates alone never establish actual custody.
- To convert a resolved rental or loaner to a sale, use **Change revenue pathway** and the existing sales workflow. Inventory, the vehicle registry, and deal vehicle selection show temporary-use holds. The database serializes checkout and sales decisions for the same canonical vehicle.

Apply the cross-workflow custody and return-review migrations together on an isolated database before release. Neither migration backfills facts or changes historical documents. A legacy return without explicit completion remains held for review. A legacy sale needs a canonical vehicle link, exact VIN, or exact stock, vehicle, or inventory number for automatic conflict matching.

## Prior daily-rental implementation

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

For a dealership-owned vehicle with confirmed intake and no open repair order, a staff member with inventory readiness permission can confirm that the vehicle is on site, safe to rent, and needs no repairs. This confirmation is recorded on the rental or loaner and tied to the current inventory and intake revisions. It leaves the retail stage unchanged. Checkout still requires the finalized agreement, verified insurance, and actual handoff.

Use **Review & finalize checkout packet** to open each requirement and replace or upload evidence as needed. Select **Finalize packet & continue to handoff** to save the reviewed paperwork. Checkout shows any remaining activation requirements with links to the fields staff can correct. Coverage must reach the due-back time before release. Once the driver receives the vehicle and keys, confirm the actual checkout time and physical handoff, then select **Activate Rental**. Documents opens with **Rental activated · Rented Out** and **Close checkout & return to Rentals**. Reopening an active rental shows when activation was saved.

In the **Money** tab, a manager can use **Collect payment** to record cash received at the counter or a payment confirmed through a card terminal, check, or bank transfer. Use **Open latest receipt** to print or save the branded receipt. The same receipt stays available after reopening the rental, and verified refunds or reversals appear on reprints. A recorded agreed amount is required to show a balance. Security holds and the external card, bank, or refund transaction use their existing channels.

In the **Rental** drawer, save staff updates under **Progress notes**. Record damage or theft under **Return incidents** after actual checkout. The incident creates a high-priority follow-up in Tasks, where staff can track it through completion. Authorized staff can open internal Claims Desk intake or link an existing claim for the same vehicle and customer.

The Details drawer includes a Rental tab with lifecycle progress, the next operational action, actual checkout/due-back/return dates, coverage exceptions, checkout and return evidence, linked follow-ups and the rental audit trail. Return and extension links open the original draft's checkout controls. Rental document review omits generic funding/delivery badges; generic manager milestone overrides are hidden for rentals. Existing financial records remain unchanged. Resume uses the persisted deal pathway as authoritative, and the picker explicitly explains that selecting a saved deal does not load it until Resume is clicked.

The production webpack build, TypeScript, focused lint and targeted unit/service-mock tests were run locally. Database concurrency/rollback and migration execution require a separately configured staging PostgreSQL database; they were not exercised against live data. Browser-based authenticated visual review is still required before release. Inventory availability in the shared deal selector is derived from the booking and existing custody events; this patch does not add a new inventory lifecycle enum or change financial ownership.
