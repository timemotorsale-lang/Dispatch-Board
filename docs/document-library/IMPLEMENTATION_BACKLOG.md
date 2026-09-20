# Document Library Implementation Backlog

## Build Order

### Slice 1: Domain Foundation

- document type catalog,
- packet type catalog,
- status values,
- sensitivity values,
- linked record model,
- audit event names,
- no binary storage assumptions in domain model.

Acceptance:

- a document can be described without knowing where the file is stored.

### Slice 2: Manual Document Record

- create document record,
- edit metadata,
- link to one owner record,
- assign sensitivity and status,
- record audit events.

Acceptance:

- staff can track that a document exists even before file upload integration.

### Slice 3: Storage Pointer

- internal upload placeholder,
- external link placeholder,
- provider reference metadata,
- version model.

Acceptance:

- a document record can point to a file/link without provider-specific workflow logic.

### Slice 4: Packet MVP

- create packet,
- add document to packet,
- define manual required documents,
- show missing/received/reviewed/accepted.

Acceptance:

- staff can open a packet and understand what is missing.

### Slice 5: Review Workflow

- accept,
- reject,
- needs correction,
- waive requirement,
- review reason,
- reviewer audit.

Acceptance:

- packet status changes based on review decisions.

### Slice 6: Search and Daily Operations

- search by customer,
- vehicle,
- stock,
- VIN,
- repair order,
- claim,
- vendor,
- packet,
- status.

Acceptance:

- staff can find documents from daily operational context.

### Slice 7: Archive Foundation

- archive state,
- restore,
- legal hold,
- archive-ready preview.

Acceptance:

- staff can move inactive documents out of daily work without losing audit.

### Slice 8: Integration-Ready Provider Reference

- provider reference model,
- provider family,
- last verified time,
- external source link,
- health/held state.

Acceptance:

- first document integration can start as read-only reference.

## First UI Recommendation

Keep the first UI plain:

- one Document Library landing page,
- one packet detail view,
- one add/link document form,
- one review action area,
- simple search and filters.

Avoid complex visual workflows until staff proves what they use daily.

## First Backend Recommendation

Start with durable internal records and audit before external file complexity.

Initial backend should support:

- document records,
- packet records,
- requirement records,
- review records,
- audit records,
- storage references.

Provider-specific adapters should wait until these internal records are stable.

