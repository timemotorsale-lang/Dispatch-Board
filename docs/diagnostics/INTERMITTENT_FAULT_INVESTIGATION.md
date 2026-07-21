# Intermittent Fault Investigation

**Version:** 1.0 governing planning baseline  
**Status:** Official pre-implementation specification  
**Date:** 2026-07-20

## 1. Mission

Diagnose faults that appear only under particular time, temperature, vibration, load, speed, voltage, wake/sleep, environmental, or customer-use conditions without treating temporary absence as disproof.

## 2. Core Invariants

- `NOT_OBSERVED` is different from `DISPROVEN`.
- Evidence is bound to a time window, operating state, acquisition method, and reproduction validity.
- A no-fault-found disposition requires an approved reproduction protocol and residual uncertainty.
- Manipulation tests must not silently alter or repair the fault before evidence is captured.
- Safety limits govern road, vibration, heat/cold, water, electrical loading, and extended unattended captures.

## 3. Investigation Plan

Each plan defines customer conditions, prerequisite baseline, suspected triggers, safe reproduction methods, parameters/channels, sample/recording strategy, trigger thresholds, pre/post-trigger buffer, capture duration, environmental sensors, technician actions, stop conditions, and success/failure/inconclusive criteria.

## 4. Investigator Tools

- flight-recorder scan/live-data capture;
- oscilloscope/transducer trigger capture;
- wake/sleep and parasitic-draw timeline;
- module/network dropout and reset correlation;
- temperature/load/speed/vibration/environment annotations;
- harness/connector/component manipulation log;
- change-point and transient detection;
- repeated-cycle and nondetection tracking;
- customer event marker where lawfully and safely available;
- capture comparison and recurrence clustering.

## 5. Temporal Reasoning

The model distinguishes latent fault state, manifestation state, observation state, and vehicle operating state. It records trigger conditions, recurrence count, persistence, masking, observation sensitivity, false-negative risk, and evidence expiration.

When quantification is unsupported, the engine uses explicit qualitative uncertainty rather than false precision.

## 6. Escalation and Closure

Escalate when reproduction creates unacceptable risk, required instrumentation/coverage is unavailable, the observation window is inadequate, the fault is out of model, or repeated captures remain inconclusive. Closure as no-fault-found must state conditions attempted, coverage limits, unresolved candidates, safety/customer advice, and follow-up plan.

## 7. Acceptance Gate

Scenarios must cover heat-related open/high resistance, vibration-sensitive connection, module wake/sleep drain, intermittent network dropout, false trigger, insufficient sampling, technician manipulation changing the condition, customer-only operating condition, and nondetection under a valid but limited window.

