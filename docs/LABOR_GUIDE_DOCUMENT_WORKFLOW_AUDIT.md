# Labor Guide enterprise document and reporting audit

**Audit date:** 2026-10-17, America/Chicago

**Audited source:** `a212d15099e2ac26e38cfd21b5acde143887e179`, the feature commit merged through PR #285 into `main` as `83a1dd0711ab8bfbb39ed08c8ccc668cf7e86f7e`

**Disposition:** Catalog implementation is not the same as complete enterprise customer-service release readiness. Reuse the existing foundations; resolve the commercial-integrity and authorization findings before enabling the affected customer-facing workflows.
**Change boundary:** Audit only. No application/schema changes, production reads/writes, policy activation, customer communication, deployment, commit or push were performed for this audit. Isolated mocked reproduction files/logs are in ignored `test-results/labor-document-audit/`.

## Follow-up implementation (2026-10-18)

This is the historical baseline audit, not a description of the modified working tree. The user subsequently chose native invoices and payments and authorized the integrity → documents/approvals → native billing → reporting → isolated staging implementation. See `NATIVE_SERVICE_BILLING.md` and the newer entry in `CURRENT_IMPLEMENTATION_STATUS.md` for implemented safeguards, local proof and remaining real-world release gates. Historical reproductions below intentionally describe the pre-fix bugs; they are not acceptance tests to keep passing. No production deployment or fabricated customer/financial evidence is implied.

## 1. Executive finding

The app already has canonical ROs, printable RO output, versioned estimates, a dedicated printable official estimate, line-level staff/customer authorization records, governed jobs/clocks/QC/release, invoice-ready packages, external invoice reconciliation, general reporting infrastructure and a measured-labor evidence view. We should **not build another RO, estimate, authorization or timer system**.

The full customer-service chain is **not yet established as enterprise release-ready**:

`RO → reviewed estimate → exact-version customer decision → authorized jobs → measured execution → QC/release → reconciled invoice/document → trustworthy reports`

The highest-priority gaps are not catalog coverage. Invoice output currently substitutes planning minutes for actual clock time; invoice expected totals do not build a complete approved commercial ledger; invoice transitions/reconciliation can lose readiness mismatches; portal decisions use a different line-money shape from canonical estimates; portal mutation checks do not fully bind vehicle/current version; and location-specific read denials can be skipped. Delivery evidence, retry safety and document history also need hardening.

These findings do **not** establish that production customers were affected, and this audit did not exercise live endpoints. Existing execution checks still reject superseded/revoked authorization before new jobs/dispatch/start; a bad portal receipt does not automatically imply unauthorized repairs can execute.

## 2. Scope and enterprise acceptance baseline

Reviewed application services/repositories, document pages, workflow UI, schema, reporting sources, relevant tests and internal planning documents. The baseline is the app's approved modular-monolith/source-authority direction and its Labor Guide estimating/document/release specifications—not a claim of parity with a named external vendor, regulatory certification or a legal/tax assessment.

Enterprise acceptance here means:

- A single traceable customer/vehicle/RO lineage and clearly separated draft, presented, approved, executed, invoiced and paid/external-status facts.
- Deterministic cent-based commercial calculations, explicit billed hours versus measured technician minutes, and versioned pricing/source policies.
- Exact-version, scoped authorization with recorded actor/channel/time, supplements/revocation and safe retries.
- Reproducible documents, controlled sharing, access enforcement, audit trails and retained historical versions.
- Invoice or accounting-handoff totals that reconcile to authorized/performed work without confusing parts cost, customer retail charges, tax and payments.
- Reports with documented definitions, period/location/technician attribution, source lineage, exclusions, completeness and drilldown.
- A genuine staged customer-service acceptance journey plus recovery/rollback and operator evidence.

An internal catalog-review release can be narrower. It must not advertise unfinished customer approval, invoicing or financial reporting as complete. There is no requirement to approve every possible vehicle configuration before releasing a bounded catalog.

## 3. Existing capabilities to retain

