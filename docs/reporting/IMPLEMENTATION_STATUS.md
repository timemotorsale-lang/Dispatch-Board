# Reporting Implementation Status

## Sequential implementation checkpoint (October 4, 2026)

This checkpoint supersedes earlier remaining-work lists where these slices are concerned. Prior follow-on work was committed as 3f69099b before this sequence. The changes below are in reports-enterprise-design and have not been integrated into the main local checkout, committed, merged, pushed, or activated in production.

1. RPT-01: GM calendar draft and impact-preview panel, bounded projection, existing-deadline preservation, holiday and partial-period coverage, approved subject/reviewer time-off conflict detection, and revoked-reviewer checks. Calendar/assignment advisory locks now use executeRaw, avoiding Prisma's unsupported void-result decoding. Generation rejects unresolved conflicts; no automatic leave exemption or obligation activation was introduced. Preview dates are explicitly preview dates, not persisted policy effective dates.
2. RPT-08: independent scoped cursors for canonical and legacy archives, deterministic tie ordering, retrieval beyond the former 50-legacy-record ceiling, and client append of both streams. A 55-submission database/browser fixture verifies complete retrieval and unchanged frozen evidence. The combined loaded records sort by covered period; this is not a global cross-stream chronological pagination contract.
3. RPT-03: failed autosave retains local edits with explicit retry; lost acknowledgement recovery verifies the saved content and advanced version before accepting success. Editor labels remain stable after edits. Reload verification confirms recovered content persisted.
4. RPT-09: GM recovery of the owner's enabled dead-letter schedule, active-calendar/rollout/current-source-access gates, business reason, optimistic schedule-version increment, same-transaction job reset and audit/outbox. The original run key is retained; previous attempts, error and lock are frozen in command evidence. Library exposes recovery for stopped enabled schedules. This does not install a background worker or approve automatic catch-up. The service/database recovery journey is tested; the UI's enabled production recovery journey still needs pilot verification.

Verification at this checkpoint: final focused pass 67 tests across eight files; full unit pass 862 files / 4,180 tests with 22 pre-existing skips; final 12 reporting browser/database scenarios passed in dispatch_board_e2e_reporting_calendar_20261004, including concurrent recovery and one delivery of the original run. Typecheck, scoped lint, whitespace validation and final production build passed (363 pages). A concurrency fixture was corrected to stop before the next legitimate run became due; it previously counted a second catch-up period as a duplicate. A subsequent repeated run exposed a real Prisma empty-update upsert race on the unique run key; job creation now uses createMany/skipDuplicates followed by unique retrieval. The full browser suite passed after that fix. Phone width is asserted nonoverflowing; desktop/phone calendar captures were inspected. Local branch preview /reports on port 3119 returned HTTP 200. No shared database migration or reset was performed in this sequence.

The final concurrent-worker/recovery scenario additionally passed three consecutive runs after the conflict-safe insert fix.

Remaining work is not classified as complete: policy effective-date activation/version selection and transactional generation revalidation; reviewer transfer/deputy routing; legacy upgrade and delegated/audit-failure fixtures; private coaching; cross-period attribution and department/leadership summaries; return-to-report context; richer source-owner metric contracts; favorites, sharing and comparable periods; background invocation, reminders and governed catch-up; retention, realistic load and production pilot/rollback certification. Production activation remains gated. Existing source limitations continue to apply; missing financial, labor, quantity and attribution facts are not fabricated.

## Current local integration status (October 4, 2026)

This section supersedes historical preview-only routing and rollout notes below. The main local checkout now includes the reporting implementation. Dispatch Board and Command Center Reports open /reports. Inventory Reports is independent at /vehicles/reports, including the Inventory sidebar, inventory tools, governance tabs, and capital-exposure link. Legacy /reports?scope=inventory redirects to Inventory; the reporting header has no Inventory scorecard link.

