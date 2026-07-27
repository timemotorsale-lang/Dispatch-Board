# Enterprise Data Movement Architecture

## 1. Architectural position

Data Exchange is a shared platform module inside the existing Next.js/PostgreSQL
modular monolith. It coordinates bulk movement but does not own vehicle, customer,
appointment, task, service, parts, time-attendance, or accounting business rules.

The current enterprise foundations remain authoritative:

- `EnterpriseCommandLedger` for idempotent commands and outcomes;
- `EnterpriseAuditEvent` for actor, reason, before/after, and correlation evidence;
- `EnterpriseDomainEvent` and `EnterpriseOutboxMessage` for reliable event publication;
- `EnterpriseIntegrationExchange` for provider-neutral inbound/outbound exchanges;
- `EnterpriseIntegrationConflict` for owned reconciliation;
- `IntegrationCredentialReference`, webhook subscription/delivery, and partner-request
  records for secret-free integration security;
- `InventoryGovernanceRecord` as the existing controlled-export precedent;
- appointment configuration export/import preview and vehicle import preview as narrow
  vertical-slice precedents.

The new module should generalize those precedents without changing their domain
semantics or creating a parallel command/audit/integration system.

## 2. Context and trust boundaries

```text
Human / Legacy System / Partner
              |
      upload, API, file drop
              v
    Ingress + security boundary
              |
              v
     Immutable landing assets
              |
              v
  Parse -> Map -> Stage -> Validate
              |
              v
       Preview + Approval
              |
              v
      Data Movement Orchestrator
              |
     domain command boundaries
              v
 Vehicles | Customers | Appointments | Service | Tasks | Other domains
              |
       events + audit + outbox
              v
  Verify -> Reconcile -> Complete
```

Outbound flow reverses the direction but not the controls: an authorized request
selects a permission-safe read model at a snapshot boundary, applies field policy and
redaction, writes an immutable artifact, verifies it, and exposes only a short-lived
identity-checked download.

### Trust zones

1. **Untrusted ingress** — uploaded files, remote payloads, filenames, headers,
   formulas, archives, and provider responses.
2. **Quarantine/landing** — immutable bytes and metadata; no application.
3. **Staging** — parsed source values and canonical candidates; still untrusted.
4. **Approved command execution** — validated canonical commands with recorded policy.
5. **Authoritative domain data** — existing domain aggregates and read models.
6. **Controlled egress** — classified, minimized, encrypted, expiring artifacts.

## 3. Logical components

### 3.1 Data Exchange workspace

Provides job creation, preview, approval, progress, result, reconciliation, mapping,
connection, schedule, audit, and artifact views. It never treats client-side state as
authorization or validation evidence.

### 3.2 Contract registry

Owns immutable, versioned contracts for:

- resource and package identity;
- field names, types, formats, requiredness, and null semantics;
- enumerations and code-set versions;
- natural/external identity rules;
- relationship and dependency rules;
- allowed import operations;
- export field classification;
- compatibility and retirement dates.

A job pins exact contract versions. Updating a contract creates a new version and does
not reinterpret an existing job.

### 3.3 Source profile and mapping registry

A source profile identifies an origin system, format, encoding, delimiter/sheet,
timezone, locale, expected columns, and source-authority policy.

A mapping version contains declarative operations only:

- rename and select;
- trim, case normalization, and empty/null normalization;
- typed date/time, number, currency, boolean, VIN, phone, and email parsing;
- enumerated lookup with explicit unmapped behavior;
- constant/default values;
- concatenation or split using bounded declarative rules;
- external-reference resolution;
- ignore with documented reason.

Arbitrary scripts are excluded from the initial architecture. Complex provider logic
belongs in reviewed, versioned adapters with contract tests.

### 3.4 Ingress gateway

Accepts browser uploads, approved object-storage drops, or adapter payloads. It
enforces:

