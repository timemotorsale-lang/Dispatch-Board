# Sales Documents Foundation

## Deal Closing Blueprint — Preparation Slice (2026-10-24)

Website Console → Paperwork & Delivery (`/website-console?section=paperwork`)
contains the permanent implementation guide and eight distinct preparation paths:
cash, outside-bank, dealer-arranged credit, dealer-retained credit, closed-end lease,
open-end lease, lease-purchase proposal and lease buyout. These are not newly approved
public offerings or a legally complete forms inventory. Closed-end leasing is not
automatically lease-to-own; legal classification and document-specific signing
acceptance remain external approval gates.

Sales Documents → selected jacket → Paperwork & delivery preparation lets staff
read a saved review. Only actors with the existing elevated document permission can
save one. Each complete review records classification facts, check states, controlled
evidence references or follow-up reasons, server-attributed reviewer/time and the
resulting jacket revision. Checks cannot be omitted or duplicated. Non-pending
states require evidence; only explicitly conditional checks allow non-applicability.
The proposed path does not rewrite the legacy Deal Desk pathway or generate contracts.

Persistence uses the same organization-scoped `SalesDocumentJacket.closingReview`
with an append-only `CLOSING_REVIEW_SAVED` audit snapshot in the existing private
document audit store. Saving uses the existing revision lock and transaction; a
concurrent save fails with 409. A later jacket mutation conservatively invalidates
the review, including a staff note. Old snapshots remain in the audit store; the UI's
recent-history limit does not delete them. Re-review requires explicit re-attestation
of every state. A review may be recorded after packet finalization without changing
the preserved document versions or the legal effect of any existing contract.

Apply additive migration `20261024010000_deal_closing_review` and regenerate Prisma
before using this slice. Existing jackets default to no review. Back up the database
and private byte store before deployment; do not apply a partially migrated release.
There is no new public endpoint, customer disclosure of internal reviews, customer
identity store or duplicate document repository.

**Not implemented:** production customer/deal authorization and portal, customer
uploads, approved jurisdiction/form/deadline rules, live e-signatures, reliable copy
delivery receipts, authoritative funds checks, independent release authorization,
custody transfer, assigned post-sale tasks and retention/hold administration. The
review summary always returns `signingAllowed: false` and `releaseAllowed: false`,
even when every item is reviewed. Legacy packet finalization remains document
archiving, not proof of funding, vehicle delivery or permission to release. No legal
requirement is waived by this review; evidence notes are not provider verification.

Next slices: approved rules/form register → verified participant access and secure
uploads → accepted signing and copy delivery → independent release and handoff →
post-sale obligations/recovery. Pilot one complete approved cash pathway first;
do not enable partial online transaction completion.

Verification: `src/tests/unit/deal-closing.test.tsx`, existing document/console
access tests, and closing-review persistence/permission tests. These verify software
behavior, not legal approval, real funding, completed signatures or a live handoff.

Local verification: 80 focused unit/database tests passed. The opt-in PostgreSQL
proof checks save/reload, revision conflicts, denied mutations, rollback of invalid
reviews, stale evidence and retained audit snapshots, then removes only its synthetic
fixture. The authenticated browser proof covers the console guide, pathway-specific
checks, rejected-save draft retention, saved review retrieval, accessibility and desktop/mobile overflow. Its
fixture is also removed. The local additive migration was applied after creating
and archive-checking a database backup; archive validation is not a restore test.
Scoped TypeScript and edited-file lint checks are separate from the repository-wide
typecheck, which exceeded the default Node heap limit during this run. The installed
Next.js security-upgrade warning remains a launch blocker, not resolved by this slice.

## Staff Workflow

Sales Documents stores one deal jacket per deal reference and pathway. Access it
from the Sales navigation, Document Library, customer record, or a saved Deal Desk
packet. Search by customer, deal number, VIN, stock number, or vehicle reference.

1. Generate working forms in Deal Desk or create a jacket directly.
2. Save signed PDFs, photos, and supporting documents to the jacket.
3. Review each saved copy and verify signatures where required.
4. Finalize the closing packet, or finalize checkout followed by return for
   rentals, loaners, and test drives.
5. Retrieve a finalized version as a combined PDF or ZIP of original files.

Generated forms do not count as signed evidence. Uploaded documents stay pending
until reviewed. Required-document exceptions need elevated document permission
and a reason. Outside-finance delivery pending funding also needs elevated
permission and a reason; other required documents still block finalization.