The local dispatch_board/public database was backed up before applying only the two pending reporting migrations. Vehicle (31), Task (376), and StaffDailyReport (0) row counts were unchanged. No reset, shared-data seed, schedule activation, merge, push, or production deployment occurred. Existing dirty navigation changes were preserved with contextual patches and file backups.

Current verification: 49 focused main-checkout unit tests passed; main typecheck and scoped ESLint passed; three isolated browser journeys passed on desktop and phone (Command Center, Inventory sidebar, Dispatch sidebar plus legacy redirect). The running main application on port 3000 was also checked through Dispatch Board to the requested Overview / My Reports / Team Reports / Library landing, using its existing development account. Prisma generation encountered a Windows engine rename lock, but generated reporting model delegates were present and the subsequent typecheck and live Reports read succeeded. Reporting write, expectation, and schedule flags remain at their existing settings.

Implementation started October 4, 2026 on reports-enterprise-design in the writable work/reporting-implementation checkout. This is a working first release, not a claim that every enterprise roadmap gate has passed. Calendar obligations, outbound delivery, and retention enforcement remain inactive until their policies are confirmed. No production migration, deployment, commit, merge, or push was performed during this implementation request.

## Evidence and decisions

StaffDailyReport is the canonical daily submission consumed by daily-carryover. Workbook seeds and period drafts are preparation inputs. New daily commands call the existing repository; legacy history stays retrievable. Existing timezone conversion is reused. Team personnel reporting is initially restricted to General Manager; staff only read their own history. Location grants alone do not authorize private personnel or financial content.

## Milestones

| Milestone | State | Implemented and remaining gate |
| --- | --- | --- |
| RPT-00 | Verified source assessment | Fourteen source projections classified below; conservative GM pilot access chosen. Deeper metric contracts remain separate requirements. |
| RPT-01 | In progress | Versioned calendar drafts, assignments, overlap checks, retry-safe expectations, excuses, grace-aware tracker. DST/holiday/leap/overnight units pass. Effective-date preview UI, leave integration, transfer and deputy scenarios remain. |
| RPT-02 | In progress | Additive series/revision persistence; canonical legacy daily writes; legacy reads; transaction audit/outbox; update-immutable evidence; guarded accepted pointer. Disposable empty install and later hardening upgrade pass. Broader legacy-upgrade fixtures and retained-history administration remain. |
| RPT-03 | In progress | Prepared daily content, optimistic autosave, accuracy confirmation, submit/retrieve and response-loss idempotency. Browser daily flow passes. Interrupted edits, audit failure injection, delegated legacy-route and carryover reconciliation fixtures remain. |
| RPT-04 | In progress | GM team queue, assigned-reviewer checks, independent approve/return, optimistic concurrency, correction revisions retaining accepted original. Concurrent review and returned correction pass. Deputy routing and private coaching notes are not implemented. |
| RPT-05 | In progress | Daily/weekly/monthly identities, individual evidence summaries, frozen carryover-parent links, within-period last-observation reconciliation and reopened carryover subset, coverage warnings, immutable submitted versions. Weekly/monthly browser tests pass. Cross-period roots and missing-link lineage, department/leadership briefs and comparable period calculations remain. |
| RPT-06 | In progress | Overview/My Reports/Team Reports/Library; fourteen source selectors; search, measure drilldown, record links, receipt-age buckets, task overdue and recon elapsed-age measures. Existing inventory scorecard retained. Cross-entry filter context and broader reconciliation fixtures remain. |
| RPT-07 | In progress | All fourteen definitions connect to actual Prisma records with explicit limitations. Rich financial, labor, quantity, document-slot, cohort and attribution metrics are not implemented and must not be represented as verified. |
| RPT-08 | In progress | Personal/team archive ranges, 50-period pagination, inactive-person names, accepted/prior revisions, saved views, scoped immutable snapshots, controlled CSV, reason/expiry/current-access checks and formula neutralization. Legacy archive pagination, favorites, sharing and compatible comparisons remain. |
| RPT-09 | In progress | Inactive schedules; gated enable/disable; secure in-app delivery; durable unique run key; atomic lease claim/fencing; bounded retries/dead-letter state; recipient access recheck. Concurrent workers and exhausted failures pass. Background invocation integration, reminders, catch-up approval, dead-letter recovery and interruption fixtures remain. |
| RPT-10 | In progress | Five reporting browser/database tests pass; desktop/mobile screenshots inspected; schema validation, typecheck, lint and final production build pass. Full unit pass: 4,130 passed, 22 pre-existing skips. No production pilot certification or realistic load gate yet. |

