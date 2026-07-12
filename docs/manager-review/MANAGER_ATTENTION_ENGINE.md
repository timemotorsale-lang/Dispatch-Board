# Formal Manager Attention Engine

**Document:** Deterministic ranking and policy specification  
**Version:** MAE v1 planning baseline  
**Last updated:** 2026-07-12  
**Status:** Formal target contract; weights require operational calibration

## 1. Objective

The Manager Attention Engine answers:

> Of the work that legitimately requires management attention, what should the manager consider next, and why?

It does not answer whether an employee is good or bad, and it does not make final approval, reassignment, escalation, disciplinary, financial, safety, or compliance decisions.

## 2. Design Properties

The engine must be:

- deterministic: identical inputs and version produce identical output
- explainable: every eligibility, queue, hard-rule, and score result has reason codes
- policy-driven: thresholds and weights live in versioned configuration
- bounded: scores remain in a documented range
- stable: small irrelevant changes do not cause dramatic reorderings
- auditable: input fingerprint, policy version, factors, and output can be retained
- overridable: managers retain authority and overrides are recorded
- calibratable: results can be evaluated against operating outcomes
- non-punitive: honest blocker reporting does not itself lower an employee evaluation

## 3. Inputs

Only authoritative, available facts may be used.

### Task and review inputs

- task status, priority, due time, workflow area, and owner
- requires-manager-approval flag
- ready-for-review time and current review age
- review SLA state
- active review cycle and prior review outcomes
- number of returns in the defined lookback/cycle
- last meaningful update time
- evidence completeness and rejection state
- blocker state, age, next action, and follow-up ownership
- dependency and downstream-blockage facts

### Dealership context inputs

- customer commitment or complaint risk
- vehicle delivery/readiness impact
- title/documentation risk
- payment or financial exposure
- safety or compliance risk
- appointment or project milestone dependency
- explicitly defined operational deadline

### Inputs prohibited from MAE v1

- demographic or protected-class data
- subjective personality judgments
- unverified sentiment inference
- opaque employee performance scores
- private information irrelevant to the operational decision
- model-generated risk claims without authoritative supporting facts

## 4. Output Contract

For each evaluated subject:

```ts
type AttentionEvaluation = {
  engineVersion: "MAE-1";
  evaluatedAt: string;
  eligible: boolean;
  primaryQueue: AttentionQueue | null;
  secondarySignals: string[];
  criticalBand: "CRITICAL" | "HIGH" | "NORMAL";
  hardRuleCode: string | null;
  score: number | null; // 0..100 when eligible
  factors: AttentionFactor[];
  explanationCodes: string[];
  humanExplanation: string;
  inputFingerprint: string;
};
```

The engine should return ineligible reasons during tests and diagnostics, even when the production queue response omits ineligible items.

## 5. Stage A — Eligibility

A subject is eligible when at least one active rule is true:

| Code | Eligibility rule |
| --- | --- |
| `E_READY_REVIEW` | Task is `READY_FOR_REVIEW`. |
| `E_APPROVAL_WAIT` | A management approval is required and unresolved. |
| `E_BLOCKED_INTERVENTION` | Work is blocked beyond its intervention threshold or has no accountable next action. |
| `E_EVIDENCE_DEFICIENT` | Required evidence is missing, rejected, or stale for an active review. |
| `E_REVIEW_SLA` | Review is in warning or breach state. |
| `E_REPEAT_RETURN` | Work has reached the configured repeated-return threshold. |
| `E_CRITICAL_RISK` | An active critical risk signal requires management action. |
| `E_DOWNSTREAM_BLOCK` | The item prevents a defined downstream milestone or task. |
| `E_OWNERSHIP` | Required work is unowned, ambiguously owned, or needs authorized reassignment. |
| `E_HELP_REQUEST` | Staff explicitly requested management help and the request remains unresolved. |

An item is ineligible when it is completed with no open review/intervention, cancelled, archived, superseded, or already resolved by a newer authoritative state.

## 6. Stage B — Primary Queue Classification

Primary queues in precedence order:

1. `CRITICAL_EXCEPTION`
2. `CUSTOMER_RISK`
3. `OVERDUE_REVIEW`
4. `BLOCKED_INTERVENTION`
5. `EVIDENCE_REQUIRED`
6. `RETURNED_WORK`
7. `WAITING_APPROVAL`
8. `READY_FOR_REVIEW`
9. `NEEDS_ASSIGNMENT`
10. `WATCHLIST`

The first matching queue in the active, versioned precedence table becomes the primary queue. All other matches become secondary signals.

