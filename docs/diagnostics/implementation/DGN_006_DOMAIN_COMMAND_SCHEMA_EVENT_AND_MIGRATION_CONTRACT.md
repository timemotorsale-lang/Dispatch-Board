# DGN-006 — Domain, Command, Schema, Event, and Migration Contract

**Milestone:** `DGN-006`  
**Status:** Complete — implementation contract; no runtime schema or behavior  
**Date:** 2026-07-20  
**Gate contribution:** `DG-G0`

## 1. Decision

Diagnostics will be an independent bounded context and console inside the existing modular monolith. It will use the existing PostgreSQL/Prisma persistence, enterprise command ledger, aggregate-version concurrency, audit, domain-event, and outbox foundations. It will not become a second Repair Order system and will not directly mutate Dispatch, Parts, Estimate, Authorization, or Repair Job authority.

The exact domain identifiers are:

| Contract item | Value |
| --- | --- |
| Domain code | `DIAGNOSTICS` |
| Primary aggregate type | `DIAGNOSTIC_CASE` |
| Primary aggregate ID | `DiagnosticCase.id` |
| Cross-domain publication owner | `SHOP_OPERATIONS` / `REPAIR_ORDER` |
| Canonical published diagnosis | `RepairDiagnosisVersion` |
| Integration pattern | governed command bridge with explicit publication lineage |

These are target contracts for later milestones. Their appearance in this document does not mean the corresponding enum, model, command, route, or feature flag exists at runtime.

## 2. Aggregate Boundary and Invariants

`DiagnosticCase` is the consistency boundary for one diagnostic concern. One Repair Order may have several cases. A case must reference one organization, one location, one vehicle, one Repair Order, and one canonical concern reference or version.

The aggregate must enforce:

1. tenant, location, vehicle, Repair Order, and concern identity cannot be crossed or silently changed;
2. case sequence and state changes are monotonic and concurrency checked;
3. facts, observations, tests, hypotheses, conclusions, recommendations, and verification records are versioned or append-only;
4. correction means supersession with authorship and reason, never destructive rewrite;
5. evidence used by a conclusion must be explicitly linked and reproducible;
6. a confirmed cause requires the authority and risk gates from DGN-002;
7. an inconclusive or no-fault-found outcome is valid and must not be coerced into a part recommendation;
8. publication is prohibited until concern, conclusion, recommendation, uncertainty, evidence lineage, and required verification plan are complete;
9. a publication can supersede only a publication for the same diagnostic case;
10. cross-domain commands must be idempotent and auditable.

## 3. Lifecycle Contract

The target `DiagnosticCaseStatus` values are:

- `DRAFT`, `TRIAGE`, `TEST_PLAN_READY`, `TESTING`, `CAUSE_PROPOSED`, `CONFIRMATION_REQUIRED`, `CONFIRMED`, `REPAIR_PLANNING`, `HANDED_OFF`, `POST_REPAIR_VERIFICATION`, `VERIFIED_CLOSED`;
- waiting states: `WAITING_FOR_VEHICLE`, `WAITING_FOR_AUTHORIZATION`, `WAITING_FOR_TOOL`, `WAITING_FOR_INFORMATION`, `WAITING_FOR_PART`;
- exception states: `ESCALATED`, `INCONCLUSIVE`, `NO_FAULT_FOUND`, `ABANDONED`, `REOPENED`.

Waiting and exception states require a reason code. Returning from a waiting state requires a recorded resolution. `VERIFIED_CLOSED` is terminal unless an authorized reopen command records the failed prediction, recurrence, or new evidence.

Supporting target vocabularies include:

| Vocabulary | Required values or purpose |
| --- | --- |
| Fact class | reported symptom, observed fact, measured fact, inferred fact, source fact, assumption |
| Observation quality | unverified, plausible, verified, contradicted, invalidated |
| Hypothesis state | candidate, supported, contradicted, eliminated, leading, proposed cause, confirmed cause, superseded |
| Test execution state | planned, ready, blocked, running, paused, completed, invalidated, cancelled |
| Conclusion state | draft, proposed, confirmation required, confirmed, rejected, superseded, abstained |
| Verification outcome | not run, pass, fail, inconclusive, unsafe, waived by policy where permitted |
| Publication state | not eligible, eligible, publishing, published, failed, superseded |
| Risk tier | `R0` through `R4` as defined by DGN-002 |

