# Time Motor Sales Reporting Console Design Draft

Prepared October 4, 2026. This specification defines the proposed screens, interactions, retrieval, and release acceptance criteria for the Reporting Console. It uses [the report catalog](report-catalog.md) and [the operating rulebook](report-operating-rulebook.md). No application code is included.

## Product goal

Employees should review work already captured and submit a useful account of their period. Managers should find missing submissions, inspect outcomes and exceptions, and make decisions. Leadership should see reliable measures and retrieve what was known and approved at a past cutoff.

Keep the existing enterprise design language. Use compact headers, persistent filter bars, readable tables, restrained charts, familiar icons with accessible labels, and clear primary actions. Operational sections are unframed layouts; technical metadata belongs in report details rather than introductory copy.

## Navigation

| View | Content | Default primary action |
| --- | --- | --- |
| Overview | Role-relevant performance, material exceptions, pending reports and reviews | Open highest-priority relevant work |
| My Reports | Current expected report, drafts, due periods, personal archive | Review draft; Submit within the report |
| Team Reports | Review queue, submission tracker, authorized team history | Review next submission |
| Library | Live reports, published snapshots, favorites, recent views, search | Open report |

Schedules are managed through Schedule on a report and a Scheduled deliveries list in the Library. Definition and policy administration belongs in authorized administration, with a route from Reports for permitted users. Avoid a separate top-level tab for every department.

## Console entry behavior

Each working console provides Reports with the current business area and authorized location preselected. A vehicle or repair-order context may be carried as a visible filter. Users can clear that filter and return to broader reports. Central entry uses the role's saved defaults.

Use one shared report identity and definition whether entered from Sales, Inventory, Shop, or the central Library. Report selection runs with sensible defaults immediately; preserve its visible date basis and cutoff. Filtering does not require an initial wizard.

## Overview screen

The header contains Reports, a location selector, period selector, and freshness status. A compact row presents at most four to six role-relevant measures. The main region contains a useful trend and an exception table with owner, subject, reason, due time, and next action. A smaller section lists reports due or awaiting review.

Selecting a measure opens its contributing records with the same filter context. The return path restores the report, filters, sorting, and scroll position. Zero means a confirmed zero; no access, missing data, loading, and no qualifying records have distinct states.

## My Reports screen

Show the current obligation first with its covered period, due time, and status. Below it, show a compact history table grouped by month. Frequency is a segmented Daily, Weekly, Monthly control, with All available in archive filtering. The employee sees their own context without needing to select themselves.

Opening a draft shows prepared outcomes, blockers, commitments, and carryover. Relevant sections are expanded; irrelevant empty sections are omitted. Provide fields for brief context, support needed, and next-period priorities. Mark user-entered observations separately from verified facts when needed.

Submit is the single dominant action. Save is automatic with Saving, Saved, and Could not save states. Refresh source material is secondary and must reconcile changes without discarding edits. Review required fields inline; preserve the draft on errors. Do not disable submission solely because an optional source is unavailable; indicate incomplete coverage and apply the definition's explicit blocking rules.

After submission, show confirmation, submitted time, reviewer, and a View submitted report action. A repeated click cannot produce two reports. Browser interruption must leave the user able to determine whether submission succeeded.

## Team Reports screen

Provide Review queue, Submission tracker, and History as internal views. Default to actionable reviews for the signed-in manager.

The queue shows person or department, frequency, covered period, submitted time, lateness, revision, and material exceptions. Opening a report displays the frozen submission, supporting facts, and earlier revisions when permitted. Approve is primary; Return requires a reason. Record assignment of follow-up work separately from approval.

The tracker shows expected versus submitted reports by person and period. Distinguish no submission, overdue draft, awaiting review, approved, excused, and not required using text as well as color. The manager can inspect why an obligation exists and who can excuse it. Submission percentage uses only required, non-excused obligations, not team headcount.

Do not initially provide blind bulk approval. Batch reminders and authorized downloads may be available; each report still receives an explicit review. Confidential coaching notes remain separate from the employee-visible return comment.

## Library and archive retrieval

The Library contains a searchable table of definitions with name, business area, intended question, favorite, and freshness where relevant. Use Favorites, Recent, and All views. Saved personal views specify filters and columns; authorized team views use the same base definition.

Archive retrieval filters are report family, business area, person/department, location, Daily/Weekly/Monthly, covered period, and lifecycle status. Provide submission-date filtering as an advanced option; period remains the default. Only authorized names and records are searchable.

An employee history groups daily and weekly reports beneath the covered month. Calendar weeks crossing months retain their real coverage and one stable report identity; a weekly report may be linked from both months without being duplicated. If no monthly individual submission is required, label the generated monthly summary accordingly.

Opening a saved report shows the accepted revision by default, with its original cutoff and source coverage. A version selector exposes authorized prior submissions and review history. Links to contributing reports and records keep the selected period context.

Compare supports two compatible periods or accepted revisions. Show differences in measures and narrative, identify changed definitions, and warn when periods are partial or not comparable. It must not silently compare different currencies, eligibility rules, or location scopes.

## Report detail and actions

