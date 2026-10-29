# Native service documents and billing

Implementation: 2026-10-18. This follows the historical findings in `LABOR_GUIDE_DOCUMENT_WORKFLOW_AUDIT.md`; it does not retroactively change that audit's evidence. Native invoicing/payment records were explicitly selected by the user. No merge, push or production deployment is part of this change.

## Review routes

### Customer details, charges and discount

Estimate and invoice reviews expose **Customer details & charges**. Staff with the existing repair-order/billing permissions can save name, phone, email and billing address for the repair order's documents. Corrections append a new hashed document version and an audited, idempotent command; previous documents and posted monetary records remain intact. They do not change the canonical CRM customer profile. Newly issued estimates and receipts inherit the saved contact details. A contact correction makes an older invoice package require fresh preparation.

Current Labor Guide staff quotes include a **Shop supplies** fee equal to **5% of listed labor, capped at $50**. Other charges such as towing are individual FEE lines. Staff explicitly mark taxable charges and set a dollar discount; the discount is allocated proportionally across the subtotal before applying the configured tax rate to the taxable share. The server validates the supplies amount, tax, discount, pricing and revision source. Changes before invoice issue produce a new estimate requiring fresh customer approval. Issued invoices retain fixed monetary amounts and use the existing billing-adjustment workflow for corrections.

### Branded documents and invoice feedback

The document workspace includes an always-visible **Open QC** action for the current RO. Opening invoice conversion reads current invoice requirements, even before a package exists. A missing passed QC record produces a highlighted **Passed QC record missing** notice and an **Open QC** link directly to that RO's QC step. A stale ready package cannot override current readiness; invoice posting still revalidates the transaction's operational and financial conditions.

The shared estimate/invoice/receipt header uses the Time Motor Sales logo, service-department identity, store address, timemotorsale@gmail.com and timemotors.net, plus document reference, issue date/time and RO. Times retain the store's timezone for calculation without displaying the timezone identifier. The printed footer uses the readable document number instead of the internal hash; server-side frozen-document integrity verification is unchanged.

The invoice action focuses the action panel even when it is already open. Preparation feedback is brought into view, and unresolved requirements have readable labels and direct links to their relevant repair steps. Rechecking does not claim an invoice was issued. Existing QC, part identity, authorization and financial controls remain enforced.

### Single-guide cutover — 2026-10-28

Staff quote generation propagates `STAFF_QUOTE` into the audited estimate command and transaction. It can issue the saved estimate and frozen printable document directly from intake, without first creating a diagnosis or outside-vendor record. This does not create a diagnosis, customer approval, repair job, invoice or payment. Draft backup is attempted but its failure does not block the durable estimate transaction. Generation failures appear in the worksheet beside the action rather than above the workspace.

The active staff flow is Labor Guide → Estimate → Approval → Print, followed by invoice/payment when needed. The legacy `/diagnostics/labor-guide` entry redirects to the current guide, preserving RO and return context; explicit draft imports retain the estimate worksheet destination. Legacy view flags no longer select another worksheet, and the Legacy/New switch is removed. Existing estimates, authorizations, invoices, receipts, API permissions, and stored drafts are not deleted or migrated. The unused legacy component remains in source history for rollback and can be removed after rollout validation.

Staff quotes no longer require labor-source explanations, manual-review checkboxes, procedure references, fitment narratives, or a catalog-activation review before generation. Known quote prices transfer directly; missing amounts still need entry. Staff-entered proposals are recorded as quotes, without fabricating a completed technical review or changing catalog policy. The server continues to check access, the actual RO, numerical totals, shop-rate authority, duplicate scope, and exact-version customer decisions. This section supersedes the earlier staff-assessment UI descriptions below.

### Generate and print from the Labor Guide prototype

The prototype now uses a single document workspace (`workspace=1`) for issued estimates and service documents: visible branded preview, print/PDF, one primary next action, and collapsed history. Customer approval is recorded beside the exact latest estimate with representative, method, decision time and evidence. Invoice review stays beside the document; successful invoice or payment commands open their exact saved document in the same workspace. Payment defaults to the open balance, supports a changed partial amount, and requires verified receipt evidence and confirmation. Refunds and credits remain in optional billing tools. Uncertain requests retain their retry identity and lock navigation until resolved.

Held Explorer operations can be explicitly assessed in place as manual proposals, with a recorded labor basis and original-operation references. This does not activate a catalog system, skip parts/fitment/tax checks, authorize work, complete repairs, pass QC, or mark an invoice paid. Invalid scope and overlapping work remain blocked. The original browser draft is retained.

