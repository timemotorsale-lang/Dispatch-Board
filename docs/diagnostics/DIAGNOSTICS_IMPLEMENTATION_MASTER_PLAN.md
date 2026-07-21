# Enterprise Diagnostics Console Implementation Master Plan

**Version:** 1.0 governing implementation plan  
**Date:** 2026-07-20  
**Status:** Approved planning baseline; no implementation implied  
**Milestone family:** `DGN-001` through `DGN-050`  
**Program gates:** `DG-G0` through `DG-G10`

> **Release 3 supersession notice:** The original Wave 5/Wave 6 sequencing for `DGN-035` through `DGN-044` has been superseded by [`implementation/DGN_035_044_ESTIMATE_INTELLIGENCE_PLANNING.md`](implementation/DGN_035_044_ESTIMATE_INTELLIGENCE_PLANNING.md). That record is authoritative for Release 3 estimate intelligence, selectable estimate models, the Enterprise Labor Guide module, advisor review, labor/parts/capacity impact, and repair-execution handoff planning. The older knowledge-operations, expansion, learning, and AI items move to `DGN-045` through `DGN-050` in the active milestone map.

## 1. Purpose

This document consolidates the Diagnostics architecture, roadmap, and milestone program into one implementation view. It shows the intended extent of the work and the order in which the system becomes trustworthy.

The program is not a single feature build. It is a controlled progression from domain foundations through evidence capture, diagnostic reasoning, repair verification, knowledge governance, pilot release, system-family expansion, outcome learning, and supervised AI.

## 2. Scope at a Glance

| Program dimension | Planned extent |
| --- | --- |
| First-class console | `/diagnostics` command center and concern-specific case workspace. |
| Diagnostic applications | Systems Explorer, Scan Lab, Live Data Lab, Electrical Lab, Waveform Lab, Mechanical Lab, Hypothesis Workbench, Adaptive Test Navigator, Intermittent Investigator, Verification Lab, Knowledge Studio, Simulation Academy, Expert Case Conference. |
| Core lifecycle | Concern → evidence → hypotheses → adaptive tests → confirmed cause → repair recommendation → authorization/execution handoff → verification → outcome learning. |
| Reasoning portfolio | 95 registered algorithms across applicability, engineering, consistency, causality, reliability, probability, evidence fusion, test optimization, signals, temporality, statistics, verification, and AI. |
| First diagnostic family | Starting, charging, crank/no-crank, and bounded crank-no-start. |
| Enterprise integrations | Vehicle 360, Repair Orders, Tasks, Appointments/Dispatch, Parts, Estimates, Authorization, Repair Jobs, QC, Comebacks, Activity, Audit, Events/Outbox. |
| Governance | Source rights, applicability, versioning, separation of duties, simulation, shadow mode, pilot, monitoring, kill switch, rollback, affected-case analysis. |
| Day-one production path | `DGN-001` through `DGN-034` for diagnostic closed-loop execution, followed by governed Release 3 estimate-intelligence implementation after planning approval. |
| Advanced expansion | `DGN-045` through `DGN-050`, followed by additional system-family release trains. |

## 3. Implementation Architecture

### 3.1 Runtime shape

Diagnostics begins inside the existing Next.js/PostgreSQL modular monolith.

```text
Dispatch Board application shell
  ├─ Diagnostics routes and UI applications
  ├─ Diagnostic command services and policies
  ├─ Diagnostic domain and reasoning engine
  ├─ Diagnostic knowledge and calculation libraries
  ├─ Diagnostic repositories and read models
  ├─ Shared enterprise commands/events/audit/outbox
  └─ Existing Vehicle, Repair, Task, Schedule, Parts and QC domains
                       |
                       v
                  PostgreSQL
```

No separate deployment, graph database, vector database, message broker, AI provider, or hardware service is required for the initial foundation. Such additions require measured need and an approved architecture decision.

### 3.2 Implementation layers

