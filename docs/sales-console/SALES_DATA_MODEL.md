# Sales Console Data Model

**Status:** Build-ready planning baseline; documentation only  
**Product area:** `/sales`  
**Companion docs:** `SALES_CONSOLE_PRODUCT_REQUIREMENTS.md`, `ENTERPRISE_SALES_ARCHITECTURE.md`, `SALES_ALGORITHMS_AND_DECISION_LOGIC.md`

## 1. Data model principles

The Sales Console should own commercial selling records and reference other domains for their authoritative facts. It should not quietly duplicate customer, inventory, document, appointment, dispatch, finance, or accounting systems.

Core principles:

- Sales owns opportunities, deals, quote scenarios, approvals, sales plays, forecasts, promises, and sales-specific events.
- Customer domain owns identity, consent, contact preferences, household, and relationship history.
- Inventory domain owns vehicle identity, readiness, location, market signals, holds, and lifecycle state.
- Documents domain owns required document definitions, receipt, validation, and restrictions.
- Appointments domain owns scheduling and attendance records.
- Tasks / Dispatch owns durable operational work items and escalation.
- Every cross-domain reference must include source domain, source record id, last refresh time, and stale indicator where applicable.

## 2. Core entity map

| Entity | Owned by | Purpose |
| --- | --- | --- |
| SalesOpportunity | Sales | Commercial pursuit tied to a customer, source, stage, owner, and next action |
| SalesDeal | Sales | Active or historical deal package created from an opportunity |
| QuoteScenario | Sales | Versioned customer-facing or manager-reviewed deal scenario |
| ApprovalRequest | Sales | Controlled exception workflow for pricing, discount, promise, or policy overrides |
| SalesTaskLink | Sales / Tasks | Sales context attached to a durable task owned by Tasks / Dispatch |
| SalesInteractionRef | Sales / Customers | Sales interpretation of a contact event owned by Customer timeline |
| VehicleCandidate | Sales / Inventory | Scored vehicle recommendation for an opportunity or deal |
| TradeIntent | Sales | Customer trade signal and handoff state before formal appraisal ownership |
| CustomerPromise | Sales | Commitment made to or on behalf of the customer |
| Handoff | Sales | Structured transition between sales, BDC, manager, finance, inventory, delivery |
| ForecastSnapshot | Sales | Point-in-time pipeline projection with evidence and overrides |
| SalesPolicy | Sales Admin | Effective-dated rule set for thresholds, authority, SLA, reason codes |
| SalesEvent | Sales | Immutable business event stream for audit, analytics, and recovery |

## 3. Entity requirements

### 3.1 SalesOpportunity

Purpose: represent a sellable opportunity from initial demand through close, loss, nurture, or disqualification.

Required fields:

| Field | Type | Notes |
| --- | --- | --- |
| opportunity_id | UUID/string | Stable sales-owned id |
| customer_ref | CustomerRef | Required after intake; may begin as provisional lead identity |
| source | enum/string | Website, phone, walk-in, referral, marketplace, repeat, service, manual |
| stage | enum | New, Attempting, Contacted, Qualified, Appointment Set, Showed, Working Deal, Finance, Delivery, Closed Won, Lost, Nurture, Disqualified |
| status | enum | Active, Waiting, Blocked, Closed |
| owner_user_id | string | Required for active records |
| owner_team_id | string optional | BDC, floor, internet, manager queue |
| next_action_type | enum | Call, Text, Email, Appointment, Manager Review, Vehicle Search, Quote, Finance Handoff, Delivery Follow-up, Nurture |
| next_action_due_at | datetime | Required while active |
| freshness_state | enum | Fresh, Due Today, At Risk, Stale, Escalated |
| intent_score | number | Output of lead scoring logic |
| priority_score | number | Output of work ranking logic |
| primary_vehicle_ref | VehicleRef optional | Customer's first vehicle of interest |
| budget_min | money optional | Customer stated range |
| budget_max | money optional | Customer stated range |
| purchase_horizon | enum | Now, 7 Days, 30 Days, 90 Days, Future, Unknown |
| trade_intent_id | string optional | Links to TradeIntent |
| finance_intent | enum | Cash, Finance, Lease, Unknown |
| preferred_channel | enum optional | Phone, Text, Email, In Person |
| consent_state_ref | CustomerRef | Read from customer domain |
| lost_reason | enum optional | Required when stage becomes Lost |
| disqualified_reason | enum optional | Required when Disqualified |
| created_at | datetime | System |
| updated_at | datetime | System |

