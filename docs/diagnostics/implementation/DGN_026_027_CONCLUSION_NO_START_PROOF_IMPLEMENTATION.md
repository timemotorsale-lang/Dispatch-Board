# DGN-026–027 Conclusion Controls and No-Start Proof

**Status:** Implemented in source; migration not deployed; production authority/knowledge providers not activated  
**Implemented:** 2026-07-21  
**Gate impact:** Completes the source implementation scope for `DG-G3`; formal gate approval still requires migrated-runtime, qualified technical/safety review, and representative technician browser/usability evidence.

## DGN-026 — governed conclusion controls

- Added immutable, tenant-scoped `DiagnosticConclusionVersion` records for propose, confirm, reject, supersede, abstain, and escalate decisions.
- Every version binds to one case, concern version, latest reasoning evaluation, exact reasoning checksum, selected hypothesis when applicable, evidence basis, contradictions, addressed alternatives, limitations, sources, safety snapshot, author, reviewer, policy, and deterministic checksums.
- A proposal or confirmation cannot proceed from incomplete/abstaining reasoning, a blocked quality gate, unavailable source, missing qualification, R4 scope, contradicted/out-of-model hypothesis, association-only evidence, unresolved contradiction, insufficient evidence, or unaddressed viable alternative.
- Confirmation must match the proposal it follows. Supersession requires a confirmed prior version. Rejection requires a proposal. History is append-only.
- R3 confirmation requires an explicit high-risk capability and, when policy requires it, a different qualified and authorized reviewer. Manager title alone does not grant confirm/review authority.
- Abstention, no-fault-found, and escalation remain distinct first-class outcomes and require recorded limitations.
- Conclusion is still Diagnostics truth only. It does not publish a `RepairDiagnosisVersion`, authorize repair, create work, order parts, pass QC, or release a vehicle; DGN-028 and later retain those boundaries.

## DGN-027 — guided no-start experience and proof corpus

- Replaced placeholder hypothesis/reasoning panels with current immutable hypotheses, causal state, evidence counts, adaptive recommendation, alternatives, and exclusion reasons.
- Added a compact technician conclusion surface for proposing, confirming, rejecting, superseding, abstaining, escalating, and selecting an independent R3 reviewer.
- Connected the Hypothesis lab and Systems cause view to governed projections while leaving post-repair verification execution visibly unavailable until its owning milestone.
- Added the versioned generic no-start proof corpus and deterministic runner covering normal, misleading-code, measurement-error, modeled common-ground, intermittent, multiple-fault, unsafe, degraded, and no-fault-found scenarios.
- The runner passes only scenario input to the evaluator, compares results to held expected outcomes afterward, records per-scenario and run checksums, and refuses any scenario not marked simulation/training-only.

## Runtime and authority boundary

- `POST /api/diagnostics/cases/{caseId}/conclusions` accepts command metadata and the human-authored cause/rationale. The server resolves the latest reasoning, hypotheses, evidence quality, sources, qualifications, capabilities, review policy, and current lineage.
- `DIAGNOSTIC_CONCLUSION_PROPOSE` permits proposals and non-conclusive outcomes. `DIAGNOSTIC_CONCLUSION_CONFIRM`, `DIAGNOSTIC_HIGH_RISK_CONFIRM`, and `DIAGNOSTIC_CONCLUSION_REVIEW` require explicit technical grants.
- No default conclusion-authority provider is active. Decisive actions therefore fail closed until approved qualification, source, evidence-sufficiency, and review context is available.
- Simulation results have no repository or API path into live evidence, reasoning, conclusion, repair diagnosis, or vehicle state.

## Verification evidence

- Insufficient, conflicting, association-only, out-of-model, unavailable-source, R4, missing-alternative, missing-proposal, mismatched-proposal, rejection, supersession, abstention, and escalation controls pass.
- R3 high-risk capability, reviewer independence, reviewer qualification, and reviewer authority cases pass.
- Service tests prove latest reasoning/checksum binding, server-owned authority inputs, no-provider fail-closed behavior, explicit confirmation grants, idempotent command construction, and immutable persistence handoff.
- All nine required no-start scenario families pass with normal, exception, degraded, safety, multiple-fault, intermittent, misleading-code, and no-fault-found outcomes kept distinct.
- Technician workspace rendering, Prisma validation, TypeScript validation, lint, Diagnostics regression, and production build are required release checks for this branch.

## Explicitly not delivered

- No licensed vehicle-specific source or production reasoning/adaptive/conclusion provider activation.
- No scanner, scope, waveform, live-data, or other hardware adapter.
- No diagnosis publication, repair recommendation, estimate/authorization, dispatch, parts, repair, QC, or verification execution; those begin at DGN-028.
- No database deployment or Diagnostics rollout activation.
- No claim that simulation-only source tests constitute production diagnostic efficacy or all-make coverage.

## Exit disposition

DGN-026 and DGN-027 are complete in source. `DG-G3` is technically assembled and covered by the controlled generic no-start corpus, but remains formally open until the migration is exercised in a controlled runtime and qualified technical, safety, accessibility, and representative technician reviews accept the evidence package.
