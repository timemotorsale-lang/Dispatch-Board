# Scan, Live Data, and Network Intelligence

**Version:** 1.0 governing planning baseline  
**Status:** Official pre-implementation specification  
**Date:** 2026-07-20

## 1. Mission

Convert vehicle communication data into structured diagnostic evidence while preserving the difference between a code, a symptom, a network effect, a command, an observation, and a confirmed cause.

## 2. Scan Session Contract

Each session records vehicle/configuration identity, adapter/device/firmware, software/coverage version, protocol, secure-access state, start/end time, actor, module inventory, topology, DTCs/status/freeze-frame, communication failures, raw report/checksum, transformations, and errors.

Supported session purposes include pre-scan, active diagnosis, post-repair scan, programming precondition, calibration verification, and intermittent flight recording.

## 3. Whole-Vehicle Intelligence

Required capabilities:

- expected versus detected module inventory;
- network/bus/gateway topology and communication state;
- missing, offline, intermittently communicating, or unexpected modules;
- DTC grouping by module, status, timing, voltage/environment, and shared dependency;
- primary, consequential, historical, pending, and unrelated classifications as recommendations—not facts;
- common power/ground/gateway/bus/configuration candidates;
- pre/post scan differences and newly introduced conditions;
- calibration/configuration mismatch signals;
- applicable procedure, bulletin, and source links.

Clearing codes never establishes repair success and requires an authorized, audited command with pre-clear evidence preserved.

## 4. Live Data Lab

The lab supports relevant-parameter recommendations, manual expert selection, synchronized multi-module graphing, recording/replay, commanded-versus-actual comparisons, applicable expected ranges, units and sampling quality, annotations, calculated channels, change-point/lag/stuck/bias/implausibility detection, and before/after comparison.

Parameter relevance must explain the hypothesis or system relationship. Out-of-range highlighting must include operating-condition and source applicability; generic thresholds cannot be shown as vehicle-specific facts.

## 5. Active Tests and Service Functions

Every active test/relearn/reset/calibration/programming request identifies prerequisites, hazards, vehicle state, effect, reversibility, secure access, authorization, qualified actor, expected feedback, stop/recovery procedure, and resulting evidence.

The first release may link to or ingest results from approved external tools. It must not claim ECU control capabilities that have not been certified and validated.

## 6. Network Reasoning

Network analysis covers logical topology and, when measured evidence exists, physical-layer behavior: bus termination, voltage levels, edge quality, noise, dominant/recessive state, wake/sleep, gateway routing, module power/ground dependency, and intermittent dropout.

Several communication codes must trigger shared-cause and topology analysis before individual module condemnation.

## 7. Security and Interoperability

Use lawful OEM subscriptions, secure-gateway services, certified interfaces, documented protocols/exports, and approved credentials. Do not bypass immobilizer, secure gateway, subscription, encryption, or manufacturer access controls.

## 8. Acceptance Gate

An approved test corpus must prove exact session provenance, module/topology reconciliation, DTC and freeze-frame fidelity, relevant PID selection, synchronized replay, active-test authority gates, pre/post comparison, network common-cause reasoning, degraded adapter behavior, and abstention when coverage or configuration is uncertain.