After the reviewed worksheet issues an estimate, it opens that exact saved estimate at `/repair-estimate` for printing or saving as PDF. Continue from the document to authorization or Service Billing. Final invoicing still requires the approved revision, completed work and QC; printing never approves work or records a payment.

Service Billing exposes the issued invoice and each saved financial receipt directly. Recording a verified payment creates its frozen receipt; use **Open / Print Receipt** to print it, including partial-payment receipts. Reopening or reprinting a document does not issue another invoice or payment. The RO-linked Repair Explorer also provides access to saved documents and billing, while the unlinked sample draft does not expose live document actions.

The shared frozen-document viewer includes the existing Time Motor Sales logo, the store name and address captured at issue, document number and issue date. The header remains visible when printed; staff navigation and print controls are hidden.

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

## Canonical inventory and real-vehicle review

### Estimate Handoff Stays in the RO Workflow

Repair Explorer transfer failures now identify the selected operations needing catalog/hours review and provide same-RO planning, original-draft editing and existing-guide review links. The original browser draft is retained. No blocked operation is silently dropped, approved or relabeled as custom work to evade catalog controls. Cross-RO/vehicle validation occurs before exposing operation details in the recovery view.

After the governed estimate-present command successfully returns its saved estimate ID, the Labor Guide opens exact-RO shop planning with that ID. Planning verifies the estimate belongs to the selected RO, offers **View / Print saved estimate**, and identifies review/authorization as the next workflow step. Missing or foreign estimate IDs do not claim successful saving. Printing documents also offers a same-RO recon/shop return. Draft preparation, estimate saving and printing never automatically authorize repairs, reserve parts, dispatch jobs, pass QC or close the RO.

### Advisor Find Work — Direct Execution

The separate Recon/Repair Advisor now places VIN/stock/vehicle/RO search first. Operating summaries and supporting tools are collapsed rather than dominating the screen. **Find work** uses authorized canonical-vehicle/RO services: an open repair order opens its exact repair-planning workspace; inventory without an open RO opens vehicle-specific inventory planning; a canonical vehicle without inventory opens compact intake with its vehicle ID. Multiple matches require an explicit choice. An unmatched valid VIN can prefill new intake; arbitrary unmatched text does not create identity. Reads never establish inventory or open an RO. Customer ROs go directly to planning without manufacturing dealership inventory.

Advisor compact intake keeps acquisition source/date, receiving, staff and concern visible; optional purchase details are collapsed. **Save & Open Planning** uses the existing governed save/create-or-reuse command, then opens planning for the returned RO. Existing saves, explicit ownership, optional paperwork, duplicate prevention and permissions remain intact. A requested RO that is unavailable cannot silently select another vehicle. Current Service Advisor remains the comparison fallback; this changes the separate review workspace, not a global production adoption.

Routine Acquisition & Intake draft saves and confirmations do not require a typed record/revision reason. The server supplies an action-specific audit reason, retaining the actor, timestamp, prior revision and saved result through existing audit commands. Explicit notes from existing callers remain supported. Dedicated cost and inventory-number corrections keep their existing reason/permission controls; routine intake does not gain a financial override. Missing acquisition information remains explicitly Pending. Document references and follow-up notes are optional at intake, including confirmation. Receiving a vehicle does not declare paperwork complete or grant downstream sale, financial closeout or repair-release approval.

The existing Acquisition & Intake confirmation action displays save progress and feedback beside the sticky footer buttons, rather than hiding errors above the form. Shared server/client confirmation rules focus missing purchase references, receiving context without demanding a pending-information follow-up plan. Incomplete details remain Pending even with blank notes; a purchase invoice/reference is optional and does not itself create a follow-up requirement. Blank references remain blank in intake and are stored as null on a new acquisition cost, never fabricated as invoice evidence. Existing acquisition-cost reconciliation and idempotency/version controls prevent duplicate purchase posting. Save draft remains available without asserting confirmation. Failed requests retain entries and stable retry receipts; successful confirmation opens the same vehicle's details. These actions do not waive acquisition, permission, version, cost or release controls.

### Compact Intake Option — Review Before Adoption

`/prototype/inventory-intake` is a separate, functional single-page form for design review. The current intake remains the default. **Save Inventory** resolves or creates canonical identity, creates or reuses the open inventory cycle, and confirms acquisition intake. **Save & Start Repair Order** performs the same save and creates or reuses linked recon work, including its owner task. These actions write real records under the user's existing permissions and rollout settings; “review before adoption” is not a non-writing sandbox. Use synthetic records in isolated staging for acceptance.

