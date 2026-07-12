# Customer Control Center Decision Engine

**Product:** Time Motor Sales Dispatch Board  
**Module:** Customers / Customer Control Center  
**Version:** 1.0 implementation baseline  
**Date:** 2026-07-12  
**Status:** Proposed source of truth for implementation  
**Related documents:** `CUSTOMERS_ARCHITECTURE.md`, `CUSTOMERS_IMPLEMENTATION_MILESTONES.md`, `CUSTOMERS_MVP_ROLLOUT_ROADMAP.md`

---

## 1. Purpose

The Customer Control Center is the customer operations module inside the Dispatch Board. It must continuously answer:

1. Who is the customer?
2. What is happening now?
3. What should happen next?
4. Who owns that action?
5. When is it due?
6. What is blocking progress?
7. Has the customer received the promised update?
8. Was the outcome completed and documented?

This specification converts the CRM decision-engine concept into an implementation contract. It defines the first production boundary, domain rules, decision outputs, workflows, safety controls, APIs, persistence, tests, and delivery sequence.

The system is not a general-purpose CRM, a financing decision system, or a replacement for the dealership management system. It is an explainable operations layer that connects customers, leads, cases, appointments, and Dispatch tasks.

## 2. Product decisions

The following decisions are binding for the first implementation:

- Build the Customer Control Center inside the existing Next.js modular monolith and PostgreSQL database.
- Keep the existing `/customers`, `/customers/customer-360`, and `/customers/resolutions` compositions while replacing preview data with server-authoritative read models.
- Use deterministic rules, weighted scores, and explicit state machines before predictive models or autonomous agents.
- Treat every recommendation as advice. The server remains authoritative and a permitted human may override it.
- Create operational work through the existing Dispatch task system instead of building a second task engine.
- Store inputs, version, reason codes, result, override, and outcome for every material decision.
- Never use customer value, protected traits, or proxies for protected traits to reduce service, complaint handling, safety response, or legal compliance.

## 3. Scope

### 3.1 Release 1: operational foundation

Release 1 includes:

- durable customer identity and duplicate candidates
- Customer 360 timeline and related-record projections
- leads with owner, stage, next action, and follow-up due time
- customer cases with category, severity, owner, SLA, promised update, and resolution evidence
- decision-record infrastructure
- lead priority, lead routing, next-best-action, case severity, and SLA/escalation rules
- Customer-to-Task and Customer-to-Appointment bridges
- manager queues for overdue, unassigned, blocked, escalated, and awaiting-update work
- explainable recommendations and logged human overrides

### 3.2 Deferred

The following are deliberately deferred until outcome data and operational controls are reliable:

- machine-learned conversion, churn, show, or preference predictions
- dynamic weight optimization
- automated financing approval or eligibility decisions
- autonomous outbound messages
- external CRM/DMS synchronization beyond stable adapter contracts
- household scoring and customer relationship value automation
- service-to-sales and trade-cycle prediction

Deferred capabilities must not be simulated with authoritative-looking placeholder scores.

## 4. Current implementation baseline

As of this document date:

- The three customer routes render approved interactive presentation baselines.
- `customer-console-read-service.ts` returns preview read models and hard-coded operating data.
- The Prisma schema has a minimum durable `Customer` record and appointment participants can reference a customer.
- Tasks primarily retain customer display text and do not yet have an authoritative customer relationship.
- Customer-owned leads, cases, interactions, decision records, SLA records, and promised updates are not yet durable production entities.

Implementation work must preserve the distinction between preview behavior and persisted behavior. A queue is not production-ready until its values are derived from permission-filtered records and its commands mutate server-authoritative state.

## 5. Architecture

### 5.1 Decision layers

Use the following order of operation:

1. **Eligibility rules** remove invalid choices and enforce policy.
2. **State-machine rules** determine which transitions and actions are allowed.
3. **Weighted scoring** ranks the remaining choices.
4. **Human review** approves or overrides decisions where required.
5. **Outcome capture** records what happened so future calibration is evidence-based.

AI may later summarize context or draft editable text, but it must not silently change ownership, priority, SLA, customer consent, financing outcomes, or case closure.

### 5.2 Code boundaries

```text
src/server/customers/
  domain/       types, enums, invariants, state transitions
  decisions/    pure versioned evaluators and reason-code catalogs
  policies/     authorization and field projection
  repositories/ persistence only
  services/     transactional commands and orchestration
  read-models/  permission-filtered queue and Customer 360 projections
  validation/   command and query validation

src/features/customers/
  customer dashboard, Customer 360, resolution, and decision explanation UI

src/app/api/customers/
  focused query and command routes
```

