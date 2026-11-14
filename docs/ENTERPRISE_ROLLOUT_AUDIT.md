# Enterprise rollout readiness audit

Scope: local preview worktree based on `codex/enterprise-general-refinement`, baseline commit `00ef9fce`, with refinements on the local `codex/enterprise-global-refinement-review` branch. No console has app-wide rollout signoff from this audit. Do not push or deploy this review work.

## Implemented layout changes

| Area | Implemented refinement |
| --- | --- |
| Shared shell and Dispatch | Wrapping header actions, separate navigation row, reduced header spacing, and responsive containment of search/notification controls. |
| CRM Next, Customers, Vendors | Compact search/action headers; responsive grids; preserved Customers & Vendors destinations; contained tables and contact text; keyboard focus indicators. |
| Inventory, repair workbench, Service, Parts, QC | Compact identity and action rows; wrapping search, status and concern text; responsive intake and queue layouts. |
| Diagnostics and Labor Guide | Reduced panel spacing; wrapping draft identity, totals, and controls; flexible catalog/editor grids; mobile review controls. |
| Sales, Rentals, BHPH, Reporting | Compact dedicated console styles, responsive forms and metrics, visible action columns through contained horizontal scrolling. Financial logic is unchanged. |
| Growth, Website, Manager, Time Attendance | Reduced excess spacing, wrapping navigation/actions, readable mobile record text and focus indicators. |
| Settings, Administration, Integrations, Activity | Native mobile settings disclosure preserving all destinations; wrapping operational tabs and Activity toolbar. |
| Documents, Capture, Money Resources, Compliance, Tasks | Mobile capture controls stack; finance controls retain touch targets; task metadata moves inline earlier on narrow screens. |

These changes preserve existing routes, server permissions, business transitions, historical records and production configuration. Printed service-document styling is outside this change. A shared stylesheet improvement does not constitute a full redesign or workflow certification of every subpage.

## Reproduce the review

- Worktree: `work/sidebar-review`, local branch `codex/enterprise-global-refinement-review`. This review has not been pushed or deployed.
- User preview: `http://localhost:3001/board`; the same server hosts `/crm-next`, `/customers`, `/reports`, `/settings`, and the other consoles.
- Local ignored `.env.local` enables `CRM_NEXT=REVIEW` for this preview only. The default-off production guard is unchanged.
- `scripts/run-e2e.mjs` now explicitly uses webpack, matching the local development runner and avoiding Turbopack's failure to resolve linked worktree dependencies.
- The new `enterprise-layout.spec.ts` uses an isolated `dispatch_board_e2e_...` schema, authenticated fixture users, and 1440/768/390px viewports. It rejects login and protected fallbacks and checks page overflow. Its Settings check exercises the mobile disclosure by keyboard.
- Run browser checks only against a disposable database. Existing workflow setup resets fixture records. Never point it at a production or historical-data database.
- Browser layout checks cover seeded landing pages; they do not certify populated workflows, payment processing, external providers, print output, screen-reader usability, or every nested route. A narrow viewport is a reflow check, not a substitute for actual browser zoom testing.

## Console review

| Console | Next enhancement and release evidence needed |
| --- | --- |
| Dispatch and Command Center | Keep exceptions and the next action above the fold. Review a populated board with blocked tasks, delayed updates, and pending approvals. |
| Tasks, Projects, My Tasks, and Manager Review | Keep queue filters and active assignments visible. Prove assignment, claiming, completion, and manager review in the browser. Existing daily workflow specs have skips. |
| Appointments | Keep the calendar dominant and actions near the date controls. Test booking, conflicting slots, edits, and recovery on desktop and phone. |
| Inventory and Vehicles | Keep vehicle identity, stage, and next action together. Prove intake, duplicate avoidance, history, and service handoff. |
| Service, Diagnostics, and Labor Guide | Keep repair-order identity and next action visible. Verify saved work retrieval, estimate corrections, authorization, and billing handoffs. |
| Parts and QC | Show the exact operational blocker and responsible role. Prove receipt through QC release with an enabled store, an older record, and a restricted staff role. |
| CRM and Customers | Clarify record search and relationship history. Verify intake, duplicate handling, customer navigation, and role boundaries. |
| Vendors | Keep Customers & Vendors as an entry point. Verify registry, purchase handoff, invoice reconciliation, and permissions. |
| Sales and Sales Documents | Keep deal changes and approval context visible. Verify saved deal retrieval, authorization, and exact document revisions. |
| Rentals | Prioritize active booking and custody. Prove activation, conflicting bookings, extensions, return, and retry persistence. |
| BHPH | Keep payment and exception status visible. Verify document generation, authorization, and ledger reconciliation on isolated fixtures. |
| Reporting and Insights | Keep filters and freshness visible. Verify role-scoped report access, export, and retry. Planned destinations need a separate release decision. |
| Growth and Website | Make publishing state and prerequisites visible. Verify preview, appointment intake, and external-provider failure recovery in a test environment. |
| Administration, Settings, Staff, and Integrations | Surface scope and effective access with each control. Verify direct-route denial, role changes, and rollout recovery. |
| Compliance and Money Resources | Prioritize outstanding obligations and approval state. Verify period close, audit history, and restricted financial access. |
| Time Attendance | Keep the current punch and exception state clear. Verify staff and manager corrections plus payroll handoff. |
| Documents, Activity, Capture, and Operations Coordinator | Keep search and recovery visible. Verify uploads, access denial, mobile capture, return navigation, and cross-team handoffs. |

