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
| `DGN-002` | **Complete — contract only.** Product charter, roles, capabilities, safety-risk tiers, separation-of-duties matrix, and escalation ownership. See [`implementation/DGN_002_AUTHORITY_SAFETY_AND_ESCALATION_CONTRACT.md`](implementation/DGN_002_AUTHORITY_SAFETY_AND_ESCALATION_CONTRACT.md). | 001 | Authority matrix, risk tiers, escalation ladder, and denied-command scenarios accepted; runtime enforcement deferred. |
| `DGN-003` | **Complete — contract only.** Workflow ontology, mastery/quality model, initial no-start scope, exclusions, and scenario catalog. See [`implementation/DGN_003_NO_START_ONTOLOGY_SCOPE_AND_SCENARIOS.md`](implementation/DGN_003_NO_START_ONTOLOGY_SCOPE_AND_SCENARIOS.md). | 001–002 | Functional-chain traversal, explicit boundary, and 24 gold scenarios accepted; runtime deferred. |
| `DGN-004` | **Complete — governance only.** Knowledge-source/license register and first-workflow dispositions. See [`implementation/DGN_004_KNOWLEDGE_SOURCE_AND_LICENSE_REGISTER.md`](implementation/DGN_004_KNOWLEDGE_SOURCE_AND_LICENSE_REGISTER.md). | 001 | Rights, attribution, retention, withdrawal, and prohibited-use rules accepted; held sources are not authorized for ingestion. |
| `DGN-005` | **Complete — contract only.** Competitive benchmark path, balanced measurement, evaluation separation, pilot boundary, and pause/rollback contract. See [`implementation/DGN_005_BENCHMARK_MEASUREMENT_AND_PILOT_CONTRACT.md`](implementation/DGN_005_BENCHMARK_MEASUREMENT_AND_PILOT_CONTRACT.md). | 002–004 | Measurement and pilot governance accepted; no benchmark result, invented target, or pilot approval claimed. |
| `DGN-006` | **Complete — contract only.** Exact diagnostic aggregate, commands, events, reason codes, concurrency, idempotency, algorithm/lab/evidence, staged schema, publication lineage, and migration contracts. See [`implementation/DGN_006_DOMAIN_COMMAND_SCHEMA_EVENT_AND_MIGRATION_CONTRACT.md`](implementation/DGN_006_DOMAIN_COMMAND_SCHEMA_EVENT_AND_MIGRATION_CONTRACT.md). | 001–005 | Contract review complete; dedicated case publication link selected; runtime schema and behavior deferred. |

**Gate `DG-G0`: Approved with holds.** Architecture, authority, source, scope, measurement, and exact contract decisions are accepted. See [`implementation/DG_G0_FOUNDATION_GATE_REVIEW.md`](implementation/DG_G0_FOUNDATION_GATE_REVIEW.md). Only `DGN-007` through `DGN-009` are authorized next.

### Case Console — `DGN-007` through `DGN-012`

| ID | Deliverable | Depends on | Exit evidence |
| --- | --- | --- | --- |
| `DGN-007` | **Implemented in source.** Additive case foundation migration, repositories, domain invariants, events, audit, and outbox mappings. See [`implementation/DGN_007_009_CASE_CORE_IMPLEMENTATION.md`](implementation/DGN_007_009_CASE_CORE_IMPLEMENTATION.md). | 006 | Schema validation, tenant constraints, immutable-history triggers, and focused tests pass; migration deployment remains an environment operation. |
| `DGN-008` | **Implemented in source.** Case create/read commands linked to canonical Repair Order concern with concern-specific decomposition, duplicate protection, and replay-safe identity. | 007 | Valid, denied, permission-filtered, deterministic identity, canonical-source, and replay routing tests pass. |
| `DGN-009` | **Implemented in source.** Case assignment, state transitions, blockers/waiting, escalation, reopen, and abandonment commands. | 008 | State-machine, assignment authority, assigned-technician, rollout-off, waiting/resume, and terminal/reopen tests pass. |
| `DGN-010` | `/diagnostics` console shell and permission-filtered queue read model. | 008–009 | Loading, empty, error, stale, restricted, and populated browser states. |
| `DGN-011` | `/diagnostics/cases/[caseId]` header, concern, ownership, lifecycle, and timeline workspace. | 009–010 | Desktop/mobile/accessibility workflow proof. |
| `DGN-012` | Repair Order Workbench bridge: create/open case and display governed summary without duplicated logic. | 008–011 | End-to-end RO-to-case traceability and honest unavailable states. |

**Gate `DG-G1`:** the independent console and case lifecycle are durable, safe, and operationally usable.

### Evidence and Testing — `DGN-013` through `DGN-019`

