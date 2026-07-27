# Data Movement Decisions, Workflows, and Algorithms

This document locks the decisions that guide implementation of Time Motor Sales
imports, exports, migrations, and recurring exchanges. It is the governing
operating contract until superseded by an approved decision record.

## 1. Locked decisions

| Decision | Locked rule | Owner |
| --- | --- | --- |
| System of record | Time Motor Sales is authoritative for operational status, audit history, permissions, and commands. A source system is authoritative only for explicitly approved field families during a named migration or feed. | Product + domain owner |
| Canonical model | All sources map to versioned Time Motor Sales contracts before validation or application. Source-specific fields remain in an attributed extension area. | Product + engineering |
| Identity | Every migrated entity receives a permanent internal ID and retains source-system/type/key references. Matching uses exact trusted keys first, then scored evidence; uncertain matches are queued for review. | Data steward |
| Scope | Each job declares included entities, date range, locations, historical depth, excluded records, and relationship dependencies. Anything outside scope is untouched. | Migration lead |
| Destructive behavior | Missing source rows never delete records. Deactivate, archive, or ignore requires an explicit policy and protected-record exceptions. | Domain owner |
| Approval | Preview approval is required before production mutation. The person who prepares a mapping cannot be the sole approver for a sensitive or destructive job. | Operations + security |
| Failure handling | Every rejected row has a stable row key, reason code, human explanation, and repair/retry path. Hidden partial failure is prohibited. | Job owner |
| Security | Raw files and generated exports are encrypted, classified, access-controlled, retained for a defined period, and downloads expire. Sensitive exports require purpose and approval. | Security |
| Rehearsal | A production migration requires sample testing, full dry run, reconciliation, user acceptance, cutover checklist, and rollback/forward-fix decision. | Migration lead |
| Success | A job is successful only when processing, validation, application, reconciliation, and exception thresholds all pass. | Job owner + approver |
| Ongoing exchange | Scheduled feeds use the same staging, mapping, validation, idempotency, audit, and reconciliation controls as one-time imports. | Integration owner |

## 2. Canonical import algorithm

For each job, execute these steps in order:

1. Create a job ID and bind it to the source, scope, contract version, mapping version, policy version, operator, and approval requirements.
2. Receive the asset or connector payload into immutable landing storage. Record size, hash, source timestamp, and chain-of-custody metadata.
3. Scan for malware and unsafe content. Quarantine on failure.
4. Parse without changing values. Preserve the original row, column, and source location for every value.
5. Normalize safe representations only (whitespace, casing, phone/date formats, enumerations). Never silently invent data.
6. Resolve identities: exact approved source key first; otherwise calculate a documented evidence score; accept only above threshold; queue the middle band for human review; reject below threshold.
7. Validate required fields, formats, references, permissions, business invariants, duplicate policy, and authority rules.
8. Produce a preview containing creates, updates, unchanged rows, conflicts, rejected rows, relationship effects, and estimated totals.
9. Require approval of the unchanged preview. Any asset, mapping, policy, or source change invalidates approval.
10. Apply in dependency order through domain commands, with an idempotency key per source record and operation. Checkpoint each chunk.
11. Reconcile counts, totals, identities, relationships, and critical status facts against the source baseline and expected policy.
12. Complete, pause, or fail with an operator-readable report. Publish metrics and audit evidence.

## 3. Export algorithm

1. Authorize the requester, purpose, scope, fields, and time boundary.
2. Apply classification rules, row/volume limits, masking, and redaction.
3. Create a consistent snapshot and versioned export contract.
4. Generate the artifact asynchronously in chunks; write a manifest with counts, schema, filters, hashes, and generated-at time.
5. Require secondary approval when policy marks the export sensitive, broad, or externally shared.
6. Encrypt the artifact, provide an expiring download, and record every access.
7. Revoke or expire access automatically; retain evidence according to policy.

## 4. Operating workflows

### A. New source migration

Discover source and ownership → inventory entities and fields → define scope and
canonical mapping → sample extract → preview and correct mapping → full dry run →
reconcile → business acceptance → source freeze → baseline load → delta load →
cutover verification → sign-off → retain source read-only during the protection window.

### B. Failed-row repair

Open job report → filter by reason code → correct only the repair package → re-run
validation → preview changed rows → approve → apply as a child job → reconcile parent
and child totals. Never edit the original landing asset.

### C. Recurring feed

Receive on schedule → authenticate and verify signature → reject replayed payloads →
stage and validate → apply only approved field families → alert on freshness, volume,
error-rate, or duplicate thresholds → pause automatically after repeated breach.

### D. Emergency stop

Any operator may pause a running job. The system checkpoints safely, prevents new
mutations, preserves evidence, reports applied versus unapplied work, and requires a
new approval to resume.

## 5. Mandatory reason codes and thresholds

Use stable codes such as `MISSING_REQUIRED`, `INVALID_FORMAT`, `UNKNOWN_REFERENCE`,
`DUPLICATE_CANDIDATE`, `AMBIGUOUS_IDENTITY`, `AUTHORITY_CONFLICT`, `PROTECTED_RECORD`,
`POLICY_DENIED`, `STALE_PREVIEW`, and `REPLAYED_PAYLOAD`.

Initial policy defaults: zero unexplained failures; zero unauthorized field changes;
100% critical-relationship reconciliation; duplicate candidates require review;
financial totals must reconcile exactly or receive an explicit signed variance; any
security scan, signature, or approval failure blocks application.

## 6. Implementation gates

Do not build provider connectors until the canonical contracts, identity policy,
reason codes, audit fields, export classifications, approval matrix, and reconciliation
report are approved. Start with one narrow domain (customers and vehicles), prove a
rehearsal end-to-end, then reuse the control plane for inventory, deals, service, and
accounting.

## 7. Required project artifacts

Every migration or feed must have: source inventory, data dictionary, mapping and
policy versions, scope statement, sample results, preview report, approval record,
runbook, reconciliation report, exception log, rollback/forward-fix decision, and
post-cutover review.

