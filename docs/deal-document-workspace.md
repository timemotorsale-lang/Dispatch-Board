# Deal documents: proofs, optional audit and correction

Open **Deals → Actions → Details & actions → Documents**. The six-column deal list stays compact. The shared workspace is also used in the existing Sales Documents packet screen, so saved files and requirements remain the same records.

## Required documents & proofs

The existing pathway/phase checklist shows Missing, Uploaded — review needed, Accepted, Correction needed, approved exceptions and optional items. Choose **Upload / scan** on the relevant row. Staff can upload one or several files into that requirement, or scan up to 28 pages into one PDF. Supplemental evidence uses **Add supporting proof**. Partial multi-file failures preserve files already saved and report how many succeeded.

Sales closing checklists omit odometer disclosure, signed delivery record, taxes and fees receipt, Buyer's Guide, binding contract disclosure and payment schedule. Lease-to-own also omits the signed purchase agreement and uses the signed lease agreement. The same requirements apply to new and existing deals, counts, next actions and finalization blockers. Existing files and earlier finalized snapshots remain available.

Expand **Prepared forms** to review or download generated working forms. Repeating generation reuses the active saved form for that deal and form type. Use **Replace** to exclude an outdated form before preparing a corrected copy.

Open **File actions → Review & accept** to inspect the original, confirm the customer/vehicle, type, pages and readability, and verify signatures where applicable. The existing Secure/Limited POA acceptance guards remain enforced on the server. Generated unsigned forms cannot become signature evidence.

A saved sales/lease draft without a jacket can use **Prepare required document checklist** inside Documents. This reuses the existing lifecycle command and original deal reference. **Review finalization & packet history** leads to the existing packet finalization controls; uploading or auditing does not finalize the sale.

## Document audit · optional

The audit starts collapsed. Choose a current saved file or **File actions → Perform document review**, then **Read document**. The reader uses that saved original; staff do not upload a second attachment. The existing private resumable reading service retains its source and review.

After confirming extracted fields, use **Save document audit**. Printed VIN, customer and stock are compared with the selected jacket. Findings distinguish a limited identity match, missing information and a possible wrong deal. A mismatch can be recorded as an audit finding without accepting it as valid evidence. Contract amounts, signature authenticity, legal validity, funding and delivery are not certified by this comparison.

Audit persistence requires a READY SALES reading job belonging to the same staff member and organization, a confirmed saved review, and the exact attachment checksum. The server derives the findings from the saved review rather than trusting a client-supplied result. Audit records reference the document, checksum, reading job and review version, with staff/time attribution. Recent audits and corrections are visible in the workspace; the underlying saved reading remains private to its owner.

## Uploaded by mistake / Replace

Choose **File actions → Uploaded by mistake** or **Replace** and provide a reason. The document becomes REJECTED and RESTRICTED, is excluded from the active checklist and future final packet snapshots, and gains a durable correction event. Bytes, object versions and earlier final packet snapshots are not deleted or overwritten. Replace then opens the original requirement's upload slot; a failed replacement remains visibly missing instead of silently counting the wrong evidence.

Finalized or funding-pending packets must first use the manager **Open correction addendum** workflow. Excluding a document referenced by an earlier final version also requires manager authority, even after reopening. Pending unwind packets remain locked. No sale unwind, payment reversal, title submission or vehicle release occurs through an attachment correction.

Excluded original content is manager-only through the Sales Documents content endpoint. Exports of historical versions containing a currently excluded document also require a manager; those snapshots remain unchanged. The packet history view displays a correction notice. Original retention/legal-hold settings are preserved.

## Validation and changed areas

- Shared workspace/component styles: `src/features/sales-documents/deal-document-workspace.*`.
- Drawer and packet integration: `src/features/crm-next/deal-operations-drawer.tsx`, `src/features/sales-documents/sales-documents-workspace.tsx`.
- OCR moved out of the ordinary scanner: `sales-document-scan.tsx`; the shared `document-reading-panel.tsx` supports a selected saved source and audit-only save, with ordinary form-application behavior preserved.
- Server: `src/server/sales-documents/service.ts` and `dashboard.ts` exclude mistaken documents consistently; `src/lib/sales-document-audit.ts` supplies identity assessment.
- Regression coverage: `sales-document-corrections.test.ts` plus existing document/reading/closing/dashboard suites; updated packet and enterprise drawer E2E specifications.
- 135 tests passed across 19 focused suites. Shared OCR browser checks passed at desktop/phone widths. `scripts/check-deal-document-workspace-ui.mjs` exercises upload, acceptance, saved-file audit, mismatch findings, replacement, layout and serious/critical accessibility checks using synthetic evidence. Actual local app read-only layout checks passed at 1860px and 390px. Full seeded authenticated E2E execution is separate from these component and read-only checks.

No schema migration or historical-record rewrite is needed. Changes are local on `codex/enterprise-general-refinement`; commit/deployment are separate actions.

Final targeted lint, type checking and the production build passed. Signed uploads require explicit staff signature verification at acceptance. Live-layout verification used read-only deal access; upload/audit/correction mutations were exercised with synthetic browser evidence and scoped service mocks, without altering live customer or financial records.
