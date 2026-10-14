# Inventory Lifecycle Control Tower Contract

**Product:** Time Motor Sales Dispatch Board  
**Module:** Inventory Console → Inventory Lifecycle  
**Version:** 0.1 planning baseline  
**Date:** 2026-07-18  
**Status:** Documentation and product review only; no implementation is authorized by this contract  
**Planning branch:** `codex/inventory-lifecycle-control-tower-contract`  
**Default landing-page source:** [`INVENTORY_CONSOLE_LANDING_PAGES_UI_SOURCE_OF_TRUTH.md`](INVENTORY_CONSOLE_LANDING_PAGES_UI_SOURCE_OF_TRUTH.md)  
**Detailed Control Tower source:** [`INVENTORY_CONSOLE_UI_SOURCE_OF_TRUTH.md`](INVENTORY_CONSOLE_UI_SOURCE_OF_TRUTH.md)  
**Inventory Lifecycle plan:** [`INVENTORY_LIFECYCLE_WORKSPACE_IMPLEMENTATION_PLAN.md`](INVENTORY_LIFECYCLE_WORKSPACE_IMPLEMENTATION_PLAN.md)  
**KPI catalog:** [`governance/VEHICLE_OPERATIONS_KPI_CATALOG.md`](governance/VEHICLE_OPERATIONS_KPI_CATALOG.md)  
**Algorithm baseline:** [`INVENTORY_OPTIMIZATION_ALGORITHMS.md`](INVENTORY_OPTIMIZATION_ALGORITHMS.md)

## 1. Purpose

This contract defines the authoritative projections, KPI envelopes, filters, queues, reviews, approvals, recommendations, selected-record context, freshness states, drill-throughs, and reconciliation behavior required to turn the approved Inventory Lifecycle experience into an enterprise operating control tower.

It does not define application code, database schema, endpoint routes, visual redesign, autonomous workflow execution, accounting posting, external adapters, or production activation.

## 2. Source hierarchy and composition

The following precedence resolves the two approved visual sources:

1. The newer Inventory Lifecycle landing-page source governs the **default page composition and navigation**.
2. The detailed Control Tower source governs the **deeper operating workspace**, including cross-lane dependencies and selected-asset command rail, where it does not conflict with the landing-page decision.
3. The KPI catalog, workflow catalogs, state/event records, authority policies, and source-of-truth matrices govern displayed facts and actions.

The default Inventory Lifecycle page must not restore the older ten-item module navigation bar. The approved global Inventory Console destinations remain binding. Acquisition, vehicles, recon, title, merchandising, aging, and exception populations are reached through pipeline stages, KPI drill-throughs, work queues, search, saved views, contextual actions, and deeper workbenches.

## 3. Product outcomes

The Control Tower must let authorized staff answer, without reconciling multiple screens manually:

- How many vehicles are in each lifecycle stage, and why?
- Which vehicles are blocked, overdue, waiting, stale, unowned, or at financial/customer risk?
- Which next actions are valid, who owns them, and when are they due?
- Which reviews and approvals need action, against which exact record/version?
- Which acquisition, recon, parts, title, merchandising, frontline, reservation, sale, delivery, or disposition dependency is controlling flow?
- Which KPI values are complete, partial, stale, insufficient, or unavailable, and what population produced them?
- Which recommendations are advisory, what evidence supports them, and what uncertainty remains?
- Which external requests have been acknowledged, rejected, timed out, mismatched, or reconciled?
- What changed, who acted, what policy/version applied, and what outcome followed?

## 4. Navigation and surface contract

### Default Inventory Lifecycle landing page

Required components:

- shared Inventory Console header, global search, permitted location scope, live-data state, alerts, help, and user controls;
- Inventory Lifecycle selected in the approved global navigation;
- compact scope/filter controls and saved views;
- interactive inventory KPI strip;
- retail lifecycle pipeline through `Sold / Wholesale / Transferred`, with delivery/reconciliation detail available through drill-through;
- bottleneck and aged-exposure visibility;
- priority work queue with owner, blocker, due state, value/customer impact, and next valid action;
- advisory disposition recommendations and **Open Disposition & Wholesale**;
- Reviews & Approvals with permission-aware counts and exact-version actions;
- lifecycle velocity, stage bottleneck, aging, exposure, disposition, sale/delivery, and data-health summaries;
- a solid primary **Open Control Tower** action immediately before the secondary **Open Disposition & Wholesale** action;
- View Event Log and role-aware **+ Start Workflow**.