- authentication, capability, organization/location scope, rate and size limits;
- allowed media and archive types;
- normalized filenames and path isolation;
- decompression-bomb and nested-archive limits;
- malware scan and file-signature validation;
- content hashing and duplicate-asset detection;
- formula neutralization rules for spreadsheet/CSV display;
- quarantine until all ingress checks pass.

Raw bytes live in encrypted object storage, not primary PostgreSQL records. The
database stores metadata and a storage reference.

### 3.5 Parser and normalizer

Streams records into bounded chunks, preserving:

- source file, sheet/member, physical row, and source record key;
- raw value representation where safe;
- parse warnings and errors;
- normalized canonical candidate;
- source and canonical checksums.

Large files are never loaded wholly into web-process memory.

### 3.6 Validation and identity engine

Runs layered checks:

1. package and manifest integrity;
2. schema and type validation;
3. domain field and enumeration validation;
4. organization/location and permission scope;
5. identity and duplicate resolution;
6. relationship/dependency resolution;
7. field source-authority and protected-record policy;
8. domain command preflight;
9. cross-row and control-total checks.

Validation is deterministic for pinned inputs. Each row receives stable reason codes,
severity, field path, repair guidance, and whether it may proceed.

### 3.7 Preview and approval engine

Materializes a preview tied to:

`asset hash + contract version + mapping version + write policy version + authority policy version`

Any change to those inputs invalidates prior approval. Approval policy considers data
classification, domain, operation, row count, predicted change count, destructive
transition proposals, and environment.

### 3.8 Job orchestrator and workers

The web request creates or queries a job; background workers perform parsing,
validation, export generation, application, verification, and cleanup.

Workers use:

- leases with heartbeat and expiry;
- chunk checkpoints;
- bounded concurrency by organization, domain, and job class;
- retry with backoff for retryable infrastructure failures;
- dead-letter or operator-attention state for exhausted failures;
- safe pause after the current command/chunk boundary;
- cancellation before apply and controlled stop during apply;
- progress counters that are derived from durable row/chunk outcomes.

### 3.9 Domain command adapters

Canonical staged records become existing domain commands. Adapters may translate a
canonical import record into one or more domain commands, but cannot bypass:

- server-side capability policies;
- optimistic version or conflict checks;
- idempotency;
- domain invariants;
- audit, event, and outbox commitments.

Each applied row uses a deterministic command idempotency key derived from the job,
canonical source row key, target resource, operation, and mapping version.

### 3.10 Export service

Reads purpose-built, permission-safe query models. It supports consistent snapshot or
high-water-mark semantics, streaming serialization, chunked artifacts, checksums,
control totals, redaction, and manifests.

Exports must not issue unrestricted arbitrary SQL supplied by an operator.

### 3.11 Artifact service

Stores uploaded source assets, rejected-row packages, before-image/compensation
packages, export artifacts, manifests, and reconciliation reports in encrypted object
storage.

The service owns retention class, legal hold marker, expiry, deletion workflow,
download authorization, revocation, and access evidence. Application URLs are
short-lived and never become durable public links.

### 3.12 Reconciliation service

Compares expected and actual:

- processed, created, updated, unchanged, rejected, and protected-skip counts;
- source-to-internal identity coverage;
- required relationships;
- inventory units by lifecycle status;
- financial amounts and balances where applicable;
- minimum/maximum timestamps and watermarks;
- attachment counts and hashes;
- provider acknowledgements for system-to-system exchange.

Mismatch cases reuse or extend `EnterpriseIntegrationConflict`. A resolution preserves
both snapshots and requires an authorized, independently verified decision when
material.

## 4. Conceptual persistence model

The names below are architectural concepts, not an approved Prisma design.

### `DataMovementJob`

One import, export, migration wave, verification, or repair run.

Key facts:

- organization, optional location, environment, direction, and job type;
- requested-by and run-as identities;
- purpose, classification, contract/mapping/policy versions;
- lifecycle state, correlation ID, idempotency key, and request hash;
- source job, parent migration project, and retry/repair lineage;
- durable counters, timestamps, watermark, and terminal disposition.

