# Diagnostics Console Planning Package

**Status:** Foundation approved; DGN-007–034 case, evidence, testing, reasoning, adaptive next-test, conclusion, repair handoff, and verification closed-loop controls implemented in source

**Established:** 2026-07-20  
**Parent product:** Time Motor Sales Dispatch Board  
**Primary console:** `/diagnostics`  
**Initial proof domain:** Starting, charging, and no-start diagnosis

## Product Decision

Diagnostics is an independent, first-class console inside Dispatch Board. It is not part of the Inventory Console, not a separate deployment, and not an alternate repair-order system.

The console owns the evidence-driven diagnostic case and reasoning lifecycle. It reuses the canonical vehicle, customer, service visit, repair order, evidence, appointment, task, technician, resource, parts, estimate, authorization, repair-job, quality-control, audit, and activity foundations already owned elsewhere in Dispatch Board.

> Product mission: move safely and efficiently from customer concern to verified root cause and verified repair through structured evidence, automotive engineering logic, explainable recommendations, controlled execution, and organizational learning.

## Read Order

1. [`DIAGNOSTICS_ARCHITECTURE.md`](DIAGNOSTICS_ARCHITECTURE.md) — domain ownership, engine layers, lifecycle, data model, integration contracts, safety, security, non-functional requirements, and AI boundary.
2. [`DIAGNOSTIC_PLATFORM_BENCHMARK.md`](DIAGNOSTIC_PLATFORM_BENCHMARK.md) — official-market examples, composite top-tier capability standard, parity/differentiation gates, and lawful interoperability boundary.
3. [`DIAGNOSTIC_ALGORITHM_CATALOG.md`](DIAGNOSTIC_ALGORITHM_CATALOG.md) — official registry for applicability, engineering, consistency, causal, reliability, probabilistic, evidential, sequential-test, waveform, temporal, statistical, verification, and AI methods.
4. [`CONSISTENCY_AND_CAUSAL_REASONING_SPEC.md`](CONSISTENCY_AND_CAUSAL_REASONING_SPEC.md) — formal model/observation consistency, conflict sets, minimal diagnoses, multiple/intermittent faults, causal support, truth maintenance, and confirmation/abstention rules.
5. [`AUTOMOTIVE_DIAGNOSTIC_ONTOLOGY_AND_KNOWLEDGE_GRAPH.md`](AUTOMOTIVE_DIAGNOSTIC_ONTOLOGY_AND_KNOWLEDGE_GRAPH.md) — configuration-aware semantic model from systems and functions through failure modes, evidence, tests, corrections, and verification.
6. [`DIAGNOSTIC_TOOL_AND_LAB_SUITE.md`](DIAGNOSTIC_TOOL_AND_LAB_SUITE.md) — focused diagnostic operating-system application map and shared case/tool contract.
7. [`SCAN_LIVE_DATA_AND_NETWORK_INTELLIGENCE.md`](SCAN_LIVE_DATA_AND_NETWORK_INTELLIGENCE.md) — scan sessions, topology, DTC relationships, live data, active tests, secure access, and pre/post comparison.
8. [`ELECTRICAL_AND_WAVEFORM_DIAGNOSTICS.md`](ELECTRICAL_AND_WAVEFORM_DIAGNOSTICS.md) — circuit exploration, measurement-first electrical diagnosis, scope/transducer evidence, and instrument governance.
9. [`INTERMITTENT_FAULT_INVESTIGATION.md`](INTERMITTENT_FAULT_INVESTIGATION.md) — temporal capture, reproduction, trigger correlation, nondetection, and no-fault-found discipline.
10. [`DIAGNOSTIC_PROCEDURE_AUTHORING_AND_RELEASE.md`](DIAGNOSTIC_PROCEDURE_AUTHORING_AND_RELEASE.md) — qualified expert authoring, validation, simulation, approval, shadowing, activation, and rollback.
11. [`DIAGNOSTIC_SIMULATION_BENCHMARK_AND_TRAINING.md`](DIAGNOSTIC_SIMULATION_BENCHMARK_AND_TRAINING.md) — engine/procedure proving ground, competitive benchmark method, and technician learning academy.
12. [`DIAGNOSTIC_QUALITY_MASTERY_AND_VERIFICATION.md`](DIAGNOSTIC_QUALITY_MASTERY_AND_VERIFICATION.md) — diagnostic quality standard, mastery model, balanced measures, verification, review, and controlled learning.
13. [`DIAGNOSTICS_ROADMAP.md`](DIAGNOSTICS_ROADMAP.md) — staged path from planning through a governed production pilot, knowledge expansion, optimization, and AI assistance.
14. [`DIAGNOSTICS_IMPLEMENTATION_MILESTONES.md`](DIAGNOSTICS_IMPLEMENTATION_MILESTONES.md) — reviewable vertical slices, dependencies, evidence, and exit gates.
15. [`DIAGNOSTICS_IMPLEMENTATION_MASTER_PLAN.md`](DIAGNOSTICS_IMPLEMENTATION_MASTER_PLAN.md) — consolidated implementation architecture, delivery waves, critical path, and detailed scope/evidence for all 50 milestones.
16. [`DIAGNOSTICS_TECHNICIAN_WORKSPACE_UI_SOURCE_OF_TRUTH.md`](DIAGNOSTICS_TECHNICIAN_WORKSPACE_UI_SOURCE_OF_TRUTH.md) — provisionally approved technician-facing visual direction, role boundary, simplicity rules, and required usability validation.
17. [`DIAGNOSTICS_ENTERPRISE_LABOR_GUIDE_UI_SOURCE_OF_TRUTH.md`](DIAGNOSTICS_ENTERPRISE_LABOR_GUIDE_UI_SOURCE_OF_TRUTH.md) — provisionally approved Enterprise Labor Guide landing-page mockup, advisor/technician/manager role boundaries, and implementation acceptance rules.