| Area | Verified implementation | Important limit |
| --- | --- | --- |
| RO | Canonical service visit/repair order, customer/vehicle linkage, state events, existing print route | Printable intake/work record is not a frozen complete final service document or approval receipt. |
| Estimate | Shared Labor Guide selections, preliminary saved work, server-side pricing/fitment/source controls, immutable estimate versions, authoritative persisted-line document rendering | Printable official estimate exists; historical identity/layout snapshots and complete customer-facing line disclosures need improvement. |
| Official estimate | `/repair-estimate?repairOrderId=<id>&estimateId=<id>` reads the saved version; URL customer/price overrides are ignored; URL-only content is explicitly preliminary | Browser printing, not evidence of an archived generated PDF, delivery or customer acceptance. “Send to repair workbench” is navigation, not an auditable delivery/transmission receipt. |
| Authorization | Staff exact-line decisions, expiring portal grants, request/decision records, scope/status checks, independent execution guards | Portal money/scope/freshness/partial-decision semantics and delivery evidence have gaps below. |
| Execution/QC | Existing job/part-demand linkage, qualifications/procedures/resources, persistent clocks, QC and release services | Do not replace these with document buttons or infer completed work from estimate creation. |
| Invoice | Versioned `ServiceInvoicePackage`, mismatch reasons, installed-parts cost, external handoff status/reconciliation and close/reopen history | This is an invoice-ready operational package, not proof of a complete native customer billing/payment system. |
| Reports | General reporting definitions/snapshots/controlled exports, shop production snapshots, manager-only actual labor evidence | Current Recon report is open-order age; labor evidence is a latest-200-job study view, not a full commercial Labor Guide reporting suite. |

Primary implementation anchors: `src/app/api/repair-orders/[id]/print/route.ts:37`; `src/app/repair-estimate/page.tsx:85`; `src/features/diagnostics/official-repair-estimate-document.tsx:29`; `src/server/service-close-parts/repository.ts:156`; `src/server/diagnostics/actual-labor-evidence.ts:24`.

## 4. Findings and required acceptance tests

Priority meanings: **P1** = fix before enabling the affected enterprise customer/financial workflow; **P2** = required enterprise completion/hardening, which may be staged behind an explicitly limited pilot. “Reproduced” below means isolated unit/dependency fixtures against actual source functions, **not** live database/browser exploitation. Reproduction tests intentionally assert today's undesirable behavior to establish the gap; they are not passing release-acceptance tests.

### LGD-001 — P1 — Invoice “clocked labor” is not measured labor

**Evidence:** `src/server/service-close-parts/repository.ts:164` derives `clockedLaborMinutes` from QC-passed jobs' `laborGuideMinutes` plus correction events, rather than persisted labor clocks or START/PAUSE/RESUME/FINISH intervals. Reproduction AUD-01 returns **120 clocked minutes for a job with a finished 15-minute clock**.

**Required work:** Reuse the actual-clock source and explicit completeness rules. Keep proposed/authorized/billed labor time, measured technician time, vehicle elapsed time and any study/earned-standard time as different fields. Do not change customer charges automatically merely because measured time differs from a flat-rate estimate.

**Acceptance:** A 120-minute authorized planning allowance with 15 measured minutes reports those two values separately; pauses, corrections, multiple technicians, unfinished clocks and rework remain attributable without fabrication.

### LGD-002 — P1 — Invoice-ready totals are not a complete approved commercial ledger

**Evidence:** `src/server/service-close-parts/repository.ts:161` builds invoice lines/`authorizedTotalCents` from repair jobs. Those jobs represent authorized labor lines; generation does not load the estimate/authorization line ledger. Installed parts are represented as internal cost, not complete approved retail charges. AUD-02 produces **10,000 cents** for a fixture estimate containing 10,000 labor + 2,000 parts + 500 fees + 140 tax = **12,640 cents**.

**Required work:** Define a canonical authorized/performed/billable line contract, carrying quantity, unit charge, labor time/rate, linked parts, approved fees/sublet, discounts, taxable basis, tax-policy reference and rounding. Reconcile partial decisions, supplements, cancelled/unperformed work and returns without double billing. Keep cost separate from selling price.

**Acceptance:** Every invoice/handoff line traces to the appropriate approval and executed/supplied scope. Full and partial totals reconcile across estimate → authorization → billable ledger → customer invoice/accounting handoff. Historical policy changes do not reprice old records.

### LGD-003 — P1 — Invoice mismatch protections can be bypassed by handoff/reconciliation

**Evidence:** `src/server/service-close-parts/repository.ts:181` permits `READY → SUBMITTED` without checking mismatch codes; AUD-03 submits an `INVOICE_JOB_QC_INCOMPLETE` package. `src/server/customer-lifecycle/repository.ts:96` compares only returned grand total with package expected total, ignores expected subtotal/tax allocation and replaces prior mismatches with supplied discrepancy codes. AUD-04 accepts **1-cent subtotal + 9,999-cent tax** when the 10,000-cent grand total matches, and clears the QC mismatch.