## 4. Staged Persistence Contract

No milestone may create the entire future schema in one migration. Models are introduced only when their owning vertical slice implements and tests them.

### Stage A — case core (`DGN-007`–`DGN-009`)

- `DiagnosticCase`: identity, organization/location/vehicle/Repair Order/concern linkage, owner, status, risk tier, current version, timestamps.
- `DiagnosticConcernVersion`: immutable normalized concern statement, operating conditions, provenance, author, and supersession.
- `DiagnosticCaseStateEvent`: immutable transition, prior/next state, reason, actor, aggregate version, correlation, and time.

### Stage B — observations and evidence (`DGN-013`–`DGN-014`)

- `DiagnosticObservation`: fact class, statement/value, operating conditions, source, quality, author, correction lineage.
- `DiagnosticMeasurement`: quantity, unit, normalized value/unit, tolerance/reference, tool, setup, conditions, quality, and supersession.
- `DiagnosticEvidenceLink`: explicit link from governed Vehicle Evidence to a case entity and purpose; evidence bytes remain under Vehicle Evidence authority.

### Stage C — test definitions, plans, and execution (`DGN-015`–`DGN-016`)

- `DiagnosticTestDefinitionVersion`: immutable procedure semantics, applicability, qualifications, hazards, prerequisites, branches, required evidence, sources, and checksum.
- `DiagnosticTestPlanVersion` and `DiagnosticTestPlanNode`: case-specific versioned plan and graph.
- `DiagnosticTestExecution`: append-only execution lifecycle, selected definition version, deviations, inputs, results, evidence, actor, and timestamps.

### Stage D — reasoning, conclusion, and verification (`DGN-022`–`DGN-026`)

- `DiagnosticHypothesis` and `DiagnosticHypothesisEvidence`: hypothesis state plus explicit support, contradiction, assumption, and retraction lineage.
- `DiagnosticReasoningEvaluation`: engine/policy/knowledge versions, deterministic inputs, outputs, conflict sets, candidate tests, reason codes, and checksum.
- `DiagnosticConclusionVersion`: immutable cause statement, uncertainty, evidence basis, contradictions, limitations, author/signoff, and supersession.
- `DiagnosticRecommendationVersion`: proposed correction and operational requirements without authorization or job creation.
- `DiagnosticVerificationPlanVersion`: predictions, acceptance criteria, safety constraints, evidence requirements, and independent review requirement.

### Stage E — cross-domain publication (`DGN-028`)

- `DiagnosticPublication`: explicit one-to-one lineage from the published `RepairDiagnosisVersion` to the case, concern version, conclusion version, recommendation version, and verification-plan version. It also records publication version, status, correlation ID, command/idempotency metadata, author, timestamps, and `supersedesPublicationId`.

Every table uses explicit organization scoping, restrictive foreign keys for governed evidence, indexes for queue and lineage reads, and UTC timestamps. JSON is allowed for immutable payload envelopes and extensible measurement metadata, but not as a substitute for identity, authority, or required lineage relations.

## 5. Publishing and Supersession Decision

The existing `RepairDiagnosisVersion` remains the canonical Repair Order diagnosis. Diagnostics publishes through the existing `RECORD_DIAGNOSIS_VERSION` enterprise workflow, extended in DGN-028 to accept a validated Diagnostics publication request.

The dedicated `DiagnosticPublication` link is authoritative for case lineage. Its `repairDiagnosisVersionId` is unique. `supersedesPublicationId`, when present, must belong to the same `diagnosticCaseId`; the corresponding `RepairDiagnosisVersion.supersedesId` must point to that prior publication's repair diagnosis version.

This corrects the current repository behavior that selects the latest diagnosis across the entire Repair Order. A new case must not supersede an unrelated case merely because both belong to the same Repair Order. The Repair Order's integer diagnosis version remains globally sequential for display and audit; semantic supersession remains case-specific.

