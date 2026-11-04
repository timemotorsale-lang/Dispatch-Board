# Customer signing forms - TMS-MN-SIGNING-1.0

Released for customer presentation by the owner in this conversation on November 3, 2026. This supersedes the earlier header-only approval for customer-facing use. The historical review collection remains unchanged under ../review.

The final collection contains 11 custom dealership forms (17 pages) and the unchanged official FTC Buyers Guide (2 pages). The January 2024 Minnesota application remains a historical reference outside this signing collection; official title filing uses the current agency form or filing system.

The released PDFs remove draft/legal-review banners, review-edition footers, placeholder header text and wording that described these documents as proposed drafts. Operational eligibility checks, disclosures, customer elections, complete multipage agreements, contact details and blank signature/notary areas remain intact. See release-sales-signing-forms.py and release-manifest.json for the exact transformations and source/output checksums. Release records the owner's presentation decision; it does not claim an external legal opinion or agency acceptance.

Cash-sale generation fills the relevant final source PDFs using cash-signing-template-map.json. The source hash is checked before generation. Long values are carried on readable continuation pages. The original template files are never edited by deal generation. Financing/device forms are retained in the final collection but are not silently included in cash packs.

Cash print workflow:
1. Open Cash sale print library from Documents or the saved deal summary.
2. Choose Print Packs or individual forms in Document Library.
3. Generate selected pack. Required baseline forms remain archived on the same deal.
4. Preview, download or print only the selected forms. Multipage documents remain together.
5. Use the duplex option to start each form on a new sheet; it inserts blank separators where needed.

Arbitration is optional. Conditional As Is and warranty forms cannot be selected together. Selecting As Is requires the entered exclusion and staff eligibility review. Customer consents, signatures, notarial acts, payment settlement and actual delivery are never created by generation.

The current selector supports paper signing. No e-sign provider connection is implied.

Rebuild final PDFs with the bundled Python runtime (pypdf), then rebuild the field map (pdfplumber):
- scripts/release-sales-signing-forms.py
- scripts/build-cash-signing-template-map.py

Inspect rendered pages after any template or mapping change; do not change map coordinates without verifying the new PDF layout.