### `DataMovementAsset`

Metadata for one immutable source or result object:

- storage reference, original safe name, media type, size, content hash;
- encryption key reference, scan status, classification, retention class;
- manifest role, created/expiry/deleted timestamps.

No credentials or raw secret material are stored.

### `DataContractVersion`

Immutable resource/package schema, identity rules, dependency declaration,
compatibility window, classification, and allowed operations.

### `DataMappingProfileVersion`

Immutable source-to-canonical mapping, transform declarations, defaults, ignored
fields, authority policy, and sample/contract-test evidence.

### `DataMovementChunk`

Bounded work unit with lease, range, counts, checkpoint, attempts, checksum, and
terminal result.

### `DataMovementRowResult`

Lineage and outcome for a source row:

- stable source row key and location;
- source/canonical hashes;
- predicted and actual operation;
- resolved target identity;
- warning/error reason codes;
- domain command ID and result version;
- before/after hash or protected before-image reference.

Raw sensitive values should not be duplicated into error text.

### `DataMovementApproval`

Decision, actor, role/capability, reason, exact preview fingerprint, scope, expiry, and
decision timestamp. The requester cannot satisfy an independent-approval requirement.

### `DataMovementArtifactAccess`

Every material artifact download, denial, revocation, or expiry with actor, purpose,
IP/device metadata where policy permits, correlation, and time.

### `MigrationProject`

Source-system inventory, authority decisions, migration waves, rehearsal runs,
watermarks, cutover window, acceptance thresholds, sign-offs, and stabilization state.

## 5. Job state models

### Import

```text
DRAFT
  -> RECEIVING -> QUARANTINED -> SCANNING
  -> PARSING -> MAPPING -> VALIDATING
  -> PREVIEW_READY
  -> AWAITING_APPROVAL -> APPROVED
  -> APPLYING -> VERIFYING -> RECONCILING
  -> COMPLETED | COMPLETED_WITH_EXCEPTIONS
```

Terminal/attention paths:

```text
REJECTED | FAILED | CANCELLED | EXPIRED | ROLLBACK_REQUIRED
```

`FAILED` means the engine could not safely continue. Row-level business rejection is
normally `COMPLETED_WITH_EXCEPTIONS`, not an infrastructure failure.

### Export

```text
REQUESTED -> AWAITING_APPROVAL -> APPROVED
  -> SNAPSHOTTING -> GENERATING -> VERIFYING
  -> AVAILABLE -> EXPIRED -> DELETED
```

Additional paths:

```text
REJECTED | FAILED | CANCELLED | REVOKED
```

### State rules

- Approval is impossible before a successful preview or export scope calculation.
- Applying is impossible if the preview fingerprint differs from the approved one.
- A terminal job is immutable; retry creates a linked child job.
- Cancellation does not erase completed row effects.
- A download's expiry does not delete job/audit evidence.
- Cleanup follows retention and legal-hold policy, not UI deletion.

## 6. Transaction and consistency model

### Import application

Use one database transaction per domain command or deliberately bounded atomic group,
not one transaction for an entire large file.

Within each command transaction:

1. claim/check deterministic idempotency;
2. re-check capability, organization/location, preview fingerprint, and policy;
3. load current aggregate/version;
4. enforce source authority and domain invariants;
5. mutate domain state;
6. write command result, audit, domain event, and outbox;
7. record the target result/version needed by row lineage.

The row result may be finalized after the domain transaction using the durable command
ledger as recovery evidence. Recovery must tolerate a worker dying at any step.

### Export consistency

Small exports may use a database snapshot transaction. Large exports should use a
recorded high-water mark and stable cursor ordering. The manifest states the exact
consistency mode and boundary.

### Rollback

There is no universal "undo file." Rollback is domain-aware:

- before apply, cancel safely;
- after partial apply, retry or create a compensation job;
- newly created unreferenced records may be archived under domain policy;
- updates use protected before-image evidence and optimistic version checks;
- merges, communications, accounting posts, external sends, and later human work may
  be non-reversible and require a corrective workflow.