## Implementation Records

- [`Implementation record index`](implementation/README.md)
- [`DGN-001 — Domain Authority and Diagnosis Publishing Contract`](implementation/DGN_001_DOMAIN_AUTHORITY_AND_DIAGNOSIS_PUBLISHING_CONTRACT.md)
- [`DGN-002 — Authority, Safety, and Escalation Contract`](implementation/DGN_002_AUTHORITY_SAFETY_AND_ESCALATION_CONTRACT.md)
- [`DGN-003 — No-Start Ontology, Scope, and Scenario Contract`](implementation/DGN_003_NO_START_ONTOLOGY_SCOPE_AND_SCENARIOS.md)
- [`DGN-004 — Knowledge Source and License Register`](implementation/DGN_004_KNOWLEDGE_SOURCE_AND_LICENSE_REGISTER.md)
- [`DGN-005 — Benchmark, Measurement, and Pilot Contract`](implementation/DGN_005_BENCHMARK_MEASUREMENT_AND_PILOT_CONTRACT.md)
- [`DGN-006 — Domain, Command, Schema, Event, and Migration Contract`](implementation/DGN_006_DOMAIN_COMMAND_SCHEMA_EVENT_AND_MIGRATION_CONTRACT.md)
- [`DG-G0 — Foundation Gate Review`](implementation/DG_G0_FOUNDATION_GATE_REVIEW.md) — approved with holds; its authorized `DGN-007` through `DGN-009` case-core scope is now implemented in source.
- [`DGN-007–009 — Diagnostic Case Core Implementation`](implementation/DGN_007_009_CASE_CORE_IMPLEMENTATION.md) — persistence, commands, lifecycle, authority, audit/events/outbox, APIs, and focused verification implemented in source.
- [`DGN-010–012 — Diagnostic Case Console Implementation`](implementation/DGN_010_012_CASE_CONSOLE_IMPLEMENTATION.md) — independent queue, technician case workspace, and governed Repair Order bridge implemented in source.
- [`DGN-013–014 — Diagnostic Evidence Foundation Implementation`](implementation/DGN_013_014_EVIDENCE_FOUNDATION_IMPLEMENTATION.md) — immutable observations, normalized measurements, correction lineage, and governed Vehicle Evidence linking implemented in source.
- [`DGN-015–016 — Diagnostic Test Planning and Execution Implementation`](implementation/DGN_015_016_TEST_EXECUTION_IMPLEMENTATION.md) — immutable definitions, validated case-plan graphs, and append-only execution lifecycle implemented in source.
- [`DGN-017–018 — Technician Workspace and Evidence Review Implementation`](implementation/DGN_017_018_TECHNICIAN_WORKSPACE_IMPLEMENTATION.md) — shared-context lab shells, governed Test Navigator, and permission-filtered evidence reconstruction implemented in source.
- [`DGN-019 — Quality and Safety Gates Implementation`](implementation/DGN_019_QUALITY_SAFETY_GATES_IMPLEMENTATION.md) — deterministic applicability, source, evidence-quality, independence, safety, and test-readiness evaluation implemented in source.
- [`DGN-020–021 — Knowledge and Calculations Implementation`](implementation/DGN_020_021_KNOWLEDGE_CALCULATIONS_IMPLEMENTATION.md) — governed no-start source/graph/test seed and unit-safe engineering calculations implemented in source.
- [`DGN-022–023 — Reasoning Core Implementation`](implementation/DGN_022_023_REASONING_CORE_IMPLEMENTATION.md) — immutable hypotheses, bounded minimal diagnoses, truth revision, and deterministic consistency/causal evaluation implemented in source.
- [`DGN-024–025 — Adaptive Testing Implementation`](implementation/DGN_024_025_ADAPTIVE_TESTING_IMPLEMENTATION.md) — fail-closed next-test eligibility, transparent optimization, alternatives, and immutable authorized override lineage implemented in source.
- [`DGN-026–027 — Conclusion Controls and No-Start Proof`](implementation/DGN_026_027_CONCLUSION_NO_START_PROOF_IMPLEMENTATION.md) — governed technical conclusions, guided technician reasoning UI, and the blinded nine-family generic no-start corpus implemented in source.
- [`DGN-033–034 — Verification Closed Loop Implementation`](implementation/DGN_033_034_VERIFICATION_CLOSED_LOOP_IMPLEMENTATION.md) — governed post-repair verification plans, pass/fail/unsafe outcomes, closure controls, and immutable repair-proof lineage implemented in source.
- [`DGN-035–037 — Advisor Estimate Foundation Implementation`](implementation/DGN_035_037_ADVISOR_ESTIMATE_FOUNDATION_IMPLEMENTATION.md) — advisor-review estimate draft contract, immutable lineage, workspace panel, and no-auto-execution authority boundary implemented in source.
- [`DGN-035–044 — Estimate Intelligence and Repair Execution Planning`](implementation/DGN_035_044_ESTIMATE_INTELLIGENCE_PLANNING.md) — Release 3 advisor review, selectable estimate strategies, Enterprise Labor Guide module, labor/parts/capacity intelligence, and repair execution handoff architecture adopted as planning only.