This produces mutually exclusive headline counts while preserving context such as “Ready for Review + Customer Risk + Evidence Missing.”

Category-specific saved views such as Vehicle Readiness, Repair Completion, Title/Documentation, Listing Approval, Sales/Delivery, Marketing Approval, and Daily Department Report filter the same authoritative evaluations; they do not create a second classification system.

## 7. Stage C — Critical Policy Overrides

Critical rules set `criticalBand = CRITICAL`, supply a hard-rule code, and sort above all scored items regardless of numeric score.

Initial candidate rules requiring stakeholder approval:

| Code | Condition |
| --- | --- |
| `H_SAFETY_STOP` | Unresolved safety issue affects use, sale, test drive, or delivery. |
| `H_DELIVERY_BLOCKED` | Customer delivery commitment is imminent or breached and this item blocks delivery. |
| `H_TITLE_COMPLIANCE` | Title/documentation condition creates an active legal, compliance, or ownership-transfer exposure. |
| `H_FUNDS_EXPOSURE` | An unresolved payment/funds condition creates material financial exposure. |
| `H_CUSTOMER_ESCALATION` | A customer-impact issue has reached the defined critical severity or commitment breach. |
| `H_NO_OWNER_CRITICAL` | Critical work has no accountable owner. |

Hard rules must rely on structured facts. Free-text keyword matching alone cannot trigger critical status.

Within the critical band, sort by:

1. hard-rule severity rank
2. breached commitment or deadline time
3. number/severity of blocked downstream outcomes
4. oldest eligible time
5. stable subject identifier

## 8. Stage D — Weighted Score

Non-critical eligible work receives a score from 0 to 100.

### 8.1 MAE-1 factor weights

These are planning defaults, not production truth:

| Factor | Range | Default max |
| --- | ---: | ---: |
| Risk severity | 0..1 | 25 |
| SLA urgency | 0..1 | 20 |
| Downstream blockage | 0..1 | 15 |
| Customer/delivery impact | 0..1 | 15 |
| Evidence deficiency | 0..1 | 10 |
| Repeated-return pressure | 0..1 | 5 |
| Aging/inactivity | 0..1 | 5 |
| Ownership ambiguity | 0..1 | 5 |
| **Total** |  | **100** |

### 8.2 Formula

```text
rawScore =
  25 * riskSeverity
+ 20 * slaUrgency
+ 15 * downstreamBlockage
+ 15 * customerDeliveryImpact
+ 10 * evidenceDeficiency
+  5 * repeatedReturnPressure
+  5 * agingInactivity
+  5 * ownershipAmbiguity

score = round(clamp(rawScore, 0, 100))
```

An optional active-response adjustment may be introduced only after its semantics are approved. It must never hide critical risk or reward superficial status updates.

### 8.3 Normalization rules

Each factor is a pure function returning a value in `[0, 1]` and factor-level reason codes.

#### Risk severity

- 0.00: no active structured risk
- 0.25: low
- 0.50: medium
- 0.75: high
- 1.00: severe but below a hard critical rule

Use the maximum active risk dimension for v1. Do not sum many low-risk tags to manufacture a severe result.

#### SLA urgency

Based on review SLA, not task due time alone:

- 0.00: more than 50% of allowed review window remains
- 0.25: 25–50% remains
- 0.50: less than 25% remains
- 0.75: due or breached within the first breach threshold
- 1.00: breached beyond the configured escalation threshold

#### Downstream blockage

- 0.00: no known downstream dependency
- 0.33: one non-critical downstream step blocked
- 0.67: multiple steps or a significant milestone blocked
- 1.00: sale, delivery, customer commitment, or critical operational chain blocked below hard-rule threshold

#### Customer/delivery impact

- 0.00: internal-only routine work
- 0.33: indirect customer or readiness impact
- 0.67: direct customer commitment or delivery-stage impact
- 1.00: imminent or breached material impact below hard-rule threshold

#### Evidence deficiency

- 0.00: all required evidence accepted or present under policy
- 0.33: optional or low-impact deficiency
- 0.67: required evidence missing or pending response
- 1.00: required evidence rejected, contradictory, or repeatedly missing

#### Repeated-return pressure

- 0.00: never returned
- 0.50: returned once
- 1.00: returned at or beyond the configured repeat threshold

#### Aging/inactivity

Normalize elapsed time since the last meaningful event against category policy. Repeated heartbeat updates do not reset this clock.

#### Ownership ambiguity

- 0.00: accountable owner and next action are clear
- 0.50: ownership is technically present but next action/authority is unclear
- 1.00: no valid owner or owner cannot perform the required action