| Layer | Responsibilities |
| --- | --- |
| Presentation | Command center, case workspace, lab applications, knowledge studio, simulation, quality dashboards, mobile/shop and desktop expert experiences. |
| Read models | Permission-filtered queues, case projections, evidence timelines, hypothesis comparisons, test plans, graph views, quality and knowledge health. |
| Commands/services | Explicit lifecycle and evidence commands, reasoning evaluations, conclusion publishing, cross-domain handoffs, verification, governance. |
| Domain | Cases, concerns, observations, measurements, hypotheses, tests, conclusions, recommendations, verification, outcomes, rules and sources. |
| Reasoning | Applicability, quality, engineering calculations, consistency/conflicts, causal propagation, candidate generation, test optimization, abstention. |
| Knowledge | Ontology, graph relationships, system models, failure modes, test definitions, procedures, source/applicability/version governance. |
| Integration | In-process domain bridges initially; outbox projections/adapters for asynchronous or external work. |
| Platform control | Auth, capabilities, organization/location scope, idempotency, optimistic concurrency, audit, events, feature flags, telemetry, recovery. |

### 3.3 Target implementation boundaries

```text
src/
  app/(app)/diagnostics/
  app/api/diagnostics/
  features/diagnostics/
    command-center/
    case-workspace/
    systems-explorer/
    scan-live-data/
    electrical-waveform/
    hypotheses-tests/
    intermittent/
    verification/
    knowledge-studio/
    simulation-training/
    quality/
  server/diagnostics/
    domain/
    services/
    repositories/
    policies/
    validation/
    read-models/
    reasoning/
    calculations/
    consistency/
    knowledge/
    integrations/
    telemetry/
  tests/
    unit/diagnostics-*
    integration/diagnostics-*
    e2e/diagnostics-*
prisma/
  additive diagnostic models and migrations
```

These are target boundaries, not authorization to create them before their milestones.

## 4. Delivery Waves and Gates

| Wave | Milestones | Outcome | Gate |
| --- | --- | --- | --- |
| 0. Decisions and contracts | 001–006 | Authority, ontology, sources, scenarios, measures, and exact contracts are approved. | `DG-G0` |
| 1. Independent case console | 007–012 | Durable diagnostic cases integrated with canonical repair orders. | `DG-G1` |
| 2. Evidence and laboratory foundation | 013–019 | Structured measurements, evidence, governed tests, and data-quality/safety gates. | `DG-G2` |
| 3. Deterministic no-start reasoning | 020–027 | Explainable consistency/causal engine and adaptive guided diagnosis. | `DG-G3` |
| 4. Closed-loop repair execution | 028–034 | Confirmed cause flows through authorized work to verified resolution. | `DG-G4` |
| 5. Estimate intelligence and repair execution planning | 035–044 | Advisor review, selectable estimate strategies, Enterprise Labor Guide, labor/parts/capacity intelligence, customer explanation, and repair-execution handoff architecture. | `DG-G5` |
| 6. Knowledge operations, learning, and AI | 045–050 | Governed knowledge operations, controlled learning, repeatable expansion, and supervised AI. | `DG-G6–G9` |
| 7. Enterprise ecosystem | Post-050 | Multi-location, certified adapters, licensed connectors, resilience, justified service extraction. | `DG-G10` |

## 5. Detailed Milestone Ledger

### Wave 0 — Decisions and exact contracts

#### `DGN-001` — Domain authority and publishing contract

Build scope:

- approve Diagnostics-owned versus shared records;
- define how a case originates from a Repair Order concern;
- define how a confirmed conclusion publishes a `RepairDiagnosisVersion`;
- define cross-domain correlation, causation, version, and supersession rules;
- record architecture decisions and prohibited parallel systems.

Evidence: source-authority matrix, sequence diagrams, conflict review, architecture approval.

#### `DGN-002` — Roles, qualifications, safety, and authority

Build scope:

- product/technical/safety/data/engineering ownership;
- capability matrix for advisors, technicians, diagnosticians, foremen, managers, knowledge authors/reviewers, and auditors;
- diagnostic risk tiers and enhanced high-voltage/ADAS/restraint/brake/steering/fuel/programming controls;
- separation of duties, override, escalation, and emergency-stop rules.

Evidence: allowed/denied scenario matrix, high-risk tabletop, signoffs.

#### `DGN-003` — Ontology, workflow, mastery, and no-start scope

Build scope:

- current and target diagnostic workflow;
- canonical terminology and ontology shape;
- quality/mastery and verification definitions;
- exact starting/charging/no-start coverage and exclusions;
- initial normal, conflict, multiple-fault, intermittent, unsafe, and out-of-model cases.

