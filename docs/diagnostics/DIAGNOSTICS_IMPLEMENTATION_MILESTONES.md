# Enterprise Diagnostics Console Implementation Milestones

**Version:** 1.0 planning baseline  
**Date:** 2026-07-20  
**Status:** Sequenced work packages; not implementation evidence

For the expanded build scope, affected layers, critical path, day-one boundary, and detailed explanation of every milestone, use [`DIAGNOSTICS_IMPLEMENTATION_MASTER_PLAN.md`](DIAGNOSTICS_IMPLEMENTATION_MASTER_PLAN.md).

## Working Rules

- Deliver one reviewable vertical slice at a time.
- Preserve existing Repair Order, Vehicle, Task, Appointment, Parts, Authorization, Job, QC, Activity, Audit, and Evidence authorities.
- Every milestone includes policy, validation, persistence, service, read model/UI where applicable, events/audit, tests, documentation, and failure states.
- Planned models and routes remain conceptual until the milestone approves their exact contract.
- Do not activate a diagnostic algorithm merely because its code exists.

## Milestone Map

### Foundation — `DGN-001` through `DGN-006`

| ID | Deliverable | Depends on | Exit evidence |
| --- | --- | --- | --- |
| `DGN-001` | **Complete — contract only.** Architecture decision record and source-authority map. Confirm owned/shared records and publish contract to `RepairDiagnosisVersion`. See [`implementation/DGN_001_DOMAIN_AUTHORITY_AND_DIAGNOSIS_PUBLISHING_CONTRACT.md`](implementation/DGN_001_DOMAIN_AUTHORITY_AND_DIAGNOSIS_PUBLISHING_CONTRACT.md). | None | Architecture review complete; current whole-RO supersession limitation named for DGN-006/DGN-028; no runtime behavior claimed. |
| `DGN-002` | Product charter, roles, capabilities, safety-risk tiers, separation-of-duties matrix, and escalation ownership. | 001 | Approved authority matrix and denied-command scenarios. |
| `DGN-003` | Current-shop workflow map, diagnostic ontology/vocabulary, mastery/quality model, initial no-start scope, exclusions, and scenario catalog. | 001–002 | Qualified technical review, ontology traversal, balanced quality review, and gold-case acceptance. |
| `DGN-004` | Knowledge-source/license register and first-workflow ingestion decision. | 001 | Rights, attribution, retention, withdrawal, and prohibited-use disposition for every source. |
| `DGN-005` | Hands-on competitive capability benchmark, simulation/training governance, KPI baseline, telemetry contract, pilot boundaries, pause/rollback criteria, and data-retention plan. | 002–004 | Scenario-based benchmark, evaluation/training separation, accepted parity/differentiation targets, baseline collection plan, and approved pilot scorecard. |
| `DGN-006` | Exact diagnostic aggregate, command, event, reason-code, concurrency, idempotency, algorithm-registry, consistency/causal model, lab-suite, adapter/evidence, and migration contracts. | 001–005 | Schema/contract review, algorithm precedence review, formal consistency examples, end-to-end lab context proof, and migration/rollback rehearsal plan. |

**Gate `DG-G0`:** architecture, authority, source, scope, and measurement decisions are accepted.

### Case Console — `DGN-007` through `DGN-012`

| ID | Deliverable | Depends on | Exit evidence |
| --- | --- | --- | --- |
| `DGN-007` | Additive case foundation migration, repositories, domain invariants, events, audit, and outbox mappings. | 006 | Schema validation, migration tests, org/location isolation, immutable-event proof. |
| `DGN-008` | Case create/read commands linked to canonical repair-order concern; duplicate/replay protection. | 007 | Integration tests for valid, stale, duplicate, denied, and cross-org attempts. |
| `DGN-009` | Case assignment, state transitions, blockers, escalation, reopen, and abandonment commands. | 008 | State-machine and permission matrix tests. |
| `DGN-010` | `/diagnostics` console shell and permission-filtered queue read model. | 008–009 | Loading, empty, error, stale, restricted, and populated browser states. |
| `DGN-011` | `/diagnostics/cases/[caseId]` header, concern, ownership, lifecycle, and timeline workspace. | 009–010 | Desktop/mobile/accessibility workflow proof. |
| `DGN-012` | Repair Order Workbench bridge: create/open case and display governed summary without duplicated logic. | 008–011 | End-to-end RO-to-case traceability and honest unavailable states. |

**Gate `DG-G1`:** the independent console and case lifecycle are durable, safe, and operationally usable.

### Evidence and Testing — `DGN-013` through `DGN-019`

