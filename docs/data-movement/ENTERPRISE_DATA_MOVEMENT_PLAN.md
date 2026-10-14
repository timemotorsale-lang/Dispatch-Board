# Enterprise Data Movement Plan

## 1. Executive decision

Time Motor Sales should build one governed **Data Exchange** capability inside the
Command Control Center, not a collection of unrelated CSV buttons and provider-specific
scripts.

The capability must support four distinct operating modes:

1. **Portable import/export** — operator-driven CSV, XLSX, JSON, and packaged exports.
2. **Migration projects** — rehearsed, multi-entity moves from a legacy DMS or other
   system into Time Motor Sales.
3. **Recurring exchange** — scheduled inbound or outbound files and API feeds.
4. **Recovery and compliance** — controlled extracts, correction packages,
   reconciliation evidence, and approved data-subject or audit exports.

The platform must never permit a file upload to write directly to production tables.
Every import is staged, scanned, parsed, mapped, validated, previewed, authorized,
applied through existing domain commands, verified, and reconciled.

## 2. Why this direction

Enterprise products converge on the same operating model:

- ServiceNow uses import-set staging and reusable transform maps before target-table
  changes.
- Microsoft Dataverse separates parsing, transformation, and asynchronous loading;
  Dynamics data management uses named jobs, packages, status checks, staging-error
  files, and recurring jobs.
- Salesforce bulk data movement uses asynchronous jobs with durable job identifiers,
  explicit lifecycle states, pagination or chunking, and failed-row results.
- DealerCenter's inventory importer asks who owns the authoritative inventory,
  supports one-time and recurring feeds, lets the dealer choose which existing fields
  may update, and requires a deliberate policy for vehicles missing from the feed.

Time Motor Sales should adopt those proven controls while preserving its stronger
existing command, audit, authority, and reconciliation boundaries.

## 3. Product principles

1. **Preview before mutation.** No bulk write occurs without a stable preview tied to
   the exact uploaded asset, contract, mapping, and policy versions.
2. **Domain services remain authoritative.** Imports invoke the same commands,
   permissions, invariants, audit rules, and events as interactive application work.
3. **Source authority is explicit.** Every field family identifies whether Time Motor
   Sales, the external system, or a verified human decision is authoritative.
4. **No silent destructive sync.** Missing source rows do not imply deletion. Archive,
   sell, deactivate, or ignore behavior is an approved policy with protected-record
   exceptions.
5. **At-least-once delivery, effectively-once application.** Retries are expected;
   idempotency keys, content hashes, external identities, and command ledgers prevent
   duplicate effects.
6. **Partial success is visible.** A job may complete with rejected rows, but it may
   never report success while hiding them.
7. **Exports are governed disclosures.** Field classification, scope, reason,
   approval, redaction, retention, download identity, and artifact expiry are part of
   the export—not optional logging.
8. **Reconciliation closes the loop.** Row counts alone are insufficient. Totals,
   identities, relationships, watermarks, and critical business facts are compared.
9. **Portable contracts are versioned.** Templates, schemas, mappings, and manifests
   are immutable once used by a job.
10. **One control plane, many adapters.** DealerCenter, accounting, marketplace, or
    vendor differences belong behind provider adapters, not in core domain rules.

## 4. Capability portfolio

| Capability | Operator experience | Enterprise control |
| --- | --- | --- |
| Export current view | Export a filtered grid | Permission-filtered field set, row cap, watermark, audit |
| Standard export | Choose a saved export template | Versioned contract, classification, approval policy |
| Bulk export | Submit an asynchronous job | Snapshot boundary, chunking, checksums, expiring artifact |
| Portable package | Download related entities in one package | Manifest, dependency order, schema versions, hashes |
| Import template | Download a target-specific template | Required fields, examples, enumerations, identity rules |
| Import preview | Upload and map without changing data | Malware scan, staging, validation, duplicate and diff report |
| Controlled apply | Approve a validated preview | Separation of duties, idempotent domain commands, checkpoints |
| Failed-row repair | Download rejected rows and explanations | Stable row keys, reason codes, retry as a child job |
| Migration project | Run rehearsals and cutover waves | Source freeze, baseline plus delta, sign-offs, rollback plan |
| Scheduled feed | Run a saved import/export on a schedule | Credential reference, rate limits, freshness SLA, pause switch |
| API and webhook exchange | Push or pull versioned resources | Existing partner scopes, signatures, replay protection, exchange ledger |
| Reconciliation | Resolve mismatches in a work queue | Dual snapshots, owner, independent verification, immutable decision |
| Compliance export | Request a person- or case-scoped package | Legal purpose, redaction, approval, chain of custody, expiry |

