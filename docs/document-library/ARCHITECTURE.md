# Document Library Architecture

## Objective

Create a simple staff-facing document experience backed by enterprise-grade document control. Staff should be able to find, add, review, and use documents without understanding storage providers, retention rules, or integration complexity.

## System Layers

### 1. Document Library

The Document Library is the canonical record for document control.

It stores:

- document identity,
- document type,
- packet membership,
- linked business record,
- source,
- sensitivity,
- status,
- review state,
- expiration,
- retention/archive state,
- audit and lineage,
- storage pointer.

It does not need to permanently store every binary itself, but it must know where the file lives and what the file means.

### 2. Storage Provider

The Storage Provider stores the physical file or external reference.

Supported provider types should eventually include:

- internal local/dev storage,
- internal object storage,
- external linked document,
- Google Drive,
- SharePoint,
- Dropbox,
- DMS attachment,
- e-signature provider,
- insurance or warranty portal,
- vendor portal.

Provider storage is replaceable. Business workflows must not depend on provider-specific file paths.

### 3. Workflow Packet

The Workflow Packet groups documents around operational work.

Examples:

- Customer Packet
- Vehicle Packet
- Repair Order Packet
- Claim Packet
- Purchase/Appraisal Packet
- Title Packet
- Sale/Finance Packet
- Warranty Packet
- Vendor Packet
- Parts Packet

Packets define required documents, optional documents, review rules, blockers, and completion status.

## Core Domain Objects

| Object | Purpose |
| --- | --- |
| Document | one logical document record |
| Document Version | one uploaded/replaced file version |
| Storage Object | internal file or external link reference |
| Document Packet | group of documents for a workflow |
| Packet Requirement | expected document type for a packet |
| Document Review | acceptance/rejection/needs-correction decision |
| Document Audit Event | who did what, when, why, and from where |
| Archive Record | retention/archive/legal-hold state |

## Document Statuses

| Status | Meaning |
| --- | --- |
| `MISSING` | required but not received |
| `REQUESTED` | requested from customer/vendor/staff |
| `RECEIVED` | received but not reviewed |
| `IN_REVIEW` | assigned or opened for review |
| `ACCEPTED` | satisfies requirement |
| `REJECTED` | does not satisfy requirement |
| `NEEDS_CORRECTION` | usable source exists but needs replacement or clarification |
| `EXPIRED` | document is no longer valid |
| `ARCHIVED` | retained but no longer active |
| `ON_HOLD` | preserved because of legal, audit, or operational hold |

## Source Types

| Source | Meaning |
| --- | --- |
| `INTERNAL_UPLOAD` | staff uploaded file directly |
| `INTERNAL_GENERATED` | app generated the document |
| `EXTERNAL_LINK` | app stores a link/reference only |
| `EXTERNAL_IMPORT` | provider file copied into managed storage |
| `PROVIDER_PACKET` | provider owns the original packet and app mirrors status |
| `MIGRATED` | brought in from prior system or archive |

## Linked Record Types

Documents may link to:

- customer,
- vehicle,
- repair order,
- claim,
- sale/deal,
- purchase/appraisal,
- title workflow,
- inventory unit,
- vendor,
- parts order,
- task/work item,
- appointment,
- employee/staff support record,
- system/admin record.

Documents can link to multiple records, but one owning workflow must be explicit.

## Design Rule

A file is not enough. A document record must explain why the file exists, what it belongs to, whether it is trusted, and what work it can support.