### Landing-to-Control-Tower transition

The default connection is explicit and bidirectional:

```text
Inventory Console
  → Inventory Lifecycle
  → Inventory Lifecycle landing page
  → Open Control Tower
  → Detailed Inventory Lifecycle Control Tower
  → Back to Inventory Lifecycle
```

**Open Control Tower** preserves:

- organization and permitted location set;
- active filters, sort/group choices, and saved-view identity/version;
- business date, reporting period, and as-of cutoff;
- selected KPI, lifecycle stage, exception, work item, review/approval, or InventoryUnit where applicable;
- originating panel and scroll/focus return reference;
- permission-safe return context.

The deeper workspace shows the breadcrumb `Inventory Lifecycle > Control Tower` and a visible **Back to Inventory Lifecycle** action. Returning restores the originating landing-page state when it remains valid and permitted. If a saved view, filter, record, or permission changed, the landing page explains the adjustment instead of silently broadening scope or failing.

Contextual entry points supplement the header action:

| Landing-page action | Control Tower destination |
| --- | --- |
| Select **Open Control Tower** | Full detailed workspace under the current landing scope |
| Open a KPI population | Matching KPI drill-through with metric version, period, filters, and cutoff preserved |
| Open a lifecycle stage | Matching stage population and bottleneck context |
| Open a priority work item | Corresponding population with the InventoryUnit selected in the command rail/drawer |
| Open an exception | Exception population filtered by reason/severity with the source record selected |
| Open a review or approval analysis | Matching contextual population; the global Review/Approval detail remains the decision surface |
| Select **View full report/analysis** | Matching detailed analysis panel with landing context preserved |

Pipeline and KPI interactions may continue to filter the landing page for quick triage. Actions that navigate deeper must be labeled explicitly; staff must not be surprised by an unannounced page transition.

### Deeper Control Tower workspace

The deeper workspace may expose:

- Retail Inventory, Shop/Recon, and Repair Parts swimlanes with explicit cross-lane handoffs;
- expanded Flow Exceptions;
- capacity/readiness and capital/aging analysis;
- selected-asset command rail with lifecycle, work, parts, costs, blockers, recommendations, approvals, tasks, and audit context;
- links to Vehicle Workbench, Shop & Recon, Parts Operations, Disposition & Wholesale, Reviews, Approvals, and Event Log.

The deeper workspace must not create duplicate global navigation or become the default landing composition without explicit product approval.

## 5. Projection principles

- Projections are derived from authoritative records and accepted events; display-only state cannot advance a workflow.
- Each projection has an organization/location scope, projection version, event cutoff, calculated time, freshness status, lag, and reconciliation state.
- A single InventoryUnit appears once in mutually exclusive primary retail lifecycle stage counts at a given cutoff.
- A vehicle may have linked Shop/Recon and Parts dependencies, but those do not create duplicate retail inventory units or stage counts.
- Reversed, voided, duplicate, test, corrupt, or out-of-scope records are excluded with retained reason counts.
- Current facts, calculated values, estimates, predictions, recommendations, user-entered values, and external acknowledgements remain distinguishable.
- Currency is never aggregated across currencies without an approved conversion source and timestamp.
- Unknown, not applicable, zero, and unavailable are distinct states.
- Every aggregate supports a permission-equivalent drill-through population or a documented privacy exception.

## 6. Common response envelope

Every Control Tower read contract must return or make derivable:

```text
contractVersion
projectionVersion
catalogVersions
organizationId
locationIds
timeZone
scopeAndFilters
periodStart / periodEnd / cutoffAt
calculatedAt
freshnessStatus
projectionLagSeconds
dataQualityGrade
partialReasons
exclusionCounts
reconciliationStatus
permissionsApplied
traceOrCorrelationReference
```

