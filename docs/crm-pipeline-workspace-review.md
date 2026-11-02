# Connected pipeline workspaces — local review

These enhancements are for review on `codex/enterprise-general-refinement`. Open `/crm-next/pipeline` in the local application. They share the existing authorized opportunities, customer links, tasks, deals, audit history, and internal recovery worker. No production deployment, customer messaging, or automatic enrollment is activated.

## Review the four workspaces

1. **Leads:** compact inbox with source, received date, owner, temperature, next activity, and per-row actions. The blue dot means no inquiry review has been recorded. Mark inquiry reviewed persists its timestamp and audit trail. All, unreviewed, assigned, awaiting response, qualified, nurture, and archived queues operate on the shared authorized/filter scope. Qualification retains the same opportunity. Existing unlinked customer leads retain their separate adoption/review section.
2. **Pipeline → Board:** separate operational lenses for Sales & leasing, Repairs, Rentals/loaners/test drives, and Sold fulfillment. Lane headers show counts, known estimated totals, and unknown-value coverage. Cards open the existing next-action panel. Lanes scroll independently, and the list remains the keyboard-accessible alternative. Repair and vehicle-use columns describe opportunity progress; they do not invent execution or checkout evidence. Sold fulfillment uses actual packet state for pending, complete, and unwind review. Actual sale and financial actions remain in the existing deal workspace.
3. **Automation:** a template library and connected Trigger → Conditions → Internal actions → Completion/recovery canvas. Authorized managers can save a new version containing 2–8 internal task labels and a reason. Saving does not activate a workflow or alter existing enrollments. New manual enrollments pin the latest saved version; existing enrollments retain their original steps and version. The execution table opens the selected opportunity's sequence and history. Retry handling, recovery, configuration and imports remain available in the expandable operational section. Trigger and eligibility conditions are governed existing rules, not freely editable send/provider logic.
4. **Insights:** clickable cards and bars for intake, distinct linked sales, estimated open pipeline, attention items, stage distribution, activities, sources and owner workload. Clicking opens the exact matching authorized records with a drilldown banner. Clear the banner to return to the shared period filters. Changing the primary search/owner/period/pathway fields clears the selection. Stage distribution is labeled as current cohort status; it is not represented as a historical conversion funnel.

## Operating routines and preferences

The Operating routines menu provides My work today, Manager daily review, Close this week, Month review, and Use this as my start view. Managers initially land on team Insights; staff initially land on their Activities. A saved personal start view overrides that default on the same browser. Preferences do not broaden server authorization. Search, owner, pathway, period and list/board settings remain shared between workspaces.

## Security and persistence

Inquiry reviews use the existing transaction, version, idempotency, audit and outbox command path. Template versions use the existing enterprise command ledger and audit store, with an organization/template lock, manager authorization, expected version checks, conflicting-key rejection and retry replay. No additional database migration is needed for this enhancement. Task skips use the exact pinned task ID, including when custom steps share labels.

Charts and exports use loaded authorized records, with unknown amounts preserved. Saved templates and history are organization-scoped; the template library returns the latest 100 saved versions across the seven templates. Unsaved template edits remain intact on failed saves and require confirmation before switching away.

## Validation

The focused suite passed 51 pipeline/calendar/route/reporting, deal lifecycle, opportunity validation and forecast tests. The isolated PostgreSQL scenario checks recorded inquiry review, manager-only template editing, stale-version rejection, idempotent replay, conflicting payload rejection, template history, and unchanged previously pinned enrollments. The browser walkthrough checks inbox review, exact-record Insights drilldowns, operational board switching, template saving, and the existing capture/retry, outcome, forecast, bulk, import-recovery and mobile workflows. Screenshots use only synthetic test records.

Review the look and staff interactions locally before approving adoption. Scheduled recovery, approved business calendars, customer-message providers, and full historical warehouse reporting retain the configuration boundaries documented in `crm-pipeline-implementation.md`.
