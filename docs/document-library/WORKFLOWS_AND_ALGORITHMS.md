# Document Library Workflows and Algorithms

## Purpose

This document defines the business logic that should guide implementation. The algorithms are designed now, but implemented progressively.

## Core Workflows

### 1. Add Document

1. Staff chooses upload, link, generated document, or external source.
2. Staff selects or confirms document type.
3. Staff links it to a record or packet.
4. System assigns sensitivity and initial status.
5. System creates audit event.
6. Document appears as received or pending review.

First version: manual only.

Later versions: suggested type, duplicate warning, packet auto-match, OCR extraction.

### 2. Packet Requirement

1. Workflow opens or creates packet.
2. Packet requirements are loaded by packet type.
3. Each requirement resolves to missing, received, accepted, rejected, expired, or waived.
4. Packet status updates.
5. Blocking workflows show what is missing and who owns it.

First version: fixed requirement lists.

Later versions: dynamic requirements based on vehicle, sale type, insurance carrier, claim type, finance path, or compliance rule.

### 3. Review Document

1. Reviewer opens document and metadata.
2. Reviewer accepts, rejects, marks correction needed, or moves to hold.
3. Reviewer records reason when decision is not accepted.
4. Packet status recalculates.
5. Workflow blockers update.

First version: manual review.

Later versions: reviewer queue, review SLA, required second approval for restricted documents.

### 4. Replace or Version Document

1. Staff uploads or links replacement.
2. Original version remains preserved unless retention policy allows disposal.
3. Current version changes.
4. Packet status recalculates.
5. Audit records replacement reason.

First version: keep version history and mark latest.

Later versions: compare metadata, retain accepted version, detect stale copies.

### 5. Archive Document

1. Archive eligibility is checked.
2. Legal hold, active workflow, accepted evidence, retention schedule, and audit requirements are evaluated.
3. Document moves to archived state or remains active/on hold.
4. Storage action is recorded but does not erase business audit.

First version: manual archive state.

Later versions: retention schedules and archive recommendations.

## Algorithms

### Packet Completion Algorithm

Input:

- packet type,
- requirements,
- documents,
- review states,
- waivers,
- expiration states.

Output:

- packet status,
- missing requirements,
- blockers,
- next recommended action.

Rules:

1. If any required document is missing, packet is incomplete.
2. If any required document is received but not accepted, packet is pending review.
3. If any accepted required document is expired, packet is blocked.
4. If a required document is waived by authorized reviewer, it counts as satisfied but remains visible.
5. If all required documents are accepted or waived, packet is complete.

### Missing Document Detection

Input:

- workflow type,
- packet requirements,
- linked documents,
- document statuses.

Rules:

1. Build expected requirement list from packet type.
2. Match documents by document type and owning record.
3. Exclude rejected and archived documents.
4. Flag expired accepted documents as renewal needed.
5. Return missing and renewal items.

### Duplicate Document Detection

First version:

- duplicate if same packet, document type, file name, and upload date are suspiciously similar.

Later versions:

- compare file hash,
- provider external ID,
- OCR text fingerprint,
- title/VIN/customer metadata,
- version lineage.

Duplicate result should never auto-delete. It should suggest merge, replace, keep both, or archive older copy.

### Sensitivity Assignment

Input:

- document type,
- packet type,
- source,
- linked record.

Rules:

1. IDs, finance docs, insurance/legal docs, title docs, payment evidence, and signed forms default to restricted.
2. Customer communications and claim/repair proof default to confidential.
3. Public marketing photos may be low sensitivity only when not linked to restricted customer evidence.
4. Reviewer may raise sensitivity but lowering sensitivity requires explicit authority.

### Workflow Blocker Logic

A document may block workflow when:

- required and missing,
- received but not reviewed,
- rejected,
- expired,
- under legal hold and cannot be used,
- present but linked to the wrong customer/vehicle/workflow,
- sensitive and reviewer lacks access.

The blocker should always say:

- what is missing or wrong,
- who owns the next action,
- what manual fallback exists.

### Archive Eligibility Logic

A document may be archived only when:

- no active workflow requires it,
- no legal hold exists,
- retention policy allows inactive storage,
- audit trail remains accessible,
- external provider pointer remains resolvable or disposition is recorded.

Deletion is a separate future policy decision. Archive does not mean delete.

## Business Optimization Logic

The library should eventually optimize:

- which packets are blocking revenue or release,
- which document requests are overdue,
- which vendors/customers repeatedly delay documents,
- which document types cause the most workflow stalls,
- which staff queues need review help,
- which records are ready to move because documents are complete.

First implementation should show simple counts. Later versions can rank by urgency, revenue impact, age, role, and workflow blocker severity.