## 5. User experience: Administration > Data Exchange

The enterprise workspace should live under Administration and use these views:

- **Overview** — job health, active migrations, freshness, failures, approvals, and
  reconciliation backlog.
- **Imports** — draft, validating, awaiting approval, running, partial, failed, and
  completed jobs.
- **Exports** — requested, approved, preparing, available, expired, and revoked
  artifacts.
- **Migration Projects** — source inventory, entity waves, rehearsals, cutover,
  reconciliation, and sign-off.
- **Templates & Mappings** — versioned contracts, source profiles, field mappings,
  transforms, defaults, and identity rules.
- **Connections & Schedules** — file drops, APIs, credentials by reference, cadence,
  watermarks, and pause controls.
- **Reconciliation** — missing, duplicate, mismatched, stale, rejected, and
  out-of-balance cases.
- **Audit & Lineage** — who requested, mapped, approved, ran, downloaded, retried,
  reconciled, or revoked each movement.

### Import wizard

1. Select operation: one-time import, migration wave, or recurring feed.
2. Select target domain and contract version.
3. Upload a file or select an approved connection.
4. Inspect the detected format, encoding, sheets, headers, and source profile.
5. Map source fields to canonical fields; save a mapping only with authority.
6. Choose write behavior: create-only, update-only, upsert, or controlled snapshot
   synchronization.
7. Choose identity and duplicate rules.
8. Validate all rows and relationships.
9. Review a full impact summary and representative row diffs.
10. Submit for approval when required.
11. Apply asynchronously with progress and pause/cancel boundaries.
12. Review successes, warnings, rejected rows, and reconciliation results.

### Required preview

The preview must show:

- source row count, accepted count, warning count, rejected count, and ignored count;
- predicted creates, updates, no-ops, duplicates, conflicts, and protected skips;
- field-level before/after diffs for updates;
- missing required references and dependency ordering;
- values outside allowed enumerations, formats, ranges, or business rules;
- records present internally but absent from a full-snapshot source;
- sensitive-field and classification warnings;
- exact contract, mapping, source-authority policy, and file hash;
- estimated runtime and whether the job requires a maintenance window;
- the rollback or compensating-action boundary.

## 6. Import behavior policies

### Supported write modes

| Mode | Meaning | Default authority |
| --- | --- | --- |
| Create only | Reject or skip identities that already exist | Import operator |
| Update only | Never create a new identity | Import operator |
| Upsert | Create missing identities and update allowed fields | Elevated approval |
| Patch | Change only explicitly supplied fields | Elevated approval |
| Snapshot sync | Reconcile the target set to a complete source snapshot | Migration owner plus independent approver |

Routine import does **not** support hard delete. Snapshot sync may propose domain-safe
transitions such as archived, sold, inactive, or closed, but only under an approved
missing-record policy.

### Identity rules

Identity resolution must be domain-specific:

- Vehicle: normalized VIN is primary; stock number is organization/location-scoped;
  external IDs remain aliases, not canonical identity.
- Customer: external ID plus source system is deterministic; email and phone are
  duplicate signals, never sufficient alone for an automatic merge.
- Appointment: source-system appointment ID, location, and occurrence identity.
- Repair order: source-system repair-order number plus location; vehicle and customer
  references must resolve.
- Staff: employee/external ID under restricted administration; never match solely by
  display name.
- Tasks and historical events: stable external event IDs; no inferred overwrite of
  current operational state.

All automatic matches must record the rule and confidence. Ambiguous customer, vehicle,
or staff matches become reconciliation cases.

### Reference and dependency rules

Multi-entity packages declare dependency order in the manifest. A typical dealership
migration order is:

1. organizations, locations, reference codes, and permission-safe staff identities;
2. customers and contact points;
3. vehicles and external identities;
4. inventory units and lifecycle history;
5. appointments and service visits;
6. repair orders, estimates, authorizations, jobs, parts references, and invoices;
7. tasks, comments, documents, and historical activity links.

An unresolved required parent rejects or quarantines its dependent row. The platform
must not create fabricated parent records to make an import pass.

## 7. Export behavior policies

### Export types

- **Interactive CSV/XLSX** for bounded, human-scale lists.
- **Asynchronous CSV or NDJSON** for large single-resource extracts.
- **Portable ZIP package** for related resources, with a manifest, per-file hashes,
  contract versions, selection criteria, watermark, row counts, and reconciliation
  totals.
- **System-to-system feed** using versioned APIs, webhooks, or approved file delivery.
- **Rendered report/PDF** only for human presentation; never as a migration source.

### Data minimization and classification

Every export field must be classified at least as:

- public operational;
- internal;
- confidential business;
- personal data;
- highly restricted, including authentication, credential, payment, or regulated
  identity material.

Standard templates expose the minimum field set. Sensitive exports require reason,
scope, explicit approval, and stronger expiry. Passwords, session material, raw
credential secrets, full payment card data, and secret webhook values are never
exportable.

### Artifact controls

Each export artifact has:

- requester and acting organization/location;
- purpose and selection scope;
- contract and template version;
- as-of timestamp or high-water mark;
- row counts and domain control totals;
- content hash and package manifest;
- classification and applied redactions;
- approver when required;
- encrypted storage reference;
- short-lived, identity-checked download access;
- download history, expiry, revocation, and deletion evidence.

## 8. Legacy migration playbook

### Phase A — discovery and authority

- Inventory the current software, available exports, APIs, attachments, code lists,
  record volumes, retention rules, and data owner.
- Name the system of record for every entity and field family.
- Identify data that Time Motor Sales should not migrate.
- Obtain sample extracts early and profile real quality.
- Freeze the source contract for the migration project.

### Phase B — contract and mapping

- Define canonical target contracts and source profiles.
- Map source values, identifiers, statuses, dates, time zones, currency, and null
  semantics.
- Decide duplicate, update, missing-record, attachment, and historical-event policy.
- Create reconciliation control totals and acceptance thresholds.

### Phase C — rehearsal

- Run repeated imports in an isolated migration environment.
- Correct mappings and source data; never patch production tables manually.
- Validate entity counts, financial totals, inventory status, VIN uniqueness,
  relationship integrity, sampling, and business workflows.
- Measure throughput and establish the cutover window.

### Phase D — cutover

- Announce the source freeze and record the final baseline watermark.
- Apply the approved baseline package.
- Import the delta from the baseline watermark to the freeze point.
- Run automated and human reconciliation.
- Permit production activation only after named business and technical sign-off.

### Phase E — stabilization

- Operate an exception command center for an agreed stabilization period.
- Retain source extracts, manifests, mappings, job evidence, and reconciliation
  decisions under the migration retention policy.
- Keep the legacy system read-only until acceptance and rollback windows close.
- Decommission access and credentials through a separate approved decision.

## 9. Delivery roadmap

### Gate 0 — decisions and data governance

Deliver:

- domain and field classification register;
- capability and separation-of-duty matrix;
- source-authority matrix;
- contract naming/versioning standard;
- retention, artifact-expiry, and evidence policy;
- first migration source inventory and sample-data agreement.

Exit when Security, Operations, and the owning business managers approve the policies.

### Gate 1 — control-plane foundation

Deliver:

- common job lifecycle and job workspace;
- immutable upload/artifact metadata and external object-storage boundary;
- CSV/JSON parsing foundation, schema contracts, validation, row results;
- job queue, checkpoints, cancellation boundaries, and operational telemetry;
- capability checks, audit, governance record, and approval foundation.

Pilot with non-sensitive reference data only.

### Gate 2 — safe export

Deliver:

- versioned export templates;
- interactive and asynchronous export;
- filtering, snapshot/watermark, redaction, hashes, expiring download;
- export audit, revocation, and cleanup;
- first domains: vehicles/inventory and task/appointment operational views.

### Gate 3 — preview-first import

