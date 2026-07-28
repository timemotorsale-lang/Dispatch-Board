# Sales Console UI Implementation Plan

**Status:** Build-ready planning baseline; documentation only  
**Product area:** `/sales`  
**Companion docs:** `SALES_CONSOLE_PRODUCT_REQUIREMENTS.md`, `SALES_DATA_MODEL.md`, `SALES_WORKFLOW_CATALOG.md`

## 1. UI intent

The Sales Console UI should be a dense, fast operating surface for repeated dealership work. It should not feel like a marketing page or a generic CRM skin. The experience should help each role answer five questions quickly:

- What needs attention now?
- Which customer, vehicle, or deal is most important?
- What is blocking progress?
- What action am I allowed to take?
- What changed since I last looked?

The UI should borrow the best patterns from enterprise systems: Salesforce-style record depth and pipeline discipline, ServiceNow-style queues and workflow state, vAuto-style inventory intelligence and market awareness, and dealership-specific deal desk control.

## 2. Information architecture

Primary navigation:

| Route | Label | Purpose | Primary users |
| --- | --- | --- | --- |
| `/sales/today` | Today | Ranked personal work queue | Salesperson, BDC |
| `/sales/leads` | Leads | Lead intake, dedupe, SLA, assignment | BDC, manager |
| `/sales/pipeline` | Pipeline | Opportunity and deal progression | Salesperson, manager |
| `/sales/customers/:id` | Customer 360 | Customer context and timeline | All sales roles |
| `/sales/deals/:id` | Deal Desk | Quote, approval, finance, delivery readiness | Salesperson, manager, finance |
| `/sales/inventory` | Inventory Intelligence | Vehicle match, market pressure, readiness | Salesperson, manager, inventory |
| `/sales/appointments` | Appointments | Confirmation, arrival, no-show, showroom flow | Salesperson, BDC, manager |
| `/sales/promises` | Promises | Customer and internal commitment ledger | Salesperson, manager, delivery |
| `/sales/command` | Command Center | Manager risk, forecast, SLA, coaching | Manager, executive |
| `/sales/configuration` | Configuration | Policy, queues, reasons, permissions | Admin, leadership |

Global shell requirements:

- left navigation with role-aware sections;
- top global search across customer, vehicle, opportunity, deal, stock number, VIN, and phone/email where allowed;
- notification center for overdue actions, approvals, returned handoffs, stale opportunities, and blocked deliveries;
- persistent user context showing role, team, and active queue;
- recent records tray for fast return to interrupted work;
- command button that changes by context: create lead, create task, request approval, schedule, log outcome.

## 3. Layout system

Use an operations-console layout:

- restrained colors with clear status accents;
- compact tables and split panes;
- sticky summary bars for record state;
- right-side activity and audit timeline;
- drawers for quick edits that do not deserve full page navigation;
- modals only for irreversible or authority-sensitive actions;
- clear empty states that offer the next allowed action.

Standard record header:

| Element | Requirement |
| --- | --- |
| Identity | customer, vehicle, opportunity, or deal label |
| State | stage, status, owner, next action, freshness |
| Risk | blockers, SLA status, policy exceptions |
| Actions | only actions allowed by current role and record state |
| Evidence | last contact, last update, source, audit link |

Status language:

| State | UI treatment |
| --- | --- |
| Fresh | neutral |
| Due Today | visible but not alarming |
| At Risk | warning |
| Stale | urgent |
| Blocked | urgent with blocker owner |
| Escalated | manager-visible priority |

## 4. Dashboard views

### 4.1 Salesperson Today

Purpose: the first screen for a seller. It should remove guessing from the day.

Primary layout:

- top strip: assigned opportunities, due actions, appointments today, active deals, overdue promises;
- ranked work list grouped by Must Do Now, Today, Waiting, Watch;
- side panel showing selected customer context and last interaction;
- quick-action row for call, text/email request, schedule, log outcome, open deal, request help;
- explainability chip showing why the item is ranked.

Core columns:

| Column | Description |
| --- | --- |
| Priority | rank, urgency, reason |
| Customer | name, preferred channel, consent flag |
| Vehicle | interested stock or best match |
| Stage | opportunity/deal stage |
| Next action | action and due time |
| Freshness | Fresh, Due Today, At Risk, Stale |
| Blockers | count and top reason |
| Owner | current owner or queue |

Interactions:

- selecting a row opens an inline detail panel;
- completing an action requires outcome and next step;
- overdue action can be snoozed only with reason;
- manager-priority items remain visible until resolved or reassigned;
- clicking a vehicle opens Inventory Intelligence in context.

### 4.2 Lead Operations Dashboard

Purpose: give BDC and managers a live lead-control surface.

Primary layout:

- KPI strip: new leads, unassigned, first response at risk, contacted, appointment set, no-show recovery;
- inbox table for new and active leads;
- duplicate review drawer;
- assignment panel showing queue load and coverage;
- SLA heat map by source and channel.

Lead intake states:

| State | UI behavior |
| --- | --- |
| New | must be assigned or worked |
| Dedupe Review | cannot create duplicate customer silently |
| Attempting | response clock visible |
| Contacted | qualification fields visible |
| Appointment Set | confirmation tasks created |
| Nurture | next nurture date required |
| Disqualified | reason required |

### 4.3 Pipeline Dashboard

Purpose: show progression and aging from opportunity to close.

Primary layout:

- kanban or stage table toggle;
- filters for owner, source, vehicle type, stage, freshness, manager priority;
- stage aging indicators;
- value and unit forecast bands;
- lost/nurture reactivation panel.

Required views:

- seller pipeline;
- team pipeline;
- stale opportunities;
- active deals;
- closeable this week;
- lost but recoverable.

## 5. Deal Desk

Purpose: manage the commercial deal without losing controls, approvals, or delivery readiness.

Recommended layout:

- left rail: deal stages and completion checklist;
- center workspace: quote scenario, vehicle, customer needs, trade, finance assumptions;
- right rail: approvals, blockers, promises, documents, audit timeline;
- sticky footer: current scenario, exception status, allowed next action.

Deal desk tabs:

| Tab | Purpose |
| --- | --- |
| Overview | deal health, customer, vehicle, stage, blockers |
| Needs | customer priorities, budget, trade, finance intent |
| Quote Scenarios | versioned scenarios, payment estimates, accepted scenario |
| Approvals | discount, gross, pricing, promise, waiver decisions |
| Trade | trade intent, appraisal handoff, payoff sensitivity |
| Documents | required documents and validation state |
| Finance Handoff | readiness, return reasons, finance owner |
| Delivery | checklist, appointment, vehicle readiness, customer confirmation |
| Timeline | immutable event and interaction history |

Quote scenario UI:

- show scenario version number and status;
- compare current, previous, and accepted scenarios;
- flag customer-facing estimates clearly;
- show exception chips before submit;
- require reason for discount or override;
- create approval request when policy threshold is crossed;
- prevent editing a presented scenario directly; changes create a new version.

Manager approval UI:

- queue of pending approvals;
- side-by-side request, policy limit, deal context, customer risk, vehicle economics;
- approve, reject, request changes, or reassign;
- decision note required;
- approval expiration visible.

Finance handoff UI:

- readiness checklist;
- missing-field panel;
- missing-document panel;
- returned-from-finance reason and owner;
- submit only when required conditions pass or authorized waiver exists.

## 6. Inventory Intelligence

Purpose: make the vehicle decision smarter than a basic inventory search.

Primary layout:

- search and filters for make, model, price, mileage, body style, readiness, age, availability;
- recommendation panel when opened from an opportunity;
- market and aging indicators;
- readiness blockers;
- alternatives grid;
- vehicle detail drawer.

Inventory intelligence views:

| View | Purpose |
| --- | --- |
| Match for Customer | ranked recommendations tied to a customer/opportunity |
| Sellable Now | vehicles ready and available today |
| Aged Inventory | units needing attention based on days-in-stock and market pressure |
| Blocked Units | title, service, recon, pricing, hold, or delivery blockers |
| Alternatives | substitute vehicles close to customer criteria |
| Manager Pricing Watch | policy-gated view of discount pressure and gross bands |

Vehicle match card:

| Element | Requirement |
| --- | --- |
| Vehicle identity | year, make, model, trim, stock, VIN where allowed |
| Availability | available, held, pending, blocked, sold |
| Readiness | ready, service, detail, title, recon, unknown |
| Fit score | customer fit with reasons |
| Economics | role-gated gross band, aging, discount sensitivity |
| Action | attach to opportunity, create deal, request hold, suggest alternative |

Recommendation logic visible to user:

- budget fit;
- feature/body style match;
- mileage fit;
- readiness;
- availability;
- aging pressure;
- market competitiveness;
- finance fit;
- trade compatibility;
- customer preference match.

## 7. Manager Command Center

Purpose: give managers a single place to protect revenue, speed, and discipline.

Primary layout:

- command strip: open opportunities, SLA at risk, stale deals, approvals pending, blocked deliveries, forecast confidence;
- exception queues;
- team workload;
- forecast and closeable deals;
- coaching panel;
- drilldown table.

Command center sections:

| Section | Shows | Manager action |
| --- | --- | --- |
| SLA Risk | leads and opportunities near breach | assign, escalate, coach, contact owner |
| Stalled Revenue | aged stage, no next action, stale deal | intervene, reassign, request update |
| Approval Queue | discount, gross, price, promise, waiver requests | approve, reject, request changes |
| Forecast | committed, weighted, confidence, changes | override with reason, drill into deals |
| Delivery Blockers | deals at delivery risk | assign blocker owner, escalate |
| Inventory Opportunities | aged or high-fit vehicles with active demand | push match, approve pricing review |
| Coaching | seller patterns and specific records | create coaching note, schedule review |
| Data Quality | duplicates, missing fields, invalid state | assign cleanup, merge review |

Manager alert rules:

- high-intent lead without response;
- active opportunity without next action;
- appointment no-show not recovered;
- deal stale in desk review;
- quote exception waiting too long;
- finance returned deal unresolved;
- delivery-ready claim with blocker;
- customer promise overdue;
- forecast override without reason;
- seller workload imbalance.

## 8. Customer 360

Purpose: show relationship truth and sales context in one place.

Primary layout:

- customer summary with preferred channel and consent state;
- active opportunities and deals;
- owned vehicles and trade signals;
- appointments;
- promises;
- timeline;
- documents and blockers;
- relationship notes with visibility controls.

Key interactions:

- create opportunity;
- schedule appointment;
- log interaction;
- add promise;
- open deal;
- attach interested vehicle;
- request data-quality review.

## 9. Appointment Board

Purpose: manage showroom and follow-up rhythm.

Views:

- today;
- upcoming;
- confirmations needed;
- arrived;
- no-show recovery;
- by salesperson;
- by vehicle interest.

Required interactions:

- confirm appointment;
- mark arrived;
- start showroom journey;
- convert to deal;
- mark no-show with reason;
- create recovery action;
- reassign appointment owner.

## 10. Promise Ledger

Purpose: keep commitments from disappearing in notes.

Views:

- my promises;
- team overdue;
- customer-facing;
- delivery-related;
- waiting on another department;
- broken promises.

Promise row requirements:

- customer;
- promise type;
- owner;
- due time;
- status;
- blocker;
- evidence;
- linked opportunity/deal.

## 11. Role-based first release

The first UI release should ship as a narrow but complete operating loop.

Phase 1 screens:

1. Salesperson Today.
2. Lead Operations.
3. Customer 360 summary.
4. Deal Desk overview with quote scenario placeholder.
5. Inventory Intelligence match view.
6. Manager Command Center risk queues.

Phase 1 must prove:

- every active opportunity has owner, stage, next action;
- work queues rank and explain actions;
- manager can see and intervene in stale or high-risk work;
- vehicle recommendations show blockers;
- deal desk can show stage, blockers, scenario versions, and approvals even before finance integration exists.

Phase 2 screens:

1. Full quote scenario compare.
2. Approval queue and decision workflow.
3. Finance handoff readiness.
4. Delivery readiness.
5. Promise ledger.
6. Forecast snapshot and override history.

Phase 3 screens:

1. Advanced inventory pricing watch.
2. Executive rollups.
3. Integration reconciliation console.
4. Configurable policy admin.
5. Coaching analytics.

## 12. Component inventory

Reusable components:

| Component | Used in |
| --- | --- |
| RecordHeader | opportunity, customer, deal, vehicle |
| RankedWorkList | Salesperson Today, Command Center |
| StatusChip | all work queues |
| FreshnessBadge | opportunities, deals, tasks |
| BlockerList | deal, delivery, inventory |
| NextActionControl | opportunities, deals, promises |
| ActivityTimeline | customer, opportunity, deal |
| ApprovalPanel | deal desk, command center |
| VehicleMatchCard | inventory, deal desk |
| QuoteScenarioTable | deal desk |
| ReadinessChecklist | finance, delivery |
| ReasonCodeSelect | close, lost, approval, reassignment |
| PermissionGate | sensitive fields and actions |
| AuditTrailDrawer | controlled record changes |
| QueueFilterBar | all queues |

## 13. Implementation tickets

Suggested first tickets:

| Ticket | Scope | Done when |
| --- | --- | --- |
| SAL-UI-001 | Add `/sales` route shell and role-aware navigation | route exists with nav, search placeholder, notifications placeholder |
| SAL-UI-002 | Build Salesperson Today static/read-model view | ranked groups render with required columns and quick actions |
| SAL-UI-003 | Build Lead Operations queue | lead states, SLA flags, assignment panel render |
| SAL-UI-004 | Build Customer 360 summary | profile, consent, active sales records, timeline placeholders render |
| SAL-UI-005 | Build Deal Desk overview | stage rail, summary, blockers, quote scenario shell render |
| SAL-UI-006 | Build Inventory Intelligence match view | vehicle match cards, filters, blockers, reasons render |
| SAL-UI-007 | Build Manager Command Center | KPI strip, exception queues, forecast placeholder render |
| SAL-UI-008 | Add shared status, freshness, blocker, and reason components | components reused across at least three screens |
| SAL-UI-009 | Add permission gates for sensitive actions and economics | restricted actions hidden or disabled by role |
| SAL-UI-010 | Add no-active-opportunity-without-next-action guard | active record UI requires next action before save |

## 14. Acceptance checklist

Before UI moves from prototype to pilot:

- navigation lets each role reach its default work surface in one click;
- tables remain readable on desktop and usable on tablet widths;
- every queue item shows owner, stage/status, next action, freshness, and blocker state;
- every score or recommendation displays reason codes;
- sensitive economics and override actions are permission-gated;
- manager drilldowns link from metrics to exact records;
- quote scenarios show version and status;
- blocked vehicles are never shown as clean recommendations;
- finance and delivery readiness cannot appear complete without checklist evidence;
- empty states create useful next actions rather than blank screens.