Decision evaluators must be pure functions: the same normalized input and algorithm version must produce the same output. Services gather data, call evaluators, persist results, and create related work.

### 5.3 Transaction boundary

A command that changes customer workflow state must atomically persist:

1. the domain state change
2. the customer activity event
3. audit metadata
4. the decision record, when a decision was evaluated
5. the task/appointment bridge record, when work was generated

If one required write fails, none of the command writes may commit.

## 6. Core domain model

### 6.1 Required entities

| Entity | Responsibility | Required invariants |
| --- | --- | --- |
| `Customer` | Stable organization-scoped identity | Unique customer number; merge state retained; no silent merge |
| `CustomerContactPoint` | Normalized phone, email, or address | Type, normalized value, preference, consent status |
| `CustomerInteraction` | Call, text, email, visit, note, or promise | Actor, direction, channel, time, outcome, next step |
| `Lead` | Purchase intent and follow-up lifecycle | Active lead has owner, stage, next action, and due time |
| `CustomerCase` | Complaint, title, documentation, service, delivery, or other concern | Open case has owner, severity, SLA state, and next safe action |
| `CustomerCaseTask` | Durable link from case/lead to Dispatch work | One source record, one task, relationship type, correlation ID |
| `CustomerPromise` | Commitment to update or act by a stated time | Owner, due time, status, fulfillment evidence |
| `CustomerActivityEvent` | Append-only customer timeline | Actor/system, source, correlation ID, safe payload |
| `CrmDecisionRecord` | Auditable result from an evaluator | Version, normalized inputs, result, reasons, confidence, override |
| `SlaPolicy` | Versioned response and resolution targets | Scope, business hours, pause rules, effective dates |

### 6.2 Recommended decision record

```prisma
model CrmDecisionRecord {
  id                    String   @id @default(cuid())
  organizationId        String
  decisionType          String
  algorithmVersion      String
  customerId            String?
  subjectType           String
  subjectId             String
  normalizedInput       Json
  score                  Int?
  priority               String?
  recommendedOwnerId    String?
  recommendedActionCode String?
  dueAt                  DateTime?
  reasonCodes            Json
  explanation            String
  confidence             String
  reviewRequired         Boolean  @default(false)
  decidedAt              DateTime @default(now())
  overriddenAt           DateTime?
  overriddenByUserId     String?
  overrideReason         String?
  finalOutcome           Json?
  createdAt              DateTime @default(now())

  @@index([organizationId, decisionType, decidedAt])
  @@index([organizationId, subjectType, subjectId])
}
```

Field names may be adjusted to repository conventions, but the evidence represented above is required. Input snapshots must exclude unnecessary restricted data.

## 7. Standard decision contract

All decision engines return one envelope:

```ts
type CrmDecision = {
  decisionType: CrmDecisionType;
  algorithmVersion: string;
  subject: { type: "LEAD" | "CASE" | "CUSTOMER" | "APPOINTMENT"; id: string };
  customerId: string | null;
  score: number | null;
  priority: "P0" | "P1" | "P2" | "P3" | null;
  recommendedOwnerId: string | null;
  recommendedActionCode: string | null;
  dueAt: string | null;
  reasonCodes: string[];
  explanation: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  missingInputs: string[];
  managerReviewRequired: boolean;
};
```

Rules:

- Scores are integers from 0 through 100 when the decision type uses scoring.
- Priority is derived from explicit bands; it is not independently editable.
- Reason codes are stable machine-readable constants.
- Explanations are generated from approved templates and the reason codes, not free-form AI.
- `LOW` confidence never becomes `HIGH` merely because the numeric score is high.
- Missing required inputs must be listed and must reduce confidence or stop the decision.
- Dates use ISO 8601 with the organization timezone represented at the API boundary.

Example:

```json
{
  "decisionType": "LEAD_NEXT_BEST_ACTION",
  "algorithmVersion": "lead-nba/1.0.0",
  "subject": { "type": "LEAD", "id": "lead_2841" },
  "customerId": "cus_1048",
  "score": 87,
  "priority": "P1",
  "recommendedOwnerId": "usr_baraka",
  "recommendedActionCode": "CALL_CONFIRM_TEST_DRIVE",
  "dueAt": "2026-07-12T14:20:00-05:00",
  "reasonCodes": ["BUYING_WITHIN_7_DAYS", "VEHICLE_AVAILABLE", "APPOINTMENT_INTENT"],
  "explanation": "Customer plans to buy within seven days, asked about an available vehicle, and proposed a visit.",
  "confidence": "HIGH",
  "missingInputs": [],
  "managerReviewRequired": false
}
```

