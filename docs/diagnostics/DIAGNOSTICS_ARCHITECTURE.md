# Enterprise Diagnostics Console Architecture

**Document:** Enterprise Diagnostics Console Architecture  
**Version:** 1.0 planning baseline  
**Date:** 2026-07-20  
**Status:** Approved target architecture; implementation remains milestone-gated  
**Primary routes:** `/diagnostics`, `/diagnostics/cases/[caseId]`  
**Parent product:** Time Motor Sales Dispatch Board

---

## 1. Purpose and Product Boundary

The Diagnostics Console is the evidence, reasoning, test planning, root-cause confirmation, repair-recommendation, and post-repair verification domain inside Dispatch Board.

It is:

- an independent console and bounded domain;
- integrated into the shared Dispatch Board application shell;
- the authoritative home for diagnostic cases, hypotheses, tests, reasoning, and verification plans;
- a controlled producer of published diagnosis versions and repair-planning inputs.

It is not:

- a subsection of Inventory;
- a replacement for Vehicle 360 or the Repair Order Workbench;
- an OEM service-information publisher;
- an autonomous repair authorizer;
- a generic chatbot that guesses causes from symptoms;
- a second task, schedule, inventory, parts, estimate, authorization, or work-order system.

## 2. Architectural Decisions

| ID | Decision | Consequence |
| --- | --- | --- |
| `DGN-ADR-001` | Independent console inside the Dispatch Board modular monolith. | Shared deployment, auth, database, design system, commands, events, and operations; clear domain boundaries. |
| `DGN-ADR-002` | Diagnostics owns the diagnostic case; Repair Orders own commercial/execution lifecycle. | A case publishes a governed `RepairDiagnosisVersion`; it does not create an alternate repair order. |
| `DGN-ADR-003` | Structured evidence and explicit state machines precede AI. | The platform remains useful, testable, and safe without a model provider. |
| `DGN-ADR-004` | Hybrid reasoning is required. | Hard rules, decision graphs, calculations, constraints, probabilistic ranking, and similar-case retrieval have separate governed roles. |
| `DGN-ADR-005` | Knowledge is source-attributed, applicable, effective-dated, and versioned. | Unsupported or out-of-applicability guidance fails closed or is labeled advisory. |
| `DGN-ADR-006` | Published conclusions are immutable versions. | Corrections supersede prior conclusions without erasing history. |
| `DGN-ADR-007` | Human authority is capability- and risk-based. | Qualified technicians confirm causes; authorized staff approve scope, money, dispatch, and release. |
| `DGN-ADR-008` | One complete vertical slice precedes wide coverage. | Starting/charging/no-start proves the architecture before system expansion. |
| `DGN-ADR-009` | AI is added through a provider-neutral gateway after governed retrieval and evaluation exist. | Models can change without becoming domain authority or contaminating canonical facts. |
| `DGN-ADR-010` | Service extraction is evidence-driven, not aspirational. | Remain one deployable app until measured load, isolation, or independent-release needs justify extraction. |

The capability target and representative product classes are maintained in [`DIAGNOSTIC_PLATFORM_BENCHMARK.md`](DIAGNOSTIC_PLATFORM_BENCHMARK.md). Market benchmarking informs requirements but does not authorize copying, unlicensed data use, or security-control circumvention.

The governed reasoning portfolio is maintained in [`DIAGNOSTIC_ALGORITHM_CATALOG.md`](DIAGNOSTIC_ALGORITHM_CATALOG.md). Model-based consistency, conflict generation, minimal diagnoses, causal support, multiple/intermittent faults, and truth revision follow [`CONSISTENCY_AND_CAUSAL_REASONING_SPEC.md`](CONSISTENCY_AND_CAUSAL_REASONING_SPEC.md). These documents govern algorithm design but do not activate production authority.

