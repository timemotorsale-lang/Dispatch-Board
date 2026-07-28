# Enterprise Sales Console Architecture

**Version:** 1.0 planning baseline  
**Status:** Target architecture; no code authorization  
**Primary routes:** `/sales`, `/sales/leads`, `/sales/pipeline`, `/sales/deals/[dealId]`, `/sales/showroom`, `/sales/forecast`, `/sales/control-tower`, `/sales/admin`

## 1. Architectural position

The Sales Console remains a module in the existing Next.js modular monolith and PostgreSQL database. It reuses the current authentication, organization, location, user, role, activity, task, appointment, customer, vehicle, command, audit, event, and outbox foundations.

```text
Time Motor Sales operating system
  Shared identity, policy, audit, event, and reliability platform
  Customers: relationship truth
  Inventory: vehicle and readiness truth
  Appointments: scheduled-intent truth
  Dispatch: execution truth
  Documents: readiness evidence
  Sales: revenue decisions, deal progress, approvals, and forecasts
```

The design favors explicit commands and purpose-built read models. A dashboard card is never allowed to become an independent state owner.

## 2. Product layers

### 2.1 System of engagement

- salesperson Today queue;
- lead response workspace;
- pipeline and deal workbench;
- Shopper 360 sales lens;
- showroom and appointment board;
- manager control tower;
- forecast and coaching workspaces.

### 2.2 Decision layer

- lead priority and response risk;
- lead assignment recommendation;
- next-best-action recommendation;
- customer-to-vehicle fit;
- deal health and stall risk;
- manager intervention priority;
- forecast projection;
- lost-lead reactivation;
- sales-process and data-quality conformance.

### 2.3 Orchestration layer

- command validation;
- lifecycle transitions;
- playbook and cadence execution;
- task and appointment bridges;
- approval routing;
- exception handling;
- delivery handoff;
- integration reconciliation.

### 2.4 Authoritative data layer

- app-owned Sales records;
- permission-filtered projections from Customers, Inventory, Appointments, Tasks, and Documents;
- source-attributed external observations;
- immutable decision, activity, and audit evidence.

## 3. Sales-owned domain model

| Entity | Responsibility | Core invariant |
| --- | --- | --- |
| `SalesOpportunity` | One customer purchase intent across its commercial lifecycle | An active opportunity has owner, stage, next action, due time, source, and version |
| `OpportunityVehicleInterest` | Ranked vehicle interest and alternatives | Interest, suitability, and customer commitment are separate states |
| `SalesDeal` | Active commercial transaction derived from a qualified opportunity | One primary active deal per opportunity unless a manager-authorized split is recorded |
| `DealParticipant` | Buyer, co-buyer, decision participant, referral, or internal collaborator | Role and effective period are explicit |
| `DealTrade` | Link to a proposed trade and its valuation workflow | Sales never overwrites Inventory appraisal truth |
| `DealScenario` | Versioned price/payment/term/down/trade presentation | Immutable after presentation; revisions create a new version |
| `DealQuote` | Customer-facing configured commercial offer | Quote identifies scenario, expiry, approvals, presenter, and acceptance state |
| `SalesApprovalRequest` | Governed exception or authority request | Decision, reason, scope, actor, and expiry are retained |
| `SalesPromise` | Commitment made to a customer | Owner, due time, status, and proof are required |
| `SalesCadenceEnrollment` | Customer/opportunity participation in an approved playbook | Current step, next run, pauses, exit reason, and consent check are explicit |
| `SalesOutcome` | Won, lost, abandoned, duplicate, or disqualified result | Terminal outcome requires a controlled reason and evidence |
| `SalesForecastSubmission` | Seller or manager judgment for a period | Submitted value is versioned and never confused with predictive output |
| `SalesDecisionRecord` | Explainable algorithm result | Inputs, source freshness, version, result, reasons, confidence, and override are retained |
| `SalesIntervention` | Manager coaching or deal-assist action | Trigger, owner, expected effect, due time, and result are explicit |
| `SalesIntegrationRecord` | External identity and synchronization state | Source ownership, cursor/version, status, and reconciliation evidence are retained |

Customer contact points, consent, vehicle lifecycle, appointment scheduling, document verification, and Dispatch task status remain owned by their existing domains.

## 4. Lifecycle state machines

### 4.1 Opportunity

```text
NEW
  -> ATTEMPTING_CONTACT
  -> ENGAGED
  -> QUALIFIED
  -> APPOINTMENT_SET
  -> SHOWROOM
  -> DEAL_ACTIVE
  -> WON

Any nonterminal state
  -> NURTURE
  -> DISQUALIFIED
  -> LOST
  -> DUPLICATE

NURTURE or LOST
  -> REACTIVATED
  -> ENGAGED
```