Finalization is an explicit staff action in this foundation. It is not yet an
automatic side effect of completing each Deal Desk pathway. Pathway-specific
document packs and the future BHPH collections console are subsequent work.

## Persistence And Integrity

### Saved Deal Retrieval

The main CRM Next Deals page is a task workbench: one transaction list, customer/
vehicle/reference search, revenue-path and status menus, Start Deal, Continue,
and Open packet. It lists both saved drafts and stored document jackets, including
rental/loaner packets that have no draft. Matching uses saved jacket IDs/references,
not customer-name guesses; linked drafts and jackets appear in one row. Retrieval
and category counts are paginated in the database, 25 records at a time. Drafts
remain private to their owning staff account and configured organization. Packets
retain the existing organization-scoped document permission rules. The
quick-resume menu shows recent deals; the library retrieves older saved records.
Categories are Working Deals, Pending, Sold Deals, Lost Deals, Completed,
Cancelled, and Archived. Staff choose the saved-deal disposition explicitly;
changes are saved with the draft revision and server-attributed status history.
Existing drafts default to Working Deals. Automatic reopening selects a recent
Working or Pending deal, not a closed or archived record.
Packet-only records derive their category from packet state: open/checked-out is
Working, funding pending is Pending, and a closed packet is Completed. Finalized
paperwork alone is not proof of a sold vehicle; Sold remains a staff-selected deal
disposition.

These categories organize saved workspace records. Marking a saved deal Sold or
Completed does not change inventory, complete checkout, update the CRM opportunity
lifecycle, activate a collections account, or finalize its document jacket. Those
workflows retain their own server-enforced requirements. Archived/lost records
remain searchable and can be reopened without deleting their saved work.

Opening a packet goes directly to that customer's working documents. Staff can
save several photos/documents in one operation, record dated/attributed updates,
review files, or finalize checkout/return. The detailed readiness checklist is
expandable rather than a competing dashboard. Partial upload failures report how
many files were saved; saved files are not discarded. Staff notes can be appended
after closing without changing any finalized document version; document changes
still require an addendum. This task-first, simple-front-end approach is the guiding
design principle for this area.

Only persisted drafts and canonical jackets are searchable. This does not recover
historical process-memory packets or browser-only work that was never saved to the
database. A missing customer record must be traced in the actual running instance;
do not manufacture a replacement transaction or assume its documents are lost.

The canonical Document Library packet, document, and object-version tables hold
the document records. SalesDocumentJacket supplies deal context and readiness;
SalesDocumentPacketVersion preserves finalized context, reviewed document IDs,
exact object-version IDs, checksums, checklist, disposition, and staff attribution.
SalesDocumentGeneratedPacket replaces process-memory-only API retrieval.

Files are private and served only through authenticated routes. Uploads and
downloads verify SHA-256 against the stored object. Concurrent mutations require
the jacket revision. Finalized documents cannot be reclassified or overwritten;
open an addendum and upload a corrected copy. Previous packet snapshots remain.
ZIP exports preserve originals; merged PDFs are convenience copies, not replacements
for signed originals. HTML working forms cannot be merged into PDF.

## Deployment Requirements

Apply the included Prisma migration and regenerate the Prisma client.
Configure DOCUMENT_LIBRARY_ORGANIZATION_ID consistently for the installation.
Configure DOCUMENT_LIBRARY_LOCAL_STORAGE_ROOT to an access-controlled persistent
directory or mounted persistent volume. Development defaults to the ignored
.dispatch-board-data/document-library directory. Production has no local fallback.

Cloud-provider configuration alone is insufficient: the existing storage runtime
does not yet supply a cloud byte adapter. The Sales Documents service fails closed
when the supported private byte storage is unavailable; it does not report staged
metadata as a successful saved file. Multi-tenant/location-scoped access and cloud
adapters require further implementation before those deployment scenarios.

Back up BOTH the database and private storage, restrict direct filesystem access,
and verify a restore together before production use. This change does not configure
backups, malware scanning, cloud replication, retention automation, legal-hold
administration, or an electronic-signature service. There is no document deletion
or purge action in the staff workspace.

Checklist defaults are operational starting points, not a certification of legal
completeness. Refine the individual pathways with the approved document inventory.

## Verification

Unit coverage: src/tests/unit/sales-document-checklist.test.ts.
Browser coverage: src/tests/e2e/sales-documents.spec.ts. Use a migrated local test
database with seeded manager credentials and configured private document storage.