Key invariants:

- Active opportunities require owner, stage, next action, and due date.
- Closed Won opportunities must link to a SalesDeal.
- Lost opportunities require reason and last attempted or actual contact evidence.
- Opportunity owner changes require reason, actor, and timestamp.

### 3.2 SalesDeal

Purpose: hold the active commercial deal package and its state.

Required fields:

| Field | Type | Notes |
| --- | --- | --- |
| deal_id | UUID/string | Stable deal id |
| opportunity_id | string | Required |
| customer_ref | CustomerRef | Required |
| vehicle_ref | VehicleRef | Required unless deal is in vehicle-search stage |
| stage | enum | Draft, Desk Review, Customer Review, Approval Needed, Approved, Finance Handoff, Finance Review, Delivery Ready, Delivered, Closed Won, Closed Lost, Cancelled |
| status | enum | Active, Blocked, Closed |
| owner_user_id | string | Sales owner |
| manager_user_id | string optional | Required once approval or desk review starts |
| finance_owner_user_id | string optional | Required at finance handoff |
| delivery_owner_user_id | string optional | Required at delivery readiness |
| current_quote_scenario_id | string optional | Active scenario |
| deal_health | enum | Healthy, Watch, At Risk, Blocked |
| gross_band | enum optional | Hidden, Negative, Low, Target, Strong, Exceptional |
| approval_state | enum | None, Pending, Approved, Rejected, Expired |
| finance_handoff_state | enum | Not Ready, Ready, Submitted, Returned, Accepted |
| delivery_readiness_state | enum | Not Ready, Blocked, Ready, Scheduled, Delivered |
| blocker_count | integer | Derived |
| created_at | datetime | System |
| updated_at | datetime | System |

Key invariants:

- A deal cannot be Finance Handoff without a customer, vehicle, active quote scenario, required documents, and required approvals.
- A delivered deal cannot have unresolved required customer promises unless waived by an authorized role.
- Closed Lost requires reason and recovery recommendation.

### 3.3 QuoteScenario

Purpose: version every material deal scenario.

Required fields:

| Field | Type | Notes |
| --- | --- | --- |
| quote_scenario_id | UUID/string | Stable id |
| deal_id | string | Required |
| scenario_version | integer | Monotonic per deal |
| scenario_status | enum | Draft, Presented, Accepted, Rejected, Superseded, Expired |
| vehicle_ref | VehicleRef | Required |
| sale_price | money | Role-gated visibility |
| list_price | money optional | From inventory/pricing source |
| discount_amount | money optional | Derived or entered |
| trade_allowance | money optional | From appraisal or manager input |
| payoff_amount | money optional | Sensitive; role-gated |
| fees_total | money optional | Configured or integrated |
| taxes_estimate | money optional | Estimate until authoritative source exists |
| cash_down | money optional | Customer scenario |
| estimated_payment | money optional | Estimate only until lender/finance integration |
| term_months | integer optional | Estimate |
| apr_estimate | percentage optional | Estimate |
| gross_band | enum optional | Do not store exact gross for broad roles unless approved |
| exception_flags | string list | Discount, negative gross, payment promise, finance estimate, policy gap |
| presented_at | datetime optional | Required if Presented |
| accepted_at | datetime optional | Required if Accepted |
| created_by | string | User id |
| created_at | datetime | System |

Key invariants:

- Quote scenarios are append-only after presentation; changes create a new version.
- Any exception flag requiring authority must link to an ApprovalRequest.
- Customer-facing finance estimates must be labeled as estimates until finance confirms terms.

