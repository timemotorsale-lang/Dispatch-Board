# DGN-005 — Benchmark, Measurement, and Pilot Contract

**Status:** Implemented contract; benchmark execution and pilot deferred  
**Date:** 2026-07-20  
**Gate contribution:** `DG-G0`

## Benchmark objective

Evaluate whether Dispatch Board improves evidence-driven diagnostic work against representative OEM, multi-brand guided, integrated scan/scope, precision measurement, and repair-information workflows. Feature counts and vendor marketing claims are not acceptance evidence.

## Standard benchmark case path

1. Identify exact vehicle/configuration.
2. Preserve and reproduce the concern.
3. Perform whole-vehicle scan/topology review where applicable.
4. Select relevant live data and physical measurements.
5. Generate and compare competing causes.
6. Select/execute discriminating tests.
7. Handle contradictory, missing, intermittent, and out-of-model evidence.
8. Confirm or abstain.
9. Publish controlled repair recommendation.
10. Verify the repair and preserve outcome.

Representative comparison classes: OEM diagnostic platform, Bosch/TEXA-style guided multi-brand platform, Snap-on/Autel-style integrated scan/measurement platform, Pico-style waveform workflow, and ALLDATA-style repair-information intelligence. Product access, subscription, availability, and current features must be revalidated at execution time.

## Benchmark evidence

For each case/tool record steps, elapsed and active time, tests, evidence captured, dead ends, source/applicability clarity, safety/authority behavior, contradictions, alternatives, conclusion basis, verification, handoffs, interruptions, and operator assessment. Do not extract or reproduce protected content.

## Balanced measurement catalog

| Measure | Definition direction | Guardrail |
| --- | --- | --- |
| Concern reproduction quality | Valid reproduction or justified bounded nondetection | No pressure to reproduce unsafely |
| Time to confirmed cause | Qualified active diagnostic time to confirmation | Case-mix and waiting time separated |
| First-time verified resolution | Original concern passes required verification without recurrence window failure | Code clearing/part replacement is not success |
| Unsupported conclusion rate | Conclusions lacking applicable evidence/gates | Critical release blocker |
| Test usefulness | Recommended test materially discriminated candidates or satisfied a required gate | Override is not automatically negative |
| Unnecessary-parts review signal | Part replacement without supported cause/approved experiment | Review signal, not automatic blame |
| Inconclusive/no-fault-found quality | Required reproduction, evidence, uncertainty, and next-step completeness | Lower rate is not always better |
| Comeback/recurrence | Same/related concern after verified closure | Attribution reviewed, not presumed |
| Evidence completeness | Required condition, unit, instrument, source, raw link, actor, time | Documentation burden monitored |
| Safety/source blocks | Correct prevention and escalation | More legitimate blocks may indicate safer behavior |
| Recommendation override outcome | Why alternative chosen and result | Used for learning, not discipline |
| Technician blocked/waiting time | Tool, source, authorization, bay, vehicle, expert delays | Separate system constraints from technician work |
| Usability | Task success, errors, navigation, resume, cognitive load | Qualified users and real devices |
| Reliability | command integrity, duplicate safety, latency, recovery | No acknowledged partial commit |

No invented numeric targets are approved before baseline collection. Critical safety, privacy, integrity, or unsupported-conclusion failure cannot be offset by favorable averages.

## Telemetry contract

Telemetry is derived from governed case events and operational clocks, not unrestricted note scraping. Every measure records organization/location, anonymized or authorized actor/cohort dimension, case/system family, vehicle/applicability class, event and policy versions, timestamps, correlation ID, outcome availability, and data-quality status.

Active technician time, elapsed shop time, waiting time, test time, advisor/customer delay, parts delay, and post-repair observation window remain separate. Dashboard aggregates must drill back to permission-filtered case evidence. Metric-definition versions are immutable; changed definitions do not silently rewrite historical comparisons.

Prohibited telemetry uses include hidden individual productivity scoring, inferred safety violations without review, case-mix-blind ranking, treating override/abstention as failure, and exporting personal or vehicle data beyond its approved purpose.

## Retention and privacy

- diagnostic case/audit/evidence retention follows the governing Repair Order, legal, warranty, safety, and organization policy; the strictest applicable hold wins;
- raw tool files may have a different storage class from normalized measurements, but deletion cannot orphan required lineage;
- benchmark operator notes and recordings require notice, access controls, purpose limitation, and an approved deletion date;
- evaluation corpora use de-identification or explicit authorization and preserve the case/source license constraints;
- metric aggregates retain definition and provenance even after lawful deletion of direct identifiers;
- legal hold, source withdrawal, privacy deletion, export, and restoration behavior must be tested before pilot.

## Simulation and evaluation separation

- Gold cases and hidden answers are permission-restricted.
- Training cases are separated from blinded evaluation cases.
- Historical cases require provenance, privacy, and leakage review.
- Synthetic cases are labeled and do not establish field prevalence.
- Human comparison is reviewed by qualified experts; disagreement triggers case review rather than automatically making either side truth.

## Pilot boundary

Initial pilot is limited to:

- one approved location;
- named trained technicians/diagnosticians, advisor, foreman, safety owner, support owner;
- starting/charging/no-start cases within approved vehicle/source coverage;
- assistive diagnostic guidance with human confirmation;
- no autonomous active tests, programming, purchasing, authorization, customer promises, QC, release, or AI diagnosis;
- feature-flagged cohort and case-type controls.

## Pilot stages

```text
Offline scenarios -> shadow case evaluation -> supervised training
  -> limited live assistive pilot -> daily review -> explicit rollout decision
```

## Pause and rollback criteria

Immediate pause for unsafe guidance/action, unauthorized data access, source-rights violation, wrong-vehicle applicability, unsupported confirmed conclusion, evidence loss/corruption, cross-organization exposure, unrecoverable duplicate/partial commit, or inability to disable the feature.

Review/pause thresholds will be set after baseline for harmful abstention failure, excessive latency, high stale/conflict loss, unacceptable usability error, calibration/drift, or recurring workflow dead ends.

Rollback requires feature off, no new commands, preserved case reads/evidence, affected-case list, in-flight ownership, downstream reconciliation, incident record, and approved restart criteria.

## Required operational evidence before pilot

- source rights resolved for included vehicles/content;
- migrations and rollback rehearsed;
- permission/safety matrix passing;
- scenario corpus and shadow report accepted;
- accessibility and shop-device workflows passing;
- telemetry, alerting, backup/recovery, support, and kill switch proven;
- training and operator runbooks complete;
- named product, technical, safety, operations, data, and engineering signoffs.

**Disposition:** `DGN-005` complete as benchmark/measurement/pilot governance. No benchmark result or pilot approval is claimed.
