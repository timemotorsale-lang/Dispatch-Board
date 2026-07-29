# Sales Console Milestone 36: Architecture-Based Operational Audit

**Status:** Corrective implementation planning baseline  
**Branch:** `codex/sales-console-m36-architecture-audit`  
**Date:** 2026-07-29  
**Scope:** Audit only; no new production workflow activation

## 1. Executive finding

The current Sales Console build drifted away from the original enterprise architecture. It has become a large prototype-style interface with many visible panels, milestone artifacts, role cards, and local interactions, but it does not yet behave like the operating console described in the original Sales Console architecture.

The issue is not simply that a few tabs need click handlers. The deeper gap is that the current build presents many surfaces before the underlying operating workflows, domain objects, routes, backend read/write services, search behavior, and revenue-lane logic exist.

That is why the console feels confusing:

- several controls look operational but only update local screen state;
- global search is not backed by a real sales/customer/inventory/deal search workflow;
- tabs show summaries or placeholder-style panels instead of true workspaces;
- milestone, dogfooding, readiness, and deployment evidence leaked into the staff-facing UI;
- the console is front-end heavy and backend light;
- it does not yet reflect every major revenue path at Time Motor Sales.

The right correction is to stop expanding the current prototype as-is and reset the next work around the original enterprise goal.

## 2. Audit baseline

This audit is measured against the original Sales Console planning documents, especially:

- `ENTERPRISE_SALES_ARCHITECTURE.md`
- `SALES_CONSOLE_PRODUCT_REQUIREMENTS.md`
- `SALES_UI_IMPLEMENTATION_PLAN.md`
- `SALES_WORKFLOW_CATALOG.md`
- `SALES_DATA_MODEL.md`
- `TRACEABILITY_MATRIX.md`

The original architecture describes Sales as the operating layer for revenue decisions, deal progress, approvals, promises, forecast confidence, handoffs, and risk visibility. It expects the console to connect Customers, Inventory, Appointments, Tasks, Documents, Finance, Dispatch, and sales-owned records without replacing the source systems.

The original product intent is clear:

- the first screen should be a working console, not a planning or landing page;
- every record should show owner, stage, next action, freshness, blockers, and source evidence;
- role views should default users into the work they need to do;
- the console should feel closer to an enterprise command center than a basic CRM list;
- a dashboard card must not become an independent state owner.

## 3. Revenue lanes now included in the target console

The Sales Console must support more than retail vehicle sales. Time Motor Sales revenue should be modeled as a multi-lane revenue operation.

The target operating model must include:

| Revenue lane | Console responsibility | MVP treatment | Enterprise foundation |
| --- | --- | --- | --- |
| Inventory cash sales | Sell available inventory for cash or external funding | Active opportunity, vehicle match, deal desk, manager review | Full quote/scenario, margin, approval, delivery handoff |
| Inventory BHPH sales | Sell inventory through buy-here-pay-here structure | Intake, qualification, finance-intent visibility, manager review | Finance rules, payment scenarios, underwriting handoff, compliance controls |
| Inventory open lease-to-own | Structure lease-to-own opportunity and lifecycle | Intake, eligibility checklist, manager review | LTO scenario builder, payment schedule, contract/document workflow |
| Public auto repairs | Convert service demand into revenue opportunity | Repair opportunity visibility, status/source link, follow-up queue | Estimate approval, repair order bridge, parts/labor status, customer promise ledger |
| Daily rental | Manage rental demand, availability, and follow-up | Rental lead/opportunity intake and visibility | Reservation workflow, rental agreement, utilization and return tracking |
| Warranty products | Present and track warranty product opportunities | Product interest and manager review visibility | Product eligibility, pricing, customer acceptance, document workflow |
| Financing products | Track finance product opportunity and handoff | Finance-intent and readiness visibility | Menu presentation, compliance, acceptance, lender/package handoff |

This means the future Deal Desk should evolve into a broader Revenue Desk. A vehicle deal is one revenue lane, not the whole sales universe.