## Policy gates

Draft calendar: shifts, holidays, role obligations, reviewers, personnel retention, financial definitions, and delivery policy need confirmation before production activation.

## Source capability matrix

All measures describe authorized displayed rows, capped at 500 with a visible limitation when truncated. Missing values are not converted to zero. General Manager is the initial central-domain pilot role; staff see their own Operations, Review Backlog, submissions, saved views and schedules. Vehicle and attendance capability checks still apply. Sources without location identity refuse a location-filtered result rather than inventing one.

| Definition | Existing source owner | Implemented evidence | Classification and missing depth |
| --- | --- | --- | --- |
| Operations | Dispatch Task | Open task states, due timestamps, blockers, overdue contributing records | Limited current state; no financial/cross-domain approval synthesis |
| Inventory | InventoryUnit / InventoryReceipt | Open units, latest recorded arrival, age buckets, missing receipt dates | Limited current state; no frontline age/cost exposure |
| Recon | RepairOrder | Open orders, stage/state, elapsed open age, 14-day backlog | Limited current state; not active labor or completed cycle time |
| Sales | UnifiedCrmOpportunityRecord | Current nonarchived opportunity stages and next actions | Limited; no reconciled deliveries or matured conversion cohort |
| Customers | CustomerPromise / ConcernCase | Open promises, owners and overdue dates | Current commitment projection; not complete customer SLA reporting |
| Appointments | Appointment | Scheduled period and current attendance/cancellation; recorded check-in outcome ratio | Limited historical cohort; no original-cutoff/reschedule lineage certification |
| Parts | PartPurchaseOrder / PartVendor | Open orders, vendor, status, created age | Limited; JSON lines need source-owner quantity/timeliness reconciliation |
| Claims | InsuranceClaim | Recorded insurance claims, status/stage and creation age | Limited; no submission age, warranty cohort or recovery amounts |
| Documents | DocumentLibraryPacket | Packet recorded status and owner | Limited; not required-slot readiness certification |
| Attendance | TimeAttendanceSession | Work-date sessions, state, recorded exceptions/unclosed sessions | Limited historical cohort; not certified hours/payroll or complete exception calculation |
| Growth | GrowthCampaignPlan | Campaign channel, state and owner role | Limited; no spend completeness or attribution ROI |
| Quality | DiagnosticCase | Open diagnostic cases, assigned owner and risk/age | Limited; no first-pass QC or comeback rates |
| Acquisition | InventoryAcquisitionCase | Case status, vehicle, owner and creation age | Limited; no disposition outcomes/appraisal variance |
| Reviews | Dispatch Task | Ready-for-review/waiting-for-approval records | Limited current task backlog; not all enterprise decisions |

Only Appointments and Attendance accept historical covered periods, and both disclose that the recorded outcome is current rather than reconstructed as-of. Other live definitions reject historical dates. Saved submissions/snapshots remain frozen; no fabricated historical stock series is generated.

## Implementation paths