The preview must disclose the rollback boundary before approval.

## 7. Security and authorization

### Capabilities

At minimum:

- view data-exchange jobs;
- create import draft;
- upload source asset;
- manage source profiles;
- manage mappings;
- validate/preview import;
- approve import;
- apply import;
- create standard export;
- request sensitive export;
- approve sensitive export;
- download artifact;
- revoke artifact;
- manage connections/schedules;
- resolve reconciliation;
- independently verify reconciliation;
- view audit/lineage.

Capabilities are constrained by organization, location, domain, environment, data
classification, and volume. "Manager" alone is not sufficient for every operation.

### Separation of duties

Independent approval is required for:

- production upsert above an approved impact threshold;
- snapshot synchronization or missing-record state changes;
- customer merge proposals;
- staff, time-attendance, payroll, or accounting data;
- highly restricted exports;
- production connector activation;
- acceptance of a material reconciliation difference.

### Sensitive data controls

- Store secret values only in an external vault/resolver; persist references.
- Encrypt transport and object storage.
- Minimize staged sensitive data and shorten its retention.
- Redact sensitive values from logs, previews, telemetry, and row errors.
- Treat spreadsheet formulas as untrusted on import and escape formula-leading cells
  on human-download exports.
- Enforce organization/location predicates at every query and command boundary.
- Scan archives and enforce expansion, member-count, and nesting limits.
- Do not export passwords, sessions, raw tokens, credential secrets, webhook signing
  secrets, or prohibited payment data.

## 8. Provider and schedule integration

The bulk data-movement control plane and the existing integration platform have
different responsibilities:

| Concern | Data movement | Existing integration platform |
| --- | --- | --- |
| Job/chunk/row processing | Owns | References job/correlation |
| Contract and mapping versions | Owns canonical bulk contract | Records adapter/mapping envelope |
| Provider acknowledgement | Consumes for verification | Owns exchange acknowledgement |
| Retries of file/job processing | Owns | Owns delivery/exchange retries |
| Credentials and signed webhooks | Uses | Existing security boundary owns |
| Business conflicts | Produces evidence | Existing reconciliation queue owns |
| Domain mutation | Invokes domain commands | Never defines internal completion alone |

A scheduled feed creates a new immutable job per run. Schedules never mutate and reuse
an old job. Every run records its source watermark and advances the schedule checkpoint
only after the defined verification gate.

## 9. Observability and operations

Required metrics:

- jobs and rows by state, domain, source, organization, and environment;
- queue delay, processing rate, end-to-end duration, and checkpoint age;
- warning/rejection rate by reason code and mapping version;
- retry, dead-letter, cancellation, and worker lease-expiry rate;
- reconciliation backlog, age, and accepted-difference rate;
- export generation time, artifact size, download, expiry, and revocation;
- schedule freshness and watermark lag;
- object-storage scan, retention-cleanup, and deletion failures;
- database load and domain-command throttling.

Every job has a correlation ID spanning ingress, job/chunk activity, commands, audit,
events, outbox, exchange ledger, artifacts, and reconciliation.

Operational controls:

- global and per-organization kill switches;
- pause by connection, schedule, contract version, mapping version, or domain;
- maintenance windows and per-domain concurrency limits;
- worker health and stale-lease recovery;
- storage quota and retention alarms;
- replay from checkpoints without duplicate domain effects.

## 10. Performance and scale approach

- Stream parse and serialize.
- Use bounded chunks and durable checkpoints.
- Partition or age out high-volume staging/row-result data according to retention.
- Keep raw payloads in object storage; keep queryable lineage and outcomes in
  PostgreSQL.
- Separate interactive from bulk worker capacity.
- Apply backpressure from domain services and database health.
- Parallelize only where identity and relationship dependencies allow.
- Preserve ordering for event streams and other order-sensitive resources.
- Use resumable, multi-part artifacts for large exports.