### 3.4 ApprovalRequest

Purpose: control exceptions and preserve authority history.

Required fields:

| Field | Type | Notes |
| --- | --- | --- |
| approval_request_id | UUID/string | Stable id |
| subject_type | enum | Opportunity, Deal, QuoteScenario, Promise, DeliveryChecklist |
| subject_id | string | Required |
| approval_type | enum | Discount, Gross, Price Override, Promise, Waiver, Reassignment, Forecast Override |
| requested_by | string | User id |
| approver_role | enum | Manager, General Manager, Owner, Admin |
| approver_user_id | string optional | Filled when assigned |
| status | enum | Pending, Approved, Rejected, Cancelled, Expired |
| requested_value | json | Structured proposed exception |
| policy_limit | json optional | The configured threshold being exceeded |
| reason_code | enum | Required |
| explanation | string optional | Required for sensitive overrides |
| decision_note | string optional | Required on approve/reject |
| requested_at | datetime | System |
| decided_at | datetime optional | System |

Key invariants:

- Requester cannot approve their own restricted exception unless policy explicitly allows it.
- Expired approvals cannot be used to advance a deal.
- Approval decision must emit a SalesEvent.

### 3.5 CustomerPromise

Purpose: make commitments visible and operational.

Required fields:

| Field | Type | Notes |
| --- | --- | --- |
| promise_id | UUID/string | Stable id |
| customer_ref | CustomerRef | Required |
| opportunity_id | string optional | Required when tied to active sales pursuit |
| deal_id | string optional | Required when tied to deal |
| promise_type | enum | Call Back, Price, Repair, Detail, Document, Delivery, Accessory, Finance Follow-up, Other |
| description | string | Plain language promise |
| made_by_user_id | string | User id |
| owner_user_id | string | User responsible for completion |
| due_at | datetime | Required |
| status | enum | Open, Waiting, Completed, Broken, Waived, Cancelled |
| customer_visible | boolean | Whether promise may be shown externally later |
| evidence_ref | string optional | Document, note, task, or event proof |
| blocker_reason | enum optional | Required when Waiting |
| created_at | datetime | System |
| updated_at | datetime | System |

Key invariants:

- Open promises require owner and due date.
- Completing a promise requires evidence or an approved waiver.
- Broken promise state requires manager visibility.

### 3.6 VehicleCandidate

Purpose: store explainable recommendation results for an opportunity or deal.

Required fields:

| Field | Type | Notes |
| --- | --- | --- |
| vehicle_candidate_id | UUID/string | Stable id |
| opportunity_id | string | Required |
| vehicle_ref | VehicleRef | Required |
| candidate_rank | integer | 1 is highest |
| fit_score | number | Customer fit |
| readiness_score | number | Operational readiness |
| economics_score | number | Dealership economics |
| urgency_score | number | Market or aging urgency |
| composite_score | number | Weighted total |
| recommendation_type | enum | Primary, Alternative, Stretch, Not Recommended |
| reason_codes | string list | Explainability |
| disqualifier_codes | string list | Availability, title, service, price, budget, mileage, feature mismatch |
| generated_at | datetime | System |
| generated_by_model_version | string | Algorithm/policy version |

Key invariants:

- Blocked or unavailable vehicles cannot be Primary unless the blocker is visible and override-approved.
- Candidate rankings must be reproducible from stored inputs or versioned snapshot references.

### 3.7 TradeIntent

Purpose: represent trade signals before formal appraisal completion.

Required fields:

| Field | Type | Notes |
| --- | --- | --- |
| trade_intent_id | UUID/string | Stable id |
| opportunity_id | string | Required |
| customer_ref | CustomerRef | Required |
| year | integer optional | Customer-provided |
| make | string optional | Customer-provided |
| model | string optional | Customer-provided |
| mileage | integer optional | Customer-provided |
| payoff_known | boolean | Sensitive |
| payoff_amount | money optional | Role-gated |
| condition_notes | string optional | Customer-provided |
| appraisal_status | enum | Not Needed, Needed, Requested, In Progress, Completed, Declined |
| appraisal_ref | string optional | External or inventory/appraisal domain |
| created_at | datetime | System |
| updated_at | datetime | System |

