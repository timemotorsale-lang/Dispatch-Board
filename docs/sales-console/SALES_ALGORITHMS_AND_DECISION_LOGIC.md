# Sales Algorithms and Decision Logic

## 1. Governance contract

Every evaluator returns:

```text
decision type
subject and organization
algorithm version
normalized inputs with source and freshness
hard-gate results
score or ordered result
reason codes and plain-language explanation
confidence / evidence completeness
recommended action
expiry or reevaluation trigger
override eligibility
```

All initial algorithms are deterministic, versioned, replayable, and usable without an AI service. Weights and thresholds below are planning defaults, not approved dealership policy.

## 2. SAL-ALG-001 — Lead priority

### Purpose

Rank active opportunities for timely meaningful attention, not predict customer worth.

### Hard exclusions

- terminal/superseded record;
- unresolved identity or consent restriction affecting the proposed action;
- active contact already in progress;
- invalid organization/location scope;
- insufficient source integrity.

### Planning score

```text
Priority =
  Intent and timeframe                 0..25
  Customer engagement                 0..20
  Vehicle fit and availability        0..15
  Response urgency / SLA exposure     0..15
  Appointment or showroom signal      0..10
  Relationship continuity             0..5
  Data completeness/confidence        0..5
  Recoverability / trigger strength   0..5
                                      -----
                                      0..100
```

Negative adjustments:

- repeated recent attempts without response;
- stale source facts;
- conflicting active opportunity;
- unavailable requested vehicle with no viable alternative;
- customer-requested future contact time.

The score never uses protected characteristics, inferred wealth, neighborhood proxies, or creditworthiness.

Priority bands are configurable. A default pilot may use P1 80–100, P2 60–79, P3 35–59, and P4 0–34 only after shadow calibration.

## 3. SAL-ALG-002 — Assignment recommendation

### Eligibility before ranking

- active, authorized, and scheduled;
- correct organization/location;
- allowed lead type/channel;
- capacity below hard limit;
- no declared conflict;
- continuity policy honored.

### Ranking

```text
Assignment fit =
  Existing customer continuity     0..30
  Availability / response ability  0..20
  Relevant skill or language       0..15
  Current weighted workload        0..15
  Source/category proficiency      0..10
  Distribution balance            0..10
```

Tie-break:

1. continuity;
2. lowest urgent workload;
3. oldest last comparable assignment;
4. stable user ID.

Historical close rate may be used only as a bounded coaching/fit signal after fairness review; it must not monopolize opportunity distribution.

## 4. SAL-ALG-003 — Next-best action

Generate candidate actions from stage, customer interaction, appointment, vehicle, deal, quote, promise, and blocker state.

Candidate examples:

- respond on permitted channel;
- ask one missing qualification question;
- offer appointment times;
- confirm appointment;
- send requested vehicle information;
- propose alternative vehicle;
- request appraisal;
- request manager turn;
- revise an expired scenario;
- follow up on a presented quote;
- resolve a customer promise;
- pause until customer-requested time.

Rank lexicographically:

1. customer protection and commitments;
2. time-critical response or appointment;
3. unblock an accepted deal;
4. probability of meaningful progress;
5. value/time leverage;
6. effort and interruption cost.

Every recommendation states why it is preferred and why a higher-risk action was excluded.

## 5. SAL-ALG-004 — Contact channel and time

Filter by:

- explicit opt-out/restriction;
- consent and purpose;
- organization business/contact hours;
- customer timezone;
- customer-preferred channel/time;
- channel validity;
- recent attempt frequency;
- message urgency and sensitivity.

Rank eligible channels by customer preference, observed two-way response, continuity, immediacy, and cost. A permitted channel is not automatically an appropriate channel.

## 6. SAL-ALG-005 — Customer-to-vehicle match

### Hard constraints

- sale eligibility and organizational scope;
- not sold, disposed, or conflictingly reserved;
- safety/title/frontline restrictions honored;
- required body/usage/category constraints;
- maximum budget/payment constraint only when based on customer-provided or authorized values.

### Score

```text
Vehicle match =
  Must/preferred feature fit       0..30
  Price/payment fit                0..20
  Availability and readiness       0..15
  Customer engagement evidence     0..10
  Market/demand suitability        0..10
  Trade/use-case fit               0..5
  Expected healthy economics       0..5
  Data confidence                  0..5
```

Display separate sub-scores. Do not hide a poor customer fit behind attractive gross or aging pressure. An alternative match must explain compromises.

## 7. SAL-ALG-006 — Deal health

Deal health is diagnostic rather than a single opaque color.

Components:

- customer engagement trend;
- stage evidence completeness;
- next-action validity;
- milestone recency;
- vehicle availability/readiness;
- quote freshness and response;
- appraisal/approval/finance/document dependencies;
- unresolved objections;
- expected-close plausibility;
- seller/manager judgment agreement;
- data freshness.

Risk flags include:

- no future action;
- stage dwell beyond comparable successful cohort;
- close date moved repeatedly;
- customer quiet after quote;
- requested information unanswered;
- vehicle conflict;
- stale appraisal or scenario;
- approval expired;
- promise at risk;
- forecast category unsupported.