**Required work:** Independently preserve operational readiness mismatches and financial reconciliation discrepancies; neither can erase the other. Recheck relevant current QC/authorization/install state at submission, acceptance and close. Reconcile subtotal, discounts/fees, tax and total against a versioned contract. Define local-ready versus externally-accepted close policy explicitly; the current close path accepts `READY` or `ACCEPTED` packages (`repository.ts:192`).

**Acceptance:** Unresolved QC/parts/approval mismatches block affected finalization even if an external total matches. A changed tax/subtotal split fails reconciliation. Later rework or supplements invalidate stale readiness rather than silently closing against it.

### LGD-004 — P1 — Portal authorization money does not use canonical estimate-line fields

**Evidence:** Canonical estimate lines use `quantity` and `unitPriceCents` (`src/server/shop-planning/domain.ts:6`). Portal decision totals sum `line.totalCents ?? 0` (`src/server/customer-lifecycle/repository.ts:154`). AUD-05 approves a canonical **10,000-cent line as zero cents**. The portal UI's line type also expects `totalCents` (`src/features/inventory/vehicle-portal-workspace.tsx:5`).

**Required work:** Share server-authoritative estimate-line and money calculation contracts across staff presentation, portal display, approval amount and invoice reconciliation; apply the approved tax/discount boundary rather than inventing separate formulas. Do not trust browser-supplied totals.

**Acceptance:** The customer sees the same line charges and policy-qualified approved amount as staff; labor/parts/fees, fractional quantities, rounding, partial approval, discounts and tax are reconciled and tested.

### LGD-005 — P1 — Portal decision mutation needs stronger vehicle/version/freshness binding

**Evidence:** `src/server/customer-lifecycle/repository.ts:152` finds the request by organization, optional customer, ID and pending/expiry state, but does not bind its RO to the grant's vehicle. The following estimate lookup pins its stored ID/version without requiring current presented/unexpired status or rejecting a superseded version. AUD-06 accepts the dependency fixture's other-vehicle, expired/superseded estimate under a still-active grant/request. If a grant has no customer ID, that query omits the customer filter as well. Portal read filtering is stronger than this mutation path.

**Required work:** Bind mutations to the permitted grant subject/customer/vehicle/RO/request and intended scope; reject expired/superseded estimates and revoked/replaced requests transactionally. Decide whether one link authorizes a single request or multiple explicitly scoped requests. Keep current execution guards as defense in depth.

**Acceptance:** Same-customer/different-vehicle requests, another customer's request, a stale estimate, revoked grant, expired request and repeated/concurrent decisions cannot produce a new authorization outside the intended scope. A retry after successful capture returns the original receipt without duplicating it.

### LGD-006 — P2 — Partial and outstanding portal decisions are ambiguous

**Evidence:** `src/server/customer-lifecycle/repository.ts:154` calls a decision `ACCEPTED` whenever any line is approved and no line is explicitly declined, even if other lines were left undecided. AUD-05 approves one of two lines, returning `ACCEPTED`. Execution still uses approved keys, so this does not grant the omitted line authority.

**Required work:** Define explicit approved/declined/deferred/undecided line states and total reconciliation. Require a complete decision or retain outstanding requests according to the business policy. Publish a readable exact-version receipt, including later supplements/revocations.

**Acceptance:** Approving only one selected line cannot be represented as full-estimate acceptance. Omitted lines remain visibly unresolved and cannot be billed or executed without a separate decision.

### LGD-007 — P1 — RO/estimate reads can skip explicit location-specific denials

**Evidence:** `getShopPlanningDetail` authorizes with `locationId: null` before fetching the RO (`src/server/shop-planning/service.ts:28`); `getRepairOrderDetail` has the same read pattern (`src/server/repair-order/service.ts:24`). Location-bound grants/denials do not match a null location. AUD-07 demonstrates a manager whose direct capability check denies the actual RO location nevertheless receiving that RO/estimate through the detail read service.

**Required work:** Authorize against the actual record location and filter list/search/export/document queries to permitted locations; distinguish financial/customer-document access from technician execution views where required. Validate print/download/archive routes as well as visible navigation.

**Acceptance:** An explicit location DENY blocks direct RO, estimate, document and report access even for a broad default role. Authorized locations still work, and list counts/exports do not leak denied records. This is an existing read-boundary gap, not evidence of a live cross-tenant incident.

