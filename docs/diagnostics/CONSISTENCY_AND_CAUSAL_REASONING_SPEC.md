# Consistency and Causal Diagnostic Reasoning Specification

**Version:** 1.0 governing planning baseline  
**Date:** 2026-07-20  
**Status:** Official target specification; no engine behavior activated  
**Governs:** `DGN-ALG-020` through `DGN-ALG-029` and their interaction with the full algorithm catalog

## 1. Purpose

This specification defines the logical backbone that keeps diagnosis consistent with the vehicle model and observed evidence. It prevents probable, popular, or AI-generated answers from being treated as confirmed when they contradict physical behavior, configuration, measurements, or unresolved evidence.

The engine must answer:

1. What behavior should the configured system produce?
2. What behavior was actually observed under known conditions?
3. Which assumptions cannot all remain true?
4. What minimal component, connection, control, environment, procedure, or evidence-quality abnormalities could explain the discrepancy?
5. Which test best distinguishes the remaining candidates?
6. Does the evidence support causation, association, or only compatibility?
7. Is the case confirmable, inconclusive, or outside the approved model?

## 2. Formal Diagnostic Contract

For each versioned evaluation, define:

- `SD`: applicable system description—components, connections, behavior, constraints, modes, control relationships, and environment;
- `COMPS`: components or assumable entities whose normal/abnormal behavior may be considered;
- `OBS`: qualified observations and measurements with operating context;
- `CTX`: vehicle configuration, time window, environmental state, test setup, and source versions;
- `ASSUME_OK(c)`: assumption that component/entity `c` behaves according to its approved normal model;
- `AB(c, mode)`: an approved abnormal behavior mode, where modeled;
- `GATES`: safety, authority, applicability, and evidence-quality constraints.

A candidate diagnosis `Δ` is admissible only if:

```text
SD ∪ OBS ∪ CTX
∪ {AB(c, mode) for candidates in Δ}
∪ {ASSUME_OK(c) for applicable components not displaced by Δ}
```

is logically/qualitatively consistent, all hard gates pass, and the candidate does not depend on an unsupported abnormal mode.

A diagnosis being **consistent** means it is not ruled out. It does not mean it is confirmed.

### Minimality

Prefer subset-minimal diagnoses for candidate generation: no proper subset of `Δ` should also explain the conflict under the same model. Probability, criticality, and test cost may rank minimal candidates but do not redefine logical minimality.

Non-minimal candidates may be retained only when:

- required to represent dependent/common-cause failures;
- supported by independent evidence for multiple faults;
- a known model limitation makes the minimal candidate misleading;
- explicitly requested for bounded what-if analysis.

## 3. Automotive System Model

The system description is layered so one modeling style does not pretend to capture the entire vehicle.

| Layer | Examples |
| --- | --- |
| Identity/configuration | VIN, market, engine, transmission, options, module/calibration, retrofit state. |
| Functional | Crank engine, supply fuel, generate spark, communicate, cool, brake, steer, charge. |
| Physical topology | Components, wiring, grounds, connectors, hoses, buses, gateways, mechanical paths. |
| Behavioral | Normal input/output relationships, tolerances, states, transitions, response times. |
| Control | Command, feedback, enable/inhibit, interlock, fallback, learned/adapted behavior. |
| Energy/material flow | Electrical energy, torque, pressure, fluid, air, fuel, heat, data. |
| Temporal | Wake/sleep, startup, warm-up, drive cycle, intermittent window, sequencing. |
| Hazard/authority | High voltage, fuel, restraint, road test, programming, secure functions. |
| Evidence acquisition | Instrument, probe, channel, location, calibration, loading, sampling, transformation. |

Every model element retains version, source, applicability, confidence/authority class, and review state.

## 4. Assumptions and Abnormal Modes

Assumable entities may include:

- physical components;
- wiring segments, terminals, grounds, connectors, buses, and gateways;
- power, ground, reference, signal, mechanical, fluid, and thermal paths;
- control modules, software/calibration, learned values, commands, and interlocks;
- tools, probes, test setup, and evidence quality;
- configuration records and external conditions;
- previous repair or installation state.

Abnormal modes should be specific when supported:

- open/high resistance;
- short-to-ground, short-to-power, or cross-circuit;
- stuck high/low, biased, noisy, intermittent, delayed, or implausible signal;
- leakage, restriction, insufficient flow/pressure, mechanical binding, loss of compression;
- no communication, bus loading, missing wakeup, gateway block;
- incorrect configuration/calibration/adaptation;
- wrong part, incorrect installation, contaminated connection, or procedural deviation;
- invalid measurement/test setup.

Do not invent a specific failure mode when the knowledge only supports generic abnormal behavior.

## 5. Observation Semantics

Each observation must identify:

- fact class (`CUSTOMER_REPORTED`, `OBSERVED`, `MEASURED`, `IMPORTED`, `CALCULATED`, or `INFERRED`);
- subject, value/unit, expected relationship, and tolerance source;
- vehicle/system operating state;
- location/test point and acquisition method;
- time or time window;
- source/instrument and calibration context;
- reliability, completeness, and independence group;
- raw evidence link and transformations;
- author/actor and correction/supersession lineage.

Customer-reported symptoms may initiate candidates and reproduction plans but cannot by themselves satisfy a measurement-dependent confirmation rule.

## 6. Conflict Detection

A conflict is a set of assumptions that cannot all be true given `SD`, `OBS`, and `CTX`.

Conflict types:

- physical-law conflict;
- topology/connectivity conflict;
- configuration/applicability conflict;
- state/transition conflict;
- timing/sequence conflict;
- command/feedback conflict;
- evidence-to-evidence conflict;
- procedure/test-setup conflict;
- source/tolerance conflict;
- conclusion-to-new-evidence conflict.

The engine should generate subset-minimal conflict sets where computationally feasible. Every conflict output includes:

- exact assumptions and observations involved;
- system/rule/source versions;
- severity and whether it is a hard blocker;
- plain-language explanation;
- candidate data-quality or model-limit explanation;
- safe tests capable of resolving the conflict.

Conflicting evidence is preserved. The system does not select the more convenient value or average incompatible measurements.

## 7. Candidate Generation

### Hitting-set method

For conflict sets `C1 ... Cn`, candidate diagnoses are minimal hitting sets: each candidate intersects every applicable conflict. The implementation may use an HS-tree or another validated equivalent.

Required controls:

- deterministic component/order tie-breaking;
- duplicate/subsumed candidate removal;
- candidate-size and search-depth bounds;
- common-cause/dependency representation;
- explicit incomplete-search indicator;
- checkpoint/resume or safe timeout behavior;
- no claim of exhaustiveness when the search or model is bounded.

### Candidate statuses

- `GENERATED`: logically compatible with current conflicts;
- `SUPPORTED`: has affirmative evidence beyond mere consistency;
- `CONTRADICTED`: incompatible with qualified evidence;
- `DISCRIMINATION_REQUIRED`: remains possible but needs separating evidence;
- `OUT_OF_MODEL`: requires unsupported behavior/model expansion;
- `REJECTED_BY_TECHNICIAN`: qualified rejection with rationale;
- `CONFIRMED`: human-confirmed under approved confirmation policy;
- `SUPERSEDED`: invalidated or replaced by later evidence/version.

## 8. Multiple and Common-Cause Faults

The engine must not assume one fault by default when evidence indicates otherwise.

Multiple-fault handling includes:

- bounded candidate cardinality;
- independent versus dependent failure distinction;
- shared power, ground, connector, bus, environment, installation, event, or maintenance cause;
- cascade effects separated from root abnormality;
- one fault masking another;
- one repair changing the observability of another fault;
- multiple concerns sharing or not sharing a cause.