Health output includes component status, reasons, confidence, and recommended remediation.

## 8. SAL-ALG-007 — Manager intervention priority

```text
Intervention priority =
  Customer harm / promise risk       0..25
  Time criticality                   0..20
  Recoverable expected contribution  0..20
  Probability intervention helps     0..15
  Strategic/relationship importance  0..10
  Process/compliance severity        0..10
```

Hard-priority items such as unauthorized pricing, prohibited contact, material customer promise breach, or unsafe vehicle representation bypass commercial scoring.

Deduplicate related alerts into one intervention case and suppress repeated notifications until evidence changes or escalation time arrives.

## 9. SAL-ALG-008 — Forecast projection

Maintain distinct values:

- seller forecast category/value;
- manager category/value;
- deterministic probability/value;
- optional predictive probability/value.

Planning deterministic probability uses calibrated rates for:

- current evidence-backed stage;
- engagement recency/trend;
- appointment/show outcome;
- quote presentation/response;
- vehicle availability;
- blockers;
- age relative to successful cohort;
- next-action adherence;
- time remaining in forecast period.

```text
Risk-adjusted expected revenue =
  sum(deal expected contribution × calibrated close probability)
```

Report coverage, accuracy, bias, and calibration by horizon. Do not present precision unsupported by sample size.

## 10. SAL-ALG-009 — Stalled opportunity detection

Stall is triggered by one or more:

- stage-specific inactivity threshold;
- missed next action;
- no two-way engagement after an expected response;
- unchanged quote without follow-up;
- unresolved dependency beyond target;
- close-date drift without new evidence;
- repeated activity that produces no stage evidence.

Thresholds vary by stage, source, and customer-requested timing. The system distinguishes “waiting appropriately” from “unowned inactivity.”

## 11. SAL-ALG-010 — Lost-lead reactivation

Eligibility gates:

- approved lost/nurture reason;
- no permanent restriction;
- minimum quiet period met;
- no conflicting active opportunity;
- trigger is fresh and relevant.

Trigger strength:

- customer re-engaged;
- requested/related vehicle became available;
- material approved price/status change;
- appointment retry became due;
- manager-selected campaign;
- time-based follow-up promised by customer.

Ranking considers trigger specificity, prior engagement, vehicle fit, recency, previous attempt burden, and owner continuity.

## 12. SAL-ALG-011 — Approval routing

1. Calculate the requested delta and cumulative deal effect.
2. Classify exception type.
3. Determine applicable policy by organization, location, vehicle class, role, and effective date.
4. Find the smallest sufficient active authority.
5. account for separation of duties and conflicts;
6. set response target and escalation.
7. bind approval to scenario version and expiry.

Any material scenario change invalidates or reevaluates the approval.

## 13. SAL-ALG-012 — Workload and capacity

Weighted workload uses expected near-term effort rather than raw record count:

```text
Load =
  P1 response work × weight
  + today's appointments × weight
  + active negotiations × weight
  + due promises × weight
  + ordinary follow-ups × weight
  + blocked coordination × weight
```

Weights are calibrated from observed handling time. Capacity recommendations explain whether load is urgent, scheduled, waiting, or blocked.

## 14. SAL-ALG-013 — Source quality and attribution

Track separately:

- inquiries;
- unique qualified opportunities;
- appointments;
- shows;
- delivered units;
- revenue/gross where authorized;
- median response time;
- duplicate/invalid rate;
- cost where supplied;
- attribution confidence.

Support first-touch, last-touch, and configured multi-touch views. Never present one model as unquestionable truth. Imported source labels are normalized but original attribution is retained.

## 15. SAL-ALG-014 — Data quality and freshness

Evaluate:

- missing required relationship;
- missing owner/stage/next action/due time;
- invalid transition evidence;
- contradictory source observations;
- stale vehicle, trade, quote, or integration data;
- likely duplicate;
- orphaned handoff;
- terminal record with open obligations.

Severity is based on customer harm, decision impact, operational block, and age. Corrections are routed as work; the evaluator does not invent values.

## 16. SAL-ALG-015 — Sequence/cadence branching

Cadence steps are selected from approved templates using:

- lifecycle state;
- last structured outcome;
- customer preference and contact policy;
- attempt count and spacing;
- engagement;
- requested timing;
- vehicle/appointment trigger;
- active human conversation.

Automatic exit:

- customer responds;
- appointment is accepted;
- customer opts out;
- opportunity becomes terminal;
- owner begins a conflicting live action;
- source facts become unsafe or stale.

## 17. AI assistance boundary

Optional AI may:

- summarize conversations;
- extract candidate facts with citations to source interaction;
- draft communications;
- suggest objections, questions, and next actions;
- cluster coaching themes;
- provide natural-language explanations of structured results.

AI may not silently:

- change lifecycle state;
- certify customer consent;
- approve pricing;
- determine credit;
- present finance terms;
- reserve/sell a vehicle;
- create a binding promise;
- contact a customer;
- close an outcome.

AI-derived facts remain proposed until accepted by an authorized user or verified through an authoritative source.