Publication is one database transaction because both contexts currently share the same database. It must atomically commit the Shop Operations command, Repair Order aggregate version, `RepairDiagnosisVersion`, `DiagnosticPublication`, audit record, domain events, and outbox messages. No direct repository call across contexts and no dual write are permitted.

## 6. Command Catalog

All commands require organization, actor, correlation ID, idempotency key, expected aggregate version, payload schema version, and server-derived authorization context.

| Command family | Commands introduced by owning milestone |
| --- | --- |
| Case | `CREATE_DIAGNOSTIC_CASE`, `ASSIGN_DIAGNOSTIC_CASE`, `TRANSITION_DIAGNOSTIC_CASE`, `ESCALATE_DIAGNOSTIC_CASE`, `REOPEN_DIAGNOSTIC_CASE`, `ABANDON_DIAGNOSTIC_CASE` |
| Concern/evidence | `REVISE_DIAGNOSTIC_CONCERN`, `RECORD_DIAGNOSTIC_OBSERVATION`, `RECORD_DIAGNOSTIC_MEASUREMENT`, `CORRECT_DIAGNOSTIC_FACT`, `LINK_DIAGNOSTIC_EVIDENCE` |
| Test plan/execution | `CREATE_DIAGNOSTIC_TEST_PLAN`, `REVISE_DIAGNOSTIC_TEST_PLAN`, `START_DIAGNOSTIC_TEST`, `PAUSE_DIAGNOSTIC_TEST`, `RESUME_DIAGNOSTIC_TEST`, `COMPLETE_DIAGNOSTIC_TEST`, `INVALIDATE_DIAGNOSTIC_TEST` |
| Reasoning | `EVALUATE_DIAGNOSTIC_CASE`, `RECORD_DIAGNOSTIC_HYPOTHESIS`, `CHANGE_HYPOTHESIS_STATE`, `RECORD_DIAGNOSTIC_OVERRIDE` |
| Conclusion | `PROPOSE_DIAGNOSTIC_CONCLUSION`, `CONFIRM_DIAGNOSTIC_CONCLUSION`, `REJECT_DIAGNOSTIC_CONCLUSION`, `SUPERSEDE_DIAGNOSTIC_CONCLUSION`, `ABSTAIN_DIAGNOSTIC_CONCLUSION` |
| Handoff/closure | `PUBLISH_DIAGNOSTIC_CONCLUSION`, `CREATE_DIAGNOSTIC_VERIFICATION_PLAN`, `RECORD_DIAGNOSTIC_VERIFICATION`, `REVIEW_DIAGNOSTIC_VERIFICATION`, `CLOSE_DIAGNOSTIC_CASE` |

There is no generic update or patch command for the aggregate.

## 7. Domain Events

Events use past tense and contain IDs plus stable reason codes, not licensed knowledge content or unrestricted notes. Required families include:

- `DiagnosticCaseCreated`, `DiagnosticCaseAssigned`, `DiagnosticCaseStatusChanged`, `DiagnosticCaseEscalated`, `DiagnosticCaseReopened`, `DiagnosticCaseAbandoned`;
- `DiagnosticConcernRevised`, `DiagnosticObservationRecorded`, `DiagnosticMeasurementRecorded`, `DiagnosticFactCorrected`, `DiagnosticEvidenceLinked`;
- `DiagnosticTestPlanCreated`, `DiagnosticTestPlanRevised`, `DiagnosticTestStarted`, `DiagnosticTestPaused`, `DiagnosticTestCompleted`, `DiagnosticTestInvalidated`;
- `DiagnosticHypothesisRecorded`, `DiagnosticHypothesisStateChanged`, `DiagnosticReasoningEvaluated`, `DiagnosticOverrideRecorded`;
- `DiagnosticConclusionProposed`, `DiagnosticConclusionConfirmed`, `DiagnosticConclusionRejected`, `DiagnosticConclusionSuperseded`, `DiagnosticConclusionAbstained`;
- `DiagnosticConclusionPublished`, `DiagnosticPublicationFailed`, `DiagnosticVerificationRecorded`, `DiagnosticVerificationReviewed`, `DiagnosticCaseClosed`.