Candidate ranking may prefer simpler explanations, but simplicity cannot erase direct evidence of additional faults.

## 9. Intermittent and Temporal Diagnosis

Evidence belongs to explicit time windows and vehicle states. “Not currently present” is not equivalent to “disproven.”

Required concepts:

- latent versus manifested abnormal state;
- wake/sleep/start/run/warm/load/road-cycle state;
- trigger conditions and recurrence window;
- repeated observation count and false-negative risk;
- flight-recorder or snapshot context;
- change-point and transient evidence;
- environmental correlation;
- persistence and decay assumptions;
- observation-validity expiration.

Intermittent candidates require a capture/reproduction plan and a stated residual probability of nondetection where quantification is justified.

## 10. Causal Reasoning

The platform distinguishes:

- **association:** conditions appear together;
- **compatibility:** a candidate is not contradicted by the model;
- **causal support:** the system model predicts the evidence from the candidate;
- **interventional support:** an approved test/action changes behavior as predicted;
- **confirmation:** applicable human and evidence policy is satisfied.

### Forward reasoning

For each candidate, predict expected downstream effects, missing expected effects, and possible masking conditions. A candidate is weakened when reliable expected consequences are absent unless the model explains the absence.

### Backward reasoning

Trace observations through functional and physical dependencies to candidate sources. Backward reachability generates possibilities; it does not establish causal truth.

### Counterfactual/intervention reasoning

Where safe and authorized, compare:

```text
predicted behavior if candidate remains
versus
predicted behavior under a controlled test or correction
```

An intervention must not be confused with a repair authorization. Tests with material risk, cost, configuration change, coding, programming, or security consequences require their governing authority.

## 11. Interaction with Probability and Evidence Fusion

Consistency generates and eliminates candidates; probability ranks candidates only after logical and safety filtering.

Rules:

- an inconsistent candidate receives no rank as a viable cause;
- priors and likelihoods retain population, applicability, and calibration provenance;
- correlated evidence is not counted as independent support;
- unknown or unmodeled behavior increases uncertainty and may force abstention;
- Dempster–Shafer/fuzzy methods may express incomplete or imprecise evidence but cannot relax hard constraints;
- known-fix frequency is a prior-like signal, not confirmation;
- confidence displays must distinguish logical coverage, probabilistic estimate, evidence quality, and human confirmation.

## 12. Truth Maintenance and Revision

The case must support non-monotonic revision: new evidence can retract an inference without deleting history.

On observation correction, invalidation, source withdrawal, configuration correction, or model/rule supersession:

1. identify dependent evaluations, conflicts, candidates, plans, conclusions, and recommendations;
2. mark affected results stale or invalid;
3. recompute using the new immutable input version;
4. retain the prior result and its exact inputs;
5. require re-confirmation when a published conclusion materially depends on changed evidence;
6. propagate affected state to estimate/job/QC consumers without silently canceling authorized work.

## 13. Next-Test Selection

Tests first pass:

- vehicle/source applicability;
- safety, authority, and technician qualification;
- required vehicle state and prerequisites;
- tool/instrument/bay readiness;
- non-destructive preference where diagnostic value is comparable;
- customer/internal diagnostic authorization and cost boundary;
- evidence independence and test reliability.

Eligible tests may then be ranked by:

- expected conflict/candidate discrimination;
- expected information gain or value of information;
- ability to distinguish high-risk/common-cause candidates;
- reliability and result interpretability;
- technician time, setup time, customer/shop cost;
- invasiveness, safety, and risk of changing the fault state;
- resource availability and downstream unblocking;
- multi-step expected path value.

The engine shows alternatives and material factors. A qualified technician may choose another eligible test with rationale.

## 14. Confirmation, Abstention, and Closure

A cause can be confirmed only when:

- exact vehicle/model/source applicability is established;
- required observations/tests and confirmation rules are satisfied;
- no unresolved hard contradiction remains;
- alternative candidates are eliminated, acceptably differentiated, or explicitly retained as uncertainty;
- evidence quality and independence are sufficient;
- the confirmer has required capability/qualification;
- safety-critical independent review is complete where required;
- the conclusion identifies uncertainty and any residual risk.

The engine abstains when the model is incomplete, search bounds prevent adequate coverage, evidence is insufficient/conflicting, the case is out of applicability, or required safe testing is unavailable.

Post-repair closure separately requires concern-specific verification; cause confirmation alone is not repair verification.

## 15. Evaluation Output Contract

Every consistency/causal evaluation produces an immutable record containing:

- case, concern, vehicle configuration, and evaluation time;
- model, rule, test, algorithm, and source versions;
- observations included/excluded and reasons;
- assumptions and abnormal modes considered;
- conflicts and minimality state;
- candidate diagnoses and generation completeness;
- support, contradiction, causal predictions, and missing expected evidence;
- rank factors from any downstream probabilistic/optimization method;
- recommended discriminating tests and alternatives;
- hard blockers, abstention state, and required human decision;
- computation duration, bounds, timeout/degraded state;
- correlation/causation identifiers and supersession lineage.

## 16. Initial No-Start Model Example

Illustrative—not an approved production test plan:

```text
Function: engine cranks
  requires sufficient battery energy
  requires acceptable positive and ground path voltage drop
  requires starter capable of converting electrical energy to torque
  requires engine mechanically capable of rotation
  requires valid start request and satisfied control interlocks
  may require module/network/security enablement depending on configuration
```

Example qualified observations:

- start request is present;
- starter command is present under load;
- battery voltage remains within the applicable loaded threshold;
- excessive drop is measured across the ground path;
- starter speed is insufficient.

The healthy assumptions for all ground-path elements conflict with the measured drop. The resulting minimal candidate set should focus on applicable ground connections/segments or measurement setup—not jump directly to starter replacement because slow crank commonly accompanies a starter complaint.

The next test should discriminate the ground segments or validate the measurement setup. Only after the path conflict is resolved should remaining starter/mechanical candidates be re-evaluated.

## 17. Computational Safety

Model-based diagnosis can grow combinatorially. Implementations require:

- subsystem scoping based on qualified observations and topology;
- incremental conflict generation;
- minimal-conflict caching keyed by immutable versions;
- dependency/common-cause compression;
- candidate cardinality, time, and memory limits;
- explainable pruning rules;
- deterministic ordering;
- incomplete-search disclosure;
- background evaluation for expensive analysis without blocking case reads;
- cancellation and safe retry;
- no automatic confirmation when bounds are reached.

## 18. Validation Scenarios

At minimum:

- single known fault;
- multiple independent faults;
- common power/ground fault producing multiple symptoms;
- cascading fault versus root fault;
- wrong vehicle configuration;
- incorrect or uncalibrated measurement;
- two measurements in direct conflict;
- stale source/specification;
- intermittent manifestation and nondetection;
- unknown/out-of-model behavior;
- candidate explosion and bounded timeout;
- new evidence retracting a published inference;
- AI/common-fix suggestion contradicted by physical evidence;
- repair changes one symptom but original concern remains;
- no-fault-found with inadequate reproduction conditions.

Gold scenarios must specify expected conflicts, acceptable candidate sets, required abstention, prohibited conclusions, and safe next tests—not only a final component label.

## 19. Foundational Basis and Limits

The consistency formulation follows the model-based diagnostic tradition established by Reiter and the multiple-fault/assumption-based truth-maintenance work of de Kleer and Williams. Causal/probabilistic extensions require explicit assumptions and cannot infer automotive causation merely from repair-frequency correlations.

The formal techniques are foundations, not automotive validation. Every production model must still be sourced, vehicle-applicable, reviewed by qualified experts, scenario-tested, shadowed, monitored, and reversible.