| ID | Deliverable | Depends on | Exit evidence |
| --- | --- | --- | --- |
| `DGN-013` | Observation and measurement contracts with units, conditions, source, reliability, fact class, and correction lineage. | 007–009 | Unit normalization, plausibility, supersession, and audit tests. |
| `DGN-014` | Vehicle Evidence links to case/concern/test/hypothesis/conclusion/verification. | 013 | Access, malware/quarantine, retention, restricted evidence, and link-integrity tests. |
| `DGN-015` | Versioned test-definition and test-plan aggregates with ontology links, applicability, prerequisites, hazards, branching, and required evidence. | 006, 013 | Version/applicability/safety/semantic-integrity contract tests. |
| `DGN-016` | Test start/pause/complete/invalidate commands and immutable execution evidence. | 015 | Replay, qualification, prerequisite, stale-version, deviation, and cancellation tests. |
| `DGN-017` | Shared-context technician test execution and initial Systems/Electrical/Scan/Live Data/Waveform lab shells optimized for mobile/shop and desktop expert use. Follow [`DIAGNOSTICS_TECHNICIAN_WORKSPACE_UI_SOURCE_OF_TRUTH.md`](DIAGNOSTICS_TECHNICIAN_WORKSPACE_UI_SOURCE_OF_TRUTH.md). | 013–016 | Gloved/mobile and desktop review, technician usability evidence, lab-to-case provenance, no data loss, resume/recovery proof. |
| `DGN-018` | Evidence timeline, measurement matrix, comparison, conflict, and freshness views. | 013–017 | Permission-filtered read-model reconciliation and accessibility tests. |
| `DGN-019` | Evidence completeness, data-quality, and safety-gate evaluator. | 013–018 | Missing, stale, wrong-unit, implausible, conflicting, unsafe, and abstention scenarios. |

**Gate `DG-G2`:** technicians can execute a governed test plan and the case can be reconstructed from trustworthy evidence.

### No-Start Reasoning Proof — `DGN-020` through `DGN-027`

| ID | Deliverable | Depends on | Exit evidence |
| --- | --- | --- | --- |
| `DGN-020` | Rule/knowledge version contracts, initial ontology/knowledge-graph slice, and controlled seed package for starting/charging/no-start. | 003–004, 015 | Qualified review, graph traversal, checksums, applicability, citations, and rollback predecessor. |
| `DGN-021` | Unit-safe electrical calculation library for initial workflow. | 020 | Boundary, property, wrong-unit, precision, and reference-case tests. |
| `DGN-022` | Hypothesis aggregate, assumption-based truth maintenance, support/contradiction evidence, minimal conflict sets, and bounded minimal-diagnosis generation. | 013–020 | Single, multiple, common-cause, intermittent, retraction, conflict, rejection, and bounded-search tests. |
| `DGN-023` | Deterministic rule evaluator, applicability resolver, consistency/causal evaluator, and reason-code explanations. | 019–022 | Golden scenarios, formal model examples, causal-prediction checks, and deterministic replay equality. |
| `DGN-024` | Next-test candidate generator and eligibility filter. | 015–023 | Prerequisite, resource, hazard, capability, configuration, and source-expiry exclusions. |
| `DGN-025` | Transparent next-test ranking with policy version, alternatives, factors, and authorized override. | 024 | Stable ranking tests, override traceability, no hard-gate scoring bypass. |
| `DGN-026` | Cause proposal/confirmation/abstention/supersession commands and qualified signoff. | 022–025 | Insufficient, conflicting, unsafe, confirmed, rejected, and superseded cases. |
| `DGN-027` | Hypothesis/test/reasoning/conclusion UI plus complete no-start simulation, benchmark, and training corpus. | 023–026 | Browser workflows, blinded evaluation separation, and full normal/exception/degraded/safety regression corpus. |

**Gate `DG-G3`:** the first deterministic diagnostic engine passes technical, safety, explanation, and abstention review.

### Closed-Loop Execution — `DGN-028` through `DGN-034`

| ID | Deliverable | Depends on | Exit evidence |
| --- | --- | --- | --- |
| `DGN-028` | Publish confirmed conclusion to versioned repair diagnosis with exact lineage. | 026 | Atomicity, replay, supersession, and cross-domain reconciliation tests. |
| `DGN-029` | Repair recommendation package: operations, duration range, skills, certifications, bay/tools, parts, hazards, procedures, and QC. | 028 | Completeness, applicability, authorization-boundary, and version tests. |
| `DGN-030` | Estimate/authorization handoff and changed-scope return path. | 029 | No unauthorized job creation; stale estimate/auth and partial acceptance scenarios. |
| `DGN-031` | Tasks/Appointments/Dispatch resource-requirement bridge. | 029 | Eligibility, collision, delay, cancellation, and manager-override scenarios. |
| `DGN-032` | Parts demand/readiness bridge with substitute-review boundary. | 029 | No direct purchase/balance mutation; fitment, shortage, ETA, and replay scenarios. |
| `DGN-033` | Versioned concern-specific post-repair Verification Lab plan and execution workflow. | 028–032 | Pass, fail, inconclusive, unsafe-road-test, independent-review, regression, and reopen tests. |
| `DGN-034` | End-to-end no-start concern-to-verified-repair workflow and repair-order summary. | 028–033 | Manager, advisor, technician, parts, dispatcher, and QC browser acceptance. |