Rules:

- transitions are command-based;
- stage cannot advance solely because a task was completed;
- stages requiring customer evidence specify that evidence;
- active states require an owner and future action;
- terminal states require reason codes;
- reopening retains prior lifecycle history.

### 4.2 Deal

```text
DRAFT
  -> NEEDS_ANALYSIS
  -> VEHICLE_CONFIRMED
  -> APPRAISAL_PENDING
  -> STRUCTURING
  -> APPROVAL_PENDING
  -> PRESENTED
  -> NEGOTIATING
  -> CUSTOMER_ACCEPTED
  -> FINANCE_HANDOFF
  -> DOCUMENT_READY
  -> DELIVERY_READY
  -> DELIVERED
  -> CLOSED

Any applicable state
  -> BLOCKED
  -> CANCELLED
```

Advancement gates distinguish commercial agreement, finance status, document readiness, vehicle readiness, and delivery completion. “Sold” must never hide an unfinished operational obligation.

## 5. Service boundaries

| Service | Responsibility |
| --- | --- |
| `SalesOpportunityService` | Intake, qualification, transition, ownership, next action, close, reopen |
| `SalesRoutingService` | Eligibility, assignment recommendation, acceptance, reassignment |
| `SalesPriorityService` | Priority, response risk, freshness, and queue ranking |
| `SalesNextActionService` | Candidate actions, hard constraints, recommendation, explanation |
| `SalesDealService` | Deal creation, lifecycle commands, participants, blockers, outcomes |
| `SalesScenarioService` | Versioned deal scenarios and comparison |
| `SalesQuoteService` | Quote creation, presentation, expiry, acceptance, rejection |
| `SalesApprovalService` | Authority evaluation, routing, decision, expiry, escalation |
| `SalesPromiseService` | Record, assign, fulfill, miss, recover |
| `SalesCadenceService` | Approved playbooks, enrollment, branching, pause, exit |
| `SalesInventoryMatchService` | Customer-to-vehicle candidate retrieval and explainable ranking |
| `SalesShowroomService` | Sales projection over appointment arrival and deal progression |
| `SalesForecastService` | Seller, manager, deterministic, and predictive forecast views |
| `SalesInterventionService` | Manager queues, coaching actions, and outcome measurement |
| `SalesPerformanceService` | KPI definitions, cohort-safe metrics, attribution, and drilldown |
| `SalesReadService` | Permission-filtered Today, pipeline, deal, control-tower, and forecast models |
| `SalesIntegrationService` | Adapter commands, idempotency, mapping, reconciliation, retry |

## 6. Command architecture

Representative commands:

- `IntakeSalesOpportunity`
- `AcknowledgeSalesOpportunity`
- `AssignSalesOpportunity`
- `RecordSalesContactOutcome`
- `QualifySalesOpportunity`
- `SetSalesNextAction`
- `ScheduleSalesAppointment`
- `RecordShowroomArrival`
- `CreateSalesDeal`
- `AttachVehicleInterest`
- `RequestTradeAppraisal`
- `CreateDealScenario`
- `RequestSalesApproval`
- `DecideSalesApproval`
- `PresentDealQuote`
- `RecordCustomerQuoteResponse`
- `RecordSalesPromise`
- `CompleteSalesPromise`
- `HandoffDealToFinance`
- `ReviewDeliveryReadiness`
- `CloseSalesOutcome`
- `ReactivateSalesOpportunity`
- `SubmitSalesForecast`
- `RecordManagerIntervention`

Every meaningful command:

1. authenticates actor and organization;
2. validates role, location, ownership, record version, and state;
3. checks required evidence, consent, and policy;
4. writes the domain state change;
5. appends activity and audit evidence;
6. writes cross-domain bridge/outbox effects atomically where applicable;
7. returns an updated purpose-built read model.

Create, transition, approval, presentation, bridge, and integration commands require idempotency identity.

## 7. Read models

### Salesperson Today

- prioritized work items;
- explanation, age, SLA, and customer context;
- next executable action;
- appointments and showroom status;
- active deals and customer promises;
- personal target progress;
- work blocked by another owner.

### Lead Operations

- new/unacknowledged;
- response at risk;
- mine/team/unassigned;
- engaged without next action;
- nurture due;
- reactivation candidates;
- source and quality lenses.

### Pipeline

- stage, age, owner, next action, vehicle, expected close, forecast category;
- stage-entry and change history;
- deal-health components;
- missing-evidence warnings;
- saved manager views.

