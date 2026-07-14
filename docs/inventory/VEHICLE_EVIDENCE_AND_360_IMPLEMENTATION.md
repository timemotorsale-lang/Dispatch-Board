# Wave 2 — Vehicle evidence and Vehicle 360 implementation

**Implemented:** 2026-07-14  
**Scope:** VEH-090 through VEH-093  
**Deployment status:** Source-controlled implementation; database migration and rollout activation are not executed by this change.

## Outcome

Wave 2 establishes a governed evidence store and a canonical Vehicle 360 workspace at `/vehicles/360/[id]`. Vehicle 360 is a projection over existing source-of-truth records; it does not create duplicate inventory, repair, parts, appointment, customer, task, decision, or audit records.

## 6A — Governed evidence storage

- Stores approved PDF, JPEG, PNG, WebP, and plain-text content up to 10 MB in PostgreSQL `BYTEA` for this bounded foundation.
- Calculates SHA-256 checksums server-side and records byte size, content type, storage provider/key, uploader, retention date, access level, legal hold, and version.
- Runs a replaceable built-in signature baseline before availability. Executable, EICAR, active-markup, and declared-content mismatches are quarantined.
- Provides authorized, no-store downloads with content sniffing disabled and immutable access events.
- Enforces legal hold, retention, deletion, content length, scan/status coherence, tenant consistency, and immutable evidence event/link history in PostgreSQL.
- Routes upload, governance, and delete mutations through enterprise command, idempotency, optimistic-version, audit, domain-event, and outbox records.

The built-in signature baseline is an application safety gate, not a claim of parity with a production antivirus or content-disarm service. A production deployment should replace or augment it with an approved scanning adapter before general rollout.

## 6B — Summary and timeline

The projection provides canonical identity, current owner/location/stage/state, next action, target, odometer, active risks, and a deterministic newest-first timeline. Timeline events correlate custody, inventory state, repair-order state, appointments, evidence, and enterprise audit sources.

## 6C — Operational tabs

The workspace exposes Overview, Inventory, Service, Parts, Appointments, Documents, Warranty, Communications, Costs, Decisions, and Audit. Every protected tab is evaluated server-side from capability grants. Restricted documents require the separate `VEHICLE_EVIDENCE_RESTRICTED_VIEW` capability and are removed from returned document, timeline, and graph projections when unavailable.

Warranty is an explicit permission-aware empty-state until the warranty aggregate in VEH-105 is implemented; it does not fabricate claim records.

## 6D — Relationship graph

The graph derives navigable nodes and edges for customers, inventory units, repair orders/jobs, demanded parts, appointments, tasks, evidence, and external identities. Nodes and edges are filtered by the same server-side tab permissions before delivery.

## Interfaces

- `GET /api/vehicles/:id/360`
- `POST /api/vehicle-evidence`
- `PATCH /api/vehicle-evidence/:id`
- `DELETE /api/vehicle-evidence/:id`
- `GET /api/vehicle-evidence/:id/content`
- `/vehicles/360/:id`

## Deferred deployment work

- Apply `20260714150000_establish_vehicle_evidence_and_360` through the approved migration process.
- Activate `VEHICLE_360` only for an approved pilot cohort.
- Select and qualify production object storage when evidence volume exceeds the bounded database-storage profile.
- Integrate an approved malware scanning/content-disarm provider and collect production scan-latency/failure evidence.
- Exercise backup, restore, retention expiry, legal hold, and incident runbooks in a production-like environment.
