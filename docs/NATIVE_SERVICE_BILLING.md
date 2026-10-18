# Native service documents and billing

Implementation: 2026-10-18. This follows the historical findings in `LABOR_GUIDE_DOCUMENT_WORKFLOW_AUDIT.md`; it does not retroactively change that audit's evidence. Native invoicing/payment records were explicitly selected by the user. No merge, push or production deployment is part of this change.

## Review routes

- `/vehicles/service-billing?repairOrderId=<id>`: load an RO, prepare its current commercial package, post a native customer invoice, and record verified payments/refunds/credits/voids.
- `/service-documents?repairOrderId=<id>`: frozen intake, estimates, authorization decisions, invoices and financial receipts. Select an issued document to print or save PDF.
- `/repair-estimate?repairOrderId=<id>&estimateId=<id>`: uses the issued frozen estimate when available. URL prices/customer names cannot override it.
- `/diagnostics/labor-reports`: bounded, location-authorized operational, invoice-cohort and receipt-activity reports with separate CSV exports.
- `/vehicles/customer-lifecycle`: create approval links and separately record actual delivery acknowledgment/manual evidence. Link creation does not mean an email/SMS was sent.

The existing live operational RO worksheet remains available; it is labeled as current operational information and links to the frozen issued-document hub. It is not presented as an immutable historical original.

The new document/billing routes require the two additive migrations below. They were applied only in dedicated local `labor_staging_*` schemas, **not** the ordinary development/public schema or production. Before normal local review, back up and verify the intended local database, apply the pending migrations through the established migration process, and regenerate its Prisma client. Do not point a migration command at production as a shortcut to previewing this branch.

## Source authority and financial rules

1. Estimates retain canonical line key/type, quantity, unit charge, part number/labor linkage, stored category subtotals, discount and tax. All commercial values are integer cents. Customer tax is not calculated from installed part cost.
2. `stored-estimate-allocation-v1` preserves full-quote totals. Partial scope allocates the quote's existing discount by gross line value and its existing tax by explicitly taxable line value, rounding to cents. It does not infer a jurisdiction or tax rate. Unknown partial taxable bases require a revised estimate. Finance must accept this policy before live use.
3. New estimates and decisions write immutable documents in their original transaction. Identity, store/address/timezone, scope, planning hours, implied quote rate and amounts are frozen, versioned and SHA-256 checked. Implied rate is a quote calculation, not a validated vehicle-specific standard. Live customer changes do not rewrite issued documents.
4. Approval checks customer, vehicle, current presented estimate/version, expiry and exact selected keys. A subset is `PARTIAL`, never full `ACCEPTED`. Declined and undecided lines stay distinct. Customer-visible selection totals include allocated tax/discount; a scoped decision receipt remains available while the grant is valid. Typed names are recorded evidence, not a claim of independently verified signatures or legal certification.
5. Final preparation recomputes the approved commercial ledger and fingerprints its current estimate, authorization, frozen source, jobs, finished accumulated clocks, latest QC and installed-part evidence. Recorded planning minutes and measured technician minutes are separate. Measurements do not automatically increase approved prices. Missing/stale/QC/part identity or quantity evidence holds posting and closeout. An ambiguous post-install unused/warranty/vendor return also holds the part scope for review rather than guessing that it remains billable.
6. Customer-linked `CUSTOMER_REPAIR` work uses the native invoice ledger. Internal recon uses `INTERNAL_COST` packages, not fabricated customer receivables or payment requirements. Native posting refuses internal recon. Legacy/incomplete scopes are held rather than inventing authorization, installation or historical documents.
7. Posted invoices get organization-sequenced numbers, immutable content and a separate append-only receipt ledger. Payments cannot exceed open balance. Refunds reference the original payment, use its method and cannot exceed its unrefunded amount. Credits reference original invoice lines and explicitly reconcile subtotal/discount/tax; component and overlapping scope limits are conservative. Evidence and a detailed reason are required. Void requires fully refunded payments, is terminal and never deletes/reuses the invoice. Reissue requires a new reviewed package.
8. Payment methods are cash/check/externally processed card/bank transfer/other **verified receipt records**. The app does not charge cards, initiate transfers, issue real processor refunds, establish bank settlement or store card/account numbers. Processor selection, credentials, webhooks, settlement/chargeback handling and operational approval are separate work before in-app electronic charging can be enabled.
9. Billing access requires General Manager or an explicit billing capability plus RO view at the actual location; writes also respect Shop Operations rollout. Financial documents are not exposed through ordinary RO-only read access. Existing location-specific RO denials are checked for details/print/planning and filtered from lists/intake choices.
10. Commands retain their original subject/version and hash on retry; unchanged response-loss retries recover the receipt without another financial entry. Different payloads under the same successful key conflict. The billing screen retains an uncertain request for unchanged retry. A lost one-time portal link is not fabricated/recovered in plaintext: reissue an attributable access grant when needed.
11. Customer financial closeout requires a current posted, fully settled invoice, current QC/readiness/release and key/handoff evidence. Closeout cannot predate its financial activity or current readiness. Internal cost closeout does not require a customer payment. Database guards also prevent duplicate/no-work cancellation from bypassing posted native-invoice closeout. Financial changes to a closed RO require an attributable reopen first.

