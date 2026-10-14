# Sales Console Product Requirements

**Status:** Build-ready planning baseline; documentation only  
**Product area:** `/sales`  
**Primary users:** Salespeople, sales managers, BDC, finance, inventory, delivery coordinators, executives  
**Companion docs:** `ENTERPRISE_SALES_ARCHITECTURE.md`, `SALES_DATA_MODEL.md`, `SALES_WORKFLOW_CATALOG.md`

## 1. Product intent

The Enterprise Sales Console is the daily operating surface for selling at Time Motor Sales. It should help the team know what to do next, why it matters, who owns it, what risk exists, and what evidence proves the work was handled.

The console must feel closer to an enterprise command center than a basic CRM list. Ordinary sales tools store customers and reminders. This console should combine customer intent, vehicle fit, deal economics, task execution, approvals, documents, and forecast confidence into one coordinated workspace.

## 2. User roles

| Role | Main job in console | Must be able to do | Must not be able to do without authority |
| --- | --- | --- | --- |
| Salesperson | Work assigned customers, leads, appointments, and deals | Prioritize next actions, log outcomes, recommend vehicles, request approvals, manage promises | Override pricing rules, reassign protected accounts, approve own exceptions |
| Sales Manager | Protect revenue quality and speed | Reassign work, approve exceptions, coach deals, monitor SLA risk, manage forecast | Change source-system records without audit, bypass policy controls |
| BDC | Convert inbound demand into appointments and qualified opportunities | Intake leads, qualify, schedule, confirm, recover no-shows | Quote restricted terms, close deals, approve discounts |
| Finance | Prepare finance path and deal readiness | Review deal package, request missing docs, mark finance blockers, return deal with reason | Change sales stage without handoff event |
| Inventory / Merchandising | Protect vehicle truth and readiness | Resolve availability, readiness, pricing signal, substitute vehicle recommendations | Commit customer promises outside sales flow |
| Delivery Coordinator | Prepare and confirm delivery | Track checklist, schedule delivery, clear blockers | Change agreed deal economics |
| Executive / Owner | See performance, risk, and forecast | Review rollups, trends, exceptions, policy effectiveness | Edit frontline records unless explicitly assigned |
| Admin | Configure controlled values | Manage roles, queues, SLA targets, stage definitions, reason codes | Delete audit history or silently alter financial history |

## 3. Console modules

| Module | Purpose | Primary users | Core objects |
| --- | --- | --- | --- |
| Salesperson Today | One ranked work queue for the day | Salesperson, BDC | Opportunity, Task, Appointment, Deal |
| Lead Operations | Lead intake, dedupe, assignment, response control | BDC, manager | Lead source, Opportunity, Interaction |
| Customer 360 | Relationship context and complete history | Salesperson, manager, finance | Customer, Household, Consent, Interaction |
| Vehicle Match | Inventory fit and alternative recommendations | Salesperson, manager | Vehicle, VehicleCandidate, MarketSignal |
| Deal Workspace | Quote, negotiation, approvals, handoffs, readiness | Salesperson, manager, finance | Deal, QuoteScenario, ApprovalRequest |
| Manager Control Tower | Risk, SLA, stalled work, forecast, coaching | Manager, executive | Queue, ForecastSnapshot, Exception |
| Appointment Board | Confirmation, arrival, no-show, showroom flow | Salesperson, BDC, manager | Appointment, Visit, Task |
| Promise Ledger | Customer promises and internal commitments | Salesperson, delivery, manager | Promise, PromiseEvidence |
| Delivery Readiness | Final checklist and handoff completion | Delivery, finance, salesperson | DeliveryChecklist, DocumentRequirement |
| Configuration | Controlled values and policy setup | Admin, leadership | Policy, Queue, Role, ReasonCode |

## 4. Navigation model

The first screen should be a working console, not a landing page. The default view depends on role.