Key invariants:

- Sales can capture intent, but authoritative appraisal values must come from the appraisal or inventory process once available.
- Payoff details are sensitive and must be role-gated.

### 3.8 Handoff

Purpose: make cross-role transitions explicit and measurable.

Required fields:

| Field | Type | Notes |
| --- | --- | --- |
| handoff_id | UUID/string | Stable id |
| subject_type | enum | Opportunity, Deal, Promise, Delivery |
| subject_id | string | Required |
| from_role | enum | Sales, BDC, Manager, Finance, Inventory, Delivery |
| to_role | enum | Sales, BDC, Manager, Finance, Inventory, Delivery |
| from_user_id | string | Required |
| to_user_id | string optional | May be queue-based |
| status | enum | Requested, Accepted, Returned, Cancelled, Completed |
| reason_code | enum | Required |
| required_by_at | datetime optional | SLA |
| accepted_at | datetime optional | System |
| completed_at | datetime optional | System |
| return_reason | enum optional | Required when Returned |
| notes | string optional | Structured enough for review |

Key invariants:

- Returned handoffs must include reason and next owner.
- Handoffs should create or link to durable task records when work is required.

### 3.9 ForecastSnapshot

Purpose: keep forecast history explainable instead of overwriting weekly judgment.

Required fields:

| Field | Type | Notes |
| --- | --- | --- |
| forecast_snapshot_id | UUID/string | Stable id |
| snapshot_period | string | Day, week, month, custom period |
| scope_type | enum | User, Team, Store, Company |
| scope_id | string | Required |
| created_by | string | User or system |
| generated_at | datetime | System |
| committed_count | integer | Deals expected to close |
| weighted_count | decimal | Probability-weighted unit count |
| committed_gross_band_total | string optional | Role-gated banded forecast |
| confidence | enum | Low, Medium, High |
| system_projection | json | Stored model output |
| manager_override | json optional | Manual override with reason |
| reason_codes | string list | Explainability |

Key invariants:

- Manager overrides never delete system projection.
- Forecast snapshots are point-in-time and should not be updated after finalization.

### 3.10 SalesPolicy

Purpose: provide effective-dated configuration for controlled selling logic.

Required fields:

| Field | Type | Notes |
| --- | --- | --- |
| sales_policy_id | UUID/string | Stable id |
| policy_area | enum | SLA, Assignment, Approval, Quote, Forecast, Stage, ReasonCode, Visibility |
| version | integer | Monotonic per area |
| status | enum | Draft, Active, Retired |
| effective_from | datetime | Required for Active |
| effective_to | datetime optional | Required when retired |
| owner_user_id | string | Business owner |
| config | json | Structured policy payload |
| change_reason | string | Required |
| created_at | datetime | System |
| activated_at | datetime optional | System |

Key invariants:

- Active policy changes require owner, reason, and effective time.
- Historical events must retain the policy version used at the time.

## 4. Reference objects

Reference objects should be lightweight projections, not duplicate masters.

```text
CustomerRef
- source_domain: "customers"
- customer_id
- display_name
- contact_preference_summary
- consent_status
- last_refreshed_at
- stale_state

VehicleRef
- source_domain: "inventory"
- vehicle_id
- vin
- stock_number
- display_label
- availability_state
- readiness_state
- price_band_or_visible_price
- last_refreshed_at
- stale_state

DocumentRequirementRef
- source_domain: "documents"
- requirement_id
- status
- blocker_state
- last_refreshed_at

AppointmentRef
- source_domain: "appointments"
- appointment_id
- scheduled_at
- status
- last_refreshed_at
```

## 5. Sales events

SalesEvent is the immutable audit and analytics backbone.

Minimum event types:

| Event | Emitted when |
| --- | --- |
| OpportunityCreated | Lead or manual opportunity enters sales |
| OpportunityAssigned | Owner or queue changes |
| OpportunityStageChanged | Stage changes |
| NextActionSet | Next action is created or changed |
| InteractionLogged | Customer contact evidence is attached |
| VehicleCandidateGenerated | Recommendation set is generated |
| DealCreated | Deal starts from opportunity |
| QuoteScenarioCreated | Quote scenario version is created |
| QuoteScenarioPresented | Scenario is presented to customer |
| ApprovalRequested | Policy exception requires review |
| ApprovalDecided | Approver approves or rejects |
| HandoffRequested | Cross-role handoff begins |
| HandoffReturned | Recipient returns with reason |
| FinanceHandoffSubmitted | Deal sent to finance |
| DeliveryReadinessChanged | Delivery checklist state changes |
| PromiseCreated | Customer or internal promise is recorded |
| PromiseCompleted | Promise is fulfilled |
| OpportunityClosedWon | Sale completed |
| OpportunityClosedLost | Opportunity lost |
| ForecastSnapshotCreated | Forecast point-in-time view is saved |

Event envelope fields:

| Field | Type |
| --- | --- |
| event_id | UUID/string |
| event_type | enum |
| subject_type | enum |
| subject_id | string |
| actor_user_id | string or system |
| occurred_at | datetime |
| policy_version_refs | string list |
| payload | json |
| correlation_id | string optional |
| causation_id | string optional |

## 6. Derived read models

| Read model | Built from | Used by |
| --- | --- | --- |
| SalespersonTodayView | Opportunities, Tasks, Appointments, Deals, Promises, VehicleCandidate | Daily seller queue |
| LeadOpsQueueView | Opportunities, Customer refs, SLA policy, assignment policy | BDC and manager lead routing |
| DealWorkspaceView | Deal, QuoteScenario, ApprovalRequest, Handoff, Documents, Vehicle refs | Deal execution |
| ManagerControlTowerView | Opportunities, Deals, Tasks, ForecastSnapshot, Events | Manager intervention |
| DeliveryReadinessView | Deal, Documents, Vehicle readiness, Promises, Appointments | Delivery coordination |
| ForecastRollupView | Deal, Opportunity, ForecastSnapshot, Events | Manager and executive forecast |
| DataQualityQueueView | Opportunities, refs, required fields, duplicate candidates | Cleanup workflows |

## 7. Data quality rules

Minimum rules:

- Active opportunity missing owner: critical.
- Active opportunity missing next action: critical.
- Active opportunity next action overdue: warning or critical based on SLA.
- Opportunity has stale customer reference: warning.
- Vehicle candidate references unavailable vehicle: critical if primary, warning if alternative.
- Deal in finance handoff missing required document: critical.
- Quote scenario accepted without required approval: critical.
- Customer promise overdue: warning, then escalation.
- Duplicate customer or opportunity candidate above threshold: review.
- Lost or disqualified opportunity missing reason: critical.

## 8. Suggested implementation order

1. SalesPolicy controlled values: stages, reason codes, SLA targets, role permissions.
2. SalesOpportunity with owner, stage, next action, and event trail.
3. SalespersonTodayView and LeadOpsQueueView.
4. CustomerRef and VehicleRef projections.
5. VehicleCandidate recommendation output.
6. SalesDeal and QuoteScenario versioning.
7. ApprovalRequest and manager control workflows.
8. CustomerPromise and Handoff.
9. DeliveryReadinessView and finance handoff readiness.
10. ForecastSnapshot and manager override history.
11. DataQualityQueueView and integration reconciliation support.

## 9. Open data decisions

- whether exact gross is stored in Sales or only referenced from an authoritative finance/accounting source;
- how long provisional lead identities can exist before customer merge/review;
- which customer contact details are visible to which roles;
- whether quote scenarios store finance estimates directly or reference a finance-calculation service;
- whether vehicle holds are owned by Inventory or created by Sales with Inventory approval;
- retention period for audit events, timeline entries, and policy versions;
- whether manager forecast override requires dual approval above a threshold.
