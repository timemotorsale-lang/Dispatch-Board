# Vendor billing and monthly agreements

Implemented on `codex/enterprise-general-refinement` for every vendor registry profile at `/customers/vendors/[vendorId]`. No vendor name controls behavior. Configure the actual terms for Simba Collision, Gil Tires, or any other vendor; the implementation does not invent balances or agreements for them.

## Staff workflow

The compact **Billing & monthly agreements** panel has Invoices, Agreements, Payments, Work review, and History views. **They owe us** and **We owe them** are separate balances. Collect/pay through today includes overdue amounts and currently due installments. Period views use Chicago business dates: today, yesterday, this week, last week, two weeks ago, this month, last month, and all dates. Invoice issue dates and installment due dates are separate filters. Export includes all filtered invoices, not only the current page.

1. **Bill vendor** records an outgoing invoice draft. **Receive vendor bill** records the supplier's original number and source reference. Existing vendor Documents uploads can be referenced. Staff may capture drafts; managers approve financial actions.
2. Add one line per vehicle/work ticket or fill lines from a repair batch. Several batches may remain open at once. Tickets remain associated with their selected batch; closing a batch does not automatically post a payable or imply payment.
3. In **Work review**, a manager links the shared vehicle, records the approved estimate/supplement amount and acceptance evidence, and confirms actual acceptance/QC. Posting and outgoing payment allocation check this saved scope against the current ticket and blocks aggregate billed work above the approved amount. Non-vehicle bills need an explanation. Acceptance is a human attestation; this does not automatically certify the separate repair-order QC system.
4. Managers may edit a draft, approve/post it, dispute or resolve it, or void an unposted draft. Posted amounts are preserved; use a credit adjustment rather than rewriting history. Draft changes retain an audit snapshot and invalidate stale versions.
5. Record actual money received or paid, including bank/check references, partial amounts, or unapplied cash. Apply remaining cash later using its actual allocation date. Reconcile explicitly against bank evidence. These records do not initiate bank transfers.
6. An **offset** requires an explicit mutual agreement reference and equal approved allocations in both directions. Balances are never silently netted. Reversing a payment, credit, or offset keeps the original record and posts the opposite allocations. This corrects the vendor ledger; it does not perform a bank refund.
7. Print invoices, supplier bill records, receipts/remittances, credits, offsets, reversals, monthly/repayment schedules, and dated account statements. Use the browser's Print / Save as PDF. Use **Set follow-up task** to schedule collection, missing documentation, or dispute work in the existing vendor task workflow.

## Monthly obligations

- **Rent / recurring service:** monthly due dates preserve the original anniversary, clamping only in shorter months. **Generate due invoices** creates missing monthly drafts exactly once per agreement/month. A manager still approves each draft. Review backfilled periods after pausing/resuming an agreement; pausing does not erase existing obligations.
- **Existing debt repayment:** enter unpaid principal only if it has not already been recorded in this ledger. One opening balance is created, with up to 600 monthly installments and a reduced final installment. Installments do not generate repeated principal charges or represent new sales revenue.
- Gil Tires can have a receivable rent agreement alongside several payable vehicle-repair batch bills. Simba Collision can have an existing-debt repayment schedule alongside payable repair bills. Neither arrangement requires a second vendor profile.
- Missing recurring drafts remain counted on the account. An optional `npm run vendors:billing-worker` creates due drafts for active vendors using an active manager configured by `VENDOR_BILLING_WORKER_EMAIL`. It is safe to rerun because agreement/month uniqueness is enforced. Scheduling this command is an explicit deployment configuration step; no recurring job is activated by the code change. Failures produce a nonzero exit and identify the vendor requiring review.

## Controls and boundaries

Money is stored as integer cents. Financial commands run serializable transactions with vendor row locks, scoped foreign keys, request replay protection, optimistic document/agreement versions, and append-only event history. Duplicate invoice numbers are normalized within vendor/direction. Actual payment/adjustment references cannot be duplicated within the same vendor/type. Work-ticket ranges use a transaction-level reservation lock so concurrent multi-vehicle entry cannot overlap numbers.

Statement openings and closing balances use the actual allocation effective date, including reversals; applying old unapplied cash today does not backdate the application. Draft/void charges are excluded. Posted/disputed obligations remain visible separately from unapplied cash. The compact history shows the latest 100 events with staff names; all audit events remain stored.

This is the vendor operational billing subledger. It does not automatically post to Money & Resources, the general ledger, customer collections, or inventory costs, so staff must avoid recording the same actual movement twice across those workflows. It does not import old supplier bills, migrate the separate outside-repair-vendor directory, infer rent tax treatment, send invoices, collect payments, or draft a legally executed rental/debt agreement. Source documents and actual signed terms remain authoritative.

## Release and verification

Apply additive migration `20261102050000_vendor_billing`, then generate the Prisma client. Existing vendor master records, work tickets and batches are retained. New finance tables start empty. The migration seeds job/batch number sequences above existing numbers. Apply the migration before serving these routes; missing schema errors give staff an explicit database-update message and retain form entries.

- `npm run test:vendor-billing`: refuses remote databases, creates a fresh isolated schema, pushes the pre-feature baseline, applies the actual additive migration, runs financial workflows and route tests, then removes only its own schema.
- `npm run test:vendor-billing-ui`: synthetic API/vehicle-picker fixture; desktop/mobile dialogs, retained entries, identical retry reference, batch line selection, agreement/offset/work review commands, keyboard-accessible native controls, overflow and accessibility checks. It does not mutate real vendor finances.
- Existing vendor policy, validation, and rapid-recon tests remain applicable. Typecheck and changed-file lint cover the integration.

Verification completed: 17 billing/domain/API/database checks, 14 existing vendor policy/validation/rapid-recon checks, desktop/mobile browser and accessibility checks, a live authenticated local vendor-profile/API/dialog review, Prisma schema validation, TypeScript and edited-file lint. The additive migration was applied locally and the client regenerated; existing vendor finance records were not populated by testing.

Production rollout remains separate from local implementation. Configure any worker schedule and operational accounting handoff explicitly before enabling unattended monthly draft creation.
