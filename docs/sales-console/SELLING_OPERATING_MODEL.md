# Time Motor Sales Selling Operating Model

## 1. Operating principles

1. **One owner:** every active opportunity and deal has one accountable owner.
2. **One next action:** every active record has a specific future action, owner, and due time.
3. **Customer evidence over optimism:** stages reflect observable customer progress.
4. **Fast response, thoughtful follow-through:** speed matters at intake; relevance and continuity matter afterward.
5. **Customer fit and healthy economics:** recommendations balance customer need, vehicle readiness, probability, gross, and long-term trust.
6. **Exceptions become work:** blockers create owned, time-bound resolution rather than passive flags.
7. **Managers intervene selectively:** the console ranks recoverable, material exceptions instead of creating alert fatigue.
8. **Measure outcomes and conformance:** raw call/email volume is diagnostic, not the definition of performance.
9. **No hidden promises:** customer commitments are durable and tracked to proof.
10. **Human authority is explicit:** pricing, credit, legal, policy, and contract decisions remain with authorized people and systems.

## 2. Role model

| Role | Primary responsibility | Default console lens |
| --- | --- | --- |
| Salesperson | Progress assigned customers and deals | Today queue, appointments, active deals |
| BDC / lead coordinator | Fast intake, qualification, routing, appointment setting | Lead response and reactivation |
| Sales manager | Deal assistance, approvals, coaching, pipeline integrity | Control tower and forecast |
| General manager | Revenue, gross, forecast, systemic constraints | Executive revenue view |
| Inventory manager | Vehicle availability, readiness, market, and alternatives | Demand-to-inventory bridge |
| Finance manager | Authorized finance/product workflow after handoff | Finance handoff and exception queue |
| Delivery/document owner | Final readiness, commitments, and completion | Delivery readiness queue |
| Administrator / RevOps | Policy, playbook, routing, fields, integrations, data quality | Sales administration |

Separation-of-duty examples:

- a salesperson may request but not approve an out-of-authority discount;
- a quote presenter must use an approved current scenario;
- a manager override requires reason and is visible in audit;
- finance status is accepted from its authoritative workflow, not inferred by Sales;
- delivery closure requires independent readiness evidence when policy requires it.

## 3. Daily cadence

### Opening readiness

- review unacknowledged overnight leads;
- reconcile integration failures;
- confirm today's appointments and assigned owners;
- identify requested vehicles that are unavailable or not frontline-ready;
- review overdue promises and follow-ups;
- publish manager coverage and approval availability.

### Continuous salesperson loop

1. Open the highest-ranked eligible item.
2. Review the reason, customer context, and recommended action.
3. Take or intentionally defer the action.
4. Record a structured outcome.
5. Set the next action or reach a legitimate terminal state.
6. Resolve or route any blocker.
7. Continue to the next item.

### Midday manager review

- response SLA leakage;
- arrived/waiting customers;
- deals needing a manager turn;
- approval and appraisal delays;
- high-value stalled opportunities;
- salespeople with material queue overload;
- inventory with strong demand but readiness blockers.

### End-of-day control

- no active opportunity without next action;
- no customer promise silently overdue;
- all showroom visits have an outcome;
- all presented quotes have follow-up;
- all sold deals have finance/document/delivery ownership;
- forecast changes have reasons;
- exceptions are carried forward with owner and due time.

## 4. Queue discipline

Queue order is produced by hard eligibility gates followed by an explainable priority score.

Hard gates:

- actor is permitted and in scope;
- record is not terminal or superseded;
- contact is allowed for the channel and time;
- source data is sufficiently fresh for the action;
- no conflicting active action is in progress;
- required vehicle/deal/customer context exists;
- action does not exceed authority.

Users may override an advisory rank where permitted, but the override records reason and outcome. The system must not force a salesperson to contact a customer when safety, consent, identity, legal, or data-quality conditions are unresolved.

## 5. Stage-entry evidence

| Stage | Minimum evidence |
| --- | --- |
| Attempting contact | At least one attributable valid attempt or queued approved communication |
| Engaged | Customer reply, answered call, in-person conversation, or equivalent two-way contact |
| Qualified | Need, timeframe, and viable next step recorded; missing items explicitly marked unknown |
| Appointment set | Appointment accepted or committed through the Appointments domain |
| Showroom | Arrival recorded |
| Deal active | Deal created with customer and intended vehicle/category context |
| Presented | Current approved scenario/quote presented to customer |
| Customer accepted | Attributable acceptance of a specific quote/version |
| Won | Commercial outcome recorded and downstream handoff accepted |
| Delivered | Delivery evidence and outstanding-obligation review completed |
| Lost/disqualified | Controlled reason, supporting note, and reactivation eligibility |

## 6. Handoff contract

Every handoff includes:

- source record and current state;
- receiving owner/team;
- requested outcome;
- due time and urgency;
- customer commitment affected;
- required evidence;
- dependencies and blockers;
- acceptance or rejection;
- escalation path;
- correlation ID.

Key handoffs:

- BDC to salesperson;
- salesperson to manager;
- Sales to Inventory for availability/appraisal/readiness;
- Sales to Finance;
- Sales to Documents/Delivery;
- post-sale issue to Customers/Resolution;
- lost opportunity to nurture/reactivation.

## 7. Performance system

### Customer and funnel

- median and 90th-percentile time to acknowledge;
- time to meaningful contact;
- contact, appointment-set, show, demo, write-up, presented, accepted, delivered rates;
- stage conversion and stage dwell;
- no-show recovery;
- reactivation conversion;
- promise fulfillment;
- lost-reason distribution.

### Revenue and economics

- units, front gross, back gross, total gross;
- gross per delivered unit;
- expected versus realized gross;
- discount and override rate;
- sales cycle time;
- inventory age at sale;
- source cost, conversion, revenue, and gross where reliable attribution exists.

### Execution quality

- active records with valid next action;
- overdue next actions;
- structured-outcome completeness;
- quote follow-up compliance;
- handoff acceptance time;
- approval turnaround;
- data freshness and duplicate rate;
- decision override rate and override outcome.

### Forecast and management

- forecast accuracy by horizon and method;
- forecast bias;
- slipped and pulled-in deals;
- pipeline coverage;
- intervention acceptance and measured result;
- coaching theme frequency.

### Guardrail metrics

- opt-out/contact-policy violations;
- unauthorized pricing attempts;
- customer wait time;
- missed promises;
- unresolved delivery obligations;
- data exposure/permission denials;
- integration failure age.

Metrics must support denominators, cohort definitions, timezone, effective policy version, source freshness, and drilldown. Rankings must not punish staff for unavailable inventory, integration outages, approved leave, location differences, or other conditions outside their control.

## 8. Optimization logic

The operating system optimizes lexicographically:

1. safety, legality, consent, and customer protection;
2. customer commitment and service recovery;
3. time-sensitive buying intent and response risk;
4. probability of meaningful progress;
5. expected healthy contribution and inventory fit;
6. staff capacity, continuity, and development;
7. administrative efficiency.

Revenue never overrides a hard customer-protection or authority constraint.

## 9. Pilot controls

- begin with a narrow sales cohort and one location;
- run scores in shadow mode before affecting queue order;
- compare recommendations with manager judgment;
- inspect false positives and false negatives by scenario;
- require manual approval for customer contact and pricing actions;
- publish daily data-quality and exception summaries;
- maintain capability kill switches;
- expand only after acceptance, reliability, privacy, fairness, and rollback evidence pass.