### LGD-008 — P2 — Financial command response-loss retries are not stable

**Evidence:** Invoice generation reads the current aggregate version on each service call (`src/server/service-close-parts/service.ts:120`). AUD-08 sends identical business input/idempotency key before and after aggregate advancement and obtains different request hashes. The existing command ledger rejects a reused key with a changed hash (`src/server/enterprise-command/aggregate-mutation.ts:6`). The recent policy-receipt retry fix does not cover these invoice commands.

**Required work:** Preserve original command identity/version receipt for response-loss retries without weakening changed-payload/actor detection or optimistic concurrency. Address invoice generation/handoff/reconciliation/close and approval request/decision commands as a coherent command contract.

**Acceptance:** Repeat the same request after a simulated lost response and later aggregate advancement: return the original result, no extra package/decision/close event. Reusing that key with changed financial content must still fail.

### LGD-009 — P1 for customer delivery claims — “Delivered” is recorded before delivery proof

**Evidence:** Approval request creation sets `deliveredAt` and delivery evidence with `providerReference: "BOUNDARY_PENDING"` (`src/server/customer-lifecycle/repository.ts:70`). Consent/quiet-time checks and creation of a matching portal grant already exist; there is no token-table mismatch. However, request/link creation is not delivery acknowledgement.

**Required work:** Separate prepared/link-created/queued/sent/delivered/failed/viewed/decided events. Support an explicitly recorded manual handoff when no outbound provider is configured. Bind consent, intended recipient, document revision, delivery reference and failure/retry evidence; never fabricate delivery evidence from link generation.

**Acceptance:** Creating an approval link leaves delivery unconfirmed; only verified provider/manual evidence changes that status. Failures/retries, expiry/revocation and receipt history remain accessible without exposing bearer tokens in logs or reports.

### LGD-010 — P2 — Customer documents need frozen, complete historical output

**Evidence:** The official estimate correctly loads persisted lines and totals, but its customer/vehicle/concern come from the current RO (`src/app/repair-estimate/page.tsx:92`). Labor `quantityLabel` is just line quantity (`page.tsx:104`), not the full hours/rate/source disclosure. The document uses fixed store identity (`src/features/diagnostics/official-repair-estimate-document.tsx:72`). The printable RO shows intake/operational details and staff acknowledgement lines, not a complete approved-scope/history/customer receipt package.

**Required work:** Reuse the existing print surfaces, adding versioned document identity and frozen customer/vehicle/VIN/odometer/store/timezone snapshots; clear proposed versus approved versus completed scope; labor hours/rate/line amount; parts quantity/specification; fees/discount/tax summary; validity/assumptions/provisional-time disclosure and supersession state. Retain template version, generated artifact hash and access/delivery lineage. Keep internal costs, staff-only notes and unapproved recommendations out of customer copies.

**Acceptance:** Reprinting version 1 after editing customer details, vehicle context, rate policy or store branding reproduces its recorded content. Long descriptions/many lines print across pages cleanly on desktop/mobile print-to-PDF, without application chrome or clipped totals. Archiving does not make old links bypass current access checks.

### LGD-011 — P1 scope decision for a full financial release — Define native invoice versus governed external handoff

**Evidence:** `ServiceInvoicePackage` (`prisma/schema.prisma:6352`) stores an operational package/status/external reference, not a complete numbered customer invoice with posting, adjustments, payments and balance semantics. The audited service-close UI exposes “Generate package”, not a complete customer invoice document/payment workflow. Vendor invoice batches are a different payable domain and must not be mistaken for customer invoices. No complete service-customer final invoice print/download/credit/payment lifecycle was established in the audited surfaces.

**Required decision:** Choose one release mode, not two competing accounting authorities:

1. **External billing remains authoritative:** produce a complete reconciled invoice-ready payload; capture the external invoice number, amounts/status, immutable customer copy/reference, adjustments and reconciliation evidence. Do not label a merely generated package “customer invoiced” or “paid”.
2. **Native service invoicing:** implement governed invoice numbering/posting, immutable finalized lines/tax/discounts, credit/void/reissue/supplement controls, payment/receipt/balance or explicitly scoped payment handoff, and finance permissions/audit. This is additional product scope, not already delivered by the catalog.

**Acceptance:** The customer and staff can retrieve the correct final invoice and adjustment history; authorized/performed/charged/paid facts reconcile. A package or externally accepted transfer alone never implies customer payment. A full DMS/general-ledger rewrite is not required if external billing is the approved boundary.

