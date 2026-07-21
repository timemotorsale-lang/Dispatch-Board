# DGN-022–023 — Hypothesis and Deterministic Reasoning Core

**Status:** Implemented in source; migration not deployed; approved model provider not activated  
**Date:** 2026-07-21  
**Gate contribution:** `DG-G3`; gate remains open

## Delivered boundary

This slice implements the logical and persistence core for evidence-consistent diagnostic reasoning. It does not confirm causes, select an eligible next test, or activate production no-start guidance.

### DGN-022 — hypotheses, conflicts, and minimal diagnoses

- Added immutable, tenant-scoped `DiagnosticHypothesis`, `DiagnosticHypothesisEvidence`, and `DiagnosticReasoningEvaluation` persistence.
- Added exact support/contradiction evidence links to observations, measurements, test executions, or model facts, with case/tenant target validation.
- Added hypothesis and evaluation supersession lineage so corrected evidence creates a new result without deleting history.
- Implemented subset-minimal conflict reduction and deterministic minimal hitting-set candidate generation.
- Added candidate-size, candidate-count, expansion, and duration ceilings with explicit incomplete-search, timeout, degradation, and abstention output.
- Added bounded independent multiple-fault, modeled common-cause, and intermittent-candidate representation.
- Added non-monotonic truth revision that reports retained, introduced, and retracted hypotheses plus changed evidence and prior/current checksums.

### DGN-023 — deterministic consistency and causal evaluation

- Added versioned rule matching against qualified evidence states.
- Added vehicle/model applicability checks and source-rights enforcement.
- Added direct-support, contradiction, association-only, compatibility, causal-prediction, and missing-expected-effect distinctions.
- Added evidence-to-evidence conflict detection through modeled measurement/setup-validity assumptions.
- Added hard-gate precedence: DGN-019 blocks and evidence conflicts force abstention rather than becoming ranking penalties.
- Added deterministic input and result checksums, stable ordering, engine/policy/model/rule/source/calculation versions, computation bounds, and reason codes.
- Added a server-side evaluation service and `POST /api/diagnostics/cases/:caseId/reasoning` boundary using capability, assignment, rollout, optimistic concurrency, idempotency, audit, domain-event, and outbox controls.
- Added permission-filtered reasoning history to the case projection.

Clients cannot submit a reasoning model or knowledge package. An approved server-side provider must resolve the applicable model and map canonical case evidence. No default provider is activated because the DGN-004 vehicle-specific source holds remain unresolved; the endpoint therefore fails closed until approved knowledge is available.

## Authority and interpretation

- A generated candidate means logically compatible with the applicable conflicts; it is not a confirmed cause.
- `SUPPORTED` requires affirmative evidence for every assumption in a multiple-fault candidate.
- Direct qualified contradiction defeats advisory, AI, or common-fix association.
- Common-cause candidates exist only when explicitly modeled; the engine does not invent a shared cause.
- Recommended test keys are unresolved conflict discriminators only. DGN-024 must still perform applicability, safety, authority, qualification, tool, state, authorization, and source eligibility filtering.
- A bounded or out-of-model search cannot claim exhaustiveness and requires abstention.

## Verification evidence

- Formal single-fault and independent multiple-fault cases pass.
- Common-cause, intermittent, subset-minimality, deterministic tie ordering, source-rights, wrong-vehicle, evidence conflict, gate block, bounded search, correction/retraction, causal-versus-associated, missing-effect, and AI/common-fix contradiction cases pass.
- Service tests prove server-owned model selection, exact checksum persistence, capability/assignment enforcement, rollout enforcement, and no-provider fail-closed behavior.
- Prisma schema validation, TypeScript validation, and zero-warning lint pass.

## Explicitly not delivered

- No production model provider or licensed vehicle-specific source activation.
- No hypothesis/conclusion UI; that remains DGN-027.
- No eligible-test generation or ranking; those remain DGN-024–025.
- No cause proposal, confirmation, rejection, human signoff, repair recommendation, publishing, or post-repair verification; those remain DGN-026 and later.
- No database deployment or Diagnostics rollout activation.

## Exit disposition

DGN-022 and DGN-023 are complete in source. `DG-G3` remains open until the remaining DGN-024–027 controls and validated no-start experience are complete.
