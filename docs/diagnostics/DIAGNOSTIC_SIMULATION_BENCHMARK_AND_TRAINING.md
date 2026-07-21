# Diagnostic Simulation, Benchmark, and Training

**Version:** 1.0 governing planning baseline  
**Status:** Official pre-implementation specification  
**Date:** 2026-07-20

## 1. Mission

Create a shared proving ground for diagnostic algorithms, procedures, console workflows, and technician development. Production cases must not be the first place a new diagnostic method is tested.

## 2. Scenario Types

- synthetic first-principles cases;
- sanitized verified historical cases;
- controlled bench/vehicle captures;
- single, multiple, common-cause, cascading, and intermittent faults;
- misleading DTC/common-fix cases;
- wrong configuration/source/unit/instrument/test setup;
- insufficient/conflicting evidence and out-of-model behavior;
- safety, secure-access, authorization, adapter, connectivity, and recovery failures;
- failed repair, incomplete verification, recurrence, and unrelated comeback.

## 3. Scenario Contract

Each scenario defines vehicle/configuration, concern, hidden ground truth when legitimately known, system/source versions, evidence revelation sequence, permitted tests, test cost/time/risk/reliability, expected conflicts, acceptable candidate sets, mandatory abstention, prohibited conclusions, confirmation/verification rules, and scoring rubric.

A final component label alone is insufficient as an oracle. The expected reasoning and safe process matter.

## 4. Evaluation Dimensions

- technical correctness and candidate coverage;
- unsafe or unsupported conclusion rate;
- contradiction detection and abstention quality;
- test efficiency, information value, time, cost, and invasiveness;
- evidence/provenance completeness;
- explanation quality and source/applicability fidelity;
- multiple/intermittent-fault handling;
- workflow usability, interruption recovery, and accessibility;
- repair verification and recurrence detection;
- latency, reliability, resource use, and rollback.

## 5. Benchmark Program

Use the same sanitized cases to compare Dispatch Board with representative OEM, guided multi-brand, scan/scope, waveform, and repair-information workflows. Record steps, evidence, time, dead ends, source clarity, safety, and handoffs. Benchmarking informs requirements; it does not authorize copying or unlicensed data use.

## 6. Training Academy

Technicians can practice progressive evidence cases, select tests, record rationale, receive explanation after commitment, compare alternate safe paths, participate in case conferences, and review after-action reports. Training measures diagnostic process and evidence quality, not employee worth or discipline.

## 7. Dataset Governance

Cases require consent/authority, privacy review, de-identification where applicable, license classification, provenance, leakage control between training and evaluation sets, versioning, correction, retention, and access policy. Synthetic cases are visibly labeled.

## 8. Promotion Gate

No algorithm/procedure reaches assistive production use without approved offline scenarios, adversarial/degraded tests, shadow evidence, qualified review, explicit thresholds, monitoring, kill switch, and rollback. Passing averages cannot conceal a critical safety or integrity failure.

