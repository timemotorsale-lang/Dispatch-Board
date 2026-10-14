# Enterprise Diagnostic Algorithm Catalog

**Identifier family:** `DGN-ALG-*`  
**Version:** 1.0 governing planning baseline  
**Date:** 2026-07-20  
**Status:** Official algorithm architecture; algorithms are not activated by this document  
**Companion specification:** [`CONSISTENCY_AND_CAUSAL_REASONING_SPEC.md`](CONSISTENCY_AND_CAUSAL_REASONING_SPEC.md)

## 1. Purpose

This catalog establishes the approved reasoning families available to the Enterprise Diagnostics Console. It is intended to provide comprehensive coverage of the major proven approaches needed for consistent, efficient, explainable automotive diagnosis without claiming that diagnostic science is finite or that every technique should be active for every case.

The platform uses a governed ensemble:

```text
applicability and data quality
  -> deterministic safety and engineering constraints
  -> consistency and causal candidate generation
  -> probabilistic/evidential ranking where justified
  -> sequential test optimization
  -> signal and temporal analysis
  -> qualified human conclusion
  -> repair verification and outcome learning
```

No probabilistic, statistical, machine-learned, or generative result can overrule an unresolved hard contradiction, vehicle-applicability failure, safety gate, authorization requirement, or qualified confirmation rule.

## 2. Standard Algorithm Contract

Every implemented algorithm version must define:

1. stable algorithm and version identity;
2. purpose, scope, and prohibited uses;
3. system/vehicle applicability;
4. trigger and execution mode;
5. exact inputs, units, schemas, and authoritative sources;
6. freshness, reliability, completeness, and independence requirements;
7. assumptions and known limitations;
8. prerequisites, hard gates, and eligibility rules;
9. mathematical/logical method and deterministic tie-breaking;
10. outputs, reason codes, alternatives, and exclusions;
11. confidence/uncertainty semantics;
12. contradiction and missing-data behavior;
13. abstention and escalation conditions;
14. human authority and override rules;
15. computational bounds and degraded behavior;
16. scenario, property, regression, and adversarial tests;
17. evaluation measures and approved thresholds;
18. telemetry, drift, failure, and harmful-output monitoring;
19. owner, approver, effective dates, release state, kill switch, and rollback predecessor;
20. outcome-correlation and controlled-calibration contract.

## 3. Release and Authority States

Algorithm release states:

`DRAFT -> TECHNICAL_REVIEW -> VALIDATED -> SHADOW -> ASSISTIVE -> BOUNDED_ACTION -> SUSPENDED -> RETIRED`

Authority classes:

| Class | Permitted behavior |
| --- | --- |
| `CALCULATE` | Produce a unit-safe deterministic value from validated inputs. |
| `DETECT` | Identify quality, anomaly, conflict, applicability, or hazard conditions. |
| `EXPLAIN` | Explain a rule, result, source, or evidence relationship. |
| `RECOMMEND` | Rank hypotheses, tests, or next actions with reasons and alternatives. |
| `DRAFT` | Prepare structured content requiring confirmation. |
| `GATE` | Enforce an approved non-waivable or authorized-override rule. |
| `CONFIRM` | Reserved for explicit qualified human commands; no unattended algorithm receives this authority. |

## 4. Registry

### 4.1 Applicability, identity, and data quality

| ID | Algorithm | Primary output | Initial authority |
| --- | --- | --- | --- |
| `DGN-ALG-001` | Vehicle identity/configuration resolver | Configuration match, conflicts, missing attributes | `DETECT` |
| `DGN-ALG-002` | Knowledge applicability resolver | Eligible source/rule/test versions and exclusions | `GATE` |
| `DGN-ALG-003` | Source authority/freshness evaluator | Authority class, freshness, withdrawal, degraded state | `GATE` |
| `DGN-ALG-004` | Unit and dimensional validator | Normalized quantity or rejected mismatch | `GATE` |
| `DGN-ALG-005` | Measurement plausibility evaluator | Plausible, suspect, impossible, or context-required | `DETECT` |
| `DGN-ALG-006` | Evidence completeness evaluator | Missing required facts/evidence | `DETECT` |
| `DGN-ALG-007` | Evidence independence/correlation evaluator | Dependency groups and double-count prevention | `DETECT` |
| `DGN-ALG-008` | Instrument/calibration quality evaluator | Measurement-quality class and limitation | `GATE` |
| `DGN-ALG-009` | Configuration/source contradiction detector | Hard or reviewable applicability conflict | `GATE` |