Evidence: ontology traversal, qualified technician review, approved gold-case catalog.

#### `DGN-004` — Knowledge source and licensing register

Build scope:

- inventory OEM, public, commercial, shop-created, waveform, scan, and engineering sources;
- license/redistribution/storage/derivation classifications;
- source identity, update, checksum, applicability, withdrawal, and retention contracts;
- clean-room/legal review boundary for interoperability.

Evidence: source register and rights disposition for every first-workflow source.

#### `DGN-005` — Benchmark, measurement, and pilot contract

Build scope:

- hands-on capability benchmark using common scenarios;
- operational baseline and balanced KPI definitions;
- simulation/training/evaluation separation;
- telemetry, retention, pilot cohort, support, pause, kill-switch, and rollback criteria.

Evidence: dated benchmark, baseline collection, pilot scorecard, approval thresholds.

#### `DGN-006` — Exact domain, algorithm, lab, and migration contracts

Build scope:

- exact aggregate/entity and lifecycle design;
- command/event/reason-code/error/read-model contracts;
- concurrency, idempotency, transaction, audit, and outbox rules;
- consistency/causal model and algorithm registry persistence;
- lab/evidence/adapter contracts;
- additive migration, seed, backfill, rollback, and feature-flag strategy.

Evidence: contract review, formal examples, migration rehearsal plan, threat/failure review.

**Gate `DG-G0`: Approved with holds on 2026-07-20.** Wave 0 decisions are explicit and accepted. The gate authorizes only `DGN-007` through `DGN-009`; source ingestion, reasoning, publishing, pilot, and AI remain gated. See [`implementation/DG_G0_FOUNDATION_GATE_REVIEW.md`](implementation/DG_G0_FOUNDATION_GATE_REVIEW.md).

### Wave 1 — Independent diagnostic case console

#### `DGN-007` — Case persistence and immutable history

Implement additive models, indexes, organization/location constraints, repositories, case versioning, state events, audit, domain events, and outbox mappings.

Evidence: schema/migration validation, database constraints, repository and immutable-history tests.

#### `DGN-008` — Create and read diagnostic cases

Implement replay-safe creation from canonical repair-order concerns, duplicate detection, initial concern snapshot, owner/risk/target fields, and permission-filtered case reads.

Evidence: valid, duplicate, stale, denied, missing-RO, cross-organization, and retry tests.

#### `DGN-009` — Case lifecycle commands

Implement assign/reassign, triage, plan-ready, testing, waiting, escalation, inconclusive, abandon, reopen, and closure transition policies with reason requirements.

Evidence: complete state-machine transition and role matrix tests.

#### `DGN-010` — Diagnostics Command Center

Implement `/diagnostics`, queue read model, filters, risk/age/blocker/source/confidence signals, ownership, next action, freshness, feature flag, and loading/empty/error/restricted states.

Evidence: desktop/mobile/accessibility and read-model reconciliation tests.

#### `DGN-011` — Diagnostic case workspace

Implement case header, preserved concern, reproduction status, ownership, timeline, lifecycle commands, version/conflict notices, and lab navigation shell.

Evidence: browser workflows, interruption/recovery, stale command, and permissions.

#### `DGN-012` — Repair Order Workbench bridge

Implement create/open case actions and governed diagnostic summary projection in the existing workbench without copying diagnostic logic or state.

Evidence: RO-to-case traceability, missing/closed/restricted/stale states, no duplicate records.

**Gate `DG-G1`:** independent console and case lifecycle are operationally usable and platform-safe.

### Wave 2 — Structured evidence and laboratory foundation

#### `DGN-013` — Observation and measurement foundation

Implement structured observations and measurements with units, ranges, conditions, instruments, fact class, reliability, independence group, time window, actor, raw source, and correction lineage.

Evidence: normalization, dimensional, plausibility, version, supersession, and audit tests.

#### `DGN-014` — Governed evidence integration

Link Vehicle Evidence objects to cases, concerns, observations, tests, hypotheses, conclusions, and verification while preserving malware, access, retention, and checksum controls.

Evidence: restricted/quarantined/deleted/retained/cross-org/link-integrity scenarios.

#### `DGN-015` — Test definitions and adaptive plans

Implement versioned tests and case plans with ontology links, applicability, prerequisites, hazards, tools, qualifications, vehicle state, evidence fields, branching, interpretations, time/cost/risk, and source versions.

