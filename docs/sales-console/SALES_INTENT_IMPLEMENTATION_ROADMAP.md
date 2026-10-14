# Sales Intent Implementation Roadmap

**Status:** Planning and implementation prompt for review  
**Product area:** Sales Console  
**Governing source:** `SALES_WORKFLOWS_ALGORITHMS_AND_BUSINESS_LOGIC.md`  
**Current position:** Milestone 1, Sales Intent Home, has been implemented as a review slice and is not yet adopted until approved.

## 1. Purpose

This document defines the structured implementation roadmap for the Sales Console intent-led buildout after the Sales Intent Home.

The implementation must move one milestone at a time:

1. implement the slice;
2. test the slice;
3. review the slice in the app;
4. approve or revise;
5. commit the slice only after approval;
6. move to the next milestone.

The goal is to keep the Sales Console simple for staff while building enterprise-grade workflows, algorithms, source truth, and business logic underneath.

## 2. UI/UX Simplification Rule

Sales Console must feel like a guided sales workspace, not a dashboard or page-hopping portal.

Staff should see the fewest tabs, buttons, and panels needed for the current intent, customer, lifecycle stage, and revenue lane. Advanced tools can exist, but they should stay hidden, collapsed, or secondary until the staff action requires them.

An Enterprise Dashboard may always exist as an optional view for managers, owners, and authorized users. It must not replace the default staff workflow. Staff should land in the guided intent/workspace experience; leaders may open the Enterprise Dashboard when they need full operating visibility.

Every visible control must answer:

> What can staff do with this right now?

Implementation must prefer:

- context-based navigation over broad always-visible navigation;
- progressive unfolding over exposing every capability at once;
- one active customer, deal, or revenue lane context at a time;
- direct action wiring over sending staff to another page to find the same action;
- simple staff-facing language over internal system language;
- source-backed empty states over decorative or sample content.

Complexity is allowed underneath. The staff-facing workflow must stay simple, readable, and easy to execute.

Enterprise Dashboard rules:

- It is optional, not the default staff landing experience.
- It is role-aware and may expose more information to managers, owners, and admins than to front-line staff.
- It shows cross-lane visibility across sales, BHPH, lease-to-own, public repair, rental, warranty, and financing products.
- Every metric, chart, queue, or card must drill into the real filtered source list behind it.
- If source truth is missing, the dashboard must show "No source data available," "Source not wired," or an equivalent unavailable state.
- It must highlight leadership action: stuck revenue, lane performance, staff load, stale work, manager escalations, forecast risk, source health, and audit exceptions.
- It must never reintroduce fake numbers, decorative sample charts, or page-hopping as the normal staff workflow.

## 3. Revenue Lane Coverage

Yes, these milestones must cover the known revenue avenues.

The Sales Console must not be designed only for traditional vehicle sales. Every milestone must support the dealership's revenue lanes through a shared workflow model and lane-specific rules.

Approved revenue lanes for this roadmap:

| Revenue lane | Plain meaning | Source systems that may be involved |
| --- | --- | --- |
| Inventory Cash Sale | Standard vehicle sale paid outside BHPH/LTO structure | CRM, Inventory, Sales Console, DMS/accounting when trusted |
| Inventory BHPH Sale | Buy-here-pay-here sale requiring compliance and finance review | CRM, Inventory, Finance, Sales Console |
| Inventory Lease-to-Own | Lease-to-own opportunity and agreement path | CRM, Inventory, Finance, Sales Console |
| Public Auto Repair | Customer-pay repair opportunity or estimate follow-up | CRM, Service/Repair Orders, Appointments, Tasks |
| Daily Rental | Rental opportunity, availability, checkout, return, follow-up | CRM, Rental Operations, Appointments, Tasks |
| Warranty Product | Warranty sale, warranty eligibility, authorization, documentation | CRM, Warranty Operations, Finance, Sales Console |
| Financing Product | Finance product opportunity or finance-related revenue path | CRM, Finance, Sales Console |

Every milestone must answer:

- Which revenue lanes does this screen or workflow support?
- Which lane-specific facts are required before action?
- Which source system owns the truth?
- Which actions are live, controlled, read-only, preview, or not wired?
- What is the write-back path to Customer 360 activity?
- What happens when source data is missing?