Valid freshness and quality states:

- `COMPLETE`
- `PARTIAL`
- `STALE`
- `INSUFFICIENT`
- `NOT_APPLICABLE`
- `UNAVAILABLE`
- `RECONCILIATION_REQUIRED`

The UI must not present a numeric conclusion for insufficient evidence where the KPI or algorithm contract prohibits one.

## 7. Control Tower read models

### CT-01 — Scope and capability projection

**Purpose:** Establish the viewer’s permitted operating context before loading dependent panels.

**Required fields:** Organization, permitted locations, selected location set, time zone, business date/calendar, capabilities, field restrictions, enabled rollouts, permitted commands, available integrations, degraded/manual modes, and source freshness.

**Rules:** Requested locations outside authority are rejected, not silently included. Multi-location totals use only permitted records and show the exact location set.

### CT-02 — Inventory lifecycle summary

**Purpose:** Provide the page-level operating snapshot.

**Required fields:** Active InventoryUnits, stage counts, frontline/available/reserved/sold/delivery/disposition states, total capital/exposure, delayed/blocked/unowned/stale populations, pending reviews/approvals, critical exceptions, calculated time, freshness, quality, and drill-through queries.

**Reconciliation:** Active stage counts plus approved terminal/alternate classifications must reconcile to the scoped InventoryUnit population, with exclusions and unresolved classification shown separately.

### CT-03 — Lifecycle stage projection

**Purpose:** Drive the landing-page pipeline and deeper Retail swimlane.

**Required per stage:** Stable stage code/label/order, count, entered count, exited count, average/median/p90 stage age where sample permits, target, warning/critical bands, breached count, active/waiting/idle classification, capital exposure, owner coverage, blockers, next-action coverage, freshness, health, and drill-through.

**Primary lifecycle family:** Opportunity/Appraisal where separately scoped; Acquire; Transport/In Transit; Receive; Inspect; Recon; QC; Title/Documents; Merchandise/Price; Frontline; Available; Reserved/Deal Pending; Sold; Delivery; Delivered/Reconciled; and approved Disposition/Wholesale/Transferred exits.

Opportunity/Appraisal counts must not be included in owned-inventory totals before the authoritative acquisition boundary.

### CT-04 — Cross-lane dependency projection

**Purpose:** Explain how Shop/Recon and Parts affect an InventoryUnit without duplicating their systems of record.

**Required fields:** InventoryUnit/Vehicle, linked RepairOrder/RepairJobs, customer-versus-inventory origin, current Shop stage, authorization/QC state, linked demand/reservations/PO/receipts, parts-readiness state, controlling dependency, ETA range/confidence, owner, freshness, exceptions, and deep links.

**Rules:** Customer-owned repair work never enters Retail Inventory counts. Inventory recon returns to the approved retail stage only after authoritative QC/handoff evidence.

### CT-05 — Priority work projection

**Purpose:** Present one governed queue of actionable inventory work.

**Required fields:** Work/subject IDs, InventoryUnit/Vehicle, location, lifecycle stage, action code, hard-priority tier, advisory score when applicable, reason codes, blocker/dependency, stage and total age, target/due/escalation, accountable owner, collaborators, customer/financial/downstream impact, readiness, recommendation version/confidence/freshness, approval need, valid commands, and drill-through.

**Rules:** Safety, compliance, title/release, custody, customer-delivery, material financial, and missing-owner conditions outrank numeric scores. No duplicate active task may represent the same subject/action/reason/policy state.

### CT-06 — Exception projection

**Purpose:** Surface operational conditions requiring verification or resolution.

**Required fields:** Exception ID/type/severity/reason, source workflow/record/event, affected vehicle/unit/location, opened/updated/due/escalation times, owner, operational/customer/financial impact, evidence/freshness, retryability, required approval, resolution state, corrective reference, verification, and reopen history.

**States:** `OPEN`, `TRIAGED`, `ASSIGNED`, `IN_REVIEW`, `RESOLUTION_PROPOSED`, `APPROVAL_REQUIRED`, `RESOLVED`, `VERIFIED`, `CLOSED`, `ESCALATED`, `REOPENED`.