VIN lookup reuses canonical identity; acquisition facts, location and staff are entered once. Inventory numbering and record linkage are server-owned. New units default to the last six VIN characters, preserving leading zeroes. Case-insensitive organization-wide checks include closed cycles; collisions receive the first free suffix (`406095-2`, `406095-3`). Allocation is serialized for concurrent saves and retry receipts retain the original assigned number. Without a valid-format VIN, a stable `INV-` canonical-ID fallback is used. Existing inventory numbers, Vehicle stock numbers and internal links are not renumbered. The foundation form allows an optional creation override; the compact form offers **Correct inventory number · authorized staff** after save. Corrections require acquisition-management and inventory-view permissions at the actual location, rollout gates, an exact version, a stable retry key and an attributable reason. Only the display number changes; audit history records old/new values, and vehicle, acquisition cost and RO links remain intact. Purchase amounts are either explicitly pending or recorded through the existing cost controls with an optional purchase reference; existing amounts cannot be silently overwritten. The composite command uses an outer transaction, existing governed commands, exact versions and stable retry receipts. A failure rolls back the combined save, including task projection. There is no separate inventory-establishment page in this opt-in form's save path. Its authorization, billing and production-release boundaries are unchanged.

Staff can open the option from **Try compact intake · New form for review** in current intake/inventory, or open the direct URL. Approving the design is a future adoption decision; this implementation does not replace the default route, change role grants, activate production flags or deploy itself.

The brief **Work type** selector offers **Prepare for Sale**, **Dealership Repair / Recon**, and **Customer Repair**. Sale uses the same inventory save and can open the existing vehicle-specific selling workbench, without creating an RO or approving retail release. Recon can create/reuse the linked RO and continue to the new Labor Guide. Customer Repair explicitly hands off to the existing customer check-in, carrying canonical vehicle identity and never calling the dealership inventory-save endpoint; a new compact customer-intake implementation is not claimed by this slice.

Reuse the existing canonical Vehicle and its current InventoryUnit. Recon intake must not manufacture another vehicle, acquisition, ownership claim or inventory cycle. Existing inventory creation locks the vehicle scope; the database permits one open unit per organization/vehicle. Reacquisition can start a new cycle after the prior cycle closes; rental or repair does not itself establish a new acquisition.

For dealership recon, select the matching open inventory unit before creating an RO. If none exists, use **Inventory Establishment** for the selected canonical vehicle, enter the actual acquisition/accountability details, then return to intake. If ownership/acquisition is not established, use the governed acquisition path. Creating a vehicle is not proof of purchasing it. Customer-owned walk-in repairs continue through customer/vehicle intake without dealership inventory. Reuse an existing RO rather than creating a duplicate.

Intake reflects the unit requirement in readiness, action guidance and submission validation. The server and repository reject missing-unit recon before service-visit persistence. Browser-restored inventory selections are resolved against current server options, not treated as authoritative inventory records.

The New guide opened from an actual RO loads the authorized vehicle, VIN, inventory number, concern and shop rate. Missing, denied or closed requested orders do not fall back to the sample F-150. Browser drafts/handoffs are isolated by user and RO, retain the canonical vehicle/RO identity pair and reject a mismatched target. The compact document worksheet opens the same RO without another identity search. Work remains proposed: applicability, pricing, fitment, authorization, issuance and billing safeguards still apply. Opening without an RO retains a clearly labeled sample draft.

The audit confirms recon and retail-completion records already reference InventoryUnit/Vehicle. Rental/loaner documents currently retain reference/VIN/stock snapshots, not a complete canonical rental checkout/return aggregate. This slice does not claim rental-to-return-to-sale integration, repair legacy records or activate a sales/rental release. Those links require a separately validated rental/document slice, not duplicate inventory.

Staff review: resolve the existing vehicle/inventory cycle → check for an open RO → complete intake → **Build estimate in Labor Guide** → **New guide · Prototype** → confirm actual identity and select work → **Generate / Print Estimate** → exact-revision review/authorization → governed invoice/print/payment. Use synthetic staging records for acceptance; a preview is not production approval.

## Separate current and simplified prototype guides

The visible navigation opens two distinct authenticated pages:

- **Legacy guide**: `/diagnostics/labor-guide`, the current detailed catalog and multi-step estimate guide.
- **New guide · Prototype**: `/prototype/repair-explorer`, the separate Repair Explorer Preview headed “Find the work. Build the estimate.” This is the screenshot-matched simplified guide, not another Legacy mode.
- `/prototype/labor-guide` is the downstream official estimate worksheet only. The prototype’s explicit **Generate / Print Estimate** action hands proposed work to this guarded workflow.