If a lane cannot be supported yet, the UI must say so clearly instead of showing fake metrics, fake activity, or fake recommendations.

## 4. Stage 1 Completed For Review: Sales Intent Home

Purpose:

Replace the busy dashboard with a simple intent-based start screen.

Review goal:

Staff should begin with the question:

> What are you trying to do?

Approved starting intents:

- Sell to a new customer
- Work today's leads
- Continue an active deal
- Recover a stalled opportunity
- Prepare for an appointment or visit
- Close a ready opportunity
- Review manager priorities

Approval criteria:

- Sales opens with intent instead of a wall of widgets.
- The user can choose an intent and see the required facts and next workflow.
- The design is readable on desktop and mobile.
- It does not fabricate data, metrics, or recommendations.
- It preserves access to the existing deeper Sales workspaces.

## 5. Milestone 2: Revenue Work Queue

### Objective

Create the Sales Console's ranked work queue so staff can see the best revenue-producing work to do next.

The queue must rank leads, opportunities, appointments, tasks, and lane-specific revenue work by urgency, value, readiness, and next action.

### Staff question

> What should I work first, and why?

### Scope

- Replace static or example queue behavior with source-backed records where available.
- Rank work across all supported revenue lanes.
- Show clear source truth for each queue item.
- Show the reason each item is ranked where it is.
- Let staff filter by owner, revenue lane, urgency, stage, readiness, and source.
- Open the correct context: Customer 360, appointment, task, vehicle, repair, rental, warranty, finance, or deal context.

### Required algorithm

The ranking score must be explainable and deterministic.

Inputs:

- urgency;
- customer waiting state;
- appointment time proximity;
- lead age and SLA risk;
- revenue lane;
- estimated value or trusted revenue/gross signal;
- readiness;
- blocker count;
- owner assignment;
- last activity age;
- manager escalation requirement.

Output:

- rank;
- next best action;
- reason text;
- source-backed evidence;
- lane-specific context link.

### Revenue lane requirements

The queue must include lane labels and lane-specific source links:

- vehicle sales open Customer 360 and Vehicle 360;
- BHPH/LTO/finance paths open finance handoff context where available;
- repair paths open service or repair order context;
- rental paths open rental context;
- warranty paths open warranty context.

### Out of scope

- Do not create new sale/deal records yet unless the existing source-owned command exists.
- Do not invent revenue values.
- Do not auto-assign work without explicit approved workflow.

### Exit criteria

- Staff can see a ranked queue with explainable reasons.
- Queue item counts are real or explicitly unavailable.
- Every item has a source label.
- Empty states say "No source data available" or "No matching records" instead of showing samples.
- Tests prove fabricated queue records are blocked.

## 6. Milestone 3: Guided Sales Path

### Objective

Create a one-customer, one-deal-at-a-time guided workspace that progressively opens the next step.

### Staff question

> What do I need to do for this customer right now?

### Scope

- Staff selects a customer, lead, opportunity, appointment, or queue item.
- The Sales Console opens a focused guided path.
- Only the next useful step is emphasized.
- Deeper actions stay collapsed until needed.
- Required facts appear before action.
- The path follows the CRM lifecycle:

```text
Customer -> Prospect -> Lead -> Qualified Opportunity / Deal -> Sold / Lost
```

### Required workflow pattern

Every guided path must follow:

```text
Intent
-> Customer or prospect context
-> Required facts
-> Lifecycle stage
-> Recommended next action
-> Staff decision
-> Outcome capture
-> Next step / reminder / handoff
-> Customer 360 activity write-back
```

### Revenue lane requirements

The guided path must adapt by lane:

- Cash Sale: vehicle fit, trade, price, payment readiness, closing step.
- BHPH: proof checklist, compliance blocker, finance readiness, manager review.
- Lease-to-Own: terms, payment structure, approval, contract readiness.
- Public Repair: estimate, authorization, appointment, repair order, follow-up.
- Daily Rental: availability, rental window, checkout readiness, return follow-up.
- Warranty Product: eligibility, authorization, documents, finance/product review.
- Financing Product: finance readiness, missing facts, document handoff.

### Out of scope

- Do not build full desking or finance automation in this milestone.
- Do not make manager approvals automatic.
- Do not show fabricated progress steps.

