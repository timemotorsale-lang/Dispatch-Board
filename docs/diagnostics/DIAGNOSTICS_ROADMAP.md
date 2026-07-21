# Enterprise Diagnostics Console Roadmap

**Version:** 1.0 planning baseline  
**Date:** 2026-07-20  
**Status:** Approved sequencing; no implementation implied

The consolidated implementation architecture and detailed scope for all 50 milestones are maintained in [`DIAGNOSTICS_IMPLEMENTATION_MASTER_PLAN.md`](DIAGNOSTICS_IMPLEMENTATION_MASTER_PLAN.md).

## Delivery Strategy

Build a trusted diagnostic operating system in vertical slices. Each phase must demonstrate usable workflow, server-side control, evidence, observability, and rollback before the next layer receives authority.

```text
Governance and domain contracts
  -> case/evidence foundation
  -> one deterministic diagnostic vertical
  -> repair and verification orchestration
  -> knowledge administration and system expansion
  -> measured optimization and learning
  -> supervised AI assistance
  -> scale and external ecosystem
```

## Phase 0 — Program Foundation and Decisions

**Outcome:** implementation can begin without ambiguity about ownership, safety, source rights, or success.

- approve architecture and console/domain boundary;
- appoint product, fixed-operations, diagnostic-technical, safety, data, and engineering owners;
- map current shop workflow and failure modes;
- approve initial role/capability and safety-risk matrices;
- approve the algorithm catalog, consistency/causal specification, ensemble precedence, and algorithm release/authority states;
- approve the diagnostic ontology, lab-suite, scan/live-data/network, electrical/waveform, intermittent, procedure-authoring, simulation/training, and quality/verification specifications;
- inventory service-information sources and licensing rights;
- complete a hands-on benchmark of representative OEM, guided multi-brand, integrated scan/scope, precision measurement, and repair-information platforms using the shared scenario rubric;
- define initial no-start scenario catalog and gold-standard cases;
- baseline diagnostic time, first-time-fix, parts replacement, verification, and comeback measures;
- approve pilot location, technicians, hardware, and rollback authority.

**Exit gate:** signed decisions, no unresolved source-rights blocker for the first workflow, named owners, measurable baseline, approved initial scenario set, and accepted benchmark parity/differentiation targets.

## Phase 1 — Console and Diagnostic Case Foundation

**Outcome:** authorized staff can create, find, own, and audit diagnostic cases linked to canonical repair orders.

- independent `/diagnostics` navigation and honest empty/loading/error/permission states;
- diagnostic-case lifecycle, commands, policy, validation, events, audit, and optimistic concurrency;
- repair-order-to-case creation and case summary projection back to the workbench;
- queue, case header, concern preservation, owner, risk, priority, target, and blocker visibility;
- feature flag and rollout boundary;
- observability for commands, lifecycle, failures, and queue aging.

**Exit gate:** case creation and lifecycle are replay-safe, permission-safe, organization-safe, event-backed, and browser-tested without duplicating canonical records.

## Phase 2 — Structured Evidence and Test Execution

**Outcome:** technicians can capture diagnostic evidence as trusted data rather than free-form notes.

- observations, measurements, units, conditions, instruments, quality, and fact classification;
- governed evidence links for images, files, waveforms, and scan artifacts;
- versioned test definitions and case-specific test plans;
- shared-context lab navigation with hardware-neutral evidence acquisition contracts;
- mobile-friendly start/pause/complete/invalidate test execution;
- prerequisite, qualification, safety, applicability, and evidence-completeness gates;
- timeline and measurement comparison read models.

**Exit gate:** evidence provenance survives correction/supersession; unsafe or incomplete tests fail closed; case reconstruction is possible from records alone.

## Phase 3 — No-Start Deterministic Reasoning Vertical

**Outcome:** the platform guides a complete starting/charging/no-start diagnosis using approved engineering logic.

Initial coverage:

- battery state and capacity evidence;
- terminal/connection and voltage-drop evaluation;
- starter control and current-path reasoning;
- crank/no-crank classification;
- charging-system verification;
- basic power/ground and fuse/relay logic;
- fuel/ignition/compression/synchronization branches for crank-no-start, bounded by approved scope;
- network/immobilizer escalation without unsupported bypass instructions;
- intermittent/no-fault-found reproduction and abstention paths.