The diagnostic mastery layer is governed by the ontology/knowledge-graph, tool/lab suite, scan/live-data/network, electrical/waveform, intermittent-fault, procedure-authoring, simulation/training, and quality/verification specifications indexed in [`README.md`](README.md). Implementations may strengthen these controls but may not replace them with code-to-fix lookup, untraceable prompts, or isolated tools that lose case provenance.

## 3. Enterprise Context

```text
Customer / Advisor concern
          |
          v
Canonical Service Visit and Repair Order
          |
          v
+---------------------------------------------------------------+
|                    DIAGNOSTICS CONSOLE                        |
| Intake -> Evidence -> Hypotheses -> Test plan -> Test results |
|       -> Confirmed cause -> Repair recommendation             |
|       -> Verification plan -> Verified outcome                |
+---------------------------------------------------------------+
   |             |               |               |
   v             v               v               v
Tasks/Dispatch  Parts/Tools     Estimate/Auth   Repair Jobs/QC
   |             |               |               |
   +-------------+---------------+---------------+
                         |
                         v
              Outcome and learning evidence
```

### Source-of-truth boundaries

| Information | Authoritative domain | Diagnostics usage |
| --- | --- | --- |
| Vehicle identity/configuration | Vehicle Registry / Vehicle 360 | Read configuration; never fork identity. |
| Customer words and custody | Service Visit / Repair Order | Preserve immutable concern snapshot and context. |
| Diagnostic case and concern streams | Diagnostics | Create, route, reason, and close. |
| Files, images, waveforms, documents | Vehicle Evidence | Link governed evidence objects to diagnostic subjects. |
| Hypotheses, tests, results, confidence | Diagnostics | Own structured and versioned reasoning records. |
| Published diagnosis | Repair Order via versioned diagnosis | Diagnostics publishes a controlled summary with lineage. |
| Estimate and customer decision | Estimate / Authorization | Consume recommendation; retain financial authority elsewhere. |
| Technician, bay, schedule, capacity | Tasks / Appointments / Dispatch | Request eligible resources and consume confirmed allocation. |
| Parts availability and custody | Parts Operations / Inventory | Request demand/readiness; never mutate balances directly. |
| Repair execution and QC | Repair Job / Quality | Receive verification evidence and outcome. |
| Cross-domain activity/audit | Shared platform | Emit correlated events and immutable command evidence. |

## 4. Diagnostic Case Lifecycle

```text
DRAFT
  -> TRIAGE
  -> TEST_PLAN_READY
  -> TESTING
  -> CAUSE_PROPOSED
  -> CONFIRMATION_REQUIRED
  -> CONFIRMED
  -> REPAIR_PLANNING
  -> HANDED_OFF
  -> POST_REPAIR_VERIFICATION
  -> VERIFIED_CLOSED
```

Controlled alternate states:

- `WAITING_FOR_VEHICLE`, `WAITING_FOR_AUTHORIZATION`, `WAITING_FOR_TOOL`, `WAITING_FOR_INFORMATION`, `WAITING_FOR_PART`, `ESCALATED`;
- `INCONCLUSIVE` when available evidence cannot support a conclusion;
- `NO_FAULT_FOUND` only after the approved reproduction and verification protocol;
- `ABANDONED` only with authorized reason and preserved evidence;
- `REOPENED` when the concern recurs, QC fails, or new contradictory evidence appears.

Lifecycle invariants:

- every active case belongs to one organization, location, vehicle, repair order, and accountable owner;
- one repair order may have multiple concern-specific diagnostic cases;
- the original customer concern is never overwritten by technician interpretation;
- a confirmed cause requires the applicable confirmation policy, sufficient evidence, qualified actor, and no unresolved hard contradiction;
- a recommendation cannot become authorized repair work without Estimate and Authorization domain decisions;
- closure requires a verification result tied to the original concern and confirmed-cause version;
- every meaningful transition uses optimistic concurrency, idempotency where replay is possible, reason codes, actor identity, and an event.

## 5. Core Domain Model