Event consumers must be replay safe. Domain events are integration facts, not permission to mutate another authority without its command validation.

## 8. Reason-Code Namespaces

Reason codes are append-only registered constants with descriptions and owners. Initial namespaces are:

| Namespace | Examples |
| --- | --- |
| `CASE_*` | duplicate concern, vehicle unavailable, ownership transfer, reopened recurrence |
| `AUTH_*` | capability denied, qualification missing, separation-of-duty conflict |
| `SAFETY_*` | prerequisite missing, hazard uncontrolled, R3 review required, R4 prohibited |
| `DATA_*` | unit invalid, setup unverified, stale, implausible, conflicting, source unavailable |
| `TEST_*` | prerequisite unmet, tool unavailable, deviation, invalidated result |
| `REASONING_*` | insufficient support, contradiction unresolved, bounded search, abstention required |
| `SOURCE_*` | rights hold, applicability unknown, source expired, source withdrawn |
| `PUBLISH_*` | conclusion unconfirmed, lineage incomplete, stale case, repair-order conflict |
| `VERIFY_*` | prediction failed, result inconclusive, unsafe to execute, independent review required |

Free text may add context but cannot replace the required stable code.

## 9. Concurrency, Replay, and Failure Rules

- Every case command compares `expectedAggregateVersion` and increments once per successful commit.
- Repair Order publication also compares the expected Repair Order aggregate version. A stale conflict returns the current version and performs no partial write.
- Idempotency uniqueness is scoped to organization, command type, and idempotency key; reuse with a different request hash is rejected.
- Case-local immutable versions use a unique case/version constraint. Repair diagnosis versions retain unique Repair Order/version.
- A timed-out client may safely replay the same command and receive the committed result.
- Failed outbox delivery does not roll back committed domain state; retry is bounded and observable.
- Projection lag is shown as stale/unavailable and never silently represented as current.

## 10. Algorithm, Consistency, and Lab Contracts

The algorithm catalog remains a governed registry, not one monolithic engine. Each executable algorithm version must declare:

- identifier, semantic version, owner, purpose, inputs, outputs, unit schema, applicability, risk tier, source dependencies, deterministic/non-deterministic classification, precedence, resource bounds, and predecessor;
- verification corpus, expected abstentions, failure modes, checksum, release approval, suspension/withdrawal state, and rollback target;
- explanation codes and the exact knowledge, policy, calculation, and adapter versions used.

Hard policy, safety, source-rights, applicability, and measurement-validity gates run before scoring or ranking. Deterministic constraint/consistency evaluation precedes heuristic ranking. AI output, when eventually introduced, cannot override a hard gate or silently become a fact.

Minimal consistency examples required before DGN-023 activation include single fault, independent multiple faults, common-cause fault, intermittent retraction, contradictory evidence, invalid measurement, wrong vehicle configuration, resource-bounded search, and no consistent diagnosis/abstention.

Two normative examples establish precedence:

1. If a starter receives valid command and loaded supply at its terminals, current is abnormal, and mechanical rotation is absent, a starter/mechanical candidate may rise. If the ground-path measurement is later invalidated because the probe reference was wrong, every inference dependent on that measurement retracts and ranking is replayed; the historical evaluation remains immutable.
2. If several modules are offline and the starting request is absent, independent module failures may be logically compatible, but a shared power/ground/gateway cause that predicts the observed topology must remain a bounded common-cause candidate. A popularity score cannot eliminate it, and unsupported source applicability forces abstention.

Lab adapters use a shared case context and a versioned evidence envelope. The envelope identifies case, concern, planned/executed test, vehicle configuration, tool/adapter, capture time, units, operating conditions, raw evidence reference, transformations, quality, author, and checksum. Adapters may normalize data but may not erase raw provenance or invent unsupported values.

## 11. Capability and Rollout Contract

DGN-002 capability codes are persisted using the existing organization/location/user grant pattern, generalized for enterprise domains instead of coupling Diagnostics to a vehicle-console name. Runtime implementation must provide deny precedence, validity windows, constraints, audit, and server-side evaluation.