- prisma/schema.prisma and migrations/20261004170000_reporting_console: calendar, assignments, expectations, series, revisions, reviews, views, schedules and jobs; optional legacy daily idempotency metadata.
- migrations/20261004173000_reporting_integrity_hardening: accepted revision FK, independent-approval guard, revision/review/linked-daily update guards.
- src/lib/reporting: calendar, catalog/content contracts, spreadsheet safety, filter scoping and source measures.
- src/server/reporting: calendar policy, period commands/history, live adapters, library/controlled outputs, scheduling and enterprise command evidence.
- src/server/repositories/daily-handoff-repository.ts and services/daily-handoff.ts: one canonical daily path and transactional audit/outbox.
- src/app/api/reports: authenticated no-store reads, same-origin bounded writes and controlled exports.
- src/features/reporting and src/app/(app)/reports/page.tsx: console and retained inventory scorecard via ?scope=inventory.
- src/tests/unit/reporting-*.test.ts and src/tests/e2e/reporting-console.spec.ts: calculations, boundaries, real database commands and browser journeys.
- src/tests/e2e/daily-workflow.setup.ts: delete new reporting dependents before disposable board-day reset.

## Rollout and rollback

Apply both additive migrations before starting this revision against an approved target database. Generate Prisma in that checkout. REPORTING_WRITES_ENABLED governs new drafts/submissions/reviews; daily submission also retains STAFF_EXECUTION_ENABLED and STAFF_EXECUTION_END_OF_DAY_ENABLED. REPORTING_EXPECTATIONS_ENABLED and REPORTING_SCHEDULES_ENABLED default off; an active approved calendar is additionally required. No activation API is supplied until policy/effective-date governance is finished. Schedules are saved inactive. No email/SMS provider or automatic worker invocation is installed.

The existing shared database was not migrated. Browser tests used disposable dispatch_board_e2e_* schemas. Do not run resetDailyWorkflowState against ordinary/shared data. The reporting browser file explicitly refuses a non-e2e schema.

To roll back the console, disable reporting flags and restore the previous application revision. Keep the additive tables, revisions, and audit evidence. Do not reverse/drop migrations to remove saved reports. The previous inventory screen remains available through the retained route scope. Original checkout was detached at 88ce2fd8 so the reports-enterprise-design branch could be checked out in the writable implementation worktree; use that worktree for continuation.

## Next executable work

Finish RPT-01 effective-date policy preview and leave/deputy applicability, then close RPT-03/04 interruption/delegation/failure fixtures. Implement RPT-05 carryover-root and reopened-event reconciliation before department/leadership aggregation. Deepen each RPT-07 adapter through its existing domain policy/service contract and reconcile qualifying rows before publishing financial or performance measures. Finish RPT-08 legacy pagination/comparisons and RPT-09 governed job recovery/reminders. Release only after the remaining gate fixtures and realistic load/pilot checks pass. These are remaining implementation tasks, not completed features or business-policy blockers disguised as completion.

## Final executed checks

- npm run db:validate: passed.
- npm run typecheck: passed after browser runner finished writing generated route types.
- npm run lint: passed; existing JSX parser diagnostic printed without an ESLint warning/error or failure.
- npx vitest run --maxWorkers=4: 855 files passed, 22 skipped; 4,130 tests passed, 22 skipped. The final pass had no source/client regeneration in progress. Earlier concurrent checks had two unrelated timeouts, a temporary generated-route parse error and a Prisma regeneration/import race; their affected checks were rerun, not ignored.
- npm run build: passed; 362 pages generated. Existing Prisma preparation shell deprecation is unchanged.
- npm run test:e2e -- src/tests/e2e/reporting-console.spec.ts, isolated schema with reporting writes enabled: five passed. Weekly duplicate submission/concurrent review; controlled output and inactive schedule gate; daily canonical handoff/correction/frozen evidence; monthly identity/stale draft; concurrent schedule delivery/revoked access/dead-letter.
- Desktop 1440x960 and phone 390x844 screenshots inspected; phone document width asserted nonoverflowing. Existing operating-rhythm explanations were recorded in disposable fixtures, not bypassed in application code.
- git diff --check: passed before final documentation update; rechecked for handoff.
- Local preview: http://127.0.0.1:3118/reports, production build, dedicated dispatch_board_e2e_reporting_pilot_20261004 schema. /login returned 200. Writes enabled only for this disposable local preview; expectations/schedules disabled.