The exact Prisma design is a milestone decision. The conceptual model is fixed enough to prevent unsafe shortcuts.

| Aggregate/entity | Responsibility and key invariants |
| --- | --- |
| `DiagnosticCase` | Root lifecycle, owner, priority, risk class, vehicle/RO link, current published versions, status, version. |
| `DiagnosticConcern` | One preserved concern, reproduction conditions, severity, customer impact, and acceptance criteria. |
| `DiagnosticObservation` | Technician or system observation with source, time, vehicle state, reliability, and fact classification. |
| `DiagnosticMeasurement` | Value, unit, expected range, tolerance source, conditions, instrument, calibration context, and result quality. |
| `DiagnosticEvidenceLink` | Links governed Vehicle Evidence to case, concern, hypothesis, test execution, conclusion, or verification. |
| `DiagnosticHypothesis` | Candidate failure mode, applicability, supporting/contradicting evidence, status, and ranked confidence—not a fact. |
| `DiagnosticTestDefinitionVersion` | Governed reusable test with prerequisites, safety, steps, input fields, expected outcomes, interpretation, time, and applicability. |
| `DiagnosticTestPlanVersion` | Ordered case-specific test nodes, dependencies, branching, rationale, estimated time/cost/risk, and source versions. |
| `DiagnosticTestExecution` | Actual performer, timestamps, environment, instrument, result, evidence, deviations, and quality status. |
| `DiagnosticReasoningEvaluation` | Immutable engine evaluation: candidate set, exclusions, weights/probabilities, hard rules, missing inputs, recommendation, and algorithm version. |
| `DiagnosticConclusionVersion` | Proposed or confirmed cause, evidence chain, contradiction state, uncertainty, qualified confirmer, and supersession. |
| `RepairRecommendationVersion` | Proposed correction, required operations, parts, skills, certifications, bay/tools, procedures, risks, and verification plan. |
| `DiagnosticVerificationPlanVersion` | Concern-specific post-repair checks, expected results, environment, road-test limits, and acceptance thresholds. |
| `DiagnosticVerificationExecution` | Actual result, evidence, deviations, pass/fail/inconclusive state, and qualified reviewer. |
| `DiagnosticSafetyGate` | Applicable hazard, prerequisite, capability, PPE/isolation requirement, satisfaction evidence, and non-waivable/override rule. |
| `DiagnosticOverride` | Authorized disagreement or exception with reason, scope, evidence, expiration, and reviewer. |
| `DiagnosticOutcome` | Confirmed cause, repair performed, verified result, recurrence/comeback linkage, time, parts, and attribution facts. |
| `DiagnosticKnowledgeSourceVersion` | Source identity, rights, revision, effective dates, jurisdiction/market, applicability, checksum, and review state. |
| `DiagnosticRuleSetVersion` | Immutable rules/calculations/graphs with owner, tests, approval, rollout state, and rollback predecessor. |

### Fact classification

Every material item must be labeled as one of:

- `CUSTOMER_REPORTED`;
- `OBSERVED`;
- `MEASURED`;
- `IMPORTED`;
- `CALCULATED`;
- `INFERRED`;
- `PROPOSED`;
- `CONFIRMED`;
- `SUPERSEDED`.

Generated or inferred content cannot silently become `OBSERVED`, `MEASURED`, or `CONFIRMED`.

## 6. Engine Architecture

### 6.1 Standard reasoning pipeline

```text
Case context and vehicle applicability
  -> data sufficiency and quality checks
  -> safety and authorization gates
  -> candidate failure-mode generation
  -> contradiction and exclusion evaluation
  -> confidence update
  -> next-test candidate generation
  -> test eligibility and prerequisite filtering
  -> value/risk/time/cost ranking
  -> explanation and abstention decision
  -> qualified human action
  -> immutable result and outcome correlation
```

### 6.2 Engine components

