# Pipeline implementation checklist

The authoritative architecture is the Time Motor Sales Pipeline Implementation Architecture dated November 1, 2026. This implementation extends existing canonical opportunities, customer leads, tasks, deals, audit and outbox records.

- [x] Shared date periods and explicit date basis, including old cohorts and overdue carry-forward.
- [x] Additive operational metadata, durable intake receipts, exceptions and sequence enrollments.
- [x] Authorized query and retry-safe commands with audit and durable events.
- [x] Compact Leads, Pipeline, Activities, Insights and Automation views with Up next.
- [x] Intake and import replay, ownership handoff, dated follow-up and disposition controls.
- [x] Sequence processing, reconciliation, worker health and recovery.
- [x] Existing-deal conversion and sold/document workflow continuity.
- [x] Focused tests, database proof, browser walkthrough and operating instructions.

No production deployment or outbound communications are authorized by this implementation.

## Entry point and record ownership

Open `/crm-next/pipeline`. The existing CRM Next access policy and active organization grants apply. Managers can review authorized organization records; staff see owned opportunities or pending handoffs only when customer access also permits them. Counts, customer matching, imports, history and recovery remain scoped. Disabled owners never cause intake to be discarded: capture falls back to Intake manager responsibility.

The canonical records remain `UnifiedCrmOpportunityRecord`, `CustomerLead`, `Customer`, `Task`, `DealDeskDraft`, and their existing links. The four new tables store operational state, source receipts, persistent exceptions and sequence enrollment. Composite foreign keys prevent cross-organization opportunity links. Receipt and command uniqueness plus subject/source advisory locks prevent duplicate intake and conversion effects.

## Rollout configuration

1. Generate the Prisma client from the updated schema in a clean release environment. A running Windows process may lock the existing engine DLL; local validation confirmed the refreshed client delegates, but a clean release generation is still required.
2. Apply `20261101170000_crm_pipeline_operations` through the normal production migration release process. The additive update was applied to the verified local development database to resolve its missing-table failure. The same SQL was independently tested in a separate empty local schema, then that proof schema was removed. Production was not migrated.
3. Keep existing `CRM_NEXT` access configuration. Set `CRM_PIPELINE_OPERATIONS=OFF` to pause this workspace, or `READ_ONLY` for review without commands. Unset the flag to permit existing authorized CRM mutations. These flags do not enable an otherwise disabled CRM Next workspace.
4. Review the initial policy values below and configure an authorized manager account in `CRM_PIPELINE_WORKER_EMAIL`.
5. Schedule `npm run pipeline:worker` approximately every five minutes through the deployment's existing job runner. This code does not create a scheduled job or activate outbound communication. Do not run overlapping release deployments without normal database migration coordination.

| Setting | Default | Clock |
| --- | --- | --- |
| CRM_PIPELINE_ASSIGNMENT_MINUTES | 15 | Calendar minutes |
| CRM_PIPELINE_RESPONSE_MINUTES | 30 | Calendar minutes |
| CRM_PIPELINE_HANDOFF_MINUTES | 120 | Calendar minutes |
| CRM_PIPELINE_STALLED_DAYS | 14 | Calendar days |

The store boundaries are America/Chicago, with Monday as the week start. The application does not claim these targets are business-hour SLAs. Holiday-aware business-calendar enforcement requires approved store calendar configuration and a separate integration decision. Invalid policy numbers fall back to the documented defaults.

## Staff workflow

Capture an inquiry, optionally link a verified existing customer, and record its source and stable reference. Possible matches are suggestions; matching a name or phone never merges identities. Unverified contact information remains preserved in the receipt and visible to the authorized owner for review. Use CSV import for batches of up to 25 records with Name, Source, Reference, Phone, Email and Vehicle columns. Retrying a batch retains per-row source and request keys; inspect partial results rather than creating replacement references.

Import input is journaled before row processing. Unresolved batches remain available in Automation after closing the browser. Authorized staff can correct failed rows with a reason and retry; successful rows keep their original result. A short processing lease prevents simultaneous corrections, and recovery checks committed row commands before attempting their effects again.

Use a work view and explicit date basis. Today, yesterday, this/last week, two weeks ago, two completed weeks, this/last month, rolling completed 14 days and custom periods use half-open store-calendar boundaries. Current due queues retain overdue and undated work. Unknown estimated values are displayed as unknown and excluded from estimated totals. A personal saved view stores filters only on that browser under the staff account key.