## 8. Customer identity resolution

Identity resolution runs before a lead, case, interaction, or appointment creates a new customer.

### 8.1 Rules

1. Search exact normalized phone and exact normalized email inside the organization.
2. Search known external identity only within the same source system.
3. If one exact candidate exists, link it.
4. If conflicting exact candidates exist, stop and require review.
5. Otherwise rank candidates using name, phone suffix, email, address, and prior vehicle relationships.
6. Never merge automatically. Return a candidate set with reasons.

### 8.2 Confidence

| Band | Meaning | Action |
| --- | --- | --- |
| 95-100 | Strong exact identity | Link after conflict checks |
| 75-94 | Likely match | User confirmation required |
| 50-74 | Possible match | Show candidates; default to no selection |
| 0-49 | No useful match | Create a new identity when authorized |

Acceptance criteria:

- Matching never crosses organizations.
- Restricted values are masked for users without permission.
- Creating a new customer is idempotent for the same intake request.
- Every merge is a separate authorized, audited command.

## 9. Lead journey and priority

### 9.1 State machine

```text
NEW -> CONTACT_ATTEMPTED -> ENGAGED -> APPOINTMENT_SET -> ON_SITE
     -> QUALIFIED -> NEGOTIATION -> WON
     -> NURTURE
     -> LOST
```

Allowed paths are explicit. `WON` and `LOST` are terminal unless a permitted reopen command records a reason. A stage change cannot be inferred solely from elapsed time or a score.

### 9.2 Lead priority score v1

| Component | Points |
| --- | ---: |
| Purchase timeframe | 0-25 |
| Recent two-way engagement | 0-20 |
| Appointment intent | 0-15 |
| Requested vehicle availability or close match | 0-15 |
| Financing/trade readiness information | 0-10 |
| Completeness of reachable contact details | 0-10 |
| Prior positive dealership relationship | 0-5 |

Penalties:

- no valid contact route: `-25`
- explicit do-not-contact for the intended channel: ineligible, not a penalty
- duplicate/spam evidence: `-40` and manager review
- no response after the configured attempt sequence: `-10`
- requested vehicle unavailable with no qualifying alternative: `-10`

Priority bands:

| Score | Priority | Default response target |
| ---: | --- | --- |
| 80-100 | P1 | 10 minutes during open hours |
| 60-79 | P2 | 1 business hour |
| 35-59 | P3 | Same business day |
| 0-34 | Nurture | Scheduled cadence |

P1 does not mean emergency; `P0` is reserved for safety, legal, or critical customer-case work.

### 9.3 Data-quality rule

Purchase timeframe and contactability are required for high confidence. If either is unknown, the result may still rank work but confidence cannot exceed `MEDIUM`.

## 10. Intelligent lead assignment

### 10.1 Eligibility filters

An owner must:

- belong to the same organization and permitted location
- be active and authorized for lead work
- be available for the required language/channel when configured
- not exceed a hard capacity limit
- not be excluded by a manager-controlled routing rule

### 10.2 Assignment score v1

```text
availability fit          0-30
current capacity          0-25
continuity/relationship   0-20
skill/channel fit         0-15
fair rotation             0-10
                         -----
maximum                  100
```

Tie-break order is continuity, lowest hot-lead workload, oldest last assignment, then stable user ID. The stable final tie-break makes replays deterministic.

The service must persist candidates considered, ineligibility reasons, selected owner, and algorithm version. Managers may override with a required reason.

## 11. Next-best-action engine

The engine generates eligible candidate actions, removes actions prohibited by state or policy, scores the remainder, and returns the top action plus alternatives.

Candidate groups include:

- acknowledge or contact lead
- gather missing information
- schedule or confirm appointment
- prepare for appointment
- present alternative vehicle
- update customer on an open case
- complete document/title dependency
- request manager decision
- reactivate or move to nurture

Action score:

```text
urgency                  0-30
expected progress        0-25
customer commitment      0-20
SLA or promise impact    0-15
effort/capacity fit      0-10
                        -----
maximum                 100
```