### 4.2 Deterministic rules and engineering calculations

| ID | Algorithm | Primary output | Initial authority |
| --- | --- | --- | --- |
| `DGN-ALG-010` | Versioned predicate/rule evaluator | Rule results and reason codes | `GATE`/`DETECT` |
| `DGN-ALG-011` | Decision graph/state-machine evaluator | Eligible branch and required transition | `GATE` |
| `DGN-ALG-012` | Constraint-satisfaction evaluator | Valid combinations and violated constraints | `GATE` |
| `DGN-ALG-013` | Ohm/power/energy calculation suite | Unit-safe electrical results | `CALCULATE` |
| `DGN-ALG-014` | Kirchhoff circuit consistency evaluator | Current/voltage balance conflicts | `DETECT` |
| `DGN-ALG-015` | Loaded voltage-drop evaluator | Path loss and suspect segment | `CALCULATE`/`DETECT` |
| `DGN-ALG-016` | Series/parallel circuit solver | Expected node/branch behavior | `CALCULATE` |
| `DGN-ALG-017` | Parasitic-draw and sleep-state evaluator | Draw state, timing, suspected branch | `RECOMMEND` |
| `DGN-ALG-018` | Pressure/flow/thermal/tolerance calculator | Expected range and deviation | `CALCULATE` |
| `DGN-ALG-019` | Mechanical relationship calculator | Speed, ratio, compression, contribution, force/torque relationships | `CALCULATE` |

### 4.3 Model-based, consistency-based, and causal diagnosis

| ID | Algorithm | Primary output | Initial authority |
| --- | --- | --- | --- |
| `DGN-ALG-020` | System behavior consistency checker | Consistent/inconsistent model-observation set | `DETECT` |
| `DGN-ALG-021` | Assumption-based truth maintenance | Supported beliefs, environments, retractions | `DETECT` |
| `DGN-ALG-022` | Minimal conflict-set generator | Minimal incompatible healthy-assumption sets | `DETECT` |
| `DGN-ALG-023` | Minimal hitting-set diagnosis generator | Minimal candidate fault sets | `RECOMMEND` |
| `DGN-ALG-024` | Multiple-fault candidate generator | Bounded multi-component diagnoses | `RECOMMEND` |
| `DGN-ALG-025` | Functional dependency propagation | Upstream/downstream affected functions | `DETECT`/`RECOMMEND` |
| `DGN-ALG-026` | Qualitative physics/model simulator | Predicted qualitative behavior | `CALCULATE`/`DETECT` |
| `DGN-ALG-027` | Forward causal simulation | Predicted evidence if candidate were true | `EXPLAIN` |
| `DGN-ALG-028` | Backward causal explanation | Candidate causes capable of producing evidence | `RECOMMEND` |
| `DGN-ALG-029` | Counterfactual/intervention evaluator | Predicted change under approved test/action | `RECOMMEND` |

The formal contract for `DGN-ALG-020` through `029` is governed by the companion consistency and causal reasoning specification.

### 4.4 Reliability and hazard reasoning

| ID | Algorithm | Primary output | Initial authority |
| --- | --- | --- | --- |
| `DGN-ALG-030` | Failure Mode and Effects Analysis evaluator | Applicable failure modes/effects/detection methods | `RECOMMEND` |
| `DGN-ALG-031` | Failure criticality evaluator | Safety/mission/customer consequence band | `GATE`/`RECOMMEND` |
| `DGN-ALG-032` | Fault-tree evaluator | Minimal cut sets and top-event support | `DETECT` |
| `DGN-ALG-033` | Event-tree evaluator | Consequence branches under conditions/actions | `EXPLAIN` |
| `DGN-ALG-034` | Common-cause/dependency failure detector | Shared-source and coupled-failure candidates | `DETECT` |
| `DGN-ALG-035` | Hazard/prerequisite evaluator | Required isolation, PPE, qualification, equipment, and stop state | `GATE` |