## 4. Implementation evidence found

The current implementation shows a large amount of UI work and test coverage, but very little true Sales backend capability.

| Evidence | Finding |
| --- | --- |
| `/sales` page | Renders `SalesConsolePrototype` as the current staff-facing surface |
| `sales-console-prototype.tsx` | Approximately 213 KB, which is too large for a maintainable operating console component |
| Sales CSS module | Approximately 50 KB, indicating a large prototype-style styling surface |
| `src/features/sales` file count | 89 files |
| Sales Console unit test count | 85 focused test files |
| Sales-specific API routes found | Only `src/app/api/sales/manager-review-requests/route.ts` |
| Mock/source-shaped bundle | `salesConsoleMockSourceBundle` remains a core source for read adapter preview data |
| Operational tab layer | Uses local state to switch visible content, not a full route/workflow-backed console |
| Search behavior | Local filtering language exists, but no enterprise search workflow is evidenced |
| Staff UI language | Deployment, readiness, dogfood, milestone, and prototype evidence appears inside the user-facing flow |

This evidence supports the user-facing experience: the console looks large, but it is not yet operational enough.

## 5. Gap matrix: built vs. originally intended

| Capability | Original goal | Current state | Gap |
| --- | --- | --- | --- |
| Role-based operating shell | Each role lands directly in the work they own | Role cards and role context exist, but the shell still behaves like a prototype surface | Replace landing-card pattern with role-specific workspaces |
| Global search | Search customers, stock, VIN, opportunities, deals, phone/email where allowed | Search field exists but is not a true command/search workflow | Build real search endpoint, results tray, keyboard behavior, empty states, and record opening |
| Salesperson Today | Ranked queue with real owner, due time, stage, next action, blockers, and reason | Mostly adapter-driven/sample content | Build real work queue and task/opportunity/action behavior |
| Lead Operations | Intake, dedupe, assignment, response SLA, qualification, appointment conversion | Lead operations tab exists visually | Build lead workflow and source-backed lead queue |
| Pipeline | Opportunity/deal progression with stage aging and forecast bands | Not implemented as a true workspace | Add pipeline route/view and source-backed stage model |
| Customer 360 sales lens | Customer context, permissions, consent, prior deals, promises, timeline | Source links and snippets only | Build record-linked customer panel without replacing CRM |
| Vehicle Match / Inventory Intelligence | Explainable vehicle recommendations and readiness blockers | Mock/source-shaped intelligence cards | Connect to inventory data and build match logic |
| Deal Desk / Revenue Desk | Deal creation, scenario, approvals, trade, finance, documents, delivery | Manager Review Request exists as the only live submit path; other deal areas remain limited | Rebuild as revenue-lane-aware workspace |
| Manager Control Tower | SLA breaches, stalled work, approvals, forecast, coaching, drilldowns | Summary cards and panels exist | Build manager queues, drilldown records, and interventions |
| Appointment Board | Confirmation, arrival, no-show, showroom flow | Navigation label exists, not a real sales workspace | Build appointment sales lens over appointment source |
| Promise Ledger | Track promises, owners, due dates, evidence, escalation | Not implemented as an operating workspace | Add promise domain/workflow or source-linked promise view |
| Delivery Readiness | Checklist across deal, docs, finance, vehicle, customer confirmation | Not implemented as a real workspace | Add readiness read model and later controlled handoff workflow |
| Finance handoff | Readiness, missing docs, return reasons, finance owner | Not active beyond planning language | Build finance handoff read model before any write workflow |
| Forecasting | Explainable forecast, manager overrides, projection vs judgment | Not operational | Add forecast read model after core opportunity/deal data is reliable |
| Backend/API foundation | Purpose-built Sales services, commands, read models, integrations | One Sales-specific API route found | Backend is the largest gap |
| UI source of truth | Mockup should guide dense operating surface | Mockup influenced styling but not workflow behavior | Create a new operational source-of-truth mockup tied to real workflows |

## 6. Why the current console feels oversized