| Action | Behavior |
| --- | --- |
| Inspect records | Open authorized contributing rows with exclusions and missing-data counts available |
| Open record | Enter existing business workflow; preserve a report return link |
| Assign follow-up | Use the existing task workflow and permissions; record the source report reference |
| Save view | Name a personal filter/column configuration; team sharing requires permission |
| Export | Apply current filters, field authorization, and controlled-export policy; show progress for background jobs |
| Schedule | Reuse current definition and filters; choose frequency, time, timezone, recipient, and permitted format |
| About this report | Show business definition, date basis, source coverage, calculation version, and owner |

For schedules, distinguish a rolling period such as previous completed week from a fixed historical period. Show the next covered period and execution time before saving. A delivery schedule is independent from an employee submission obligation and does not submit or approve a report.

## Mobile and accessibility

Use a compact summary and row list on phones. Filters open in a focused sheet with Apply and Clear. Review sections stack vertically; the Submit or Approve action remains visible without covering content. Detailed metric tables can scroll horizontally where comparison requires it, with identifying columns retained when practical.

All controls support keyboard use, focus visibility, screen-reader names, and non-color status labels. Focus returns predictably when a filter sheet or confirmation closes. Pending actions announce progress; errors identify the affected field or action. Avoid hover-only access to essential definitions or actions.

## Required states

| State | User-facing behavior |
| --- | --- |
| First use | Open relevant available reports and the current required draft; no mandatory personalization wizard |
| No qualifying records | Show a confirmed empty result for the selected scope and period |
| Missing source | Name the missing coverage and preserve other valid sections |
| Stale result | Display the last successful cutoff and offer retry |
| No permission | Explain the unavailable action without exposing restricted data |
| Unsaved changes | Retain edits and clearly indicate save failure; prevent accidental silent loss |
| Source changed | Offer reviewed incorporation into the draft; submitted revisions remain frozen |
| Concurrent review | Explain that the revision changed; reload before approving |
| Submission uncertain | Check the existing submission result before offering a safe retry |
| Delivery failure | Show failure and retry in Scheduled deliveries; retain successful submission status |
| Definition changed | Identify version and comparability limits for historical reports |

## Worked example

A technician completes two repair jobs on Monday, records a parts blocker, and updates a promised finish time. Their prepared daily report contains the two outcomes, the blocker linked to its order and repair order, and the changed commitment. The technician adds context and selects Submit.

The supervisor receives one report to review and can open the blocked order or create follow-up. Approval preserves the Monday submission. The blocker is still unresolved on Tuesday, so Tuesday shows its current age as carryover without treating it as a new blocker event. Friday completion closes it in source work; the weekly report shows one blocker episode and its total eligible waiting time.

The technician retrieves Monday's original report from My Reports even after the blocker resolves. The weekly report links to Monday's submission and the current source record, clearly distinguishing historical evidence from current state.

## Acceptance criteria

| Area | Evidence required before release |
| --- | --- |
| Simplicity | A valid prepared daily report can be opened, reviewed, and submitted without navigating to each source console |
| Console consistency | The same report entered from a working console and the Library produces identical authorized results for identical filters |
| Retrieval | Find a named employee's daily, weekly, and monthly history by covered period, including inactive employees under authorized scope |
| Calendar | Verify holidays, overnight shifts, daylight-saving changes, partial assignments, leave, and moved deadlines |
| Obligations | Generated summaries do not become missing submissions unless an explicit expectation requires them |
| History | A source edit after submission leaves the saved report unchanged; a correction creates an auditable revision |
| Aggregation | Duplicate events, reopened tasks, daily stock counts, and unequal-denominator rates produce the specified results |
| Cohorts | Conversion and quality reports expose their observation windows and incomplete outcomes |
| Reconciliation | Every metric matches its eligible contributing records and explains exclusions |
| Access | Unauthorized records and sensitive fields remain unavailable in summaries, details, search, exports, and deliveries |
| Review | Self-approval is prevented by default; delegated review and revision conflicts behave as specified |
| Reliability | Autosave, submission, export, and scheduled delivery recover safely from retries and interrupted connections |
| Mobile | Employees and reviewers can complete primary flows on narrow screens without overlapping controls or obscured content |
| Accessibility | Keyboard and screen-reader checks cover filters, record detail, submission, return, and confirmation |
| Performance | Proposed targets under an agreed load: first useful cached report within 2 seconds; normal filter response within 3 seconds; larger work acknowledged promptly and processed in background |

Performance targets are design goals requiring dataset and infrastructure measurement, not current measured behavior. Visual and interaction validation occurs when the implementation exists.

## Development sequence after design review

1. Validate source contracts, report identities, calendar choices, authority mapping, and retention policy for the first reports.
2. Implement period expectations, draft persistence, versioned submission/review, and authorized archive retrieval.
3. Deliver My Reports and Team Reports for the individual daily report, including mobile execution and interruption recovery.
4. Connect Daily Operations Brief, Inventory Aging, and Recon Production after reconciliation tests pass.
5. Add weekly/monthly summaries, department reviews, snapshots, saved views, and permitted schedules.
6. Expand the catalog only after each domain's definitions and data quality pass review.

The first release should establish the complete reporting lifecycle, not merely another dashboard. Business policy review remains necessary before enforcing the proposed calendar or submission obligations.