## Reporting semantics

Financial cohort: invoices **issued** in the chosen UTC date period, with current all-time receipt balances. Gross labor/part/fee charges, discount, tax, payments, refunds, credits and outstanding balances remain separate. Voided invoices retain their original history; do not count them as active revenue.

Receipt activity: verified financial records **occurring** in the period, including activity against invoices issued outside it. This is not processor/bank settlement or accounting revenue recognition.

Operational cohort: ROs **opened** in the period, current estimate/approval freshness, proposed versus stored accumulated technician minutes, open clocks, QC/first-pass/comeback counts and open age. Proposed time is not an OEM standard. Gross quote-per-measured-hour is not net margin, payroll costing or an employee disciplinary metric. No missing payroll cost is invented.

Reports recheck location/financial access, identify their UTC/cohort/as-generated basis, refuse oversized scopes rather than silently truncate totals, and neutralize spreadsheet formulas in CSV text. Broader enterprise accounting consolidation remains with the existing reporting/accounting architecture, not a second copied financial ledger.

## Database and recovery

- `20261018010000_service_documents_native_billing`: additive document, invoice, entry and numbering tables; append-only document/entry and immutable posted-content guards.
- `20261018013000_service_billing_integrity_guards`: organization/RO/package/refund scope, positive entry amounts, monotonic terminal invoice transitions and native financial-close/cancellation guards.
- No legacy authorizations, payments or signatures are backfilled. Existing histories remain. A legacy document is clearly labeled as current live identity, not a frozen historical original; new authorization requires a reviewed reissue.
- `scripts/run-labor-catalog-staging.mjs` applies candidate migrations only to a validated explicit loopback `labor_staging_*` schema, seeds synthetic data, runs policy and native billing database journeys serially, then both authenticated browser journeys on port 3200.
- The disposable CI baseline-upgrade/backup-restore workflow now includes all four native document/billing tables in its required restore inventory. A local fresh-schema migration is **not** proof of deployed-baseline upgrade or backup restoration. The CI restore, exact-candidate promotion evidence, production-scale recovery, external storage restoration and application rollback still require recorded acceptance.

## Verification and remaining release gates

Local verification: 4,686 tests passed, 33 conditionally skipped (940 passing files, 31 conditional skipped files). Full isolated staging passes two real PostgreSQL journeys and two authenticated browser journeys. Typecheck, lint and a separate production build passed. Additional proof includes real isolated PostgreSQL checks for canonical money, measured clocks, immutable history, native posting/replay, overpayment refusal, original-payment refunds, credit reconciliation, terminal voids, frozen identity, portal partial decisions/receipt replay, stale source refusal and unpaid versus settled closeout; and authenticated browser invoice/payment/document/PDF/report/permission journeys. The saved estimate was visually inspected. Synthetic approvals, QC, installations and cashier evidence are explicitly fixtures, not actual customer work or money movement.

Before live release: review the complete diff and tax/discount/numbering/credit policy with finance, approve customer-facing language and genuine customer consent/delivery/QC/handoff acceptance, verify target-database backup/upgrade/restore/rollback, configure authorized billing users and rollout scope, and collect exact committed-candidate CI/staging evidence. Any legacy, vendor-only or incomplete evidence scope remains held until its real execution/cost/authorization evidence is reviewed; do not synthesize in-house clocks or customer payments to clear it. Do not describe this as universal vehicle-configuration approval or automatic production authorization.