The wrong build path created unnecessary weight because the UI absorbed planning artifacts and milestone evidence instead of separating them into admin documentation or implementation review screens.

Specific causes:

1. **One giant prototype component**
   - A 213 KB component is hard to reason about, test, optimize, or turn into real workflows.

2. **Prototype panels became staff UI**
   - Readiness, deployment, dogfood, release-gate, and milestone content should not sit in the daily selling surface.

3. **Tabs were added before their operating contracts**
   - Tabs should represent real workspaces backed by domain objects, route behavior, search, state, permissions, and source records.

4. **Read-only was overused as the product model**
   - Read-only is useful for safe rollout, but a sales console must quickly move toward controlled actions: log outcome, create next action, request manager review, assign lead, schedule appointment, and open a revenue workflow.

5. **Revenue lanes were not modeled early enough**
   - Without cash, BHPH, lease-to-own, repair, rental, warranty, and finance product lanes, the Deal Desk cannot be designed correctly.

## 7. Current build disposition

The current work should not be deleted blindly. Some parts are useful. But the staff-facing experience should be re-centered.

### Keep

- Manager Review Request route/service/repository pattern.
- Audit and idempotency guardrail pattern.
- Role and permission concepts.
- Status/freshness/source labeling concepts.
- Visual ambition: dense enterprise command-center feel.
- Original planning documents and approval mockup as historical reference.

### Move out of the staff flow

- Milestone panels.
- Dogfood/readiness evidence panels.
- Prototype/release-gate language.
- Static explanation blocks that do not help a staff member complete work.

### Rebuild

- `/sales` staff shell.
- Top search behavior.
- Primary tab/navigation model.
- Salesperson Today.
- Lead Operations.
- Pipeline.
- Revenue Desk.
- Inventory Match.
- Manager Control Tower.
- Appointment Board.
- Customer 360 sales lens.

## 8. Corrected implementation principle

Going forward, a Sales Console tab should not be considered implemented unless it satisfies this operating contract:

1. **Purpose**
   - The tab has one clear job.

2. **Records**
   - It displays real or intentionally seeded domain/source records.

3. **Actions**
   - Every visible button either performs an allowed action, opens a real panel, or is visually disabled with a clear reason.

4. **Search/filter**
   - Search fields visibly change results or clearly say they are unavailable.

5. **Source ownership**
   - The user can tell which system owns the record.

6. **Freshness**
   - The user can tell if the data is fresh, stale, blocked, or unavailable.

7. **Next step**
   - The screen tells the user what to do next.

8. **Role permission**
   - The screen only exposes controls appropriate for the current role.

9. **Test proof**
   - Tests prove the tab opens, changes state, shows records, handles empty/error states, and blocks excluded workflows.

## 9. Corrected roadmap to reach the finish line

This roadmap replaces the “keep adding tabs” approach with a workflow-first sequence. Each milestone should be implemented in its own branch, committed after validation, and merged only after review.