### LGD-012 — P2 — No complete Labor Guide reporting contract

**Evidence:** `src/server/reporting/live-service.ts:51` defines Recon as open-order age, explicitly not completed cycle time/active labor. `src/server/diagnostics/actual-labor-evidence.ts:24` reads the latest 200 jobs, caps events and correctly excludes unsuitable study samples. It is a useful evidence screen, not a date-filtered financial/performance reporting ledger. Shop production calculations exist (`src/server/shop-completion/repository.ts:69`), but earned minutes use job guide minutes; they must not be presented as validated standards or conflated with actual/billed time.

**Required work:** Extend the existing reporting source-owner contracts, not a second dashboard database. Add the measures in section 5 with immutable cutoff/source versions, complete history or explicit partial-coverage warnings, governed filters, access-safe drilldown/exports and correction/late-data behavior. Preserve missing/unknown values instead of inventing zero financial outcomes or “validated” performance.

**Acceptance:** Report totals reconcile to document/authorization/job/clock/invoice rows for the same period and location; closed/reopened orders, revisions, refunds/rework and multiple technicians are attributable. Frozen reports remain reproducible while subsequent corrections are traceable.

### LGD-013 — P2 — Document/authorization retrieval and lifecycle are not one coherent operator journey

**Evidence:** Existing routes are split among `/diagnostics/labor-guide`, `/repair-estimate`, `/vehicles/shop-planning`, `/vehicles/service-close-parts`, `/portal/estimate/<token>` and reports. The estimate has a clear non-authorization warning, but a complete service-document bundle with standalone customer decision receipt, invoice copy, supplements, revoked-link behavior and retained access history was not established by this audit. Claims-specific authorization PDFs are not proof of a general RO authorization document.

**Required work:** Add an RO document/history hub over existing records: current and superseded estimates, exact-line decision receipts, work/QC/release references, invoice/external handoff copies, attachments and delivery/access events. Define template ownership, access/retention/revocation, reasoned corrections and document readiness. Link it from the Labor Guide without making new competing records.

**Acceptance:** An advisor can retrieve and explain the complete version chain from one RO; the customer sees only permitted copies; a technician gets approved scope without private margin/cost data. Revocation/expiry and archived copies retain an auditable distinction.

### LGD-014 — P1 before broad customer-service release — Full commercial journey and recovery proof remain missing

**Evidence:** Existing document rendering/domain tests pass, and the recent isolated staging test proves selected policy/dispatch/clock/access guards. Those tests do not run the full customer estimate/decision/QC/invoice/report journey against a real isolated database. The audit reproduced failures despite the previously green broad suite, demonstrating missing assertions rather than a need to weaken tests.

**Required work:** Add database and authenticated-browser journeys for the chosen financial mode; turn the reproductions into desired-behavior regressions. Include actual printed/PDF outputs, customer/role/location scope, lost responses, concurrent supplements/revisions, failed/rework/passed QC, partial/declined/revoked decisions and reconciled reports. Execute the existing deployed-baseline upgrade, full database/file restore, rollback and operator-release evidence gates for the committed candidate.

**Acceptance:** A recorded staged journey produces matching RO, estimate, decision receipt, approved jobs, measured clocks, QC/release, final invoice or external reference and reports, while negative attempts fail before writes. Production stays manual; no synthetic data/signature is represented as business approval.

## 5. Required Labor Guide report catalog

| Report | Required distinction / reconciliation |
| --- | --- |
| Estimate register | Draft versus officially presented; version, author, vehicle/RO, source/time basis, totals, expiry and supersession. |
| Approval register / pending queue | Approved, declined, deferred and undecided lines/amounts; exact version; request delivery/view/decision times; revoked/expired scope. |
| Estimate-to-invoice variance | Approved versus performed versus charged lines, supplements, returns, tax/fee/discount changes and attributable reasons. |
| Labor plan versus actual | Proposed/approved/billed hours separately from persisted technician-minutes; pauses, corrections, rework, configuration and exclusions. |
| Technician operations | Presence/productive time/completed work with explicit denominators, attribution, rework/QC and missing-data limitations; no unsupported pay or disciplinary conclusion. |
| Open RO / WIP and aging | Stage/owner/location, active versus waiting time, authorization/parts/QC blockers, promise changes, closed/reopened lineage. |
| Invoice/handoff reconciliation | Number/status/version, subtotal/tax/discount/fees/total, external references, unresolved operational versus financial discrepancies. |
| Payments / balances / adjustments | Only authoritative native or external facts under the approved billing mode; no package-status inference. |
| Parts and margin | Approved retail quantity/value versus issued/installed/returned quantity and actual cost; consistent markup versus gross-margin definitions. |
| QC / comeback / warranty | First-pass outcomes, rework scope, later comebacks and warranty versus retail/internal billing; clear cohort/observation-window definitions. |
| Catalog/time validation | Operation/version/configuration samples, actual-time exclusions, sample size and reviewer; provisional hours never become validated standards automatically. |
| Document/access/audit exceptions | Missing copies, pending delivery, denied or expired access, superseded documents, mismatches, failed retries and recovery evidence. |