| Component | Role |
| --- | --- |
| Applicability resolver | Matches VIN/configuration, market, powertrain, equipment, calibration, and effective date to valid knowledge. |
| Data-quality evaluator | Detects missing, stale, conflicting, wrong-unit, implausible, low-reliability, or improperly collected evidence. |
| Safety gate evaluator | Enforces hazards, prerequisites, qualifications, lockout/isolation, and prohibited actions. |
| Failure-mode graph | Relates symptoms, systems, components, causal mechanisms, tests, and corrections. |
| Deterministic rule evaluator | Executes versioned predicates, decision paths, constraints, and reason codes. |
| Engineering calculation library | Performs unit-safe electrical, mechanical, thermal, pressure, flow, tolerance, and time calculations. |
| Confidence evaluator | Updates ranked hypotheses from evidence quality and likelihood while exposing uncertainty and assumptions. |
| Next-test optimizer | Ranks eligible tests by expected uncertainty reduction, safety, time, cost, invasiveness, resource readiness, and downstream value. |
| Contradiction detector | Flags evidence that conflicts with a hypothesis, conclusion, vehicle configuration, or source specification. |
| Conclusion gate | Determines whether cause confirmation criteria are satisfied or the engine must abstain. |
| Repair-plan composer | Produces structured candidate operations and resource requirements without authorizing work. |
| Verification evaluator | Compares post-repair evidence against concern-specific acceptance criteria and recurrence risk. |
| Outcome attribution | Correlates recommendations, human decisions, work performed, verification, and comeback results. |

Algorithm selection and precedence must follow the official catalog. In particular, applicability, safety, direct evidence, deterministic engineering constraints, and consistency/causal results precede probabilistic, case-frequency, machine-learned, and generative ranking.

### 6.3 Next-test ranking baseline

After applicability, safety, authorization, qualification, prerequisite, and resource gates, an approved version may rank tests using normalized factors:

```text
Diagnostic Test Value =
    expected information gain
  + safety/risk-reduction value
  + downstream unblocking value
  + evidence reliability
  - expected technician time
  - customer/shop cost
  - invasiveness and vehicle risk
  - setup and resource delay
```

Weights are policy versions, not hidden constants. Hard gates are never converted into score penalties. A lower-ranked test remains selectable by an authorized technician with a recorded rationale.

### 6.4 Confidence and abstention

Confidence must reflect evidence quality, source authority, vehicle applicability, conflicts, candidate coverage, and model/rule support. It must not imply statistical precision unless calibrated data supports that interpretation.

The engine abstains when:

- vehicle configuration or source applicability is unresolved;
- mandatory safety or prerequisite data is missing;
- material evidence conflicts without resolution;
- no approved test path applies;
- confirmation thresholds are not satisfied;
- the relevant rule/source version is expired, withdrawn, or unavailable.

## 7. Knowledge and Data Architecture

### Knowledge classes

1. **Engineering primitives:** units, formulas, physical relationships, circuit/network logic, failure mechanisms.
2. **Vehicle/system topology:** systems, components, connectors, modules, networks, dependencies, and configuration.
3. **Service knowledge:** specifications, procedures, wiring, bulletins, recalls, calibrations, and test interpretations.
4. **Shop knowledge:** approved local procedures, tooling, capability, known failure patterns, and escalation paths.
5. **Case outcomes:** de-identified or appropriately governed prior evidence and verified results.

### Provenance contract

Every knowledge item used in a recommendation must retain:

- source owner and source type;
- license/usage classification;
- document and revision identity;
- applicable year/make/model/engine/equipment/market range;
- effective and expiration/withdrawal dates;
- retrieval/import time and checksum;
- reviewer and approval state;
- exact excerpt/field reference where permitted;
- supersession and recall path.

National, OEM, regulator, standards, vendor, and commercial service data must pass rights and licensing review before ingestion or redistribution. Public accessibility alone does not establish reuse rights.

### Knowledge release states