### CT-07 — Reviews projection

**Purpose:** Present work requiring human evaluation but not necessarily approval authority.

**Required fields:** Review ID/type, subject and record/version, request reason, evidence completeness/freshness, recommendation and alternatives, owner/reviewer eligibility, age/due/expiry, status, related tasks/exceptions, valid review actions, and return context.

**Rules:** Review completion never implies approval. A reviewer’s comments cannot mutate the underlying authoritative record silently.

### CT-08 — Approvals projection

**Purpose:** Present exact-version consequential decisions.

**Required fields:** Approval ID/type/status, subject, proposal/evidence/policy versions, requester, eligible approver roles, separation-of-duties result, amount/currency/quantity, delegated limit, consequence preview, warnings, age/due/expiry, decision/reason, material-change invalidation, and valid actions.

**Rules:** Counts include only decisions the viewer may see. Approve/reject/return actions remain server-authorized and fail closed on stale versions or changed authority.

### CT-09 — Recommendation projection

**Purpose:** Explain advisory next actions without implying execution.

**Required fields:** Recommendation ID/type/version, subject, generated/calculated time, freshness/expiry, eligible alternatives, selected recommendation, hard constraints, reason codes, input sources, assumptions, component factors, expected effects/ranges, confidence/uncertainty, missing evidence, policy/model versions, decision status, override reason, and outcome maturity.

**Display states:** `RECOMMENDED`, `REVIEW_REQUIRED`, `INSUFFICIENT_EVIDENCE`, `STALE`, `UNAVAILABLE`, `POLICY_BLOCKED`, `APPROVAL_REQUIRED`, `EXPIRED`.

### CT-10 — Capital and aging projection

**Purpose:** Show governed cost-of-time and portfolio exposure.

**Required fields:** InventoryUnit, financial acquisition time, total/stage/frontline/deal/delivery ages, active/waiting/idle time, policy bands, acquisition/recon/title/merchandising/carrying/committed/incurred/estimated/recovered amounts, actual-versus-estimate status, currency, source, confidence, calculation version, current exposure, trajectory/range, market/portfolio fit, and recommended review action.

**Rules:** Estimated exposure is never labeled as posted accounting value. Age alone never decides price or disposition.

### CT-11 — Selected-asset projection

**Purpose:** Populate the detailed command rail or selected-record panel.

**Required fields:** Vehicle identity/photo references, InventoryUnit, location/custody, lifecycle and Shop/Parts states, all relevant ages, costs/exposure, blockers, next-best action, recommendation explanation, readiness gates, linked tasks/reviews/approvals/exceptions, purchase orders/parts dependencies, customer/deal/delivery context where permitted, audit/event history, valid commands, deep links, freshness, and field-level restrictions.

**Rules:** Selection does not broaden permission. Restricted fields remain omitted or masked consistently with source records.

### CT-12 — Data and integration health projection

**Purpose:** Prevent authoritative-looking output when projections or sources are unhealthy.

**Required fields:** Projection/source/adapter, status, latest source event, latest applied event, lag, last successful calculation/sync, freshness threshold, rejected/dead-letter counts, conflict/mismatch counts, impacted panels/populations, manual/degraded path, owner, incident/exception link, and recovery state.

## 8. KPI contract

Every KPI uses the approved metric envelope:

```text
metricCode
catalogVersion
periodStart / periodEnd / cutoffAt
organizationId / locationIds / timeZone
value / unit / numerator / denominator / sampleSize
status
confidence
sourceProjectionVersion
exclusionCounts
drillThroughQuery
calculatedAt
```

### Initial Inventory Lifecycle KPI strip

| Display label | Governing metric or contract | Required qualification |
| --- | --- | --- |
| Active Inventory | `INV_ACTIVE_UNITS` | Current snapshot, stage reconciliation, exclusions visible |
| Inventory Capital | `INV_CAPITAL_EXPOSURE` | Currency and governed cost basis; missing/estimated values separated |
| Days to Frontline | `INV_DAYS_TO_FRONTLINE` | Median completed cohort; current WIP shown separately |
| Frontline Readiness | `INV_FRONTLINE_READINESS` | Checklist-backed gates; insufficient units separated |
| Aged Exposure | `INV_AGED_EXPOSURE` | Approved age band/policy version and currency |
| Stage Delays | `INV_STAGE_DELAY_RATE` | Applicable targets; missing-target population visible |
| Critical Exceptions | CT-06 hard-critical open population | Severity/reason contract and drill-through required |
| Pending Reviews / Approvals | CT-07 / CT-08 | Permission-scoped, exact records, no double counting |