Every definition needs a source owner, timezone/cutoff, period/location/technician/customer scope, numerator/denominator where applicable, missing-data behavior, permitted roles, drilldown and export/retention rules. Business policy determines amounts and billing responsibilities; report code must not infer them from ambiguous statuses.

## 6. Recommended implementation sequence

These are **new document/workflow work packages**, not a reversal of the completed ten-system catalog implementation.

1. **Commercial and authorization integrity:** fix LGD-001–009 with shared money/clock/authorization contracts and fail-closed finalization. Preserve existing records and add desired-behavior regressions for the reproduced cases.
2. **Enterprise RO and estimate documents:** implement frozen document snapshots/manifests, complete line disclosures, pagination/print/PDF verification and historical retrieval on the current RO/estimate services (LGD-010).
3. **Customer approval and document hub:** deliver the exact-version receipt/history, real/manual delivery evidence, scopes, supplements/revocation and unified RO document navigation (LGD-005/006/009/013).
4. **Invoice mode and financial close:** obtain the native-versus-external billing decision, implement its authoritative document/handoff/adjustment boundary and reconcile every relevant charge before close (LGD-002/003/011).
5. **Enterprise Labor Guide reports:** implement the section 5 definitions through existing reporting/clock/invoice owners with source-backed totals, safe exports and completeness warnings (LGD-012).
6. **Release proof:** complete the selected real-database/browser/customer-document journeys, recovery/rollback and independent operational signoffs; attach exact-committed-revision evidence before any manual production promotion (LGD-014).

Start with package 1 and the invoice-mode decision. Templates alone cannot correct the ledger or authorization defects. Do not implement every vehicle configuration, a separate accounting platform, licensed labor data, a new timer or a parallel RO database as a prerequisite for these fixes.

## 7. Audit verification and limitations

- **68 existing focused tests passed across 13 files:** official-estimate document/page, Shop Planning/domain/job creation, service-close domain/service/schema/workspace, Shop Completion domain, Labor Pilot authorization/execution, and reporting period service.
- **8 isolated reproduction scenarios passed**, meaning they reproduced the current undesirable behavior listed in LGD-001–008. Some scenarios establish more than one gap. They use mocked transaction/dependency fixtures and actual application functions; they do not prove a live production exploit or complete business acceptance.
- Isolated configuration, fixtures and verbose results remain under ignored `test-results/labor-document-audit/`; these are local supporting evidence, not committed regression coverage or release signoff. Before fixing a finding, promote its desired behavior into permanent tests in the established suite.
- This was a bounded source/workflow audit. No real customer, invoice, payment, bearer token or production database was inspected or modified. No email/SMS was sent, and no policies/workflow deployments were triggered.
- This audit did not render a full browser print/PDF matrix, run database migrations, execute a full new regression/build, certify vendor/legal/tax rules, benchmark production load, or establish production recovery. Earlier successful builds/full-suite results remain useful historical evidence, not proof that these newly identified business scenarios are correct.
- A whole-repository search found no complete service-customer invoice/credit/payment document lifecycle in the audited service surfaces; that is a scoped implementation gap, not a claim that unrelated financial/vendor/collections modules do not exist.

## 8. Release decision

**Enterprise customer estimating/approval/invoicing/reporting: HOLD pending the relevant findings, the billing-authority decision and end-to-end acceptance.** Existing internal catalog review can remain a separately bounded pilot with its approval/execution safeguards. Production deployment still needs successful exact-revision CI and the existing independent release evidence, staging/recovery and manual approval controls.

No approval of every possible make/model/engine combination is required. Vehicle-specific applicability/procedure review remains a per-repair responsibility, distinct from software release readiness.