### 4.5 Probabilistic and evidential reasoning

| ID | Algorithm | Primary output | Initial authority |
| --- | --- | --- | --- |
| `DGN-ALG-040` | Bayesian hypothesis updater | Posterior candidate ranking with assumptions | `RECOMMEND` |
| `DGN-ALG-041` | Bayesian network inference | Conditional system/fault probabilities | `RECOMMEND` |
| `DGN-ALG-042` | Dynamic Bayesian/hidden-state evaluator | Time-dependent latent-state estimates | `RECOMMEND` |
| `DGN-ALG-043` | Likelihood-ratio evidence evaluator | Evidence support magnitude | `EXPLAIN`/`RECOMMEND` |
| `DGN-ALG-044` | Dempster–Shafer evidence fusion | Belief/plausibility ranges and conflict | `RECOMMEND` |
| `DGN-ALG-045` | Fuzzy symptom/tolerance evaluator | Graded membership and rule result | `RECOMMEND` |
| `DGN-ALG-046` | Reliability-weighted evidence aggregator | Quality-adjusted support without double counting | `RECOMMEND` |
| `DGN-ALG-047` | Confidence calibration evaluator | Calibration error and confidence correction | `DETECT` |
| `DGN-ALG-048` | Out-of-distribution/unknown-condition detector | In-scope, uncertain, or abstain | `GATE` |

Probabilistic values are decision-support estimates, not confirmed facts. Use requires validated priors/likelihoods or an explicit qualitative probability policy.

### 4.6 Sequential testing and diagnostic optimization

| ID | Algorithm | Primary output | Initial authority |
| --- | --- | --- | --- |
| `DGN-ALG-050` | Expected information-gain evaluator | Expected uncertainty reduction by test | `CALCULATE` |
| `DGN-ALG-051` | Value-of-information evaluator | Expected decision value of additional evidence | `RECOMMEND` |
| `DGN-ALG-052` | Information-to-cost evaluator | Diagnostic value relative to time/cost/risk | `RECOMMEND` |
| `DGN-ALG-053` | Adaptive test-plan branch selector | Next eligible test and alternatives | `RECOMMEND` |
| `DGN-ALG-054` | Multi-step test look-ahead | Bounded expected path value | `RECOMMEND` |
| `DGN-ALG-055` | Test reliability/false-result evaluator | Sensitivity, specificity, repeatability limitations | `EXPLAIN` |
| `DGN-ALG-056` | Test readiness/resource filter | Eligible tests under vehicle/tool/bay/skill/time state | `GATE` |
| `DGN-ALG-057` | Diagnostic stopping-rule evaluator | Continue, confirmable, inconclusive, or abstain | `GATE`/`RECOMMEND` |
| `DGN-ALG-058` | Parallel-test/package optimizer | Safe grouped measurements and dependency plan | `RECOMMEND` |

### 4.7 Signal, waveform, network, and temporal reasoning

| ID | Algorithm | Primary output | Initial authority |
| --- | --- | --- | --- |
| `DGN-ALG-060` | Time-domain feature extractor | Amplitude, period, duty, pulse, edge, rise/fall, timing | `CALCULATE` |
| `DGN-ALG-061` | Frequency-domain/FFT analyzer | Spectral components and anomalies | `DETECT` |
| `DGN-ALG-062` | Filtering/noise/aliasing evaluator | Signal-quality and processing limitations | `DETECT` |
| `DGN-ALG-063` | Cross-correlation/phase evaluator | Relative timing and similarity | `CALCULATE` |
| `DGN-ALG-064` | Known-good waveform comparator | Difference features with applicability | `RECOMMEND` |
| `DGN-ALG-065` | Current-ramp/contribution analyzer | Event/cylinder/component contribution differences | `RECOMMEND` |
| `DGN-ALG-066` | Pressure-waveform analyzer | Mechanical event timing/shape differences | `RECOMMEND` |
| `DGN-ALG-067` | CAN/CAN FD electrical integrity evaluator | Termination, level, edge, noise, and physical-layer findings | `DETECT` |
| `DGN-ALG-068` | Network topology/communication dependency evaluator | Missing modules, gateway/bus dependency candidates | `RECOMMEND` |
| `DGN-ALG-069` | Temporal sequence/state reconstruction | Ordered state/event explanation | `EXPLAIN` |
| `DGN-ALG-070` | Change-point/transient detector | Material state change or intermittent event | `DETECT` |
| `DGN-ALG-071` | Intermittent-fault persistence evaluator | Recurrence/persistence estimate and capture plan | `RECOMMEND` |
| `DGN-ALG-072` | Operating-condition correlator | Temperature/load/speed/time/environment association | `RECOMMEND` |