| Milestone | Branch | Goal | Completion gate |
| --- | --- | --- | --- |
| M37 | `codex/sales-console-m37-operational-ui-source-of-truth` | Create a new operational mockup and UI contract based on the original architecture and revenue lanes | Approved source-of-truth image + screen contract |
| M38 | `codex/sales-console-m38-lean-staff-shell-reset` | Replace the bloated prototype shell with a lean staff operating shell and move admin/planning evidence out of daily flow | `/sales` feels like a work console, not a milestone board |
| M39 | `codex/sales-console-m39-revenue-domain-contract` | Define Sales Opportunity, Revenue Opportunity, revenue lanes, records, statuses, ownership, next actions, and source links | Every tab has a domain contract before UI build |
| M40 | `codex/sales-console-m40-search-and-record-open` | Build real in-console search behavior and record-opening patterns | Search returns actionable results and opens record panels |
| M41 | `codex/sales-console-m41-salesperson-today-operating-workflow` | Build the seller daily queue with ranked work, customer context, next action, and manager-review request | Salesperson can work the day from one screen |
| M42 | `codex/sales-console-m42-lead-operations-workflow` | Build lead intake/control: new leads, dedupe review, assignment, SLA, qualification, appointment conversion | BDC/manager can operate lead flow |
| M43 | `codex/sales-console-m43-pipeline-and-customer-360` | Build pipeline progression and customer sales lens | Users can open customer/opportunity context from pipeline |
| M44 | `codex/sales-console-m44-revenue-desk-mvp` | Build lane-aware Revenue Desk for cash, BHPH, lease-to-own, repair, rental, warranty, and finance products | Every revenue lane has an MVP workflow path and clear blocked/allowed actions |
| M45 | `codex/sales-console-m45-inventory-match-and-availability` | Build vehicle match, alternatives, availability, readiness, and blocker visibility | Inventory Intelligence becomes operational, not decorative |
| M46 | `codex/sales-console-m46-appointments-promises-delivery` | Build appointment board, promise ledger, and delivery readiness views | Staff can track commitments and handoffs |
| M47 | `codex/sales-console-m47-manager-command-center` | Build manager control tower with drilldowns, risk queues, stalled work, and review workload | Managers can intervene from records, not static cards |
| M48 | `codex/sales-console-m48-mvp-release-hardening` | Production hardening, accessibility, responsive behavior, performance, test coverage, deployment checklist | Internal staff MVP is ready for controlled deployment |

## 10. Revenue Desk MVP design direction

The Deal Desk should be renamed or expanded conceptually into a Revenue Desk.

Minimum MVP behavior:

- user starts or opens a revenue opportunity;
- user selects the revenue lane;
- lane-specific required fields appear;
- the console shows what is allowed now, what requires manager review, and what must stay in a source system;
- each lane has a clear next action and owner;
- source links remain visible;
- risky decisions remain controlled.

Recommended first live workflow order:

1. Inventory cash sale workflow.
2. Manager Review Request tied to a revenue opportunity.
3. BHPH / lease-to-own eligibility checklist.
4. Warranty and financing product opportunity tracking.
5. Public repair and daily rental opportunity tracking.
6. Later: controlled quote, finance, reservation, and customer messaging workflows.

## 11. Backend capabilities needed before a real MVP release

The current Sales Console cannot reach a true MVP release on UI changes alone. It needs these backend capabilities:

- Sales search endpoint.
- Salesperson work queue read endpoint.
- Lead operations read endpoint.
- Pipeline read endpoint.
- Revenue opportunity model/read endpoint.
- Inventory match/readiness endpoint or adapter.
- Manager command center read endpoint.
- Appointment/promise/delivery sales lens endpoints or adapters.
- Permission checks for each role.
- Audit/idempotency for every controlled write.

The only write workflow that should remain live until explicit approval is Manager Review Request.

## 12. Performance and loading remediation

The current large prototype can affect loading and maintainability. The correction is architectural:

- split the giant prototype into route-level/workspace components;
- keep staff UI separate from planning/admin evidence;
- lazy-load heavy panels only when opened;
- make each tab routeable or independently loadable;
- use small read models per workspace instead of one giant bundle;
- keep tests focused on workflows rather than milestone copy;
- remove staff-facing prototype language from the main operational route.

## 13. Milestone 36 decision

Milestone 36 does not declare the current console deployable. It declares the current console audited and redirects the project back to the original enterprise architecture.

The recommended next move is **Milestone 37: Operational UI Source of Truth**.

Milestone 37 should create a new approval mockup and screen contract for the real MVP staff console before more coding. That mockup should show:

- role-based landing for the active user;
- real global search behavior;
- Salesperson Today;
- Lead Operations;
- Pipeline;
- Customer 360 side panel;
- Revenue Desk with all revenue lanes;
- Inventory Match;
- Manager Command Center;
- clear live vs controlled vs future actions;
- no dogfood/prototype/milestone language in staff workflow.

Once M37 is approved, implementation should proceed milestone by milestone using the corrected roadmap above.