Evidence: graph integrity, invalid branch, expired source, safety, and applicability tests.

#### `DGN-016` — Test execution lifecycle

Implement start, pause, resume, complete, invalidate, repeat, and cancel commands with immutable actual conditions, deviations, results, and evidence.

Evidence: replay, stale version, lost connection, prerequisite change, invalidation, and recovery tests.

#### `DGN-017` — Shared-context laboratory shells

Implement Systems Explorer and initial Scan, Live Data, Electrical, Waveform, Mechanical, Hypothesis, Test Navigator, Intermittent, and Verification lab shells operating on one case context.

Evidence: lab navigation/provenance, gloved/mobile and desktop expert usability, no state loss.

#### `DGN-018` — Evidence timeline and comparison

Implement permission-filtered timeline, measurement matrix, expected/actual comparison, source freshness, evidence conflicts, raw/derived lineage, and case reconstruction.

Evidence: projection reconciliation, field restriction, accessibility, and large-case behavior.

#### `DGN-019` — Data quality and safety gates

Implement applicability, source freshness, units, plausibility, instrument quality, evidence completeness/independence, qualification, hazard, and test-readiness evaluators.

Evidence: missing, stale, impossible, correlated, wrong-unit, wrong-vehicle, unsafe, and abstention scenarios.

**Gate `DG-G2`:** the system can reconstruct what was tested, how, under what conditions, by whom, and with what reliability.

### Wave 3 — Starting/charging/no-start reasoning engine

#### `DGN-020` — No-start knowledge and graph seed

Implement controlled initial system/function/component/path/failure/test/verification graph, source versions, applicability, rules, and test definitions.

Evidence: qualified review, traversal tests, checksums, citations, withdrawal and rollback proof.

#### `DGN-021` — Engineering calculation library

Implement unit-safe Ohm/power/energy, Kirchhoff, series/parallel, loaded voltage-drop, current, timing, tolerance, and initial mechanical relationships.

Evidence: reference, boundary, property, unit, precision, and physically impossible cases.

#### `DGN-022` — Hypotheses, conflicts, and minimal diagnoses

Implement hypotheses, assumption environments, support/contradiction links, minimal conflict sets, minimal hitting-set candidates, bounded multiple/common-cause/intermittent handling, and truth revision.

Evidence: formal examples, multiple faults, common cause, evidence correction, timeout, incomplete-search disclosure.

#### `DGN-023` — Deterministic consistency and causal evaluator

Implement applicability and rule evaluation, model/observation consistency, forward/backward causal predictions, missing expected effects, reason codes, and immutable reasoning evaluations.

Evidence: deterministic replay, causal-versus-associated cases, AI/common-fix contradiction, abstention.

#### `DGN-024` — Eligible next-test generation

Generate tests capable of distinguishing remaining candidates, then filter by applicability, prerequisites, safety, authority, skill, tools, state, authorization, and source validity.

Evidence: every exclusion has a reason; hard gates cannot become score penalties.

#### `DGN-025` — Transparent test optimization

Rank eligible tests using discrimination/information value, risk reduction, reliability, time, cost, invasiveness, setup, resource readiness, and bounded look-ahead. Preserve alternatives and authorized technician choice.

Evidence: stable factor/tie tests, override lineage, cost/risk tradeoffs, no hidden weights.

#### `DGN-026` — Conclusion and confirmation controls

Implement propose, confirm, reject, supersede, abstain, and escalate commands; enforce qualification, evidence, contradiction, alternative-candidate, source, safety, and independent-review requirements.

Evidence: insufficient/conflicting/out-of-model/multiple-cause/high-risk and supersession scenarios.

#### `DGN-027` — Complete guided no-start experience and simulator

Connect ontology, labs, hypotheses, adaptive tests, reasoning explanations, conclusions, scenario runner, evaluation corpus, and training-mode separation.

Evidence: normal, misleading-code, measurement error, common ground, intermittent, multiple fault, unsafe, degraded, and no-fault-found browser scenarios.

**Gate `DG-G3`:** the first engine is technically correct, evidence-driven, explainable, bounded, and capable of abstention.

### Wave 4 — Closed-loop repair and verification

#### `DGN-028` — Publish governed diagnosis