The default landing page may show fewer compact KPI cards according to the approved image. Additional metrics belong in drill-throughs or configured views, not as uncontrolled new tabs or oversized cards.

### Supporting KPI families

- Retail lifecycle: average/median held, frontline target attainment, idle share, recon variance, turns, realized gross/day, disposition rate.
- Work governance: owner coverage, next-action coverage, blocker age, escalation reopen rate.
- Data/decision health: recommendation acceptance/override/outcome/error, required completeness, freshness, conflicts, duplicates, projection lag, job success.
- Cross-lane context: Shop cycle/QC/promise and Parts fill/backorder/supplier/credit measures only where they affect scoped InventoryUnits and remain clearly labeled as linked-domain metrics.

## 9. Time, clocks, targets, and health

### Clock definitions

The Control Tower must support acquisition, transit, intake, recon, parts wait, approval wait, title, merchandising, frontline, deal-pending, delivery, and total inventory age.

```text
Total Lifecycle Time = Current or Terminal Time − Lifecycle Start Time
Idle Time = Total Lifecycle Time − Active Work Time − Approved Waiting Time
Stage Delay Ratio = Actual Stage Duration / Applicable Stage Target
```

- Pauses require approved, versioned reasons, owner, start, review/expiry, and resume/closure evidence.
- Comments and routine status updates do not reset clocks.
- Targets are effective-dated policy records, not constants embedded in the UI.
- Initial 72/30/45 values remain proposed defaults until approved for an organization/location/cohort.
- Target changes do not silently rewrite historical snapshots.

### Health states

Hard-critical conditions override calculated health. Otherwise, health may use approved delay/exposure/blocker/ownership inputs and must expose reason codes.

Valid display states: `HEALTHY`, `WATCH`, `AT_RISK`, `CRITICAL`, `DISPOSITION_REVIEW`, `INSUFFICIENT`, and `STALE`.

## 10. Filters, saved views, search, and drill-through

### Filters

Supported dimensions include permitted organization/location set, inventory source/type, lifecycle stage, operating state, owner, blocker type/severity, review/approval type/status, age/target band, title/readiness, frontline/availability/reservation/sale/delivery/disposition state, customer/deal dependency, cost/exposure band, recommendation state, freshness/quality, and as-of/period window.

### Saved views

Each view retains owner, permitted sharing scope, name, description, contract version, filter/sort/group configuration, selected panels/columns, location policy, created/updated times, and last-valid state. Opening a shared view intersects its scope with the viewer’s current permissions.

Invalid, retired, or unauthorized filters are reported explicitly and removed only with user acknowledgement or versioned migration.

### Search

Search uses only supported authoritative identifiers: VIN/partial VIN subject to policy, stock/inventory number, vehicle attributes, external identity, customer/deal reference where permitted, RepairOrder/job, part/PO, task, review, approval, and exception references.

### Drill-through

Every aggregate action preserves location, filters, period/as-of cutoff, metric/stage/reason code, sort, selected record, and return context. Drill-through population must reconcile to its aggregate after permission and documented privacy exclusions.

## 11. Queue prioritization and next-best action

Eligibility and hard rules run before scoring. A planning next-action score may consider urgency, revenue/cost release, downstream unblocking, customer/delivery impact, confidence of benefit, work readiness, and effort efficiency.

The queue must expose:

- hard-priority tier separate from advisory score;
- top reason codes and failed gates;
- recommendation version, confidence, freshness, and expiry;
- owner eligibility and workload context;
- exact next valid command or evidence action;
- approval or separation-of-duties requirement;
- alternate actions and why they rank lower or are ineligible;
- manual override reason and immutable decision history.