### Deal Workspace

- customer, participants, vehicle, trade, scenario, quote, approval, promise, finance, document, and delivery context;
- blockers and dependencies;
- immutable commercial history;
- recommended next action;
- collaboration and intervention history.

### Manager Control Tower

- material exceptions ranked by recoverable value, urgency, customer harm, and confidence;
- lead response leakage;
- showroom waits;
- stuck approvals;
- stale pipeline;
- inventory-demand mismatches;
- forecast changes;
- performance and process conformance;
- integration/data-quality failures.

## 8. Event model

Example events:

- `sales.opportunity.intaken`
- `sales.opportunity.assigned`
- `sales.opportunity.contact-recorded`
- `sales.opportunity.stage-changed`
- `sales.opportunity.next-action-set`
- `sales.appointment.requested`
- `sales.showroom.arrived`
- `sales.deal.created`
- `sales.deal.blocked`
- `sales.scenario.created`
- `sales.approval.requested`
- `sales.approval.decided`
- `sales.quote.presented`
- `sales.quote.responded`
- `sales.promise.recorded`
- `sales.promise.missed`
- `sales.deal.finance-handed-off`
- `sales.delivery.readiness-reviewed`
- `sales.outcome.closed`
- `sales.opportunity.reactivated`
- `sales.forecast.submitted`
- `sales.decision.evaluated`
- `sales.decision.overridden`

Events carry organization, location where applicable, actor/system identity, aggregate ID, customer ID, vehicle ID where applicable, correlation ID, causation ID, occurred time, algorithm/policy version where applicable, and safe metadata.

## 9. Permissions and authority

Initial capabilities:

- `sales.view-own`
- `sales.view-team`
- `sales.view-financial`
- `sales.intake`
- `sales.assign`
- `sales.transition`
- `sales.manage-deal`
- `sales.create-scenario`
- `sales.present-quote`
- `sales.request-approval`
- `sales.decide-approval`
- `sales.manage-playbook`
- `sales.submit-forecast`
- `sales.override-forecast`
- `sales.export`
- `sales.admin`

Sensitive field groups include customer contact, trade economics, proposed finance terms, gross, manager notes, and integration payloads. Access is server-enforced by organization, location, role, team, ownership, purpose, field class, and command.

The Sales Console must not:

- determine creditworthiness;
- infer protected-class information;
- recommend discriminatory treatment;
- present a finance term not supplied by an authorized source;
- autonomously reduce price, approve exceptions, reserve inventory, contact an opted-out customer, or execute a contract.

## 10. Integration architecture

Adapters may later connect CRM/lead providers, DMS, website/chat, email/SMS/voice, market data, appraisal, digital retail, lender, e-signature, and accounting systems.

Integration rules:

- app-owned IDs remain stable;
- external IDs are source-qualified;
- observations record source and freshness;
- ownership conflicts are reconciled by an approved authority map;
- inbound commands are idempotent;
- outbound deliveries use outbox state;
- failures are visible and retryable;
- replay cannot duplicate customers, opportunities, tasks, quotes, or outcomes;
- a disconnected external system degrades explicitly rather than fabricating current state.

## 11. Reliability and enterprise controls

- optimistic concurrency on sales aggregates;
- append-only decisions, approvals, quote versions, outcomes, and audit history;
- feature flags by capability, location, cohort, and percentage;
- kill switch that preserves all records;
- configurable business hours and SLA calendars;
- job idempotency and lease protection;
- measurable data freshness and projection lag;
- retained retry and reconciliation history;
- export audit and rate limits;
- backup/restore rehearsal;
- accessible responsive UI;
- deterministic fallback when optional AI is unavailable.

## 12. Architecture decisions

- **SAL-ADR-001:** Sales is a module in the shared operating system, not a separate deployment.
- **SAL-ADR-002:** Customers and Inventory remain authoritative for customer and vehicle truth.
- **SAL-ADR-003:** An active opportunity always has owner, stage, next action, and due time.
- **SAL-ADR-004:** Deal scenarios and quotes are immutable versions after presentation.
- **SAL-ADR-005:** Recommendations advise; authorized commands decide.
- **SAL-ADR-006:** Seller judgment, manager judgment, deterministic forecast, and predictive forecast remain distinguishable.
- **SAL-ADR-007:** Activity, audit, decision, and integration evidence are separate concerns.
- **SAL-ADR-008:** Native domain bridges precede external-system dependency.
- **SAL-ADR-009:** AI is optional and governed; core selling workflows remain deterministic.
- **SAL-ADR-010:** “Sold” is not equivalent to delivered or operationally complete.

