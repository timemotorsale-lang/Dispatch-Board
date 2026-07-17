# Measurement, Evaluation, and Calibration

**Status:** Proposed balanced-scorecard and model-governance contract

## 1. Measurement hierarchy

Evaluation must first confirm no deterioration in safety, authorization, privacy, evidence integrity, quality, or staff fairness. Only then may flow, capacity, margin, or retention gains support expansion.

## 2. Primary measures

| Domain | Measures |
| --- | --- |
| Safety/control | Invalid start attempts, safety stops, unauthorized scope, gate-bypass attempts, incidents |
| Flow | Intake-to-diagnosis, authorization wait, ready wait, active time, parts wait, blocked time, WIP, throughput |
| Capacity | Eligible capacity, scheduled load, productive utilization, bay blocking, schedule adherence, overtime |
| Commitments | Promised-time reliability, forecast error/range coverage, update timeliness, frontline target attainment |
| Parts | Fill/reservation accuracy, first-time part accuracy, ETA error, emergency orders, return/core/warranty recovery |
| Quality | First-pass yield, QC failure, rework hours/cost, repeat repair/comeback, road-test failure |
| Financial | Effective labor rate, parts/labor gross, estimate-to-actual variance, discount leakage, unapplied credits |
| Customer | Authorization cycle, unanswered contacts, heat-case precision/recall, recovery time, CSI/review signal |
| Staff | Assignment balance, complexity mix, interruptions, assistance/training opportunity, challenge/correction rate |
| Algorithm | Coverage, recommendation acceptance, override, false alert, missing/stale input, latency, execution success |

## 3. Metric definitions

```text
Productivity = repair-order clocked hours / eligible present hours
Efficiency = approved earned hours / repair-order clocked hours
Proficiency = approved earned hours / eligible present hours
First-pass yield = jobs passing initial QC without attributable rework / jobs initially submitted
Promise reliability = commitments met within approved tolerance / due commitments
Ready-to-start accuracy = recommended-ready jobs that start without prerequisite failure / recommended-ready starts
Forecast coverage = actual completions inside predicted range / evaluated completions
```

All denominators, reporting windows, work classes, exclusions, corrections, and source confidence are versioned. Metrics are operational signals, not automatic employee judgments.

## 4. Outcome attribution

Each material decision retains recommendation, eligible alternatives, selected action, actor/override, expected effect, execution result, actual outcome, confounders, and measurement window. A correlation between recommendation acceptance and outcome is not automatically causal.

## 5. Shadow evaluation

Before staff see recommendations, replay or shadow the algorithm against live facts without affecting work. Evaluate eligibility violations, missing data, ranking stability, forecast calibration, subgroup/work-class differences, false alerts, staff review, and safe fallback. Do not backtest on outcomes unavailable at decision time.

## 6. Pilot comparison

Use matched pre-period and pilot measures, stratified by customer-pay/inventory recon, work class, technician skill class, parts dependency, appointment/walk-in, and risk. Record seasonality, staffing, policy, vendor, construction/equipment, and demand changes. Prefer controlled staggered activation when operationally feasible.

## 7. Drift and harm monitoring

Monitor input distribution, missingness, freshness, source changes, score/rank distribution, confidence, override reasons, forecast error, false heat cases, message suppression, quality, safety, margin, and staff allocation. Alerts require an owner and response playbook.

## 8. Calibration change control

Production models never self-modify. A change requires:

1. documented problem and evidence;
2. proposed policy/algorithm version and affected scope;
3. offline validation and scenario regression;
4. safety, financial, privacy, quality, and fairness review;
5. approval and effective date;
6. shadow/canary rollout;
7. monitoring and rollback threshold;
8. retained old version and reproducible decision history.

## 9. Expansion gate

Expand only after the minimum observation window, sufficient representative outcomes, zero unresolved critical control failure, acceptable data quality, stable staff usability, no material protected harm, approved outcome thresholds, and a tested rollback. A revenue or utilization improvement alone is insufficient.
