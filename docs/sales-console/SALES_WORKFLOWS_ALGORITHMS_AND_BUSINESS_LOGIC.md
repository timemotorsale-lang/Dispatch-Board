# Sales Workflows, Algorithms, and Business Logic

**Status:** Official source of truth for Sales Console implementation guidance  
**Product area:** Sales Console  
**Purpose:** Freeze the operating philosophy, workflow design, algorithms, and business logic that must guide Sales Console implementation.  
**Adoption rule:** When implementation choices conflict, this document governs the intended staff experience and revenue workflow behavior.

## 1. North Star

The Sales Console is not another page for staff to search through. It is the dealership's guided revenue execution system.

Its job is to help staff answer one operating question:

> What is the best revenue-producing action we should take right now, for which customer, why, and what outcome must be recorded next?

Sales Console must simplify selling. It should start with intent, guide the staff member through the right path, request only the facts needed for the next decision, recommend the next best action, capture the outcome, and create the correct follow-up.

The system should feel simple on the surface and disciplined underneath.

## 2. Core Product Promise

Sales Console exists to help staff generate revenue in a structured, repeatable, elite, enterprise-level way.

It must:

- guide staff from sales intent to sales outcome;
- reduce guessing, searching, duplicate entry, and page hopping;
- keep every recommendation explainable and source-backed;
- help staff close more deals without losing customer context;
- keep Customer 360 updated with every meaningful sales event;
- prevent fake, sample, or unsourced sales activity from appearing as truth;
- expose blockers, stale work, and manager intervention needs before revenue is lost;
- keep the workflow simple enough for daily staff adoption.

Sales Console should not merely display data. It should conduct the sales workflow.

## 3. Product Boundary

Customers/CRM owns the relationship truth.

Sales Console owns the revenue execution truth.

| Area | Source of truth | Sales Console responsibility |
| --- | --- | --- |
| Customer identity | Customers/CRM | Use and link customer context; do not duplicate identity truth. |
| Customer timeline | Customer 360 | Write sales events back as verified activity. |
| Notes, cases, tasks, appointments | Owning source systems | Read, guide, and link; create only through approved source-owned commands. |
| Lead and opportunity lifecycle | Sales Console with CRM linkage | Guide the sales path from intent to sold/lost. |
| Deal work | Sales Console | Manage qualified opportunity, deal stage, blockers, next action, and outcome. |
| Completed sale accounting | Trusted sales/accounting/DMS source when available | Do not fabricate revenue totals or closed-sale facts. |

Sales may project information from other systems, but it must not silently become a duplicate source of truth.

## 4. CRM Lifecycle Alignment

All Sales Console logic must honor the formal CRM lifecycle:

```text
Customer -> Prospect -> Lead -> Qualified Opportunity / Deal -> Sold / Lost
```

Definitions:

- **Customer:** the durable person or business identity record.
- **Prospect:** a customer/contact with possible buying intent before qualification.
- **Lead:** a prospect/customer with a sales signal requiring follow-up.
- **Qualified Opportunity / Deal:** a lead with confirmed buying intent or active deal work.
- **Sold:** a won opportunity with accepted outcome evidence.
- **Lost:** a closed opportunity that did not convert, with an outcome reason.

Counting rules:

- New Leads must not count qualified deals, sold records, or lost records.
- Open Deals must not count raw/new leads.
- Sales This Month must not count leads or open deals.
- Sold counts require won outcome evidence or a trusted completed-sale source.
- Lost counts require a closed-lost outcome reason.

If a source cannot prove the lifecycle state, the UI must show a limited, read-only, preview, or unavailable state instead of inventing certainty.

## 5. Staff Experience Principle

The Sales Console should open with intent, not with a wall of widgets.

The first staff-facing question should be:

> What are you trying to do?

Approved starting intents:

- Sell to a new customer
- Work today's leads
- Continue an active deal
- Recover a stalled opportunity
- Prepare for an appointment or visit
- Close a ready opportunity
- Review manager priorities

After intent is selected, the console should progressively reveal only the next useful step. Staff should not have to understand the full system to complete the next action.

## 6. Operating Pattern

Every guided sales workflow must follow this pattern:

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

No active sales item should be allowed to drift without:

- an owner;
- a lifecycle stage;
- a next action;
- a due date or follow-up expectation;
- a source-backed activity trail;
- an outcome or reason when closed.

## 7. Required Guided Workflows

### 7.1 Sell to a New Customer

Purpose: turn a new customer/prospect into a properly qualified lead or deal.

Flow:

1. Find or create the customer.
2. Confirm buying intent.
3. Capture need, timeframe, contact method, source, and vehicle/category interest.
4. Classify as prospect, lead, or qualified opportunity.
5. Recommend next action.
6. Create follow-up, appointment, or deal path.
7. Write the sales event to Customer 360.

### 7.2 Work Today's Leads

Purpose: prevent lead leakage and prioritize meaningful response.

Flow:

1. Read live lead records.
2. Rank by urgency, intent, age, source, customer response, and next action.
3. Present one recommended lead at a time.
4. Guide staff through call, message, appointment, qualify, nurture, or close-lost outcome.
5. Require structured result.
6. Recalculate queue after each action.

### 7.3 Continue an Active Deal

Purpose: move qualified opportunities toward close.

Flow:

1. Open the active deal context.
2. Show customer, vehicle, stage, blocker, owner, last action, next action, and readiness.
3. Recommend the best next step.
4. Capture staff action and outcome.
5. Move stage only when required evidence exists.
6. Create next action or manager escalation.

### 7.4 Recover a Stalled Opportunity

Purpose: rescue revenue before the customer disappears.

Flow:

1. Detect stale activity, overdue next action, missed appointment, unanswered quote, or no owner.
2. Classify the stall reason.
3. Recommend recovery action.
4. Ask staff for only the missing recovery fact.
5. Move to active, nurture, lost, or manager escalation.

### 7.5 Prepare for Appointment or Visit

Purpose: make every visit revenue-ready.

Flow:

1. Read appointment source.
2. Link customer, lead/deal, vehicle interest, owner, and preparation tasks.
3. Surface missing documents, vehicle readiness, trade/appraisal needs, or manager prep.
4. Give staff a short preparation checklist.
5. Capture arrival/no-show/outcome and write back to Customer 360.

### 7.6 Close a Ready Opportunity

Purpose: help staff focus on opportunities that can realistically close now.

Flow:

1. Identify deals with strong readiness signals.
2. Verify customer intent, vehicle fit, approvals, documents, appointment/visit state, and blocker status.
3. Show the closing path and missing items.
4. Recommend the next close action.
5. Record sold, lost, nurture, or still-active outcome with evidence.

### 7.7 Manager Priority Review

Purpose: show where leadership intervention can protect or create revenue.

Flow:

1. Surface high-value or high-risk opportunities.
2. Explain why each item needs manager attention.
3. Separate coaching, approval, blocker removal, and escalation.
4. Require a manager decision or defer reason.
5. Record decision and notify affected staff.

## 8. Required Algorithms

All algorithms must be deterministic, explainable, source-backed, versioned, replayable, and safe to audit.

No algorithm may use protected characteristics, inferred wealth, neighborhood proxies, or unsupported credit assumptions.

### 8.1 Lead Priority Algorithm

Purpose: decide which lead should be worked first.

Inputs:

- lead age;
- source;
- customer engagement;
- response urgency;
- vehicle interest;
- appointment signal;
- owner status;
- next action due time;
- data completeness;
- prior interaction freshness.

Output:

- priority band;
- ranked queue position;
- reason codes;
- next recommended action.

### 8.2 Deal Readiness Algorithm

Purpose: decide whether an opportunity is ready for deal work or close action.

Inputs:

- lifecycle stage;
- customer intent;
- selected vehicle or vehicle criteria;
- appointment/showroom activity;
- trade/appraisal state;
- document readiness;
- finance/approval state where available;
- blocker status;
- last action and next action.

Output:

- readiness state: Not ready, Needs qualification, Working deal, Close-ready, Blocked;
- missing facts;
- recommended next action.

### 8.3 Next Best Action Algorithm

Purpose: recommend the best action staff should take now.

Candidate actions:

- call customer;
- send permitted message;
- ask missing qualification question;
- schedule appointment;
- confirm appointment;
- recommend vehicle;
- request manager turn;
- request appraisal;
- create task;
- move to nurture;
- close lost with reason;
- record sold with evidence.

Ranking order:

1. customer protection and commitments;
2. overdue or time-sensitive actions;
3. actions that unblock close-ready revenue;
4. actions that move lifecycle stage forward;
5. manager or cross-team dependencies;
6. lowest effort action that creates meaningful progress.

Every recommendation must explain why it was selected.

### 8.4 Stall Detection Algorithm

Purpose: detect revenue risk early.

Stall signals:

- no next action;
- overdue next action;
- no owner;
- missed appointment;
- appointment completed without outcome;
- quote/proposal presented without follow-up;
- repeated contact attempts without response;
- deal stage unchanged beyond threshold;
- blocker unresolved beyond threshold.

Output:

- stall type;
- severity;
- responsible owner;
- recovery recommendation;
- escalation threshold.

### 8.5 Blocker Classification Algorithm

Purpose: describe what is stopping progress.

Approved blocker families:

- Customer response
- Appointment
- Vehicle availability/readiness
- Price/payment
- Financing
- Trade/appraisal
- Documents
- Manager approval
- Staff ownership/capacity
- Compliance/policy
- Unknown / needs review

Unknown must be temporary. The system should guide staff to classify it.

### 8.6 Manager Escalation Algorithm

Purpose: raise only the work that truly needs leadership.

Escalation triggers:

- high-value close-ready deal blocked;
- no owner on urgent lead;
- overdue high-priority opportunity;
- requested discount/approval;
- repeated missed customer commitment;
- unresolved blocker past threshold;
- policy-sensitive exception;
- staff capacity or assignment conflict.

Output:

- escalation reason;
- required manager decision;
- affected customer/deal;
- time sensitivity;
- recommended action.

### 8.7 Revenue Opportunity Ranking

Purpose: order work by revenue leverage, not noise.

Ranking should combine:

- urgency;
- close readiness;
- customer engagement;
- deal stage;
- value signal where trusted;
- blocker removability;
- appointment/visit timing;
- stale-work risk.

If value is not trusted, the ranking must not pretend it is.

## 9. Outcome Capture Rules

Every staff action must end with a structured outcome.

Examples:

- Reached customer
- Left message
- Appointment scheduled
- Appointment confirmed
- Customer not ready
- Needs financing
- Needs different vehicle
- Manager help needed
- Vehicle unavailable
- Deal moved forward
- Sold
- Lost
- Nurture later

Outcome capture must create the next step automatically when the work remains active.

No active lead or deal should close the interaction without either:

- a next action;
- a terminal sold/lost/nurture outcome;
- or a manager-visible exception.

## 10. Source Truth and Anti-Fabrication Rules

Sales Console must never display fabricated activity, fake customers, fake deal progress, fake appointments, fake notes, fake revenue, or fake history as operational truth.

Rules:

- If a source is live, show the live source.
- If a source is read-only, label it read-only.
- If a source is preview-only, label it preview.
- If a source is not wired, say so clearly.
- If no source data exists, say "No source data available."
- Do not fill empty states with sample names or imagined activity.
- Do not count a lead as a deal unless lifecycle evidence supports it.
- Do not count a deal as sold unless sold evidence exists.

## 11. UI Design Rules

Sales Console should be calm, guided, and progressively disclosed.

Required design behavior:

- start with intent;
- show one main path at a time;
- use a queue only after the intent is clear;
- avoid unrelated widgets on the first screen;
- avoid "view all" pages that do not help staff act;
- make every button complete the action it promises or explain why it is unavailable;
- keep Customer 360 one click away;
- keep manager escalation clear but not noisy;
- keep metrics secondary to guided execution.

The console should not reward page hopping. It should move staff through the workflow.

## 12. Implementation Guardrails

Every implementation slice must answer:

1. What sales intent does this support?
2. What lifecycle stage does it read or change?
3. What source of truth does it use?
4. What action does it guide staff to take?
5. What outcome is captured?
6. What writes back to Customer 360?
7. What prevents fabrication?
8. What test proves the count, action, or recommendation is honest?

If a slice cannot answer these questions, it is not ready.

## 13. Review and Approval Standard

A Sales Console feature is not acceptable merely because the page renders.

It is acceptable only when:

- it reduces staff confusion;
- it guides a real sales action;
- it uses source-backed data;
- it captures an outcome;
- it creates or updates the next step;
- it writes meaningful activity back to Customer 360;
- it does not inflate statistics;
- it can be explained to a manager in plain business language.

## 14. Official Implementation Direction

The Sales Console should be built in this order:

1. Intent-based Sales Home.
2. Lifecycle-aware revenue work queue.
3. Guided lead work path.
4. Guided active deal path.
5. Next best action engine.
6. Outcome capture and automatic next step.
7. Customer 360 sales activity write-back.
8. Manager priority and escalation workflow.
9. Honest sales metrics and reports.
10. Advanced forecasting and optimization.

This sequence keeps the product simple, useful, and grounded before deeper enterprise capabilities are added.

## 15. Operating Mantra

Do not make staff navigate sales.

Make the system guide staff through selling.