Signal algorithms must preserve raw captures, acquisition settings, probe/instrument metadata, transformations, and derived-feature lineage.

### 4.8 Case-based, statistical, and machine-learned reasoning

| ID | Algorithm | Primary output | Initial authority |
| --- | --- | --- | --- |
| `DGN-ALG-080` | Verified similar-case retrieval | Ranked comparable cases and differences | `RECOMMEND` |
| `DGN-ALG-081` | Case applicability/distance evaluator | Similarity and disqualifying differences | `DETECT` |
| `DGN-ALG-082` | Known-fix frequency analyzer | Frequency with population/source caveats | `EXPLAIN` |
| `DGN-ALG-083` | Supervised fault classifier | Candidate class probabilities | `RECOMMEND` |
| `DGN-ALG-084` | Unsupervised anomaly detector | Novel/abnormal pattern and distance | `DETECT` |
| `DGN-ALG-085` | Diagnostic duration forecaster | Time range and uncertainty | `RECOMMEND` |
| `DGN-ALG-086` | Failure/recurrence survival model | Risk range over time/usage | `RECOMMEND` |
| `DGN-ALG-087` | Model drift/data shift monitor | Drift, affected population, pause recommendation | `DETECT` |
| `DGN-ALG-088` | Fairness/workload impact evaluator | Disparate impact and workload-quality warnings | `DETECT` |
| `DGN-ALG-089` | Feature attribution/explanation adapter | Model factor contribution with limitations | `EXPLAIN` |

Correlation-based methods cannot establish a cause without consistency, causal, test, and confirmation evidence.

### 4.9 Repair verification and outcome reasoning

| ID | Algorithm | Primary output | Initial authority |
| --- | --- | --- | --- |
| `DGN-ALG-090` | Before/after evidence comparator | Material changes and remaining deviations | `DETECT` |
| `DGN-ALG-091` | Original-concern reproduction evaluator | Reproduced, absent under valid protocol, or inconclusive | `GATE` |
| `DGN-ALG-092` | Post-scan/regression comparator | Cleared, persistent, new, or unrelated conditions | `DETECT` |
| `DGN-ALG-093` | Repair-effect causal consistency evaluator | Whether observed change supports the correction | `RECOMMEND` |
| `DGN-ALG-094` | Verification completeness evaluator | Missing acceptance evidence | `GATE` |
| `DGN-ALG-095` | Comeback/recurrence correlation | Same, related, unrelated, or uncertain concern | `RECOMMEND` |
| `DGN-ALG-096` | Outcome attribution evaluator | Recommendation/action/repair/verification linkage | `EXPLAIN` |
| `DGN-ALG-097` | Unnecessary-parts indicator | Review signal with uncertainty and authorization context | `DETECT` |
| `DGN-ALG-098` | Calibration proposal generator | Versioned threshold/weight/duration proposal | `DRAFT` |

### 4.10 Language and AI assistance