Engine delivery:

- applicability resolver;
- initial starting/charging/no-start ontology and knowledge-graph slice;
- deterministic rules and engineering calculation library;
- model-based system descriptions, truth maintenance, minimal conflict sets, minimal hitting-set candidates, and bounded multiple/intermittent-fault handling;
- forward/backward causal reasoning that distinguishes association, compatibility, causal support, intervention support, and human confirmation;
- hypotheses with support/contradiction evidence;
- next-test ranking and explanation;
- conclusion confirmation gate and qualified-technician signoff;
- scenario simulator and regression corpus.
- electrical, waveform, scan/live-data, network, intermittent, and mechanical evidence paths where applicable to the approved case.

**Exit gate:** approved scenario suite passes; every recommendation is traceable; unsafe, conflicting, missing-data, and out-of-scope cases abstain or escalate correctly.

## Phase 4 — Repair Planning, Dispatch, Parts, and Verification

**Outcome:** a confirmed diagnosis becomes an executable but still authorized repair package, and closure proves the concern is resolved.

- publish governed `RepairDiagnosisVersion` from the confirmed case;
- structured operations, labor range, skills, certifications, bay, tool, parts, procedure, hazard, and QC requirements;
- estimate-draft input without price/scope authorization bypass;
- task/appointment/dispatch readiness bridge;
- parts-demand/readiness bridge;
- repair-job traceability to diagnosis and procedure version;
- concern-specific post-repair verification and independent-review rules;
- failure/reopen/comeback linkage.

**Exit gate:** end-to-end concern-to-verified-repair workflow passes with idempotent handoffs, authorization enforcement, and immutable traceability.

## Phase 5 — Knowledge Operations and Governance

**Outcome:** qualified staff can safely maintain, review, release, suspend, and audit diagnostic knowledge.

- source registry and licensing classification;
- vehicle/system/component/failure-mode vocabulary;
- knowledge ingestion, normalization, checksum, applicability, and review workflow;
- test/rule/calculation authoring with validation and simulation;
- independent approval for safety-critical releases;
- active/shadow/suspended/retired versions and rollback;
- source withdrawal and affected-case analysis;
- knowledge quality dashboard.
- qualified procedure-authoring studio with semantic diff, affected-case analysis, shadow release, and rollback.

**Exit gate:** no active rule or procedure lacks owner, source, applicability, scenario proof, approval, version, monitoring, and rollback predecessor.

## Phase 6 — Operational Intelligence and Shop Orchestration

**Outcome:** Diagnostics improves technician allocation, time use, and flow without taking authority from dispatchers or managers.

- diagnostic skill/certification eligibility;
- duration ranges with uncertainty;
- bay/tool/equipment readiness;
- WIP, aging, stalled-test, and bottleneck visibility;
- next-best operational action and escalation;
- supervisor review queue for risk, contradiction, low confidence, and overrides;
- capacity and promise-risk integration;
- workload-quality protections and anti-gaming measures.

**Exit gate:** recommendations run in shadow, then limited assistive mode, and show measurable flow improvement without safety, quality, or fairness regression.

## Phase 7 — Diagnostic Coverage Expansion

**Outcome:** add system families through repeatable knowledge-and-scenario release trains.

Recommended sequence:

1. cooling and overheating;
2. brake noise, pulsation, and hydraulic concerns;
3. HVAC performance;
4. misfire and drivability;
5. charging/parasitic draw expansion;
6. network communication and module power/ground;
7. steering/suspension noise and vibration;
8. emissions and aftertreatment where legally and technically approved;
9. transmission/driveline;
10. ADAS, high-voltage, restraint, and advanced programming only with enhanced controls.

Each family requires source rights, qualified ownership, applicability, test definitions, hazards, scenario corpus, shadow results, monitoring, and rollback.

**Exit gate:** coverage expands by proven release package, never by unreviewed bulk content.

## Phase 8 — Outcome Learning and Optimization