Hard rules override scores. For example, a promised customer update due now ranks ahead of a lower-severity sales follow-up, and a consent restriction removes a prohibited outbound channel.

## 12. Customer case severity

### 12.1 Severity score v1

| Component | Points |
| --- | ---: |
| Safety risk | 0-35 |
| Legal/regulatory risk | 0-25 |
| Customer mobility impact | 0-15 |
| Financial exposure or hardship | 0-10 |
| Age and missed commitments | 0-10 |
| Reputational escalation | 0-5 |

Bands:

| Score | Severity | Operational priority |
| ---: | --- | --- |
| 75-100 | Critical | P0 |
| 50-74 | High | P1 |
| 25-49 | Medium | P2 |
| 0-24 | Low | P3 |

Automatic critical triggers include a credible immediate safety concern, threatened or active legal/regulatory deadline, inability to operate a delivered vehicle caused by dealership-controlled documentation, or a manager-declared critical incident.

Missing information must never reduce a credible safety complaint. When safety cannot be ruled out, route for prompt human triage.

## 13. Case lifecycle and resolution

### 13.1 State machine

```text
NEW -> TRIAGED -> IN_PROGRESS -> WAITING_CUSTOMER -> IN_PROGRESS
                            -> WAITING_EXTERNAL -> IN_PROGRESS
                            -> READY_TO_RESOLVE -> RESOLVED -> CLOSED
                            -> ESCALATED -> IN_PROGRESS
```

Rules:

- `NEW` requires intake evidence but may be temporarily unassigned only until routing completes.
- `TRIAGED` requires category, severity, owner, SLA policy, and next action.
- Waiting states require a dependency, owner, next review time, and customer-update commitment.
- `READY_TO_RESOLVE` requires all mandatory playbook tasks complete.
- `RESOLVED` requires outcome notes, resolution code, and customer confirmation or a documented confirmation exception.
- `CLOSED` requires documentation completeness and no open required task.
- Reopening records the reason and recalculates SLA state without deleting the original outcome.

### 13.2 Resolution orchestration

```pseudo
resolve identity
create case and activity event
classify category
calculate severity
select owner and playbook
assign SLA and customer-update commitment
create linked Dispatch tasks
surface manager visibility when required

until closed:
  monitor task completion, SLA, promises, and dependencies
  escalate blocked or overdue work
  require progress evidence
  confirm proposed resolution with the customer when applicable

on resolution:
  validate mandatory tasks and documentation
  record confirmation, root cause, outcome, and prevention recommendation
  close related work that is safe to close
```

## 14. Playbooks

Playbooks are versioned configuration, not hard-coded UI checklists. A playbook defines category, eligible severity bands, required tasks, optional tasks, owner-role rules, response templates, evidence requirements, and closure checks.

Required initial playbooks:

1. Title not received / DMV delay
2. Missing registration or paperwork
3. Repair or service complaint
4. Delivery issue
5. Financing/document delay
6. General complaint requiring manager review

Example: title not received

1. Verify deal, delivery date, customer, and vehicle.
2. Confirm required title documents and submission evidence.
3. Identify the blocking party or missing item.
4. Create dependency work with one accountable owner.
5. provide the customer a factual written update by the promised time.
6. Schedule the next review and escalate approaching deadlines.
7. Confirm receipt or document the approved closure exception.

## 15. SLA and promised-update engine

SLA has two independent clocks:

- **response target:** first meaningful human response
- **resolution target:** target for completed resolution

Initial targets must be configurable by organization, category, severity, business hours, and effective date. Do not embed the targets only in code.

Suggested starting policy:

| Severity | First response | Manager visibility | Update cadence |
| --- | --- | --- | --- |
| Critical | 15 minutes | Immediate | Every 2 hours or agreed interval |
| High | 2 business hours | Immediate | Same business day |
| Medium | 1 business day | On breach risk | Every 2 business days |
| Low | 2 business days | On breach | At material change or agreed date |

Pause rules:

- A clock may pause only for a configured reason.
- The pause needs an owner, start time, next review time, and evidence.
- Waiting on an external party does not pause the customer-update commitment.
- Manual SLA overrides require authorization and an audit reason.

Escalation stages:

- `WATCH` at 75% of allowed time
- `AT_RISK` at 90%
- `BREACHED` at 100%
- `REPEATED_BREACH` after a configured post-breach interval