| ID | Algorithm | Primary output | Initial authority |
| --- | --- | --- | --- |
| `DGN-ALG-100` | Technician dictation structurer | Draft observations/measurements with clarification needs | `DRAFT` |
| `DGN-ALG-101` | Evidence-grounded case summarizer | Cited case summary | `DRAFT` |
| `DGN-ALG-102` | Missing/contradictory evidence assistant | Draft gaps and conflicts | `DETECT`/`DRAFT` |
| `DGN-ALG-103` | Procedure/engineering explanation assistant | Source-cited explanation | `EXPLAIN` |
| `DGN-ALG-104` | Hypothesis draft assistant | Candidate draft, sources, uncertainty | `DRAFT` |
| `DGN-ALG-105` | Test-plan draft assistant | Candidate tests and questions | `DRAFT` |
| `DGN-ALG-106` | Repair-handoff draft assistant | Structured draft from confirmed conclusion | `DRAFT` |
| `DGN-ALG-107` | Customer-language draft assistant | Plain-language draft from approved facts | `DRAFT` |
| `DGN-ALG-108` | Groundedness/citation validator | Supported, unsupported, conflicting, or missing citation | `GATE` |
| `DGN-ALG-109` | Prompt-injection/tool-policy evaluator | Untrusted-input and unauthorized-action blocks | `GATE` |

AI remains optional. Disabling it must not disable the deterministic case, evidence, reasoning, repair, or verification workflows.

## 5. Ensemble Precedence

When methods disagree, apply this order:

1. law, safety, authorization, and secure-access controls;
2. vehicle identity/configuration and approved source applicability;
3. directly observed and valid measured evidence;
4. deterministic engineering constraints and confirmed physical relationships;
5. consistency/conflict and causal-model results;
6. approved OEM procedure/test interpretation;
7. calibrated probabilistic/evidential reasoning;
8. verified similar-case and known-fix information;
9. statistical/machine-learned prediction;
10. generative drafts.

Lower-precedence output can identify a need to review higher-precedence information, but cannot silently replace it.

## 6. Algorithm Selection by Diagnostic Need

| Need | Required foundation | Optional enhancers |
| --- | --- | --- |
| Confirm a circuit contradiction | 001–016, 020–023 | 040, 050–055 |
| Isolate multiple possible faults | 020–029, 034 | 040–046, 050–058 |
| Choose the next test | 002–009, 020–029, 050–057 | 040–048, 080–082 |
| Diagnose an intermittent fault | 005–008, 020–029, 060–072 | 042, 044, 080–087 |
| Interpret a waveform | 001–009, 060–068 | 026–029, 040–046, 080–084 |
| Confirm a repair | 090–096 plus concern-specific rules | 086, 095–098 |
| Draft with AI | Complete governed case and 108–109 | 100–107 |

## 7. Validation Standard

No algorithm reaches `ASSISTIVE` until it passes:

- technical reference cases reviewed by qualified diagnosticians;
- normal, boundary, missing, conflicting, multiple-fault, intermittent, unsafe, stale-source, wrong-vehicle, wrong-unit, and out-of-scope scenarios;
- deterministic replay tests where the method is deterministic;
- calibration and discrimination analysis where probabilistic;
- known-good/known-bad and blinded evaluation where feasible;
- latency, computational-bound, failure, and degraded-operation tests;
- explanation, abstention, override, permission, audit, and rollback tests;
- shadow comparison against qualified human workflow without using the comparison as automatic truth;
- explicit approval appropriate to safety and impact.

## 8. Foundational References

The consistency architecture is informed by Raymond Reiter's model-based diagnosis formulation and de Kleer/Williams multiple-fault and assumption-based truth-maintenance work. Bayesian/causal components follow explicit graphical-model assumptions rather than treating association as causation. Sequential test selection balances information gain with cost, risk, reliability, and operational readiness.

These references inform the architecture; they do not grant rights to proprietary automotive data or eliminate the need for automotive validation.

- Raymond Reiter, “A Theory of Diagnosis from First Principles,” *Artificial Intelligence* 32 (1987).
- Johan de Kleer and Brian C. Williams, “Diagnosing Multiple Faults,” *Artificial Intelligence* 32 (1987).
- Johan de Kleer, “An Assumption-Based TMS,” *Artificial Intelligence* 28 (1986).
- Judea Pearl, Bayesian networks and causal graphical-model publications, UCLA Cognitive Systems Laboratory.

## 9. Catalog Change Rule

New algorithms may be added without weakening the standard contract, precedence, authority boundaries, or validation gate. Removing or materially changing an algorithm requires affected-case/version analysis, migration or retention behavior, shadow comparison, approval, and rollback evidence.