**Outcome:** verified history improves estimates and recommendations through controlled, reviewable calibration.

- outcome attribution across test recommendation, human decision, repair, verification, and comeback;
- controlled evaluation of probabilistic, evidence-fusion, waveform, temporal, case-based, and statistical algorithms from the official catalog;
- test usefulness, time, cost, override, and unnecessary-parts analysis;
- similar-case retrieval from verified cases;
- simulation academy and case-conference feedback using governed training/evaluation separation;
- calibration proposals for weights, thresholds, and duration ranges;
- drift, source-age, and data-quality monitoring;
- bias/fairness checks for technician and workload recommendations;
- review board and controlled promotion of proposed changes.

**Exit gate:** changes are proposed, simulated, independently approved, versioned, shadowed, monitored, and reversible; no self-modifying production logic.

## Phase 9 — Supervised AI Assistance

**Outcome:** AI becomes a grounded interface and reasoning assistant without becoming authority.

- provider-neutral AI gateway;
- permission-filtered retrieval with citations and source versions;
- technician dictation structuring;
- case summary and handoff drafting;
- missing/contradictory evidence detection;
- approved-procedure explanation;
- hypothesis/test-plan drafts and similar-case retrieval;
- customer explanation drafts after estimate approval;
- prompt/model/tool versioning, offline evaluation, red-team scenarios, shadow mode, kill switch, and cost/latency controls.

**Exit gate:** groundedness, citation, harmful-output, abstention, privacy, latency, cost, and human-review thresholds pass; the complete console remains operable with AI disabled.

## Phase 10 — Enterprise Scale and Ecosystem

**Outcome:** safely support larger case volume, multiple locations, external tools, and independent operational scaling.

- multi-location knowledge/policy inheritance;
- fleet and specialty workflow partitions;
- approved scan-tool/data acquisition adapters;
- licensed service-information connectors;
- waveform and structured telemetry ingestion;
- external integration reconciliation and degraded behavior;
- performance/load testing, archival, disaster recovery, and regional data controls;
- service extraction only if measured operational needs justify it.

**Exit gate:** multi-location production readiness, tested recovery objectives, adapter isolation, reconciliation, support model, and change governance.

## Program Milestones

| Program gate | Meaning |
| --- | --- |
| `DG-G0 Architecture accepted` | Console boundary, authority, sources, owners, and measures are approved. |
| `DG-G1 Case foundation proven` | Diagnostic cases are durable, governed, linked, and usable. |
| `DG-G2 Evidence foundation proven` | Structured evidence and test execution are trustworthy. |
| `DG-G3 Reasoning proof proven` | No-start engine passes deterministic and safety scenarios. |
| `DG-G4 Closed-loop repair proven` | Diagnosis through verified repair is traceable end to end. |
| `DG-G5 Knowledge operations proven` | Knowledge can be governed and safely changed. |
| `DG-G6 Pilot approved` | Limited production use meets quality and operational thresholds. |
| `DG-G7 Coverage expansion approved` | A repeatable release train exists for new system families. |
| `DG-G8 Learning approved` | Outcome-based proposals are controlled and calibrated. |
| `DG-G9 AI assistance approved` | AI is grounded, optional, supervised, measured, and reversible. |
| `DG-G10 Enterprise scale approved` | Multi-location/recovery/integration evidence supports expansion. |

## Success Measures

Balanced measures prevent speed or utilization from degrading quality:

- time from intake to reproducible concern;
- time from first test to confirmed cause;
- first-time-fix and verified-resolution rates;
- no-fault-found and inconclusive rates;
- unnecessary-parts cost and parts-per-confirmed-cause;
- comeback rate by concern/system/cause;
- diagnostic estimate-to-actual time variance;
- recommended-test usefulness and override outcomes;
- technician waiting and blocked time;
- verification completeness and failure rate;
- safety gate violations prevented and override rate;
- source/applicability/data-quality failures;
- customer promise and update reliability;
- system availability, latency, command conflicts, and recovery performance.

Targets must be baselined and approved during Phase 0; the roadmap does not invent performance claims before evidence exists.
