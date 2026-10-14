# Claims Workspace Architecture

**Status:** Planning baseline  
**Design goal:** simple staff execution with enterprise-grade records, controls, and future extensibility.

## Domain Boundary

Claims Workspace is the operational home for insurance-related service intake and claim handoff.

It coordinates:

- customer and policyholder context;
- vehicle and damage context;
- insurance carrier and adjuster context;
- claim number, loss details, deductible, and status;
- photos, signed authorizations, reports, estimates, and supporting documents;
- next action ownership and handoff readiness;
- later repair order, payment, supplement, and closeout links.

It does not replace:

- Customer 360;
- Vehicle 360;
- Repair Order / Service Workbench;
- Document Library;
- Tasks / activity timeline;
- Accounting receivables;
- estimating tools.

## Core Records

### InsuranceClaim

Durable claim workspace record.

Key fields:

- claim id;
- claim number;
- status;
- stage;
- loss date;
- loss type;
- description of incident;
- deductible amount;
- customer responsibility notes;
- current owner;
- next action;
- blocker reason;
- linked customer id;
- linked vehicle id;
- linked repair order id when created;
- opened at;
- last activity at;
- closed at.

### ClaimParty

People and organizations involved in the claim.

Party types:

- customer;
- policyholder;
- claimant;
- insurance carrier;
- adjuster;
- body shop / sublet vendor;
- internal advisor;
- accounting owner.

### ClaimEvidence

Structured proof attached to the claim.

Evidence types:

- damage photos;
- VIN / odometer photo;
- insurance card;
- driver license / ownership proof when required;
- customer authorization;
- police report;
- tow invoice;
- storage record;
- estimate;
- supplement;
- carrier approval;
- payment proof;
- final delivery proof.

### ClaimDocumentLink

Relationship between the claim and a document stored in the central document library.

Required relationship support:

- one document can attach to claim, customer, vehicle, and repair order;
- one claim can hold many documents;
- document classification and required-gate status must be visible in the workspace.

### ClaimCommunication

Activity log entry for customer, carrier, adjuster, vendor, and internal communication.

Minimum fields:

- channel;
- direction;
- participant;
- summary;
- outcome;
- next follow-up date;
- created by;
- created at.

### ClaimHandoff

Record of handoff from claim intake to an execution owner.

Handoff targets:

- service advisor;
- estimator;
- repair order;
- parts;
- accounting / receivables;
- customer follow-up;
- manager review.

## Lifecycle States

The lifecycle should be simple for staff but precise in the backend.

| Stage | Staff meaning | Enterprise meaning |
| --- | --- | --- |
| Intake | Claim started | Minimum customer, vehicle, loss, and claim context captured |
| Evidence Needed | We are missing required proof | Required evidence gates incomplete |
| Carrier Pending | Waiting on insurance | Adjuster, approval, estimate, or supplement action pending |
| Estimate Ready | Ready for estimate or review | Estimate handoff gate met |
| Repair Handoff | Ready for service execution | Repair order can be created or linked |
| Payment Follow-Up | Money or deductible unresolved | Recovery owner and receivable context required |
| Closeout | Ready to complete | Final documents, payment, and delivery proof controlled |
| Closed | Done | Claim is locked except authorized correction |

## Progressive Capability Model

The workspace should reveal advanced areas only when the claim context needs them.

- No adjuster? Show carrier and adjuster capture.
- No photos? Show evidence checklist first.
- Estimate uploaded? Reveal estimate and supplement status.
- Repair order linked? Reveal repair handoff and repair status summary.
- Deductible unpaid? Reveal payment recovery.
- Claim aging? Reveal escalation and management review.

## Data Ownership

| Data | System of record |
| --- | --- |
| Customer identity | Customer 360 |
| Vehicle identity | Vehicle 360 / inventory registry |
| Repair execution | Repair Order / Service Workbench |
| Documents | Central Document Library |
| Claim lifecycle | Claims Workspace |
| Staff work | Shared Task Engine |
| Payment recovery | Accounting / receivables when implemented |

## Backend Controls

Enterprise quality requires:

- immutable claim id;
- versioned updates for important status changes;
- idempotent create and handoff commands;
- permission checks by role and action;
- audit events for status, owner, evidence, document, and handoff changes;
- honest unavailable and denied states;
- structured validation for required gates;
- document classification and retention readiness;
- future reporting fields for aging, cycle time, blockers, carrier responsiveness, and recovery amount.

## Integration Points

Initial integration:

- Service Console: create and work the claim.
- Customer 360: show linked claims.
- Vehicle 360: show linked claims and damage history.
- Document Library: store and classify claim documents.
- Repair Order: link or create when ready for repair.
- Task Engine: assign next action and follow-up.

Future integration:

- estimating tool;
- SMS/email communication provider;
- accounting receivables;
- carrier portal references;
- e-signature for authorization forms;
- photo capture from mobile device.