`DRAFT -> REVIEW -> APPROVED -> SHADOW -> ACTIVE -> SUSPENDED -> RETIRED`

Safety-critical knowledge requires qualified independent review. Active case evaluations preserve the exact versions used even after retirement.

## 8. Service and Command Architecture

### Domain services

- `DiagnosticCaseService`
- `DiagnosticConcernService`
- `DiagnosticEvidenceService`
- `DiagnosticHypothesisService`
- `DiagnosticTestPlanService`
- `DiagnosticTestExecutionService`
- `DiagnosticReasoningService`
- `DiagnosticConclusionService`
- `DiagnosticRepairRecommendationService`
- `DiagnosticVerificationService`
- `DiagnosticKnowledgeService`
- `DiagnosticRuleAdministrationService`
- `DiagnosticOutcomeService`
- `DiagnosticCaseReadService`
- `DiagnosticQueueReadService`

### Important commands

- Create diagnostic case from repair-order concern
- Assign or reassign diagnostic owner
- Record observation or measurement
- Attach governed evidence
- Add, reject, or reactivate hypothesis
- Generate or revise test plan
- Start, pause, complete, or invalidate test execution
- Evaluate reasoning
- Propose cause
- Confirm, reject, or supersede conclusion
- Publish repair recommendation and `RepairDiagnosisVersion`
- Request resource/parts readiness
- Create estimate draft input or linked task/job proposal
- Create verification plan
- Record verification and close/reopen case
- Record override, escalation, or abstention
- Activate, suspend, or retire approved knowledge/rule version

Meaningful commands require server-side policy, validation, current expected version, reason when material, idempotency identity when replayable, atomic domain/event/audit writes, and safe conflict recovery.

### Read models

- Diagnostics command center queue
- My diagnostic work
- Diagnostic case header and timeline
- Concern/reproduction workspace
- Evidence and measurement matrix
- Hypothesis comparison board
- Guided test plan and live execution
- Reasoning explanation and contradiction view
- Conclusion and repair handoff preview
- Verification/QC view
- Knowledge/rule administration
- Quality, calibration, and outcome dashboard

## 9. Integration Contracts

| Integration | Contract |
| --- | --- |
| Repair Order | Case begins from a canonical concern/RO. Published diagnosis references exact case, conclusion, evidence, and rule versions. |
| Vehicle 360 | Diagnostics reads configuration/timeline and links governed evidence; vehicle corrections remain vehicle commands. |
| Tasks | Diagnostic steps may create/link accountable tasks but remain diagnostic test executions when engineering evidence is required. |
| Appointments/Dispatch | Diagnostics supplies skill, certification, duration range, bay/tool, risk, and readiness requirements; scheduling owns allocation. |
| Parts | Diagnostics creates proposed demand/readiness queries; parts purchasing or reservation requires existing authority. |
| Estimate/Authorization | Recommendation creates structured estimate input; customer/internal approval remains authoritative. |
| Repair Jobs | Authorized jobs reference the published diagnosis version and approved procedure/resource requirements. |
| QC/Comeback | Verification consumes repair evidence; failed verification or recurrence reopens/links cases without erasing prior closure. |
| Manager Review | High-risk, low-confidence, override, contradiction, stale-source, or failed-verification cases produce explainable review items. |
| Activity/Audit/Event Outbox | All material cross-domain changes carry correlation, causation, actor, policy/rule version, and source identifiers. |

Cross-domain calls should initially be in-process service contracts within a transaction where ownership permits. Use outbox-driven eventual consistency for notifications, projections, analytics, and future external adapters.

## 10. API Direction

Exact route names remain implementation decisions, but capability boundaries should resemble:

```text
GET    /api/diagnostics/cases
POST   /api/diagnostics/cases
GET    /api/diagnostics/cases/:id
POST   /api/diagnostics/cases/:id/assign
POST   /api/diagnostics/cases/:id/observations
POST   /api/diagnostics/cases/:id/measurements
POST   /api/diagnostics/cases/:id/evidence
POST   /api/diagnostics/cases/:id/hypotheses
POST   /api/diagnostics/cases/:id/test-plans
POST   /api/diagnostics/test-executions/:id/start
POST   /api/diagnostics/test-executions/:id/complete
POST   /api/diagnostics/cases/:id/evaluate
POST   /api/diagnostics/cases/:id/propose-conclusion
POST   /api/diagnostics/cases/:id/confirm-conclusion
POST   /api/diagnostics/cases/:id/publish-recommendation
POST   /api/diagnostics/cases/:id/verification-plans
POST   /api/diagnostics/cases/:id/verify
POST   /api/diagnostics/cases/:id/reopen
GET    /api/diagnostics/knowledge
POST   /api/diagnostics/knowledge/:id/transition
```

No unrestricted generic patch endpoint should bypass lifecycle commands.

## 11. Permissions, Safety, and Governance

Initial capabilities:

- `DIAGNOSTIC_CASE_VIEW`
- `DIAGNOSTIC_CASE_CREATE`
- `DIAGNOSTIC_CASE_ASSIGN`
- `DIAGNOSTIC_EVIDENCE_RECORD`
- `DIAGNOSTIC_TEST_EXECUTE`
- `DIAGNOSTIC_CONCLUSION_PROPOSE`
- `DIAGNOSTIC_CONCLUSION_CONFIRM`
- `DIAGNOSTIC_HIGH_RISK_CONFIRM`
- `DIAGNOSTIC_OVERRIDE_CREATE`
- `DIAGNOSTIC_RECOMMENDATION_PUBLISH`
- `DIAGNOSTIC_VERIFICATION_EXECUTE`
- `DIAGNOSTIC_VERIFICATION_REVIEW`
- `DIAGNOSTIC_KNOWLEDGE_AUTHOR`
- `DIAGNOSTIC_KNOWLEDGE_APPROVE`
- `DIAGNOSTIC_RULE_ACTIVATE`
- `DIAGNOSTIC_AUDIT_VIEW`

Safety domains—including high voltage, restraint, brake, steering, fuel, lifting, ADAS, programming, immobilizer, emissions, and road testing—can require stronger qualifications, independent review, non-waivable prerequisites, and location/equipment readiness.

The same person must not author and independently approve a safety-critical knowledge release where separation of duties is configured.

## 12. UI Architecture

### `/diagnostics` command center

- queue by state, risk, owner, age, promise, blocker, and confidence;
- prioritized next action with explicit reason;
- safety, stale-source, contradiction, and review-needed signals;
- manager load/capability view without reducing technicians to a simplistic score;
- fast entry into the active concern and test.

### `/diagnostics/cases/[caseId]` workspace

1. Case header: vehicle, RO, concern, owner, status, risk, time, and source freshness.
2. Concern and reproduction conditions.
3. Evidence/measurement timeline.
4. Hypothesis comparison with support and contradiction.
5. Guided test plan with prerequisites and branching.
6. Live test execution optimized for shop/mobile use.
7. Reasoning explanation and missing inputs.
8. Conclusion, repair recommendation, and governed publish action.
9. Verification and closure.
10. Audit/version history.

The workspace launches the shared-context Systems Explorer, Scan Lab, Live Data Lab, Electrical Lab, Waveform Lab, Mechanical Systems Lab, Intermittent Investigator, Expert Case Conference, and Verification Lab defined by [`DIAGNOSTIC_TOOL_AND_LAB_SUITE.md`](DIAGNOSTIC_TOOL_AND_LAB_SUITE.md).

The Repair Order Workbench links directly to the case and shows a permission-filtered diagnostic summary. It does not duplicate the full reasoning workspace.

## 13. Security and Privacy

