# Time Motor Sales Reporting Implementation Milestones Draft

Prepared October 4, 2026. Each milestone has implementation outputs and a pass/fail gate. These gates govern the [roadmap](report-implementation-roadmap.md) and [execution prompt](report-implementation-prompt.md). Proposed test names and new file locations should follow existing repository conventions when implemented.

## RPT 00 Evidence and decisions

Inspect complete reporting, staff-close, carryover, workbook, policy, export, worker, route, and test code. Read repository instructions, the governing Constitution, and relevant domain specifications. Establish baseline checks without erasing unrelated work. Record actual source-to-metric mappings and whether historical cutoffs can be supported.

Outputs: implementation status ledger, source capability matrix, decision register, canonical legacy identity plan, access matrix, and dependency map. Name existing tests to preserve, including daily handoff/browser submission and enterprise reporting intelligence.

Gate: every catalog report has a source owner and explicit supported/limited/unavailable classification; no technical decision assumes an uninspected provider or worker; migration and authorization strategy is recorded. Business activation choices remain separate from technical implementation decisions.

## RPT 01 Calendar and expectations

Implement versioned calendar rules, period resolution, assignments, concrete deadlines, applicability, leave/excuse handling, and retry-safe expectation generation. Install defaults as draft configuration. Provide authorized policy preview showing affected expectations before effective-date changes.

Tests: spring/fall daylight-saving changes; overnight shift; holiday-shifted deadline; fixed coverage despite deadline shift; leap month; week crossing months; mid-period transfer/join/deactivation; leave; overlapping assignment rejection; generation rerun; grace boundaries; reviewer absence. Inject clocks and use deterministic fixtures.

Gate: identical inputs and policy version resolve identical periods; no accidental duplicates; partial and excused periods remain distinguishable; no new production obligations activate implicitly.

## RPT 02 Canonical persistence and legacy history

Implement additive schema changes, stable report-series identity, draft optimistic versions, immutable revisions, evidence snapshots, accepted pointers, review records, and lookup indexes. Add legacy read mapping and a canonical daily write path. Assess cascade deletion and preserve historical access.

Tests: empty install and legacy upgrade on disposable PostgreSQL; deterministic mapping rerun; unchanged legacy counts and snapshots; duplicate series prevention under concurrency; old staff-close and new submit path identity; preserved existing carryover behavior; retained history after staff/workbook removal under the chosen policy.

Gate: no independent duplicate submission ledger; rollback can restore legacy entry points without deleting report history; required database constraints enforce invariants rather than relying only on UI checks.

## RPT 03 Individual daily reporting

Deliver prepared daily content, relevant sections, autosave, refresh reconciliation, accuracy confirmation, explicit submission, authorization and validation, and personal archive. Preserve meaningful updates and source evidence. Integrate canonical commands with audit/outbox transaction patterns.

Tests: draft edit and interrupted autosave; source refresh preserves user context; source quality warnings versus mandatory submission blockers; unauthorized subject/location; delegated reason; idempotency key conflict; simultaneous/retried submission; rollback on audit/outbox failure; legacy staff-close regression. Browser flow must open, review, submit, and retrieve the report at desktop and phone widths.

Gate: one successful command produces one revision; successful submission is discoverable after response loss; browser errors retain input; no source-console navigation is needed for a valid prepared submission.

## RPT 04 Review and corrections

Deliver team review queue, authorized tracker, approve/return with reason, deputy routing, stale revision checks, correction requests, and accepted-version history. Separate private coaching annotations from employee-visible comments.

Tests: self-approval denial including delegates; team/location boundaries; revoked access; unauthorized identifier lookup; concurrent review; required return reason; correction approval and rejection; immutable prior revisions; submission percentage with excused/not-required periods; backup reviewer expiry.

Gate: returned correction preserves the prior accepted revision; approvals target exact immutable revisions; search, counts, and annotations do not leak unauthorized content.

## RPT 05 Weekly monthly and management reports

Deliver daily/weekly/monthly retrieval, generated individual summaries, configurable obligations, department reviews, and leadership briefs. Calculate from underlying facts and use approved reports for context. Preserve partial-period and incomplete-submission warnings.

Tests: source event deduplication; repeated carryover; reopened work; weighted rate example 10/12; end-of-period stock rather than daily sum; recomputed median; missing daily report with valid source outcomes; immature conversion cohort; zero baseline; historical assignment; unchanged approved report after source correction.

Gate: generated summary is not labeled submitted or approved; weeks crossing months retain one identity; period comparisons disclose scope, completeness, and calculation differences.

