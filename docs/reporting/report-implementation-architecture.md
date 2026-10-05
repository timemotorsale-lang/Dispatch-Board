# Time Motor Sales Reporting Implementation Architecture Draft

Prepared October 4, 2026. This is the proposed technical architecture for implementing the [report catalog](report-catalog.md), [operating rulebook](report-operating-rulebook.md), and [console design](report-console-design.md). Execute through the [roadmap](report-implementation-roadmap.md), [milestones](report-implementation-milestones.md), and [single execution prompt](report-implementation-prompt.md). This document describes target behavior, not completed implementation.

## Scope and governing rules

Build reporting inside the existing Next.js, React, TypeScript, PostgreSQL, and Prisma application. Reuse repository-local authorization, command, audit, outbox, storage, UI, and test patterns. Do not add a separate analytics service, warehouse, queue provider, authentication system, or required external integration for this program.

Repository instructions and the Enterprise Optimization Constitution govern execution. Current domain policies remain authoritative. Reporting must not silently change payroll, customer promises, financial status, employee standing, or operational source records. Reports suggest or link to actions; existing authorized domain commands execute them.

The full program covers shared reporting foundations, individual daily/weekly/monthly history and review, department and leadership reviews, live reports, snapshots, saved views, controlled exports, secure schedules, and operational monitoring. Financial forecasting, a free-form SQL builder, autonomous employee scoring, and AI-generated authoritative calculations are outside scope.

## Evidence baseline and reuse

| Existing element inspected | Role in the design | Required compatibility work |
| --- | --- | --- |
| Reports route and inventory governance workspace | Preserve existing inventory report functionality | Add shared console navigation without removing authorized existing reports |
| WorkdayReportSeed and WorkdayReportDraft | Source classification and prepared daily/weekly/monthly content | Reuse drafting rules; preserve user edits and existing workbook actions |
| StaffDailyReport and daily-handoff repository | Existing versioned daily submissions with source snapshots | Keep legacy submissions retrievable and avoid duplicate submissions through new entry points |
| Daily carryover service | Existing follow-up from submitted daily reports | Preserve semantics; prove new submissions do not generate duplicate carryovers |
| Enterprise reporting intelligence helper | Source-backed section organization | Adapt behind shared contracts, not a separate report ledger |
| Enterprise command, domain event, audit, and outbox models | Durable command and asynchronous side effects | Validate applicability and reuse existing transaction and worker ownership |
| Controlled export and governance workflows | Export authority and evidence controls | Integrate through existing policies; do not bypass them with a new download endpoint |

Presence of a model does not establish that its behavior satisfies the target contract. Milestone RPT-00 must inspect complete services, routes, policies, workers, and tests before selecting reuse paths.

## Logical layers

```text
Working consoles and central Reports
              |
Authenticated report queries and commands
              |
Reporting policies and application services
       |                         |
Calendar and lifecycle     Definitions and calculations
       |                         |
Report persistence       Authorized domain source adapters
       |                         |
Audit and outbox          Existing operational records
       |
Existing worker infrastructure
       |
Preparation, snapshots, exports, and secure delivery jobs
```

Proposed ownership: src/features/reporting for UI; src/lib/reporting for pure contracts, calendar, and calculation functions; src/server/services/reporting for orchestration; src/server/repositories/reporting for persistence; src/server/policies/reporting for authorization; src/server/validation/reporting for command/query validation. Follow actual repository naming patterns if inspection shows a better local equivalent. Route composition remains in src/app.

## Data contracts

| Logical entity | Purpose and constraints |
| --- | --- |
| Definition and definition version | Stable report identity; immutable effective calculation contract, supported filters, source requirements, field rules, owner, quality policy |
| Calendar policy version | Timezone, business days, holidays, shift attribution, due/review rules; effective dates and immutable prior versions |
| Reporting assignment | Subject, department/location, obligation, reviewer and deputy; effective range; prevent ambiguous overlapping assignments |
| Expectation | Concrete subject, report family, cadence, period boundaries, deadlines, policy versions, disposition; generation must be unique and retry-safe |
| Report series | Stable identity for subject, definition, cadence, covered period, and scope; one canonical history across old and new entry points |
| Draft | Editable content, observed source fingerprint, optimistic version, autosave state; not an accepted revision |
| Revision | Immutable submitted content, structured facts, cutoff, evidence manifest, attribution snapshot, author and delegation reason |
| Review event | Append-only approval, return, correction, or administrative void; references the exact revision and actor authority |
| Accepted revision pointer | Current effective approved revision updated transactionally; preserve superseded revisions |
| Snapshot and evidence manifest | Frozen facts with version, scope, provenance, completeness, exclusions, numerator/denominator, source record identities |
| Saved view | Definition plus typed filters/columns, ownership and sharing scope; no permission-bearing query text |
| Schedule and schedule version | Rolling/fixed period semantics, timezone, recipients, delivery policy, effective state and next execution |
| Job and artifact | Retry identity, attempt/lease state, progress, output expiry and access; content storage references must not expose credentials |

These are logical contracts, not a mandate to introduce one new table for every row. Reuse or extend existing models where they meet the invariant. Record the physical model decision before creating migrations.

## Legacy submission compatibility

Resolve the canonical daily report identity from the existing staff-day/workbook subject and covered period. Preserve legacy IDs through an explicit unique mapping. Initially, expose historical StaffDailyReport snapshots through a read adapter without rewriting them.

For new daily writes, extend the existing workflow or wrap it in one canonical transactional submission service. The old staff-close action and new Reports Submit action must reach that same command and identity. Do not dual-write two independent submission ledgers. If an additive replacement model is needed, use a deterministic import mapping and maintain the legacy read path until migration reconciliation and carryover regression tests pass.