The system never silently assigns, reprioritizes, advances a stage, approves, purchases, changes price, reserves, sells, delivers, transfers, or disposes.

## 12. Command and workflow-start integration

The Control Tower exposes commands only through the approved Workflow Launcher or contextual record actions.

Before command submission, the UI must:

1. refresh scope, capability, record version, and critical evidence;
2. validate current lifecycle state and allowed transition;
3. preview the exact affected record, quantities/amounts, state/custody/financial/customer effects, downstream work, warnings, and approval;
4. require reason/evidence where governed;
5. submit an idempotent command with optimistic version and correlation;
6. show accepted, approval-pending, conflict, rejected, retryable failure, unavailable, and duplicate-replay outcomes honestly;
7. return command ID, resulting state/version, tasks/approvals/events, unresolved exceptions, and refreshed projection status.

Projection lag after an accepted command must be visible. The UI must not resubmit merely because a read projection has not caught up.

## 13. Reviews and approvals interaction

- Reviews and approvals are distinct global destinations and contextual panels, not extra Inventory Lifecycle tabs.
- Pending counts reflect only visible, actionable records under the current permitted location scope.
- Direct landing-page actions open the exact record/version and preserve return context.
- Approval preview includes proposal/policy/evidence versions, amount/quantity, requester, approver eligibility, separation-of-duties, warnings, effects, and expiry.
- Material revision invalidates stale approval according to the governing workflow.
- Reject, return for revision, defer, expire, cancel, reassign, escalate, and reopen remain visible and attributable.
- A successful approval does not imply the downstream command, external acknowledgement, publication, sale, delivery, or settlement has completed.

## 14. Freshness, failure, and recovery

Each panel independently supports:

- initial loading and background refresh;
- empty eligible population;
- partial data with missing/exclusion counts;
- stale source or projection with last-good cutoff;
- insufficient evidence without numeric conclusion;
- unavailable dependency or integration;
- permission denied or field-restricted response;
- optimistic conflict and refresh/review path;
- retryable and final failure;
- projection lag after accepted command;
- reconciliation-required and mismatch states;
- manual/degraded workflow with owner and follow-up;
- recovery, replay, and verified resolution.

A panel failure does not blank unrelated healthy panels. The page-level data-health indicator summarizes impact and links to CT-12 evidence.

## 15. Authorization and privacy

- All reads are tenant- and location-scoped server-side.
- Aggregate counts must not reveal restricted records or sensitive-field existence through differencing without approved privacy controls.
- Drill-through permissions match or narrow the aggregate source population.
- Command visibility explains likely availability but server authorization remains decisive.
- Cost, gross, customer/deal, employee, title, payment/reference, legal/compliance, and audit fields follow explicit field-level policies.
- Exports preserve row/field permissions, scope, filter, cutoff, reason, watermarking where required, and audit evidence.
- Employee operating metrics require appropriate quality grade and work-class/context; they cannot autonomously discipline staff.

## 16. Reconciliation contract

Required reconciliation checks:

- scoped InventoryUnit total versus primary lifecycle/terminal/exception classifications;
- stage entry/exit/current counts versus immutable lifecycle events;
- active/waiting/idle intervals versus total lifecycle time;
- owner and next-action coverage versus active governed records;
- task/review/approval counts versus active source records without duplicate work;
- capital/exposure totals versus governed cost records and currency;
- Retail inventory recon links versus Shop/Parts dependencies without duplicate retail units;
- reservation/sale/delivery/disposition states versus custody/title/release and external handoffs;
- KPI drill-through population versus numerator/denominator/exclusions;
- source event checkpoint versus projection applied checkpoint and lag.

Material mismatches create owned exceptions. Restatement uses a separately identified projection or metric run; published history is not silently rewritten.

## 17. Performance, accessibility, and responsive targets

Targets require environment and pilot approval, but planning must define:

- bounded/paginated population reads and stable sorting;
- target first useful content, panel completion, interaction response, drill-through, search, command acknowledgement, and background-refresh times;
- peak concurrent users, multi-location volume, lifecycle event rate, saved-view complexity, and export bounds;
- keyboard access, logical focus order, visible focus, accessible names/descriptions, table and status semantics, non-color indicators, contrast, zoom/reflow, reduced motion, and screen-reader announcements for refresh/command results;
- desktop composition, tablet horizontal pipeline/drawer behavior, and mobile priority/actions-first vertical presentation;
- independent selected-asset drawer/rail scrolling without covering the primary workspace.

Performance degradation must not hide freshness, truncate silently, or substitute representative data.

## 18. Observability and support

For every projection and material interaction, define:

- request/trace/correlation, contract/projection/catalog/policy versions, scope, cutoff, calculation time, lag, and result status;
- latency, error, stale/partial/insufficient rate, reconciliation mismatches, dead letters/retries, permission denials, conflicts, and command-to-projection delay;
- owner, alert threshold, escalation, incident/runbook, manual fallback, recovery/replay, verification, and customer/staff communication where applicable;
- privacy-safe logs and metrics that do not expose restricted vehicle/customer/employee/financial data.

## 19. Planning decisions required

The **Open Control Tower** header action, its placement before **Open Disposition & Wholesale**, context preservation, breadcrumb, and visible return path were approved on 2026-07-18. Remaining planning decisions are:

- Approve the exact default landing-page KPI cards, pipeline stage grouping, lower panels, and role-prioritized layouts.
- Approve stage-to-event mappings, primary/alternate/terminal classification, cross-lane dependency rules, and current-state conflict resolution.
- Approve KPI versions, default windows, comparison periods, targets, quality grades, currency/cost basis, and drill-through privacy exceptions.
- Approve filter dimensions, saved-view sharing/defaults, search identifiers, export controls, and return-context behavior.
- Approve hard-priority tiers, queue factors, owner eligibility, task deduplication, SLA/escalation/cooldown, and override policy.
- Approve Reviews/Approvals counts, direct-action eligibility, material-change invalidation, bulk-action boundaries, and notification behavior.
- Approve freshness thresholds, partial/insufficient behavior, last-good display, projection-lag tolerance, retry/replay, reconciliation materiality, and restatement policy.
- Approve cost/exposure definitions, actual/estimate visibility, employee-metric restrictions, sensitive fields, and multi-location aggregation/privacy controls.
- Approve performance/accessibility targets, pilot locations/roles/volumes, observability, support ownership, training, shadow/manual operation, pause, rollback, and expansion gates.

## 20. Acceptance checklist

- [ ] Product approves the default landing versus deeper Control Tower composition and confirms no return to the older cluttered module-tab model.
- [ ] Domain owners approve every stage, state, event, dependency, aggregate, exclusion, correction, and terminal classification.
- [ ] KPI owners approve formulas, units, windows, targets, quality grades, freshness, drill-throughs, and publication/reconciliation evidence.
- [ ] Security/governance approves tenant/location scope, aggregate privacy, field restrictions, commands, exports, and employee-metric boundaries.
- [ ] Operations approves queues, hard tiers, owners, due/escalation, tasks, reviews, approvals, recommendations, and non-happy states.
- [ ] Integration owners approve source authority, external acknowledgements, manual/degraded behavior, retry/replay, lag, mismatch, and reconciliation.
- [ ] Design/accessibility approves desktop, tablet, mobile, keyboard, screen-reader, focus, contrast, status, refresh, and selected-asset behavior.
- [ ] Reliability/support approves performance bounds, observability, alerts, runbooks, incident ownership, recovery, pilot, pause, rollback, and release gates.
- [ ] Fixed fixtures reconcile stage totals, clocks, costs, tasks, reviews, approvals, exceptions, KPIs, and drill-through populations by hand.
- [ ] No planned, partial, stale, estimated, recommended, requested, or externally unacknowledged state is represented as authoritative completion.

## 21. Change control

This contract elaborates approved Inventory Lifecycle sources; it does not replace them. Material changes to default navigation/composition, lifecycle stages or swimlanes, KPI definitions, projection classifications, command rail/panels, filters/saved views, Reviews & Approvals, priority rules, authority/privacy, freshness/reconciliation, or advisory-only behavior require explicit product approval and versioned updates to the applicable source documents and images.