Deliver:

- template downloads, source profiles, mapping versions;
- immutable staging and full validation;
- duplicate detection and field-level impact preview;
- create-only and update-only apply through domain commands;
- rejected-row repair package and child-job retry.

Pilot vehicles/inventory before customers.

### Gate 4 — migration projects

Deliver:

- multi-entity manifests and dependency orchestration;
- upsert and patch with approval;
- before-image evidence and compensating packages;
- rehearsal comparison, baseline-plus-delta cutover, and sign-off;
- vehicles, customers, inventory, appointments, and selected service history.

### Gate 5 — recurring exchange

Deliver:

- schedules, API/file connectors, cursor watermarks, pause/resume;
- freshness monitoring, bounded retry, dead-letter handling;
- snapshot-sync missing-record policies;
- reuse of the existing integration exchange and reconciliation workspaces.

### Gate 6 — enterprise scale and compliance

Deliver:

- partitioned staging and high-volume parallelism with per-domain throttles;
- legal/compliance export workflows;
- disaster-recovery proof, artifact lifecycle proof, and load testing;
- API contract lifecycle, partner onboarding, and operational SLO dashboards.

## 10. Domain rollout order

| Wave | Scope | Why |
| --- | --- | --- |
| 1 | Reference data and vehicle/inventory preview/export | Strong identifiers and existing preview/integration foundations |
| 2 | Vehicle/inventory controlled apply | Highest migration value; domain rules already mature |
| 3 | Customers/leads and contact points | High value but requires cautious duplicate and privacy controls |
| 4 | Appointments and selected task history | Existing package/export groundwork; relationship-sensitive |
| 5 | Repair orders, estimates, jobs, parts, and documents | Complex dependency graph and evidentiary requirements |
| 6 | Staff/time attendance and accounting handoffs | Highly restricted; payroll/accounting authority and legal sign-off required |

Accounting should begin as controlled export/reference exchange. It should not become a
general inbound posting path until reconciliation, period controls, and accounting
approval rules are independently specified.

## 11. Success measures

- 100% of applied rows trace to a job, asset hash, contract, mapping, policy, actor or
  service identity, and command result.
- 100% of rejected rows have stable reason codes and repair guidance.
- Zero direct production-table writes from import adapters.
- Zero secrets or prohibited payment data in staging, lineage, export, or error files.
- Re-running an identical completed job produces no duplicate business effects.
- Critical migrations reconcile required counts, identities, relationships, and
  financial or inventory control totals before activation.
- Every sensitive export has a purpose, field scope, download history, and enforced
  expiry.
- Operators can pause a recurring connection without deploying code.

## 12. Explicit non-goals

- A generic SQL dump/restore interface.
- Arbitrary user-authored code in mappings.
- Silent customer merging.
- Routine hard-delete import.
- Production activation of a named provider before contract, security, legal, pilot,
  and rollback approval.
- Replacing domain commands and validations with a bulk database writer.
- Treating PDF reports as machine-import contracts.

## 13. Research baseline

The plan was informed by official product material available on 2026-07-26:

- [ServiceNow import sets](https://www.servicenow.com/docs/r/integrate-applications/system-import-sets/import-sets-landing-page.html)
- [ServiceNow transform maps](https://www.servicenow.com/docs/r/xanadu/integrate-applications/system-import-sets/c_CreatingNewTransformMaps.html)
- [Microsoft Dataverse import and export](https://learn.microsoft.com/en-us/power-apps/maker/data-platform/data-platform-import-export)
- [Microsoft Dataverse server-side import flow](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/run-data-import)
- [Dynamics 365 data management package API](https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/data-management-api)
- [Dynamics 365 recurring integrations](https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/recurring-integrations)
- [Salesforce Bulk API 2.0 overview](https://developer.salesforce.com/blogs/2024/04/accessing-object-data-with-salesforce-platform-apis)
- [DealerCenter automatic inventory import](https://support.dealercenter.net/hc/en-us/articles/115003197366-How-to-Automatically-Import-Inventory-into-DealerCenter)
- [DealerCenter QuickBooks integration and mapping](https://support.dealercenter.net/hc/en-us/articles/216890806-QuickBooks-Integration-Overview)