### Exit criteria

- Staff can work one selected customer/deal without losing context.
- Steps are progressive, not overwhelming.
- Lane-specific required facts are visible.
- The user can return to the Sales Intent Home and Revenue Work Queue.
- Tests prove the guided path does not render canned customer activity.

## 7. Milestone 4: Next Best Action Engine

### Objective

Create the rule-based, explainable recommendation engine that tells staff what to do next and why.

### Staff question

> What is the next best action, and what evidence supports it?

### Scope

- Build a deterministic rule engine, not AI guessing.
- Recommendations must be source-backed.
- Each recommendation must include:
  - action;
  - reason;
  - source evidence;
  - confidence/readiness;
  - blocker;
  - required staff decision.
- Each recommendation must be lane-aware.
- If evidence is missing, the recommendation must degrade to "Needs source data" or "Manager review needed."

### Required rules

Minimum first rules:

- If a lead is new and uncontacted, recommend first contact.
- If appointment is near and unconfirmed, recommend confirmation.
- If customer has no next step, recommend outcome capture or task creation.
- If opportunity is stale, recommend recovery follow-up or manager review.
- If BHPH/LTO/warranty has missing proof, recommend document collection.
- If repair estimate is aging, recommend repair follow-up.
- If rental date is near, recommend availability/checkout readiness.
- If source truth is missing, block recommendation from appearing as fact.

### Revenue lane requirements

Every recommendation must state the revenue lane it applies to and the source system that supports it.

### Out of scope

- Do not use black-box scoring.
- Do not create autonomous customer communications.
- Do not auto-close opportunities.

### Exit criteria

- Recommendations explain themselves.
- Recommendations can be traced to source data.
- Missing data produces no fake action.
- Tests cover at least one positive and one blocked recommendation per lane group.

## 8. Milestone 5: Outcome Capture

### Objective

Require every staff action to end with a result, next step, or closure reason.

### Staff question

> What happened, and what must happen next?

### Scope

- Capture outcomes for calls, SMS, email, appointments, tasks, notes, deal work, repair follow-up, rental follow-up, warranty follow-up, and finance handoff.
- Outcome capture must update Customer 360 activity through verified source-owned or approved Sales Console commands.
- Every outcome must produce one of:
  - next task;
  - appointment/reminder;
  - manager escalation;
  - lane handoff;
  - sold/lost closure;
  - no further action with reason.

### Required outcome fields

- customer;
- revenue lane;
- action type;
- outcome result;
- staff owner;
- timestamp;
- next step;
- due date/reminder where applicable;
- source write-back status;
- Customer 360 timeline event.

### Revenue lane requirements

Outcome reason lists must differ where needed:

- Sales: sold, lost, no response, follow-up, proposal, negotiation.
- Repair: estimate approved, declined, waiting parts, appointment set, no response.
- Rental: reservation, checkout, return, extension, cancellation.
- Warranty: approved, denied, waiting documents, submitted, customer declined.
- Finance/BHPH/LTO: approved, missing docs, manager review, declined, alternate structure.

### Out of scope

- Do not allow free-text-only outcomes for workflow-critical actions.
- Do not write Customer 360 activity unless the source write succeeds or is clearly labeled as pending.

### Exit criteria

- Every action path ends with a captured outcome.
- No action can silently disappear.
- Customer 360 timeline reflects verified outcomes.
- Tests prove outcomes are not shown when the write-back fails.

## 9. Milestone 6: Manager Escalation

### Objective

Escalate only when a rule says manager help is needed.

### Staff question

> Does this need manager help, and why?

### Scope

- Add manager escalation rules across lanes.
- Create escalation queue with source-backed reasons.
- Allow staff to request manager review only with a reason and source context.
- Allow managers to decide, redirect, approve, deny, or request more information.
- Write escalation decisions back to the customer/deal timeline.

### Required escalation triggers

- stale opportunity;
- high-value opportunity with missing next step;
- discount/gross risk;
- BHPH or LTO compliance blocker;
- warranty eligibility or authorization blocker;
- repair estimate aging or disputed;
- rental availability/exception;
- finance handoff blocked;
- unowned urgent lead;
- repeated no-response;
- customer complaint or risk item.