Daily submissions retain existing accuracy confirmation and delegated-submission reason requirements. Adding weekly/monthly periods must not invent BoardDay records for every reporting period. Workbook drafts remain preparation inputs; submitted snapshots are authoritative history.

Existing cascading deletion relationships require specific assessment. Historical submitted reports must remain retrievable under the approved retention policy when a workbook or staff assignment is removed. Use additive retention-safe references or tombstone mappings; do not destructively change or delete historical data to simplify the schema.

## Query and source adapter contract

A request carries report identity, typed filters, period/time basis, requested cutoff, and actor context. The server resolves authoritative scope. A domain adapter returns authorized normalized facts with stable source IDs, occurrence and recording times, owner/actor attribution, required timestamps, permitted amounts, evidence references, freshness, completeness, and capability limitations.

A response carries definition version, effective scope, period, cutoff, quality status, observations, computed measures, contributing-record counts, exclusions, and permitted actions. Record-detail queries must use the same eligibility and scope as the displayed measure, not a second approximately equivalent filter.

Enforce row and field policy before calculations and caching. Cache keys include scope, field-policy fingerprint, definition version, filters, period, cutoff, and source version/freshness. Never share restricted cached totals across users merely because they requested the same report name. A permission change invalidates access to cached results and saved artifacts.

Historical reconstruction requires actual transitions or saved snapshots. If a source has only current state, show current facts and a historical-unavailable reason; do not infer old state from updatedAt. Source contracts classify each metric as supported, supported with explicit limitation, or unavailable.

## Calendar and metric engines

Calendar logic is deterministic with an injected clock and explicit timezone. Separate covered period from deadline and review deadline. Handle daylight-saving offsets, overnight shifts, assignment changes, leave, holidays, and weeks crossing months. Version all effective policies. Use a proven existing timezone utility if available; if none is suitable, select a maintained timezone-aware library and document the decision before use rather than hand-writing offset arithmetic.

Metrics use structured domain facts and versioned eligibility rules. Distinguish event counts, end-of-period stock, elapsed durations, active labor, monetary categories, and cohort rates. Roll up numerator and denominator, recalculate medians from observations, and identify incomplete cohorts. Null/unavailable is not zero. Money uses integer minor units or approved decimal arithmetic with declared currency.

Deterministic exception classification applies data sufficiency and mandatory policies before ranking. Return reason codes and evidence. No score may hide a failed mandatory control. Do not use report counts to discipline or rank employees automatically.

## Transactional command invariants

Each state-changing command validates schema, actor, scoped authority, expected revision, and allowed transition before mutation. In one database transaction, persist the result, audit evidence, and required outbox entry. Use existing command-ledger conventions where applicable.

Submission retries use a stable idempotency key bound to actor, operation, and request fingerprint. Same key/same payload returns the original result; same key/different payload conflicts. Concurrent submissions cannot allocate the same revision number. Reviews target an immutable revision; compare-and-swap protects accepted pointers and prevents approval of a stale or replaced submission.

Self-approval is denied by default, including delegated submissions; apply the configured separation-of-duties policy to author, subject, and submitting actor. Returning a correction leaves the prior accepted revision effective. Revoked access is checked again on reads, review, download, and delivery.

## Jobs and delivery

Reuse the app's worker and outbox patterns after verifying their guarantees. Jobs have durable uniqueness, leases, heartbeat or expiry, retry backoff, bounded attempts, cancellation, and redacted failure details. A crashed worker can release or expire its lease without duplicating a submission, snapshot, or export.

Database/job processing can be retry-safe; external delivery is not automatically exactly-once. Use provider idempotency where available and record uncertain deliveries for reconciliation rather than retrying blindly. Schedule changes/cancellation are checked before dispatch, and each recipient's current entitlement is checked independently.

Secure in-app delivery is the baseline. External email/attachments remain disabled unless existing configured infrastructure and approved delivery policies support them. A successful submission remains successful when delivery fails. Late runs use explicit catch-up rules and preserve the original requested period.

## UI and API boundaries

Expose narrowly typed queries for overview, library, personal/team history, expectations, series/revisions, metric detail, and job status. Expose separate commands for preparation, draft autosave, submit, return, approve, correction, expectation excuse, saved-view sharing, schedule changes, and export requests. Use existing server-action/API conventions and CSRF/session protections; never trust caller-supplied author, organization, entitlement, or status.

The UI supplies Overview, My Reports, Team Reports, and Library, with one dominant action per workflow. The existing /reports URL remains valid. Preserve permitted inventory scorecard links and working-console return paths. Field errors and action failures retain user input. Add keyboard, focus, screen-reader, narrow-screen, and interrupted-connection verification.

## Migration and rollout

Use additive migrations first, indexes for scoped period/history retrieval, and deterministic legacy mappings. Test empty-database and representative legacy upgrade paths in disposable databases. Backfills support dry run, checkpoints, bounded batches, reconciliation, and safe rerun. Do not reset a shared database or apply migrations to production during coding.

New calendar obligations, reminders, and external delivery start disabled. Install proposed defaults as draft configuration, not active employee requirements. Local test fixtures may activate them. Production activation needs the named business owner to settle role, shift, threshold, retention, and delivery policies.

Release flags should separate read-only access, staff submission pilot, manager review, and scheduling/export capabilities. Rollback disables new entry points and jobs while preserving history and legacy retrieval; it does not delete accepted revisions or destructively reverse applied data migrations.

## Architecture decisions required at the first milestone

Record canonical submission ownership, physical persistence model, authorization/entitlement mapping, historical source support, retention handling, timezone library choice, worker integration, storage/export reuse, and pilot flag ownership. Resolve technical choices through evidence and repository patterns. Unknown business policy blocks production activation, not unrelated coding or test work.