| Role | Default landing view | Secondary views |
| --- | --- | --- |
| Salesperson | Salesperson Today | Customer 360, Vehicle Match, Deal Workspace |
| BDC | Lead Operations | Appointment Board, Customer 360 |
| Sales Manager | Manager Control Tower | Pipeline, Deal Workspace, Lead Operations |
| Finance | Finance Handoff Queue | Deal Workspace, Documents |
| Delivery | Delivery Readiness | Appointment Board, Promise Ledger |
| Executive | Executive Sales Overview | Forecast, Exceptions, Trend Reports |

Global navigation should include search, notifications, assigned work, manager alerts, and recent records. Every record view should show owner, stage, next action, freshness, blockers, and audit timeline.

## 5. Screen requirements

### 5.1 Salesperson Today

Purpose: give each seller a ranked, explainable action list.

Required capabilities:

- Show all assigned opportunities, appointments, open tasks, customer promises, and active deals.
- Rank work by intent, SLA risk, stage importance, customer value, vehicle scarcity, and manager priority.
- Explain the ranking in plain language.
- Support quick actions: call, text/email request, schedule, mark outcome, create task, request manager help, open deal.
- Separate "must do now", "today", "waiting", and "watch" work.
- Flag stale records with missing next action or no recent customer contact.

Acceptance criteria:

- Every visible work item has an owner, due time or freshness label, stage, next best action, and reason.
- No opportunity can remain active without a next action.
- Completing an action must capture outcome, timestamp, actor, channel, and next step.

### 5.2 Lead Operations

Purpose: turn inbound demand into owned, qualified, scheduled opportunities.

Required capabilities:

- Intake leads from manual entry and future integrations.
- Detect possible duplicates before creating a new customer or opportunity.
- Capture source, vehicle interest, purchase horizon, trade intent, financing intent, contact permission, and preferred channel.
- Assign leads by availability, skill, workload, relationship, and policy.
- Track first response SLA and escalation.
- Convert qualified leads to appointment, active opportunity, nurture, or disqualified status.

Acceptance criteria:

- New leads receive a unique opportunity identifier.
- Dedupe suggestions must be reviewable before merge.
- Reassignment must preserve original source, original owner, reassignment reason, and timestamp.

### 5.3 Customer 360

Purpose: give the team one view of relationship context without duplicating the customer source of truth.

Required capabilities:

- Show customer profile, household links, communication preferences, consent, owned vehicles, prior deals, open cases, active opportunities, appointments, promises, documents, and timeline.
- Highlight risk: no consent, conflicting contact info, duplicate identity, open complaint, stale promise, unresolved finance blocker.
- Support note entry with structured reason codes and visibility controls.

Acceptance criteria:

- Contact attempts cannot be initiated if consent or preference policy blocks the channel.
- Sensitive details must respect role permissions.
- Timeline entries must be immutable after finalization, with corrections added as new entries.

### 5.4 Vehicle Match

Purpose: recommend the best sellable vehicle for a customer and explain alternatives.

Required capabilities:

- Match by budget, body style, mileage, features, readiness, availability, finance fit, trade context, and market urgency.
- Show primary match, close alternatives, substitution reasons, and readiness blockers.
- Flag unavailable, held, pending delivery, service-blocked, title-blocked, or pricing-review vehicles.
- Explain gross opportunity, discount sensitivity, days-in-stock, and scarcity signals where authorized.

Acceptance criteria:

- Recommendations must never present a blocked vehicle as sellable without the blocker visible.
- Vehicle economics visible to salespeople must follow permission policy.
- Every recommendation must include at least one reason and one disqualifier or caveat when relevant.

### 5.5 Deal Workspace

Purpose: manage the commercial deal from scenario through approval, finance, and delivery.

Required capabilities:

- Create deal from an opportunity and selected vehicle.
- Capture needs analysis, trade status, quote scenarios, discount requests, manager approvals, customer promises, finance handoff, documents, delivery checklist, and close/lost outcome.
- Show current deal stage, blockers, margin bands, exception status, approvals, and version history.
- Support manager desk review and return-to-seller reason.

Acceptance criteria:

- Each quote scenario must be versioned.
- Any policy exception must create an approval request.
- Finance handoff cannot be marked ready while required fields or documents are missing.
- Lost deals must capture reason, competitor or alternative where known, and reactivation date where appropriate.