- Organization and location scope are enforced at repository/service boundaries.
- Field and evidence visibility is capability-filtered before client delivery.
- Attachments use the existing evidence malware, retention, access, and access-log controls.
- Secrets and external service credentials are referenced through approved secret storage, never diagnostic records.
- Sensitive immobilizer/security, customer, employee, and proprietary service data use least privilege.
- Exports and bulk knowledge ingestion are authorized, audited, rate-limited, and reversible where possible.
- Logs do not contain unrestricted VIN/customer/service-document content.

## 14. Reliability, Performance, and Observability

Initial service objectives, to be validated during the pilot:

| Area | Target direction |
| --- | --- |
| Case read availability | 99.9% during operating hours after production hardening. |
| Command integrity | No acknowledged partial domain/event/audit transaction. |
| Duplicate safety | Replayable creates and cross-domain publishes are idempotent. |
| Common case read | p95 under 1.5 seconds on approved shop hardware/network. |
| Deterministic evaluation | p95 under 2 seconds for the initial no-start ruleset. |
| Evidence durability | No silent evidence loss; checksums and immutable lineage retained. |
| Recovery | Point-in-time database recovery and rehearsed rollback for rule/schema releases. |
| Degraded mode | Existing cases and approved procedures remain readable when optional AI/external sources fail. |

Required telemetry includes command success/conflict/failure, lifecycle dwell time, abstention, safety blocks, rule/source version usage, test recommendation acceptance/override, time-to-confirmation, verification failure, comeback correlation, latency, queue depth, and data-quality failures.

Each rule and automation release has an owner, health view, alert thresholds, kill switch, predecessor, and rollback/runbook.

## 15. AI Architecture — Final Assistance Layer

AI is introduced only after source-authorized retrieval, structured cases, deterministic gates, evaluation datasets, and outcome measurement exist.

```text
User request
  -> permission-filtered case context
  -> authorized retrieval with source/version citations
  -> AI gateway with model/prompt/tool policy version
  -> structured draft or recommendation
  -> deterministic validation and safety screening
  -> qualified human confirmation
  -> canonical command and audit record
```

Initially permitted:

- structure technician dictation into a draft observation;
- summarize a case with citations;
- identify missing or contradictory evidence;
- explain an approved test or engineering concept;
- retrieve similar verified cases;
- draft hypotheses, test-plan changes, repair explanations, and customer language for review.

Prohibited without an authorized human decision:

- confirming a cause;
- bypassing a safety gate;
- authorizing work, price, parts purchase, dispatch, vehicle release, or customer promise;
- converting generated text into measured or observed evidence;
- changing active rules, thresholds, or knowledge;
- concealing uncertainty or inventing sources.

## 16. Target Repository Boundaries

```text
src/
  app/
    (app)/diagnostics/
    api/diagnostics/
  features/
    diagnostics/
      command-center/
      case-workspace/
      evidence/
      hypotheses/
      test-plans/
      verification/
      knowledge-admin/
  server/
    diagnostics/
      domain/
      services/
      repositories/
      policies/
      validation/
      reasoning/
      calculations/
      knowledge/
      read-models/
  tests/
    unit/diagnostics-*.test.ts
    integration/diagnostics-*.test.ts
    e2e/diagnostics-*.spec.ts
```

Domain logic must not live only in React components, route handlers, database JSON, or model prompts.

## 17. Enterprise Acceptance Gate

The architecture is ready for broad production only when evidence proves:

- canonical-domain reuse and no parallel repair/vehicle records;
- complete case lifecycle and reliable version history;
- server-enforced permissions, safety, applicability, and conclusion gates;
- deterministic no-start scenarios including normal, conflict, degraded, and unsafe paths;
- source provenance and licensing controls;
- repair/dispatch/parts/estimate/QC handoffs with replay and rollback safety;
- calibrated operational measures and anti-gaming controls;
- accessibility, mobile shop usability, performance, backup, recovery, and monitoring;
- shadow and limited-pilot results meeting approved thresholds;
- AI remains optional and cannot weaken deterministic or human controls.
