# DGN-003 — No-Start Ontology, Scope, and Scenario Contract

**Status:** Implemented contract; knowledge/runtime behavior deferred  
**Date:** 2026-07-20  
**Gate contribution:** `DG-G0`

## Initial product question

For an applicable vehicle that does not start normally, what evidence-supported system state or failure mode explains the concern, what safe test best reduces uncertainty, and what verification proves the authorized correction resolved it?

## Current-to-target workflow

| Shop step | Current foundation reused | Diagnostics target responsibility |
| --- | --- | --- |
| Intake | Repair Order concern, vehicle, customer/service-visit context | Preserve exact concern, conditions, symptom class, and diagnostic authorization |
| Triage/assignment | Repair Order Workbench, technician/dispatch foundations | Create one concern-specific case; assign by capability, qualification, load, and risk |
| Investigation | Vehicle Evidence, notes, versioned repair diagnosis | Build a versioned plan; distinguish reports, observations, measurements, assumptions, and inferences |
| Testing | Technician work and evidence capture foundations | Enforce prerequisites; preserve setup, raw evidence, result, deviation, and invalidation lineage |
| Reasoning | No independent case engine currently exists | Maintain competing hypotheses, conflicts, applicability, uncertainty, next-test rationale, and abstention |
| Conclusion/handoff | Canonical `RepairDiagnosisVersion`, estimate/authorization/job flow | Require qualified confirmation, publish exact lineage, and propose—not authorize—correction |
| Repair/verification | Repair jobs, parts, labor, QC, release foundations | Define concern-specific predictions and verification; reopen when result fails or recurrence occurs |

The target workflow augments rather than replaces the existing operational authorities.

## Included scope

### Concern classifications

- no response/no crank;
- click/no crank or intermittent crank;
- slow crank;
- crank/no start;
- starts then stalls during the approved initial window;
- hot-soak/cold/intermittent manifestation;
- charging concern discovered during starting-system diagnosis;
- multiple warning/communication symptoms that may share energy, ground, gateway, or network cause.

### Functional ontology

```text
START_REQUEST
  -> CONTROL_INTERLOCKS_SATISFIED
  -> ELECTRICAL_ENERGY_AVAILABLE
  -> STARTER_CONTROL_COMMAND
  -> STARTER_CURRENT_PATH
  -> MECHANICAL_ROTATION
  -> CONTROL_MODULES_AWAKE_AND_SYNCHRONIZED
  -> AIR_FUEL_IGNITION_COMPRESSION_TIMING_AVAILABLE
  -> COMBUSTION_SUSTAINED
  -> CHARGING_VERIFIED
```

### Initial entities and paths

- battery, terminals, cables, grounds, fuses, relays, starter/solenoid;
- ignition/start input and configured park/neutral/clutch/interlock state;
- power distribution, module wakeup, applicable gateway/network communication;
- engine rotational/mechanical capability;
- bounded crank-no-start branches: speed/synchronization, basic spark/ignition command, fuel delivery/command, compression/relative contribution, airflow/flooding indicators;
- immobilizer/security only as an authenticated state/escalation boundary—no bypass instructions;
- alternator/charging output and post-repair energy recovery.

## Failure-mode vocabulary

- open/high resistance, short to ground/power/cross-circuit;
- discharged/degraded energy source, excessive draw, insufficient loaded capacity;
- missing/incorrect command, interlock inhibit, wake/sleep fault;
- stuck, binding, mechanically failed, excessive mechanical load;
- no/low/unstable pressure, flow, compression, spark, or synchronization;
- module/network unavailable, gateway dependency, configuration/calibration mismatch;
- intermittent, temperature/vibration/load dependent;
- incorrect part/installation/previous repair;
- invalid measurement, instrument, probe, test state, or source applicability.

## Explicit exclusions from first release

- key/immobilizer programming or security bypass;
- control-module programming/coding beyond governed external escalation;
- destructive engine teardown decisions without separate confirmation policy;
- high-voltage propulsion diagnosis;
- manufacturer-specific advanced functions without licensed applicable sources;
- autonomous active tests, repair authorization, parts replacement, or customer promise;
- universal all-make coverage claims;
- a DTC-to-part shortcut presented as confirmed diagnosis.

Out-of-scope cases are preserved and escalated; they are not forced into the closest modeled cause.

## Required observation vocabulary