## 9. Stage E — Stable Ordering

Order eligible items by:

1. critical band: `CRITICAL`, then `HIGH`, then `NORMAL`
2. primary queue precedence when viewing All Attention
3. score descending
4. review SLA breach/due time ascending
5. eligible-since time ascending
6. stable subject identifier ascending

`HIGH` may be assigned by a configurable score threshold, initially proposed at 70. The threshold must be calibrated using real queue distributions.

Stable tie-breakers prevent rows from jumping unpredictably between refreshes.

## 10. Explanation Contract

Every eligible item must answer:

- Why is it in a manager queue?
- Why is it in this primary queue?
- Why is it ranked here?
- Which facts would change its position?
- What management actions are allowed?

Example:

> Priority 87 — delivery is due today, review is 42 minutes overdue, two downstream steps are blocked, and final QC evidence is missing.

The explanation is assembled from factor reason codes and authoritative display values. It must not be generated as unsupported prose.

## 11. Pseudocode

```text
function evaluate(subject, policy, now):
  inputs = loadAuthoritativeInputs(subject, now)
  fingerprint = hash(canonicalize(inputs, policy.version))

  eligibility = evaluateEligibility(inputs, policy)
  if eligibility.none:
    return ineligibleEvaluation(fingerprint, eligibility.reasons)

  queues = classifyQueues(inputs, policy)
  primaryQueue = firstByPrecedence(queues, policy.queuePrecedence)

  hardRule = evaluateHardRules(inputs, policy)
  factors = evaluateNormalizedFactors(inputs, policy)
  score = round(clamp(weightedSum(factors, policy.weights), 0, 100))

  criticalBand = hardRule.exists
    ? CRITICAL
    : score >= policy.highThreshold ? HIGH : NORMAL

  return {
    engineVersion: policy.engineVersion,
    eligible: true,
    primaryQueue,
    secondarySignals: queues - primaryQueue,
    hardRuleCode: hardRule.code,
    criticalBand,
    score,
    factors,
    explanations: assembleExplanations(inputs, eligibility, queues, hardRule, factors),
    inputFingerprint: fingerprint
  }
```

## 12. Re-evaluation Triggers

Evaluate when relevant facts change:

- task enters or exits a relevant state
- evidence is submitted, accepted, rejected, or requested
- due time, review SLA, risk, owner, blocker, or dependency changes
- a review decision occurs
- a customer/delivery/title/safety signal changes
- a bounded timer crosses warning, due, or escalation thresholds
- policy version changes

Time-based refresh may run at a fixed interval, but evaluation must be safe to retry and should skip unchanged fingerprints where practical.

## 13. Override And Feedback

Manager actions may differ from the recommended order or action. Record:

- evaluation shown
- decision taken
- override reason when policy requires it
- outcome and later operational result

An override is not automatically an engine error. It is calibration evidence.

The system must never automatically tune production weights from unreviewed behavior. Weight changes require a new version, offline comparison, approval, and rollback path.

## 14. Calibration Plan

Before production ranking controls manager workflow:

1. Build a representative scenario set with dealership stakeholders.
2. Have managers independently rank the scenarios.
3. Compare MAE-1 eligibility, queue, critical band, and order.
4. Resolve policy disagreements before weight tuning.
5. Run in shadow mode against live work.
6. Measure false urgency, missed urgency, order disagreement, and explanation clarity.
7. Approve a version for assisted operation.
8. Re-evaluate after a defined operating period.

Useful measures:

- critical recall: truly critical cases surfaced as critical
- false critical rate
- top-five agreement with manager judgment
- time to first intervention
- review SLA compliance
- rank override frequency by reason
- queue size distribution and aging

## 15. Test Contract

Required tests include:

- identical inputs produce identical output
- input order does not change output
- all scores remain within 0–100
- hard critical rules always outrank scored items
- each subject has exactly one primary queue
- secondary signals do not inflate headline counts
- missing optional data produces safe documented defaults
- missing required facts never creates unsupported critical status
- stable tie-breakers preserve order
- policy version changes are reproducible
- time-boundary tests cover warning, due, breach, and escalation instants
- operational blocker reporting alone does not create an employee-performance score
- explanation codes match factor calculations

## 16. MAE-1 Approval Gate

Before implementation, stakeholders must approve:

- eligibility rules
- primary queue precedence
- critical hard rules and their evidence sources
- review SLA normalization
- initial weights and high threshold for shadow testing
- explanation vocabulary
- prohibited inputs
- override and policy-version governance
