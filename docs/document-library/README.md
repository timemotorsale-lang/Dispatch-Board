# Document Library Source of Truth

**Status:** planning baseline  
**Branch:** `codex/document-storage-archive-foundation`  
**Purpose:** define the source of truth for storing, organizing, reviewing, archiving, and later integrating operational documents.

## Core Decision

Dispatch Board needs its own Document Library before document integrations are built.

The Document Library owns the business truth:

- what the document is,
- which record or workflow owns it,
- whether it is required,
- whether it is missing, received, reviewed, accepted, rejected, expired, archived, or on hold,
- who can see it,
- who reviewed it,
- what workflow it can unblock,
- where the physical file or external reference is stored.

The physical file can live in an internal storage provider first, then later in object storage, Google Drive, SharePoint, Dropbox, DMS attachments, e-signature providers, insurance portals, or other document systems. Those providers do not own document meaning.

## Three-Layer Model

| Layer | Responsibility | Examples |
| --- | --- | --- |
| Document Library | business record, classification, status, ownership, audit, workflow meaning | customer ID, title document, insurance authorization, repair photo |
| Storage Provider | physical file or external link | internal upload, local dev storage, S3/Azure, Drive, SharePoint, Dropbox |
| Workflow Packet | business grouping and requirements | claim packet, repair order packet, sale packet, purchase/appraisal packet |

## Documents in This Packet

- `ARCHITECTURE.md` defines the system shape and domain model.
- `SOURCE_OF_TRUTH.md` defines ownership, authority, and provider boundaries.
- `WORKFLOWS_AND_ALGORITHMS.md` defines packet completion, review, missing-doc, archive, and optimization logic.
- `GOVERNANCE_SECURITY_RETENTION.md` defines permissions, sensitivity, retention, legal hold, and audit posture.
- `ROADMAP_AND_MILESTONES.md` defines progressive implementation phases.
- `IMPLEMENTATION_BACKLOG.md` defines the first practical build sequence.

## First Implementation Principle

Start simple:

- manual upload or link,
- manual document type,
- manual packet assignment,
- manual review,
- clear status,
- audit trail,
- search by customer, vehicle, repair order, claim, stock, VIN, vendor, or packet.

Do not start with OCR, AI classification, automatic workflow completion, e-signature automation, or external sync. Those come later after the library is reliable and staff understands the workflow.