## RPT 06 Shared console and core operational reports

Deliver Overview, My Reports, Team Reports, Library, source-aware filters, report return paths, Daily Operations Brief, Inventory Aging, Recon Production, and Review Backlog. Preserve existing inventory report routes and controlled export links.

Tests: each measure matches its contributing authorized records; receipt age differs correctly from frontline age; elapsed recon differs from active labor/waiting; current-only sources refuse unsupported historical reconstruction; saved context survives record navigation; filter scope persists; confirmed zero differs from unavailable.

Gate: same definition/filter/actor/cutoff produces identical results from working-console and central entry. Inspect desktop/mobile screenshots, keyboard focus, screen-reader labels, text fit, and sticky action placement. No placeholder result is presented as live evidence.

## RPT 07 Domain report coverage

Implement catalog adapters for Sales/CRM, Customers, Appointments, Acquisition/Disposition, Diagnostics/QC, Parts/Vendors, Claims, Documents, Attendance, and Growth using validated contracts. Link actions to existing domain commands. Keep absent sources explicitly unavailable.

Tests: source-specific qualifying statuses; opportunity deduplication across customer/deal links; appointment reschedule/cancellation attribution; partial parts receipts; claim amount categories; required document slots; unresolved punches; campaign attribution and incomplete spend; sensitive financial/personnel field access; source-owner reconciliation fixtures.

Gate: every supported report has meaningful reconciliation and negative-access tests. Broader operational capability gaps are named and not silently fabricated. This milestone cannot be called fully verified if required adapters remain blocked; independent work may continue with the gap recorded.

## RPT 08 Archive views snapshots and exports

Deliver scoped archive search, inactive-person retrieval, accepted/prior revisions, compatible comparisons, favorites, personal/team views, published snapshots, and controlled export requests. Add bounded pagination and appropriate indexes.

Tests: period versus submission-date retrieval; restricted search suggestions; expired/revoked access; mismatched comparison scope/version/currency; private/team view sharing; snapshot freeze; download field-policy enforcement; export business reason and authority; size limits, expiry, cancellation, and retry.

Gate: exports match displayed authorized scope and cutoff; all existing export controls remain effective; archive queries avoid unbounded scans and history is accessible under the approved policy.

## RPT 09 Scheduling reminders and resilience

Deliver schedule management, rolling/fixed-period selection, durable job execution, in-app secure delivery, reminder suppression, catch-up policy, retry/dead-letter visibility, and administrator job health. External channels require existing configured infrastructure and permitted delivery policy.

Tests: concurrent workers; lease expiry/crash recovery; duplicate trigger; schedule update/cancellation race; daylight-saving run; late job catch-up; per-recipient revoked permission; no sensitive logs; failed delivery leaves submission intact; excused/submitted reminders suppressed; provider-uncertain delivery reconciled rather than blindly retried.

Gate: side effects are bounded and auditable; new production reminders and outbound channels remain inactive until approved configuration is selected; failure states are visible and recoverable.

## RPT 10 Final regression and release evidence

Run focused reporting units, database integration and authorization/concurrency tests, affected domain regressions, and browser journeys through the existing isolated runner. Run npm run db:validate, npm run typecheck, npm run lint, npm run test, npm run build, and appropriate npm run test:e2e invocations. Inspect scripts first; do not use destructive database reset or cleanup against shared data.

Required browser scenarios: employee daily submit/retrieve; returned report resubmit; manager approval; correction with accepted history; weekly/monthly retrieval; live metric to records and back; controlled export; schedule failure/retry. Include staff, manager, unauthorized user, and revoked-access fixtures.

Record realistic query/load measurements against a stated dataset and agreed concurrency. Initial design goals are useful cached results within 2 seconds and ordinary filters within 3 seconds; label measured values and test conditions. Verify pagination and job behavior with larger datasets.

Gate: no unresolved critical invariant failures; no required test reported passed without execution; any baseline/environment failures isolated and documented; feature flags, migration instructions, policy owners, monitoring, and rollback reviewed. Start a local server on an available port and provide its URL for the implemented app. Production activation remains distinct from implementation verification.

## Traceability and evidence format

For each milestone record requirement, implementation path, test/fixture path, command or scenario, result, and remaining limitation. Link defects to the affected invariant. When a change invalidates an earlier gate, reopen only affected evidence and rerun its dependent checks.

The one-prompt run should keep progressing through verified dependencies. On a genuine external blocker, finish independent work, retain a reproducible checkpoint, and report exactly what remains blocked. Do not mark the program complete solely because all screens exist.