Atomically publish a confirmed case conclusion to the canonical versioned repair diagnosis with exact evidence/model/rule/source lineage and safe supersession.

#### `DGN-029` — Repair recommendation package

Produce structured candidate operations, correction, duration range, skills, certifications, bay/tools, parts, procedures, hazards, QC, assumptions, and verification requirements without authorizing work.

#### `DGN-030` — Estimate and authorization bridge

Create governed estimate input, support options/changed scope, and consume exact-version customer/internal authorization without bypassing financial authority.

#### `DGN-031` — Task, appointment, and dispatch bridge

Publish diagnostic/repair skill, duration, bay, tool, risk, dependency, readiness, and target requirements; consume confirmed assignment/schedule state.

#### `DGN-032` — Parts readiness bridge

Create proposed demand/readiness requests, preserve fitment and substitute-review boundaries, and consume reservation/ETA/custody facts without direct purchasing or balance mutation.

#### `DGN-033` — Verification Lab

Implement versioned original-concern verification plans, decisive-test repetition, before/after comparison, post-scan/regression, relearn/calibration, road-test rules, independent review, and pass/fail/inconclusive outcomes.

#### `DGN-034` — End-to-end concern-to-verified-repair workflow

Prove advisor, technician, diagnostician, dispatcher, parts, manager, and QC workflows with idempotent handoffs, failure recovery, reopened cases, and complete audit.

**Gate `DG-G4`:** the system proves not only why a repair was recommended, but whether it resolved the original concern.

### Wave 5 — Superseded historical detail for knowledge operations, measurement, and production pilot

> This historical detail no longer governs active `DGN-035` through `DGN-044` planning. Use [`implementation/DGN_035_044_ESTIMATE_INTELLIGENCE_PLANNING.md`](implementation/DGN_035_044_ESTIMATE_INTELLIGENCE_PLANNING.md) and [`DIAGNOSTICS_IMPLEMENTATION_MILESTONES.md`](DIAGNOSTICS_IMPLEMENTATION_MILESTONES.md) for the active Release 3 estimate-intelligence plan. Knowledge operations, learning, expansion, and AI are now carried forward under `DGN-045` through `DGN-050`.

#### `DGN-035` — Knowledge lifecycle services

Implement source/ontology/model/test/rule applicability, review, approve, shadow, activate, suspend, retire, withdraw, and affected-case services with separation of duties.

#### `DGN-036` — Diagnostic Procedure Authoring Studio

Implement structured authoring, schema/source/license/applicability validation, semantic diff, scenario simulation, affected-case analysis, peer/safety approval, release, monitoring, and rollback.

#### `DGN-037` — Knowledge health dashboard

Implement active versions, freshness, expiring/withdrawn sources, validation status, coverage, conflicts, scenario results, owners, and affected-case visibility.

#### `DGN-038` — Diagnostic quality and outcome dashboard

Implement time-to-reproduction/cause, verified resolution, inconclusive/no-fault-found quality, unnecessary-parts review, override, abstention, safety, test usefulness, verification failure, comeback, and data-quality measures.

#### `DGN-039` — Offline and shadow evaluation

Run blinded approved scenarios and shadow comparisons; measure safety, unsupported conclusions, candidate coverage, test efficiency, explanation, abstention, latency, and recovery—not accuracy alone.

#### `DGN-040` — Limited shop pilot

Release only to named users/case types/location with training, support, daily review, feature flag, kill switch, monitoring, rollback, incident ownership, and no autonomous AI.

#### `DGN-041` — Day-one rollout decision

Record explicit `APPROVE`, `HOLD`, or `ROLL_BACK`; include migrations, tests, build, accessibility, performance, browser proof, backup/recovery, security, source rights, known limitations, runbooks, and signoffs.

**Gates `DG-G5–G6`:** safe knowledge change and real-shop evidence justify production use.

### Wave 6 — Coverage expansion, controlled learning, and AI

#### `DGN-042` — Repeatable diagnostic-family release train

Package ontology, sources, models, hazards, tests, algorithms, scenarios, labs, verification, training, shadow, pilot, monitoring, and rollback into a reusable release template.

#### `DGN-043` — Cooling/overheating family

Add pressure, flow, thermal, fan/control, leak, combustion-gas, sensor, and mechanical branches with safety and verification.

