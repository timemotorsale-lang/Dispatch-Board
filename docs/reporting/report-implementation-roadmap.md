# Time Motor Sales Reporting Implementation Roadmap Draft

Prepared October 4, 2026. This roadmap turns the reporting design into one authorized implementation program executed through small verified stages. Use the [architecture](report-implementation-architecture.md), [milestone gates](report-implementation-milestones.md), and [execution prompt](report-implementation-prompt.md). No implementation is claimed by this document.

## Delivery objective

Deliver one Reports experience that connects live business facts, individual submissions, department reviews, immutable history, and authorized retrieval. Staff should review prepared content and submit without rebuilding their day. Managers should inspect and act without collecting spreadsheets or visiting each source console.

The single execution prompt authorizes the full program, not a single unreviewed change. Dependencies and tests determine execution order. A later stage cannot compensate for a failed earlier invariant.

## Stage order

| Stage | Milestones | Usable result | Dependency |
| --- | --- | --- | --- |
| Evidence and contracts | RPT-00 | Verified source map, reuse decisions, dependency and policy register | Current repository and approved design |
| Calendar and durable history | RPT-01, RPT-02 | Periods, expectations, canonical reports, retention-safe revisions | RPT-00 |
| Individual reporting | RPT-03 | Prepared daily report, autosave, explicit submission, personal retrieval | RPT-01 and RPT-02 |
| Manager workflow | RPT-04 | Review queue, returns, approval, corrections, submission tracker | RPT-03 |
| Period reporting | RPT-05 | Weekly/monthly summaries, optional obligations, department/leadership reviews | RPT-04 |
| Live operations | RPT-06 | Operations Brief, Inventory Aging, Recon Production and matching detail | RPT-00 and RPT-04 |
| Console coverage | RPT-07 | Remaining catalog adapters and business-specific detail/actions | RPT-05 and RPT-06 |
| Retrieval and controlled outputs | RPT-08 | Favorites, views, comparison, snapshots, controlled exports | RPT-05 through RPT-07 |
| Scheduling and reliability | RPT-09 | Secure delivery, reminders, catch-up and failure visibility | RPT-08 |
| Release verification | RPT-10 | Reconciled pilot, regression evidence, operations and rollback instructions | All earlier required gates |

Prefer implementing each milestone as a vertical slice across data, service, policy, route, UI, and meaningful tests. Pure calendar/calculation contracts may precede their consuming workflow. Avoid building all frontend screens first and leaving their data/security behavior for later.

## Scope discipline

The complete catalog remains in scope for source assessment and adapter implementation. A report with insufficient operational data must expose its documented limitation, with no invented values. A disabled report is not a completed supported report. Record blocked requirements separately and continue independent milestones where dependencies allow.

Adding unavailable operational histories, accounting integrations, payroll certification, a new marketing provider, a warehouse, or autonomous AI is not implied. Build only required local source integration inside established domain boundaries; log broader dependencies with business impact and the evidence needed to resolve them.

## Policy resolution

Use the operating rulebook defaults for deterministic development fixtures and draft configuration. Require confirmed policy for production expectations, retention enforcement, financial thresholds, and external distribution. Maintain a decision register with owner, proposed choice, implementation impact, activation effect, and status.

The agent should choose routine technical details and keep progressing. Request missing business policy only when needed to decide dependent behavior; do not repeatedly request permission to start the next already-authorized milestone. Continue unaffected work while an answer is pending.

## Checkpoints and resumption

Maintain docs/reporting/IMPLEMENTATION_STATUS.md during implementation. For each milestone, record status, actual files, source capabilities, migration notes, tests and results, unresolved defects, policy gates, and the next executable task. Preserve enough detail to resume after interruption without recreating accepted revisions, reapplying migrations, or repeating successful work.

Statuses: not started, in progress, verified, blocked by named dependency, or deferred outside scope. Completion requires evidence, not a percentage or a populated checklist. Review the actual diff at each checkpoint and retain unrelated user changes.

## Verification cadence

Run focused meaningful tests during each slice. At schema gates, validate Prisma and exercise additive migrations in a disposable database. At service gates, exercise real database constraints, transactions, authorization, retries, and concurrency. At UI gates, use the existing isolated browser-test runner and check desktop/mobile screenshots and primary actions.

Run the final required integration and regression suites, type checking, lint, schema validation, and build. Document environmental failures accurately. A missing database, blocked browser run, or failing required test is not a successful gate. Reuse passing evidence unless later changes invalidate it.

## Pilot and activation

First pilot should exercise a staff daily report, manager review, historical retrieval, weekly summary, and source-matched Inventory/Recon detail. Extend to remaining supported catalog reports after source reconciliation. Test permission loss, reviewer absence, source corrections, and job interruption before activation.

Default production behavior remains off for new obligations and outbound delivery until policy is confirmed. Implementation can still be ready and reviewable with passing local evidence and a documented activation checklist. Report code completeness, verification completeness, and production activation separately.

## Completion report

State implemented capabilities and unavailable sources; exact changed files and migrations; tests run with results; legacy compatibility evidence; active/draft policies; remaining external blockers; and how to try the local experience. Do not claim production readiness when activation policies or required verification remain unresolved.

Commit, push, merge, deployment, and production job activation are separate user-authorized operations. The implementation prompt below does not authorize them by default.