The other guide opens in a new tab, leaving the current page and its unsaved edits, actual RO, evidence, review and retry state open. The selected RO ID is included for authenticated context, but the other guide does not import, overwrite or merge that page's draft. Use normal Save draft before closing or reloading either page. Navigation is disabled during an active command/save.

The simplified prototype uses authorized actual vehicle/RO context when requested, or a labeled sample vehicle without an RO. Its browser draft remains proposed work only. Official estimate/invoice actions happen after the explicit document handoff and remain live guarded operations, not sandbox writes. No account preference, adoption switch, rollout activation or schema migration is stored. Prototype adoption remains a separate decision.

Older current-guide URLs with `guide=new`, `experience=explorer` or a deliberate Explorer import redirect to the dedicated prototype. Explicit `guide=legacy` stays in Legacy; it does not import a browser draft. Direct links may include an RO ID, but that ID is rechecked against the signed-in user's existing access.

## Execution-first UX contract

The following acceptance criteria govern the New review presentation; they do not adopt it as the default. Simplicity and easy duty execution are the primary UI acceptance criteria for this RO workflow. Routine work must use a compact worksheet, not a dashboard or a second copy of commercial data.

- Start in the estimate worksheet, with actual RO/customer/vehicle context and editable work, hours, parts, tax and total. Keep actual RO selection visible until a real RO is linked, even if a preliminary vehicle description exists.
- Provide one visible **Generate / Print Estimate** action. Keep catalog lookup, alternate experiences, evidence and historical previews in optional tools. Keep labor-basis and pricing/fitment/safety reviews collapsed until requested; show concise unresolved requirements and open the relevant review when blocked. Collapsing a control must never mark it reviewed.
- Allow part descriptions, numbers, quantity and pricing changes, and removal of optional work, beside the affected line. Required policy items cannot be removed. Changing scope still invalidates the existing exact-work review.
- Eliminate transfer-only confirmation screens. Preserve the original user-scoped browser draft and retain original planning values in a collapsed import-details disclosure. Do not copy the sample vehicle or approvals.
- In billing, choose the latest eligible native package automatically, show its approved line/discount/tax/total preview before issue, then request the business reason and explicit creation. Never silently select an older package behind a newer hold, reuse a voided package, post an invoice automatically, or infer missing legacy preview values.
- Continue an already posted invoice to payment records. Hide RO ID lookup, financial history, reporting and uncommon adjustment tools until needed. Existing unchanged-request recovery and all server financial/permission/QC checks remain mandatory.
- On phones, stack editable estimate rows with field labels instead of requiring horizontal scrolling. Staff should see amounts and the next action without navigating a dashboard.

This slice simplifies the Labor Guide estimate worksheet, Explorer handoff and native billing. It reuses existing exact-version authorization forms and issued-document printing; it does not redesign unrelated application consoles or claim that financial or production acceptance is complete.

## Repair Explorer to printed documents

1. At `/prototype/repair-explorer`, add work, choose **Review estimate**, then **Generate / Print Estimate**. The saved browser draft opens directly in the compact worksheet. Storage/validation failures preserve the draft and show an error; unknown, duplicate, overlapping, unpriced-labor or held catalog work is not silently omitted.
2. Search for the actual customer, VIN or RO. Choose **Save source quote & attach proposed work to this RO** to bind proposed work while retaining the source quote. The sample vehicle, approvals, fitment and labor reviews are never imported. Current shop rate policy applies.
3. Edit part details and prices inline, or explicitly remove an unitemized allowance and price actual parts. Complete the applicable labor-basis, fitment, overlap, procedure and tax reviews through the brief review disclosures. A price alone cannot make an unitemized allowance issuable. **Generate / Print Estimate** opens missing requirements or, once valid, issues and opens the frozen estimate.
4. Use **Print / save PDF**, then the same-RO document/authorization links. Customer approval remains a separate attributable decision on the exact revision, not a consequence of printing.
5. Open **Create / Print Final Invoice**. For a current eligible package, review its approved charges and totals, enter the business reason and choose **Create Final Invoice**; there is no package-ID selection. Otherwise prepare/recheck the package and resolve displayed holds. Posting rechecks current approval, measured completion, installations and QC; a preview is not proof of readiness.
6. Open **Open / Print Final Invoice** to print or save PDF. Record verified payments through the short payment form. Receipts are not card processing or money movement.

