# Live Board and daily report refinement

Implemented locally on `codex/inventory-console-simplification`, October 29, 2026.

## Confirmed report retrieval defects

The local database contained 59 saved workbook report versions (57 daily, one weekly, one monthly), but no canonical report revisions or legacy daily submissions. The console searched only the latter two sources. Consequently existing workbook reports were invisible. Grouping the workbook records produces 20 current report groups, with earlier versions retained.

Exact-day filtering now drives the archive, coverage and expectations together. Workbook period dates are logical date keys: their UTC-midnight values must not be interpreted as local clock instants. The workbook archive uses parameterized date comparisons, groups versions before pagination, and carries a separate cursor position alongside canonical and legacy history.

Report requests have bounded waits, visible errors and retry actions. Settings and expectation failures are explicit. The team default opens Team Reports; other staff open My Reports. Historical live metrics lead to saved reports rather than presenting unsupported historical zeroes. Reports and work execution remain accessible while a morning plan is pending.

## Live Board responsibility (clarified)

The Live Board is a centralized information display of the existing tools. It shows team member, status, current work, workbook focuses and last update in one roster. Person details are read-only; links open the original work record or authorized report. Workbook planning and task execution remain in their existing workspaces. The board contains no focus planning/submission, availability editing, completion or handoff commands. Its toolbar offers date selection and refresh; generation and task intake remain on Overview. The duplicate board focus command API was retired without deleting existing records.

## Implementation map

| Area | Implementation |
| --- | --- |
| Compact Live Board roster, person detail, mobile layout | `src/features/board/team/team-now.tsx`, module stylesheet, existing BoardScreen |
| Current versus planned activity and freshness | `src/lib/dispatch-team.ts`, `src/server/dispatch/read.ts` |
| Accepted handoffs in the existing task workspace | `src/server/dispatch/command.ts`, `src/app/api/dispatch/team/route.ts` |
| Source task status integration | task-status repository/service and repair-order task bridge |
| Accepted handoff task controls | TaskHandoffPanel; managers retain reassignment with a required reason |
| Workbook three-focus policy | `src/lib/daily-focus-policy.ts`, workbook Start Day |
| Recorded report evidence and attribution | `src/server/dispatch/evidence.ts`, daily-handoff repository, period service |
| Saved workbook archive and prior versions | `src/server/reporting/workbook-history.ts`, period service and history cursor |
| Exact-day/person discovery and failure recovery | ReportingConsole, reporting management/calendar services, report navigation and API |
| Immutable corrections | ReportingRevision.correctionReason and existing revision-specific review records |

## Morning focus policy

Each active staff member is shown even without work or a plan. Today's workbook focuses appear in person detail and future generated daily report drafts. Submission requires at least three distinct nonblank outcomes; repeated text does not meet the minimum. Staff explicitly submit their plan in the workbook. The Live Board displays its focus records automatically, without another submission or compliance prompt. These are planning records, not inferred attendance or productivity measures.

The board reads WorkdayDailyFocusItem rather than creating another task queue. Planning, revisions and carryover remain workbook responsibilities. Viewing the Live Board does not create, approve, submit or change a plan.

## Ownership and source controls

Starting source work updates the primary activity record in the same transaction as its task event. Other active jobs remain intact. Finishing work clears that primary focus without assuming availability.

Handoffs use authenticated actors, serializable transactions, expected versions, durable idempotency receipts and atomic audit records. A pending handoff retains its sender; only the receiver accepts or declines. A lost response can be retried with the same operation key. Acceptance transfers ownership once and does not imply work started. Repair-job transfers must use Repair dispatch to preserve technician assignments and labor clocks. Customer approval, procurement approval, QC and billing controls remain in their existing services.

## Compatibility and release

Migration `20261029193000_dispatch_team_activity` is additive and transactional: two activity tables, their indexes and foreign keys, a nullable revision correction reason, and a workbook history index. It was applied only to the verified localhost development database. Existing report, focus and task IDs were preserved. No report backfill or invented staff submission was performed.

Apply this migration and generate Prisma before releasing the code elsewhere. Existing reporting write/expectation/schedule flags retain their current behavior. This change does not activate delivery channels, workers, notifications or a new due-time policy. Nothing has been committed, pushed or deployed by this implementation task.

## Acceptance and verification

| Criteria | Evidence |
| --- | --- |
| L01–L06 | Shared status integration, compact/person projection tests, distinct planned/current work, workbook focus evidence and deduplicated attention |
| L07–L09 | Existing atomic claims preserved; database rollback test verifies pending/accepted/declined/cancelled ownership, receiver authority and safely replayed commands; manager reason required |
| L10–L12 | Overnight/freshness projection tests, dated workbook records, bounded refresh retaining known data, desktop and 390px browser checks with keyboard-capable dialogs |
| R01–R05 | Real read-only exact-date/person/title lookups, independent version paging, historical roster/expectation tests, drafts visibly separated from submissions |
| R06–R08 | Existing frozen revision snapshots retained, owner-at-event evidence tests, correction reasons and prior versions; late events do not mutate stored submissions |
| R09–R11 | Partial/unavailable source coverage, explicit archive failure/retry browser check, calendar/DST unit suite, idempotent rollback verification |
| R12–R14 | Existing source reconciliation retained, durable source links, self-versus-reviewer authorization and exact-person/day board links |

The focused regression run passed 266 tests across 34 files, including reporting, workbook, task status/assignment/acquisition, repair-order closure, service-document workflow and customer/internal procurement. This includes the new route-boundary tests. Scoped TypeScript and changed-file lint checks also passed. After the information-only clarification, 253 focused tests across 29 files passed, including the new read-only roster/detail, source-workbook read and Live-versus-Overview toolbar tests. The opt-in database test at `src/tests/integration/dispatch-team-database.test.ts` requires `RUN_DISPATCH_DB_VERIFICATION=true`, refuses remote database hosts, and rolls back all synthetic fixture records.

Browser checks used the real UI components with explicitly labeled sample responses, not a deployed authenticated session. They verified the read-only team roster and detail view, full saved workbook sections, archive error/retry recovery, and a 390px roster without horizontal page scrolling. Separate read-only checks used the actual local saved reports and confirmed all 59 versions and 95 existing focuses remained intact after rollback tests.

## Coverage limits

Historical task ownership cannot be inferred where older events lack owner-at-event metadata. Such events remain activity evidence and coverage remains Partial. Earlier saved workbook drafts retain their original sections; newly generated drafts include daily focuses. Existing drafts are never relabeled as staff submissions. Historical Live Board views show dated plans and links, not a replay of past task state.

Refresh runs every 15 seconds while visible and online; this is an interval, not a production latency measurement. The bounded query guards report oversized scopes explicitly. Full production navigation, deployment migration and live operational monitoring still require release verification.