Select a row to record an outcome and next dated action, inspect change history, change stage, update closing plans, manage a relationship review, or handle a sequence. Required task checklists and manager approval cannot be bypassed from this panel. Bulk follow-ups and ownership requests require a preview and use separate permission, version and retry checks per record. Do-not-contact prevents outreach outcomes and sequence activation; existing work is blocked for review and a separate internal review remains assigned.

Ownership transfers are requested and then accepted. The original owner remains responsible until acceptance. The receiving staff member must have customer access. Transfer a linked deal through the existing Deals manager controls before transferring its opportunity to a different owner.

Conversion preserves an exact link to one deal and uses the existing desk snapshot and continuity context. If the customer already has accessible deals, explicitly select one or confirm a separate transaction with a reason. Continue the linked deal to mark it sold, generate/preview packets, review paperwork, funding, delivery or returns. Recovery observes the recorded sale and moves the sales opportunity to Won while creating an assigned paperwork/fulfillment review. Remaining tasks remain visible; an opportunity outcome does not erase them. Financial adjustments continue through the existing governed Deals workflows.

## Internal sequences and recovery

Seven versioned templates cover inquiry, no response, appointments, no-show recovery, quotes, paperwork and post-delivery support. Enrollments pin the step list and template version. Current internal tasks are created once under a subject lock. Recording the outcome of the corresponding current task advances the enrollment once. Pause and resume require a reason and review time; skipped steps are represented by a reasoned outcome, not an invented customer response.

Inbound customer interactions pause active outreach-oriented follow-up for owner review. Because older interactions may be customer-linked rather than opportunity-linked, the conservative behavior is to pause for review instead of guessing which opportunity a reply concerns. An internal or contact outcome records the review watermark so the same old reply does not repeatedly pause reviewed work. Lost, archived and contact-suppressed relationships stop or pause applicable enrollment. No message provider, automated send, dialer or AI model is activated.

Run recovery from Automation for authorized manager review, or use the scheduled worker. The worker handles batches with a cursor so a failed record does not stop unrelated records. It respects retry delays, holds exhausted outbox records as dead letters, and returns a failing process status when a sweep encounters errors. `npm run pipeline:worker -- --retry-failed` is an explicit recovery action after correcting the underlying issue. Replays retain the same business links and do not create duplicate sequence tasks.

Monitor pending/dead-letter counts, oldest pending time, last successful sweep, assigned exceptions and their review deadlines. A missing or stale sweep is displayed as a warning. Deployment job monitoring must also monitor worker exit status and absence of scheduled runs; this implementation does not install external alert delivery.

## Historical reporting and capacity boundaries

Inspection retains old/new values, actor, reason, time and closing-date push count. Exception opening and resolution are appended to audit history. The default read loads up to 250 opportunities and 500 legacy leads at a time; Load older continues authorized pages. Refresh reauthorizes the loaded pages rather than retaining stale permission results. Summary counts explicitly cover the loaded workspace and may overlap. They are not claimed as a warehouse-wide census.

Current cohort results and recorded period-end closing plans are separate views. A plan is reconstructed only where supported by recorded history; unknown historic plans are excluded and disclosed. The initial UI returns bounded recent history and does not invent earlier stage, source or response timestamps. Complete audit records remain in the database. Full historical snapshots and warehouse-wide cohort analytics should use the existing reporting infrastructure with separately validated definitions before replacing these disclosed operational summaries.

Seller and manager judgments use the existing forecast API inside the selected opportunity panel. Stage baselines are labeled deterministic rules. Forecasts, actual sold dates, completion, receipts, refunds and reversals remain separate. Optional AI assistance and outbound providers are explicitly reported as unconfigured rather than simulated.

## Verification and release evidence

Calendar/queue tests cover every preset, Chicago spring/fall DST, year rollover, leap day, midnight exclusion, unknown dates, overdue carry-forward, recorded closing plans and post-sale remaining work. Route tests cover origin/host validation, oversized inputs, separate matching, partial import results and per-record bulk keys/version checks.