### Revenue lane requirements

Each lane must define:

- what requires manager review;
- who may approve;
- what evidence is required;
- what outcome is written back.

### Out of scope

- Do not let the manager queue become a general inbox.
- Do not escalate everything.
- Do not approve finance, warranty, rental, repair, or accounting actions outside the owning system's authority.

### Exit criteria

- Escalations are rule-triggered and explainable.
- Manager queue opens exact source records.
- Decisions are auditable.
- Tests prove non-escalation cases do not enter the manager queue.

## 10. Milestone 7: Sales Metrics

### Objective

Introduce trusted metrics only after source truth is reliable.

### Staff question

> What is really happening in sales and revenue performance?

### Scope

- Replace static metrics with real counts or explicit unavailable states.
- Metrics must drill into the filtered source list behind the number.
- Support lifecycle metrics:
  - customers;
  - prospects;
  - leads;
  - qualified opportunities/deals;
  - open deals;
  - sold;
  - lost;
  - conversion;
  - stale work;
  - response time;
  - appointment show rate.
- Support revenue lane metrics where trusted:
  - cash sale;
  - BHPH;
  - lease-to-own;
  - public repair;
  - daily rental;
  - warranty;
  - financing product.

### Trust rules

- Leads count only durable lead records.
- Open deals count only qualified opportunity/deal records.
- Sold counts require won outcome evidence or trusted completed-sale source.
- Lost counts require closed-lost outcome reason.
- Revenue/gross must show only where trusted source is available.
- If source trust is not available, the metric must display "No source data available" or "Source not wired."

### Out of scope

- Do not show fake revenue totals.
- Do not combine incompatible revenue lanes without clear labels.
- Do not use screenshots, sample records, or static demo numbers as operational metrics.

### Exit criteria

- Every headline metric is live, read-only, preview, not wired, or hidden.
- Every metric opens a filtered list.
- Metrics are segmented by lifecycle and revenue lane where applicable.
- Tests block fabricated dashboard numbers.

## 11. Sequential Implementation Prompt

Use this prompt for each milestone from 2 through 7.

```text
Implement the next Sales Console milestone only.

Milestone:
[Insert milestone number and name]

Governing documents:
- docs/sales-console/SALES_WORKFLOWS_ALGORITHMS_AND_BUSINESS_LOGIC.md
- docs/sales-console/SALES_INTENT_IMPLEMENTATION_ROADMAP.md

Implementation rules:
1. Do not begin the next milestone.
2. Preserve the Sales Intent Home and the approved intent-first workflow.
3. Support all approved revenue lanes where the milestone applies:
   - Inventory Cash Sale
   - Inventory BHPH Sale
   - Inventory Lease-to-Own
   - Public Auto Repair
   - Daily Rental
   - Warranty Product
   - Financing Product
4. Use source-backed data only.
5. If source data is missing, show an unavailable/read-only/preview state instead of fabricating data.
6. Every action must clearly identify:
   - customer or prospect context;
   - lifecycle stage;
   - revenue lane;
   - owner;
   - source system;
   - next step;
   - write-back behavior.
7. Keep the staff experience simple and progressive.
8. Show the fewest tabs, buttons, and panels needed for the current intent, customer, lifecycle stage, and revenue lane.
9. Preserve the Enterprise Dashboard as an optional role-aware view, not the default staff workflow.
10. Avoid page hopping. Buttons should take staff directly to the intended work context.
11. Add or update tests that prove:
   - the new milestone renders;
   - unsupported or missing source data does not produce fake records;
   - the milestone remains lane-aware;
   - existing approved Sales Intent Home behavior still works.
12. Run focused tests and targeted lint for changed files.
13. Stop for review before commit unless the user explicitly approves committing.

Review output required:
- what changed;
- which files changed;
- which checks passed;
- what is intentionally not included;
- what the user should review in the app.
```

## 12. Review And Approval Rule

No milestone should be adopted simply because it was implemented.

Each milestone must be reviewed against:

- simplicity for staff;
- source truth;
- revenue lane coverage;
- no fabricated activity or metrics;
- direct action wiring;
- Customer 360 write-back behavior;
- test coverage;
- visual readability on desktop and mobile.

Only after approval should the milestone be committed and used as the base for the next milestone.