| ID | Deliverable | Depends on | Exit evidence |
| --- | --- | --- | --- |
| `DGN-013` | **Implemented in source.** Observation and measurement contracts with units, conditions, source, reliability, fact class, plausibility, and immutable correction lineage. | 007–009 | Unit normalization, dimensional mismatch, plausibility, time-window, supersession, authority, and schema/audit contract tests pass. |
| `DGN-014` | **Implemented in source.** Governed Vehicle Evidence links and permission-filtered technician attachment workflow; future target types remain hard-rejected until their owning aggregates exist. | 013 | Access, malware/quarantine, deleted, restricted, cross-tenant, wrong-vehicle, retention-metadata, and link-integrity tests pass. |
| `DGN-015` | **Implemented in source.** Versioned test-definition and test-plan aggregates with ontology links, applicability, prerequisites, hazards, branching, required evidence, graph validation, and source checksums. See [`implementation/DGN_015_016_TEST_EXECUTION_IMPLEMENTATION.md`](implementation/DGN_015_016_TEST_EXECUTION_IMPLEMENTATION.md). | 006, 013 | Version, graph, applicability, expiry, R4 prohibition, qualification, and semantic-integrity tests pass; full DGN-019 evaluator remains separate. |
| `DGN-016` | **Implemented in source.** Start/pause/resume/complete/invalidate/repeat/cancel commands with immutable execution revisions, actual conditions, deviations, results, and evidence lineage. | 015 | Domain, service, schema, authorization, rollout, replay-routing, deviation, recovery, and cancellation contracts pass. |
| `DGN-017` | **Implemented in source.** Shared-context Systems, Scan, Live Data, Electrical, Waveform, Mechanical, Hypothesis, Test Navigator, Intermittent, and Verification shells plus governed test lifecycle controls. See [`implementation/DGN_017_018_TECHNICIAN_WORKSPACE_IMPLEMENTATION.md`](implementation/DGN_017_018_TECHNICIAN_WORKSPACE_IMPLEMENTATION.md). | 013–016 | Responsive source/UI tests and persisted resume/recovery routing pass; representative technician, populated browser, and hardware-adapter validation remain open. |
| `DGN-018` | **Implemented in source.** Permission-filtered combined timeline, measurement matrix, expected/actual comparison, review conflicts, source freshness, raw/correction/supersession/repeat lineage, and bounded initial rendering. | 013–017 | Projection reconciliation, restricted-state, lineage, comparison, source freshness, and workspace tests pass; production-scale browser validation remains open. |
| `DGN-019` | **Implemented in source.** Deterministic policy-versioned applicability, source, unit, plausibility, instrument, completeness, independence, qualification, hazard, tool, vehicle-state, dependency, and test-readiness evaluator with `READY`, `BLOCKED`, `ABSTAIN`, and `NOT_APPLICABLE` dispositions. See [`implementation/DGN_019_QUALITY_SAFETY_GATES_IMPLEMENTATION.md`](implementation/DGN_019_QUALITY_SAFETY_GATES_IMPLEMENTATION.md). | 013–018 | Missing, stale, wrong-unit, implausible, expired-instrument, correlated, wrong-vehicle, source-withdrawal, unsafe, qualification, dependency, and abstention scenarios pass; migrated-runtime and technician validation remain open. |

**Gate `DG-G2`:** technicians can execute a governed test plan and the case can be reconstructed from trustworthy evidence.

### No-Start Reasoning Proof — `DGN-020` through `DGN-027`