Target rollout codes are:

- `DIAGNOSTICS_MASTER`, `DIAGNOSTIC_CASES`, `DIAGNOSTIC_EVIDENCE`, `DIAGNOSTIC_REASONING`, `DIAGNOSTIC_PUBLISHING`, `DIAGNOSTIC_KNOWLEDGE`, `DIAGNOSTIC_AI`.

Modes are `OFF`, `SHADOW`, `PILOT`, and `GENERAL`. New flags seed `OFF`. The master flag and the specific capability flag must both permit an operation. `DIAGNOSTIC_AI` remains `OFF` through the deterministic day-one release.

## 12. API and Module Direction

The target module boundary is `src/server/diagnostics` with domain, application, infrastructure, policy, and projection layers. UI routes are `/diagnostics` and `/diagnostics/cases/[caseId]`. Command endpoints are purpose-specific; read endpoints use permission-filtered projections. Shared packages may contain identifiers, units, evidence envelopes, and event contracts but not cross-domain business-rule duplication.

Repository methods never substitute for command authorization. UI visibility is not a security control.

## 13. Migration and Rollback Plan

1. Add only the Stage A schema in DGN-007; validate and rehearse forward/rollback behavior before activation.
2. Seed capability, reason-code, and feature-flag definitions with Diagnostics flags `OFF`.
3. Do not fabricate Diagnostic Cases for legacy `RepairDiagnosisVersion` rows. They remain valid and are labeled `LEGACY_SHOP_PLANNING` in projections where provenance is required.
4. Introduce later schema stages additively in their owning milestones; no destructive rename/drop is part of the initial path.
5. Do not dual-write legacy and new case state. Cross-domain publication occurs only through the atomic bridge in DGN-028.
6. During rollout, reads may reconcile new projections with legacy diagnoses, but must show provenance and unavailable states honestly.
7. Operational rollback disables the affected flag and commands while retaining committed rows and audit evidence. Schema rollback scripts are for rehearsal/non-production recovery, not routine erasure of production evidence.
8. Any future destructive cleanup requires a separate retention, export, backup, and approval milestone.

## 14. Threat and Failure Review

| Threat/failure | Required response |
| --- | --- |
| Cross-tenant or cross-location identifier substitution | Authorize every referenced aggregate in the same server transaction; deny and audit |
| Client-supplied role, risk, vehicle configuration, or conclusion state | Ignore as authority; derive from governed server records |
| Duplicate submit or timeout retry | Request-hash idempotency returns one committed result |
| Stale case or Repair Order publication | Optimistic conflict, no partial write, return current version |
| Restricted evidence leaked through event/projection | Emit identifiers and permission-filtered summaries only; quarantine affected projection |
| Source expiration/withdrawal | Suspend dependent guidance, identify affected cases, block new confirmation |
| Algorithm runaway or combinatorial explosion | Declared resource bound, bounded candidate output, reason-coded abstention |
| Adapter corrupts units or omits raw provenance | Reject/invalidate evidence; preserve raw reference and transformation history |
| Projection unavailable or lagging | Show unavailable/stale state; command authority reads canonical data |
| Feature disable during an active case | Stop new gated commands; preserve safe reads, evidence, ownership, and recovery route |
| Publication transaction/outbox failure | Atomic domain commit; observable retry for outbox; reconciliation proof |
| Malicious note/prompt content | Treat as untrusted data; never execute instructions or elevate authority |

## 15. DGN-006 Exit Review

| Required evidence | Disposition |
| --- | --- |
| Aggregate and authority boundary | Complete |
| Exact command/event/reason-code direction | Complete |
| Case-specific diagnosis publication lineage | Complete; dedicated link selected |
| Concurrency/idempotency contract | Complete |
| Algorithm precedence and consistency examples | Complete as activation requirements |
| Lab/evidence context contract | Complete |
| Staged schema and migration/rollback plan | Complete |
| Runtime schema, commands, algorithms, labs, or routes | Not implemented by design |

**Disposition:** `DGN-006` is complete as the final foundation contract. Runtime construction may begin only within the scope authorized by the `DG-G0` review.
