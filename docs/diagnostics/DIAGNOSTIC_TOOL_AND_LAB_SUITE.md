# Diagnostic Tool and Laboratory Suite

**Version:** 1.0 governing planning baseline  
**Status:** Official pre-implementation product specification  
**Date:** 2026-07-20

## 1. Product Principle

The Diagnostics Console is a focused diagnostic operating system. It may integrate with scheduling, parts, estimates, authorization, repair jobs, and QC, but its workspace remains centered on concern reproduction, evidence, reasoning, testing, cause confirmation, and repair verification.

## 2. Suite Map

| Application | Purpose |
| --- | --- |
| Diagnostic Command Center | Own and prioritize cases, risks, blockers, review, and next diagnostic action. |
| Vehicle Systems Explorer | Navigate configuration, systems, functions, topology, components, paths, and applicable sources. |
| Whole-Vehicle Scan Lab | Analyze modules, DTCs, topology, freeze-frame, pre/post scans, and communication state. |
| Live Data Lab | Select, graph, record, compare, and interpret relevant parameters. |
| Electrical Lab | Trace circuits and perform governed power, ground, reference, signal, and load reasoning. |
| Waveform Lab | Capture/import, measure, compare, and explain scope/current/pressure/network signals. |
| Mechanical Systems Lab | Structure pressure, flow, thermal, compression, vacuum, vibration, and physical tests. |
| Hypothesis Workbench | Compare support, contradiction, missing expectations, assumptions, and remaining uncertainty. |
| Adaptive Test Navigator | Select and execute the safest highest-value next test with branching and alternatives. |
| Intermittent Investigator | Capture triggers, time/state/environment correlations, nondetection risk, and reproduction evidence. |
| Verification Lab | Prove the original concern is resolved and detect new or remaining faults. |
| Knowledge/Procedure Studio | Author, validate, simulate, review, release, suspend, and retire diagnostic knowledge. |
| Simulation and Training Academy | Validate engine behavior and build technician diagnostic mastery. |
| Expert Case Conference | Escalate complete structured cases for remote or independent review. |

## 3. Shared Case Context

All labs operate on the same case and preserve:

- vehicle/configuration and repair-order concern;
- selected concern and reproduction state;
- current hypotheses and conflicts;
- active test plan and execution state;
- evidence timeline and source versions;
- safety, authorization, qualification, tool, and vehicle-state gates;
- immutable reasoning, conclusion, correction, and verification lineage.

No lab creates a parallel case, vehicle, evidence store, task, repair order, or authorization record.

## 4. Interaction Standard

Every proposed action shows:

- the diagnostic question being answered;
- applicable vehicle/system/source versions;
- hypotheses affected and expected outcomes;
- prerequisites, hazards, vehicle state, tools, and skill;
- time/cost/invasiveness and test reliability;
- raw evidence to be captured;
- next branches and abstention behavior.

The interface must support interruptions, resume, offline/degraded reading of approved content, gloved/mobile operation where relevant, keyboard/desktop expert use, and complete recovery without losing measurements or rationale.

## 5. Hardware-Neutral Acquisition Boundary

The suite defines governed evidence contracts before choosing hardware vendors. Approved adapters may supply scan, live-data, active-test, meter, scope, pressure, thermal, vibration, image, audio, or inspection data.

Adapters must provide device identity, firmware/software, protocol, calibration, acquisition settings, timestamps, vehicle/session identity, raw payload/checksum, transformations, errors, and authority state. Unsupported device claims remain imported observations and cannot masquerade as native measured evidence.

## 6. Human Authority

- The system recommends; qualified technicians execute and interpret.
- High-risk actions require capability and safety gates.
- Programming, coding, security, active tests, road tests, and destructive/invasive tests retain separate authority.
- Expert escalation is required when the model, equipment, qualification, or evidence is insufficient.
- A lab cannot confirm cause or close a case outside the governing conclusion and verification commands.

## 7. Acceptance Gate

The suite design is accepted when one no-start case moves through Systems Explorer, Scan/Live Data as applicable, Electrical/Waveform evidence, Hypothesis Workbench, Adaptive Test Navigator, conclusion, and Verification Lab without duplicate entry, lost provenance, authority leakage, or a dead-end between tools.