### 5.6 Manager Control Tower

Purpose: help managers intervene before revenue is lost.

Required capabilities:

- Show SLA breaches, unowned opportunities, stale deals, high-intent leads, blocked deliveries, approval backlog, forecast changes, discount exceptions, and coaching opportunities.
- Allow bulk triage for assignment, escalation, queue movement, and coaching notes.
- Provide drilldown from summary metric to underlying records.
- Separate operational backlog from forecast risk.

Acceptance criteria:

- Every alert must link to actionable records.
- Manager intervention must be logged with reason and expected follow-up.
- Forecast changes must distinguish system projection from manager override.

### 5.7 Promise Ledger

Purpose: prevent verbal or informal customer commitments from being lost.

Required capabilities:

- Capture promises made to customers and internal promises needed to fulfill them.
- Track owner, due date, status, customer visibility, evidence, and blocker.
- Escalate overdue promises.

Acceptance criteria:

- A closed deal cannot hide unresolved promises.
- Promise completion must capture evidence or a structured exception.

### 5.8 Delivery Readiness

Purpose: coordinate final delivery with sales, finance, documents, and vehicle readiness.

Required capabilities:

- Show checklist by deal and vehicle.
- Track finance cleared, docs ready, vehicle ready, appointment set, customer confirmed, delivery completed.
- Create tasks for blockers and handoffs.

Acceptance criteria:

- Delivery-ready status requires all configured checklist items to pass or be explicitly waived by an authorized role.
- Waivers require reason, approver, timestamp, and expiration where applicable.

## 6. Enterprise capabilities ordinary systems often miss

| Capability | Ordinary system behavior | Enterprise console behavior |
| --- | --- | --- |
| Explainable prioritization | Static task list | Ranked action queue with reasons, SLA risk, and manager override |
| Cross-domain readiness | Sales sees only lead/deal | Sales sees inventory, docs, finance, appointments, and delivery blockers |
| Policy-aware decisions | Free-text discount and promise handling | Approval workflows, authority limits, versioned quotes, audit trail |
| Forecast quality | Manual pipeline guess | Explainable forecast with confidence, stage evidence, and override tracking |
| Data-quality recovery | Bad data quietly persists | Dedupe, missing-field alerts, stale next-action rules, reason-code discipline |
| Customer promise control | Notes buried in timeline | Promise ledger with owners, due dates, evidence, and escalation |
| Manager intervention | Reactive review meetings | Live control tower for stalled revenue, SLA breaches, and coaching moments |
| Integration resilience | Sync failure is invisible | Reconciliation queue, source ownership, retry state, and exception recovery |

## 7. Functional requirements

| ID | Requirement | Priority | Primary workflow |
| --- | --- | --- | --- |
| SAL-PRD-001 | Provide role-based landing views for sales, BDC, managers, finance, delivery, and executives. | Must | SAL-WF-002, SAL-WF-015 |
| SAL-PRD-002 | Maintain an explainable ranked work queue for each user. | Must | SAL-WF-002, SAL-WF-018 |
| SAL-PRD-003 | Require owner, stage, next action, and freshness status on every active opportunity. | Must | SAL-WF-003 |
| SAL-PRD-004 | Support lead intake with source, consent, vehicle interest, and dedupe review. | Must | SAL-WF-001 |
| SAL-PRD-005 | Support appointment creation, confirmation, arrival, no-show, and recovery. | Must | SAL-WF-004, SAL-WF-005 |
| SAL-PRD-006 | Provide vehicle recommendation and alternatives with visible readiness blockers. | Must | SAL-WF-006 |
| SAL-PRD-007 | Create and manage deals from qualified opportunities. | Must | SAL-WF-008 |
| SAL-PRD-008 | Version quote scenarios and require approvals for configured exceptions. | Must | SAL-WF-009, SAL-WF-010 |
| SAL-PRD-009 | Track finance handoff readiness and return reasons. | Must | SAL-WF-011 |
| SAL-PRD-010 | Track delivery readiness checklist and customer promises. | Must | SAL-WF-012, SAL-WF-014 |
| SAL-PRD-011 | Provide manager control tower alerts and drilldowns. | Must | SAL-WF-018 |
| SAL-PRD-012 | Provide forecast snapshots with confidence and override history. | Should | SAL-WF-015 |
| SAL-PRD-013 | Provide integration failure and reconciliation queues. | Should | SAL-WF-016 |
| SAL-PRD-014 | Provide data-quality recovery workflows. | Should | SAL-WF-017 |
| SAL-PRD-015 | Provide controlled configuration for queues, SLA targets, reason codes, and approval policy. | Must | All |