Each stage creates or updates one idempotent manager alert; it must not create duplicate tasks on every scheduler run.

## 16. Dispatch Board integration

### 16.1 Generated task contract

Every generated task must include:

- one clear owner
- customer ID and safe display snapshot
- source type and source ID
- related vehicle when applicable
- action code and human-readable required action
- priority, due time, and SLA context
- dependencies and escalation path
- manager-review requirement
- correlation ID and decision-record ID

### 16.2 Event mapping

| Customer event | Dispatch result |
| --- | --- |
| P1 lead created | Priority sales follow-up task |
| Appointment scheduled | Confirmation/preparation work through appointment bridge |
| Appointment at risk | Recovery task or alert |
| Customer case triaged | Playbook resolution tasks |
| Customer waiting for update | Timed update task |
| SLA at risk or breached | Manager alert/review work |
| Alternative vehicle qualified | Salesperson outreach task |
| Delivery scheduled | Delivery checklist work |
| Case dependency blocked | Escalation task for dependency owner |
| Case resolved | Post-resolution follow-up when playbook requires it |

Generated work must use an idempotency key derived from organization, source record, action code, and decision/playbook version. Re-evaluation updates eligible open work rather than duplicating it.

## 17. Manager command center

The manager experience is queue-first. Required queues are:

1. hot leads not contacted
2. follow-ups due now
3. appointments today and at risk
4. customers currently on-site
5. stalled negotiations
6. unassigned customer cases
7. open high/critical cases
8. title and registration cases
9. SLA watch, at-risk, and breach
10. customers awaiting promised updates
11. blocked customer dependencies
12. alternative vehicles ready to present
13. dormant leads eligible for reactivation
14. approvals and overrides required

Every row shows customer, subject/vehicle, current stage, priority, owner, next action, due time, reason codes, time since last activity, SLA health, and confidence. Queue counts and rows must come from the same filtered query contract to prevent count drift.

## 18. APIs and commands

Recommended initial surface:

```text
GET  /api/customers/dashboard
GET  /api/customers/search
GET  /api/customers/:customerId
GET  /api/customers/:customerId/timeline

POST /api/customers/resolve-identity
POST /api/customers/:customerId/interactions

POST /api/customers/leads
POST /api/customers/leads/:leadId/transition
POST /api/customers/leads/:leadId/assign
POST /api/customers/leads/:leadId/evaluate

GET  /api/customers/resolutions
POST /api/customers/cases
POST /api/customers/cases/:caseId/triage
POST /api/customers/cases/:caseId/transition
POST /api/customers/cases/:caseId/escalate
POST /api/customers/cases/:caseId/resolve
POST /api/customers/cases/:caseId/evaluate

GET  /api/customers/decisions/:decisionId
POST /api/customers/decisions/:decisionId/override
```

Command rules:

- validate input and authorization server-side
- reject cross-organization IDs before mutation
- require idempotency keys for creates and generated work
- use optimistic concurrency for workflow transitions
- return `409` with current safe state for stale transitions
- return structured validation errors rather than generic failures
- never accept computed priority, SLA health, or authorization from the client

## 19. Permissions and privacy

Minimum capabilities:

```text
customer.view.basic
customer.view.contact
customer.view.financial-signals
customer.create
customer.update
customer.record-interaction
customer.manage-lead
customer.manage-case
customer.resolve-case
customer.assign-owner
customer.override-decision
customer.merge
customer.export
```

Rules:

- Apply field projection before the read model reaches the browser.
- Do not store payment credentials, government identifiers, full credit reports, or unrelated restricted data in decision inputs.
- Financing signals may identify missing work; they must not make lending decisions.
- Language may route communication support but may not lower service priority.
- Customer relationship value may inform retention outreach only. It cannot affect safety, legal obligations, complaint escalation, title completion, or respectful service.

## 20. Observability and operations

Track:

- decision evaluations by type and version
- evaluation failures and missing-input rates
- recommendations accepted, overridden, and ignored
- time from recommendation to action
- generated-task duplication prevented
- lead response time and conversion by priority band
- case first response, resolution time, update-promise compliance, reopen rate, and SLA breach rate
- queue age and unassigned counts
- scheduler last success, duration, and failed records

Logs must use IDs and reason codes, not unnecessary customer contact data. Replaying a failed evaluation must be safe and idempotent.

## 21. Testing contract

### 21.1 Unit tests

