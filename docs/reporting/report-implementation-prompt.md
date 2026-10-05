# Time Motor Sales Reporting Single Execution Prompt

This prompt authorizes implementation of the reporting program in sequential tested milestones. It is not a deployment, merge, push, production migration, or production policy activation authorization. The accompanying architecture and milestone documents describe targets, not pre-existing capabilities.

## Execution prompt

Implement the Time Motor Sales enterprise Reporting Console end to end on the reports-enterprise-design branch. Use the repository's actual current state, preserve unrelated work, and follow all applicable repository instructions and the Enterprise Optimization Constitution.

Read docs/reporting/report-catalog.md, report-operating-rulebook.md, report-console-design.md, report-implementation-architecture.md, report-implementation-roadmap.md, and report-implementation-milestones.md. Read the existing staff daily handoff, workbook reporting, carryover, authorization, inventory governance, controlled exports, worker/outbox, and test implementations before editing. Do not infer readiness from planning documents or model names.

This request authorizes all milestones RPT-00 through RPT-10. Execute them as dependency-ordered vertical slices, implementing and testing each slice before continuing. Do not stop after a plan, UI shell, daily-only workflow, or the first milestone. Routine implementation decisions and progressing to the next verified milestone do not need another permission request. Maintain concise progress updates and continue across context compaction from the recorded checkpoint.

Preserve existing design language and working routes. Deliver Overview, My Reports, Team Reports, and Library; individual daily/weekly/monthly generation and history; explicit submissions; manager review and corrections; departmental and leadership reports; calendar expectations and submission tracking; the catalog's supported live reports and record detail; views, snapshots, controlled exports; secure schedules and job failure handling; mobile and accessible execution.

Reuse existing staff submissions, workbook seeds/drafts, domain facts, policies, command/audit/outbox patterns, and controlled-export infrastructure. Establish one canonical submission identity and write path across legacy and new entry points. Preserve legacy history and carryover behavior. Implement additive schema changes and retention-safe historical references; use disposable databases for migration and integration tests. Never reset shared data, destructively rewrite history, invent historical source states, or create fake report values.

Keep business rules server-side. Implement deterministic period boundaries, scoped calculations, stable deduplication, historical attribution, explicit numerators/denominators, evidence snapshots, source quality, optimistic concurrency, idempotent commands, and immutable submitted revisions. Enforce authorization before aggregation, record detail, search, cache use, export, and every recipient delivery. Prevent self-approval by default and preserve accepted history during corrections. AI is not required; authoritative calculations and sensitive assessments must not depend on generated prose.

Use proposed calendar and role defaults only for draft configuration and test fixtures until business owners confirm activation. New obligations, reminders, retention enforcement, and external distribution must not activate silently. Resolve routine technical decisions autonomously. Ask for missing business policy only when it blocks dependent behavior, while continuing independent work. Existing domain policy governs financial, personnel, and operational actions; do not expand authority through reporting.

For every catalog report, verify the required source fields and histories. Implement supported adapters and document limitations visibly. If a required source capability is absent, do not build an unrelated subsystem or claim the report is complete. Record the exact dependency, continue unaffected milestones, and distinguish blocked functionality from verified functionality in the final report.

Create and maintain docs/reporting/IMPLEMENTATION_STATUS.md with milestone status, decisions, files, migration/reconciliation evidence, actual test results, unresolved blockers, policy activation state, and next executable task. Record named dependencies rather than vague percentages. Preserve a resumable checkpoint if an external prerequisite or execution limit prevents completion; do not promise a one-turn guarantee or mark incomplete work complete.

Follow every milestone gate in report-implementation-milestones.md. Run meaningful unit tests, real disposable-database migration/transaction/concurrency/authorization tests, affected legacy and domain regressions, and browser journeys with the existing isolated runner. Include interrupted saves/submissions, duplicate delivery triggers, correction history, permission revocation, daylight-saving and overnight periods, weighted rates, snapshot stock, missing sources, and source-to-detail reconciliation.

Complete required schema validation, type checking, lint, unit/regression tests, build, and appropriate browser tests. Inspect desktop/mobile screenshots, keyboard/focus behavior, labels, text fit, and action visibility. A blocked test is not a pass; report the environment and unresolved verification honestly. Do not bypass tests, weaken policies, delete failing tests, or change unrelated configuration merely to finish. Reuse prior passing evidence unless changes invalidate it.

Start the implemented app locally on an available port and provide the URL. Report supported and unavailable capabilities, exact changed files and migrations, legacy compatibility, test results, outstanding policy decisions, operational safeguards, and rollback instructions. Separate code completion, verified release readiness, and production activation.

Leave changes reviewable on reports-enterprise-design. Do not commit, push, merge, deploy, apply production migrations, or enable production obligations/outbound delivery unless separately authorized by the user.