Runtime preview logs under work/ are local artifacts, not source changes and must not be staged. The original daily-workflow end-of-day browser test is already skipped upstream; the new reporting daily browser journey covers the implemented path without modifying that skip.

## Follow-on slice: observed carryover reconciliation

Command Center navigation follow-up: the live Reports destination is registered in the shared Operations navigation and launcher. The launcher omits its own Command Center tile, while home buttons and sidebar links continue to return to /command-center. Management workspace and reporting access policies are unchanged. Regression coverage checks the rendered launcher, nonmanagement redirect, and the Sales Documents -> Command Center -> Reports browser path on desktop and phone.

Inventory sidebar follow-up: its Reports item now targets the main /reports Overview console, matching Command Center. The former /reports?scope=inventory scorecard remains available through the Inventory scorecard button inside Reports; no scorecard capability or authorization is removed. Navigation units and a desktop/mobile sidebar browser journey cover this destination and retained secondary link.

Inventory sidebar verification: 14 focused navigation/page units passed; the sidebar browser journey passed at 1440px desktop and 390px phone widths in the isolated navigation schema. Type checking and whitespace validation passed. This change updates the sidebar destination only; the scorecard route is retained.

Dispatch entry follow-up: the reporting implementation now has an explicit Dispatch sidebar Reports destination at /reports. Route tests protect the new default landing and retain the inventory scorecard only for explicit scope=inventory. The original checkout is a different application version whose /reports page still unconditionally renders the old inventory workspace; its dirty navigation changes and shared database were not overwritten or migrated. Updating that running version requires identifying the user's actual address and a separate integration/rollout decision, not an absolute redirect into disposable preview data.

Dispatch entry verification: 17 navigation/landing unit tests passed, and the exact Dispatch Board sidebar -> main reporting landing journey passed at 1440px and 390px in the isolated navigation schema. Scoped lint passed. This verifies the reporting preview only, not installation into the original checkout or the other browser window.

Navigation follow-up verification: 14 navigation/page unit tests passed; the desktop/phone browser journey passed in dispatch_board_e2e_reporting_navigation_20261004; typecheck and scoped lint passed. The initial journey exposed the existing Start Day modal intercepting clicks. Disposable test fixtures now submit a truthful test-session delay reason through the normal modal instead of bypassing the workday rule. The user's preview session still requires its own Start Day or accurate delay reason. No new workday exemption or permission expansion was introduced.

The first release above was committed as 79bd1a37 on reports-enterprise-design before this follow-on work. No merge, push or production activation occurred. Follow-on changes remain uncommitted for review.

New daily snapshots freeze each task's immediate carryover parent. Period content v2 groups only identities supported by the subject's covered-period observations, uses the last observed outcome, retains outstanding work omitted from later days, and marks work observed open after completion as a subset of carryover. Each row displays its observation date. Current-day overlays use the configured period timezone and disclose their 1,000-task cap.

Legacy snapshots and stored v1 reports remain readable and unchanged. Missing parents, missing legacy metadata, conflicting links, cycles and depth limits produce incomplete-lineage warnings; titles are never used as identity. Roots outside the covered period, ownership transfers, unsaved state transitions and full event-level reopen history are not reconstructed. This completes a scoped RPT-05 foundation slice, not the full milestone.

Verification for this slice: 10 new reconciliation units; full unit suite 856 files passed, 22 skipped / 4,140 tests passed, 22 skipped; final typecheck and scoped ESLint passed. Six reporting browser/database scenarios passed against dispatch_board_e2e_reporting_lineage_20261004. The final observation-date display also passed a targeted browser rerun with desktop/mobile screenshots and phone overflow assertion. An initial fixture failure was corrected to comply with the existing blocked-task reason constraint. No migration was added or applied to shared data. The first release's production build is not claimed as a build of this follow-on slice.