## Current Truth

Dispatch Board already has substantial foundations that Diagnostics must reuse:

- canonical vehicles, customers, service visits, and repair orders;
- governed vehicle evidence and Vehicle 360;
- versioned inspection and diagnosis summaries;
- estimates, customer authorization, repair jobs, technician dispatch, labor clocks, parts demand, QC, comeback, and release controls;
- enterprise task, appointment, activity, audit, command, idempotency, optimistic-concurrency, event, and outbox patterns;
- shop-repair optimization and enterprise automation/AI governance packages.

The diagnostic case model, backend lifecycle, independent console, technician workspace, Repair Order bridge, immutable evidence/testing foundations, lab shells, evidence reconstruction, quality/safety gates, governed knowledge persistence, generic no-start graph/test seed, unit-safe engineering calculations, immutable hypotheses/evidence links, bounded minimal diagnoses, deterministic consistency/causal evaluation, fail-closed next-test eligibility, transparent optimization, authorized override lineage, governed conclusion controls, connected reasoning UI, simulation-only no-start proof corpus, repair handoffs, closed-loop verification controls, and advisor estimate draft foundation are implemented in source through DGN-037. DGN-038–044 remain adopted as Release 3 estimate-intelligence planning only, including the Enterprise Labor Guide module. The migrations are not deployed and rollout remains disabled. Approved production reasoning/adaptive/conclusion providers, licensed vehicle-specific knowledge, hardware adapters, executable full estimate intelligence, executable labor guide intelligence, pilot activation, and AI remain gated.

## Non-Negotiable Product Principles

1. Evidence before conclusion.
2. A trouble code is evidence, not a component-replacement instruction.
3. Safety, authorization, and vehicle applicability are hard gates.
4. Facts, observations, hypotheses, recommendations, and confirmed conclusions remain visibly distinct.
5. Recommendations explain why, show uncertainty, and allow authorized disagreement.
6. Diagnostic rules, procedures, specifications, and sources are versioned and attributable.
7. The engine can abstain and request more evidence.
8. A repair is not successful until the original concern is reproducibly verified as resolved.
9. Learning proposes reviewed improvements; it never silently rewrites safety-critical logic.
10. AI is a supervised assistance layer, not the source of authority.

## Definition of Elite

The program earns the description “enterprise, top-tier, and sophisticated” only when it demonstrates all of the following in production evidence:

- configuration-aware diagnostic guidance;
- structured, attributable measurements and observations;
- explainable hypothesis ranking and next-test selection;
- versioned knowledge and decision provenance;
- safety and approval enforcement on the server;
- complete handoffs to dispatch, parts, estimate, repair, and QC;
- calibrated confidence and explicit abstention;
- immutable audit and replay-safe commands;
- measurable first-time-fix, diagnostic-time, unnecessary-parts, comeback, and verification outcomes;
- controlled degraded operation, monitoring, rollback, and recovery;
- AI outputs grounded in authorized sources and confirmed by qualified people.
