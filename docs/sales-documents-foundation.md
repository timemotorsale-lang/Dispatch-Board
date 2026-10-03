# Sales Documents Foundation

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