## 8. Non-functional requirements

| ID | Requirement | Target |
| --- | --- | --- |
| SAL-NFR-001 | Auditability | All stage, owner, quote, approval, promise, and handoff changes are attributable. |
| SAL-NFR-002 | Explainability | Scores, queue rankings, recommendations, and forecasts show reason codes. |
| SAL-NFR-003 | Permission control | Sensitive economics, customer details, overrides, and configuration are role-gated. |
| SAL-NFR-004 | Recoverability | Failed integrations and incomplete writes create visible recovery work. |
| SAL-NFR-005 | Performance | Primary work queues should load fast enough for repeated daily use; target sub-2-second perceived load after initial app load. |
| SAL-NFR-006 | Mobile tolerance | Core triage and outcome logging should work on tablet/mobile widths even if manager analytics remain desktop-first. |
| SAL-NFR-007 | Data lineage | Cross-domain projections identify source domain, source record, last refresh, and stale status. |
| SAL-NFR-008 | Configuration safety | Policy changes require owner, effective date, description, and rollback path. |

## 9. Permissions model

| Action | Salesperson | BDC | Manager | Finance | Delivery | Executive | Admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| View assigned opportunities | Yes | Yes | Team | Related | Related | Rollup | Configurable |
| Reassign opportunity | Request | Request | Yes | No | No | No | Configurable |
| Create deal | Yes | No | Yes | No | No | No | Configurable |
| Create quote scenario | Yes | No | Yes | Related | No | No | Configurable |
| Approve discount exception | No | No | Yes | No | No | Policy view | Configurable |
| View sensitive gross detail | Limited | No | Yes | Related | No | Rollup | Configurable |
| Mark finance ready | No | No | Review | Yes | No | Configurable |
| Mark delivery complete | No | No | Review | No | Yes | No | Configurable |
| Configure policy | No | No | Limited | Limited | No | Approve | Yes |
| Export operational data | No | No | Limited | Limited | No | Yes | Configurable |

## 10. Reporting requirements

Minimum reporting set:

- Lead speed: first response time, contacted rate, appointment conversion, no-show recovery.
- Pipeline health: active opportunities, stage aging, next-action compliance, stalled value.
- Deal quality: quote-to-close, approval cycle time, discount exception rate, finance return rate.
- Inventory effectiveness: vehicle match acceptance, alternative match conversion, days-in-stock movement.
- Forecast: committed deals, weighted forecast, confidence trend, manager overrides.
- Execution: overdue tasks, promises overdue, handoff cycle time, delivery blockers.
- Data quality: duplicate rate, missing required fields, stale records, invalid contact attempts blocked.

## 11. Release gates

The first production candidate should not launch until:

- roles and permissions are reviewed by dealership leadership;
- stage names, reason codes, and SLA targets are configured;
- at least one workflow from lead intake to delivery readiness works end to end in a test environment;
- no active opportunity can exist without owner, stage, and next action;
- quote scenario versioning and approval audit are proven;
- data-quality and integration exception queues are visible;
- pilot users can complete daily work without duplicate entry into a second console.

## 12. Open leadership decisions

These values should be decided before implementation becomes operational:

- first response SLA by channel and business hours;
- assignment rules and round-robin exceptions;
- salesperson, BDC, and manager authority limits;
- discount approval thresholds;
- gross visibility by role;
- required deal fields before finance handoff;
- required delivery checklist items;
- allowed customer communication channels;
- lost-reason taxonomy;
- forecast categories and manager override policy.