- exact customer concern and timing;
- reproduced/not reproduced/inconclusive and conditions;
- key/start request, cluster/lighting behavior, sound and starter response;
- battery open-circuit and loaded state with source-valid thresholds;
- positive/ground loaded voltage drop;
- starter command/current/speed where available;
- engine speed and applicable synchronization during crank;
- scan/module/DTC/freeze-frame and network state;
- relevant spark/fuel/compression/air evidence for crank-no-start;
- ambient, coolant, hot-soak, time, vibration, load, and prior repair context;
- instrument/setup and raw evidence lineage.

## Confirmation boundary

A failure mode is only compatible until affirmative evidence and applicable confirmation rules support it. A code, known fix, low battery reading without conditions, successful jump start, or replaced part alone does not confirm root cause.

The engine must distinguish:

- root fault from consequence;
- energy source from excessive draw or connection loss;
- starter control from high-current path or mechanical load;
- crank speed from combustion requirements;
- no current manifestation from intermittent disproof;
- multiple faults from one shared common cause;
- invalid measurement from vehicle abnormality.

## Gold scenario catalog

| ID | Scenario | Required diagnostic behavior |
| --- | --- | --- |
| `NS-001` | Healthy battery, excessive ground-path drop | Generate path conflict; recommend segment/setup discrimination; do not condemn starter. |
| `NS-002` | Weak battery with otherwise healthy paths | Confirm only after applicable loaded-capacity evidence; verify charging/recovery. |
| `NS-003` | Positive cable high resistance | Use loaded path measurements; distinguish from battery/starter. |
| `NS-004` | Starter internal fault | Require command, energy, path, and mechanical-load evidence before confirmation. |
| `NS-005` | Park/neutral or clutch interlock inhibit | Trace request/interlock/control state; no high-current-path guessing. |
| `NS-006` | Engine mechanical seizure/high load | Stop repeated crank attempts; escalate mechanical/safety procedure. |
| `NS-007` | Crank-no-start with absent synchronization | Follow applicable sensor/control/test path; preserve alternative causes. |
| `NS-008` | Fuel delivery absent | Require pressure/command/current or applicable evidence; no pump replacement from sound alone. |
| `NS-009` | Ignition command/spark absent | Separate control, power/ground, module, sensor, and component candidates. |
| `NS-010` | Low/uneven relative compression | Treat as screening evidence; require approved confirmation before mechanical cause. |
| `NS-011` | Shared power/ground creates module codes and no crank | Prefer common-cause topology over multiple-module replacement. |
| `NS-012` | Hot-soak intermittent connection | Use temporal capture/reproduction; absence while cold is not disproof. |
| `NS-013` | Parasitic draw causes morning no-start | Separate battery health, sleep state, draw branch, and recurrence verification. |
| `NS-014` | Wrong vehicle configuration/source | Block vehicle-specific instruction; resolve identity/applicability. |
| `NS-015` | Meter lead/setup creates false voltage drop | Detect physical/evidence inconsistency; validate setup before vehicle conclusion. |
| `NS-016` | Two independent faults: weak battery plus starter draw | Retain multiple-fault candidates; one correction must not prematurely close case. |
| `NS-017` | Security state inhibits starting | Identify authorized security boundary and escalate; provide no bypass. |
| `NS-018` | Network gateway offline | Use topology/power/ground/communication evidence; escalate unsupported programming. |
| `NS-019` | Customer condition cannot be reproduced | Execute approved reproduction plan; finish inconclusive with residual uncertainty, not “fixed.” |
| `NS-020` | Common-fix suggestion contradicts measurements | Direct engineering evidence and consistency prevail. |
| `NS-021` | Unsafe fuel leak discovered during crank-no-start | Stop work, contain/escalate; diagnostic efficiency does not outrank safety. |
| `NS-022` | Repair restores crank but charging remains failed | Verification fails/secondary concern remains; do not close fully resolved. |
| `NS-023` | Response lost after test submission | Safe retry produces one execution/result. |
| `NS-024` | Source withdrawn during open case | Mark affected guidance; stop dependent confirmation and route review. |

## Mastery and quality measures

Evaluate concern reproduction quality, evidence integrity, contradiction detection, candidate coverage, safe test efficiency, unsupported conclusion rate, abstention, time to confirmed cause, unnecessary-parts signal, verified resolution, and recurrence—not speed alone.

## Exit criteria

- ontology terms and boundaries are approved for DGN-006 modeling;
- all 24 scenarios identify expected conflicts, allowed candidates, prohibited conclusions, and verification needs;
- exclusions and escalation are explicit;
- source-specific thresholds/procedures remain deferred to licensed knowledge rather than invented here.

**Disposition:** `DGN-003` complete as a scope and scenario contract.