- every score boundary and penalty
- hard-trigger precedence
- missing-input confidence behavior
- deterministic tie-breaks
- allowed and rejected state transitions
- SLA business-hours and pause calculations
- reason-code and explanation consistency
- fairness exclusions and channel consent rules

### 21.2 Integration tests

- command atomically writes state, activity, audit, decision, and task link
- unauthorized and cross-organization requests make no writes
- idempotency prevents duplicate customers, cases, decisions, and tasks
- stale transitions return conflicts
- overrides require permission and reason
- scheduler re-runs update existing alerts instead of duplicating them

### 21.3 UI and end-to-end tests

- manager sees accurate queue counts and explanations
- staff can act on assigned work and record outcomes
- missing, restricted, loading, empty, stale, and error states are visible
- a lead can proceed from intake to owned task and appointment
- a title case can proceed from intake to triage, timed update, evidence, resolution, and closure
- light and dark compositions retain equivalent workflow information

### 21.4 Required fixtures

At minimum include:

- Facebook Marketplace lead buying today
- unreachable lead with incomplete contact data
- requested vehicle sold with two alternatives
- duplicate-customer candidate with conflicting exact identifiers
- title not received case
- credible safety complaint with incomplete facts
- external dependency waiting state with an unpaused update promise
- SLA boundary crossing daylight-saving and closed-hours periods

## 22. Delivery sequence

### Vertical slice 1: decision infrastructure

- Add decision domain types, reason-code catalog, persistence, repository, and audit projection.
- Implement the pure evaluation interface and version registry.
- Add decision explanation and override read/command contracts.

**Exit:** a fixture decision can be evaluated, persisted, retrieved, explained, overridden, and audited.

### Vertical slice 2: durable leads

- Add lead persistence and state machine.
- Implement priority and assignment v1.
- Create idempotent linked Dispatch follow-up work.
- Replace preview recent-lead and hot-lead queue data.

**Exit:** a real lead becomes owned, prioritized, actionable work with a recorded outcome.

### Vertical slice 3: durable customer cases

- Add case, promise, playbook, SLA, and task-link persistence.
- Implement severity, triage, and case transitions.
- Replace preview resolution queues and detail rail.

**Exit:** a title case can complete the full resolution workflow with evidence and no preview data.

### Vertical slice 4: SLA and manager control

- Add configured policy versions and business-hour calculation.
- Add idempotent monitoring/escalation jobs.
- Add decision overrides and manager queues.

**Exit:** at-risk, breached, blocked, awaiting-update, and approval work is accurate and actionable.

### Vertical slice 5: Customer 360

- Add timeline, lead, case, task, appointment, document, and vehicle projections.
- Replace the preview customer profile with route-selected durable customers.
- Enforce permission-filtered tabs and field states.

**Exit:** Customer 360 is a reliable operating record rather than a demonstration shell.

### Vertical slice 6: calibration and rollout

- Add metrics, operational runbook, feature flags, pilot roles, and rollback controls.
- Review weights and targets using recorded outcomes without changing historical versions.
- Roll out by location/team after readiness sign-off.

**Exit:** the system has owner sign-off, measurable pilot results, documented rollback, and no unresolved critical defects.

## 23. Definition of done

The Customer Control Center decision engine is implementation-ready when:

- each included workflow has a durable aggregate and explicit state machine
- evaluators are pure, versioned, deterministic, and exhaustively boundary-tested
- every recommendation provides reason codes, explanation, confidence, and missing inputs
- generated tasks have one owner, due time, source link, and idempotency identity
- customer promises and SLA clocks are distinct and visible
- preview data is removed from production paths covered by the slice
- permissions and organization boundaries are enforced on reads and writes
- overrides and outcomes are auditable
- critical safety, legal, consent, and fairness rules have negative tests
- metrics, runbook, feature flag, and rollback path exist before rollout

## 24. Implementation guardrails

Do not:

- create a second task, activity, appointment, identity, or permission system
- treat a numeric score as a workflow state
- auto-merge customers
- hide missing inputs behind a confident explanation
- pause customer updates because an external dependency is pending
- let customer value change complaint handling or legal/safety work
- ship dashboards whose counts are not backed by the same query as their rows
- overwrite an algorithm version after decisions have been stored
- allow the browser to determine priority, SLA, permission, or closure eligibility
- introduce predictive models before baseline outcome data and monitoring exist

The intended result is a customer operations command center: simple enough for daily dealership use, strict enough to protect accountability, and structured enough to support future governed intelligence.