## Rollout gates

Earlier baseline verification: 6,183 passed and 95 skipped in the full suite; the earlier focused navigation, Dispatch, and Appointments run passed 121 tests. Those results predate this application-wide layout pass and are not a rerun of the final change.

Current verification:

- Repository lint passed. `npx tsc --noEmit` passed. The normal `npm run typecheck` prerequisite could not regenerate the shared Prisma client because Windows denied access to the linked dependency folder; the existing generated client was used for direct typechecking and the build.
- Local production compilation, Next.js TypeScript checking, and static generation completed successfully with `npx next build --webpack`, using `.next-e2e/production` and the isolated local database connection. This was a build only, not a deployment.
- The lead's six shared shell, CRM access/page and Settings suites passed 61 tests. Independent focused suites for the other changed consoles passed; overlapping test counts are deliberately not added into one total.
- Initial browser workflow run, after fixing the startup problem: 6 passed, 13 failed, 15 skipped. Several failures stopped at stale login/landing assumptions or cold-route timeouts. Reporting setup was updated to accept the intended time-attendance landing and current filter entry points, without weakening workflow assertions. Existing skipped daily-workflow scenarios remain unverified.
- Final layout matrix: all 25 route checks passed, each at 1440, 768, and 390px (75 viewport checks). This includes route/fallback assertions and the mobile Settings keyboard disclosure. Final header and task-metadata accessibility adjustments also passed eight focused tests and targeted narrow-width checks. The preview CRM route returned HTTP 200 without the protected fallback.
- Reporting rerun with default write controls: 9 passed, 9 failed. Passing scenarios include Inventory navigation, preserved filters, calendar preview, frozen archive pagination, controlled exports, and saved favorites. Six failed scenarios encountered disabled inputs or HTTP 403 before completing their write assertions; report writes were not enabled in that test process. This does not demonstrate a defect in autosave or persistence. A separate isolated write-enabled run is recorded below.
- Two navigation assertions remain unresolved: the phone test requests a desktop-only Command Center link, and the Dispatch test expects Overview while the manager landing selects Team Reports. Another test failed to establish its operating-rhythm fixture. These require test-contract/fixture review, not permission bypasses.
- Follow-up with `REPORTING_WRITES_ENABLED=true` in the disposable test process: 3 passed, 4 failed across seven write scenarios. Autosave interruption/recovery, monthly identity/stale-draft rejection, and transaction rollback on audit/outbox failures passed. The four remaining failures are listed below. The earlier monthly fixture failure did not recur. Counts from separate runs are not an aggregate full-suite result.

### Reporting follow-up findings

1. **Coverage navigation contract:** the accessible action promises reporting history, but the visible Open day action opens detail without selecting Person or archive dates. Preserve Open day and add a distinct View reporting history action using the existing guarded navigation. Verify selected person, inclusive period dates, URL, reload/back restoration, and restricted-role denial.
2. **Weekly review visibility:** submission, duplicate protection, review conflict handling, and immutable revision checks complete; the final APPROVED label is not visible in Team Reports. Verify that the test selects the historical period it created before concluding a rendering defect.
3. **Daily carryover reconciliation:** daily submission still returns HTTP 403 with report writes enabled. Trace the remaining daily-handoff prerequisites and role checks; do not relax authorization to satisfy the test.
4. **Daily correction workflow:** draft saving proceeds, but submission returns HTTP 403 and the expected success message never appears. The subsequent historical-correction assertions remain unverified.

The write flag was scoped to the test process; it was not enabled in production or persisted into the user preview. These results do not certify every workflow. Existing 15 skipped daily-workflow scenarios, external integrations, populated cross-console handoffs, and role-by-role review remain release evidence gaps.

Use a disposable local database when reproducing (PowerShell):

```powershell
$env:DATABASE_URL = 'postgresql://postgres@127.0.0.1:55439/postgres'
$env:CRM_NEXT = 'REVIEW'
$env:REPORTING_WRITES_ENABLED = 'true' # Disposable workflow test process only.
$env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:3103'
$env:E2E_NEXT_DIST_DIR = '.next-layout-check'
npm run test:e2e -- enterprise-layout.spec.ts reporting-console.spec.ts --output=test-results/enterprise-final
```

The runner creates a fresh schema when `E2E_DATABASE_URL` and `E2E_DATABASE_SCHEMA` are unset. Confirm the database is disposable before using this command; the address above is specific to this review environment.

1. Verify the populated Dispatch Overview and Appointments pilot at desktop and phone widths, with keyboard navigation and browser zoom. Compare how quickly staff can identify the next action.
2. Verify each critical workflow under its allowed and restricted roles using isolated records. Record tested revision, fixtures, and outcomes. Report skipped cases separately.
3. Promote only the layout patterns that work across the two pilots. Dedicated console layouts retain their hierarchy and require their own visual review.