#### `DGN-044` — Brake family

Add noise, pulsation, hydraulic, mechanical, ABS/network, measurement, road-test, safety, independent review, and QC controls.

#### `DGN-045` — HVAC and misfire/drivability families

Release each separately with configuration, pressure/temperature or combustion/fuel/ignition/air/mechanical evidence, scenario, and pilot gates.

#### `DGN-046` — Verified similar-case retrieval

Implement permission-safe, configuration/evidence-aware retrieval, difference explanations, false-analogy detection, and outcome links.

#### `DGN-047` — Controlled calibration proposals

Generate reviewed proposals for weights, thresholds, durations, or test ordering; require offline evaluation, independent approval, shadow, versioning, monitoring, and rollback. No self-modifying production rules.

#### `DGN-048` — Provider-neutral AI gateway

Implement permission-filtered retrieval, source citations, structured outputs, prompt/model/tool/source registry, privacy and injection controls, deterministic validation, telemetry, cost/latency limits, kill switch, and disabled mode.

#### `DGN-049` — Low-risk AI assistance

Add technician dictation structuring, cited summaries, missing/contradictory evidence drafts, and approved-procedure explanations with confirmation.

#### `DGN-050` — Advanced AI diagnostic drafts

Evaluate hypothesis, test-plan, similar-case, and repair-handoff drafts in shadow, then bounded assistive mode only after technical, groundedness, abstention, privacy, harmful-output, and human-review gates.

**Gates `DG-G7–G9`:** expansion is repeatable, learning is controlled, and AI remains optional and subordinate.

## 6. Day-One Versus Full Vision

### Day-one production capability (`DGN-001`–`041`)

- independent console and case lifecycle;
- structured diagnostic evidence and test execution;
- initial shared-context labs;
- governed starting/charging/no-start knowledge and reasoning;
- hypotheses, contradictions, multiple/common-cause handling, adaptive test choice;
- qualified conclusion and repair publishing;
- estimate/authorization/dispatch/parts/job/QC bridges;
- post-repair verification and reopening;
- knowledge authoring and release governance;
- quality dashboards, shadow evaluation, and limited production pilot.

### Full elite vision (`DGN-042` onward)

- broad diagnostic system-family coverage;
- mature scan/live-data/waveform/hardware adapters;
- deep intermittent and multi-system diagnosis;
- verified similar-case intelligence;
- calibrated outcome learning;
- supervised AI assistance;
- multi-location policies and content inheritance;
- licensed OEM/commercial connectors and certified secure access;
- enterprise resilience, recovery, support, and justified service scaling.

## 7. Critical Path

```text
001–006 contracts
  -> 007–012 cases
    -> 013–019 evidence/tests
      -> 020–027 reasoning
        -> 028–034 closed-loop execution
          -> 035–039 governance/evaluation
            -> 040 pilot
              -> 041 rollout decision
```

Hardware adapters, AI, broad coverage, and optimization are not on the initial critical path. They must not delay creation of a deterministic, evidence-driven, verified first diagnostic vertical.

## 8. Milestone Definition of Done

Every implementation milestone must include, where applicable:

- additive migration and database constraints;
- repository and transaction behavior;
- domain invariants and explicit commands;
- server-side policy and validation;
- idempotency, concurrency, audit, events, and outbox;
- permission-filtered read model and honest UI states;
- unit, integration, browser, accessibility, and failure/recovery tests;
- telemetry, alerts, feature flag, kill switch, and rollback;
- source/applicability/version and affected-case behavior;
- updated architecture, milestone status, runbook, and known deferments;
- proof that no parallel canonical system was created.

## 9. Program Sizing and Sequencing Rule

This plan deliberately does not invent calendar estimates without team size, availability, source licensing, hardware decisions, and pilot capacity. Each milestone should be converted into one or more small implementation issues after its prerequisite gate passes.

Milestones `007–041` are substantial enterprise product work. Attempting them as one branch or one release would create unacceptable safety, review, migration, and rollback risk. The approved strategy is sequential vertical slices with explicit gate evidence.

## 10. First Implementation Decision

When implementation is authorized, begin with `DGN-001` and do not create UI or schema prematurely. The first concrete output is the domain/source authority and `RepairDiagnosisVersion` publishing contract, followed by the capability/safety matrix and exact no-start scope.