No new migration or automatic rollout is introduced. The underlying native-document/billing migrations must already exist in the target database before official document writes. Isolated staging does not apply those migrations to ordinary development/public or production data.

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

## Review Repair Workbench Closeout

The opt-in `/prototype/repair-workflow` to `/prototype/repair-workbench?repairOrderId=...` connects scoped execution tools through handoff without adopting a new default. Reconcile the package before native invoice posting; do not regenerate an already invoiced package unnecessarily. Final handoff records recipient, odometer, actual evidence and verified keys, requests current readiness, and closes through `/api/repair-workflow/[id]/commands` with rollout and server prerequisites enforced. Internal recon retains internal-cost billing; customer repair requires its current settled native invoice. Opening tools, printing, or approving this design does not authorize work, attest QC, settle money, mark frontline ready or sell the vehicle. Unfinished vendor-only evidence stays held under existing financial/release rules.

An isolated authenticated browser proof verifies actual QC release, READY evaluation and guarded closeout of a synthetic paid fixture. This complements, not replaces, real operational and finance acceptance.

## Verification and remaining release gates

Compact execution follow-up verification: 4,700 full-suite tests passed with 33 conditional skips; lint/typecheck and a separate production build passed. Both isolated PostgreSQL and both authenticated browser journeys pass, including compact desktop/phone layout, inline parts edits/removal, review holds, invoice preview/current-package selection and existing issued-document/payment/access proof. The original source draft remains loadable. No ordinary development/public or production migration was performed.

Native-billing baseline verification: 4,686 tests passed, 33 conditionally skipped (940 passing files, 31 conditional skipped files). Full isolated staging passes two real PostgreSQL journeys and two authenticated browser journeys. Typecheck, lint and a separate production build passed. Additional proof includes real isolated PostgreSQL checks for canonical money, measured clocks, immutable history, native posting/replay, overpayment refusal, original-payment refunds, credit reconciliation, terminal voids, frozen identity, portal partial decisions/receipt replay, stale source refusal and unpaid versus settled closeout; and authenticated browser invoice/payment/document/PDF/report/permission journeys. The saved estimate was visually inspected. Synthetic approvals, QC, installations and cashier evidence are explicitly fixtures, not actual customer work or money movement.

Before live release: review the complete diff and tax/discount/numbering/credit policy with finance, approve customer-facing language and genuine customer consent/delivery/QC/handoff acceptance, verify target-database backup/upgrade/restore/rollback, configure authorized billing users and rollout scope, and collect exact committed-candidate CI/staging evidence. Any legacy, vendor-only or incomplete evidence scope remains held until its real execution/cost/authorization evidence is reviewed; do not synthesize in-house clocks or customer payments to clear it. Do not describe this as universal vehicle-configuration approval or automatic production authorization.
## Staff document review refinements

Document review uses one Save changes & review action. Customer edits and financial edits are saved together in the estimate transaction, with the source document ID/hash and current estimate checked before creating the revision. Contact-only corrections preserve financial amounts and approval scope. Unchanged forms do not issue revisions. Issued invoice charges remain fixed.

The editor shows live totals and an unsaved document preview. Staff must save or discard edits before printing or moving to approval/QC. A per-tab browser draft restores editable fields after an interruption; permissions always come from the server. Uncertain save requests retain their original key and payload for recovery. Discounts have no additional staff/manager limit; discounts must still fit within the subtotal.

Customer documents use a compact four-column item table, readable expiration dates, and customer-facing approval text. New receipts record invoice, amount, method, reference and remaining balance as structured frozen content; internal audit evidence remains in its original records. History shows revision purpose, staff name and creation time. These presentation changes do not rewrite existing saved document snapshots.

## Separate document save and print actions

Service document review exposes Save PDF and Print independently. Save PDF downloads a native PDF for the exact selected saved document through the scoped documents/PDF endpoint. That read loads only RO location and the selected immutable snapshot, checks location and financial permissions, and verifies its hash; it does not load the workbench, all document history, or author names. Responses use private/no-store headers and safe attachment filenames.

Print clones only the selected document into a lightweight same-origin frame with its own CSS, standard fonts and a bounded logo-loading check. It does not print the whole React application or require a popup. Unsaved edits continue to disable both actions. A print failure reports a usable Save PDF alternative. The native PDF supports Letter pages, wrapped descriptions, repeated table headers, a totals block, customer-facing notes, logo and page numbers. Unsupported text is never silently replaced; the PDF error page directs staff to browser printing to preserve that text.