**Gate `DG-G4`:** diagnosis, authorization, execution, and verified closure are fully traceable without authority leakage.

### Knowledge Operations and Pilot — `DGN-035` through `DGN-041`

| ID | Deliverable | Depends on | Exit evidence |
| --- | --- | --- | --- |
| `DGN-035` | Knowledge source, applicability, review, release, suspension, retirement, and withdrawal services. | 004, 020 | Policy, separation-of-duty, affected-case, and rollback tests. |
| `DGN-036` | Diagnostic Procedure Authoring Studio for ontology/rule/test/calculation administration with schema validation, semantic diff, affected-case analysis, and simulation preview. | 021–027, 035 | Invalid release rejection, source/applicability review, diff, scenario result, separation of duties, approval, and rollback evidence. |
| `DGN-037` | Knowledge quality, source freshness, active-version, and affected-case dashboard. | 035–036 | Reconciled read models and alert proof. |
| `DGN-038` | Operational metrics, outcome attribution, override/abstention, verification, and comeback dashboard. | 033–037 | Metric definitions reconcile to case-level records; anti-gaming review. |
| `DGN-039` | Shadow-mode run using historical/synthetic approved cases. | 027, 034–038 | Accuracy is not the sole gate: safety, abstention, explanation, time, and data-quality thresholds reported. |
| `DGN-040` | Limited pilot with named users, case types, support, kill switch, and daily review. | 039 | Approved pilot report; no unresolved critical safety, privacy, integrity, or recovery defect. |
| `DGN-041` | Day-one rollout decision and runbooks. | 040 | Explicit `APPROVE`, `HOLD`, or `ROLL_BACK` decision with signoffs and current evidence. |

**Gates `DG-G5` and `DG-G6`:** knowledge operations are safe and the initial production pilot earns an explicit rollout decision.

### Expansion, Learning, and AI — `DGN-042` through `DGN-050`

| ID | Deliverable | Depends on | Exit evidence |
| --- | --- | --- | --- |
| `DGN-042` | Repeatable diagnostic-family release template and review board. | 035–041 | One second system family completes the full release template. |
| `DGN-043` | Cooling/overheating family. | 042 | Sources, hazards, scenarios, shadow, limited rollout, monitoring. |
| `DGN-044` | Brake noise/pulsation/hydraulic family with elevated safety controls. | 042–043 | Independent safety review and verification/QC proof. |
| `DGN-045` | HVAC and misfire/drivability family releases. | 042–044 | Separate applicability, scenario, and rollout evidence per family. |
| `DGN-046` | Similar verified-case retrieval and outcome analytics. | 038–042 | Permission, de-identification where required, relevance, and false-analogy tests. |
| `DGN-047` | Controlled calibration proposal workflow; no autonomous rule change. | 038, 046 | Offline simulation, independent approval, shadow, rollback, and drift monitoring. |
| `DGN-048` | Provider-neutral AI gateway, governed retrieval, citations, prompt/model/tool registry, and kill switch. | 035–047 | Privacy, access, injection, source, latency, cost, and disabled-mode tests. |
| `DGN-049` | AI-assisted dictation, summaries, missing-evidence detection, and approved-procedure explanation. | 048 | Groundedness, structured-output, abstention, harmful-output, and human-confirmation evaluation. |
| `DGN-050` | AI hypothesis/test-plan/similar-case drafts in shadow then limited assistive mode. | 046, 048–049 | Technical review, comparative evaluation, override/outcome monitoring, explicit promotion decision. |

**Gates `DG-G7` through `DG-G9`:** system expansion is repeatable, learning is governed, and AI earns only bounded assistive authority.

## Definition of Day-One Production Readiness

The initial Diagnostics Console is ready only when:

- the independent console is integrated into the app shell and Repair Order Workbench;
- cases, evidence, tests, hypotheses, conclusions, recommendations, and verification are durable and versioned;
- the starting/charging/no-start scope passes approved technical and safety scenarios;
- server-side permissions, qualifications, safety, applicability, source, and authorization gates are proven;
- no cross-domain handoff duplicates or partially commits work;
- common desktop/mobile shop workflows pass accessibility and browser testing;
- monitoring, backup/recovery, feature flags, kill switch, and rollback are rehearsed;
- pilot KPIs meet approved thresholds with no unresolved critical defect;
- the rollout record explicitly states what is implemented, deferred, and approved.

## Explicitly Deferred from the Initial Release

- autonomous diagnosis or repair authorization;
- broad all-make/all-system coverage;
- unlicensed reproduction of proprietary service data;
- production AI reasoning;
- automatic purchasing, dispatch, customer promises, or vehicle release;
- self-modifying rules or continuous unsupervised learning;
- direct hardware/scan-tool integrations beyond approved import boundaries;
- advanced ADAS, high-voltage, restraint, immobilizer, emissions, and module-programming workflows until enhanced governance is approved;
- microservice extraction, native mobile applications, and multi-region deployment without measured need.
