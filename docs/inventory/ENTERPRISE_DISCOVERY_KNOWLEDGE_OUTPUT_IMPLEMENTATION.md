# Wave 3 — Enterprise discovery, knowledge, and controlled output

**Implemented:** 2026-07-14  
**Scope:** VEH-094 through VEH-096  
**Deployment status:** Source-controlled implementation. Migration deployment and rollout activation are not part of this change.

## Outcome

Wave 3 adds `/vehicles/discovery`, a permission-aware operating workspace for cross-domain search, governed work knowledge, and attributable Vehicle 360 exports/print packages.

## 6E — Global operational search

- Searches canonical vehicle/VIN/stock, customer, repair order, repair job, appointment, part/barcode, purchase order/vendor, and governed document metadata.
- Every query includes `organizationId`; no cross-tenant fallback or unscoped query exists.
- Record types are removed before querying when the actor lacks the underlying module capability.
- Restricted document metadata requires `VEHICLE_EVIDENCE_RESTRICTED_VIEW`.
- Queries require at least two characters, cap each source and the final response, execute sources in parallel, score exact identifiers above prefix/contains matches, and produce deterministic ordering.
- The migration adds PostgreSQL `pg_trgm` indexes for the supported discovery fields. Deployment must confirm the migration role may install or use the extension.

## 6F — Procedures and knowledge links

- Extends existing `WorkProcedureVersion` records with procedures, bulletins, safety notes, and reference links by work type and optional exact procedure version.
- Captures publisher, source reference, revision, publisher-provided SHA-256 checksum, HTTPS URI, effective window, supersession lineage, creator, approver, and immutable events.
- New revisions start as `DRAFT`; only an independent reviewer can approve them.
- Approved links remain `REFERENCE_ONLY`. External material never changes canonical vehicle, repair, parts, or procedure state automatically.
- Approval supersedes the named prior revision without erasing its revision history.

## 6G — Controlled export and print

- Creates JSON or printable HTML packages from the server-side permission-filtered Vehicle 360 projection.
- Requires a business reason, format, classification, and `VEHICLE_OUTPUT_CREATE` capability.
- Restricted packages additionally require `VEHICLE_OUTPUT_RESTRICTED`.
- Internal packages mask VIN, remove audit/communications, remove restricted documents and their timeline/graph references, and remove evidence download URLs.
- Every package records its field manifest, redacted fields, watermark, SHA-256 checksum, requester, reason, seven-day expiry, generation event, and download event.
- Stored output packages and events are database-immutable. HTML output escapes all source content and disables content sniffing at delivery.

## Interfaces

- `GET /api/vehicle-discovery/search`
- `GET|POST /api/work-knowledge`
- `POST /api/work-knowledge/:id/approve`
- `POST /api/vehicle-output`
- `GET /api/vehicle-output/:id`
- `/vehicles/discovery`

## Deferred deployment work

- Apply `20260714170000_add_enterprise_discovery_knowledge_output` through the approved database process.
- Confirm `pg_trgm` extension privileges and benchmark tenant-filtered query plans against production-like volumes.
- Activate `VEHICLE_DISCOVERY` only for an approved cohort.
- Establish publisher checksum verification and link-health operating procedures.
- Validate export retention/deletion policy, data-loss prevention controls, print handling, accessibility, and browser workflows in a production-like environment.
