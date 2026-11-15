# Saved repair work retrieval

Open **Find saved repair work** in Labor Guide, Auto Body Guide, or Deals. Search by repair/document number, customer, vehicle, VIN, stock number, or billing reference. The default includes all dates and both open and closed work. Record-kind and status filters narrow results; pagination retains access to older records.

In a deal's **History** tab, the search is restricted to its linked customer ID. The global Deals search also finds repair records that were never attached to a deal. Deal category counts remain deal counts.

## Records and preservation

- Frozen estimates, invoices, and receipts open the selected original document version.
- Legacy estimates open the selected estimate version using the existing legacy-document view.
- Invoice-preparation packages and external reconciliation references open a read-only billing record. A preparation package is not an issued invoice. Native billing records without archived documents are labeled as records; opening them does not manufacture a PDF or receipt.
- Staff can retrieve their own saved Labor Guide quotes, including archived quotes, inside the visual Labor Guide at `/prototype/repair-explorer?draftId=...`. Old Labor Guide bookmarks preserve their record and return context when redirected to that interface. Archived quotes open as new drafts; explicit saving creates a copy and preserves the original.
- Auto Body drafts retain their existing edit/read-only rules. Guide search links open separately so the current worksheet remains available.
- Browser-only recovery data remains on the original browser/device. This directory does not upload or expose unsaved browser worksheets.

Search and exact-record reads preserve organization/store permissions. Financial records and financial-reference matches require billing-view permission. Private quote ownership is unchanged. History retrieval does not enable mutation rollout flags or write to historical records.

## Regression checks

Run the focused history, guide, deal, draft-route, and document-page unit suites with Vitest. Run `repair-history.spec.ts` separately through `node scripts/run-e2e.mjs repair-history.spec.ts` against a **disposable local PostgreSQL database**. The browser runner creates a separate schema; do not point it at production. Set `CRM_NEXT=DOGFOOD` for the isolated browser fixture to exercise the operational Deals console rather than its review placeholder.

The browser fixture creates synthetic closed repair work dated 2018 and checks search, exact record links, draft restoration, billing/store/ownership denials, pagination, mobile containment, and unchanged historical records after reads. It must not invoke billing commands or regenerate documents.

No schema migration or historical-data backfill is required for this feature.

## Visual Labor Guide restoration (November 14, 2026)

Saved labor quotes now open in the visual Find repair / Review estimate interface. Both older labor-guide routes redirect with draft, repair-order, import, and safe internal return context preserved. The visual interface reuses the persisted estimate model, including labor, parts, fees, discount, tax, and identity; it does not convert a saved quote into the simplified browser preview model. Archived quotes remain copy-on-save. Missing, private, or mismatched drafts show recovery feedback rather than an actionable empty worksheet. Issued document links still retrieve their exact historical versions.

Verification: 123 focused unit tests passed. All 16 browser cases passed (15 on the initial run, followed by the corrected import-fixture case on a targeted rerun). Browser checks covered restore, edits/save/reload, archived-copy preservation, ownership and repair-order mismatch denial, old import links, historical document preservation, and desktop/mobile containment. Read-only review of the existing local Honda quote retained its $747.69 total. These checks do not certify production rollout configuration or rerun the entire application workflow suite.

Final scoped lint and the production Webpack build (including TypeScript) also passed. No push or deployment was performed.