| ID | Deliverable | Depends on | Exit evidence |
| --- | --- | --- | --- |
| `DGN-020` | **Implemented in source.** Tenant-scoped immutable source/rule-set/citation versions, independent review and withdrawal/rollback lineage, controlled generic no-start graph, and four governed test definitions. See [`implementation/DGN_020_021_KNOWLEDGE_CALCULATIONS_IMPLEMENTATION.md`](implementation/DGN_020_021_KNOWLEDGE_CALCULATIONS_IMPLEMENTATION.md). | 003–004, 015 | Review separation, traversal, deterministic checksums, citations, holds, applicability, withdrawal/abstention, tenant lineage, and rollback contracts pass; no held OEM source is activated. |
| `DGN-021` | **Implemented in source.** Unit-safe Ohm/power/energy, Kirchhoff, series/parallel, loaded voltage-drop, timing, tolerance, speed/ratio, and torque library. | 020 | Reference, boundary, reversible-property, wrong-dimension/unit, conversion, precision, and physically impossible cases pass. |
| `DGN-022` | **Implemented in source.** Immutable hypotheses and typed evidence links, subset-minimal conflicts, bounded minimal hitting-set diagnoses, multiple/common/intermittent candidates, supersession, and truth revision. See [`implementation/DGN_022_023_REASONING_CORE_IMPLEMENTATION.md`](implementation/DGN_022_023_REASONING_CORE_IMPLEMENTATION.md). | 013–020 | Single, independent multiple, modeled common cause, intermittent, retraction, direct evidence conflict, invalid evidence exclusion, and bounded incomplete-search cases pass. |
| `DGN-023` | **Implemented in source.** Deterministic applicability/rule/consistency/causal evaluator, missing effects, reason codes, checksums, immutable evaluations, server-owned provider boundary, and rollout-gated API. | 019–022 | Formal model, causal-versus-associated, direct contradiction over AI/common-fix, wrong vehicle, hard gate, no-provider abstention, and deterministic replay cases pass. |
| `DGN-024` | **Implemented in source.** Discriminating candidate generation plus independent applicability, prerequisite, safety, authority, skill, tool, vehicle-state, authorization, source, and definition gates. See [`implementation/DGN_024_025_ADAPTIVE_TESTING_IMPLEMENTATION.md`](implementation/DGN_024_025_ADAPTIVE_TESTING_IMPLEMENTATION.md). | 015–023 | Every exclusion retains all reasons; prerequisite, resource, hazard, capability, configuration, authorization, source-rights/expiry, and definition-validity cases pass. |
| `DGN-025` | **Implemented in source.** Explicit versioned weights, information gain, risk/reliability/time/cost/invasiveness/setup/resource factors, bounded look-ahead, stable alternatives, and immutable authorized override lineage. | 024 | Stable factor/tie, cost/risk, malformed-weight, override traceability, server-owned input, and no hard-gate scoring-bypass cases pass. |
| `DGN-026` | **Implemented in source.** Immutable propose/confirm/reject/supersede/abstain/escalate conclusions with exact reasoning/evidence/source/safety lineage, explicit technical grants, alternative/contradiction controls, and R3 independent review. See [`implementation/DGN_026_027_CONCLUSION_NO_START_PROOF_IMPLEMENTATION.md`](implementation/DGN_026_027_CONCLUSION_NO_START_PROOF_IMPLEMENTATION.md). | 022–025 | Insufficient, conflicting, association-only, out-of-model, R4, unavailable-source, alternatives, confirmation, rejection, abstention, escalation, independent-review, and supersession cases pass. |
| `DGN-027` | **Implemented in source.** Connected hypothesis/adaptive-test/conclusion technician UI plus versioned blinded simulation-only no-start corpus and benchmark runner. | 023–026 | Workspace rendering and all nine normal/misleading-code/measurement-error/common-ground/intermittent/multiple-fault/unsafe/degraded/no-fault-found corpus families pass; representative browser/usability acceptance remains a formal gate item. |

**Gate `DG-G3`:** the first deterministic diagnostic engine passes technical, safety, explanation, and abstention review.

### Closed-Loop Execution — `DGN-028` through `DGN-034`

| ID | Deliverable | Depends on | Exit evidence |
| --- | --- | --- | --- |
| `DGN-028` | **Implemented in source.** Publish confirmed conclusion to versioned repair diagnosis with exact lineage. See [`implementation/DGN_028_032_REPAIR_HANDOFFS_IMPLEMENTATION.md`](implementation/DGN_028_032_REPAIR_HANDOFFS_IMPLEMENTATION.md). | 026 | Atomicity, replay, supersession, and cross-domain reconciliation tests; migrated-runtime and consumer acceptance remain open. |
| `DGN-029` | **Implemented in source.** Repair recommendation package: operations, duration range, skills, certifications, bay/tools, parts, hazards, procedures, and QC. | 028 | Completeness, applicability, authorization-boundary, and version tests; downstream acceptance remains owned by repair planning. |
| `DGN-030` | **Implemented in source.** Estimate/authorization handoff and changed-scope return path. | 029 | No unauthorized job creation; stale estimate/auth and partial acceptance scenarios; advisor acceptance remains separate. |
| `DGN-031` | **Implemented in source.** Tasks/Appointments/Dispatch resource-requirement bridge. | 029 | Eligibility, collision, delay, cancellation, and manager-override scenarios; no task, appointment, or dispatch mutation is created by Diagnostics. |
| `DGN-032` | **Implemented in source.** Parts demand/readiness bridge with substitute-review boundary. | 029 | No direct purchase/balance mutation; fitment, shortage, ETA, and replay scenarios; parts acceptance remains separate. |
| `DGN-033` | **Implemented in source.** Versioned concern-specific post-repair Verification Lab plan and execution workflow. See [`implementation/DGN_033_034_VERIFICATION_CLOSED_LOOP_IMPLEMENTATION.md`](implementation/DGN_033_034_VERIFICATION_CLOSED_LOOP_IMPLEMENTATION.md). | 028–032 | Pass, fail, inconclusive, unsafe-road-test, independent-review, regression, and reopen tests; migrated-runtime and representative browser proof remain open. |
| `DGN-034` | **Implemented in source.** End-to-end no-start concern-to-verified-repair workflow and repair-order summary. | 028–033 | Manager, advisor, technician, parts, dispatcher, and QC browser acceptance remain formal `DG-G4` gate evidence. |

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
