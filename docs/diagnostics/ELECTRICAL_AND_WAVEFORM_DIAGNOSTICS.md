# Electrical and Waveform Diagnostics

**Version:** 1.0 governing planning baseline  
**Status:** Official pre-implementation specification  
**Date:** 2026-07-20

## 1. Mission

Provide measurement-first electrical, electronic, network, and waveform diagnosis that can prove circuit and signal behavior under known conditions rather than infer component failure from codes alone.

## 2. Electrical Systems Explorer

Required capabilities include interactive circuit and power-distribution views; traceable components, connectors, terminals, splices, fuses, relays, grounds, references, signals, buses, and shared paths; component locations; terminal assignments; expected state/voltage/current; and measurement overlays.

Diagram content remains source/version/applicability controlled. The application must visually separate source facts, shop annotations, measured values, and inferred suspect paths.

## 3. Guided Electrical Tests

Initial test families:

- open/high-resistance and short-to-ground/power/cross-circuit isolation;
- loaded voltage drop and ground offset;
- voltage/current/resistance with correct power-state safeguards;
- reference, signal, pull-up/pull-down, duty-cycle, and frequency analysis;
- starter/charging/current-path and parasitic-draw/sleep-state workflows;
- relay/control-side/load-side reasoning;
- CAN/CAN FD physical-layer and termination checks.

Each test specifies safe connection/disconnection order, circuit state, load, test point, tool/probe, expected result, tolerance source, error risks, and interpretation branches.

## 4. Engineering Consistency

The lab uses unit-safe Ohm, power/energy, Kirchhoff, series/parallel, voltage-drop, and tolerance calculations from the algorithm catalog. Physically inconsistent measurements create a conflict and measurement-setup review; they are not averaged or silently corrected.

## 5. Waveform Lab

Required capabilities:

- raw multi-channel capture/import and immutable checksum;
- device/probe/channel/range/coupling/sample-rate/time-base/trigger metadata;
- known-good references constrained by exact applicability;
- cursors, automatic measurements, annotations, math channels, filtering with raw retention;
- time/frequency-domain analysis, correlation, phase, timing, edges, pulse/duty/frequency;
- current ramp, ignition, relative compression, cam/crank, injector/actuator, pressure, vibration, and network analysis;
- synchronized comparison with scan/live data where clocks can be reconciled;
- transformation and derived-feature lineage.

Automated waveform interpretations remain recommendations and disclose signal quality, configuration, transformations, reference differences, and missing context.

## 6. Instrument Governance

Evidence identifies instrument, serial/device identity where available, firmware/software, calibration status/date, probe/transducer, scaling, zeroing, connection location, acquisition settings, operator, and environmental conditions. Invalid calibration, clipping, aliasing, poor ground reference, wrong probe, or insufficient sampling blocks confirmation-dependent use.

## 7. Initial No-Start Proof

The initial release should prove loaded battery behavior, positive/ground voltage drop, starter current/speed relationships, control command feedback, relative compression where approved, cam/crank relationship where applicable, and charging verification after repair.

## 8. Acceptance Gate

Gold cases must include correct captures, wrong-unit/probe/range/setup, clipping/noise/aliasing, contradictory meters, intermittent drops, known-good mismatch, multiple faults, and a common-ground failure. Every conclusion must be reproducible from raw evidence and documented transformations.