Scale targets should be set after real source profiling. The architecture must be load
tested with representative widths, attachment sizes, duplicate rates, relationship
depths, and failure distributions—not only synthetic clean CSV rows.

## 11. Repository boundary for future implementation

An eventual implementation should follow the existing modular-monolith conventions:

```text
src/
  app/
    (app)/admin/data-exchange/
    api/admin/data-exchange/
  features/
    data-exchange/
  server/
    data-exchange/
      contracts/
      mappings/
      ingress/
      parsing/
      validation/
      preview/
      application/
      export/
      artifacts/
      approvals/
      reconciliation/
      scheduling/
      repositories/
      workers/
```

Provider-specific adapters remain under `src/server/integrations/` and depend on the
canonical Data Exchange contracts. Domain command adapters depend on domain services;
domain services do not depend on file formats or named providers.

## 12. Architecture decisions

- **DM-ADR-001:** Build one shared Data Exchange module within the modular monolith.
- **DM-ADR-002:** All imports use immutable landing and staging before domain writes.
- **DM-ADR-003:** Domain commands, not direct database writers, apply imported data.
- **DM-ADR-004:** Contracts, mappings, and authority policies are immutable and
  version-pinned per job.
- **DM-ADR-005:** Bulk work is asynchronous, chunked, checkpointed, and idempotent.
- **DM-ADR-006:** Raw assets and generated artifacts live in encrypted object storage;
  PostgreSQL stores control-plane metadata.
- **DM-ADR-007:** Routine import cannot hard-delete.
- **DM-ADR-008:** Full-snapshot missing-record behavior is an explicit approved policy.
- **DM-ADR-009:** Sensitive exports are governed disclosures with expiring access.
- **DM-ADR-010:** Reconciliation is required before migration or feed completion.
- **DM-ADR-011:** Existing enterprise command, audit, outbox, integration, credential,
  webhook, and conflict foundations are reused.
- **DM-ADR-012:** No arbitrary mapping scripts in the first release.
- **DM-ADR-013:** Job retry creates lineage and never rewrites terminal history.
- **DM-ADR-014:** Provider acknowledgement cannot by itself declare internal domain
  completion.
- **DM-ADR-015:** Accounting inbound movement remains separately governed and is not
  enabled by the general foundation.

## 13. Architecture gate

Implementation must not begin until these are approved:

1. first target domain and real source-system sample;
2. organization/location and field source-authority matrix;
3. data classification and prohibited-field register;
4. capability and independent-approval matrix;
5. object storage, encryption, malware scanning, retention, and deletion approach;
6. first canonical contract and identity rules;
7. import write and missing-record policies;
8. preview acceptance and reconciliation thresholds;
9. compensation/rollback boundary;
10. pilot environment, dataset, success criteria, pause criteria, and named sign-offs.
## Migration reset, rollback, replay, and correction

These are first-class capabilities, not database cleanup scripts.

### Rehearsal reset

Rehearsals run in an isolated workspace. Every created or changed record carries a
durable migration-job reference. A reset calculates affected records, checks for later
human edits, previews the impact, obtains approval, reverses or isolates changes in
dependency order, reconciles the result, and preserves the evidence trail.

### Production rollback

Rollback is limited to changes that can be safely compensated. Protected records or
records edited after migration are not silently overwritten; they move to review for a
forward-fix or manual resolution.

### Replay and repair

The original landing asset is immutable. A corrected mapping, policy, or source extract
creates a new version and child job. Replay selects affected rows where possible, uses
the same idempotency and approval controls, and reconciles both child and aggregate
results.

### Reset safety rules

- Never reset by timestamp alone.
- Never delete audit history to achieve a clean screen.
- Never treat missing source rows as permission to delete live records.
- Require preview and approval for every reset or rollback.
- Treat later human edits as protected until explicitly resolved.

See the [Migration Control Catalog](MIGRATION_CONTROL_CATALOG.md) for the full review checklist.