The isolated PostgreSQL proof exercises concurrent intake replay, conflicting key reuse, customer/owner authorization, task completion with next action, stale versions, null amounts, sequence task deduplication, concurrent deal conversion, shared continuity context, repeated Mark sold, sold-versus-paperwork separation, accepted handoff, do-not-contact and unavailable-owner fallback. An independent proof applied the actual additive SQL migration to the committed base schema before running the database workflow.

The browser proof uses only synthetic accounts and a dedicated test schema. It verifies failed-save form retention, stable retry keys, capture, outcome/follow-up, list/board filters, recovery and mobile overflow. Unrelated operating-rhythm notifications are isolated in that test. Existing production/customer data, external communications and real financial transactions are outside all verification runs.

Before production release, review the migration, generate a clean client, configure and monitor the worker, approve deadline policy and business-calendar behavior, run the normal deployment checks, and pilot with authorized staff. No deployment readiness claim is made solely from local checks.

Local development setup: the additive pipeline migration was applied to the verified loopback development database on November 1, 2026, and the development server restarted to load the updated generated client. The live development pipeline GET subsequently returned HTTP 200. Missing tables and stale clients now have separate actionable setup messages. No production database update or deployment was performed.

## Continuity evidence and remaining configuration

Recovery now checks replies even without an enrolled sequence, recorded EMAIL/TEXT failed/bounced/uncertain outcomes, exact linked appointments recorded NO_SHOW, and active customer communication restrictions. These create persistent assigned exceptions with review deadlines and audit transitions. Staff record a reasoned review and a dated next internal commitment; this does not change appointment attendance, confirm delivery, or clear a customer's channel restriction. Generic follow-up pauses on recorded replies, delivery uncertainty, and restrictions. Restricted-channel contact outcomes are rejected. The system does not infer delivery from a successful HTTP request or activate a provider.

Missing or malformed contact information remains a review item. First-response deadlines use the configured response target, with missing evidence disclosed. Three postponements without an outcome create a repeated-snooze exception. A first closing-date entry is not counted as a push; moving an existing date later is. Each outcome/review/reschedule remains audited.

On the first observed sale, recovery creates separate assigned review tasks for final signed documents, insurance, DMV/title paperwork, funding/payment evidence, and delivery obligations, alongside the existing general fulfillment review. The default review deadline is the next 24 calendar hours; it is not an invented customer promise or statutory deadline. Non-sale conversion creates a repair delivery-plan review or vehicle-return-plan review as appropriate. Existing deal checklists remain authoritative for completion and financial evidence. Worker replay does not duplicate these tasks.

Insights adds source performance, mean first-response time with evidence coverage, linked appointment/no-show counts, source cohorts, stage ages, and selected-versus-previous calendar windows. Sales are counted once by linked deal ID. Comparisons use the loaded authorized owner/pathway/search scope and independently recorded dates; current cohort outcomes are not presented as historical snapshots. Export visible rows respects the loaded query/filter scope and escapes spreadsheet formula prefixes. Bulk forms show exact frozen values; editing a form invalidates its preview. The inquiry dialog uses native modal keyboard/focus behavior.

Automatic worker scheduling, approved business/holiday calendars, provider callback ingestion, external alert delivery, complete warehouse snapshots, and optional AI integration remain deployment/configuration work. Calendar-time internal review and manual activity logging operate without these integrations. No outbound send button is enabled or simulated.

## Repeatable verification

Run `npm run test:pipeline-operations` with a generated Prisma client and loopback PostgreSQL development connection. The checked-in runner creates a random, empty `pipeline_it_` schema, applies the current model only there, exercises synthetic fixtures, and drops only that schema afterward. It refuses remote database hosts and never resets or pushes into the existing development schema. This runtime check is distinct from the separate additive-SQL migration proof described above.

The final focused regression run passed 48 tests across pipeline calendars/queues/routes/reporting, existing deal lifecycle, opportunity validation, and sales forecasting. The isolated database scenario additionally covers evidence review without enrollment, opt-out enforcement, inactive-owner queues, fulfillment task replay, and retained-import correction. Browser verification passed capture/retry retention, outcome/follow-up, forecast judgment, reviewed bulk tasks, export, period comparison, list/board views, retained CSV recovery, and mobile overflow. Repository type checking and focused linting passed. Scratch `work/` and `tmp/` trees are excluded from TypeScript compilation so unrelated test checkouts are not compiled as application source.
